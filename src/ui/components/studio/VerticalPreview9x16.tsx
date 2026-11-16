import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Player, type PlayerRef } from '@remotion/player';
import {
  Bookmark,
  Eye,
  Heart,
  MessageCircle,
  Pause,
  Play,
  RotateCcw,
  Share2,
  ShieldCheck,
  Volume2,
  VolumeX,
} from 'lucide-react';
import type { ContentPiece } from '../../../domain/entities';
import { type SocialSafeZoneMode } from '../../../domain/value-objects';
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

interface VerticalPreview9x16Props {
  piece: ContentPiece;
  playheadSec: number;
  totalDurationSec: number;
  onPlayheadChange: (timeSec: number) => void;
  seekTriggerSec: { value: number; nonce: number } | null;
  onOpenSpectator?: () => void;
}

export const VerticalPreview9x16: React.FC<VerticalPreview9x16Props> = ({
  piece,
  playheadSec,
  totalDurationSec,
  onPlayheadChange,
  seekTriggerSec,
  onOpenSpectator,
}) => {
  const { ttsEngine, batchRenderer } = useVibraServices();
  const [isPlaying, setIsPlaying] = useState(false);
  const [audioMuted, setAudioMuted] = useState(false);
  const [safeZone, setSafeZone] = useState<SocialSafeZoneMode>('reels');

  const playerRef = useRef<PlayerRef | null>(null);

  const speechText = useMemo(() => {
    if (piece.voice === 'Con voz') {
      return (piece.voiceoverText || `${piece.hook}. ${piece.script}`).trim();
    }
    return `${piece.hook}. ${piece.script}`.trim();
  }, [piece.voice, piece.voiceoverText, piece.hook, piece.script]);

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

  const inputProps: VibraReelCompositionProps = useMemo(
    () => ({
      piece,
      cues: subtitleCues,
      safeZone,
      muted: audioMuted,
      bgmAudioUrl,
      sfxAudioUrl,
    }),
    [piece, subtitleCues, safeZone, audioMuted, bgmAudioUrl, sfxAudioUrl]
  );

  // Sync Remotion Player events -> playhead + Web Speech TTS lifecycle
  useEffect(() => {
    const player = playerRef.current;
    if (!player) return undefined;

    const handleFrameUpdate = (e: { detail: { frame: number } }) => {
      onPlayheadChange(
        Number((e.detail.frame / VIBRA_COMPOSITION_FPS).toFixed(2))
      );
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
  }, [onPlayheadChange, ttsEngine]);

  // External timeline seek -> Remotion Player.seekTo
  useEffect(() => {
    if (!seekTriggerSec || !playerRef.current) return;
    const targetFrame = Math.max(
      0,
      Math.min(
        durationInFrames - 1,
        Math.round(seekTriggerSec.value * VIBRA_COMPOSITION_FPS)
      )
    );
    playerRef.current.seekTo(targetFrame);
  }, [seekTriggerSec, durationInFrames]);

  // Reset when piece switches
  useEffect(() => {
    playerRef.current?.pause();
    playerRef.current?.seekTo(0);
    setIsPlaying(false);
    ttsEngine.stop();
    onPlayheadChange(0);
    return () => {
      ttsEngine.stop();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [piece.id]);

  const handleTogglePlay = () => {
    const player = playerRef.current;
    if (!player) return;

    if (isPlaying) {
      player.pause();
      return;
    }

    if (playheadSec >= totalDurationSec - 0.15) {
      player.seekTo(0);
      onPlayheadChange(0);
    }

    player.play();

    // Play live browser TTS only if piece uses voice AND no custom uploaded audio overrides it
    if (!audioMuted && piece.voice === 'Con voz' && !piece.customAudioUrl) {
      ttsEngine.speak(speechText, piece.voiceConfig);
    }
  };

  const handleRestart = () => {
    playerRef.current?.pause();
    playerRef.current?.seekTo(0);
    ttsEngine.stop();
    setIsPlaying(false);
    onPlayheadChange(0);
  };

  const progressPct = Math.min(
    100,
    (playheadSec / Math.max(0.1, totalDurationSec)) * 100
  );
  const safeZoneActive = safeZone !== 'off';

  return (
    <div className="flex flex-col items-center gap-3 w-full">
      {/* Social Safe Zone Toggle Bar + Modo Espectador */}
      <div className="flex flex-wrap items-center justify-center gap-1.5">
        <div className="flex items-center gap-1 rounded-xl border border-slate-900/10 dark:border-white/12 bg-white/75 dark:bg-white/[0.06] p-1">
          <span className="inline-flex items-center gap-1 px-2 text-[10px] font-semibold text-slate-600 dark:text-slate-300">
            <ShieldCheck className="h-3 w-3 text-[#FF5A4E]" aria-hidden="true" />
            <span>Zona Segura:</span>
          </span>
          {(
            [
              { id: 'off', label: 'Off' },
              { id: 'reels', label: 'IG Reels' },
              { id: 'tiktok', label: 'TikTok' },
            ] as const
          ).map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setSafeZone(item.id)}
              className={`rounded-lg px-2 py-1 text-[10px] font-semibold transition-colors cursor-pointer ${
                safeZone === item.id
                  ? 'bg-[#FF5A4E] text-white'
                  : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>

        {onOpenSpectator && (
          <button
            type="button"
            onClick={onOpenSpectator}
            className="inline-flex items-center gap-1.5 rounded-xl border border-[#F5A623]/45 bg-[#F5A623]/15 px-2.5 py-1.5 text-[10px] font-bold text-amber-800 dark:text-[#F5A623] hover:bg-[#F5A623]/25 cursor-pointer"
          >
            <Eye className="h-3 w-3" aria-hidden="true" />
            <span>Modo Espectador</span>
          </button>
        )}
      </div>

      {/* 9:16 Vertical Remotion Player Frame */}
      <div className="relative aspect-[9/16] w-full max-w-[264px] overflow-hidden rounded-[2.25rem] border-[5px] border-slate-900/90 dark:border-white/18 bg-[#0B1221] shadow-2xl">
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
          loop={false}
          initiallyMuted={audioMuted}
          acknowledgeRemotionLicense
        />

        {/* Social Safe Zones Exclusion Overlay */}
        {safeZoneActive && (
          <div
            aria-label={`Guía de zona segura ${safeZone === 'reels' ? 'Instagram Reels' : 'TikTok'}`}
            className="pointer-events-none absolute inset-0 z-10"
          >
            <div className="absolute inset-x-0 top-0 h-11 border-b border-dashed border-rose-400/70 bg-rose-500/15 flex items-end justify-center pb-1">
              <span className="text-[9px] font-semibold uppercase tracking-wider text-rose-200">
                Zona UI Superior ({safeZone === 'reels' ? 'Reels' : 'TikTok'})
              </span>
            </div>

            <div
              className={`absolute right-0 w-10 border-l border-dashed border-rose-400/70 bg-rose-500/15 flex flex-col items-center justify-end gap-2.5 pb-3 ${
                safeZone === 'tiktok' ? 'top-12 bottom-24' : 'top-12 bottom-20'
              }`}
            >
              <Heart className="h-3.5 w-3.5 text-white/70" />
              <MessageCircle className="h-3.5 w-3.5 text-white/70" />
              <Bookmark className="h-3.5 w-3.5 text-white/70" />
              <Share2 className="h-3.5 w-3.5 text-white/70" />
            </div>

            <div
              className={`absolute inset-x-0 bottom-0 border-t border-dashed border-rose-400/70 bg-rose-500/15 px-3 pt-2 ${
                safeZone === 'tiktok' ? 'h-24' : 'h-20'
              }`}
            >
              <div className="flex items-center gap-2">
                <span className="h-4 w-4 rounded-full bg-white/30 shrink-0" />
                <span className="text-[10px] font-semibold text-white/85">
                  @vibramusic.sjl
                </span>
              </div>
              <p className="mt-1 text-[9px] text-rose-200 truncate">
                Zona tapada por copy, avatar y barra inferior
              </p>
            </div>
          </div>
        )}

        {/* Bottom Scrubber inside Player Frame */}
        <div className="absolute inset-x-0 bottom-0 z-30 p-3 space-y-1 bg-gradient-to-t from-black/85 to-transparent">
          <input
            type="range"
            min={0}
            max={totalDurationSec}
            step={0.05}
            value={playheadSec}
            aria-label="Línea de tiempo del video 9:16"
            onChange={(e) => {
              const sec = Number(e.target.value);
              const targetFrame = Math.round(sec * VIBRA_COMPOSITION_FPS);
              playerRef.current?.seekTo(targetFrame);
              onPlayheadChange(sec);
            }}
            className="w-full h-1 accent-[#FF5A4E] cursor-pointer"
          />
          <div className="flex items-center justify-between font-mono-tabular text-[10px] text-white/90">
            <span>{playheadSec.toFixed(1)}s</span>
            <span>Remotion 30fps · {progressPct.toFixed(0)}%</span>
            <span>{totalDurationSec.toFixed(1)}s</span>
          </div>
        </div>
      </div>

      {/* Player Controls */}
      <div className="flex items-center justify-center gap-2">
        <button
          type="button"
          onClick={handleTogglePlay}
          className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#FF5A4E] to-[#F5A623] px-4 py-2 text-xs font-bold text-white shadow-md shadow-[#FF5A4E]/25 hover:opacity-95 cursor-pointer"
        >
          {isPlaying ? (
            <>
              <Pause className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Pausar 9:16</span>
            </>
          ) : (
            <>
              <Play className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Play Remotion</span>
            </>
          )}
        </button>

        <button
          type="button"
          onClick={handleRestart}
          aria-label="Reiniciar reproducción"
          className="rounded-xl border border-slate-900/12 dark:border-white/14 p-2 text-slate-700 dark:text-slate-200 hover:bg-slate-900/5 dark:hover:bg-white/8 cursor-pointer"
        >
          <RotateCcw className="h-4 w-4" aria-hidden="true" />
        </button>

        <button
          type="button"
          onClick={() => {
            const nextMuted = !audioMuted;
            if (nextMuted) {
              ttsEngine.stop();
              playerRef.current?.mute();
            } else {
              playerRef.current?.unmute();
            }
            setAudioMuted(nextMuted);
          }}
          aria-label={audioMuted ? 'Activar audio' : 'Silenciar audio'}
          className="rounded-xl border border-slate-900/12 dark:border-white/14 p-2 text-slate-700 dark:text-slate-200 hover:bg-slate-900/5 dark:hover:bg-white/8 cursor-pointer"
        >
          {audioMuted ? (
            <VolumeX className="h-4 w-4 text-rose-500" aria-hidden="true" />
          ) : (
            <Volume2 className="h-4 w-4 text-emerald-500" aria-hidden="true" />
          )}
        </button>
      </div>
    </div>
  );
};
