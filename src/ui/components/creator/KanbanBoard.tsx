import React, { useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  CheckSquare,
  ChevronDown,
  ChevronUp,
  Clapperboard,
  Layers,
  Square,
  X,
} from 'lucide-react';
import type { ContentPiece } from '../../../domain/entities';
import {
  PRODUCTION_STAGES,
  type ProductionStatus,
} from '../../../domain/value-objects';
import { useVibraServices } from '../../context/VibraServicesContext';
import {
  PILLAR_DOT_TEXT,
  STATUS_BAR_COLORS,
  STATUS_TEXT_COLORS,
  formatShortDateEs,
} from '../../theme/tokens';

interface KanbanBoardProps {
  pieces: ContentPiece[];
  selectedIds: string[];
  onSelectedIdsChange: (next: string[]) => void;
  onOpenBatchWithSelection: () => void;
}

export const KanbanBoard: React.FC<KanbanBoardProps> = ({
  pieces,
  selectedIds,
  onSelectedIdsChange,
  onOpenBatchWithSelection,
}) => {
  const {
    moveStage,
    moveManyToStage,
    advanceStage,
    regressStage,
    openPieceEditor,
    savePiece,
  } = useVibraServices();
  const [dragOverStage, setDragOverStage] =
    useState<ProductionStatus | null>(null);
  const [draggingIds, setDraggingIds] = useState<string[]>([]);
  const [mobileStage, setMobileStage] =
    useState<ProductionStatus>('Por grabar');
  const [expandedScenes, setExpandedScenes] = useState<Record<string, boolean>>(
    {}
  );

  const selectedSet = new Set(selectedIds);

  const toggleSelectPiece = (pieceId: string) => {
    if (selectedSet.has(pieceId)) {
      onSelectedIdsChange(selectedIds.filter((id) => id !== pieceId));
    } else {
      onSelectedIdsChange([...selectedIds, pieceId]);
    }
  };

  const toggleSelectColumn = (columnPieces: ContentPiece[]) => {
    const colIds = columnPieces.map((p) => p.id);
    if (colIds.length === 0) return;
    const allSelected = colIds.every((id) => selectedSet.has(id));
    if (allSelected) {
      const colSet = new Set(colIds);
      onSelectedIdsChange(selectedIds.filter((id) => !colSet.has(id)));
    } else {
      const merged = new Set([...selectedIds, ...colIds]);
      onSelectedIdsChange(Array.from(merged));
    }
  };

  const handleBulkMove = (targetStage: ProductionStatus) => {
    if (selectedIds.length === 0) return;
    moveManyToStage(selectedIds, targetStage);
    onSelectedIdsChange([]);
  };

  const toggleScenesExpand = (pieceId: string) => {
    setExpandedScenes((prev) => ({ ...prev, [pieceId]: !prev[pieceId] }));
  };

  const toggleSceneCheck = (piece: ContentPiece, sceneIndex: number) => {
    const exists = piece.checkedScenes.includes(sceneIndex);
    const nextChecked = exists
      ? piece.checkedScenes.filter((i) => i !== sceneIndex)
      : [...piece.checkedScenes, sceneIndex];
    savePiece({ ...piece, checkedScenes: nextChecked });
  };

  const renderColumn = (
    stage: ProductionStatus,
    stageIdx: number,
    isMobileView: boolean
  ) => {
    const columnPieces = pieces.filter((p) => p.status === stage);
    const isFirstStage = stageIdx === 0;
    const isLastStage = stageIdx === PRODUCTION_STAGES.length - 1;
    const isDropTarget = !isMobileView && dragOverStage === stage;
    const allColSelected =
      columnPieces.length > 0 &&
      columnPieces.every((p) => selectedSet.has(p.id));

    return (
      <section
        key={stage}
        aria-label={`Columna ${stage}`}
        onDragOver={
          isMobileView
            ? undefined
            : (e) => {
                e.preventDefault();
                e.dataTransfer.dropEffect = 'move';
                if (dragOverStage !== stage) {
                  setDragOverStage(stage);
                }
              }
        }
        onDragLeave={
          isMobileView
            ? undefined
            : (e) => {
                const related = e.relatedTarget as Node | null;
                if (!e.currentTarget.contains(related)) {
                  setDragOverStage((prev) => (prev === stage ? null : prev));
                }
              }
        }
        onDrop={
          isMobileView
            ? undefined
            : (e) => {
                e.preventDefault();
                setDragOverStage(null);
                setDraggingIds([]);

                const multiPayload = e.dataTransfer.getData(
                  'application/x-vibra-pieces'
                );
                if (multiPayload) {
                  try {
                    const parsed = JSON.parse(multiPayload) as string[];
                    if (Array.isArray(parsed) && parsed.length > 0) {
                      moveManyToStage(parsed, stage);
                      onSelectedIdsChange([]);
                      return;
                    }
                  } catch {
                    // fall back to single pieceId
                  }
                }

                const pieceId = e.dataTransfer.getData('text/plain');
                if (pieceId) {
                  moveStage(pieceId, stage);
                }
              }
        }
        className={`glass-panel rounded-3xl p-4 space-y-3 min-h-[260px] transition-all duration-150 ${
          isDropTarget
            ? 'ring-2 ring-[#FF5A4E] bg-[#FF5A4E]/[0.08]'
            : ''
        }`}
      >
        <header className="flex items-center justify-between gap-2 pb-2 border-b border-slate-900/8 dark:border-white/10">
          <div className="flex items-center gap-2 min-w-0">
            <span
              className={`h-2.5 w-2.5 rounded-full shrink-0 ${STATUS_BAR_COLORS[stage]}`}
              aria-hidden="true"
            />
            <h3
              className={`font-display text-sm font-bold truncate ${STATUS_TEXT_COLORS[stage]}`}
            >
              {stage}
            </h3>
            <span className="font-mono-tabular text-xs font-bold text-slate-600 dark:text-slate-300">
              {columnPieces.length}
            </span>
          </div>

          {columnPieces.length > 0 && (
            <button
              type="button"
              onClick={() => toggleSelectColumn(columnPieces)}
              className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[10px] font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-900/6 dark:hover:bg-white/10 cursor-pointer shrink-0"
              title={
                allColSelected
                  ? `Deseleccionar columna ${stage}`
                  : `Seleccionar toda la columna ${stage}`
              }
            >
              {allColSelected ? (
                <CheckSquare className="h-3 w-3 text-[#FF5A4E]" />
              ) : (
                <Square className="h-3 w-3" />
              )}
              <span>{allColSelected ? 'Quitar' : 'Selec.'}</span>
            </button>
          )}
        </header>

        {isDropTarget && draggingIds.length > 0 && (
          <div className="rounded-xl border border-dashed border-[#FF5A4E] bg-[#FF5A4E]/12 px-3 py-2 text-center text-[11px] font-bold text-[#FF5A4E] dark:text-[#FF7A6E] pointer-events-none">
            Soltar {draggingIds.length}{' '}
            {draggingIds.length === 1 ? 'pieza' : 'piezas'} en «{stage}»
          </div>
        )}

        {columnPieces.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-900/12 dark:border-white/12 px-3 py-8 text-center text-xs text-slate-500 dark:text-slate-400">
            {isMobileView
              ? `No hay piezas en «${stage}». Usa la barra masiva o Avanzar.`
              : 'Arrastra una o varias piezas aquí'}
          </div>
        ) : (
          <div className="space-y-3">
            {columnPieces.map((piece) => {
              const isExpanded = Boolean(expandedScenes[piece.id]);
              const scenesCount = piece.scenesToRecord.length;
              const checkedCount = piece.checkedScenes.length;
              const isSelected = selectedSet.has(piece.id);

              return (
                <article
                  key={piece.id}
                  draggable={!isMobileView}
                  onDragStart={
                    isMobileView
                      ? undefined
                      : (e) => {
                          const idsToDrag =
                            isSelected && selectedIds.length > 1
                              ? selectedIds
                              : [piece.id];
                          setDraggingIds(idsToDrag);
                          e.dataTransfer.effectAllowed = 'move';
                          e.dataTransfer.setData('text/plain', piece.id);
                          e.dataTransfer.setData(
                            'application/x-vibra-pieces',
                            JSON.stringify(idsToDrag)
                          );
                        }
                  }
                  onDragEnd={
                    isMobileView
                      ? undefined
                      : () => {
                          setDragOverStage(null);
                          setDraggingIds([]);
                        }
                  }
                  className={`rounded-2xl border p-3.5 transition-colors space-y-2.5 md:cursor-grab md:active:cursor-grabbing ${
                    isSelected
                      ? 'border-[#FF5A4E] bg-[#FF5A4E]/[0.09] dark:bg-[#FF5A4E]/[0.12]'
                      : 'border-slate-900/8 dark:border-white/10 bg-white/80 dark:bg-white/[0.05] hover:border-[#FF5A4E]/45'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2 text-[11px] text-slate-600 dark:text-slate-300">
                    <label className="inline-flex items-center gap-2 cursor-pointer min-w-0">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        aria-label={`Seleccionar ${piece.hook}`}
                        onChange={() => toggleSelectPiece(piece.id)}
                        className="h-3.5 w-3.5 accent-[#FF5A4E] cursor-pointer shrink-0"
                      />
                      <span className="font-mono-tabular font-semibold text-slate-800 dark:text-slate-100 truncate">
                        {formatShortDateEs(piece.date)} · {piece.funnelStage}
                      </span>
                    </label>
                    <span
                      className={`font-semibold shrink-0 ${PILLAR_DOT_TEXT[piece.pillar]}`}
                    >
                      {piece.pillar}
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={() => openPieceEditor(piece.id)}
                    className="w-full text-left group cursor-pointer"
                  >
                    <h4 className="font-display text-sm font-bold leading-snug text-slate-900 dark:text-white group-hover:text-[#FF5A4E] transition-colors">
                      {piece.hook}
                    </h4>
                    <p className="mt-1 text-[11px] text-slate-600 dark:text-slate-300">
                      {piece.formatLabel} · {piece.voice} · {piece.concept}
                    </p>
                  </button>

                  {scenesCount > 0 && (
                    <div className="pt-1 border-t border-slate-900/6 dark:border-white/8">
                      <button
                        type="button"
                        onClick={() => toggleScenesExpand(piece.id)}
                        className="flex w-full items-center justify-between text-[11px] font-medium text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white cursor-pointer py-0.5"
                      >
                        <span>
                          Qué grabar ({checkedCount}/{scenesCount})
                        </span>
                        {isExpanded ? (
                          <ChevronUp className="h-3.5 w-3.5" aria-hidden="true" />
                        ) : (
                          <ChevronDown
                            className="h-3.5 w-3.5"
                            aria-hidden="true"
                          />
                        )}
                      </button>

                      {isExpanded && (
                        <ul className="mt-1.5 space-y-1">
                          {piece.scenesToRecord.map((scene, idx) => {
                            const done = piece.checkedScenes.includes(idx);
                            return (
                              <li key={idx}>
                                <label className="flex items-start gap-2 text-[11px] text-slate-600 dark:text-slate-300 cursor-pointer">
                                  <input
                                    type="checkbox"
                                    checked={done}
                                    onChange={() => toggleSceneCheck(piece, idx)}
                                    className="mt-0.5 accent-[#FF5A4E] cursor-pointer"
                                  />
                                  <span
                                    className={
                                      done ? 'line-through opacity-60' : ''
                                    }
                                  >
                                    {scene}
                                  </span>
                                </label>
                              </li>
                            );
                          })}
                        </ul>
                      )}
                    </div>
                  )}

                  <div className="flex flex-wrap items-center justify-between gap-2 pt-1.5 border-t border-slate-900/6 dark:border-white/8">
                    <button
                      type="button"
                      onClick={() => openPieceEditor(piece.id)}
                      className="inline-flex items-center gap-1.5 rounded-xl border border-slate-900/12 dark:border-white/14 px-2.5 py-1.5 min-h-[34px] text-[11px] font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-900/5 dark:hover:bg-white/8 transition-colors cursor-pointer"
                    >
                      <Clapperboard
                        className="h-3 w-3 text-[#F5A623]"
                        aria-hidden="true"
                      />
                      <span>Estudio 9:16</span>
                    </button>

                    <div className="flex items-center gap-1.5">
                      {!isFirstStage && (
                        <button
                          type="button"
                          onClick={() => regressStage(piece.id)}
                          aria-label={`Retroceder ${piece.hook}`}
                          title="Retroceder etapa"
                          className="inline-flex items-center justify-center rounded-xl border border-slate-900/12 dark:border-white/14 p-1.5 min-h-[34px] min-w-[34px] text-slate-600 dark:text-slate-300 hover:border-[#FF5A4E] hover:text-[#FF5A4E] transition-colors cursor-pointer"
                        >
                          <ArrowLeft
                            className="h-3.5 w-3.5"
                            aria-hidden="true"
                          />
                        </button>
                      )}
                      {!isLastStage && (
                        <button
                          type="button"
                          onClick={() => advanceStage(piece.id)}
                          className="inline-flex items-center gap-1 rounded-xl bg-[#FF5A4E]/14 border border-[#FF5A4E]/30 px-2.5 py-1.5 min-h-[34px] text-[11px] font-semibold text-[#FF5A4E] dark:text-[#FF7A6E] hover:bg-[#FF5A4E]/24 transition-colors cursor-pointer whitespace-nowrap"
                        >
                          <span>Avanzar</span>
                          <ArrowRight className="h-3 w-3" aria-hidden="true" />
                        </button>
                      )}
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>
    );
  };

  const activeMobileIdx = PRODUCTION_STAGES.indexOf(mobileStage);

  return (
    <div className="space-y-4">
      {/* Bulk Selection Action Bar */}
      {selectedIds.length > 0 && (
        <div
          role="region"
          aria-label="Acciones masivas del tablero Kanban"
          className="glass-panel-strong rounded-2xl border border-[#FF5A4E]/40 p-3.5 flex flex-wrap items-center justify-between gap-3"
        >
          <div className="flex items-center gap-2.5">
            <span className="font-mono-tabular text-xs font-bold text-[#FF5A4E] dark:text-[#FF7A6E]">
              {selectedIds.length}{' '}
              {selectedIds.length === 1
                ? 'pieza seleccionada'
                : 'piezas seleccionadas'}
            </span>
            <span className="hidden sm:inline text-xs text-slate-600 dark:text-slate-300">
              · Arrastra cualquiera o mueve todo el grupo:
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            {PRODUCTION_STAGES.map((stage) => (
              <button
                key={stage}
                type="button"
                onClick={() => handleBulkMove(stage)}
                className="rounded-xl border border-slate-900/12 dark:border-white/14 bg-white/80 dark:bg-white/[0.06] px-2.5 py-1.5 text-[11px] font-semibold text-slate-800 dark:text-slate-100 hover:border-[#FF5A4E] hover:text-[#FF5A4E] cursor-pointer whitespace-nowrap"
              >
                → {stage}
              </button>
            ))}

            <button
              type="button"
              onClick={onOpenBatchWithSelection}
              className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-[#FF5A4E] to-[#F5A623] px-3 py-1.5 text-[11px] font-bold text-white shadow-sm hover:opacity-95 cursor-pointer whitespace-nowrap"
            >
              <Layers className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Fábrica en Lote</span>
            </button>

            <button
              type="button"
              onClick={() => onSelectedIdsChange([])}
              aria-label="Limpiar selección"
              className="rounded-xl p-1.5 text-slate-500 hover:text-slate-900 dark:hover:text-white cursor-pointer"
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
        </div>
      )}

      {/* Mobile (< 768px): Stage Tabs instead of fragile touch drag-and-drop */}
      <div className="md:hidden space-y-3">
        <div
          role="tablist"
          aria-label="Columnas de producción"
          className="grid grid-cols-4 gap-1 rounded-2xl border border-slate-900/10 dark:border-white/12 bg-white/75 dark:bg-white/[0.05] p-1"
        >
          {PRODUCTION_STAGES.map((stage) => {
            const count = pieces.filter((p) => p.status === stage).length;
            const active = mobileStage === stage;
            return (
              <button
                key={stage}
                role="tab"
                type="button"
                aria-selected={active}
                onClick={() => setMobileStage(stage)}
                className={`rounded-xl px-2 py-2 text-[11px] font-semibold transition-colors cursor-pointer text-center ${
                  active
                    ? 'bg-gradient-to-r from-[#FF5A4E] to-[#F5A623] text-white shadow-sm'
                    : 'text-slate-600 dark:text-slate-300'
                }`}
              >
                <span className="block truncate">{stage}</span>
                <span className="font-mono-tabular text-[10px] opacity-85">
                  ({count})
                </span>
              </button>
            );
          })}
        </div>

        {renderColumn(mobileStage, activeMobileIdx, true)}
      </div>

      {/* Desktop / Tablet (>= 768px): 4-Column Multi-Drag & Drop Board */}
      <div className="hidden md:grid md:grid-cols-2 xl:grid-cols-4 gap-4 items-start">
        {PRODUCTION_STAGES.map((stage, idx) => renderColumn(stage, idx, false))}
      </div>
    </div>
  );
};
