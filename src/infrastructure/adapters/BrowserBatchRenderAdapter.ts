import { beatsToSubtitleCues } from '../../application/use-cases/PieceWorkflowUseCases';
import type {
  ContentPiece,
  RenderJob,
  SceneClip,
  SubtitleCue,
} from '../../domain/entities';
import type {
  BatchRenderProgressEvent,
  Mp4ExportResult,
  VideoBatchRendererPort,
} from '../../domain/ports/VideoBatchRendererPort';
import type { SubtitlePreset } from '../../domain/value-objects';
import { BrowserTtsAdapter } from './BrowserTtsAdapter';

const DEMO_PALETTES = [
  { bg1: '#111B33', bg2: '#FF5A4E', label: 'Escena 01 · Vibra Estudio' },
  { bg1: '#18243E', bg2: '#F5A623', label: 'Escena 02 · Instrumentos' },
  { bg1: '#0F172A', bg2: '#38BDF8', label: 'Escena 03 · Clase en Vivo' },
];

function formatSrtTimestamp(totalSeconds: number): string {
  const safe = Math.max(0, totalSeconds);
  const hours = Math.floor(safe / 3600);
  const mins = Math.floor((safe % 3600) / 60);
  const secs = Math.floor(safe % 60);
  const ms = Math.round((safe - Math.floor(safe)) * 1000);
  const pad = (n: number, len = 2) => String(n).padStart(len, '0');
  return `${pad(hours)}:${pad(mins)}:${pad(secs)},${pad(ms, 3)}`;
}

export class BrowserBatchRenderAdapter implements VideoBatchRendererPort {
  private readonly tts = new BrowserTtsAdapter();

  public buildSubtitleCues(
    piece: ContentPiece,
    durationSec: number,
    forceRegenerate = false
  ): SubtitleCue[] {
    if (
      !forceRegenerate &&
      piece.customSubtitleCues &&
      piece.customSubtitleCues.length > 0
    ) {
      return piece.customSubtitleCues;
    }

    if (piece.kineticBeats && piece.kineticBeats.length > 0) {
      return beatsToSubtitleCues(piece.kineticBeats);
    }

    const sourceText =
      piece.voice === 'Con voz' && piece.voiceoverText.trim().length > 0
        ? piece.voiceoverText.trim()
        : `${piece.hook}. ${piece.script}. ${piece.cta}`.trim();

    const words = sourceText.split(/\s+/).filter(Boolean);
    if (words.length === 0) return [];

    // Group into punchy 4-5 word vertical video subtitle phrases
    const chunkSize = 4;
    const phrases: string[] = [];
    for (let i = 0; i < words.length; i += chunkSize) {
      phrases.push(words.slice(i, i + chunkSize).join(' '));
    }

    const totalSec = Math.max(6, durationSec);
    const totalWords = words.length;
    let cursorSec = 0;

    return phrases.map((phrase, idx) => {
      const phraseWords = phrase.split(/\s+/).length;
      const sliceDuration = Math.max(
        1.1,
        (phraseWords / totalWords) * totalSec
      );
      const startSec = Number(cursorSec.toFixed(2));
      const endSec = Number(
        Math.min(totalSec, cursorSec + sliceDuration).toFixed(2)
      );
      cursorSec = endSec;

      const phraseParts = phrase.split(/\s+/);
      const highlightWord =
        phraseParts.reduce(
          (longest, curr) =>
            curr.replace(/[.,!?¿¡]/g, '').length >
            longest.replace(/[.,!?¿¡]/g, '').length
              ? curr
              : longest,
          phraseParts[0] ?? ''
        ) || undefined;

      return {
        index: idx + 1,
        startSec,
        endSec: idx === phrases.length - 1 ? totalSec : endSec,
        text: phrase,
        highlightWord,
      };
    });
  }

  public buildSrtContent(cues: SubtitleCue[]): string {
    return cues
      .map(
        (cue) =>
          `${cue.index}\n${formatSrtTimestamp(cue.startSec)} --> ${formatSrtTimestamp(cue.endSec)}\n${cue.text}\n`
      )
      .join('\n');
  }

