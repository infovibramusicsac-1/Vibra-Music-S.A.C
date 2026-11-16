import React, { useState } from 'react';
import { RotateCcw } from 'lucide-react';
import { useVibraServices } from '../../context/VibraServicesContext';
import { ApprovalQueue } from './ApprovalQueue';
import { CountdownHero } from './CountdownHero';
import { Mix6010Chart } from './Mix6010Chart';
import { PendingChecklist } from './PendingChecklist';
import { PhaseBalanceCard } from './PhaseBalanceCard';
import { ProductionSummaryCard } from './ProductionSummaryCard';

export const CoordinatorView: React.FC = () => {
  const { resetPlan, repositoryAdapterName } = useVibraServices();
  const [confirmOpen, setConfirmOpen] = useState(false);

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="font-display text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white [text-wrap:balance]">
          Panel de coordinación
        </h1>
        <p className="text-sm text-slate-600 dark:text-slate-300">
          Lo que necesitas ver y decidir hoy para la Fase 1 «Sembrar», en un solo lugar.
        </p>
      </div>

      <CountdownHero />

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3 items-stretch">
        <ProductionSummaryCard />
        <Mix6010Chart />
        <PhaseBalanceCard />
      </div>

      <ApprovalQueue />

      <PendingChecklist />

      <footer className="glass-panel rounded-2xl p-4 sm:px-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="text-xs text-slate-500 dark:text-slate-400">
          Persistencia activa: <span className="font-medium text-slate-700 dark:text-slate-200">{repositoryAdapterName}</span>
        </div>

        <button
          type="button"
          onClick={() => setConfirmOpen(true)}
          className="inline-flex items-center justify-center gap-2 rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-2 text-xs font-semibold text-rose-600 dark:text-rose-300 hover:bg-rose-500/20 transition-colors cursor-pointer whitespace-nowrap shrink-0"
        >
          <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
          <span>Restablecer datos del plan</span>
        </button>
      </footer>

      {confirmOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="reset-dialog-title"
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 p-4"
        >
          <div className="glass-panel-strong w-full max-w-md rounded-3xl p-6 space-y-4">
            <h4
              id="reset-dialog-title"
              className="font-display text-lg font-bold text-slate-900 dark:text-white"
            >
              ¿Restablecer datos del plan?
            </h4>
            <p className="text-sm text-slate-600 dark:text-slate-300">
              Se restaurarán las 30 piezas originales de Vibra Music (en estado «Por grabar») y los 15 pendientes críticos sin marcar. Tus cambios locales actuales se perderán.
            </p>
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setConfirmOpen(false)}
                className="rounded-xl border border-slate-900/10 dark:border-white/12 px-4 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-900/5 dark:hover:bg-white/8 transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => {
                  resetPlan();
                  setConfirmOpen(false);
                }}
                className="rounded-xl bg-[#FF5A4E] px-4 py-2 text-xs font-semibold text-white hover:bg-[#e84b40] transition-colors cursor-pointer"
              >
                Confirmar restablecimiento
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
