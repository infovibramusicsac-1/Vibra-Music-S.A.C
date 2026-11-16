import {
  canRenderMediaOnWeb,
  renderMediaOnWeb,
} from '@remotion/web-renderer';
import type { ContentPiece } from '../../domain/entities';
import type { Mp4ExportResult } from '../../domain/ports/VideoBatchRendererPort';
import { getProceduralBgmWavUrl } from '../audio/proceduralBgmWav';
import { getProceduralSfxWavUrl } from '../audio/proceduralSfxWav';
import {
  VIBRA_COMPOSITION_FPS,
  VIBRA_COMPOSITION_HEIGHT,
  VIBRA_COMPOSITION_WIDTH,
  VibraReelComposition,
  type VibraReelCompositionProps,
} from '../remotion/VibraReelComposition';
import { BrowserBatchRenderAdapter } from './BrowserBatchRenderAdapter';

export class RemotionWebRenderAdapter extends BrowserBatchRenderAdapter {
  private async resolveRenderMode(): Promise<{
    supported: boolean;
    withAudio: boolean;
    reason?: string;
  }> {
    try {
      const audioCheck = await canRenderMediaOnWeb({
        container: 'mp4',
        videoCodec: 'h264',
        width: VIBRA_COMPOSITION_WIDTH,
        height: VIBRA_COMPOSITION_HEIGHT,
        muted: false,
      });

      if (audioCheck.canRender) {
        return { supported: true, withAudio: true };
      }

      const videoOnlyCheck = await canRenderMediaOnWeb({
        container: 'mp4',
        videoCodec: 'h264',
        width: VIBRA_COMPOSITION_WIDTH,
        height: VIBRA_COMPOSITION_HEIGHT,
        muted: true,
      });

      if (videoOnlyCheck.canRender) {
        return { supported: true, withAudio: false };
      }

      const firstError =
        videoOnlyCheck.issues.find((i) => i.severity === 'error')?.message ??
        videoOnlyCheck.issues[0]?.message ??
        'WebCodecs H.264 MP4 no disponible en este navegador.';
      return { supported: false, withAudio: false, reason: firstError };
    } catch (err) {
      return {
        supported: false,
        withAudio: false,
        reason:
          err instanceof Error
            ? err.message
            : 'WebCodecs no disponible en este entorno.',
      };
    }
  }

  public override async canExportMp4OnWeb(): Promise<{
    supported: boolean;
    reason?: string;
  }> {
    const mode = await this.resolveRenderMode();
    return { supported: mode.supported, reason: mode.reason };
  }

  public override async exportMp4OnWeb(
    piece: ContentPiece,
    durationSec: number,
    onProgress?: (pct: number, statusText: string) => void
  ): Promise<Mp4ExportResult> {
    const safeDuration = Math.max(8, Math.round(durationSec * 10) / 10);
    const durationInFrames = Math.max(
      VIBRA_COMPOSITION_FPS * 8,
      Math.round(safeDuration * VIBRA_COMPOSITION_FPS)
    );
    const cues = this.buildSubtitleCues(piece, safeDuration);

    onProgress?.(4, 'Verificando soporte WebCodecs H.264 + Audio…');
    const mode = await this.resolveRenderMode();
    if (!mode.supported) {
      throw new Error(
        mode.reason ??
          'Tu navegador no soporta renderizado MP4 client-side con WebCodecs.'
      );
    }

    const bgmAudioUrl = getProceduralBgmWavUrl(piece.bgmTrackId);
    const sfxAudioUrl =
      piece.sfxEnabled !== false
        ? getProceduralSfxWavUrl(piece.kineticBeats, safeDuration)
        : undefined;

    onProgress?.(
      10,
      mode.withAudio
        ? 'Iniciando composición Remotion 1080×1920 con mezcla de audio…'
        : 'Iniciando composición Remotion 1080×1920 (modo video)…'
    );

    const defaultProps: VibraReelCompositionProps = {
      piece,
      cues,
      safeZone: 'off',
      muted: !mode.withAudio,
      bgmAudioUrl,
      sfxAudioUrl,
    };

    const result = await renderMediaOnWeb({
      composition: {
        id: `vibra-${piece.id}`,
        component: VibraReelComposition,
        durationInFrames,
        fps: VIBRA_COMPOSITION_FPS,
        width: VIBRA_COMPOSITION_WIDTH,
        height: VIBRA_COMPOSITION_HEIGHT,
        defaultProps,
      },
      inputProps: defaultProps,
      container: 'mp4',
      videoCodec: 'h264',
      muted: !mode.withAudio,
      onProgress: (p) => {
        const pct = Math.min(96, Math.max(12, Math.round(p.progress * 100)));
        onProgress?.(
          pct,
          `Codificando cuadro ${p.renderedFrames}/${durationInFrames} (${pct}%)`
        );
      },
    });

    onProgress?.(98, 'Empaquetando contenedor .MP4…');
    const blob = await result.getBlob();
    onProgress?.(100, 'Video .MP4 listo');

    return {
      blob,
      durationSec: safeDuration,
      width: VIBRA_COMPOSITION_WIDTH,
      height: VIBRA_COMPOSITION_HEIGHT,
      hasAudio: mode.withAudio,
    };
  }
}
