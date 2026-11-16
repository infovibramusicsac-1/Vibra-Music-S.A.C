import React, { useState } from 'react';
import { Check, Eye, X } from 'lucide-react';
import { useVibraServices } from '../../context/VibraServicesContext';
import { formatShortDateEs } from '../../theme/tokens';

export const ApprovalQueue: React.FC = () => {
  const { workspace, metrics, toggleApproval, openPieceEditor } =
    useVibraServices();
  const [scope, setScope] = useState<'listos' | 'todos'>('todos');

  const pendingPieces = workspace.pieces.filter((p) => {
    if (p.approved) return false;
    if (scope === 'listos') return p.status === 'Listo';
    return true;
  });

  const visiblePieces = pendingPieces.slice(0, 6);

  return (
    <section
      aria-label="Cola de aprobación"
      className="glass-panel rounded-3xl p-5 sm:p-6 space-y-4"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="font-display text-base font-bold text-slate-900 dark:text-white">
            Cola de aprobación
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            <span className="font-mono-tabular font-semibold text-slate-700 dark:text-slate-200">
              {metrics.approvedCount}
            </span>{' '}
            de {metrics.totalPieces} aprobadas por Claudia
          </p>
        </div>

        <div className="flex items-center gap-1 rounded-xl bg-slate-900/6 dark:bg-white/6 p-1">
          <button
            type="button"
            onClick={() => setScope('todos')}
            className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
              scope === 'todos'
                ? 'bg-white dark:bg-[#111B33] text-slate-900 dark:text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            Pendientes ({workspace.pieces.filter((p) => !p.approved).length})
          </button>
          <button
            type="button"
            onClick={() => setScope('listos')}
            className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
              scope === 'listos'
                ? 'bg-white dark:bg-[#111B33] text-slate-900 dark:text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            En Listo ({metrics.readyPendingApprovalCount})
          </button>
        </div>
      </div>

      {visiblePieces.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-900/12 dark:border-white/12 px-4 py-6 text-center text-xs text-slate-500 dark:text-slate-400">
          {scope === 'listos'
            ? 'Cuando el creador marque piezas como Listo, aparecerán aquí para aprobación final.'
            : 'Todas las piezas del plan están aprobadas.'}
        </div>
      ) : (
        <div className="divide-y divide-slate-900/8 dark:divide-white/8">
          {visiblePieces.map((piece) => (
            <div
              key={piece.id}
              className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 py-3 first:pt-1 last:pb-1"
            >
              <button
                type="button"
                onClick={() => openPieceEditor(piece.id)}
                className="text-left min-w-0 flex-1 group cursor-pointer"
              >
                <p className="text-sm font-semibold text-slate-900 dark:text-white group-hover:text-[#FF5A4E] transition-colors truncate">
                  {piece.hook}
                </p>
                <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400 truncate">
                  {formatShortDateEs(piece.date)} · {piece.pillar} · {piece.funnelStage} · {piece.status}
                </p>
              </button>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => openPieceEditor(piece.id)}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-slate-900/10 dark:border-white/12 px-3 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-900/5 dark:hover:bg-white/8 transition-colors cursor-pointer whitespace-nowrap"
                >
                  <Eye className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>Revisar</span>
                </button>
                <button
                  type="button"
                  onClick={() => toggleApproval(piece.id, true)}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-500/15 border border-emerald-500/30 px-3 py-1.5 text-xs font-semibold text-emerald-700 dark:text-emerald-300 hover:bg-emerald-500/25 transition-colors cursor-pointer whitespace-nowrap"
                >
                  <Check className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>Aprobar</span>
                </button>
                <button
                  type="button"
                  onClick={() => toggleApproval(piece.id, false)}
                  aria-label={`Mantener pendiente ${piece.hook}`}
                  className="inline-flex items-center justify-center rounded-xl border border-slate-900/10 dark:border-white/10 p-1.5 text-slate-400 hover:text-rose-500 hover:border-rose-500/30 transition-colors cursor-pointer"
                  title="Rechazar / Dejar pendiente"
                >
                  <X className="h-3.5 w-3.5" aria-hidden="true" />
                </button>
              </div>
            </div>
          ))}
          {pendingPieces.length > 6 && (
            <p className="pt-3 text-xs text-slate-500 dark:text-slate-400">
              +{pendingPieces.length - 6} piezas más pendientes de revisión en Content Manager.
            </p>
          )}
        </div>
      )}
    </section>
  );
};
