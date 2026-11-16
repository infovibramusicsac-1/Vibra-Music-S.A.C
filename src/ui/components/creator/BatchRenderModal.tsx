import React, { useEffect, useMemo, useState } from 'react';
import {
  CheckCircle2,
  Download,
  Film,
  HardDrive,
  Layers,
  Play,
  Sparkles,
  X,
} from 'lucide-react';
import {
  applyStudioTemplateToPiece,
  computeClipTimelineRanges,
} from '../../../application/use-cases/PieceWorkflowUseCases';
import type {
  ContentPiece,
  LocalBridgeStatus,
  RenderJob,
} from '../../../domain/entities';
import {
  SUBTITLE_PRESETS,
  VIBRA_STUDIO_TEMPLATES,
  type ProductionStatus,
  type SubtitlePreset,
} from '../../../domain/value-objects';
import { useVibraServices } from '../../context/VibraServicesContext';
import { formatShortDateEs } from '../../theme/tokens';

interface BatchRenderModalProps {
  open: boolean;
  onClose: () => void;
  initialSelectedIds?: string[];
}

type BatchOutputMode = 'fast-pack' | 'remotion-mp4';

interface BatchMp4Result {
  status: 'queued' | 'rendering' | 'completed' | 'failed';
  progress: number;
  statusText: string;
  blob?: Blob;
  hasAudio?: boolean;
  error?: string;
}

function downloadBlobFile(filename: string, blob: Blob): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function downloadTextFile(filename: string, content: string, mime: string): void {
  downloadBlobFile(filename, new Blob([content], { type: mime }));
}

function computePieceDuration(
  piece: ContentPiece,
  estimateTts: (text: string, rate: number) => number
): number {
  const clipRanges = computeClipTimelineRanges(piece.sceneClips);
  const clipsDur =
    clipRanges.length > 0
      ? clipRanges.reduce((max, r) => Math.max(max, r.endSec), 0)
      : 0;
  const speechText =
    piece.voice === 'Con voz'
      ? (piece.voiceoverText || `${piece.hook}. ${piece.script}`).trim()
      : `${piece.hook}. ${piece.script}`.trim();
  const ttsDur =
    piece.voice === 'Con voz'
      ? estimateTts(speechText, piece.voiceConfig.rate)
      : 15;
  const customCuesMax =
    piece.customSubtitleCues && piece.customSubtitleCues.length > 0
      ? piece.customSubtitleCues[piece.customSubtitleCues.length - 1].endSec
      : 0;
  const kineticBeatsMax =
    piece.kineticBeats && piece.kineticBeats.length > 0
      ? piece.kineticBeats.reduce((max, beat) => Math.max(max, beat.endSec), 0)
      : 0;
  return Math.max(
    10,
    Math.round(
      Math.max(clipsDur, ttsDur, customCuesMax, kineticBeatsMax) * 10
    ) / 10
  );
}

