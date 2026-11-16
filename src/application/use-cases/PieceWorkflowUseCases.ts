import type {
  BrandProfile,
  ChecklistItem,
  ContentPiece,
  KineticBeat,
  SceneClip,
  SubtitleCue,
} from '../../domain/entities';
import {
  DEFAULT_REMOTION_STYLE,
  PRODUCTION_STAGES,
  type ContentConcept,
  type FunnelStage,
  type PillarName,
  type ProductionStatus,
  type StudioTemplatePreset,
  type SubtitlePreset,
  type VoiceType,
} from '../../domain/value-objects';

export function movePieceToStage(
  pieces: ContentPiece[],
  pieceId: string,
  targetStage: ProductionStatus
): ContentPiece[] {
  return pieces.map((piece) =>
    piece.id === pieceId ? { ...piece, status: targetStage } : piece
  );
}

export function movePiecesToStage(
  pieces: ContentPiece[],
  pieceIds: string[],
  targetStage: ProductionStatus
): ContentPiece[] {
  if (pieceIds.length === 0) return pieces;
  const idSet = new Set(pieceIds);
  return pieces.map((piece) =>
    idSet.has(piece.id) ? { ...piece, status: targetStage } : piece
  );
}

export function applyStudioTemplateToPiece(
  piece: ContentPiece,
  template: StudioTemplatePreset
): ContentPiece {
  return {
    ...piece,
    subtitlePreset: template.subtitlePreset,
    transitionPreset: template.transitionPreset,
    transitionDurationSec: template.transitionDurationSec,
    karaokeMode: template.karaokeMode,
    showProgressBar: template.showProgressBar,
    showWaveform: template.showWaveform,
    hookDurationSec: template.hookDurationSec,
    ctaDurationSec: template.ctaDurationSec,
    bgmTrackId: template.bgmTrackId,
    bgmVolume: template.bgmVolume,
    appliedTemplateId: template.id,
    styleConfig: template.styleConfig
      ? { ...DEFAULT_REMOTION_STYLE, ...template.styleConfig }
      : piece.styleConfig,
  };
}

export interface ClipTimelineRange {
  clip: SceneClip;
  index: number;
  startSec: number;
  endSec: number;
}

export function computeClipTimelineRanges(
  clips: SceneClip[]
): ClipTimelineRange[] {
  let cursor = 0;
  return clips.map((clip, index) => {
    const startSec =
      typeof clip.startSec === 'number' && Number.isFinite(clip.startSec)
        ? Math.max(0, Number(clip.startSec.toFixed(2)))
        : Number(cursor.toFixed(2));
    const duration = Math.max(0.5, Number(clip.durationSec.toFixed(2)));
    const endSec = Number((startSec + duration).toFixed(2));
    cursor = Math.max(cursor, endSec);
    return { clip, index, startSec, endSec };
  });
}

export function splitClipAtTime(
  clips: SceneClip[],
  clipIndex: number,
  playheadSec: number
): SceneClip[] {
  const ranges = computeClipTimelineRanges(clips);
  const target = ranges[clipIndex];
  if (!target) return clips;

  const minSlice = 0.6;
  if (
    playheadSec <= target.startSec + minSlice ||
    playheadSec >= target.endSec - minSlice
  ) {
    return clips;
  }

  const firstDur = Number((playheadSec - target.startSec).toFixed(2));
  const secondDur = Number((target.endSec - playheadSec).toFixed(2));
  const baseTrim = target.clip.trimStartSec ?? 0;

  const firstClip: SceneClip = {
    ...target.clip,
    startSec: target.startSec,
    durationSec: firstDur,
  };

  const secondClip: SceneClip = {
    ...target.clip,
    id: `${target.clip.id}-cut-${Date.now().toString(36)}`,
    sceneLabel: `${target.clip.sceneLabel} (Parte 2)`,
    startSec: Number(playheadSec.toFixed(2)),
    durationSec: secondDur,
    trimStartSec: Number((baseTrim + firstDur).toFixed(2)),
  };

  const next = [...clips];
  next.splice(clipIndex, 1, firstClip, secondClip);
  return next;
}

