import React from 'react';
import { PRODUCTION_STAGES } from '../../../domain/value-objects';
import { useVibraServices } from '../../context/VibraServicesContext';
import { STATUS_BAR_COLORS, STATUS_TEXT_COLORS } from '../../theme/tokens';

export const ProductionSummaryCard: React.FC = () => {
  const { metrics } = useVibraServices();
  const readyCount = metrics.byStatus['Listo'];
  const total = metrics.totalPieces || 1;

  return (
    <div className="glass-panel rounded-3xl p-5 sm:p-6 flex flex-col justify-between gap-5">
      <div className="flex items-baseline justify-between gap-3">
        <h3 className="font-display text-base font-bold text-slate-900 dark:text-white">
          Producción
        </h3>
        <span className="font-mono-tabular text-xs font-medium text-slate-600 dark:text-slate-300">
          {readyCount} de {metrics.totalPieces} listas
        </span>
      </div>

      <div className="space-y-4">
        <div
          className="flex h-3 w-full overflow-hidden rounded-full bg-slate-900/8 dark:bg-white/10"
          role="progressbar"
          aria-valuenow={readyCount}
          aria-valuemin={0}
          aria-valuemax={metrics.totalPieces}
          aria-label="Progreso de producción"
        >
          {PRODUCTION_STAGES.map((stage) => {
            const count = metrics.byStatus[stage];
            const widthPct = (count / total) * 100;
            if (widthPct <= 0) return null;
            return (
              <div
                key={stage}
                style={{ width: `${widthPct}%` }}
                className={`${STATUS_BAR_COLORS[stage]} transition-all duration-300`}
                title={`${stage}: ${count}`}
              />
            );
          })}
        </div>

        <div className="grid grid-cols-2 gap-x-4 gap-y-3 pt-1">
          {PRODUCTION_STAGES.map((stage) => (
            <div
              key={stage}
              className="flex items-center justify-between border-b border-slate-900/6 dark:border-white/8 pb-2"
            >
              <span className={`text-xs font-medium ${STATUS_TEXT_COLORS[stage]}`}>
                {stage}
              </span>
              <span className="font-mono-tabular text-sm font-bold text-slate-900 dark:text-white">
                {metrics.byStatus[stage]}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
