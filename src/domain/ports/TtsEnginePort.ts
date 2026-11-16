import type { VoiceConfig } from '../value-objects';

export interface TtsVoiceOption {
  voiceURI: string;
  name: string;
  lang: string;
  localService: boolean;
}

export interface TtsPlaybackCallbacks {
  onStart?: () => void;
  onWordBoundary?: (charIndex: number, elapsedSec: number) => void;
  onEnd?: () => void;
  onError?: (reason: string) => void;
}

export interface TtsEnginePort {
  isSupported(): boolean;
  getSpanishVoices(): TtsVoiceOption[];
  estimateDurationSec(text: string, rate: number): number;
  speak(text: string, config: VoiceConfig, callbacks?: TtsPlaybackCallbacks): void;
  stop(): void;
}