export function splitCueAtTime(
  cues: SubtitleCue[],
  cueIndex: number,
  playheadSec: number
): SubtitleCue[] {
  const target = cues[cueIndex];
  if (!target) return cues;

  const minSlice = 0.4;
  if (
    playheadSec <= target.startSec + minSlice ||
    playheadSec >= target.endSec - minSlice
  ) {
    return cues;
  }

  const words = target.text.trim().split(/\s+/).filter(Boolean);
  const ratio =
    (playheadSec - target.startSec) /
    Math.max(0.1, target.endSec - target.startSec);
  const splitWordIdx = Math.max(
    1,
    Math.min(words.length - 1, Math.round(words.length * ratio))
  );

  const firstText =
    words.length > 1 ? words.slice(0, splitWordIdx).join(' ') : target.text;
  const secondText =
    words.length > 1 ? words.slice(splitWordIdx).join(' ') : target.text;

  const firstCue: SubtitleCue = {
    ...target,
    endSec: Number(playheadSec.toFixed(2)),
    text: firstText,
  };

  const secondCue: SubtitleCue = {
    ...target,
    startSec: Number(playheadSec.toFixed(2)),
    text: secondText,
  };

  const next = [...cues];
  next.splice(cueIndex, 1, firstCue, secondCue);
  return next.map((c, idx) => ({ ...c, index: idx + 1 }));
}

export function beatsToSubtitleCues(beats: KineticBeat[]): SubtitleCue[] {
  return beats.map((beat, idx) => ({
    index: idx + 1,
    startSec: beat.startSec,
    endSec: beat.endSec,
    text: beat.kineticText,
    highlightWord: beat.highlightWord,
    highlightColor: beat.highlightColor ?? '#F4A048',
    isKineticCard: true,
    stepByStepItems: beat.stepByStepItems,
    sfxLabel: beat.sfxLabel,
  }));
}

export function buildContentPieceFromBeats(params: {
  title: string;
  coreIdea: string;
  date: string;
  pillar: PillarName;
  audienceName: string;
  funnelStage: FunnelStage;
  concept: ContentConcept;
  voice: VoiceType;
  status: ProductionStatus;
  subtitlePreset?: SubtitlePreset;
  beats: KineticBeat[];
}): ContentPiece {
  const { beats } = params;
  const hookBeat = beats.find((b) => b.role === 'hook') ?? beats[0];
  const ctaBeat =
    [...beats].reverse().find((b) => b.role === 'cta') ??
    beats[beats.length - 1];
  const bodyBeats = beats.filter(
    (b) => b.id !== hookBeat?.id && b.id !== ctaBeat?.id
  );

  const hook = hookBeat?.spokenText || params.title;
  const script =
    bodyBeats.map((b) => b.spokenText).filter(Boolean).join(' ') ||
    params.coreIdea;
  const voiceoverText = beats
    .map((b) => b.spokenText)
    .filter(Boolean)
    .join(' ');
  const cta =
    ctaBeat?.spokenText ||
    'Escríbenos por WhatsApp o comenta VIBRA para reservar tu clase piloto.';

  const hookDurationSec = hookBeat
    ? Math.max(2, Number((hookBeat.endSec - hookBeat.startSec).toFixed(1)))
    : 3.0;
  const ctaDurationSec = ctaBeat
    ? Math.max(2, Number((ctaBeat.endSec - ctaBeat.startSec).toFixed(1)))
    : 4.0;

  const weekdayFormatter = new Intl.DateTimeFormat('es-PE', {
    weekday: 'short',
  });
  const parsedDate = new Date(`${params.date}T12:00:00`);
  const rawDay = Number.isNaN(parsedDate.getTime())
    ? 'Hoy'
    : weekdayFormatter.format(parsedDate);
  const weekday = rawDay.charAt(0).toUpperCase() + rawDay.slice(1, 3);

  const scenesToRecord = beats.map(
    (b) =>
      `${b.startSec}–${b.endSec}s · ${b.kineticText}${
        b.sfxLabel && b.sfxLabel !== 'none' ? ` [SFX: ${b.sfxLabel}]` : ''
      }`
  );

  return {
    id: `post-${Date.now().toString(36)}`,
    date: params.date,
    weekday,
    pillar: params.pillar,
    subtopic: params.title,
    targetCategory: params.audienceName,
    audienceName: params.audienceName,
    targetsStimulation: params.audienceName.toLowerCase().includes('estimulación') ||
      voiceoverText.toLowerCase().includes('estimulación'),
    funnelStage: params.funnelStage,
    formatLabel: 'Reel / Short Kinetic',
    mediaType: 'Video',
    voice: params.voice,
    hook,
    script,
    voiceoverText,
    scenesToRecord,
    shootingNotes: params.coreIdea,
    cta,
    placeholders: [],
    status: params.status,
    approved: false,
    conceptId: params.concept.toLowerCase(),
    concept: params.concept,
    checkedScenes: [],
    sceneClips: [],
    voiceConfig: {
      voiceURI: '',
      voiceName: 'Voz Español Automática',
      rate: 1.02,
      pitch: 1.0,
    },
    bgmTrackId: 'bgm-cajon-ritmo',
    bgmVolume: 58,
    subtitlePreset: params.subtitlePreset ?? 'Hormozi Bold',
    customSubtitleCues: beatsToSubtitleCues(beats),
    transitionPreset: 'Fade',
    transitionDurationSec: 0.35,
    karaokeMode: true,
    showProgressBar: true,
    showWaveform: true,
    hookDurationSec,
    ctaDurationSec,
    kineticBeats: beats,
    sfxEnabled: true,
  };
}

