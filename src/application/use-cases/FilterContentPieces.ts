import type { ContentPiece } from '../../domain/entities';
import type {
  ContentConcept,
  ContentFormat,
  PillarName,
  ProductionStatus,
  VoiceType,
} from '../../domain/value-objects';

export interface ContentFilterCriteria {
  pillar: PillarName | 'Todos';
  format: ContentFormat | 'Todos';
  status: ProductionStatus | 'Todos';
  concept: ContentConcept | 'Todos';
  voice: VoiceType | 'Todos';
  onlyStimulation: boolean;
  searchQuery: string;
}

export const DEFAULT_FILTERS: ContentFilterCriteria = {
  pillar: 'Todos',
  format: 'Todos',
  status: 'Todos',
  concept: 'Todos',
  voice: 'Todos',
  onlyStimulation: false,
  searchQuery: '',
};

export function filterContentPieces(
  pieces: ContentPiece[],
  criteria: ContentFilterCriteria
): ContentPiece[] {
  const query = criteria.searchQuery.trim().toLowerCase();

  return pieces.filter((piece) => {
    if (criteria.pillar !== 'Todos' && piece.pillar !== criteria.pillar) return false;
    if (criteria.format !== 'Todos' && piece.mediaType !== criteria.format) return false;
    if (criteria.status !== 'Todos' && piece.status !== criteria.status) return false;
    if (criteria.concept !== 'Todos' && piece.concept !== criteria.concept) return false;
    if (criteria.voice !== 'Todos' && piece.voice !== criteria.voice) return false;
    if (criteria.onlyStimulation && !piece.targetsStimulation) return false;

    if (query.length > 0) {
      const haystack = [
        piece.hook,
        piece.script,
        piece.subtopic,
        piece.audienceName,
        piece.cta,
        piece.id,
      ]
        .join(' ')
        .toLowerCase();
      if (!haystack.includes(query)) return false;
    }

    return true;
  });
}
