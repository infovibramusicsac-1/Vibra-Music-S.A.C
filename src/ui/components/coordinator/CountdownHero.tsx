import React from 'react';
import { Calendar } from 'lucide-react';
import { useVibraServices } from '../../context/VibraServicesContext';

export const CountdownHero: React.FC = () => {
  const { workspace, metrics } = useVibraServices();
  const { meta } = workspace;

  return (
    <section
      aria-label="Meta de la fase"
      className="glass-panel relative overflow-hidden rounded-3xl p-6 sm:p-8"
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-16 -top-20 h-64 w-64 rounded-full bg-gradient-to-br from-[#FF5A4E]/25 via-[#F5A623]/20 to-transparent blur-3xl"
      />

      <div className="relative flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
        <div className="space-y-2 max-w-xl">
          <p className="text-xs font-semibold tracking-wide text-[#FF5A4E] dark:text-[#FF7A6E]">
            Meta de la fase · {meta.company}
          </p>
          <h2 className="font-display text-2xl sm:text-4xl font-extrabold tracking-tight text-slate-900 dark:text-white [text-wrap:balance]">
            Clase Piloto gratuita
          </h2>
          <p className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
            <Calendar className="h-4 w-4 text-[#F5A623] shrink-0" aria-hidden="true" />
            <span>Sábado 21 de noviembre · Estimulación Musical, 4 a 5 años (Semillas Vibra)</span>
          </p>
        </div>

        <div className="flex flex-wrap items-stretch gap-3 sm:gap-4">
          <div className="flex flex-col justify-center rounded-2xl border border-[#FF5A4E]/25 bg-gradient-to-br from-[#FF5A4E]/15 to-[#F5A623]/10 px-5 py-3.5 min-w-[130px]">
            <span className="font-mono-tabular text-3xl sm:text-4xl font-extrabold leading-none text-[#FF5A4E] dark:text-[#FF7A6E]">
              {metrics.daysToPilot}
            </span>
            <span className="mt-1 text-xs font-medium text-slate-700 dark:text-slate-200">
              días para el piloto
            </span>
          </div>

          <div className="flex flex-col justify-center rounded-2xl border border-slate-900/10 dark:border-white/12 bg-white/50 dark:bg-white/5 px-4 py-3.5 min-w-[128px]">
            <span className="font-mono-tabular text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">
              {meta.pilotGoals.attendees}
            </span>
            <span className="mt-0.5 text-xs text-slate-600 dark:text-slate-300">
              asistentes mínimo
            </span>
          </div>

          <div className="flex flex-col justify-center rounded-2xl border border-slate-900/10 dark:border-white/12 bg-white/50 dark:bg-white/5 px-4 py-3.5 min-w-[128px]">
            <span className="font-mono-tabular text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">
              {meta.pilotGoals.enrollments}
            </span>
            <span className="mt-0.5 text-xs text-slate-600 dark:text-slate-300">
              matrículas iniciales
            </span>
          </div>

          <div className="flex flex-col justify-center rounded-2xl border border-slate-900/10 dark:border-white/12 bg-white/50 dark:bg-white/5 px-4 py-3.5 min-w-[152px]">
            <span className="font-mono-tabular text-xl sm:text-2xl font-bold text-[#F5A623]">
              S/ {meta.adBudgetDailyPEN.toFixed(2)}
            </span>
            <span className="mt-0.5 text-xs text-slate-600 dark:text-slate-300">
              pauta diaria WhatsApp
            </span>
          </div>
        </div>
      </div>
    </section>
  );
};
