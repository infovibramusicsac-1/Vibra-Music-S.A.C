import React from 'react';
import {
  AbsoluteFill,
  Audio,
  Img,
  interpolate,
  Sequence,
  spring,
  useCurrentFrame,
  useVideoConfig,
  Video,
} from 'remotion';
import { computeClipTimelineRanges } from '../../application/use-cases/PieceWorkflowUseCases';
import type {
  ContentPiece,
  KineticBeat,
  SceneClip,
  SubtitleCue,
} from '../../domain/entities';
import {
  BGM_CATALOG,
  DEFAULT_REMOTION_STYLE,
  type CameraMotionPreset,
  type ColorGradePreset,
  type CtaStickerStyle,
  type HookBannerStyle,
  type RemotionFontFamily,
  type RemotionStyleConfig,
  type SocialSafeZoneMode,
  type TextAnimationStyle,
  type TransitionPreset,
} from '../../domain/value-objects';

export const VIBRA_COMPOSITION_FPS = 30;
export const VIBRA_COMPOSITION_WIDTH = 1080;
export const VIBRA_COMPOSITION_HEIGHT = 1920;

export interface VibraReelCompositionProps extends Record<string, unknown> {
  piece: ContentPiece;
  cues: SubtitleCue[];
  safeZone?: SocialSafeZoneMode;
  muted?: boolean;
  bgmAudioUrl?: string;
  sfxAudioUrl?: string;
}

interface ClipTimelineSegment {
  clip: SceneClip;
  index: number;
  startFrame: number;
  durationInFrames: number;
}

function buildClipSegments(
  clips: SceneClip[],
  fps: number,
  totalFrames: number
): ClipTimelineSegment[] {
  if (clips.length === 0) return [];
  const ranges = computeClipTimelineRanges(clips);
  const segments: ClipTimelineSegment[] = [];

  for (let i = 0; i < ranges.length; i += 1) {
    const r = ranges[i];
    const startFrame = Math.max(0, Math.round(r.startSec * fps));
    if (startFrame >= totalFrames) continue;

    const rawFrames = Math.max(15, Math.round((r.endSec - r.startSec) * fps));
    const isLast = i === ranges.length - 1;
    const hasExplicitOffsets = clips.some((c) => typeof c.startSec === 'number');
    const durationInFrames =
      isLast && !hasExplicitOffsets
        ? Math.max(rawFrames, totalFrames - startFrame)
        : Math.min(rawFrames, Math.max(15, totalFrames - startFrame));

    segments.push({
      clip: r.clip,
      index: r.index,
      startFrame,
      durationInFrames,
    });
  }

  return segments;
}

function resolveFontStack(font: RemotionFontFamily): string {
  switch (font) {
    case 'Oswald':
      return "'Oswald', 'Plus Jakarta Sans', sans-serif";
    case 'Playfair Display':
      return "'Playfair Display', Georgia, serif";
    case 'JetBrains Mono':
      return "'JetBrains Mono', monospace";
    default:
      return "'Plus Jakarta Sans', 'DM Sans', system-ui, sans-serif";
  }
}

function resolveColorFilter(grade: ColorGradePreset): string {
  switch (grade) {
    case 'Warm Vibra':
      return 'saturate(1.18) contrast(1.06) sepia(0.12) brightness(1.02)';
    case 'Cinematic':
      return 'contrast(1.14) saturate(0.92) brightness(0.96)';
    case 'High Contrast':
      return 'contrast(1.28) saturate(1.15) brightness(1.03)';
    case 'Nocturne Cool':
      return 'contrast(1.12) saturate(1.08) hue-rotate(-8deg) brightness(0.95)';
    default:
      return 'none';
  }
}

