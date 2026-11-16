import { createVibraSeedData } from '../../application/seed/vibraSeedData';
import type {
  ChecklistItem,
  ContentPiece,
  VibraWorkspaceData,
} from '../../domain/entities';
import type { ContentRepositoryPort } from '../../domain/ports/ContentRepositoryPort';

const STORAGE_KEY_PIECES = 'vibra_marketing_os_pieces_v2';
const STORAGE_KEY_TASKS = 'vibra_marketing_os_tasks_v2';

export class LocalContentAdapter implements ContentRepositoryPort {
  public readonly adapterName = 'LocalContentAdapter (localStorage)';

  public loadWorkspace(): VibraWorkspaceData {
    const seed = createVibraSeedData();

    try {
      const rawPieces = window.localStorage.getItem(STORAGE_KEY_PIECES);
      const rawTasks = window.localStorage.getItem(STORAGE_KEY_TASKS);

      const pieces: ContentPiece[] = rawPieces
        ? (JSON.parse(rawPieces) as ContentPiece[]).map((p) => ({
            ...p,
            // Ephemeral blob: URLs cannot survive a hard reload; clear invalid blob URLs safely
            sceneClips: (p.sceneClips ?? []).filter(
              (clip) => !clip.objectUrl.startsWith('blob:')
            ),
            overlayImageUrl: p.overlayImageUrl?.startsWith('blob:')
              ? undefined
              : p.overlayImageUrl,
            customAudioUrl: p.customAudioUrl?.startsWith('blob:')
              ? undefined
              : p.customAudioUrl,
          }))
        : seed.pieces;

      const pendingTasks: ChecklistItem[] = rawTasks
        ? (JSON.parse(rawTasks) as ChecklistItem[])
        : seed.pendingTasks;

      return {
        ...seed,
        pieces: pieces.length > 0 ? pieces : seed.pieces,
        pendingTasks: pendingTasks.length > 0 ? pendingTasks : seed.pendingTasks,
      };
    } catch {
      return seed;
    }
  }

  public savePieces(pieces: ContentPiece[]): void {
    try {
      // Strip transient blob: URLs before serializing to localStorage
      const serializable = pieces.map((p) => ({
        ...p,
        sceneClips: (p.sceneClips ?? []).filter(
          (clip) => !clip.objectUrl.startsWith('blob:')
        ),
        overlayImageUrl: p.overlayImageUrl?.startsWith('blob:')
          ? undefined
          : p.overlayImageUrl,
        customAudioUrl: p.customAudioUrl?.startsWith('blob:')
          ? undefined
          : p.customAudioUrl,
      }));
      window.localStorage.setItem(
        STORAGE_KEY_PIECES,
        JSON.stringify(serializable)
      );
    } catch {
      // Ignore storage quota errors cleanly
    }
  }

  public saveTasks(tasks: ChecklistItem[]): void {
    try {
      window.localStorage.setItem(STORAGE_KEY_TASKS, JSON.stringify(tasks));
    } catch {
      // Ignore storage quota errors cleanly
    }
  }

  public resetToSeed(): VibraWorkspaceData {
    const seed = createVibraSeedData();
    try {
      window.localStorage.removeItem(STORAGE_KEY_PIECES);
      window.localStorage.removeItem(STORAGE_KEY_TASKS);
      window.localStorage.setItem(STORAGE_KEY_PIECES, JSON.stringify(seed.pieces));
      window.localStorage.setItem(
        STORAGE_KEY_TASKS,
        JSON.stringify(seed.pendingTasks)
      );
    } catch {
      // Ignore storage quota errors cleanly
    }
    return seed;
  }
}
