import React from 'react';
import { useVibraServices } from '../../context/VibraServicesContext';

export const PhaseBalanceCard: React.FC = () => {
  const { metrics } = useVibraServices();

  const rows = [
    {
      label: 'Dirigidas a Estimulación (4–5)',
      current: metrics.stimulationCount,
      target: metrics.stimulationTarget,
      suffix: 'mínimo',
      barClass: 'bg-[#FF5A4E]',
      textClass: 'text-[#FF5A4E] dark:text-[#FF7A6E]',
    },
    {
      label: 'Sin voz (música + texto)',
      current: metrics.sinVozCount,
      target: metrics.sinVozTarget,
      suffix: 'meta 70%',
      barClass: 'bg-[#F5A623]',
      textClass: 'text-amber-600 dark:text-[#F5A623]',
    },
    {
      label: 'Con voz (a cámara / TTS)',
      current: metrics.conVozCount,
      target: metrics.conVozTarget,
      suffix: 'meta 30%',
      barClass: 'bg-emerald-500',
      textClass: 'text-emerald-600 dark:text-emerald-400',
    },
  ];

  return (
    <div className="glass-panel rounded-3xl p-5 sm:p-6 flex flex-col gap-4">
      <div className="flex items-baseline justify-between gap-3">
        <h3 className="font-display text-base font-bold text-slate-900 dark:text-white">
          Equilibrio de la fase
        </h3>
        <span className="text-xs text-slate-500 dark:text-slate-400">
          Objetivos vs. plan
        </span>
      </div>

      <div className="space-y-4 pt-1">
        {rows.map((row) => {
          const pct = Math.min(
            100,
            row.target > 0 ? Math.round((row.current / row.target) * 100) : 0
          );
          return (
            <div key={row.label} className="space-y-1.5">
              <div className="flex items-baseline justify-between gap-2 text-xs">
                <span className={`font-semibold ${row.textClass}`}>
                  {row.label}
                </span>
                <span className="font-mono-tabular text-slate-700 dark:text-slate-200 whitespace-nowrap shrink-0">
                  {row.current} de {row.target} ({row.suffix})
                </span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-slate-900/8 dark:bg-white/10">
                <div
                  style={{ width: `${pct}%` }}
                  className={`h-full rounded-full ${row.barClass} transition-all duration-300`}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
