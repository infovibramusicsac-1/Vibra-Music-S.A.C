import type {
  LocalBridgeStatus,
  LocalMediaCategory,
  LocalMediaFile,
} from '../entities';

export interface LocalMediaPort {
  isDirectoryPickerSupported(): boolean;
  pickLocalDirectory(): Promise<{
    directoryName: string;
    files: LocalMediaFile[];
  } | null>;
  checkExpressBridge(): Promise<LocalBridgeStatus>;
  listExpressMedia(
    category?: LocalMediaCategory | 'all'
  ): Promise<LocalMediaFile[]>;
  saveExportToExpressDisk(
    filename: string,
    blob: Blob
  ): Promise<{ savedPath: string; sizeBytes: number }>;
}
