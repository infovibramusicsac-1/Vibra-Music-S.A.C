import React from 'react';
import { Search, X } from 'lucide-react';
import {
  DEFAULT_FILTERS,
  type ContentFilterCriteria,
} from '../../../application/use-cases/FilterContentPieces';
import {
  CONTENT_CONCEPTS,
  PRODUCTION_STAGES,
  type ContentConcept,
  type ContentFormat,
  type PillarName,
  type ProductionStatus,
  type VoiceType,
} from '../../../domain/value-objects';

interface FiltersBarProps {
  filters: ContentFilterCriteria;
  onChange: (next: ContentFilterCriteria) => void;
  matchedCount: number;
  totalCount: number;
}

const PILLARS: (PillarName | 'Todos')[] = [
  'Todos',
  'Nueva Visión',
  'Tienda',
  'Festivo',
  'Conversión',
  'Comunidad',
];

export const FiltersBar: React.FC<FiltersBarProps> = ({
  filters,
  onChange,
  matchedCount,
  totalCount,
}) => {
  const isDirty =
    filters.pillar !== 'Todos' ||
    filters.format !== 'Todos' ||
    filters.status !== 'Todos' ||
    filters.concept !== 'Todos' ||
    filters.voice !== 'Todos' ||
    filters.onlyStimulation ||
    filters.searchQuery.trim().length > 0;

  return (
    <div className="glass-panel rounded-3xl p-4 sm:p-5 space-y-4">
      <div className="flex flex-col lg:flex-row lg:items-center gap-3">
        <div className="relative flex-1 min-w-[220px]">
          <Search
            className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
            aria-hidden="true"
          />
          <input
            type="search"
            value={filters.searchQuery}
            onChange={(e) =>
              onChange({ ...filters, searchQuery: e.target.value })
            }
            placeholder="Buscar por hook, guion, subtema o audiencia..."
            className="w-full rounded-xl border border-slate-900/10 dark:border-white/12 bg-white/60 dark:bg-white/5 pl-10 pr-4 py-2 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:border-[#FF5A4E] focus:outline-none"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <select
            aria-label="Filtrar por pilar"
            value={filters.pillar}
            onChange={(e) =>
              onChange({
                ...filters,
                pillar: e.target.value as PillarName | 'Todos',
              })
            }
            className="rounded-xl border border-slate-900/10 dark:border-white/12 bg-white/75 dark:bg-[#111B33] px-3 py-2 text-xs font-medium text-slate-800 dark:text-slate-100 focus:border-[#FF5A4E] focus:outline-none cursor-pointer"
          >
            {PILLARS.map((p) => (
              <option key={p} value={p}>
                {p === 'Todos' ? 'Pilar: Todos' : p}
              </option>
            ))}
          </select>

          <select
            aria-label="Filtrar por formato"
            value={filters.format}
            onChange={(e) =>
              onChange({
                ...filters,
                format: e.target.value as ContentFormat | 'Todos',
              })
            }
            className="rounded-xl border border-slate-900/10 dark:border-white/12 bg-white/75 dark:bg-[#111B33] px-3 py-2 text-xs font-medium text-slate-800 dark:text-slate-100 focus:border-[#FF5A4E] focus:outline-none cursor-pointer"
          >
            <option value="Todos">Formato: Todos</option>
            <option value="Video">Video</option>
            <option value="Estático">Estático</option>
          </select>

          <select
            aria-label="Filtrar por estado"
            value={filters.status}
            onChange={(e) =>
              onChange({
                ...filters,
                status: e.target.value as ProductionStatus | 'Todos',
              })
            }
            className="rounded-xl border border-slate-900/10 dark:border-white/12 bg-white/75 dark:bg-[#111B33] px-3 py-2 text-xs font-medium text-slate-800 dark:text-slate-100 focus:border-[#FF5A4E] focus:outline-none cursor-pointer"
          >
            <option value="Todos">Estado: Todos</option>
            {PRODUCTION_STAGES.map((st) => (
              <option key={st} value={st}>
                {st}
              </option>
            ))}
          </select>

          <select
            aria-label="Filtrar por concepto"
            value={filters.concept}
            onChange={(e) =>
              onChange({
                ...filters,
                concept: e.target.value as ContentConcept | 'Todos',
              })
            }
            className="rounded-xl border border-slate-900/10 dark:border-white/12 bg-white/75 dark:bg-[#111B33] px-3 py-2 text-xs font-medium text-slate-800 dark:text-slate-100 focus:border-[#FF5A4E] focus:outline-none cursor-pointer"
          >
            <option value="Todos">Concepto: Todos</option>
            {CONTENT_CONCEPTS.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>

          <select
            aria-label="Filtrar por tipo de voz"
            value={filters.voice}
            onChange={(e) =>
              onChange({
                ...filters,
                voice: e.target.value as VoiceType | 'Todos',
              })
            }
            className="rounded-xl border border-slate-900/10 dark:border-white/12 bg-white/75 dark:bg-[#111B33] px-3 py-2 text-xs font-medium text-slate-800 dark:text-slate-100 focus:border-[#FF5A4E] focus:outline-none cursor-pointer"
          >
            <option value="Todos">Voz: Todas</option>
            <option value="Sin voz">Sin voz</option>
            <option value="Con voz">Con voz</option>
          </select>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 pt-1 border-t border-slate-900/6 dark:border-white/8">
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() =>
              onChange({ ...filters, onlyStimulation: !filters.onlyStimulation })
            }
            className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap ${
              filters.onlyStimulation
                ? 'bg-[#FF5A4E] text-white'
                : 'bg-slate-900/6 dark:bg-white/6 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            Solo Estimulación (4–5)
          </button>

          {isDirty && (
            <button
              type="button"
              onClick={() => onChange(DEFAULT_FILTERS)}
              className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-medium text-slate-500 dark:text-slate-400 hover:text-[#FF5A4E] transition-colors cursor-pointer"
            >
              <X className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Limpiar filtros</span>
            </button>
          )}
        </div>

        <p className="font-mono-tabular text-xs text-slate-500 dark:text-slate-400">
          Mostrando {matchedCount} de {totalCount} piezas
        </p>
      </div>
    </div>
  );
};
