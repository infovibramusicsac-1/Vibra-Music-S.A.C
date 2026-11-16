import React from 'react';
import type { ContentPiece } from '../../../domain/entities';
import type { FunnelStage } from '../../../domain/value-objects';
import { useVibraServices } from '../../context/VibraServicesContext';
import {
  FUNNEL_META,
  PILLAR_DOT_TEXT,
  STATUS_TEXT_COLORS,
  formatShortDateEs,
} from '../../theme/tokens';

interface FunnelMatrixProps {
  pieces: ContentPiece[];
  onClearFilters?: () => void;
}

const STAGES: FunnelStage[] = ['TOFU', 'MOFU', 'BOFU'];

export const FunnelMatrix: React.FC<FunnelMatrixProps> = ({
  pieces,
  onClearFilters,
}) => {
  const { openPieceEditor } = useVibraServices();

  return (
    <div className="grid grid-cols-1 gap-5 lg:grid-cols-3 items-start">
      {STAGES.map((stage) => {
        const meta = FUNNEL_META[stage];
        const stagePieces = pieces.filter((p) => p.funnelStage === stage);

        return (
          <section
            key={stage}
            aria-label={meta.label}
            className="glass-panel rounded-3xl p-4 sm:p-5 space-y-4"
          >
            <header className="flex items-start justify-between gap-3 border-b border-slate-900/8 dark:border-white/10 pb-3">
              <div>
                <h3 className={`font-display text-base font-bold ${meta.accentClass}`}>
                  {meta.label}
                </h3>
                <p className="mt-0.5 text-xs text-slate-600 dark:text-slate-300">
                  {meta.subtitle}
                </p>
              </div>
              <span className="font-mono-tabular text-sm font-bold text-slate-700 dark:text-slate-200 shrink-0">
                {stagePieces.length}
              </span>
            </header>

            {stagePieces.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-900/12 dark:border-white/12 px-4 py-8 text-center space-y-2.5">
                <p className="text-xs text-slate-600 dark:text-slate-300">
                  Sin piezas en {stage} con los filtros activos.
                </p>
                {onClearFilters && pieces.length === 0 && (
                  <button
                    type="button"
                    onClick={onClearFilters}
                    className="rounded-lg border border-[#FF5A4E]/40 bg-[#FF5A4E]/10 px-3 py-1.5 text-xs font-semibold text-[#FF5A4E] dark:text-[#FF7A6E] hover:bg-[#FF5A4E]/20 cursor-pointer"
                  >
                    Restablecer filtros
                  </button>
                )}
              </div>
            ) : (
              <div className="space-y-3">
                {stagePieces.map((piece) => (
                  <button
                    key={piece.id}
                    type="button"
                    onClick={() => openPieceEditor(piece.id)}
                    className="w-full text-left rounded-2xl border border-slate-900/8 dark:border-white/10 bg-white/65 dark:bg-white/[0.04] p-4 hover:border-[#FF5A4E]/45 hover:bg-white/90 dark:hover:bg-white/[0.08] transition-all duration-150 cursor-pointer space-y-2 focus-visible:outline-2 focus-visible:outline-[#FF5A4E]"
                  >
                    <div className="flex items-center justify-between gap-2 text-[11px] text-slate-500 dark:text-slate-400">
                      <span className="font-mono-tabular font-semibold text-slate-700 dark:text-slate-200">
                        {formatShortDateEs(piece.date)}
                      </span>
                      <span className={`font-semibold ${PILLAR_DOT_TEXT[piece.pillar]}`}>
                        {piece.pillar}
                      </span>
                    </div>

                    <p className="font-display text-sm font-bold leading-snug text-slate-900 dark:text-white">
                      {piece.hook}
                    </p>

                    <p className="text-xs text-slate-600 dark:text-slate-300 line-clamp-2">
                      {piece.script}
                    </p>

                    <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-slate-900/6 dark:border-white/8 text-[11px]">
                      <span className="text-slate-500 dark:text-slate-400 truncate">
                        {piece.concept} · {piece.mediaType} · {piece.voice}
                        {piece.targetsStimulation ? ' · Semillas 4–5' : ''}
                      </span>

                      <span className="whitespace-nowrap shrink-0 font-medium">
                        <span className={STATUS_TEXT_COLORS[piece.status]}>
                          {piece.status}
                        </span>
                        <span className="text-slate-400"> · </span>
                        <span
                          className={
                            piece.approved
                              ? 'text-emerald-600 dark:text-emerald-400'
                              : 'text-slate-400 dark:text-slate-500'
                          }
                        >
                          {piece.approved ? 'Aprobada' : 'Sin aprobar'}
                        </span>
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </section>
        );
      })}
    </div>
  );
};
