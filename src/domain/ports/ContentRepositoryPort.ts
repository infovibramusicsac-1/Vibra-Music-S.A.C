import type { ChecklistItem, ContentPiece, VibraWorkspaceData } from '../entities';

export interface ContentRepositoryPort {
  loadWorkspace(): VibraWorkspaceData;
  savePieces(pieces: ContentPiece[]): void;
  saveTasks(tasks: ChecklistItem[]): void;
  resetToSeed(): VibraWorkspaceData;
  readonly adapterName: string;
}
