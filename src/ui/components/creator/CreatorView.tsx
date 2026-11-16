import React, { useState } from 'react';
import { Layers, Wand2 } from 'lucide-react';
import type { VoiceType } from '../../../domain/value-objects';
import { useVibraServices } from '../../context/VibraServicesContext';
import { BatchRenderModal } from './BatchRenderModal';
import { KanbanBoard } from './KanbanBoard';
import { PromptToPostModal } from './PromptToPostModal';

export const CreatorView: React.FC = () => {
  const { workspace, metrics } = useVibraServices();
  const [voiceFilter, setVoiceFilter] = useState<'Todas' | VoiceType>('Todas');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [batchOpen, setBatchOpen] = useState(false);
  const [promptModalOpen, setPromptModalOpen] = useState(false);

  const visiblePieces = workspace.pieces.filter((piece) => {
    if (voiceFilter === 'Todas') return true;
    return piece.voice === voiceFilter;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4">
        <div className="space-y-1">
          <h1 className="font-display text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white [text-wrap:balance]">
            Creador + Short Video Factory
          </h1>
          <p className="text-sm text-slate-600 dark:text-slate-300">
            Crea un Reel desde prompt con kinetic &amp; SFX, marca varias tarjetas para moverlas en lote o toca «Estudio 9:16» para editar Remotion.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="inline-flex items-center gap-1 rounded-xl border border-slate-900/10 dark:border-white/12 bg-white/70 dark:bg-white/6 p-1">
            {(['Todas', 'Sin voz', 'Con voz'] as const).map((v) => (
              <button
                key={v}
                type="button"
                onClick={() => setVoiceFilter(v)}
                className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap ${
                  voiceFilter === v
                    ? 'bg-white dark:bg-[#111B33] text-slate-900 dark:text-white shadow-sm'
                    : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                {v === 'Todas'
                  ? `Todas (${metrics.totalPieces})`
                  : v === 'Sin voz'
                    ? `Sin voz (${metrics.sinVozCount})`
                    : `Con voz (${metrics.conVozCount})`}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={() => setPromptModalOpen(true)}
            className="inline-flex items-center gap-2 rounded-xl border border-[#F4A048]/45 bg-[#F4A048]/12 px-4 py-2.5 text-xs font-bold text-[#C86D14] dark:text-[#F4A048] hover:bg-[#F4A048]/20 transition-colors cursor-pointer whitespace-nowrap shrink-0"
          >
            <Wand2 className="h-4 w-4" aria-hidden="true" />
            <span>Crear desde Prompt</span>
          </button>

          <button
            type="button"
            onClick={() => setBatchOpen(true)}
            className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#FF5A4E] to-[#F5A623] px-4 py-2.5 text-xs font-bold text-white shadow-md shadow-[#FF5A4E]/25 hover:opacity-95 transition-opacity cursor-pointer whitespace-nowrap shrink-0"
          >
            <Layers className="h-4 w-4" aria-hidden="true" />
            <span>
              {selectedIds.length > 0
                ? `Fábrica en Lote (${selectedIds.length})`
                : 'Fábrica en Lote (Batch Render)'}
            </span>
          </button>
        </div>
      </div>

      <KanbanBoard
        pieces={visiblePieces}
        selectedIds={selectedIds}
        onSelectedIdsChange={setSelectedIds}
        onOpenBatchWithSelection={() => setBatchOpen(true)}
      />

      <BatchRenderModal
        open={batchOpen}
        onClose={() => setBatchOpen(false)}
        initialSelectedIds={selectedIds.length > 0 ? selectedIds : undefined}
      />

      <PromptToPostModal
        open={promptModalOpen}
        onClose={() => setPromptModalOpen(false)}
      />
    </div>
  );
};
