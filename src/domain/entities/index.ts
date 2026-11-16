import type {
  CameraMotionPreset,
  ContentConcept,
  ContentFormat,
  FunnelStage,
  PillarName,
  ProductionStatus,
  RemotionStyleConfig,
  SubtitlePreset,
  TransitionPreset,
  VoiceConfig,
  VoiceType,
} from '../value-objects';

export interface SceneClip {
  id: string;
  sceneLabel: string;
  fileName: string;
  objectUrl: string;
  startSec?: number;
  durationSec: number;
  trimStartSec?: number;
  cameraMotion?: CameraMotionPreset;
  sourceType?: 'upload' | 'demo' | 'local-folder' | 'express-disk';
  isDemo: boolean;
  mimeType: string;
  accentTone?: string;
}

export type LocalMediaCategory = 'clips' | 'audio' | 'resources';

export interface LocalMediaFile {
  name: string;
  sizeBytes: number;
  mimeType: string;
  kind: 'video' | 'audio' | 'image';
  category?: LocalMediaCategory;
  url: string;
  source: 'local-folder' | 'express-disk';
}

export interface LocalBridgeStatus {
  available: boolean;
  mediaDir: string;
  clipsDir: string;
  audioDir: string;
  resourcesDir: string;
  exportsDir: string;
  mediaCount: number;
  clipsCount: number;
  audioCount: number;
  resourcesCount: number;
  exportCount: number;
}

export interface SpectatorAudit {
  hookIn3Sec: boolean;
  safeZonesClear: boolean;
  paceNoDeadAir: boolean;
  audioBalanced: boolean;
  ctaClear: boolean;
  auditedAt?: string;
}

export type SfxKind =
  | 'none'
  | 'boom'
  | 'whoosh'
  | 'pop'
  | 'ding'
  | 'flash'
  | 'boom_flash'
  | 'pop_ding'
  | 'ding_stop';

export interface KineticBeat {
  id: string;
  role: 'hook' | 'body' | 'cta';
  startSec: number;
  endSec: number;
  spokenText: string;
  kineticText: string;
  highlightWord?: string;
  highlightColor?: string;
  stepByStepItems?: string[];
  sfxLabel: string;
  sfxKind: SfxKind;
}

export interface SubtitleCue {
  index: number;
  startSec: number;
  endSec: number;
  text: string;
  highlightWord?: string;
  highlightColor?: string;
  isKineticCard?: boolean;
  stepByStepItems?: string[];
  sfxLabel?: string;
}

export type RenderJobStatus =
  | 'queued'
  | 'synthesizing_tts'
  | 'syncing_subtitles'
  | 'composing'
  | 'completed'
  | 'failed';

export interface RenderJob {
  id: string;
  pieceId: string;
  status: RenderJobStatus;
  progress: number;
  subtitlePreset: SubtitlePreset;
  estimatedDurationSec: number;
  subtitleCues: SubtitleCue[];
  srtContent: string;
  manifestJson: string;
  createdAt: string;
  completedAt?: string;
  errorMessage?: string;
}

export interface ContentPiece {
  id: string;
  date: string;
  weekday: string;
  pillar: PillarName;
  subtopic: string;
  targetCategory: string;
  audienceName: string;
  targetsStimulation: boolean;
  funnelStage: FunnelStage;
  formatLabel: string;
  mediaType: ContentFormat;
  voice: VoiceType;
  hook: string;
  script: string;
  voiceoverText: string;
  scenesToRecord: string[];
  shootingNotes: string;
  cta: string;
  placeholders: string[];
  status: ProductionStatus;
  approved: boolean;
  conceptId: string;
  concept: ContentConcept;

  // Short Video Factory + Remotion Studio extensions
  checkedScenes: number[];
  sceneClips: SceneClip[];
  voiceConfig: VoiceConfig;
  bgmTrackId: string;
  bgmVolume: number; // 0 - 100
  subtitlePreset: SubtitlePreset;
  customSubtitleCues?: SubtitleCue[];
  lastRenderJob?: RenderJob;
  transitionPreset?: TransitionPreset;
  transitionDurationSec?: number;
  karaokeMode?: boolean;
  showProgressBar?: boolean;
  showWaveform?: boolean;
  hookDurationSec?: number;
  ctaDurationSec?: number;
  overlayImageUrl?: string;
  overlayLabel?: string;
  overlayStartSec?: number;
  overlayDurationSec?: number;
  customAudioUrl?: string;
  customAudioName?: string;
  appliedTemplateId?: string;
  spectatorAudit?: SpectatorAudit;
  kineticBeats?: KineticBeat[];
  sfxEnabled?: boolean;
  styleConfig?: RemotionStyleConfig;
}

export interface ChecklistItem {
  id: number;
  topic: string;
  question: string;
  why: string;
  owner: string;
  priority: 'Alta' | 'Media' | 'Baja';
  done: boolean;
}

export interface Stakeholder {
  name: string;
  role: string;
}

export interface VibraPlanMeta {
  company: string;
  location: string;
  address: string;
  phase: string;
  start: string;
  end: string;
  pilotClassDate: string;
  pilotGoals: {
    attendees: number;
    enrollments: number;
    demosScheduled: number;
  };
  adBudgetMonthlyPEN: number;
  adBudgetDailyPEN: number;
  stakeholders: Stakeholder[];
}

export interface PillarTarget {
  name: PillarName;
  targetPct: number;
  targetPieces: number;
}

export interface FormatTargets {
  sinVoz: { pct: number; pieces: number; inCalendar: number };
  conVoz: { pct: number; pieces: number; inCalendar: number };
  estimulacionMin: { pct: number; pieces: number; inCalendar: number };
}

export interface BrandProfile {
  tone: string;
  say: string[];
  avoid: string[];
  rules: string[];
}

export interface AudienceCategory {
  legacyName: string;
  ages: string;
  workingName: string;
  experience: string;
  parentHook: string;
  entryOffer: string;
  priorityNote: string;
}

export interface ConceptDefinition {
  id: string;
  stage: FunnelStage;
  mediaType: ContentFormat;
  name: string;
  description: string;
  tags: string[];
  playbook: string | null;
}

export interface ReferenceItem {
  id: string;
  conceptId: string;
  title: string;
  creator: string;
  url: string;
  views: number;
  note: string;
  thumbnailDataUrl: string | null;
  source: string;
}

export interface VibraWorkspaceData {
  schemaVersion: number;
  meta: VibraPlanMeta;
  pillars: PillarTarget[];
  formatTargets: FormatTargets;
  brand: BrandProfile;
  audienceCategories: AudienceCategory[];
  concepts: ConceptDefinition[];
  references: ReferenceItem[];
  pieces: ContentPiece[];
  pendingTasks: ChecklistItem[];
}
