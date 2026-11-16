import type {
  ChecklistItem,
  ContentPiece,
  VibraWorkspaceData,
} from '../../domain/entities';
import type { ContentRepositoryPort } from '../../domain/ports/ContentRepositoryPort';
import { LocalContentAdapter } from './LocalContentAdapter';

export interface InsforgeConfig {
  endpointUrl?: string;
  projectKey?: string;
  workspaceId?: string;
}

/**
 * Stage-2 Repository Adapter prepared for InsForge multi-user sync.
 * Transparently delegates to LocalContentAdapter when no remote endpoint is configured.
 */
export class InsforgeContentAdapter implements ContentRepositoryPort {
  public readonly adapterName = 'InsforgeContentAdapter (Stage-2 Ready)';
  private readonly fallback = new LocalContentAdapter();
  private readonly config: InsforgeConfig;

  constructor(config: InsforgeConfig = {}) {
    this.config = config;
  }

  public isRemoteConfigured(): boolean {
    return Boolean(this.config.endpointUrl && this.config.projectKey);
  }

  public loadWorkspace(): VibraWorkspaceData {
    // Stage 2: hydrate initial snapshot from InsForge REST/Realtime client, then merge local cache
    return this.fallback.loadWorkspace();
  }

  public savePieces(pieces: ContentPiece[]): void {
    this.fallback.savePieces(pieces);
    if (this.isRemoteConfigured()) {
      void this.syncRemote('/pieces/batch', pieces);
    }
  }

  public saveTasks(tasks: ChecklistItem[]): void {
    this.fallback.saveTasks(tasks);
    if (this.isRemoteConfigured()) {
      void this.syncRemote('/tasks/batch', tasks);
    }
  }

  public resetToSeed(): VibraWorkspaceData {
    const fresh = this.fallback.resetToSeed();
    if (this.isRemoteConfigured()) {
      void this.syncRemote('/workspace/reset', { schemaVersion: fresh.schemaVersion });
    }
    return fresh;
  }

  private async syncRemote(path: string, payload: unknown): Promise<void> {
    if (!this.config.endpointUrl || !this.config.projectKey) return;
    try {
      await fetch(`${this.config.endpointUrl}${path}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.config.projectKey}`,
          'X-Vibra-Workspace': this.config.workspaceId ?? 'vibra-fase-1',
        },
        body: JSON.stringify(payload),
      });
    } catch {
      // Transparent local fallback already persisted
    }
  }
}