export function advancePieceStage(
  pieces: ContentPiece[],
  pieceId: string
): ContentPiece[] {
  return pieces.map((piece) => {
    if (piece.id !== pieceId) return piece;
    const currentIndex = PRODUCTION_STAGES.indexOf(piece.status);
    if (currentIndex < 0 || currentIndex >= PRODUCTION_STAGES.length - 1) {
      return piece;
    }
    return {
      ...piece,
      status: PRODUCTION_STAGES[currentIndex + 1],
    };
  });
}

export function regressPieceStage(
  pieces: ContentPiece[],
  pieceId: string
): ContentPiece[] {
  return pieces.map((piece) => {
    if (piece.id !== pieceId) return piece;
    const currentIndex = PRODUCTION_STAGES.indexOf(piece.status);
    if (currentIndex <= 0) {
      return piece;
    }
    return {
      ...piece,
      status: PRODUCTION_STAGES[currentIndex - 1],
    };
  });
}

export function updatePieceContent(
  pieces: ContentPiece[],
  updated: ContentPiece
): ContentPiece[] {
  return pieces.map((piece) => (piece.id === updated.id ? updated : piece));
}

export function togglePieceApproval(
  pieces: ContentPiece[],
  pieceId: string,
  approved?: boolean
): ContentPiece[] {
  return pieces.map((piece) =>
    piece.id === pieceId
      ? { ...piece, approved: approved !== undefined ? approved : !piece.approved }
      : piece
  );
}

export function toggleChecklistTask(
  tasks: ChecklistItem[],
  taskId: number
): ChecklistItem[] {
  return tasks.map((task) =>
    task.id === taskId ? { ...task, done: !task.done } : task
  );
}

export interface BrandGuardrailReport {
  avoidHits: string[];
  sayHits: string[];
  hasPlaceholders: boolean;
  detectedPlaceholders: string[];
}

export function checkBrandGuardrails(
  piece: Pick<ContentPiece, 'hook' | 'script' | 'cta' | 'voiceoverText'>,
  brand: BrandProfile
): BrandGuardrailReport {
  const combined = `${piece.hook} ${piece.script} ${piece.cta} ${piece.voiceoverText}`.toLowerCase();

  const avoidHits = brand.avoid.filter((phrase) =>
    combined.includes(phrase.toLowerCase())
  );
  const sayHits = brand.say.filter((phrase) =>
    combined.includes(phrase.toLowerCase())
  );
  const matches = `${piece.hook} ${piece.script} ${piece.cta}`.match(/\[[^\]]+\]/g) ?? [];

  return {
    avoidHits,
    sayHits,
    hasPlaceholders: matches.length > 0,
    detectedPlaceholders: Array.from(new Set(matches)),
  };
}
