import type {
  FunnelStage,
  PillarName,
  ProductionStatus,
} from '../../domain/value-objects';

export const BRAND_COLORS = {
  coral: '#FF5A4E',
  amber: '#F5A623',
  navy: '#0B1221',
  navyElevated: '#111B33',
} as const;

export const PILLAR_BAR_COLORS: Record<PillarName, string> = {
  'Nueva Visión': 'bg-[#FF5A4E]',
  Tienda: 'bg-[#F5A623]',
  Festivo: 'bg-rose-400',
  Conversión: 'bg-emerald-500',
  Comunidad: 'bg-sky-400',
};

export const PILLAR_DOT_TEXT: Record<PillarName, string> = {
  'Nueva Visión': 'text-[#FF5A4E]',
  Tienda: 'text-[#F5A623]',
  Festivo: 'text-rose-500 dark:text-rose-400',
  Conversión: 'text-emerald-600 dark:text-emerald-400',
  Comunidad: 'text-sky-600 dark:text-sky-400',
};

export const STATUS_BAR_COLORS: Record<ProductionStatus, string> = {
  'Por grabar': 'bg-slate-400 dark:bg-slate-500',
  Grabado: 'bg-sky-500',
  'En edición': 'bg-[#F5A623]',
  Listo: 'bg-emerald-500',
};

export const STATUS_TEXT_COLORS: Record<ProductionStatus, string> = {
  'Por grabar': 'text-slate-600 dark:text-slate-300',
  Grabado: 'text-sky-600 dark:text-sky-400',
  'En edición': 'text-amber-600 dark:text-[#F5A623]',
  Listo: 'text-emerald-600 dark:text-emerald-400',
};

export const FUNNEL_META: Record<
  FunnelStage,
  { label: string; verb: string; accentClass: string; subtitle: string }
> = {
  TOFU: {
    label: 'Atraer (TOFU)',
    verb: 'Descubrimiento',
    accentClass: 'text-[#FF5A4E]',
    subtitle: 'Alcance emocional, juego y comunidad sin presión',
  },
  MOFU: {
    label: 'Confiar (MOFU)',
    verb: 'Consideración',
    accentClass: 'text-[#F5A623]',
    subtitle: 'Metodología, historia de escuela y asesoría humana',
  },
  BOFU: {
    label: 'Inscribir (BOFU)',
    verb: 'Conversión',
    accentClass: 'text-emerald-600 dark:text-emerald-400',
    subtitle: 'Clase Piloto 21 nov, Clase Demo y WhatsApp directo',
  },
};

export function formatShortDateEs(isoDate: string): string {
  const [, month, day] = isoDate.split('-');
  const monthName = month === '11' ? 'nov' : month === '12' ? 'dic' : month;
  return `${Number(day)} ${monthName}`;
}
