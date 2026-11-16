import React from 'react';
import { Calendar, RotateCcw } from 'lucide-react';
import type { ContentPiece } from '../../../domain/entities';
import { useVibraServices } from '../../context/VibraServicesContext';
import { PILLAR_DOT_TEXT, STATUS_TEXT_COLORS } from '../../theme/tokens';

interface Calendar30DaysViewProps {
  pieces: ContentPiece[];
  onClearFilters?: () => void;
}

const WEEKDAY_HEADERS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];

function buildDateRange(): string[] {
  const dates: string[] = [];
  const start = new Date('2026-11-05T12:00:00');
  for (let i = 0; i < 30; i += 1) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    dates.push(`${yyyy}-${mm}-${dd}`);
  }
  return dates;
}

function formatAgendaDate(iso: string): { dayNum: number; monthLabel: string; weekdayShort: string } {
  const d = new Date(`${iso}T12:00:00`);
  const weekdays = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
  const [, month, day] = iso.split('-');
  return {
    dayNum: Number(day),
    monthLabel: month === '11' ? 'nov' : 'dic',
    weekdayShort: weekdays[d.getDay()] ?? '',
  };
}

export const Calendar30DaysView: React.FC<Calendar30DaysViewProps> = ({
  pieces,
  onClearFilters,
}) => {
  const { workspace, openPieceEditor } = useVibraServices();
  const dates = buildDateRange();
  const leadingEmptyCells = 3; // 2026-11-05 is Thursday
  const pilotDate = workspace.meta.pilotClassDate;

  const piecesByDate = new Map<string, ContentPiece[]>();
  for (const p of pieces) {
    const existing = piecesByDate.get(p.date) ?? [];
    existing.push(p);
    piecesByDate.set(p.date, existing);
  }

  return (
    <section
      aria-label="Calendario de 30 días"
      className="glass-panel rounded-3xl p-4 sm:p-6 space-y-4"
    >
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <div>
          <h3 className="font-display text-base font-bold text-slate-900 dark:text-white">
            Calendario Fase 1 «Sembrar»
          </h3>
          <p className="text-xs text-slate-600 dark:text-slate-300">
            5 de noviembre – 4 de diciembre 2026 · Toca cualquier pieza para abrir el Estudio 9:16
          </p>
        </div>
        <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#FF5A4E] dark:text-[#FF7A6E]">
          <Calendar className="h-3.5 w-3.5" aria-hidden="true" />
          <span>21 nov: Clase Piloto gratuita</span>
        </span>
      </div>

      {pieces.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-900/15 dark:border-white/15 px-4 py-10 text-center space-y-3">
          <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">
            Ninguna pieza coincide con los filtros actuales
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Ajusta tus criterios o restablece los filtros para volver a ver los 30 días del calendario.
          </p>
          {onClearFilters && (
            <button
              type="button"
              onClick={onClearFilters}
              className="inline-flex items-center gap-1.5 rounded-xl bg-[#FF5A4E] px-4 py-2 text-xs font-bold text-white hover:opacity-95 cursor-pointer"
            >
              <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Limpiar filtros</span>
            </button>
          )}
        </div>
      ) : (
        <>
          {/* Mobile (< 768px): Vertical Agenda List */}
          <div className="md:hidden space-y-2.5">
            {dates.map((iso) => {
              const { dayNum, monthLabel, weekdayShort } = formatAgendaDate(iso);
              const isPilot = iso === pilotDate;
              const dayPieces = piecesByDate.get(iso) ?? [];

              if (dayPieces.length === 0 && !isPilot) return null;

              return (
                <div
                  key={iso}
                  className={`rounded-2xl border p-3.5 space-y-2 ${
                    isPilot
                      ? 'border-[#FF5A4E]/60 bg-gradient-to-br from-[#FF5A4E]/15 via-[#F5A623]/10 to-transparent'
                      : 'border-slate-900/10 dark:border-white/12 bg-white/60 dark:bg-white/[0.04]'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span
                      className={`font-mono-tabular text-xs font-bold ${
                        isPilot
                          ? 'text-[#FF5A4E] dark:text-[#FF7A6E]'
                          : 'text-slate-800 dark:text-slate-100'
                      }`}
                    >
                      {weekdayShort} {dayNum} {monthLabel}
                    </span>
                    {isPilot && (
                      <span className="text-[11px] font-bold text-[#F5A623] uppercase tracking-wide">
                        Clase Piloto
                      </span>
                    )}
                  </div>

                  {dayPieces.map((piece) => (
                    <button
                      key={piece.id}
                      type="button"
                      onClick={() => openPieceEditor(piece.id)}
                      className="w-full text-left rounded-xl border border-slate-900/8 dark:border-white/10 bg-white/85 dark:bg-[#111B33] p-3 space-y-1 cursor-pointer hover:border-[#FF5A4E]/50"
                    >
                      <p className="font-display text-sm font-bold text-slate-900 dark:text-white leading-snug">
                        {piece.hook}
                      </p>
                      <p className="text-xs text-slate-600 dark:text-slate-300">
                        <span className={PILLAR_DOT_TEXT[piece.pillar]}>
                          {piece.funnelStage} · {piece.pillar}
                        </span>
                        {' · '}
                        {piece.voice}
                        {' · '}
                        <span className={STATUS_TEXT_COLORS[piece.status]}>
                          {piece.status}
                        </span>
                      </p>
                    </button>
                  ))}
                </div>
              );
            })}
          </div>

          {/* Desktop / Tablet (>= 768px): 7-Column Grid */}
          <div className="hidden md:block overflow-x-auto pb-2">
            <div className="min-w-[740px] space-y-2">
              <div className="grid grid-cols-7 gap-2 text-center text-xs font-semibold text-slate-500 dark:text-slate-400">
                {WEEKDAY_HEADERS.map((day) => (
                  <div key={day} className="py-1">
                    {day}
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-7 gap-2.5">
                {Array.from({ length: leadingEmptyCells }).map((_, idx) => (
                  <div
                    key={`empty-${idx}`}
                    className="min-h-[124px] rounded-2xl border border-dashed border-slate-900/6 dark:border-white/6 bg-slate-900/[0.015] dark:bg-white/[0.015]"
                  />
                ))}

                {dates.map((iso) => {
                  const [, month, day] = iso.split('-');
                  const dayNum = Number(day);
                  const monthLabel = month === '11' ? 'nov' : 'dic';
                  const isPilot = iso === pilotDate;
                  const dayPieces = piecesByDate.get(iso) ?? [];

                  return (
                    <div
                      key={iso}
                      className={`min-h-[124px] rounded-2xl border p-2.5 flex flex-col justify-between gap-2 transition-colors ${
                        isPilot
                          ? 'border-[#FF5A4E]/60 bg-gradient-to-br from-[#FF5A4E]/15 via-[#F5A623]/10 to-transparent shadow-md shadow-[#FF5A4E]/10'
                          : 'border-slate-900/8 dark:border-white/10 bg-white/55 dark:bg-white/[0.035]'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-1">
                        <span
                          className={`font-mono-tabular text-xs font-bold ${
                            isPilot
                              ? 'text-[#FF5A4E] dark:text-[#FF7A6E]'
                              : 'text-slate-700 dark:text-slate-200'
                          }`}
                        >
                          {dayNum} {monthLabel}
                        </span>
                        {isPilot && (
                          <span className="text-[10px] font-bold text-[#F5A623] uppercase tracking-wide">
                            Piloto
                          </span>
                        )}
                      </div>

                      {dayPieces.length === 0 ? (
                        <span className="text-[11px] text-slate-400 dark:text-slate-500">
                          Sin coincidencia
                        </span>
                      ) : (
                        <div className="space-y-1.5">
                          {dayPieces.map((piece) => (
                            <button
                              key={piece.id}
                              type="button"
                              onClick={() => openPieceEditor(piece.id)}
                              className="w-full text-left rounded-xl border border-slate-900/8 dark:border-white/10 bg-white/85 dark:bg-[#111B33] p-2 hover:border-[#FF5A4E]/50 transition-colors cursor-pointer space-y-1"
                            >
                              <p className="text-[11px] font-semibold leading-tight text-slate-900 dark:text-white line-clamp-2">
                                {piece.hook}
                              </p>
                              <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate">
                                <span className={PILLAR_DOT_TEXT[piece.pillar]}>
                                  {piece.funnelStage}
                                </span>
                                {' · '}
                                {piece.voice === 'Con voz' ? 'Voz' : 'Sin voz'}
                                {' · '}
                                <span className={STATUS_TEXT_COLORS[piece.status]}>
                                  {piece.status}
                                </span>
                              </p>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </>
      )}
    </section>
  );
};
