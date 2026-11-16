import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  Film,
  Layers,
  Magnet,
  Minus,
  Music,
  Plus,
  Scissors,
  Subtitles,
  Zap,
  ZoomIn,
} from 'lucide-react';
import {
  computeClipTimelineRanges,
  splitClipAtTime,
  splitCueAtTime,
} from '../../../application/use-cases/PieceWorkflowUseCases';
import type { ContentPiece, SubtitleCue } from '../../../domain/entities';
import {
  BGM_CATALOG,
  CAMERA_MOTION_PRESETS,
  type CameraMotionPreset,
} from '../../../domain/value-objects';
import { VIBRA_COMPOSITION_FPS } from '../../../infrastructure/remotion/VibraReelComposition';
import { useVibraServices } from '../../context/VibraServicesContext';

interface MultiTrackTimelineProps {
  piece: ContentPiece;
  playheadSec: number;
  totalDurationSec: number;
  onSeekSec: (timeSec: number) => void;
  onUpdatePiece: (next: ContentPiece) => void;
}

type DragTarget =
  | {
      kind: 'clip';
      index: number;
      mode: 'move' | 'resize-left' | 'resize-right';
      originX: number;
      initStartSec: number;
      initDurationSec: number;
      initTrimSec: number;
    }
  | {
      kind: 'cue';
      index: number;
      mode: 'move' | 'resize-left' | 'resize-right';
      originX: number;
      initStartSec: number;
      initEndSec: number;
    }
  | {
      kind: 'overlay';
      mode: 'move' | 'resize-left' | 'resize-right';
      originX: number;
      initStartSec: number;
      initDurationSec: number;
    }
  | {
      kind: 'beat';
      beatId: string;
      mode: 'move' | 'resize-left' | 'resize-right';
      originX: number;
      initStartSec: number;
      initEndSec: number;
    };

const ZOOM_LEVELS = [1, 1.5, 2.5, 4] as const;

