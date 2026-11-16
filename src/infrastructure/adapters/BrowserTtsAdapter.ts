import type {
  TtsEnginePort,
  TtsPlaybackCallbacks,
  TtsVoiceOption,
} from '../../domain/ports/TtsEnginePort';
import type { VoiceConfig } from '../../domain/value-objects';

export class BrowserTtsAdapter implements TtsEnginePort {
  private activeTimer: number | null = null;

  public isSupported(): boolean {
    return (
      typeof window !== 'undefined' &&
      'speechSynthesis' in window &&
      typeof SpeechSynthesisUtterance !== 'undefined'
    );
  }

  public getSpanishVoices(): TtsVoiceOption[] {
    if (!this.isSupported()) return [];
    const voices = window.speechSynthesis.getVoices();
    const spanish = voices.filter((v) =>
      v.lang.toLowerCase().startsWith('es')
    );
    const ordered = spanish.sort((a, b) => {
      const score = (lang: string) => {
        const lower = lang.toLowerCase();
        if (lower === 'es-pe') return 0;
        if (lower === 'es-419') return 1;
        if (lower === 'es-mx') return 2;
        if (lower === 'es-es') return 3;
        return 4;
      };
      return score(a.lang) - score(b.lang);
    });
    return ordered.map((v) => ({
      voiceURI: v.voiceURI,
      name: v.name,
      lang: v.lang,
      localService: v.localService,
    }));
  }

  public estimateDurationSec(text: string, rate: number): number {
    const clean = text.trim();
    if (!clean) return 12;
    const words = clean.split(/\s+/).filter(Boolean).length;
    // Average natural Spanish narration is ~2.45 words/sec at 1.0x
    const safeRate = Math.max(0.7, Math.min(1.6, rate || 1.0));
    const estimated = words / (2.45 * safeRate) + 1.2;
    return Math.max(4, Math.round(estimated * 10) / 10);
  }

  public speak(
    text: string,
    config: VoiceConfig,
    callbacks?: TtsPlaybackCallbacks
  ): void {
    this.stop();

    const clean = text.trim();
    if (!clean) {
      callbacks?.onError?.('No hay texto de locución para reproducir.');
      return;
    }

    if (!this.isSupported()) {
      callbacks?.onError?.(
        'Web Speech API no está disponible en este navegador.'
      );
      return;
    }

    const utterance = new SpeechSynthesisUtterance(clean);
    const voices = window.speechSynthesis.getVoices();
    const selected =
      voices.find((v) => v.voiceURI === config.voiceURI) ??
      voices.find((v) => v.lang.toLowerCase() === 'es-pe') ??
      voices.find((v) => v.lang.toLowerCase().startsWith('es-419')) ??
      voices.find((v) => v.lang.toLowerCase().startsWith('es'));

    if (selected) {
      utterance.voice = selected;
      utterance.lang = selected.lang;
    } else {
      utterance.lang = 'es-PE';
    }

    utterance.rate = Math.max(0.75, Math.min(1.5, config.rate || 1.0));
    utterance.pitch = Math.max(0.8, Math.min(1.25, config.pitch || 1.0));

    const startTime = performance.now();
    const totalEstimatedSec = this.estimateDurationSec(clean, utterance.rate);

    utterance.onstart = () => {
      callbacks?.onStart?.();
    };

    utterance.onboundary = (event) => {
      const elapsedSec = (performance.now() - startTime) / 1000;
      callbacks?.onWordBoundary?.(event.charIndex, elapsedSec);
    };

    utterance.onend = () => {
      this.clearFallbackTimer();
      callbacks?.onEnd?.();
    };

    utterance.onerror = () => {
      this.clearFallbackTimer();
      callbacks?.onError?.('Interrumpido o bloqueado por el navegador.');
    };

    // Fallback progress ticker for voices that don't emit onboundary
    this.activeTimer = window.setInterval(() => {
      if (!window.speechSynthesis.speaking) {
        this.clearFallbackTimer();
        return;
      }
      const elapsedSec = (performance.now() - startTime) / 1000;
      const ratio = Math.min(1, elapsedSec / totalEstimatedSec);
      const approxChar = Math.floor(ratio * clean.length);
      callbacks?.onWordBoundary?.(approxChar, elapsedSec);
    }, 180);

    window.speechSynthesis.speak(utterance);
  }

  public stop(): void {
    this.clearFallbackTimer();
    if (this.isSupported()) {
      window.speechSynthesis.cancel();
    }
  }

  private clearFallbackTimer(): void {
    if (this.activeTimer !== null) {
      window.clearInterval(this.activeTimer);
      this.activeTimer = null;
    }
  }
}
