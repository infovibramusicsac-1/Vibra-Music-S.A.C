import type {
  LocalBridgeStatus,
  LocalMediaCategory,
  LocalMediaFile,
} from '../../domain/entities';
import type { LocalMediaPort } from '../../domain/ports/LocalMediaPort';

const VIDEO_EXTENSIONS = new Set(['.mp4', '.mov', '.webm', '.m4v']);
const AUDIO_EXTENSIONS = new Set(['.mp3', '.wav', '.m4a', '.ogg']);
const IMAGE_EXTENSIONS = new Set(['.png', '.jpg', '.jpeg', '.webp', '.svg']);

function getExt(name: string): string {
  const idx = name.lastIndexOf('.');
  return idx >= 0 ? name.slice(idx).toLowerCase() : '';
}

function isSupportedMediaExt(ext: string): boolean {
  return (
    VIDEO_EXTENSIONS.has(ext) ||
    AUDIO_EXTENSIONS.has(ext) ||
    IMAGE_EXTENSIONS.has(ext)
  );
}

function inferMimeType(name: string, fallbackType?: string): string {
  if (fallbackType) return fallbackType;
  const ext = getExt(name);
  switch (ext) {
    case '.mp4':
    case '.m4v':
      return 'video/mp4';
    case '.mov':
      return 'video/quicktime';
    case '.webm':
      return 'video/webm';
    case '.mp3':
      return 'audio/mpeg';
    case '.wav':
      return 'audio/wav';
    case '.m4a':
      return 'audio/mp4';
    case '.ogg':
      return 'audio/ogg';
    case '.png':
      return 'image/png';
    case '.jpg':
    case '.jpeg':
      return 'image/jpeg';
    case '.webp':
      return 'image/webp';
    case '.svg':
      return 'image/svg+xml';
    default:
      return 'application/octet-stream';
  }
}

function inferCategoryAndKind(mimeType: string): {
  kind: LocalMediaFile['kind'];
  category: LocalMediaCategory;
} {
  if (mimeType.startsWith('audio/')) {
    return { kind: 'audio', category: 'audio' };
  }
  if (mimeType.startsWith('image/')) {
    return { kind: 'image', category: 'resources' };
  }
  return { kind: 'video', category: 'clips' };
}

async function blobToBase64(blob: Blob): Promise<string> {
  const buffer = await blob.arrayBuffer();
  const bytes = new Uint8Array(buffer);
  const chunkSize = 0x8000;
  let binary = '';
  for (let i = 0; i < bytes.length; i += chunkSize) {
    const chunk = bytes.subarray(i, i + chunkSize);
    binary += String.fromCharCode(...chunk);
  }
  return btoa(binary);
}

interface DirectoryHandleLike {
  name: string;
  values: () => AsyncIterable<FileSystemHandleLike>;
}

interface FileSystemHandleLike {
  kind: 'file' | 'directory';
  name: string;
  getFile?: () => Promise<File>;
}

export class HybridLocalMediaAdapter implements LocalMediaPort {
  public isDirectoryPickerSupported(): boolean {
    return (
      typeof window !== 'undefined' &&
      typeof (window as unknown as { showDirectoryPicker?: unknown })
        .showDirectoryPicker === 'function'
    );
  }

  public async pickLocalDirectory(): Promise<{
    directoryName: string;
    files: LocalMediaFile[];
  } | null> {
    if (!this.isDirectoryPickerSupported()) {
      throw new Error(
        'Tu navegador no soporta File System Access API (usa Chrome/Edge o la carpeta Express local-studio/).'
      );
    }

    const picker = (
      window as unknown as {
        showDirectoryPicker: (opts?: {
          mode?: 'read' | 'readwrite';
        }) => Promise<DirectoryHandleLike>;
      }
    ).showDirectoryPicker;

    try {
      const dirHandle = await picker({ mode: 'read' });
      const files: LocalMediaFile[] = [];

      const scanDirectory = async (
        handle: DirectoryHandleLike,
        prefix = ''
      ): Promise<void> => {
        for await (const entry of handle.values()) {
          if (entry.kind === 'file' && entry.getFile) {
            const ext = getExt(entry.name);
            if (!isSupportedMediaExt(ext)) continue;
            const file = await entry.getFile();
            const mimeType = inferMimeType(file.name, file.type);
            const { kind, category } = inferCategoryAndKind(mimeType);
            files.push({
              name: prefix ? `${prefix}/${file.name}` : file.name,
              sizeBytes: file.size,
              mimeType,
              kind,
              category,
              url: URL.createObjectURL(file),
              source: 'local-folder',
            });
          } else if (entry.kind === 'directory' && !prefix.includes('/')) {
            await scanDirectory(
              entry as unknown as DirectoryHandleLike,
              prefix ? `${prefix}/${entry.name}` : entry.name
            );
          }
        }
      };

      await scanDirectory(dirHandle);
      files.sort((a, b) => a.name.localeCompare(b.name));

      return {
        directoryName: dirHandle.name,
        files,
      };
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') {
        return null;
      }
      throw err;
    }
  }

  public async checkExpressBridge(): Promise<LocalBridgeStatus> {
    try {
      const response = await fetch('/api/local/status', {
        headers: { Accept: 'application/json' },
      });
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      return (await response.json()) as LocalBridgeStatus;
    } catch {
      return {
        available: false,
        mediaDir: 'local-studio/clips',
        clipsDir: 'local-studio/clips',
        audioDir: 'local-studio/audio',
        resourcesDir: 'local-studio/resources',
        exportsDir: 'local-studio/exports',
        mediaCount: 0,
        clipsCount: 0,
        audioCount: 0,
        resourcesCount: 0,
        exportCount: 0,
      };
    }
  }

  public async listExpressMedia(
    category: LocalMediaCategory | 'all' = 'all'
  ): Promise<LocalMediaFile[]> {
    const query = category === 'all' ? '' : `?category=${encodeURIComponent(category)}`;
    const response = await fetch(`/api/local/media${query}`, {
      headers: { Accept: 'application/json' },
    });
    if (!response.ok) {
      throw new Error('No se pudieron leer las carpetas de local-studio/.');
    }
    const payload = (await response.json()) as { files: LocalMediaFile[] };
    return payload.files ?? [];
  }

  public async saveExportToExpressDisk(
    filename: string,
    blob: Blob
  ): Promise<{ savedPath: string; sizeBytes: number }> {
    const contentBase64 = await blobToBase64(blob);
    const response = await fetch('/api/local/export', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ filename, contentBase64 }),
    });
    if (!response.ok) {
      const text = await response.text();
      throw new Error(text || 'No se pudo guardar en local-studio/exports.');
    }
    return (await response.json()) as { savedPath: string; sizeBytes: number };
  }
}
