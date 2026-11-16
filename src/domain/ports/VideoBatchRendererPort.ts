import type { ContentPiece, RenderJob, SceneClip, SubtitleCue } from '../entities';
import type { SubtitlePreset } from '../value-objects';

export interface BatchRenderProgressEvent {
  job: RenderJob;
}

export interface Mp4ExportResult {
  blob: Blob;
  durationSec: number;
  width: number;
  height: number;
  hasAudio: boolean;
}

export interface VideoBatchRendererPort {
  buildSubtitleCues(
    piece: ContentPiece,
    durationSec: number,
    forceRegenerate?: boolean
  ): SubtitleCue[];
  buildSrtContent(cues: SubtitleCue[]): string;
  createDemoSceneClips(piece: ContentPiece): SceneClip[];
  renderPiece(
    piece: ContentPiece,
    presetOverride?: SubtitlePreset,
    onProgress?: (event: BatchRenderProgressEvent) => void
  ): Promise<RenderJob>;
  renderBatch(
    pieces: ContentPiece[],
    preset: SubtitlePreset,
    onPieceProgress: (pieceId: string, job: RenderJob) => void
  ): Promise<RenderJob[]>;
  canExportMp4OnWeb(): Promise<{ supported: boolean; reason?: string }>;
  exportMp4OnWeb(
    piece: ContentPiece,
    durationSec: number,
    onProgress?: (pct: number, statusText: string) => void
  ): Promise<Mp4ExportResult>;
}
