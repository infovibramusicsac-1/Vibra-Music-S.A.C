import React from 'react';
import { Clapperboard, Compass, LayoutGrid } from 'lucide-react';
import type { RoleTab } from '../../../domain/value-objects';
import { useVibraServices } from '../../context/VibraServicesContext';

const ROLES: { id: RoleTab; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: 'coordinador', label: 'Coordinador', icon: Compass },
  { id: 'manager', label: 'Content Manager', icon: LayoutGrid },
  { id: 'creador', label: 'Creador', icon: Clapperboard },
];

export const FloatingBottomBar: React.FC = () => {
  const { activeRole, setActiveRole } = useVibraServices();

  return (
    <nav
      aria-label="Selector de rol"
      className="fixed bottom-[max(0.75rem,env(safe-area-inset-bottom))] left-1/2 z-40 -translate-x-1/2 px-3 w-full max-w-md sm:w-auto"
    >
      <div className="glass-panel-strong flex items-center justify-between sm:justify-center gap-1 rounded-full p-1.5 shadow-2xl">
        {ROLES.map((role) => {
          const Icon = role.icon;
          const isActive = activeRole === role.id;
          return (
            <button
              key={role.id}
              type="button"
              onClick={() => setActiveRole(role.id)}
              aria-current={isActive ? 'page' : undefined}
              className={`inline-flex flex-1 sm:flex-initial items-center justify-center gap-2 rounded-full px-4 py-2.5 min-h-[44px] text-xs sm:text-sm font-semibold transition-all duration-150 cursor-pointer whitespace-nowrap shrink-0 focus-visible:ring-2 focus-visible:ring-[#FF5A4E] focus-visible:ring-offset-2 ${
                isActive
                  ? 'bg-gradient-to-r from-[#FF5A4E] to-[#F5A623] text-white shadow-md shadow-[#FF5A4E]/25'
                  : 'text-slate-700 dark:text-slate-200 hover:text-slate-900 dark:hover:text-white hover:bg-slate-900/5 dark:hover:bg-white/8'
              }`}
            >
              <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
              <span>{role.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};