export const BatchRenderModal: React.FC<BatchRenderModalProps> = ({
  open,
  onClose,
  initialSelectedIds,
}) => {
  const {
    workspace,
    batchRenderer,
    ttsEngine,
    localMedia,
    customStylePresets,
    savePiece,
    applyBatchRenderResult,
  } = useVibraServices();

  const [selectedIds, setSelectedIds] = useState<string[]>(() =>
    workspace.pieces
      .filter((p) => p.status === 'Grabado' || p.status === 'En edición')
      .map((p) => p.id)
  );
  const [outputMode, setOutputMode] = useState<BatchOutputMode>('remotion-mp4');
  const [templateId, setTemplateId] = useState<string>('');
  const [preset, setPreset] = useState<SubtitlePreset>('Hormozi Bold');
  const [advanceToReady, setAdvanceToReady] = useState(true);
  const [running, setRunning] = useState(false);
  const [jobsMap, setJobsMap] = useState<Record<string, RenderJob>>({});
  const [mp4Map, setMp4Map] = useState<Record<string, BatchMp4Result>>({});
  const [bridgeStatus, setBridgeStatus] = useState<LocalBridgeStatus | null>(
    null
  );
  const [diskNotice, setDiskNotice] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    void localMedia.checkExpressBridge().then(setBridgeStatus);
    if (initialSelectedIds && initialSelectedIds.length > 0) {
      setSelectedIds(initialSelectedIds);
    }
  }, [open, initialSelectedIds, localMedia]);

  const selectablePieces = useMemo(
    () => workspace.pieces,
    [workspace.pieces]
  );

  if (!open) return null;

  const toggleId = (id: string) => {
    if (running) return;
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const selectPresetGroup = (mode: 'grabado_edicion' | 'con_voz' | 'none') => {
    if (running) return;
    if (mode === 'none') {
      setSelectedIds([]);
      return;
    }
    if (mode === 'con_voz') {
      setSelectedIds(
        workspace.pieces
          .filter((p) => p.voice === 'Con voz')
          .map((p) => p.id)
      );
      return;
    }
    setSelectedIds(
      workspace.pieces
        .filter((p) => p.status === 'Grabado' || p.status === 'En edición')
        .map((p) => p.id)
    );
  };

  const allTemplates = [...customStylePresets, ...VIBRA_STUDIO_TEMPLATES];
  const selectedTemplate = allTemplates.find((t) => t.id === templateId);

  const handleRunBatch = async () => {
    if (selectedIds.length === 0 || running) return;
    setRunning(true);
    setDiskNotice(null);

    const rawTargets = workspace.pieces.filter((p) =>
      selectedIds.includes(p.id)
    );
    const targets = selectedTemplate
      ? rawTargets.map((piece) => applyStudioTemplateToPiece(piece, selectedTemplate))
      : rawTargets;

    const effectivePreset = selectedTemplate
      ? selectedTemplate.subtitlePreset
      : preset;
    const targetStage: ProductionStatus = advanceToReady ? 'Listo' : 'En edición';

    if (outputMode === 'fast-pack') {
      await batchRenderer.renderBatch(targets, effectivePreset, (pieceId, job) => {
        setJobsMap((prev) => ({ ...prev, [pieceId]: job }));
        if (job.status === 'completed') {
          if (selectedTemplate) {
            const updated = targets.find((t) => t.id === pieceId);
            if (updated) savePiece(updated);
          }
          applyBatchRenderResult(pieceId, job, effectivePreset, targetStage);
        }
      });
      setRunning(false);
      return;
    }

    // Real sequential Remotion WebCodecs MP4 batch queue
    for (const target of targets) {
      const configuredPiece: ContentPiece = {
        ...target,
        subtitlePreset: effectivePreset,
      };
      setMp4Map((prev) => ({
        ...prev,
        [configuredPiece.id]: {
          status: 'rendering',
          progress: 2,
          statusText: 'Iniciando Remotion 1080×1920…',
        },
      }));

      try {
        const dur = computePieceDuration(configuredPiece, (txt, rate) =>
          ttsEngine.estimateDurationSec(txt, rate)
        );
        const res = await batchRenderer.exportMp4OnWeb(
          configuredPiece,
          dur,
          (pct, statusText) => {
            setMp4Map((prev) => ({
              ...prev,
              [configuredPiece.id]: {
                status: 'rendering',
                progress: pct,
                statusText,
              },
            }));
          }
        );

        const job = await batchRenderer.renderPiece(
          configuredPiece,
          effectivePreset
        );
        setJobsMap((prev) => ({ ...prev, [configuredPiece.id]: job }));
        savePiece({
          ...configuredPiece,
          status: targetStage,
          lastRenderJob: job,
        });

        setMp4Map((prev) => ({
          ...prev,
          [configuredPiece.id]: {
            status: 'completed',
            progress: 100,
            statusText: res.hasAudio
              ? `MP4 con audio (${res.durationSec}s)`
              : `MP4 video (${res.durationSec}s)`,
            blob: res.blob,
            hasAudio: res.hasAudio,
          },
        }));
      } catch (err) {
        setMp4Map((prev) => ({
          ...prev,
          [configuredPiece.id]: {
            status: 'failed',
            progress: 0,
            statusText: 'Error en render MP4',
            error:
              err instanceof Error ? err.message : 'Fallo WebCodecs en lote',
          },
        }));
      }
    }

    setRunning(false);
  };

  const completedMp4Entries = Object.entries(mp4Map).filter(
    ([, val]) => val.status === 'completed' && val.blob
  );

  const handleSaveAllMp4ToDisk = async () => {
    if (completedMp4Entries.length === 0) return;
    let savedCount = 0;
    for (const [pieceId, entry] of completedMp4Entries) {
      if (!entry.blob) continue;
      await localMedia.saveExportToExpressDisk(
        `vibra_${pieceId}_reel.mp4`,
        entry.blob
      );
      savedCount += 1;
    }
    setDiskNotice(
      `${savedCount} archivos .MP4 guardados en local-studio/exports/`
    );
  };

  const statusLabel = (job?: RenderJob): string => {
    if (!job) return 'En espera';
    switch (job.status) {
      case 'queued':
        return 'En cola…';
      case 'synthesizing_tts':
        return 'Sintetizando voz / audio…';
      case 'syncing_subtitles':
        return 'Sincronizando subtítulos…';
      case 'composing':
        return 'Ensamblando secuencia 9:16…';
      case 'completed':
        return `Completado (${job.estimatedDurationSec}s)`;
      case 'failed':
        return job.errorMessage ?? 'Error';
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="batch-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 p-4"
    >
      <div className="glass-panel-strong flex max-h-[90vh] w-full max-w-4xl flex-col overflow-hidden rounded-3xl">
        <header className="flex items-center justify-between gap-4 border-b border-slate-900/10 dark:border-white/10 px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-[#FF5A4E] to-[#F5A623] text-white">
              <Layers className="h-4 w-4" aria-hidden="true" />
            </div>
            <div>
              <h2
                id="batch-modal-title"
                className="font-display text-lg font-bold text-slate-900 dark:text-white"
              >
                Fábrica en Lote · Batch Render Remotion
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Aplica plantillas Vibra y exporta colas de videos .MP4 reales o paquetes .SRT/.JSON.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={running}
            aria-label="Cerrar fábrica en lote"
            className="rounded-xl p-2 text-slate-500 hover:bg-slate-900/5 dark:hover:bg-white/8 hover:text-slate-900 dark:hover:text-white cursor-pointer disabled:opacity-40"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </header>

        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {/* Output Engine Mode + Vibra Studio Templates */}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <p className="text-xs font-semibold text-slate-700 dark:text-slate-200">
                Modo de salida de la cola
              </p>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  disabled={running}
                  onClick={() => setOutputMode('remotion-mp4')}
                  className={`rounded-xl border p-2.5 text-left transition-colors cursor-pointer ${
                    outputMode === 'remotion-mp4'
                      ? 'border-[#FF5A4E] bg-[#FF5A4E]/12'
                      : 'border-slate-900/10 dark:border-white/12'
                  }`}
                >
                  <p className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                    <Film className="h-3.5 w-3.5 text-[#FF5A4E]" />
                    <span>Cola .MP4 Remotion</span>
                  </p>
                  <p className="text-[11px] text-slate-600 dark:text-slate-300 mt-0.5">
                    Video 1080×1920 con audio y transiciones
                  </p>
                </button>

                <button
                  type="button"
                  disabled={running}
                  onClick={() => setOutputMode('fast-pack')}
                  className={`rounded-xl border p-2.5 text-left transition-colors cursor-pointer ${
                    outputMode === 'fast-pack'
                      ? 'border-[#F5A623] bg-[#F5A623]/12'
                      : 'border-slate-900/10 dark:border-white/12'
                  }`}
                >
                  <p className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                    <Sparkles className="h-3.5 w-3.5 text-[#F5A623]" />
                    <span>Rápido .SRT + .JSON</span>
                  </p>
                  <p className="text-[11px] text-slate-600 dark:text-slate-300 mt-0.5">
                    Subtítulos y manifiesto instantáneos
                  </p>
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <p className="text-xs font-semibold text-slate-700 dark:text-slate-200">
                Plantilla Vibra Studio (opcional)
              </p>
              <select
                value={templateId}
                disabled={running}
                onChange={(e) => {
                  setTemplateId(e.target.value);
                  const tpl = allTemplates.find((t) => t.id === e.target.value);
                  if (tpl) setPreset(tpl.subtitlePreset);
                }}
                className="w-full rounded-xl border border-slate-900/12 dark:border-white/14 bg-white/90 dark:bg-[#0B1221] px-3 py-2.5 text-xs font-medium text-slate-900 dark:text-white"
              >
                <option value="">Mantener configuración individual de cada pieza</option>
                {allTemplates.map((tpl) => (
                  <option key={tpl.id} value={tpl.id}>
                    {tpl.isCustom ? `★ ${tpl.name}` : tpl.name} — {tpl.description}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <p className="text-xs font-semibold text-slate-700 dark:text-slate-200">
                Estilo global de subtítulos dinámicos
              </p>
              <div className="flex flex-wrap gap-1.5">
                {SUBTITLE_PRESETS.map((styleName) => (
                  <button
                    key={styleName}
                    type="button"
                    disabled={running}
                    onClick={() => setPreset(styleName)}
                    className={`rounded-xl px-3 py-2 text-xs font-semibold transition-colors cursor-pointer ${
                      preset === styleName
                        ? 'bg-gradient-to-r from-[#FF5A4E] to-[#F5A623] text-white'
                        : 'border border-slate-900/10 dark:border-white/12 text-slate-700 dark:text-slate-200 hover:bg-slate-900/5 dark:hover:bg-white/8'
                    }`}
                  >
                    {styleName}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <p className="text-xs font-semibold text-slate-700 dark:text-slate-200">
                Selección rápida de cola
              </p>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  disabled={running}
                  onClick={() => selectPresetGroup('grabado_edicion')}
                  className="rounded-xl border border-slate-900/10 dark:border-white/12 px-3 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-200 hover:border-[#FF5A4E] cursor-pointer"
                >
                  Grabado / En edición
                </button>
                <button
                  type="button"
                  disabled={running}
                  onClick={() => selectPresetGroup('con_voz')}
                  className="rounded-xl border border-slate-900/10 dark:border-white/12 px-3 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-200 hover:border-[#FF5A4E] cursor-pointer"
                >
                  Piezas Con voz (TTS)
                </button>
                <button
                  type="button"
                  disabled={running}
                  onClick={() => selectPresetGroup('none')}
                  className="rounded-xl border border-slate-900/10 dark:border-white/12 px-3 py-1.5 text-xs font-medium text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white cursor-pointer"
                >
                  Limpiar
                </button>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3">
            <label className="inline-flex items-center gap-2 text-xs font-medium text-slate-700 dark:text-slate-200 cursor-pointer">
              <input
                type="checkbox"
                checked={advanceToReady}
                disabled={running}
                onChange={(e) => setAdvanceToReady(e.target.checked)}
                className="accent-[#FF5A4E]"
              />
              <span>Avanzar automáticamente cada pieza completada al estado «Listo»</span>
            </label>

            {bridgeStatus?.available && completedMp4Entries.length > 0 && (
              <button
                type="button"
                onClick={() => void handleSaveAllMp4ToDisk()}
                className="inline-flex items-center gap-1.5 rounded-xl border border-[#F5A623]/45 bg-[#F5A623]/15 px-3 py-1.5 text-xs font-bold text-amber-800 dark:text-[#F5A623] hover:bg-[#F5A623]/25 cursor-pointer"
              >
                <HardDrive className="h-3.5 w-3.5" />
                <span>Guardar {completedMp4Entries.length} .MP4 en disco</span>
              </button>
            )}
          </div>

          {diskNotice && (
            <p className="text-xs font-semibold text-emerald-700 dark:text-emerald-300">
              {diskNotice}
            </p>
          )}

          <div className="divide-y divide-slate-900/8 dark:divide-white/8 rounded-2xl border border-slate-900/10 dark:border-white/10 bg-white/50 dark:bg-white/[0.025]">
            {selectablePieces.map((piece) => {
              const checked = selectedIds.includes(piece.id);
              const job = jobsMap[piece.id] ?? piece.lastRenderJob;
              const mp4 = mp4Map[piece.id];

              return (
                <div
                  key={piece.id}
                  className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-4 py-3"
                >
                  <label className="flex items-start gap-3 min-w-0 flex-1 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={checked}
                      disabled={running}
                      onChange={() => toggleId(piece.id)}
                      className="mt-1 accent-[#FF5A4E]"
                    />
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-slate-900 dark:text-white truncate">
                        {piece.hook}
                      </p>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400">
                        {formatShortDateEs(piece.date)} · {piece.status} ·{' '}
                        {piece.voice} · {piece.formatLabel}
                      </p>
                    </div>
                  </label>

                  <div className="flex items-center gap-3 shrink-0">
                    {mp4 ? (
                      <div className="flex items-center gap-2">
                        {mp4.status === 'completed' && (
                          <CheckCircle2
                            className="h-4 w-4 text-emerald-500 shrink-0"
                            aria-hidden="true"
                          />
                        )}
                        <div className="text-right">
                          <p
                            className={`font-mono-tabular text-[11px] font-semibold ${
                              mp4.status === 'failed'
                                ? 'text-rose-500'
                                : 'text-slate-700 dark:text-slate-200'
                            }`}
                          >
                            {mp4.error ?? mp4.statusText}
                          </p>
                          <div className="mt-1 h-1.5 w-32 overflow-hidden rounded-full bg-slate-900/10 dark:bg-white/10">
                            <div
                              style={{ width: `${mp4.progress}%` }}
                              className="h-full rounded-full bg-gradient-to-r from-[#FF5A4E] to-[#F5A623] transition-all duration-200"
                            />
                          </div>
                        </div>

                        {mp4.status === 'completed' && mp4.blob && (
                          <button
                            type="button"
                            onClick={() =>
                              downloadBlobFile(
                                `vibra_${piece.id}_reel.mp4`,
                                mp4.blob!
                              )
                            }
                            className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-2.5 py-1 text-[11px] font-bold text-white hover:bg-emerald-500 cursor-pointer"
                          >
                            <Download className="h-3 w-3" aria-hidden="true" />
                            <span>.MP4</span>
                          </button>
                        )}
                      </div>
                    ) : job ? (
                      <div className="flex items-center gap-2">
                        {job.status === 'completed' ? (
                          <CheckCircle2
                            className="h-4 w-4 text-emerald-500 shrink-0"
                            aria-hidden="true"
                          />
                        ) : null}
                        <div className="text-right">
                          <p className="font-mono-tabular text-[11px] font-semibold text-slate-700 dark:text-slate-200">
                            {statusLabel(job)}
                          </p>
                          <div className="mt-1 h-1.5 w-28 overflow-hidden rounded-full bg-slate-900/10 dark:bg-white/10">
                            <div
                              style={{ width: `${job.progress}%` }}
                              className="h-full rounded-full bg-gradient-to-r from-[#FF5A4E] to-[#F5A623] transition-all duration-200"
                            />
                          </div>
                        </div>

                        {job.status === 'completed' && (
                          <button
                            type="button"
                            onClick={() =>
                              downloadTextFile(
                                `vibra_${piece.id}.srt`,
                                job.srtContent,
                                'text/plain;charset=utf-8'
                              )
                            }
                            className="inline-flex items-center gap-1 rounded-lg border border-slate-900/10 dark:border-white/12 px-2 py-1 text-[11px] font-medium text-slate-700 dark:text-slate-200 hover:border-[#FF5A4E] cursor-pointer"
                            title="Descargar subtítulos .SRT"
                          >
                            <Download className="h-3 w-3" aria-hidden="true" />
                            <span>SRT</span>
                          </button>
                        )}
                      </div>
                    ) : null}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-900/10 dark:border-white/10 px-6 py-4">
          <span className="font-mono-tabular text-xs text-slate-500 dark:text-slate-400">
            {selectedIds.length} piezas seleccionadas en cola
          </span>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={running}
              className="rounded-xl border border-slate-900/10 dark:border-white/12 px-4 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-900/5 dark:hover:bg-white/8 cursor-pointer disabled:opacity-40"
            >
              Cerrar
            </button>
            <button
              type="button"
              onClick={() => void handleRunBatch()}
              disabled={running || selectedIds.length === 0}
              className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#FF5A4E] to-[#F5A623] px-5 py-2 text-xs font-bold text-white shadow-md shadow-[#FF5A4E]/25 hover:opacity-95 transition-opacity cursor-pointer disabled:opacity-45"
            >
              <Play className="h-3.5 w-3.5" aria-hidden="true" />
              <span>
                {running
                  ? 'Procesando cola…'
                  : outputMode === 'remotion-mp4'
                    ? `Renderizar ${selectedIds.length} .MP4`
                    : `Ejecutar Fábrica (${selectedIds.length})`}
              </span>
            </button>
          </div>
        </footer>
      </div>
    </div>
  );
};
