import React, { useState } from 'react';
import { BookOpen, Sparkles, Users } from 'lucide-react';
import { useVibraServices } from '../../context/VibraServicesContext';

export const BrandBenchmarksDrawer: React.FC = () => {
  const { workspace } = useVibraServices();
  const [section, setSection] = useState<'brand' | 'audiences' | 'benchmarks'>('brand');
  const [voiceFilter, setVoiceFilter] = useState<'Todos' | 'Sin voz' | 'Con voz'>('Todos');

  const filteredRefs = workspace.references
    .filter((ref) => {
      if (voiceFilter === 'Todos') return true;
      if (voiceFilter === 'Sin voz') return ref.note.startsWith('Sin voz');
      return ref.note.startsWith('Con voz');
    })
    .sort((a, b) => b.views - a.views);

  return (
    <section
      aria-label="Guía de marca, audiencias y referencias"
      className="glass-panel rounded-3xl p-5 sm:p-6 space-y-5"
    >
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-900/8 dark:border-white/10 pb-4">
        <div>
          <h3 className="font-display text-base font-bold text-slate-900 dark:text-white">
            Biblia de Marca, Audiencias & Benchmarks Hanan
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Criterios editoriales oficiales de {workspace.meta.company} y 18 referencias medidas
          </p>
        </div>

        <div className="flex items-center gap-1 rounded-xl bg-slate-900/6 dark:bg-white/6 p-1">
          <button
            type="button"
            onClick={() => setSection('brand')}
            className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors cursor-pointer whitespace-nowrap ${
              section === 'brand'
                ? 'bg-white dark:bg-[#111B33] text-slate-900 dark:text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-300'
            }`}
          >
            <BookOpen className="h-3.5 w-3.5" aria-hidden="true" />
            <span>Tono y Reglas</span>
          </button>
          <button
            type="button"
            onClick={() => setSection('audiences')}
            className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors cursor-pointer whitespace-nowrap ${
              section === 'audiences'
                ? 'bg-white dark:bg-[#111B33] text-slate-900 dark:text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-300'
            }`}
          >
            <Users className="h-3.5 w-3.5" aria-hidden="true" />
            <span>5 Audiencias</span>
          </button>
          <button
            type="button"
            onClick={() => setSection('benchmarks')}
            className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors cursor-pointer whitespace-nowrap ${
              section === 'benchmarks'
                ? 'bg-white dark:bg-[#111B33] text-slate-900 dark:text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-300'
            }`}
          >
            <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
            <span>18 Benchmarks</span>
          </button>
        </div>
      </div>

      {section === 'brand' && (
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
          <div className="space-y-3 rounded-2xl border border-slate-900/8 dark:border-white/10 bg-white/50 dark:bg-white/[0.03] p-4">
            <h4 className="font-display text-sm font-bold text-slate-900 dark:text-white">
              Tono de voz
            </h4>
            <p className="text-xs leading-relaxed text-slate-600 dark:text-slate-300">
              {workspace.brand.tone}
            </p>
            <div className="pt-2 border-t border-slate-900/6 dark:border-white/8">
              <p className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                Palabras que SÍ usamos
              </p>
              <p className="mt-1 text-xs leading-relaxed text-slate-700 dark:text-slate-200">
                {workspace.brand.say.join(' · ')}
              </p>
            </div>
          </div>

          <div className="space-y-3 rounded-2xl border border-slate-900/8 dark:border-white/10 bg-white/50 dark:bg-white/[0.03] p-4">
            <h4 className="font-display text-sm font-bold text-rose-600 dark:text-rose-400">
              Palabras prohibidas (Evitar)
            </h4>
            <ul className="space-y-1.5 text-xs text-slate-700 dark:text-slate-200">
              {workspace.brand.avoid.map((item) => (
                <li key={item} className="flex items-start gap-2">
                  <span className="text-rose-500 font-bold">×</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="space-y-3 rounded-2xl border border-slate-900/8 dark:border-white/10 bg-white/50 dark:bg-white/[0.03] p-4">
            <h4 className="font-display text-sm font-bold text-[#F5A623]">
              Reglas de oro Vibra
            </h4>
            <ul className="space-y-2 text-xs leading-relaxed text-slate-600 dark:text-slate-300">
              {workspace.brand.rules.map((rule) => (
                <li key={rule}>• {rule}</li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {section === 'audiences' && (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {workspace.audienceCategories.map((cat) => (
            <div
              key={cat.workingName}
              className="rounded-2xl border border-slate-900/8 dark:border-white/10 bg-white/55 dark:bg-white/[0.035] p-4 space-y-2"
            >
              <div className="flex items-baseline justify-between gap-2">
                <h4 className="font-display text-sm font-bold text-slate-900 dark:text-white">
                  {cat.workingName}
                </h4>
                <span className="font-mono-tabular text-xs font-semibold text-[#FF5A4E]">
                  {cat.ages} años
                </span>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Antes: {cat.legacyName}
              </p>
              <p className="text-xs text-slate-700 dark:text-slate-200">
                {cat.experience}
              </p>
              <p className="text-xs italic text-slate-600 dark:text-slate-300">
                {cat.parentHook}
              </p>
              <div className="pt-2 border-t border-slate-900/6 dark:border-white/8 text-[11px] text-slate-500 dark:text-slate-400 space-y-0.5">
                <p>Oferta: {cat.entryOffer}</p>
                <p className="font-medium text-amber-600 dark:text-[#F5A623]">
                  {cat.priorityNote}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}

      {section === 'benchmarks' && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-xs text-slate-600 dark:text-slate-300">
              Análisis comparativo de 18 piezas de referencia (Hanan), ordenadas por alcance.
            </p>
            <div className="flex items-center gap-1 rounded-xl bg-slate-900/6 dark:bg-white/6 p-1">
              {(['Todos', 'Sin voz', 'Con voz'] as const).map((v) => (
                <button
                  key={v}
                  type="button"
                  onClick={() => setVoiceFilter(v)}
                  className={`rounded-lg px-2.5 py-1 text-xs font-medium cursor-pointer ${
                    voiceFilter === v
                      ? 'bg-white dark:bg-[#111B33] text-slate-900 dark:text-white shadow-sm'
                      : 'text-slate-600 dark:text-slate-300'
                  }`}
                >
                  {v}
                </button>
              ))}
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-900/10 dark:border-white/10 text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                  <th className="py-2 pr-4">Pieza de referencia</th>
                  <th className="py-2 px-3">Concepto</th>
                  <th className="py-2 px-3 text-right">Vistas</th>
                  <th className="py-2 pl-3">Aprendizaje clave</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-900/6 dark:divide-white/8 text-xs">
                {filteredRefs.map((ref) => (
                  <tr key={ref.id} className="hover:bg-slate-900/[0.02] dark:hover:bg-white/[0.02]">
                    <td className="py-2.5 pr-4 font-medium text-slate-900 dark:text-white">
                      {ref.title}
                    </td>
                    <td className="py-2.5 px-3 text-slate-500 dark:text-slate-400 whitespace-nowrap">
                      {ref.conceptId}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono-tabular font-bold text-[#FF5A4E] dark:text-[#FF7A6E] whitespace-nowrap">
                      {ref.views.toLocaleString('es-PE')}
                    </td>
                    <td className="py-2.5 pl-3 text-slate-600 dark:text-slate-300">
                      {ref.note}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </section>
  );
};
