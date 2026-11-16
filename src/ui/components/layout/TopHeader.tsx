import React from 'react';
import { Moon, Music2, Sun } from 'lucide-react';
import { useVibraServices } from '../../context/VibraServicesContext';

export const TopHeader: React.FC = () => {
  const { theme, toggleTheme, workspace } = useVibraServices();

  return (
    <header className="sticky top-0 z-30 border-b border-slate-900/8 dark:border-white/10 bg-white/75 dark:bg-[#0B1221]/80 backdrop-blur-xl">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-6 px-4 py-3 sm:px-6 lg:px-8">
        <div className="flex items-center gap-3 min-w-0">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[#FF5A4E] to-[#F5A623] text-white shadow-sm">
            <Music2 className="h-4 w-4" aria-hidden="true" />
          </div>
          <div className="min-w-0">
            <p className="font-display text-sm sm:text-base font-bold tracking-tight text-slate-900 dark:text-white whitespace-nowrap truncate">
              Vibra Marketing OS
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400 whitespace-nowrap truncate">
              {workspace.meta.phase} · 5 nov – 4 dic 2026
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <button
            type="button"
            onClick={toggleTheme}
            aria-label={
              theme === 'dark' ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'
            }
            className="inline-flex items-center gap-2 rounded-xl border border-slate-900/10 dark:border-white/12 bg-white/70 dark:bg-white/6 px-3.5 py-2 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-white dark:hover:bg-white/12 transition-colors cursor-pointer whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-[#FF5A4E]"
          >
            {theme === 'dark' ? (
              <>
                <Sun className="h-3.5 w-3.5 text-[#F5A623]" aria-hidden="true" />
                <span>Modo claro</span>
              </>
            ) : (
              <>
                <Moon className="h-3.5 w-3.5 text-[#FF5A4E]" aria-hidden="true" />
                <span>Modo oscuro</span>
              </>
            )}
          </button>
        </div>
      </div>
    </header>
  );
};
