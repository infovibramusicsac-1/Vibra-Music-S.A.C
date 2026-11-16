import React, { useState } from 'react';
import { CheckSquare, Square } from 'lucide-react';
import { useVibraServices } from '../../context/VibraServicesContext';

export const PendingChecklist: React.FC = () => {
  const { workspace, metrics, toggleTask } = useVibraServices();
  const [ownerFilter, setOwnerFilter] = useState<'Todos' | 'Claudia' | 'Sergio'>('Todos');

  const filteredTasks = workspace.pendingTasks.filter((task) => {
    if (ownerFilter === 'Todos') return true;
    return task.owner.includes(ownerFilter);
  });

  const pct =
    metrics.tasksTotalCount > 0
      ? Math.round((metrics.tasksDoneCount / metrics.tasksTotalCount) * 100)
      : 0;

  return (
    <section
      aria-label="Pendientes críticos"
      className="glass-panel rounded-3xl p-5 sm:p-6 space-y-4"
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="space-y-1">
          <div className="flex items-baseline gap-3">
            <h3 className="font-display text-base font-bold text-slate-900 dark:text-white">
              Pendientes críticos
            </h3>
            <span className="font-mono-tabular text-xs font-medium text-slate-500 dark:text-slate-400">
              {metrics.tasksDoneCount} de {metrics.tasksTotalCount} resueltos ({pct}%)
            </span>
          </div>
          <div className="h-1.5 w-full max-w-xs overflow-hidden rounded-full bg-slate-900/8 dark:bg-white/10">
            <div
              style={{ width: `${pct}%` }}
              className="h-full rounded-full bg-gradient-to-r from-[#FF5A4E] to-[#F5A623] transition-all duration-300"
            />
          </div>
        </div>

        <div className="flex items-center gap-1 rounded-xl bg-slate-900/6 dark:bg-white/6 p-1 self-start sm:self-auto">
          {(['Todos', 'Claudia', 'Sergio'] as const).map((owner) => (
            <button
              key={owner}
              type="button"
              onClick={() => setOwnerFilter(owner)}
              className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                ownerFilter === owner
                  ? 'bg-white dark:bg-[#111B33] text-slate-900 dark:text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              {owner}
            </button>
          ))}
        </div>
      </div>

      <div className="divide-y divide-slate-900/8 dark:divide-white/8">
        {filteredTasks.map((task) => {
          const priorityColor =
            task.priority === 'Alta'
              ? 'text-[#FF5A4E] dark:text-[#FF7A6E]'
              : task.priority === 'Media'
                ? 'text-amber-600 dark:text-[#F5A623]'
                : 'text-slate-500 dark:text-slate-400';

          return (
            <button
              key={task.id}
              type="button"
              onClick={() => toggleTask(task.id)}
              className="flex w-full items-start gap-3.5 py-3.5 text-left hover:bg-slate-900/[0.02] dark:hover:bg-white/[0.03] rounded-xl px-2 -mx-2 transition-colors cursor-pointer"
            >
              <span className="mt-0.5 shrink-0 text-[#FF5A4E]">
                {task.done ? (
                  <CheckSquare className="h-5 w-5 text-emerald-500" aria-hidden="true" />
                ) : (
                  <Square className="h-5 w-5 text-slate-400 dark:text-slate-500" aria-hidden="true" />
                )}
              </span>

              <div className="min-w-0 flex-1 space-y-1">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <span
                    className={`text-sm font-semibold ${
                      task.done
                        ? 'line-through text-slate-400 dark:text-slate-500'
                        : 'text-slate-900 dark:text-white'
                    }`}
                  >
                    {task.id}. {task.topic}
                  </span>
                  <span className="text-xs whitespace-nowrap shrink-0">
                    <span className={`font-semibold ${priorityColor}`}>
                      Prioridad {task.priority}
                    </span>
                    <span className="text-slate-400 dark:text-slate-500"> · </span>
                    <span className="text-slate-600 dark:text-slate-300">
                      {task.owner}
                    </span>
                  </span>
                </div>

                <p
                  className={`text-xs leading-relaxed ${
                    task.done
                      ? 'text-slate-400 dark:text-slate-500'
                      : 'text-slate-600 dark:text-slate-300'
                  }`}
                >
                  {task.question}
                </p>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Por qué importa: {task.why}
                </p>
              </div>
            </button>
          );
        })}
      </div>
    </section>
  );
};
