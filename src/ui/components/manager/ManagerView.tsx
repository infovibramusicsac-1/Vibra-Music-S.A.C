import React, { useMemo, useState } from 'react';
import { BookMarked, CalendarDays, Columns3 } from 'lucide-react';
import {
  DEFAULT_FILTERS,
  filterContentPieces,
  type ContentFilterCriteria,
} from '../../../application/use-cases/FilterContentPieces';
import { useVibraServices } from '../../context/VibraServicesContext';
import { BrandBenchmarksDrawer } from './BrandBenchmarksDrawer';
import { Calendar30DaysView } from './Calendar30DaysView';
import { FiltersBar } from './FiltersBar';
import { FunnelMatrix } from './FunnelMatrix';

type ManagerSubView = 'matrix' | 'calendar' | 'brand';

export const ManagerView: React.FC = () => {
  const { workspace } = useVibraServices();
  const [subView, setSubView] = useState<ManagerSubView>('matrix');
  const [filters, setFilters] = useState<ContentFilterCriteria>(DEFAULT_FILTERS);

  const filteredPieces = useMemo(
    () => filterContentPieces(workspace.pieces, filters),
    [workspace.pieces, filters]
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div className="space-y-1">
          <h1 className="font-display text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white [text-wrap:balance]">
            Content Manager
          </h1>
          <p className="text-sm text-slate-600 dark:text-slate-300">
            Matriz estratégica TOFU / MOFU / BOFU, calendario de 30 días y guía editorial de Vibra Music.
          </p>
        </div>

        <div className="inline-flex items-center gap-1 rounded-2xl border border-slate-900/10 dark:border-white/12 bg-white/70 dark:bg-white/6 p-1 self-start">
          <button
            type="button"
            onClick={() => setSubView('matrix')}
            className={`inline-flex items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
              subView === 'matrix'
                ? 'bg-gradient-to-r from-[#FF5A4E] to-[#F5A623] text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Columns3 className="h-3.5 w-3.5" aria-hidden="true" />
            <span>Matriz de Embudo</span>
          </button>
          <button
            type="button"
            onClick={() => setSubView('calendar')}
            className={`inline-flex items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
              subView === 'calendar'
                ? 'bg-gradient-to-r from-[#FF5A4E] to-[#F5A623] text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <CalendarDays className="h-3.5 w-3.5" aria-hidden="true" />
            <span>Calendario 5 nov – 4 dic</span>
          </button>
          <button
            type="button"
            onClick={() => setSubView('brand')}
            className={`inline-flex items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
              subView === 'brand'
                ? 'bg-gradient-to-r from-[#FF5A4E] to-[#F5A623] text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <BookMarked className="h-3.5 w-3.5" aria-hidden="true" />
            <span>Marca & Referencias</span>
          </button>
        </div>
      </div>

      {subView !== 'brand' && (
        <FiltersBar
          filters={filters}
          onChange={setFilters}
          matchedCount={filteredPieces.length}
          totalCount={workspace.pieces.length}
        />
      )}

      {subView === 'matrix' && (
        <FunnelMatrix
          pieces={filteredPieces}
          onClearFilters={() => setFilters(DEFAULT_FILTERS)}
        />
      )}
      {subView === 'calendar' && (
        <Calendar30DaysView
          pieces={filteredPieces}
          onClearFilters={() => setFilters(DEFAULT_FILTERS)}
        />
      )}
      {subView === 'brand' && <BrandBenchmarksDrawer />}
    </div>
  );
};
