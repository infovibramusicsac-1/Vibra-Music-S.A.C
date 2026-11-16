import React from 'react';
import { useVibraServices } from '../../context/VibraServicesContext';
import { PILLAR_BAR_COLORS, PILLAR_DOT_TEXT } from '../../theme/tokens';

export const Mix6010Chart: React.FC = () => {
  const { metrics } = useVibraServices();

  return (
    <div className="glass-panel rounded-3xl p-5 sm:p-6 flex flex-col gap-4">
      <div className="flex items-baseline justify-between gap-3">
        <h3 className="font-display text-base font-bold text-slate-900 dark:text-white">
          Mix de contenido
        </h3>
        <span className="font-mono-tabular text-xs font-medium text-slate-500 dark:text-slate-400">
          60 · 10 · 10 · 10 · 10
        </span>
      </div>

      <div className="space-y-3">
        {metrics.pillarMix.map((pillar) => {
          const pct = Math.min(
            100,
            pillar.targetPieces > 0
              ? Math.round((pillar.count / pillar.targetPieces) * 100)
              : 0
          );
          return (
            <div key={pillar.name} className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className={`font-semibold ${PILLAR_DOT_TEXT[pillar.name]}`}>
                  {pillar.name}
                </span>
                <span className="font-mono-tabular text-slate-700 dark:text-slate-200">
                  {pillar.count} de {pillar.targetPieces} · {pillar.actualPct}%
                </span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-slate-900/8 dark:bg-white/10">
                <div
                  style={{ width: `${pct}%` }}
                  className={`h-full rounded-full ${PILLAR_BAR_COLORS[pillar.name]} transition-all duration-300`}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
