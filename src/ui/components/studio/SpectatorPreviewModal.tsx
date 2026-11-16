import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Player, type PlayerRef } from '@remotion/player';
import {
  CheckCircle2,
  Eye,
  Pause,
  Play,
  RotateCcw,
  Timer,
  Volume2,
  VolumeX,
  X,
} from 'lucide-react';
import type { ContentPiece, SpectatorAudit } from '../../../domain/entities';
import { getProceduralBgmWavUrl } from '../../../infrastructure/audio/proceduralBgmWav';
import { getProceduralSfxWavUrl } from '../../../infrastructure/audio/proceduralSfxWav';
import {
  VIBRA_COMPOSITION_FPS,
  VIBRA_COMPOSITION_HEIGHT,
  VIBRA_COMPOSITION_WIDTH,
  VibraReelComposition,
  type VibraReelCompositionProps,
} from '../../../infrastructure/remotion/VibraReelComposition';
import { useVibraServices } from '../../context/VibraServicesContext';

interface SpectatorPreviewModalProps {
  open: boolean;
  piece: ContentPiece;
  totalDurationSec: number;
  onClose: () => void;
  onSaveAudit: (audit: SpectatorAudit) => void;
}

const DEFAULT_AUDIT: SpectatorAudit = {
  hookIn3Sec: false,
  safeZonesClear: false,
  paceNoDeadAir: false,
  audioBalanced: false,
  ctaClear: false,
};

const AUDIT_ITEMS: Array<{
  key: keyof Omit<SpectatorAudit, 'auditedAt'>;
  label: string;
  hint: string;
}> = [
  {
    key: 'hookIn3Sec',
    label: '1. Gancho irresistible en 0–3s',
    hint: '¿Entiendes de qué trata el Short sin leer la descripción?',
  },
  {
    key: 'safeZonesClear',
    label: '2. Subtítulos fuera de zonas tapadas',
    hint: 'Nada choca con avatar inferior ni botones de likes/comentarios.',
  },
  {
    key: 'paceNoDeadAir',
    label: '3. Ritmo visual sin tiempos muertos',
    hint: 'Cambios de toma o movimiento constante cada 2–3 segundos.',
  },
  {
    key: 'audioBalanced',
    label: '4. Voz entendible (y funcional en silencio)',
    hint: 'Comprobado tanto con sonido activo como en Sound-Off solo con karaoke.',
  },
  {
    key: 'ctaClear',
    label: '5. Cierre con CTA claro para Vibra Music',
    hint: 'El espectador sabe exactamente qué paso dar al terminar.',
  },
];

