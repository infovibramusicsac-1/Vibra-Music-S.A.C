import type {
  ContentConcept,
  FunnelStage,
  PillarName,
  VoiceType,
} from '../value-objects';

export type ScriptAngle = 'dato_curioso' | 'mito_realidad' | 'historia_breve';

export interface AiBackendStatus {
  configured: boolean;
  models: {
    script: string;
    tts: string;
    video: string;
  };
}

export interface GeneratedScriptResult {
  curiousFactTitle: string;
  hook: string;
  script: string;
  voiceoverText: string;
  cta: string;
}

export interface GeneratedPromptPostBeat {
  startSec: number;
  endSec: number;
  role: 'hook' | 'body' | 'cta';
  spokenText: string;
  kineticText: string;
  highlightWord?: string;
  highlightColor?: string;
  stepByStepItems?: string[];
  sfxLabel: string;
}

export interface GeneratedPromptPostResult {
  title: string;
  coreIdea: string;
  durationSec: number;
  pillar: PillarName;
  audienceName: string;
  funnelStage: FunnelStage;
  concept: ContentConcept;
  voice: VoiceType;
  cta: string;
  beats: GeneratedPromptPostBeat[];
}

export interface GeneratedTtsResult {
  audioUrl: string;
  fileName: string;
  mimeType: string;
  savedPath?: string;
}

export interface GeneratedVideoResult {
  videoUrl: string;
  fileName: string;
  mimeType: string;
  savedPath?: string;
}

export interface AiCreativePort {
  checkStatus(): Promise<AiBackendStatus>;
  generateCuriosoScript(params: {
    topic: string;
    pillar: string;
    audienceName: string;
    angle: ScriptAngle;
    cta: string;
  }): Promise<GeneratedScriptResult>;
  generatePostFromPrompt(params: {
    prompt: string;
    targetDurationSec?: number;
  }): Promise<GeneratedPromptPostResult>;
  generateGeminiTts(params: {
    text: string;
    voiceName: string;
    saveToLocal?: boolean;
    fileNameHint?: string;
  }): Promise<GeneratedTtsResult>;
  generateOmniVideo(params: {
    prompt: string;
    aspectRatio?: '9:16' | '16:9';
    durationSec?: number;
    resolution?: '360p' | '720p' | '1080p';
    saveToLocal?: boolean;
    fileNameHint?: string;
  }): Promise<GeneratedVideoResult>;
}