export const MultiTrackTimeline: React.FC<MultiTrackTimelineProps> = ({
  piece,
  playheadSec,
  totalDurationSec,
  onSeekSec,
  onUpdatePiece,
}) => {
  const { batchRenderer } = useVibraServices();
  const [selectedClipId, setSelectedClipId] = useState<string | null>(null);
  const [selectedCueIdx, setSelectedCueIdx] = useState<number | null>(null);
  const [zoomLevel, setZoomLevel] = useState<number>(1);
  const [snapEnabled, setSnapEnabled] = useState<boolean>(true);
  const [dragReadout, setDragReadout] = useState<string | null>(null);

  const rulerRef = useRef<HTMLDivElement | null>(null);
  const trackAreaRef = useRef<HTMLDivElement | null>(null);
  const dragRef = useRef<DragTarget | null>(null);
  const pieceRef = useRef(piece);
  pieceRef.current = piece;

  const cues: SubtitleCue[] = useMemo(
    () => batchRenderer.buildSubtitleCues(piece, totalDurationSec),
    [batchRenderer, piece, totalDurationSec]
  );
  const cuesRef = useRef(cues);
  cuesRef.current = cues;

  const clipBlocks = useMemo(
    () => computeClipTimelineRanges(piece.sceneClips),
    [piece.sceneClips]
  );

  const activeBgm = useMemo(
    () => BGM_CATALOG.find((t) => t.id === piece.bgmTrackId) ?? BGM_CATALOG[0],
    [piece.bgmTrackId]
  );

  const hookDurationSec = Math.max(
    1,
    Math.min(totalDurationSec, piece.hookDurationSec ?? 3.2)
  );
  const ctaDurationSec = Math.max(
    1,
    Math.min(totalDurationSec, piece.ctaDurationSec ?? 3.2)
  );
  const ctaStartSec = Math.max(0, totalDurationSec - ctaDurationSec);

  const applySnap = (val: number, ignoreNeighbors = false): number => {
    const clamped = Math.max(0, val);
    if (!snapEnabled) return Number(clamped.toFixed(2));
    if (Math.abs(clamped - playheadSec) <= 0.35) {
      return Number(playheadSec.toFixed(2));
    }
    if (!ignoreNeighbors) {
      for (const blk of clipBlocks) {
        if (Math.abs(clamped - blk.endSec) <= 0.25) return blk.endSec;
        if (Math.abs(clamped - blk.startSec) <= 0.25) return blk.startSec;
      }
    }
    return Number((Math.round(clamped * 5) / 5).toFixed(2)); // 0.2s grid
  };

  useEffect(() => {
    const handlePointerMove = (e: PointerEvent) => {
      const drag = dragRef.current;
      const trackEl = trackAreaRef.current;
      if (!drag || !trackEl) return;

      const width = Math.max(120, trackEl.getBoundingClientRect().width);
      const deltaSec = ((e.clientX - drag.originX) / width) * totalDurationSec;
      const currentPiece = pieceRef.current;

      if (drag.kind === 'clip') {
        const ranges = computeClipTimelineRanges(currentPiece.sceneClips);
        let nextStart = drag.initStartSec;
        let nextDuration = drag.initDurationSec;
        let nextTrim = drag.initTrimSec;

        if (drag.mode === 'move') {
          nextStart = applySnap(drag.initStartSec + deltaSec, true);
        } else if (drag.mode === 'resize-right') {
          const proposedEnd = applySnap(
            drag.initStartSec + drag.initDurationSec + deltaSec,
            true
          );
          nextDuration = Math.max(
            0.8,
            Math.min(45, Number((proposedEnd - drag.initStartSec).toFixed(2)))
          );
        } else if (drag.mode === 'resize-left') {
          const maxStart = drag.initStartSec + drag.initDurationSec - 0.8;
          nextStart = Math.min(
            maxStart,
            applySnap(drag.initStartSec + deltaSec, true)
          );
          const shift = nextStart - drag.initStartSec;
          nextDuration = Number(
            Math.max(0.8, drag.initDurationSec - shift).toFixed(2)
          );
          nextTrim = Number(Math.max(0, drag.initTrimSec + shift).toFixed(2));
        }

        const updatedClips = currentPiece.sceneClips.map((c, idx) => {
          const baseStart = ranges[idx]?.startSec ?? 0;
          if (idx === drag.index) {
            return {
              ...c,
              startSec: nextStart,
              durationSec: nextDuration,
              trimStartSec: nextTrim,
            };
          }
          return typeof c.startSec === 'number' ? c : { ...c, startSec: baseStart };
        });

        setDragReadout(
          `Clip ${drag.index + 1}: ${nextStart.toFixed(1)}s – ${(
            nextStart + nextDuration
          ).toFixed(1)}s`
        );
        onUpdatePiece({ ...currentPiece, sceneClips: updatedClips });
      } else if (drag.kind === 'cue') {
        const span = Math.max(0.5, drag.initEndSec - drag.initStartSec);
        let nextStart = drag.initStartSec;
        let nextEnd = drag.initEndSec;

        if (drag.mode === 'move') {
          nextStart = applySnap(drag.initStartSec + deltaSec, true);
          nextEnd = Number((nextStart + span).toFixed(2));
        } else if (drag.mode === 'resize-left') {
          nextStart = Math.min(
            drag.initEndSec - 0.4,
            applySnap(drag.initStartSec + deltaSec, true)
          );
        } else if (drag.mode === 'resize-right') {
          nextEnd = Math.max(
            drag.initStartSec + 0.4,
            applySnap(drag.initEndSec + deltaSec, true)
          );
        }

        const nextCues = cuesRef.current.map((cue, idx) =>
          idx === drag.index
            ? { ...cue, startSec: nextStart, endSec: nextEnd }
            : cue
        );
        setDragReadout(
          `Sub #${drag.index + 1}: ${nextStart.toFixed(1)}s – ${nextEnd.toFixed(1)}s`
        );
        onUpdatePiece({ ...currentPiece, customSubtitleCues: nextCues });
      } else if (drag.kind === 'overlay') {
        let nextStart = drag.initStartSec;
        let nextDur = drag.initDurationSec;
        if (drag.mode === 'move') {
          nextStart = applySnap(drag.initStartSec + deltaSec, true);
        } else if (drag.mode === 'resize-right') {
          const end = applySnap(
            drag.initStartSec + drag.initDurationSec + deltaSec,
            true
          );
          nextDur = Math.max(0.8, Number((end - drag.initStartSec).toFixed(2)));
        } else if (drag.mode === 'resize-left') {
          const maxStart = drag.initStartSec + drag.initDurationSec - 0.8;
          nextStart = Math.min(
            maxStart,
            applySnap(drag.initStartSec + deltaSec, true)
          );
          nextDur = Number(
            Math.max(0.8, drag.initStartSec + drag.initDurationSec - nextStart).toFixed(2)
          );
        }
        setDragReadout(
          `Overlay: ${nextStart.toFixed(1)}s – ${(nextStart + nextDur).toFixed(1)}s`
        );
        onUpdatePiece({
          ...currentPiece,
          overlayStartSec: nextStart,
          overlayDurationSec: nextDur,
        });
      } else if (drag.kind === 'beat') {
        const span = Math.max(0.5, drag.initEndSec - drag.initStartSec);
        let nextStart = drag.initStartSec;
        let nextEnd = drag.initEndSec;

        if (drag.mode === 'move') {
          nextStart = applySnap(drag.initStartSec + deltaSec, true);
          nextEnd = Number((nextStart + span).toFixed(2));
        } else if (drag.mode === 'resize-left') {
          nextStart = Math.min(
            drag.initEndSec - 0.4,
            applySnap(drag.initStartSec + deltaSec, true)
          );
        } else if (drag.mode === 'resize-right') {
          nextEnd = Math.max(
            drag.initStartSec + 0.4,
            applySnap(drag.initEndSec + deltaSec, true)
          );
        }

        const nextBeats = (currentPiece.kineticBeats ?? []).map((b) =>
          b.id === drag.beatId
            ? { ...b, startSec: nextStart, endSec: nextEnd }
            : b
        );
        setDragReadout(
          `SFX: ${nextStart.toFixed(1)}s – ${nextEnd.toFixed(1)}s`
        );
        onUpdatePiece({ ...currentPiece, kineticBeats: nextBeats });
      }
    };

    const handlePointerUp = () => {
      if (dragRef.current) {
        dragRef.current = null;
        setDragReadout(null);
      }
    };

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
    };
  }, [totalDurationSec, snapEnabled, playheadSec, onUpdatePiece]);

  const handleRulerPointer = (clientX: number) => {
    const el = rulerRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const ratio = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    onSeekSec(Number((ratio * totalDurationSec).toFixed(2)));
  };

  const moveClip = (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= piece.sceneClips.length) return;
    const next = [...piece.sceneClips].map((c) => ({ ...c, startSec: undefined }));
    const [removed] = next.splice(index, 1);
    next.splice(target, 0, removed);
    onUpdatePiece({ ...piece, sceneClips: next });
  };

  const adjustClipDuration = (index: number, deltaSec: number) => {
    const next = piece.sceneClips.map((clip, idx) =>
      idx === index
        ? {
            ...clip,
            durationSec: Math.max(
              0.8,
              Math.min(45, Number((clip.durationSec + deltaSec).toFixed(1)))
            ),
          }
        : clip
    );
    onUpdatePiece({ ...piece, sceneClips: next });
  };

  const adjustClipTrimStart = (index: number, deltaSec: number) => {
    const next = piece.sceneClips.map((clip, idx) =>
      idx === index
        ? {
            ...clip,
            trimStartSec: Math.max(
              0,
              Math.min(20, Number(((clip.trimStartSec ?? 0) + deltaSec).toFixed(1)))
            ),
          }
        : clip
    );
    onUpdatePiece({ ...piece, sceneClips: next });
  };

  const selectedClipIndex = piece.sceneClips.findIndex(
    (c) => c.id === selectedClipId
  );
  const selectedClip =
    selectedClipIndex >= 0 ? piece.sceneClips[selectedClipIndex] : null;
  const selectedClipRange =
    selectedClipIndex >= 0 ? clipBlocks[selectedClipIndex] : null;
  const selectedCue =
    selectedCueIdx !== null && cues[selectedCueIdx]
      ? cues[selectedCueIdx]
      : null;

  const canSplitClip =
    selectedClipRange !== null &&
    playheadSec > selectedClipRange.startSec + 0.6 &&
    playheadSec < selectedClipRange.endSec - 0.6;

  const canSplitCue =
    selectedCue !== null &&
    playheadSec > selectedCue.startSec + 0.4 &&
    playheadSec < selectedCue.endSec - 0.4;

  const handleSplitAtPlayhead = () => {
    if (canSplitClip && selectedClipIndex >= 0) {
      const nextClips = splitClipAtTime(
        piece.sceneClips,
        selectedClipIndex,
        playheadSec
      );
      onUpdatePiece({ ...piece, sceneClips: nextClips });
      return;
    }
    if (canSplitCue && selectedCueIdx !== null) {
      const nextCues = splitCueAtTime(cues, selectedCueIdx, playheadSec);
      onUpdatePiece({ ...piece, customSubtitleCues: nextCues });
    }
  };

  const playheadPct = Math.max(
    0,
    Math.min(100, (playheadSec / Math.max(0.1, totalDurationSec)) * 100)
  );
  const currentFrame = Math.round(playheadSec * VIBRA_COMPOSITION_FPS);
  const totalFrames = Math.round(totalDurationSec * VIBRA_COMPOSITION_FPS);

  const ticks = useMemo(() => {
    const step =
      zoomLevel >= 2.5
        ? 1
        : totalDurationSec > 25
          ? 5
          : 2;
    const arr: number[] = [];
    for (let t = 0; t <= totalDurationSec; t += step) {
      arr.push(Number(t.toFixed(1)));
    }
    return arr;
  }, [totalDurationSec, zoomLevel]);

  return (
    <section
      aria-label="Línea de tiempo multipista Remotion NLE"
      className="border-t border-slate-900/10 dark:border-white/10 bg-slate-900/[0.03] dark:bg-black/30 px-4 sm:px-6 py-3 space-y-2.5"
    >
      {/* Top NLE Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2.5 text-xs">
          <span className="font-display font-bold text-slate-900 dark:text-white whitespace-nowrap">
            Timeline NLE Multipista
          </span>
          <span className="font-mono-tabular text-[11px] text-slate-600 dark:text-slate-300">
            {playheadSec.toFixed(1)}s / {totalDurationSec.toFixed(1)}s · F{' '}
            {currentFrame}/{totalFrames} · 30fps
          </span>
          {dragReadout && (
            <span className="font-mono-tabular text-[11px] font-bold text-[#F4A048]">
              {dragReadout}
            </span>
          )}
        </div>

        {/* Zoom + Snap + Split + Hook/CTA */}
        <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
          <div className="inline-flex items-center gap-1 rounded-lg border border-slate-900/12 dark:border-white/12 p-0.5">
            <ZoomIn className="h-3 w-3 text-slate-500 dark:text-slate-400 ml-1" aria-hidden="true" />
            {ZOOM_LEVELS.map((z) => (
              <button
                key={z}
                type="button"
                onClick={() => setZoomLevel(z)}
                className={`rounded-md px-1.5 py-0.5 font-mono-tabular font-semibold transition-colors cursor-pointer ${
                  zoomLevel === z
                    ? 'bg-[#FF5A4E] text-white'
                    : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                {z}x
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={() => setSnapEnabled((prev) => !prev)}
            title="Activar ajuste magnético (0.2s y playhead)"
            className={`inline-flex items-center gap-1 rounded-lg border px-2 py-1 font-semibold transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
              snapEnabled
                ? 'border-emerald-500/45 bg-emerald-500/12 text-emerald-700 dark:text-emerald-300'
                : 'border-slate-900/12 dark:border-white/12 text-slate-600 dark:text-slate-300'
            }`}
          >
            <Magnet className="h-3 w-3" aria-hidden="true" />
            <span>Snap</span>
          </button>

          <button
            type="button"
            disabled={!canSplitClip && !canSplitCue}
            onClick={handleSplitAtPlayhead}
            title="Selecciona un clip o subtítulo que cruce el playhead para dividirlo en dos"
            className="inline-flex items-center gap-1 rounded-lg border border-slate-900/12 dark:border-white/12 px-2 py-1 font-semibold text-slate-800 dark:text-white hover:border-[#F5A623] disabled:opacity-40 cursor-pointer whitespace-nowrap shrink-0"
          >
            <Scissors className="h-3 w-3 text-[#F5A623]" aria-hidden="true" />
            <span>Dividir</span>
          </button>

          <div className="inline-flex items-center gap-1 rounded-lg border border-slate-900/12 dark:border-white/12 px-2 py-0.5">
            <span className="text-slate-600 dark:text-slate-300">Hook:</span>
            <button
              type="button"
              onClick={() =>
                onUpdatePiece({
                  ...piece,
                  hookDurationSec: Math.max(1, Number((hookDurationSec - 0.4).toFixed(1))),
                })
              }
              className="font-mono-tabular text-slate-700 dark:text-slate-200 hover:text-[#FF5A4E] cursor-pointer px-1"
            >
              -
            </button>
            <span className="font-mono-tabular font-semibold text-[#FF5A4E]">
              {hookDurationSec.toFixed(1)}s
            </span>
            <button
              type="button"
              onClick={() =>
                onUpdatePiece({
                  ...piece,
                  hookDurationSec: Math.min(8, Number((hookDurationSec + 0.4).toFixed(1))),
                })
              }
              className="font-mono-tabular text-slate-700 dark:text-slate-200 hover:text-[#FF5A4E] cursor-pointer px-1"
            >
              +
            </button>
          </div>

          <div className="inline-flex items-center gap-1 rounded-lg border border-slate-900/12 dark:border-white/12 px-2 py-0.5">
            <span className="text-slate-600 dark:text-slate-300">CTA:</span>
            <button
              type="button"
              onClick={() =>
                onUpdatePiece({
                  ...piece,
                  ctaDurationSec: Math.max(1, Number((ctaDurationSec - 0.4).toFixed(1))),
                })
              }
              className="font-mono-tabular text-slate-700 dark:text-slate-200 hover:text-[#F5A623] cursor-pointer px-1"
            >
              -
            </button>
            <span className="font-mono-tabular font-semibold text-[#F5A623]">
              {ctaDurationSec.toFixed(1)}s
            </span>
            <button
              type="button"
              onClick={() =>
                onUpdatePiece({
                  ...piece,
                  ctaDurationSec: Math.min(8, Number((ctaDurationSec + 0.4).toFixed(1))),
                })
              }
              className="font-mono-tabular text-slate-700 dark:text-slate-200 hover:text-[#F5A623] cursor-pointer px-1"
            >
              +
            </button>
          </div>
        </div>
      </div>

      {/* Selected Clip or Cue Inspector Strip */}
      {(selectedClip || selectedCue) && (
        <div className="flex flex-wrap items-center gap-2 text-[11px]">
          {selectedClip && selectedClipIndex >= 0 && (
            <div className="flex flex-wrap items-center gap-1.5 rounded-xl border border-[#FF5A4E]/35 bg-[#FF5A4E]/10 px-2.5 py-1">
              <span className="font-semibold text-slate-900 dark:text-white max-w-[140px] truncate">
                Clip {selectedClipIndex + 1}: {selectedClip.fileName}
              </span>
              <button
                type="button"
                onClick={() => moveClip(selectedClipIndex, -1)}
                disabled={selectedClipIndex === 0}
                aria-label="Mover clip antes"
                className="rounded-md p-1 text-slate-700 dark:text-slate-200 hover:bg-white/20 disabled:opacity-35 cursor-pointer"
              >
                <ArrowLeft className="h-3 w-3" />
              </button>
              <button
                type="button"
                onClick={() => moveClip(selectedClipIndex, 1)}
                disabled={selectedClipIndex === piece.sceneClips.length - 1}
                aria-label="Mover clip después"
                className="rounded-md p-1 text-slate-700 dark:text-slate-200 hover:bg-white/20 disabled:opacity-35 cursor-pointer"
              >
                <ArrowRight className="h-3 w-3" />
              </button>
              <button
                type="button"
                onClick={() => adjustClipDuration(selectedClipIndex, -0.5)}
                className="rounded-md border border-slate-900/15 dark:border-white/15 px-1.5 py-0.5 font-mono-tabular text-slate-800 dark:text-white hover:border-[#FF5A4E] cursor-pointer"
              >
                <Minus className="h-2.5 w-2.5 inline" /> 0.5s
              </button>
              <button
                type="button"
                onClick={() => adjustClipDuration(selectedClipIndex, 0.5)}
                className="rounded-md border border-slate-900/15 dark:border-white/15 px-1.5 py-0.5 font-mono-tabular text-slate-800 dark:text-white hover:border-[#FF5A4E] cursor-pointer"
              >
                <Plus className="h-2.5 w-2.5 inline" /> 0.5s
              </button>
              <span className="inline-flex items-center gap-1 text-slate-600 dark:text-slate-300 ml-1">
                <span>In: {(selectedClip.trimStartSec ?? 0).toFixed(1)}s</span>
                <button
                  type="button"
                  onClick={() => adjustClipTrimStart(selectedClipIndex, 0.5)}
                  className="rounded-md border border-slate-900/15 dark:border-white/15 px-1.5 py-0.5 font-mono-tabular text-slate-800 dark:text-white hover:border-[#F5A623] cursor-pointer"
                >
                  +0.5s
                </button>
              </span>
              <select
                value={
                  selectedClip.cameraMotion ??
                  piece.styleConfig?.cameraMotion ??
                  'Zoom In'
                }
                aria-label="Movimiento Ken Burns del clip"
                onChange={(e) => {
                  const val = e.target.value as CameraMotionPreset;
                  const nextClips = piece.sceneClips.map((c, idx) =>
                    idx === selectedClipIndex ? { ...c, cameraMotion: val } : c
                  );
                  onUpdatePiece({ ...piece, sceneClips: nextClips });
                }}
                className="rounded-md border border-slate-900/15 dark:border-white/15 bg-white/80 dark:bg-[#0B1221] px-1.5 py-0.5 text-[11px] font-semibold text-slate-800 dark:text-white"
              >
                {CAMERA_MOTION_PRESETS.map((m) => (
                  <option key={m} value={m}>
                    Cam: {m}
                  </option>
                ))}
              </select>
            </div>
          )}

          {selectedCue && selectedCueIdx !== null && (
            <div className="flex items-center gap-1.5 rounded-xl border border-[#F5A623]/40 bg-[#F5A623]/12 px-2.5 py-1">
              <span className="font-semibold text-amber-800 dark:text-[#F5A623] max-w-[180px] truncate">
                Sub #{selectedCue.index}: “{selectedCue.text}”
              </span>
              <span className="font-mono-tabular text-slate-600 dark:text-slate-300">
                {selectedCue.startSec.toFixed(1)}s–{selectedCue.endSec.toFixed(1)}s
              </span>
            </div>
          )}
        </div>
      )}

      {/* Interactive Zoomable Multi-Track Canvas */}
      <div className="rounded-2xl border border-slate-900/10 dark:border-white/12 bg-white/80 dark:bg-[#0B1221]/90 p-2.5 select-none overflow-x-auto">
        <div
          style={{ width: `${zoomLevel * 100}%`, minWidth: '100%' }}
          className="space-y-1.5"
        >
          {/* Time Ruler */}
          <div className="flex items-center gap-2">
            <div className="w-20 shrink-0 text-[10px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Tiempo
            </div>
            <div
              ref={(node) => {
                rulerRef.current = node;
                trackAreaRef.current = node;
              }}
              role="slider"
              tabIndex={0}
              aria-label="Regla de tiempo Remotion"
              aria-valuemin={0}
              aria-valuemax={totalDurationSec}
              aria-valuenow={playheadSec}
              onClick={(e) => handleRulerPointer(e.clientX)}
              onKeyDown={(e) => {
                if (e.key === 'ArrowRight') {
                  onSeekSec(Math.min(totalDurationSec, playheadSec + 0.5));
                } else if (e.key === 'ArrowLeft') {
                  onSeekSec(Math.max(0, playheadSec - 0.5));
                }
              }}
              className="relative flex-1 h-5 rounded-lg bg-slate-900/6 dark:bg-white/[0.05] cursor-pointer overflow-hidden"
            >
              {ticks.map((sec) => {
                const leftPct = (sec / Math.max(0.1, totalDurationSec)) * 100;
                return (
                  <span
                    key={sec}
                    style={{ left: `${leftPct}%` }}
                    className="absolute top-0.5 -translate-x-1/2 font-mono-tabular text-[9px] text-slate-500 dark:text-slate-400 pointer-events-none"
                  >
                    {sec}s
                  </span>
                );
              })}
              <div
                style={{ left: `${playheadPct}%` }}
                className="absolute inset-y-0 w-0.5 bg-[#FF5A4E] pointer-events-none"
              />
            </div>
          </div>

          {/* Track 1: Video Clips (Drag Move + Edge Resize) */}
          <div className="flex items-center gap-2">
            <div className="w-20 shrink-0 flex items-center gap-1 text-[11px] font-semibold text-slate-700 dark:text-slate-200">
              <Film className="h-3 w-3 text-[#FF5A4E]" aria-hidden="true" />
              <span>Clips</span>
            </div>
            <div className="relative flex-1 h-7 rounded-lg bg-slate-900/5 dark:bg-white/[0.04] overflow-hidden">
              {clipBlocks.length === 0 ? (
                <div className="flex h-full items-center px-2 text-[10px] text-slate-500 dark:text-slate-400">
                  Fondo estudio animado · agrega videos o demo en «Tomas & Voz»
                </div>
              ) : (
                clipBlocks.map(({ clip, index, startSec }) => {
                  const leftPct =
                    (startSec / Math.max(0.1, totalDurationSec)) * 100;
                  const widthPct = Math.min(
                    100 - leftPct,
                    (clip.durationSec / Math.max(0.1, totalDurationSec)) * 100
                  );
                  const isSelected = clip.id === selectedClipId;
                  return (
                    <div
                      key={clip.id}
                      style={{
                        left: `${leftPct}%`,
                        width: `${Math.max(4, widthPct)}%`,
                      }}
                      title={`${clip.fileName} (${startSec.toFixed(1)}s–${(
                        startSec + clip.durationSec
                      ).toFixed(1)}s)`}
                      onPointerDown={(e) => {
                        setSelectedClipId(clip.id);
                        setSelectedCueIdx(null);
                        onSeekSec(Number(startSec.toFixed(2)));
                        dragRef.current = {
                          kind: 'clip',
                          index,
                          mode: 'move',
                          originX: e.clientX,
                          initStartSec: startSec,
                          initDurationSec: clip.durationSec,
                          initTrimSec: clip.trimStartSec ?? 0,
                        };
                      }}
                      className={`group absolute inset-y-0.5 rounded-md border flex items-center px-2 text-[10px] font-semibold cursor-grab active:cursor-grabbing transition-colors ${
                        isSelected
                          ? 'border-[#FF5A4E] bg-[#FF5A4E]/35 text-slate-900 dark:text-white'
                          : 'border-[#FF5A4E]/40 bg-[#FF5A4E]/20 text-slate-800 dark:text-slate-100 hover:bg-[#FF5A4E]/30'
                      }`}
                    >
                      <span
                        onPointerDown={(e) => {
                          e.stopPropagation();
                          setSelectedClipId(clip.id);
                          setSelectedCueIdx(null);
                          dragRef.current = {
                            kind: 'clip',
                            index,
                            mode: 'resize-left',
                            originX: e.clientX,
                            initStartSec: startSec,
                            initDurationSec: clip.durationSec,
                            initTrimSec: clip.trimStartSec ?? 0,
                          };
                        }}
                        aria-label={`Recortar inicio clip ${index + 1}`}
                        className="absolute left-0 inset-y-0 w-1.5 cursor-ew-resize hover:bg-[#FF5A4E] rounded-l-md"
                      />
                      <span className="truncate pointer-events-none">
                        {index + 1}. {clip.fileName}
                      </span>
                      <span
                        onPointerDown={(e) => {
                          e.stopPropagation();
                          setSelectedClipId(clip.id);
                          setSelectedCueIdx(null);
                          dragRef.current = {
                            kind: 'clip',
                            index,
                            mode: 'resize-right',
                            originX: e.clientX,
                            initStartSec: startSec,
                            initDurationSec: clip.durationSec,
                            initTrimSec: clip.trimStartSec ?? 0,
                          };
                        }}
                        aria-label={`Recortar fin clip ${index + 1}`}
                        className="absolute right-0 inset-y-0 w-1.5 cursor-ew-resize hover:bg-[#FF5A4E] rounded-r-md"
                      />
                    </div>
                  );
                })
              )}
              <div
                style={{ left: `${playheadPct}%` }}
                className="absolute inset-y-0 w-0.5 bg-[#FF5A4E] pointer-events-none"
              />
            </div>
          </div>

          {/* Track 2: Subtitles & Kinetic Cards (Drag Move + Edge Resize) */}
          <div className="flex items-center gap-2">
            <div className="w-20 shrink-0 flex items-center gap-1 text-[11px] font-semibold text-slate-700 dark:text-slate-200">
              <Subtitles className="h-3 w-3 text-[#F5A623]" aria-hidden="true" />
              <span>Subs</span>
            </div>
            <div className="relative flex-1 h-7 rounded-lg bg-slate-900/5 dark:bg-white/[0.04] overflow-hidden">
              {cues.map((cue, idx) => {
                const leftPct =
                  (cue.startSec / Math.max(0.1, totalDurationSec)) * 100;
                const widthPct = Math.min(
                  100 - leftPct,
                  ((cue.endSec - cue.startSec) /
                    Math.max(0.1, totalDurationSec)) *
                    100
                );
                const isSelected = idx === selectedCueIdx;
                return (
                  <div
                    key={`${cue.index}-${idx}`}
                    style={{
                      left: `${leftPct}%`,
                      width: `${Math.max(3, widthPct)}%`,
                    }}
                    title={`${cue.startSec.toFixed(1)}s–${cue.endSec.toFixed(1)}s: ${cue.text}`}
                    onPointerDown={(e) => {
                      setSelectedCueIdx(idx);
                      setSelectedClipId(null);
                      onSeekSec(cue.startSec);
                      dragRef.current = {
                        kind: 'cue',
                        index: idx,
                        mode: 'move',
                        originX: e.clientX,
                        initStartSec: cue.startSec,
                        initEndSec: cue.endSec,
                      };
                    }}
                    className={`absolute inset-y-0.5 rounded-md border flex items-center px-1.5 text-[10px] font-medium cursor-grab active:cursor-grabbing transition-colors ${
                      isSelected
                        ? 'border-[#F5A623] bg-[#F5A623]/40 text-slate-900 dark:text-white'
                        : 'border-[#F5A623]/45 bg-[#F5A623]/20 text-slate-800 dark:text-slate-100 hover:bg-[#F5A623]/30'
                    }`}
                  >
                    <span
                      onPointerDown={(e) => {
                        e.stopPropagation();
                        setSelectedCueIdx(idx);
                        setSelectedClipId(null);
                        dragRef.current = {
                          kind: 'cue',
                          index: idx,
                          mode: 'resize-left',
                          originX: e.clientX,
                          initStartSec: cue.startSec,
                          initEndSec: cue.endSec,
                        };
                      }}
                      className="absolute left-0 inset-y-0 w-1.5 cursor-ew-resize hover:bg-[#F5A623] rounded-l-md"
                    />
                    <span className="truncate pointer-events-none">
                      {cue.text}
                    </span>
                    <span
                      onPointerDown={(e) => {
                        e.stopPropagation();
                        setSelectedCueIdx(idx);
                        setSelectedClipId(null);
                        dragRef.current = {
                          kind: 'cue',
                          index: idx,
                          mode: 'resize-right',
                          originX: e.clientX,
                          initStartSec: cue.startSec,
                          initEndSec: cue.endSec,
                        };
                      }}
                      className="absolute right-0 inset-y-0 w-1.5 cursor-ew-resize hover:bg-[#F5A623] rounded-r-md"
                    />
                  </div>
                );
              })}
              <div
                style={{ left: `${playheadPct}%` }}
                className="absolute inset-y-0 w-0.5 bg-[#FF5A4E] pointer-events-none"
              />
            </div>
          </div>

          {/* Track 3: Hook, Overlay PiP (Draggable) & CTA Stickers */}
          <div className="flex items-center gap-2">
            <div className="w-20 shrink-0 flex items-center gap-1 text-[11px] font-semibold text-slate-700 dark:text-slate-200">
              <Layers className="h-3 w-3 text-sky-400" aria-hidden="true" />
              <span>Capas</span>
            </div>
            <div className="relative flex-1 h-7 rounded-lg bg-slate-900/5 dark:bg-white/[0.04] overflow-hidden">
              <button
                type="button"
                onClick={() => onSeekSec(0)}
                style={{
                  left: '0%',
                  width: `${(hookDurationSec / Math.max(0.1, totalDurationSec)) * 100}%`,
                }}
                className="absolute inset-y-0.5 rounded-md border border-sky-400/50 bg-sky-500/20 px-1.5 text-left text-[10px] font-semibold text-sky-800 dark:text-sky-200 truncate cursor-pointer"
              >
                Hook ({hookDurationSec}s)
              </button>

              {piece.overlayImageUrl && (
                <div
                  style={{
                    left: `${((piece.overlayStartSec ?? 2.0) / Math.max(0.1, totalDurationSec)) * 100}%`,
                    width: `${Math.min(
                      100,
                      ((piece.overlayDurationSec ?? 5.0) /
                        Math.max(0.1, totalDurationSec)) *
                        100
                    )}%`,
                  }}
                  onPointerDown={(e) => {
                    onSeekSec(piece.overlayStartSec ?? 2.0);
                    dragRef.current = {
                      kind: 'overlay',
                      mode: 'move',
                      originX: e.clientX,
                      initStartSec: piece.overlayStartSec ?? 2.0,
                      initDurationSec: piece.overlayDurationSec ?? 5.0,
                    };
                  }}
                  className="absolute inset-y-0.5 rounded-md border border-purple-400/55 bg-purple-500/25 px-2 flex items-center text-[10px] font-semibold text-purple-900 dark:text-purple-200 cursor-grab active:cursor-grabbing"
                >
                  <span
                    onPointerDown={(e) => {
                      e.stopPropagation();
                      dragRef.current = {
                        kind: 'overlay',
                        mode: 'resize-left',
                        originX: e.clientX,
                        initStartSec: piece.overlayStartSec ?? 2.0,
                        initDurationSec: piece.overlayDurationSec ?? 5.0,
                      };
                    }}
                    className="absolute left-0 inset-y-0 w-1.5 cursor-ew-resize hover:bg-purple-400 rounded-l-md"
                  />
                  <span className="truncate pointer-events-none">
                    PiP: {piece.overlayLabel || 'Imagen'}
                  </span>
                  <span
                    onPointerDown={(e) => {
                      e.stopPropagation();
                      dragRef.current = {
                        kind: 'overlay',
                        mode: 'resize-right',
                        originX: e.clientX,
                        initStartSec: piece.overlayStartSec ?? 2.0,
                        initDurationSec: piece.overlayDurationSec ?? 5.0,
                      };
                    }}
                    className="absolute right-0 inset-y-0 w-1.5 cursor-ew-resize hover:bg-purple-400 rounded-r-md"
                  />
                </div>
              )}

              <button
                type="button"
                onClick={() => onSeekSec(ctaStartSec)}
                style={{
                  left: `${(ctaStartSec / Math.max(0.1, totalDurationSec)) * 100}%`,
                  width: `${(ctaDurationSec / Math.max(0.1, totalDurationSec)) * 100}%`,
                }}
                className="absolute inset-y-0.5 rounded-md border border-[#FF5A4E]/50 bg-[#FF5A4E]/22 px-1.5 text-left text-[10px] font-semibold text-rose-900 dark:text-rose-200 truncate cursor-pointer"
              >
                CTA ({ctaDurationSec}s)
              </button>

              <div
                style={{ left: `${playheadPct}%` }}
                className="absolute inset-y-0 w-0.5 bg-[#FF5A4E] pointer-events-none"
              />
            </div>
          </div>

          {/* Track 4: Audio (BGM WAV + Custom Voice/Audio) */}
          <div className="flex items-center gap-2">
            <div className="w-20 shrink-0 flex items-center gap-1 text-[11px] font-semibold text-slate-700 dark:text-slate-200">
              <Music className="h-3 w-3 text-emerald-500" aria-hidden="true" />
              <span>Audio</span>
            </div>
            <div className="relative flex-1 h-6 rounded-lg bg-slate-900/5 dark:bg-white/[0.04] overflow-hidden">
              <div className="absolute inset-y-0.5 inset-x-0.5 rounded-md border border-emerald-500/35 bg-emerald-500/18 px-2 flex items-center justify-between text-[10px] font-medium text-emerald-800 dark:text-emerald-200 truncate">
                <span className="truncate">
                  {piece.customAudioName
                    ? `Audio: ${piece.customAudioName} + ${activeBgm.title} (duck 35%)`
                    : piece.voice === 'Con voz'
                      ? `TTS (${piece.voiceConfig.rate}x) + ${activeBgm.title} (${activeBgm.bpm} BPM)`
                      : `${activeBgm.title} · ${activeBgm.bpm} BPM · Vol ${piece.bgmVolume}%`}
                </span>
                <span className="font-mono-tabular shrink-0 ml-2">
                  {totalDurationSec.toFixed(1)}s
                </span>
              </div>
              <div
                style={{ left: `${playheadPct}%` }}
                className="absolute inset-y-0 w-0.5 bg-[#FF5A4E] pointer-events-none"
              />
            </div>
          </div>

          {/* Track 5: Kinetic SFX Events (Draggable + Mute) */}
          {piece.kineticBeats && piece.kineticBeats.length > 0 && (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() =>
                  onUpdatePiece({
                    ...piece,
                    sfxEnabled: piece.sfxEnabled === false,
                  })
                }
                title={
                  piece.sfxEnabled === false
                    ? 'Activar pista de efectos SFX'
                    : 'Silenciar pista de efectos SFX'
                }
                className="w-20 shrink-0 flex items-center gap-1 text-[11px] font-semibold text-slate-700 dark:text-slate-200 hover:text-[#F4A048] cursor-pointer text-left"
              >
                <Zap
                  className={`h-3 w-3 ${
                    piece.sfxEnabled === false
                      ? 'text-slate-400'
                      : 'text-[#F4A048]'
                  }`}
                  aria-hidden="true"
                />
                <span
                  className={
                    piece.sfxEnabled === false ? 'line-through opacity-60' : ''
                  }
                >
                  SFX
                </span>
              </button>
              <div className="relative flex-1 h-7 rounded-lg bg-slate-900/5 dark:bg-white/[0.04] overflow-hidden">
                {piece.kineticBeats
                  .filter((b) => b.sfxKind !== 'none')
                  .map((beat) => {
                    const leftPct =
                      (beat.startSec / Math.max(0.1, totalDurationSec)) * 100;
                    const widthPct = Math.min(
                      100 - leftPct,
                      Math.max(
                        4,
                        ((beat.endSec - beat.startSec) /
                          Math.max(0.1, totalDurationSec)) *
                          100
                      )
                    );
                    return (
                      <div
                        key={beat.id}
                        style={{
                          left: `${leftPct}%`,
                          width: `${widthPct}%`,
                        }}
                        title={`${beat.startSec.toFixed(1)}s–${beat.endSec.toFixed(1)}s: ${beat.sfxLabel}`}
                        onPointerDown={(e) => {
                          onSeekSec(beat.startSec);
                          dragRef.current = {
                            kind: 'beat',
                            beatId: beat.id,
                            mode: 'move',
                            originX: e.clientX,
                            initStartSec: beat.startSec,
                            initEndSec: beat.endSec,
                          };
                        }}
                        className={`absolute inset-y-0.5 rounded-md border flex items-center px-1.5 text-[10px] font-semibold cursor-grab active:cursor-grabbing ${
                          piece.sfxEnabled === false
                            ? 'border-slate-500/30 bg-slate-500/15 text-slate-500'
                            : 'border-[#F4A048]/55 bg-[#F4A048]/22 text-amber-900 dark:text-[#F4A048] hover:bg-[#F4A048]/32'
                        }`}
                      >
                        <span className="truncate pointer-events-none">
                          {beat.sfxLabel}
                        </span>
                      </div>
                    );
                  })}
                <div
                  style={{ left: `${playheadPct}%` }}
                  className="absolute inset-y-0 w-0.5 bg-[#FF5A4E] pointer-events-none"
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
};