function hexToRgba(hex: string, alpha: number): string {
  const clean = hex.replace('#', '');
  if (!/^[0-9a-fA-F]{6}$/.test(clean)) {
    return `rgba(7, 11, 20, ${alpha})`;
  }
  const r = parseInt(clean.slice(0, 2), 16);
  const g = parseInt(clean.slice(2, 4), 16);
  const b = parseInt(clean.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

const DemoBackdrop: React.FC<{
  clip?: SceneClip;
  index: number;
}> = ({ clip, index }) => {
  const frame = useCurrentFrame();
  const pulse = interpolate(Math.sin(frame / 18 + index), [-1, 1], [0.92, 1.08]);
  const accent = clip?.accentTone ?? (index % 2 === 0 ? '#FF5A4E' : '#F5A623');

  return (
    <AbsoluteFill
      style={{
        background:
          accent === '#F5A623'
            ? 'radial-gradient(circle at 28% 24%, rgba(245,166,35,0.48), transparent 55%), radial-gradient(circle at 78% 78%, rgba(255,90,78,0.28), transparent 55%), linear-gradient(165deg, #16223D 0%, #0B1221 100%)'
            : 'radial-gradient(circle at 74% 22%, rgba(255,90,78,0.5), transparent 55%), radial-gradient(circle at 22% 82%, rgba(245,166,35,0.32), transparent 55%), linear-gradient(165deg, #111B33 0%, #0B1221 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <div
        style={{
          width: 620,
          height: 620,
          borderRadius: '9999px',
          border: `2px solid ${accent}40`,
          transform: `scale(${pulse})`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <div
          style={{
            width: 390,
            height: 390,
            borderRadius: '9999px',
            border: '2px solid rgba(255,255,255,0.14)',
            background:
              'radial-gradient(circle, rgba(255,255,255,0.06) 0%, transparent 72%)',
          }}
        />
      </div>
    </AbsoluteFill>
  );
};

const CameraMotionWrapper: React.FC<{
  motion: CameraMotionPreset;
  intensity: number;
  clipDurationFrames: number;
  bpm: number;
  children: React.ReactNode;
}> = ({ motion, intensity, clipDurationFrames, bpm, children }) => {
  const localFrame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const progress = interpolate(
    localFrame,
    [0, Math.max(1, clipDurationFrames - 1)],
    [0, 1],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
  );
  const amp = Math.max(0.04, Math.min(0.28, intensity || 0.14));

  let transform = 'none';
  if (motion === 'Zoom In') {
    const scale = interpolate(progress, [0, 1], [1.0, 1 + amp]);
    transform = `scale(${scale})`;
  } else if (motion === 'Zoom Out') {
    const scale = interpolate(progress, [0, 1], [1 + amp, 1.0]);
    transform = `scale(${scale})`;
  } else if (motion === 'Pan Left') {
    const panPct = Number((amp * 25).toFixed(2));
    const tx = interpolate(progress, [0, 1], [panPct, -panPct]);
    transform = `scale(${(1 + amp * 0.85).toFixed(3)}) translateX(${tx}%)`;
  } else if (motion === 'Pan Right') {
    const panPct = Number((amp * 25).toFixed(2));
    const tx = interpolate(progress, [0, 1], [-panPct, panPct]);
    transform = `scale(${(1 + amp * 0.85).toFixed(3)}) translateX(${tx}%)`;
  } else if (motion === 'Beat Pulse') {
    const beatOsc = Math.abs(
      Math.sin((localFrame / fps) * (bpm / 60) * Math.PI)
    );
    const scale = 1.01 + beatOsc * amp * 0.45;
    transform = `scale(${scale})`;
  }

  return (
    <AbsoluteFill style={{ transform, transformOrigin: 'center center' }}>
      {children}
    </AbsoluteFill>
  );
};

const TransitionClipWrapper: React.FC<{
  transition: TransitionPreset;
  transitionFrames: number;
  clipDurationFrames: number;
  isFirst: boolean;
  children: React.ReactNode;
}> = ({
  transition,
  transitionFrames,
  clipDurationFrames,
  isFirst,
  children,
}) => {
  const localFrame = useCurrentFrame();
  if (transition === 'Corte' || transitionFrames <= 1 || isFirst) {
    return <AbsoluteFill>{children}</AbsoluteFill>;
  }

  const tf = Math.min(transitionFrames, Math.floor(clipDurationFrames / 2));
  const enterProgress = interpolate(localFrame, [0, tf], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  if (transition === 'Fade') {
    return (
      <AbsoluteFill style={{ opacity: enterProgress }}>{children}</AbsoluteFill>
    );
  }

  if (transition === 'Slide') {
    const tx = interpolate(enterProgress, [0, 1], [100, 0]);
    return (
      <AbsoluteFill
        style={{
          transform: `translateX(${tx}%)`,
          opacity: interpolate(enterProgress, [0, 0.25, 1], [0.2, 1, 1]),
        }}
      >
        {children}
      </AbsoluteFill>
    );
  }

  if (transition === 'Flash') {
    const flashOpacity = interpolate(enterProgress, [0, 0.25, 1], [0.95, 0.75, 0]);
    const brightness = interpolate(enterProgress, [0, 1], [2.1, 1.0]);
    return (
      <AbsoluteFill style={{ filter: `brightness(${brightness})` }}>
        {children}
        {flashOpacity > 0.01 && (
          <AbsoluteFill
            style={{
              backgroundColor: `rgba(255,255,255,${flashOpacity})`,
              pointerEvents: 'none',
            }}
          />
        )}
      </AbsoluteFill>
    );
  }

  if (transition === 'Cross Zoom') {
    const zoomScale = interpolate(enterProgress, [0, 1], [1.24, 1.0]);
    const blurPx = interpolate(enterProgress, [0, 1], [10, 0]);
    return (
      <AbsoluteFill
        style={{
          transform: `scale(${zoomScale})`,
          filter: blurPx > 0.2 ? `blur(${blurPx.toFixed(1)}px)` : 'none',
          opacity: interpolate(enterProgress, [0, 0.35, 1], [0.2, 0.9, 1]),
        }}
      >
        {children}
      </AbsoluteFill>
    );
  }

  if (transition === 'Glitch') {
    const isGlitching = localFrame < tf;
    const step = localFrame % 3;
    const jitterX = isGlitching
      ? (step === 0 ? -18 : step === 1 ? 16 : -8) * (1 - enterProgress)
      : 0;
    const skewX = isGlitching ? (step === 0 ? -4 : 4) * (1 - enterProgress) : 0;
    const sat = isGlitching ? 1.8 - enterProgress * 0.8 : 1;
    return (
      <AbsoluteFill
        style={{
          transform: `translateX(${jitterX.toFixed(1)}px) skewX(${skewX.toFixed(1)}deg)`,
          filter: isGlitching ? `saturate(${sat.toFixed(2)}) contrast(1.25)` : 'none',
        }}
      >
        {children}
        {isGlitching && step === 1 && (
          <AbsoluteFill
            style={{
              background:
                'repeating-linear-gradient(0deg, rgba(255,90,78,0.16) 0px, rgba(255,90,78,0.16) 6px, transparent 6px, transparent 18px)',
              pointerEvents: 'none',
            }}
          />
        )}
      </AbsoluteFill>
    );
  }

  if (transition === 'Flip 3D') {
    const rotateY = interpolate(enterProgress, [0, 1], [90, 0]);
    return (
      <AbsoluteFill
        style={{
          transform: `perspective(1200px) rotateY(${rotateY}deg)`,
          opacity: interpolate(enterProgress, [0, 0.2, 1], [0, 1, 1]),
          backfaceVisibility: 'hidden',
        }}
      >
        {children}
      </AbsoluteFill>
    );
  }

  const clipPct = interpolate(enterProgress, [0, 1], [100, 0]);
  return (
    <AbsoluteFill
      style={{
        clipPath: `inset(0 ${clipPct}% 0 0)`,
      }}
    >
      {children}
    </AbsoluteFill>
  );
};

const SfxVisualEffect: React.FC<{
  beat: KineticBeat;
  accentColor: string;
}> = ({ beat, accentColor }) => {
  const localFrame = useCurrentFrame();

  if (beat.sfxKind === 'boom_flash' || beat.sfxKind === 'flash') {
    // 3 rhythmic flash pulses in first 18 frames (0..4, 6..10, 12..16)
    const burst = (start: number, peak: number) =>
      localFrame >= start && localFrame <= start + 4
        ? interpolate(
            localFrame,
            [start, start + 1.5, start + 4],
            [0, peak, 0],
            { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
          )
        : 0;
    const flashOpacity = Math.max(
      burst(0, 0.42),
      burst(6, 0.34),
      burst(12, 0.28)
    );

    if (flashOpacity <= 0.01) return null;
    return (
      <AbsoluteFill
        style={{
          background: `radial-gradient(circle at center, rgba(255,255,255,${flashOpacity}) 0%, ${hexToRgba(accentColor, flashOpacity * 0.65)} 60%, transparent 100%)`,
          pointerEvents: 'none',
        }}
      />
    );
  }

  if (beat.sfxKind === 'whoosh') {
    if (localFrame > 14) return null;
    const sweepX = interpolate(localFrame, [0, 14], [-110, 125], {
      extrapolateRight: 'clamp',
    });
    const sweepOpacity = interpolate(localFrame, [0, 6, 14], [0, 0.36, 0], {
      extrapolateRight: 'clamp',
    });
    return (
      <AbsoluteFill style={{ pointerEvents: 'none', overflow: 'hidden' }}>
        <div
          style={{
            position: 'absolute',
            top: '-10%',
            bottom: '-10%',
            width: '48%',
            transform: `translateX(${sweepX}%) skewX(-18deg)`,
            background: `linear-gradient(90deg, transparent 0%, ${hexToRgba(accentColor, sweepOpacity)} 50%, transparent 100%)`,
          }}
        />
      </AbsoluteFill>
    );
  }

  if (beat.sfxKind === 'boom' || beat.sfxKind === 'ding_stop') {
    if (localFrame > 12) return null;
    const opacity = interpolate(localFrame, [0, 3, 12], [0, 0.28, 0], {
      extrapolateRight: 'clamp',
    });
    return (
      <AbsoluteFill
        style={{
          border: `16px solid ${hexToRgba(accentColor, opacity)}`,
          pointerEvents: 'none',
        }}
      />
    );
  }

  return null;
};

const HookBannerSequence: React.FC<{
  hookText: string;
  hookStyle: HookBannerStyle;
  accentColor: string;
  fontFamily: string;
  rightMarginPx: number;
}> = ({ hookText, hookStyle, accentColor, fontFamily, rightMarginPx }) => {
  const localFrame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const hookSpring = spring({
    frame: localFrame,
    fps,
    config: { damping: 15, stiffness: 135 },
  });

  if (hookStyle === 'Full Screen') {
    const bgFade = interpolate(localFrame, [0, 10], [0, 1], {
      extrapolateRight: 'clamp',
    });
    return (
      <AbsoluteFill
        style={{
          justifyContent: 'center',
          alignItems: 'center',
          padding: '0 72px',
          background: `radial-gradient(circle at center, rgba(11,18,33,${0.86 * bgFade}), rgba(6,10,20,${0.94 * bgFade}))`,
          pointerEvents: 'none',
        }}
      >
        <div
          style={{
            textAlign: 'center',
            transform: `scale(${interpolate(hookSpring, [0, 1], [1.22, 1])})`,
            opacity: hookSpring,
            fontFamily,
          }}
        >
          <div
            style={{
              fontSize: 26,
              fontWeight: 800,
              letterSpacing: '0.16em',
              textTransform: 'uppercase',
              color: accentColor,
              marginBottom: 18,
            }}
          >
            Vibra Music S.A.C.
          </div>
          <div
            style={{
              fontSize: 64,
              fontWeight: 900,
              lineHeight: 1.12,
              color: '#FFFFFF',
              textShadow: '0 10px 30px rgba(0,0,0,0.65)',
            }}
          >
            {hookText}
          </div>
        </div>
      </AbsoluteFill>
    );
  }

  if (hookStyle === 'Kinetic Slam') {
    const slamScale = interpolate(hookSpring, [0, 1], [1.38, 1]);
    return (
      <div
        style={{
          position: 'absolute',
          top: 170,
          left: 52,
          right: rightMarginPx,
          transform: `scale(${slamScale})`,
          opacity: hookSpring,
          fontFamily,
          textAlign: 'center',
        }}
      >
        <div
          style={{
            display: 'inline-block',
            borderRadius: 18,
            backgroundColor: accentColor,
            padding: '8px 22px',
            fontSize: 24,
            fontWeight: 900,
            textTransform: 'uppercase',
            letterSpacing: '0.08em',
            color: '#0B1221',
            marginBottom: 14,
          }}
        >
          Atención
        </div>
        <div
          style={{
            fontSize: 54,
            fontWeight: 900,
            lineHeight: 1.12,
            color: '#FFFFFF',
            textShadow: `0 6px 0 #0B1221, 0 14px 30px rgba(0,0,0,0.85)`,
          }}
        >
          {hookText}
        </div>
      </div>
    );
  }

  if (hookStyle === 'Split Banner') {
    const slideX = interpolate(hookSpring, [0, 1], [-80, 0]);
    return (
      <div
        style={{
          position: 'absolute',
          top: 165,
          left: 52,
          right: rightMarginPx,
          transform: `translateX(${slideX}px)`,
          opacity: hookSpring,
          fontFamily,
          borderRadius: 24,
          overflow: 'hidden',
          border: `2px solid ${accentColor}`,
          boxShadow: '0 18px 36px rgba(0,0,0,0.55)',
        }}
      >
        <div
          style={{
            background: `linear-gradient(90deg, #FF5A4E 0%, ${accentColor} 100%)`,
            padding: '12px 26px',
            fontSize: 23,
            fontWeight: 800,
            letterSpacing: '0.12em',
            textTransform: 'uppercase',
            color: '#0B1221',
          }}
        >
          Hook Inicial · Vibra Music
        </div>
        <div
          style={{
            backgroundColor: 'rgba(11,18,33,0.9)',
            padding: '24px 28px',
            fontSize: 42,
            fontWeight: 800,
            lineHeight: 1.2,
            color: '#FFFFFF',
          }}
        >
          {hookText}
        </div>
      </div>
    );
  }

  // Default: Glass Card
  return (
    <div
      style={{
        position: 'absolute',
        top: 165,
        left: 52,
        right: rightMarginPx,
        borderRadius: 36,
        border: '2px solid rgba(255,255,255,0.22)',
        backgroundColor: 'rgba(11,18,33,0.84)',
        padding: '30px 36px',
        textAlign: 'center',
        transform: `scale(${interpolate(hookSpring, [0, 1], [0.92, 1])})`,
        opacity: hookSpring,
        fontFamily,
      }}
    >
      <div
        style={{
          fontSize: 24,
          fontWeight: 700,
          textTransform: 'uppercase',
          letterSpacing: '0.12em',
          color: accentColor,
          marginBottom: 10,
        }}
      >
        Hook Inicial · Vibra Music
      </div>
      <div
        style={{
          fontSize: 44,
          fontWeight: 800,
          lineHeight: 1.2,
          color: '#FFFFFF',
        }}
      >
        {hookText}
      </div>
    </div>
  );
};

const SubtitleCueSequence: React.FC<{
  cue: SubtitleCue;
  preset: ContentPiece['subtitlePreset'];
  karaokeMode: boolean;
  styleConfig: RemotionStyleConfig;
  durationFrames: number;
}> = ({ cue, preset, karaokeMode, styleConfig, durationFrames }) => {
  const localFrame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const cueProgress = Math.max(
    0,
    Math.min(1, localFrame / Math.max(1, durationFrames - 1))
  );
  const accentHex = cue.highlightColor || styleConfig.accentColor || '#F4A048';
  const fontStack = resolveFontStack(styleConfig.fontFamily);
  const scale = styleConfig.fontScale || 1.0;

  // Entrance Animation via local Sequence frame
  const enterSpring = spring({
    frame: localFrame,
    fps,
    config: { damping: 14, stiffness: 170 },
  });

  let containerTransform = 'none';
  let containerOpacity = 1;
  const anim: TextAnimationStyle = styleConfig.textAnimation;

  if (anim === 'Pop Spring') {
    containerTransform = `scale(${interpolate(enterSpring, [0, 1], [0.78, 1])})`;
    containerOpacity = enterSpring;
  } else if (anim === 'Slide Up') {
    const ty = interpolate(enterSpring, [0, 1], [46, 0]);
    containerTransform = `translateY(${ty}px)`;
    containerOpacity = enterSpring;
  } else if (anim === 'Scale Slam') {
    const sc = interpolate(enterSpring, [0, 1], [1.34, 1]);
    containerTransform = `scale(${sc})`;
    containerOpacity = enterSpring;
  }

  // Step-by-step Kinetic Card Mode (e.g. PIANO · GUITARRA · BATERÍA · CANTO · VIOLÍN)
  if (cue.stepByStepItems && cue.stepByStepItems.length > 1) {
    const items = cue.stepByStepItems;
    const activeIdx = Math.min(
      items.length - 1,
      Math.floor(cueProgress * items.length)
    );
    const currentItem = items[activeIdx];
    const stepLocalProgress = (cueProgress * items.length) % 1;
    const popScale = interpolate(
      stepLocalProgress,
      [0, 0.18, 1],
      [0.82, 1.08, 1.0],
      { extrapolateRight: 'clamp' }
    );

    return (
      <div
        style={{
          display: 'inline-flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 16,
          borderRadius: styleConfig.boxRadius,
          border: `3px solid ${accentHex}`,
          backgroundColor: `rgba(7,11,20,${Math.max(0.55, styleConfig.boxOpacity)})`,
          padding: '28px 46px',
          boxShadow: `0 18px 44px rgba(0,0,0,0.55), 0 0 36px ${accentHex}44`,
          transform: `scale(${popScale})`,
          fontFamily: fontStack,
        }}
      >
        <div
          style={{
            fontSize: Math.round(64 * scale),
            fontWeight: 900,
            letterSpacing: '0.02em',
            color: accentHex,
            textTransform: styleConfig.uppercase ? 'uppercase' : 'none',
          }}
        >
          {currentItem}
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          {items.map((it, i) => (
            <span
              key={`${it}-${i}`}
              style={{
                width: i === activeIdx ? 28 : 10,
                height: 10,
                borderRadius: 999,
                backgroundColor:
                  i === activeIdx ? accentHex : 'rgba(255,255,255,0.28)',
              }}
            />
          ))}
        </div>
      </div>
    );
  }

  const allWords = cue.text.split(/\s+/).filter(Boolean);
  const visibleWordsCount =
    anim === 'Typewriter'
      ? Math.max(1, Math.ceil(Math.min(1, cueProgress * 1.45) * allWords.length))
      : allWords.length;
  const words = allWords.slice(0, visibleWordsCount);
  const activeWordIdx = Math.min(
    Math.max(0, allWords.length - 1),
    Math.floor(cueProgress * allWords.length)
  );
  const cleanMatch = (w: string) =>
    w.replace(/[.,!?¿¡“”"«»()]/g, '').toLowerCase();

  const textStrokeShadow =
    styleConfig.strokeWidth > 0
      ? `0 ${styleConfig.strokeWidth * 2}px ${styleConfig.strokeWidth * 5}px rgba(0,0,0,0.85)`
      : 'none';

  const baseFontSize =
    preset === 'Hormozi Bold' ? 52 : preset === 'Minimal Glass' ? 44 : 46;
  const computedFontSize = Math.round(baseFontSize * scale);

  const boxBackground =
    preset === 'Minimal Glass'
      ? `rgba(15, 23, 42, ${styleConfig.boxOpacity})`
      : preset === 'Neón Urbano'
        ? `rgba(11, 18, 33, ${styleConfig.boxOpacity})`
        : `rgba(7, 11, 20, ${styleConfig.boxOpacity})`;

  const boxBorder =
    preset === 'Minimal Glass'
      ? '2px solid rgba(255,255,255,0.28)'
      : preset === 'Neón Urbano'
        ? `3px solid ${hexToRgba(accentHex, 0.85)}`
        : 'none';

  return (
    <div
      style={{
        display: 'inline-block',
        borderRadius: styleConfig.boxRadius,
        border: boxBorder,
        backgroundColor: boxBackground,
        padding: '22px 36px',
        fontFamily: fontStack,
        fontSize: computedFontSize,
        fontWeight: preset === 'Minimal Glass' ? 600 : 900,
        textTransform: styleConfig.uppercase ? 'uppercase' : 'none',
        lineHeight: 1.16,
        letterSpacing: preset === 'Hormozi Bold' ? '-0.015em' : '0em',
        color: styleConfig.textColor,
        textShadow: textStrokeShadow,
        boxShadow:
          preset === 'Neón Urbano'
            ? `0 0 36px ${hexToRgba(accentHex, 0.45)}`
            : '0 14px 36px rgba(0,0,0,0.45)',
        transform: containerTransform,
        opacity: containerOpacity,
      }}
    >
      {words.map((word, idx) => {
        const isKeyword =
          Boolean(cue.highlightWord) &&
          cleanMatch(word) === cleanMatch(cue.highlightWord ?? '');
        const isSpoken = karaokeMode && idx <= activeWordIdx;
        const isCurrent = karaokeMode && idx === activeWordIdx;

        const wordColor = isKeyword
          ? accentHex
          : isCurrent
            ? '#FF5A4E'
            : isSpoken
              ? accentHex
              : hexToRgba(styleConfig.textColor, 0.85);

        const wordTransform =
          anim === 'Word Bounce' && isCurrent
            ? 'translateY(-4px) scale(1.1)'
            : 'none';

        return (
          <span
            key={`${word}-${idx}`}
            style={{
              display: anim === 'Word Bounce' ? 'inline-block' : 'inline',
              color: wordColor,
              transform: wordTransform,
              marginRight: idx < words.length - 1 ? '0.24em' : 0,
            }}
          >
            {word}
          </span>
        );
      })}
    </div>
  );
};

const CtaStickerSequence: React.FC<{
  ctaText: string;
  stickerStyle: CtaStickerStyle;
  accentColor: string;
  fontFamily: string;
}> = ({ ctaText, stickerStyle, accentColor, fontFamily }) => {
  const localFrame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const ctaSpring = spring({
    frame: localFrame,
    fps,
    config: { damping: 16, stiffness: 120 },
  });
  const bounceY = Math.sin(localFrame / 6) * 5;

  return (
    <div
      style={{
        width: '100%',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 16,
        transform: `translateY(${interpolate(ctaSpring, [0, 1], [28, 0])}px)`,
        opacity: ctaSpring,
        fontFamily,
      }}
    >
      {stickerStyle !== 'None' && (
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 12,
            borderRadius: 9999,
            padding: '12px 26px',
            backgroundColor:
              stickerStyle === 'WhatsApp Directo'
                ? '#10B981'
                : stickerStyle === 'Pin SJL'
                  ? '#0B1221'
                  : accentColor,
            border:
              stickerStyle === 'Pin SJL'
                ? `2px solid ${accentColor}`
                : '2px solid rgba(255,255,255,0.45)',
            color:
              stickerStyle === 'Comenta VIBRA' ? '#0B1221' : '#FFFFFF',
            fontSize: 28,
            fontWeight: 900,
            letterSpacing: '0.03em',
            boxShadow: '0 12px 28px rgba(0,0,0,0.45)',
            transform: `translateY(${bounceY}px)`,
          }}
        >
          <span>
            {stickerStyle === 'Comenta VIBRA'
              ? 'COMENTA “VIBRA” ↓'
              : stickerStyle === 'WhatsApp Directo'
                ? 'ESCRÍBENOS POR WHATSAPP →'
                : '📍 AV. LAS FLORES 1284-A, SJL'}
          </span>
        </div>
      )}

      <div
        style={{
          width: '100%',
          borderRadius: 28,
          background: `linear-gradient(90deg, #FF5A4E 0%, ${accentColor} 100%)`,
          padding: '24px 34px',
          textAlign: 'center',
          color: '#FFFFFF',
          fontSize: 38,
          fontWeight: 800,
          lineHeight: 1.2,
          boxShadow: '0 14px 36px rgba(255,90,78,0.35)',
        }}
      >
        {ctaText}
      </div>
    </div>
  );
};

const WaveformBars: React.FC<{ bpm: number; accentColor: string }> = ({
  bpm,
  accentColor,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const beatsPerSec = bpm / 60;
  const bars = 14;

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'flex-end',
        justifyContent: 'center',
        gap: 10,
        height: 54,
        padding: '8px 20px',
        borderRadius: 9999,
        backgroundColor: 'rgba(11,18,33,0.68)',
        border: '1px solid rgba(255,255,255,0.16)',
      }}
    >
      {Array.from({ length: bars }).map((_, idx) => {
        const wave = Math.abs(
          Math.sin((frame / fps) * beatsPerSec * Math.PI + idx * 0.55)
        );
        const h = 10 + Math.round(wave * 30);
        return (
          <div
            key={idx}
            style={{
              width: 8,
              height: h,
              borderRadius: 999,
              background:
                idx % 2 === 0
                  ? `linear-gradient(180deg, #FF5A4E 0%, ${accentColor} 100%)`
                  : 'rgba(255,255,255,0.82)',
            }}
          />
        );
      })}
    </div>
  );
};

export const VibraReelComposition: React.FC<VibraReelCompositionProps> = ({
  piece,
  cues,
  safeZone = 'reels',
  muted = false,
  bgmAudioUrl,
  sfxAudioUrl,
}) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();
  const currentTimeSec = frame / fps;

  const styleConfig: RemotionStyleConfig = React.useMemo(
    () => ({
      ...DEFAULT_REMOTION_STYLE,
      ...(piece.styleConfig ?? {}),
    }),
    [piece.styleConfig]
  );

  const fontStack = resolveFontStack(styleConfig.fontFamily);
  const colorFilter = resolveColorFilter(styleConfig.colorGrade);

  const segments = React.useMemo(
    () => buildClipSegments(piece.sceneClips, fps, durationInFrames),
    [piece.sceneClips, fps, durationInFrames]
  );

  const activeSegment = React.useMemo(
    () =>
      segments.find(
        (seg) =>
          frame >= seg.startFrame &&
          frame < seg.startFrame + seg.durationInFrames
      ) ?? segments[0],
    [segments, frame]
  );

  const transitionPreset: TransitionPreset = piece.transitionPreset ?? 'Fade';
  const transitionFrames = Math.round(
    (piece.transitionDurationSec ?? 0.4) * fps
  );
  const karaokeMode = piece.karaokeMode !== false;
  const showProgressBar = piece.showProgressBar !== false;
  const showWaveform = piece.showWaveform ?? false;

  const hookDurationSec = Math.max(1, piece.hookDurationSec ?? 3.2);
  const hookFrames = Math.min(
    durationInFrames,
    Math.round(hookDurationSec * fps)
  );

  const ctaDurationSec = Math.max(1, piece.ctaDurationSec ?? 3.2);
  const ctaFrames = Math.min(
    durationInFrames,
    Math.round(ctaDurationSec * fps)
  );
  const ctaStartFrame = Math.max(0, durationInFrames - ctaFrames);

  const overlayStartSec = piece.overlayStartSec ?? 2.0;
  const overlayDurationSec = piece.overlayDurationSec ?? 5.0;
  const overlayStartFrame = Math.round(overlayStartSec * fps);
  const overlayFrames = Math.round(overlayDurationSec * fps);
  const showOverlay =
    Boolean(piece.overlayImageUrl) &&
    frame >= overlayStartFrame &&
    frame <= overlayStartFrame + overlayFrames;
  const overlaySpring = spring({
    frame: Math.max(0, frame - overlayStartFrame),
    fps,
    config: { damping: 15, stiffness: 140 },
  });

  const activeBgm =
    BGM_CATALOG.find((t) => t.id === piece.bgmTrackId) ?? BGM_CATALOG[0];

  const rawBgmVol = Math.max(0, Math.min(1, piece.bgmVolume / 100));
  const hasVoiceDuck =
    piece.voice === 'Con voz' || Boolean(piece.customAudioUrl);
  const effectiveBgmVolume = muted
    ? 0
    : hasVoiceDuck
      ? rawBgmVol * 0.35
      : rawBgmVol * 0.85;

  const safeZoneActive = safeZone !== 'off';
  const maxSafeBottomPct =
    safeZone === 'tiktok' ? 76 : safeZone === 'reels' ? 79 : 88;
  const subtitleTopPct = Math.min(
    maxSafeBottomPct,
    Math.max(18, styleConfig.subtitleYPercent)
  );
  const ctaBottomOffsetPx =
    safeZone === 'tiktok' ? 250 : safeZone === 'reels' ? 200 : 120;
  const rightMarginPx = safeZoneActive ? 156 : 56;
  const timelinePct = Math.min(
    100,
    Math.max(0, (frame / Math.max(1, durationInFrames - 1)) * 100)
  );

  return (
    <AbsoluteFill
      style={{
        backgroundColor: '#0B1221',
        fontFamily: fontStack,
        overflow: 'hidden',
      }}
    >
      {/* Audio Track 1: Commercial BGM WAV Loop */}
      {bgmAudioUrl && effectiveBgmVolume > 0 && (
        <Audio src={bgmAudioUrl} volume={effectiveBgmVolume} loop />
      )}

      {/* Audio Track 2: Uploaded / Local Voice or Audio File */}
      {piece.customAudioUrl && !muted && (
        <Audio src={piece.customAudioUrl} volume={0.95} />
      )}

      {/* Audio Track 3: Synthesized Kinetic SFX (boom, whoosh, pop, ding) */}
      {sfxAudioUrl && !muted && piece.sfxEnabled !== false && (
        <Audio src={sfxAudioUrl} volume={0.86} />
      )}

      {/* Track 1: Video Clips & Demo Backdrop inside Remotion <Sequence> with Ken Burns & Color Grade */}
      <AbsoluteFill style={{ filter: colorFilter }}>
        {segments.length === 0 ? (
          <CameraMotionWrapper
            motion={styleConfig.cameraMotion}
            intensity={styleConfig.cameraIntensity}
            clipDurationFrames={durationInFrames}
            bpm={activeBgm.bpm}
          >
            <DemoBackdrop index={0} />
          </CameraMotionWrapper>
        ) : (
          segments.map((seg) => {
            const isRealVideo =
              !seg.clip.isDemo &&
              (seg.clip.objectUrl.startsWith('blob:') ||
                seg.clip.objectUrl.startsWith('/api/local/') ||
                seg.clip.objectUrl.startsWith('http'));
            const clipMotion = seg.clip.cameraMotion ?? styleConfig.cameraMotion;

            return (
              <Sequence
                key={seg.clip.id}
                from={seg.startFrame}
                durationInFrames={seg.durationInFrames}
              >
                <TransitionClipWrapper
                  transition={transitionPreset}
                  transitionFrames={transitionFrames}
                  clipDurationFrames={seg.durationInFrames}
                  isFirst={seg.index === 0}
                >
                  <CameraMotionWrapper
                    motion={clipMotion}
                    intensity={styleConfig.cameraIntensity}
                    clipDurationFrames={seg.durationInFrames}
                    bpm={activeBgm.bpm}
                  >
                    {isRealVideo ? (
                      <AbsoluteFill>
                        <Video
                          src={seg.clip.objectUrl}
                          trimBefore={Math.max(
                            0,
                            Math.round((seg.clip.trimStartSec ?? 0) * fps)
                          )}
                          muted={
                            muted ||
                            piece.voice === 'Con voz' ||
                            Boolean(piece.customAudioUrl)
                          }
                          style={{
                            width: '100%',
                            height: '100%',
                            objectFit: 'cover',
                          }}
                        />
                      </AbsoluteFill>
                    ) : (
                      <DemoBackdrop clip={seg.clip} index={seg.index} />
                    )}
                  </CameraMotionWrapper>
                </TransitionClipWrapper>
              </Sequence>
            );
          })
        )}
      </AbsoluteFill>

      {/* Contrast Scrim + Configurable Vignette */}
      <AbsoluteFill
        style={{
          background: `linear-gradient(180deg, rgba(6,10,20,0.62) 0%, rgba(6,10,20,0.14) 42%, rgba(6,10,20,0.88) 100%), radial-gradient(circle at center, transparent 48%, rgba(4,7,15,${styleConfig.vignetteIntensity}) 100%)`,
          pointerEvents: 'none',
        }}
      />

      {/* Track 2: Visual SFX Flashes & Motion Sweeps */}
      {styleConfig.sfxVisualFlash &&
        piece.sfxEnabled !== false &&
        piece.kineticBeats?.map((beat) => {
          if (beat.sfxKind === 'none') return null;
          const fromFrame = Math.max(0, Math.round(beat.startSec * fps));
          if (fromFrame >= durationInFrames) return null;
          const durFrames = Math.min(
            Math.max(18, Math.round((beat.endSec - beat.startSec) * fps)),
            durationInFrames - fromFrame
          );
          return (
            <Sequence
              key={`fx-${beat.id}`}
              from={fromFrame}
              durationInFrames={durFrames}
            >
              <SfxVisualEffect
                beat={beat}
                accentColor={beat.highlightColor || styleConfig.accentColor}
              />
            </Sequence>
          );
        })}

      {/* Top Retention Progress Bar */}
      {showProgressBar && (
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: 12,
            backgroundColor: 'rgba(255,255,255,0.16)',
            zIndex: 40,
          }}
        >
          <div
            style={{
              width: `${timelinePct}%`,
              height: '100%',
              background: `linear-gradient(90deg, #FF5A4E 0%, ${styleConfig.accentColor} 100%)`,
            }}
          />
        </div>
      )}

      {/* Top Metadata Strip */}
      <div
        style={{
          position: 'absolute',
          top: 56,
          left: 56,
          right: 56,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          color: 'rgba(255,255,255,0.88)',
          fontSize: 28,
          fontWeight: 600,
          letterSpacing: '0.02em',
        }}
      >
        <span>
          {piece.funnelStage} · {piece.pillar}
        </span>
        <span
          style={{
            fontFamily: "'JetBrains Mono', monospace",
            color: styleConfig.accentColor,
          }}
        >
          {piece.voice === 'Con voz' ? 'Voz IA' : 'BGM'} · {transitionPreset}
        </span>
      </div>

      {/* Track 3: Hook Intro Sequence */}
      <Sequence from={0} durationInFrames={hookFrames}>
        <HookBannerSequence
          hookText={piece.hook}
          hookStyle={styleConfig.hookStyle}
          accentColor={styleConfig.accentColor}
          fontFamily={fontStack}
          rightMarginPx={rightMarginPx}
        />
      </Sequence>

      {activeSegment && currentTimeSec > hookDurationSec && (
        <div
          style={{
            position: 'absolute',
            top: 132,
            left: 52,
            right: rightMarginPx,
            textAlign: 'center',
            fontSize: 26,
            fontWeight: 600,
            color: 'rgba(255,255,255,0.75)',
            textShadow: '0 2px 10px rgba(0,0,0,0.65)',
          }}
        >
          Toma {activeSegment.index + 1}/{segments.length}:{' '}
          {activeSegment.clip.sceneLabel}
        </div>
      )}

      {/* Picture-in-Picture / Logo Overlay Window */}
      {showOverlay && piece.overlayImageUrl && (
        <div
          style={{
            position: 'absolute',
            top: currentTimeSec <= hookDurationSec ? 500 : 250,
            right: rightMarginPx,
            width: 310,
            borderRadius: 28,
            overflow: 'hidden',
            border: `3px solid ${styleConfig.accentColor}`,
            backgroundColor: 'rgba(11,18,33,0.9)',
            boxShadow: '0 20px 44px rgba(0,0,0,0.55)',
            transform: `scale(${interpolate(overlaySpring, [0, 1], [0.82, 1])})`,
            opacity: overlaySpring,
          }}
        >
          <Img
            src={piece.overlayImageUrl}
            style={{
              width: '100%',
              height: 220,
              objectFit: 'cover',
              display: 'block',
            }}
          />
          {piece.overlayLabel && (
            <div
              style={{
                padding: '10px 14px',
                fontSize: 22,
                fontWeight: 700,
                color: '#FFFFFF',
                textAlign: 'center',
              }}
            >
              {piece.overlayLabel}
            </div>
          )}
        </div>
      )}

      {/* Optional Reactive BPM Waveform */}
      {showWaveform && (
        <div
          style={{
            position: 'absolute',
            top: `${Math.max(14, subtitleTopPct - 12)}%`,
            left: 52,
            right: rightMarginPx,
            display: 'flex',
            justifyContent: 'center',
          }}
        >
          <WaveformBars
            bpm={activeBgm.bpm}
            accentColor={styleConfig.accentColor}
          />
        </div>
      )}

      {/* Track 4: Subtitles & Kinetic Cards as Real <Sequence>s */}
      {cues.map((cue, idx) => {
        const startFrame = Math.max(0, Math.round(cue.startSec * fps));
        if (startFrame >= durationInFrames) return null;
        const endFrame = Math.min(
          durationInFrames,
          Math.round(cue.endSec * fps)
        );
        const cueDurationFrames = Math.max(6, endFrame - startFrame);

        return (
          <Sequence
            key={`cue-${cue.index}-${idx}`}
            from={startFrame}
            durationInFrames={cueDurationFrames}
          >
            <div
              style={{
                position: 'absolute',
                top: `${subtitleTopPct}%`,
                left: 52,
                right: rightMarginPx,
                transform: 'translateY(-50%)',
                display: 'flex',
                justifyContent: 'center',
                textAlign: 'center',
              }}
            >
              <SubtitleCueSequence
                cue={cue}
                preset={piece.subtitlePreset}
                karaokeMode={karaokeMode}
                styleConfig={styleConfig}
                durationFrames={cueDurationFrames}
              />
            </div>
          </Sequence>
        );
      })}

      {/* Track 5: CTA End Card + Animated Sticker Sequence */}
      <Sequence from={ctaStartFrame} durationInFrames={ctaFrames}>
        <div
          style={{
            position: 'absolute',
            bottom: ctaBottomOffsetPx,
            left: 52,
            right: rightMarginPx,
            display: 'flex',
            justifyContent: 'center',
          }}
        >
          <CtaStickerSequence
            ctaText={piece.cta}
            stickerStyle={styleConfig.ctaSticker}
            accentColor={styleConfig.accentColor}
            fontFamily={fontStack}
          />
        </div>
      </Sequence>
    </AbsoluteFill>
  );
};