export const SpectatorPreviewModal: React.FC<SpectatorPreviewModalProps> = ({
  open,
  piece,
  totalDurationSec,
  onClose,
  onSaveAudit,
}) => {
  const { batchRenderer, ttsEngine } = useVibraServices();
  const playerRef = useRef<PlayerRef | null>(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [soundOff, setSoundOff] = useState(false);
  const [playheadSec, setPlayheadSec] = useState(0);
  const [audit, setAudit] = useState<SpectatorAudit>(
    piece.spectatorAudit ?? DEFAULT_AUDIT
  );

  useEffect(() => {
    if (open) {
      setAudit(piece.spectatorAudit ?? DEFAULT_AUDIT);
      setPlayheadSec(0);
      setIsPlaying(false);
    } else {
      ttsEngine.stop();
    }
  }, [open, piece.id, piece.spectatorAudit, ttsEngine]);

  const subtitleCues = useMemo(
    () => batchRenderer.buildSubtitleCues(piece, totalDurationSec),
    [batchRenderer, piece, totalDurationSec]
  );
  const bgmAudioUrl = useMemo(
    () => getProceduralBgmWavUrl(piece.bgmTrackId),
    [piece.bgmTrackId]
  );

  const sfxAudioUrl = useMemo(
    () =>
      piece.sfxEnabled !== false
        ? getProceduralSfxWavUrl(piece.kineticBeats, totalDurationSec)
        : undefined,
    [piece.sfxEnabled, piece.kineticBeats, totalDurationSec]
  );

  const durationInFrames = Math.max(
    VIBRA_COMPOSITION_FPS * 8,
    Math.round(totalDurationSec * VIBRA_COMPOSITION_FPS)
  );

  const speechText = useMemo(() => {
    if (piece.voice === 'Con voz') {
      return (piece.voiceoverText || `${piece.hook}. ${piece.script}`).trim();
    }
    return `${piece.hook}. ${piece.script}`.trim();
  }, [piece.voice, piece.voiceoverText, piece.hook, piece.script]);

  const inputProps: VibraReelCompositionProps = useMemo(
    () => ({
      piece,
      cues: subtitleCues,
      safeZone: 'off',
      muted: soundOff,
      bgmAudioUrl,
      sfxAudioUrl,
    }),
    [piece, subtitleCues, soundOff, bgmAudioUrl, sfxAudioUrl]
  );

  useEffect(() => {
    const player = playerRef.current;
    if (!player || !open) return undefined;

    const handleFrameUpdate = (e: { detail: { frame: number } }) => {
      setPlayheadSec(Number((e.detail.frame / VIBRA_COMPOSITION_FPS).toFixed(2)));
    };
    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => {
      setIsPlaying(false);
      ttsEngine.stop();
    };
    const handleEnded = () => {
      setIsPlaying(false);
      ttsEngine.stop();
    };

    player.addEventListener('frameupdate', handleFrameUpdate);
    player.addEventListener('play', handlePlay);
    player.addEventListener('pause', handlePause);
    player.addEventListener('ended', handleEnded);

    return () => {
      player.removeEventListener('frameupdate', handleFrameUpdate);
      player.removeEventListener('play', handlePlay);
      player.removeEventListener('pause', handlePause);
      player.removeEventListener('ended', handleEnded);
    };
  }, [open, ttsEngine]);

  if (!open) return null;

  const hookWindowActive = playheadSec <= 3.0;
  const passedCount = AUDIT_ITEMS.filter((item) => audit[item.key]).length;

  const handleTogglePlay = () => {
    const player = playerRef.current;
    if (!player) return;

    if (isPlaying) {
      player.pause();
      return;
    }

    if (playheadSec >= totalDurationSec - 0.15) {
      player.seekTo(0);
      setPlayheadSec(0);
    }

    player.play();
    if (!soundOff && piece.voice === 'Con voz' && !piece.customAudioUrl) {
      ttsEngine.speak(speechText, piece.voiceConfig);
    }
  };

  const handleToggleSoundOff = () => {
    const nextMuted = !soundOff;
    if (nextMuted) {
      ttsEngine.stop();
      playerRef.current?.mute();
    } else {
      playerRef.current?.unmute();
    }
    setSoundOff(nextMuted);
  };

  const handleToggleCheck = (key: keyof Omit<SpectatorAudit, 'auditedAt'>) => {
    const next: SpectatorAudit = {
      ...audit,
      [key]: !audit[key],
      auditedAt: new Date().toISOString(),
    };
    setAudit(next);
    onSaveAudit(next);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Modo Espectador 9:16"
      className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/95 p-4"
    >
      <div className="relative flex max-h-[94vh] w-full max-w-5xl flex-col lg:flex-row items-center lg:items-stretch justify-center gap-6 overflow-y-auto rounded-3xl border border-white/15 bg-[#0B1221] p-5 sm:p-7 shadow-2xl">
        <button
          type="button"
          onClick={() => {
            playerRef.current?.pause();
            ttsEngine.stop();
            onClose();
          }}
          aria-label="Salir de Modo Espectador"
          className="absolute right-4 top-4 rounded-xl border border-white/15 bg-white/8 p-2 text-slate-200 hover:bg-white/15 cursor-pointer"
        >
          <X className="h-5 w-5" aria-hidden="true" />
        </button>

        {/* Left: Distraction-free 9:16 Screen */}
        <div className="flex flex-col items-center gap-3 shrink-0">
          <div className="flex items-center gap-2 text-xs font-semibold text-white/90">
            <Eye className="h-4 w-4 text-[#FF5A4E]" aria-hidden="true" />
            <span>Vista real de celular 9:16 (sin guías de editor)</span>
          </div>

          <div className="relative aspect-[9/16] w-[260px] sm:w-[290px] overflow-hidden rounded-[2.4rem] border-[6px] border-white/20 bg-black shadow-2xl">
            <Player
              ref={playerRef}
              component={VibraReelComposition}
              inputProps={inputProps}
              durationInFrames={durationInFrames}
              fps={VIBRA_COMPOSITION_FPS}
              compositionWidth={VIBRA_COMPOSITION_WIDTH}
              compositionHeight={VIBRA_COMPOSITION_HEIGHT}
              style={{ width: '100%', height: '100%' }}
              controls={false}
              clickToPlay
              loop
              initiallyMuted={soundOff}
              acknowledgeRemotionLicense
            />

            {/* 0-3s Hook Window Indicator */}
            <div className="pointer-events-none absolute top-3 left-3 right-3 flex items-center justify-between text-[11px] font-mono-tabular">
              <span
                className={`inline-flex items-center gap-1 rounded-lg px-2 py-1 font-bold ${
                  hookWindowActive
                    ? 'bg-[#FF5A4E] text-white'
                    : 'bg-black/65 text-white/80'
                }`}
              >
                <Timer className="h-3 w-3" aria-hidden="true" />
                {hookWindowActive
                  ? `HOOK 0–3s (${playheadSec.toFixed(1)}s)`
                  : `${playheadSec.toFixed(1)}s / ${totalDurationSec.toFixed(1)}s`}
              </span>
              {soundOff && (
                <span className="rounded-lg bg-amber-500 px-2 py-1 font-bold text-slate-950">
                  EN SILENCIO
                </span>
              )}
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-2">
            <button
              type="button"
              onClick={handleTogglePlay}
              className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#FF5A4E] to-[#F5A623] px-4 py-2 text-xs font-bold text-white cursor-pointer"
            >
              {isPlaying ? (
                <>
                  <Pause className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>Pausar</span>
                </>
              ) : (
                <>
                  <Play className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>Ver como espectador</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={() => {
                playerRef.current?.seekTo(0);
                setPlayheadSec(0);
              }}
              aria-label="Reiniciar desde 0s"
              className="rounded-xl border border-white/15 p-2 text-slate-200 hover:bg-white/10 cursor-pointer"
            >
              <RotateCcw className="h-4 w-4" aria-hidden="true" />
            </button>

            <button
              type="button"
              onClick={handleToggleSoundOff}
              className={`inline-flex items-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-semibold cursor-pointer ${
                soundOff
                  ? 'border-[#F5A623] bg-[#F5A623]/15 text-[#F5A623]'
                  : 'border-white/15 bg-white/5 text-slate-200'
              }`}
            >
              {soundOff ? (
                <>
                  <VolumeX className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>Test Sound-Off</span>
                </>
              ) : (
                <>
                  <Volume2 className="h-3.5 w-3.5 text-emerald-400" aria-hidden="true" />
                  <span>Con sonido</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Right: Paso 5 — Viewer Checklist */}
        <div className="flex flex-1 flex-col justify-between gap-4 rounded-2xl border border-white/12 bg-white/[0.04] p-5 text-white">
          <div className="space-y-4">
            <div className="space-y-1 pr-8">
              <p className="text-[11px] font-bold uppercase tracking-wider text-[#F5A623]">
                Paso 5 · Revisión con Ojos de Espectador
              </p>
              <h3 className="font-display text-lg font-bold text-white">
                Auditoría de Retención ({passedCount}/5)
              </h3>
              <p className="text-xs text-slate-300">
                Mira el video completo una vez con sonido y otra en silencio («Test Sound-Off») antes de aprobar o publicar.
              </p>
            </div>

            <div className="space-y-2.5">
              {AUDIT_ITEMS.map((item) => {
                const checked = audit[item.key];
                return (
                  <button
                    key={item.key}
                    type="button"
                    onClick={() => handleToggleCheck(item.key)}
                    className={`flex w-full items-start gap-3 rounded-xl border p-3 text-left transition-colors cursor-pointer ${
                      checked
                        ? 'border-emerald-500/45 bg-emerald-500/12'
                        : 'border-white/12 bg-white/[0.02] hover:border-white/25'
                    }`}
                  >
                    <CheckCircle2
                      className={`mt-0.5 h-4 w-4 shrink-0 ${
                        checked ? 'text-emerald-400' : 'text-slate-500'
                      }`}
                      aria-hidden="true"
                    />
                    <div className="space-y-0.5">
                      <p className="text-xs font-bold text-white">{item.label}</p>
                      <p className="text-[11px] text-slate-300">{item.hint}</p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex items-center justify-between gap-3 border-t border-white/10 pt-3">
            <span className="text-xs text-slate-300">
              {passedCount === 5
                ? 'Pieza validada y lista para publicar'
                : `Faltan ${5 - passedCount} verificaciones`}
            </span>
            <button
              type="button"
              onClick={() => {
                playerRef.current?.pause();
                ttsEngine.stop();
                onClose();
              }}
              className="rounded-xl bg-white px-4 py-2 text-xs font-bold text-slate-900 hover:opacity-90 cursor-pointer"
            >
              Volver al Studio
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