  public createDemoSceneClips(piece: ContentPiece): SceneClip[] {
    const scenes =
      piece.scenesToRecord.length > 0
        ? piece.scenesToRecord
        : ['Toma principal de clase en Vibra Music SJL', 'Detalle de instrumento'];

    return scenes.map((sceneLabel, idx) => {
      const palette = DEMO_PALETTES[idx % DEMO_PALETTES.length];
      return {
        id: `demo-${piece.id}-${idx + 1}`,
        sceneLabel,
        fileName: `toma_demo_${piece.id}_0${idx + 1}.mp4`,
        objectUrl: `demo-synth://${piece.id}/${idx}`,
        durationSec: 5.5,
        isDemo: true,
        mimeType: 'video/mp4',
        accentTone: palette.bg2,
      };
    });
  }

  public async renderPiece(
    piece: ContentPiece,
    presetOverride?: SubtitlePreset,
    onProgress?: (event: BatchRenderProgressEvent) => void
  ): Promise<RenderJob> {
    const preset = presetOverride ?? piece.subtitlePreset;
    const scriptText =
      piece.voice === 'Con voz' && piece.voiceoverText.trim()
        ? piece.voiceoverText
        : `${piece.hook}. ${piece.script}`;

    const clipTotalDuration = piece.sceneClips.reduce(
      (sum, c) => sum + c.durationSec,
      0
    );
    const ttsDuration = this.tts.estimateDurationSec(
      scriptText,
      piece.voiceConfig.rate
    );
    const estimatedDurationSec = Math.max(
      12,
      Math.round(Math.max(clipTotalDuration, ttsDuration) * 10) / 10
    );

    const subtitleCues = this.buildSubtitleCues(piece, estimatedDurationSec);
    const srtContent = this.buildSrtContent(subtitleCues);

    const manifestJson = JSON.stringify(
      {
        schema: 'vibra-short-video-factory/v1',
        exportedAt: new Date().toISOString(),
        pieceId: piece.id,
        date: piece.date,
        pillar: piece.pillar,
        funnelStage: piece.funnelStage,
        voice: piece.voice,
        voiceConfig: piece.voice === 'Con voz' ? piece.voiceConfig : null,
        bgmTrackId: piece.bgmTrackId,
        bgmVolume: piece.bgmVolume,
        subtitlePreset: preset,
        estimatedDurationSec,
        hook: piece.hook,
        cta: piece.cta,
        scenes: piece.scenesToRecord,
        clips: piece.sceneClips.map((c) => ({
          fileName: c.fileName,
          sceneLabel: c.sceneLabel,
          durationSec: c.durationSec,
          isDemo: c.isDemo,
        })),
        subtitleCues,
      },
      null,
      2
    );

    const job: RenderJob = {
      id: `job-${piece.id}-${Date.now()}`,
      pieceId: piece.id,
      status: 'queued',
      progress: 8,
      subtitlePreset: preset,
      estimatedDurationSec,
      subtitleCues,
      srtContent,
      manifestJson,
      createdAt: new Date().toISOString(),
    };

    const emit = (patch: Partial<RenderJob>) => {
      Object.assign(job, patch);
      onProgress?.({ job: { ...job } });
    };

    emit({ status: 'queued', progress: 12 });
    await sleep(180);

    if (piece.voice === 'Con voz') {
      emit({ status: 'synthesizing_tts', progress: 42 });
      await sleep(260);
    } else {
      emit({ status: 'synthesizing_tts', progress: 40 });
      await sleep(160);
    }

    emit({ status: 'syncing_subtitles', progress: 74 });
    await sleep(240);

    emit({ status: 'composing', progress: 92 });
    await sleep(220);

    emit({
      status: 'completed',
      progress: 100,
      completedAt: new Date().toISOString(),
    });

    return { ...job };
  }

  public async renderBatch(
    pieces: ContentPiece[],
    preset: SubtitlePreset,
    onPieceProgress: (pieceId: string, job: RenderJob) => void
  ): Promise<RenderJob[]> {
    const results: RenderJob[] = [];
    for (const piece of pieces) {
      const completed = await this.renderPiece(piece, preset, ({ job }) => {
        onPieceProgress(piece.id, job);
      });
      results.push(completed);
    }
    return results;
  }

  public async canExportMp4OnWeb(): Promise<{
    supported: boolean;
    reason?: string;
  }> {
    return {
      supported: false,
      reason: 'Usa RemotionWebRenderAdapter para exportar .MP4 en navegador.',
    };
  }

  public async exportMp4OnWeb(
    _piece: ContentPiece,
    _durationSec: number
  ): Promise<Mp4ExportResult> {
    throw new Error(
      'Usa RemotionWebRenderAdapter para exportar .MP4 en navegador.'
    );
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}
