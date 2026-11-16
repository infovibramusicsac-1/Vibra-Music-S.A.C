import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  Bot,
  CheckCircle2,
  Clapperboard,
  Eye,
  FileText,
  Save,
  Sparkles,
  Subtitles,
  Undo2,
  Wand2,
  X,
} from 'lucide-react';
import {
  checkBrandGuardrails,
  computeClipTimelineRanges,
} from '../../../application/use-cases/PieceWorkflowUseCases';
import type { ContentPiece, SpectatorAudit } from '../../../domain/entities';
import type { ScriptAngle } from '../../../domain/ports/AiCreativePort';
import {
  CONTENT_CONCEPTS,
  PRODUCTION_STAGES,
  type ContentConcept,
  type FunnelStage,
  type ProductionStatus,
} from '../../../domain/value-objects';
import { useVibraServices } from '../../context/VibraServicesContext';
import { formatShortDateEs } from '../../theme/tokens';
import { AgentPromptBuilderPanel } from './AgentPromptBuilderPanel';
import { MultiTrackTimeline } from './MultiTrackTimeline';
import { SceneClipUploader } from './SceneClipUploader';
import { SpectatorPreviewModal } from './SpectatorPreviewModal';
import { SubtitleRenderPanel } from './SubtitleRenderPanel';
import { TtsVoicePanel } from './TtsVoicePanel';
import { VerticalPreview9x16 } from './VerticalPreview9x16';

type EditorTab = 'script' | 'media' | 'render' | 'agent';

export const PieceEditorSheet: React.FC = () => {
  const {
    workspace,
    selectedPiece,
    closePieceEditor,
    savePiece,
    ttsEngine,
    aiCreative,
  } = useVibraServices();
  const [activeTab, setActiveTab] = useState<EditorTab>('script');
  const [draftPiece, setDraftPiece] = useState<ContentPiece | null>(null);
  const [dirtyDialogOpen, setDirtyDialogOpen] = useState(false);
  const [spectatorOpen, setSpectatorOpen] = useState(false);
  const [scriptTopic, setScriptTopic] = useState('');
  const [scriptAngle, setScriptAngle] = useState<ScriptAngle>('dato_curioso');
  const [generatingScript, setGeneratingScript] = useState(false);
  const [scriptNotice, setScriptNotice] = useState<string | null>(null);
  const [playheadSec, setPlayheadSec] = useState(0);
  const [seekTriggerSec, setSeekTriggerSec] = useState<{
    value: number;
    nonce: number;
  } | null>(null);

  // Sync draft buffer whenever selectedPiece opens or changes ID
  useEffect(() => {
    if (selectedPiece) {
      setDraftPiece(selectedPiece);
      setDirtyDialogOpen(false);
      setSpectatorOpen(false);
      setScriptTopic(selectedPiece.subtopic || '');
      setScriptNotice(null);
      setPlayheadSec(0);
      setSeekTriggerSec(null);
    } else {
      setDraftPiece(null);
      setDirtyDialogOpen(false);
      setSpectatorOpen(false);
    }
  }, [selectedPiece?.id]);

  const totalDurationSec = useMemo(() => {
    if (!draftPiece) return 15;
    const clipRanges = computeClipTimelineRanges(draftPiece.sceneClips);
    const clipsDur =
      clipRanges.length > 0
        ? clipRanges.reduce((max, r) => Math.max(max, r.endSec), 0)
        : 0;
    const speechText =
      draftPiece.voice === 'Con voz'
        ? (
            draftPiece.voiceoverText ||
            `${draftPiece.hook}. ${draftPiece.script}`
          ).trim()
        : `${draftPiece.hook}. ${draftPiece.script}`.trim();
    const ttsDur =
      draftPiece.voice === 'Con voz'
        ? ttsEngine.estimateDurationSec(speechText, draftPiece.voiceConfig.rate)
        : 15;
    const customCuesMax =
      draftPiece.customSubtitleCues && draftPiece.customSubtitleCues.length > 0
        ? draftPiece.customSubtitleCues[draftPiece.customSubtitleCues.length - 1]
            .endSec
        : 0;
    const kineticBeatsMax =
      draftPiece.kineticBeats && draftPiece.kineticBeats.length > 0
        ? draftPiece.kineticBeats.reduce(
            (max, beat) => Math.max(max, beat.endSec),
            0
          )
        : 0;
    return Math.max(
      10,
      Math.round(
        Math.max(clipsDur, ttsDur, customCuesMax, kineticBeatsMax) * 10
      ) / 10
    );
  }, [draftPiece, ttsEngine]);

  const isDirty = useMemo(() => {
    if (!draftPiece || !selectedPiece) return false;
    return JSON.stringify(draftPiece) !== JSON.stringify(selectedPiece);
  }, [draftPiece, selectedPiece]);

  const guardrails = useMemo(() => {
    if (!draftPiece) return null;
    return checkBrandGuardrails(draftPiece, workspace.brand);
  }, [draftPiece, workspace.brand]);

  const relatedRefs = useMemo(() => {
    if (!draftPiece) return [];
    return workspace.references
      .filter((r) => r.conceptId === draftPiece.conceptId)
      .sort((a, b) => b.views - a.views)
      .slice(0, 2);
  }, [draftPiece, workspace.references]);

  useEffect(() => {
    if (!selectedPiece) return undefined;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (isDirty) {
          setDirtyDialogOpen(true);
        } else {
          closePieceEditor();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedPiece, isDirty, closePieceEditor]);

  if (!selectedPiece || !draftPiece) return null;

  const updateField = <K extends keyof ContentPiece>(
    key: K,
    value: ContentPiece[K]
  ) => {
    setDraftPiece((prev) => (prev ? { ...prev, [key]: value } : prev));
  };

  const handleSaveChanges = () => {
    if (!draftPiece) return;
    savePiece(draftPiece);
  };

  const handleDiscardChanges = () => {
    setDraftPiece(selectedPiece);
    setDirtyDialogOpen(false);
  };

  const handleAttemptClose = () => {
    if (isDirty) {
      setDirtyDialogOpen(true);
    } else {
      closePieceEditor();
    }
  };

  const handleApplyOfflineCurioso = () => {
    const topic = scriptTopic.trim() || draftPiece.subtopic || 'práctica musical en niños y jóvenes';
    const hookByAngle =
      scriptAngle === 'mito_realidad'
        ? `Casi nadie te dice este mito sobre ${topic}`
        : scriptAngle === 'historia_breve'
          ? `Lo que pasa en tu cerebro tras 20 minutos de ${topic}`
          : `¿Sabías este dato curioso sobre ${topic}?`;
    const body =
      `Dato curioso: tocar música activa coordinación, memoria y oído rítmico al mismo tiempo. En Vibra Music lo trabajamos paso a paso con ejercicios reales para ${draftPiece.audienceName}.`;
    const cta = draftPiece.cta || 'Reserva tu clase piloto gratuita en Vibra Music SJL';
    setDraftPiece((prev) =>
      prev
        ? {
            ...prev,
            hook: hookByAngle,
            script: body,
            voiceoverText: `${hookByAngle}. ${body} ${cta}.`,
            cta,
          }
        : prev
    );
    setScriptNotice('Estructura local «Dato Curioso + 3 Actos» aplicada al borrador.');
  };

  const handleGenerateGeminiScript = async () => {
    if (generatingScript) return;
    setGeneratingScript(true);
    setScriptNotice(null);
    try {
      const res = await aiCreative.generateCuriosoScript({
        topic: scriptTopic.trim() || draftPiece.subtopic,
        pillar: draftPiece.pillar,
        audienceName: draftPiece.audienceName,
        angle: scriptAngle,
        cta: draftPiece.cta,
      });
      setDraftPiece((prev) =>
        prev
          ? {
              ...prev,
              hook: res.hook,
              script: res.script,
              voiceoverText: res.voiceoverText,
              cta: res.cta,
            }
          : prev
      );
      setScriptNotice(`Guion generado: ${res.curiousFactTitle}`);
    } catch (err) {
      setScriptNotice(
        err instanceof Error
          ? err.message
          : 'No se pudo generar el guion con Gemini.'
      );
    } finally {
      setGeneratingScript(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="piece-editor-title"
      onClick={(e) => {
        if (e.target === e.currentTarget) handleAttemptClose();
      }}
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-950/75 p-0 sm:p-4"
    >
      <div className="glass-panel-strong relative flex h-[94vh] sm:h-[90vh] w-full max-w-6xl flex-col overflow-hidden rounded-t-3xl sm:rounded-3xl">
        {/* Top Sheet Header */}
        <header className="flex items-center justify-between gap-4 border-b border-slate-900/10 dark:border-white/10 px-5 sm:px-6 py-4">
          <div className="min-w-0 space-y-0.5">
            <p className="text-xs text-slate-600 dark:text-slate-300 truncate">
              <span className="font-mono-tabular font-semibold text-[#FF5A4E]">
                {draftPiece.id.toUpperCase()}
              </span>
              {' · '}
              {draftPiece.weekday} {formatShortDateEs(draftPiece.date)}
              {' · '}
              {draftPiece.pillar}
              {' · '}
              {draftPiece.audienceName}
              {' · '}
              {draftPiece.voice}
            </p>
            <h2
              id="piece-editor-title"
              className="font-display text-base sm:text-lg font-bold text-slate-900 dark:text-white truncate"
            >
              {draftPiece.hook}
            </h2>
          </div>

          <button
            type="button"
            onClick={handleAttemptClose}
            aria-label="Cerrar estudio de edición"
            className="rounded-xl p-2 text-slate-600 dark:text-slate-300 hover:bg-slate-900/5 dark:hover:bg-white/8 hover:text-slate-900 dark:hover:text-white cursor-pointer shrink-0"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </header>

        {/* Split Studio Body: Right 9:16 Preview on top on mobile, right column on lg */}
        <div className="flex-1 overflow-y-auto">
          <div className="grid grid-cols-1 lg:grid-cols-12 min-h-full">
            {/* Left Area: 3 Work Tabs */}
            <div className="order-2 lg:order-1 lg:col-span-7 xl:col-span-8 p-5 sm:p-6 space-y-5 border-t lg:border-t-0 lg:border-r border-slate-900/10 dark:border-white/10">
              <div className="flex flex-wrap items-center gap-1.5 rounded-2xl bg-slate-900/6 dark:bg-white/6 p-1">
                <button
                  type="button"
                  onClick={() => setActiveTab('script')}
                  className={`inline-flex flex-1 sm:flex-initial items-center justify-center gap-2 rounded-xl px-3.5 py-2 text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap ${
                    activeTab === 'script'
                      ? 'bg-white dark:bg-[#111B33] text-slate-900 dark:text-white shadow-sm'
                      : 'text-slate-700 dark:text-slate-200 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  <FileText className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>Guion & Metadata</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('media')}
                  className={`inline-flex flex-1 sm:flex-initial items-center justify-center gap-2 rounded-xl px-3.5 py-2 text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap ${
                    activeTab === 'media'
                      ? 'bg-white dark:bg-[#111B33] text-slate-900 dark:text-white shadow-sm'
                      : 'text-slate-700 dark:text-slate-200 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  <Clapperboard className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>Tomas & Voz</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('render')}
                  className={`inline-flex flex-1 sm:flex-initial items-center justify-center gap-2 rounded-xl px-3.5 py-2 text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap ${
                    activeTab === 'render'
                      ? 'bg-white dark:bg-[#111B33] text-slate-900 dark:text-white shadow-sm'
                      : 'text-slate-700 dark:text-slate-200 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  <Subtitles className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>Subtítulos & Render</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('agent')}
                  className={`inline-flex flex-1 sm:flex-initial items-center justify-center gap-2 rounded-xl px-3.5 py-2 text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap ${
                    activeTab === 'agent'
                      ? 'bg-white dark:bg-[#111B33] text-slate-900 dark:text-white shadow-sm'
                      : 'text-slate-700 dark:text-slate-200 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  <Bot className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>Agente & Prompt</span>
                </button>
              </div>

              {activeTab === 'script' && (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-4">
                    <div className="space-y-1">
                      <label className="text-[11px] font-semibold text-slate-700 dark:text-slate-200">
                        Estado Kanban
                      </label>
                      <select
                        value={draftPiece.status}
                        onChange={(e) =>
                          updateField(
                            'status',
                            e.target.value as ProductionStatus
                          )
                        }
                        className="w-full rounded-xl border border-slate-900/12 dark:border-white/14 bg-white/90 dark:bg-[#0B1221] px-2.5 py-2 text-xs font-medium text-slate-900 dark:text-white"
                      >
                        {PRODUCTION_STAGES.map((st) => (
                          <option key={st} value={st}>
                            {st}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[11px] font-semibold text-slate-700 dark:text-slate-200">
                        Embudo
                      </label>
                      <select
                        value={draftPiece.funnelStage}
                        onChange={(e) =>
                          updateField(
                            'funnelStage',
                            e.target.value as FunnelStage
                          )
                        }
                        className="w-full rounded-xl border border-slate-900/12 dark:border-white/14 bg-white/90 dark:bg-[#0B1221] px-2.5 py-2 text-xs font-medium text-slate-900 dark:text-white"
                      >
                        <option value="TOFU">TOFU (Atraer)</option>
                        <option value="MOFU">MOFU (Confiar)</option>
                        <option value="BOFU">BOFU (Inscribir)</option>
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[11px] font-semibold text-slate-700 dark:text-slate-200">
                        Concepto
                      </label>
                      <select
                        value={draftPiece.concept}
                        onChange={(e) =>
                          updateField(
                            'concept',
                            e.target.value as ContentConcept
                          )
                        }
                        className="w-full rounded-xl border border-slate-900/12 dark:border-white/14 bg-white/90 dark:bg-[#0B1221] px-2.5 py-2 text-xs font-medium text-slate-900 dark:text-white"
                      >
                        {CONTENT_CONCEPTS.map((c) => (
                          <option key={c} value={c}>
                            {c}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="flex items-end">
                      <button
                        type="button"
                        role="switch"
                        aria-checked={draftPiece.approved}
                        onClick={() =>
                          updateField('approved', !draftPiece.approved)
                        }
                        className={`flex w-full items-center justify-center gap-2 rounded-xl border px-3 py-2 text-xs font-bold transition-colors cursor-pointer ${
                          draftPiece.approved
                            ? 'border-emerald-500/45 bg-emerald-500/15 text-emerald-700 dark:text-emerald-300'
                            : 'border-slate-900/12 dark:border-white/14 bg-white/75 dark:bg-white/5 text-slate-700 dark:text-slate-200'
                        }`}
                      >
                        <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
                        <span>
                          {draftPiece.approved ? 'Aprobada' : 'Sin aprobar'}
                        </span>
                      </button>
                    </div>
                  </div>

                  {/* Paso 1: Dato Curioso + Estructura 3 Actos */}
                  <div className="rounded-2xl border border-[#FF5A4E]/25 bg-[#FF5A4E]/[0.05] p-3.5 space-y-2.5">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5">
                        <Wand2 className="h-3.5 w-3.5 text-[#FF5A4E]" aria-hidden="true" />
                        <span className="text-xs font-bold text-slate-900 dark:text-white">
                          Paso 1 · Dato Curioso & Estructura 3 Actos
                        </span>
                      </div>
                      <select
                        value={scriptAngle}
                        aria-label="Enfoque narrativo del dato curioso"
                        onChange={(e) => setScriptAngle(e.target.value as ScriptAngle)}
                        className="rounded-lg border border-slate-900/12 dark:border-white/14 bg-white/85 dark:bg-[#0B1221] px-2.5 py-1 text-[11px] font-medium text-slate-900 dark:text-white"
                      >
                        <option value="dato_curioso">Dato curioso musical</option>
                        <option value="mito_realidad">Mito vs. Realidad</option>
                        <option value="historia_breve">Micro-historia / Ciencia</option>
                      </select>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-2">
                      <input
                        type="text"
                        value={scriptTopic}
                        onChange={(e) => setScriptTopic(e.target.value)}
                        placeholder="Ej. por qué cantar reduce el estrés o ritmo en niños..."
                        className="flex-1 rounded-xl border border-slate-900/12 dark:border-white/14 bg-white/85 dark:bg-[#0B1221] px-3 py-1.5 text-xs text-slate-900 dark:text-white focus:border-[#FF5A4E] focus:outline-none"
                      />
                      <button
                        type="button"
                        onClick={handleApplyOfflineCurioso}
                        className="rounded-xl border border-slate-900/12 dark:border-white/14 bg-white/85 dark:bg-white/[0.06] px-3 py-1.5 text-[11px] font-semibold text-slate-800 dark:text-slate-100 hover:border-[#F5A623] cursor-pointer shrink-0"
                      >
                        Plantilla local
                      </button>
                      <button
                        type="button"
                        disabled={generatingScript}
                        onClick={() => void handleGenerateGeminiScript()}
                        className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-gradient-to-r from-[#FF5A4E] to-[#F5A623] px-3 py-1.5 text-[11px] font-bold text-white cursor-pointer disabled:opacity-50 shrink-0"
                      >
                        <Sparkles className="h-3 w-3" aria-hidden="true" />
                        <span>{generatingScript ? 'Generando…' : 'Generar con IA'}</span>
                      </button>
                    </div>

                    {scriptNotice && (
                      <p className="text-[11px] text-slate-700 dark:text-slate-200">
                        {scriptNotice}
                      </p>
                    )}
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-700 dark:text-slate-200">
                      Hook (Primeros 3 segundos)
                    </label>
                    <input
                      type="text"
                      value={draftPiece.hook}
                      onChange={(e) => updateField('hook', e.target.value)}
                      className="w-full rounded-xl border border-slate-900/12 dark:border-white/14 bg-white/90 dark:bg-[#0B1221] px-3.5 py-2.5 text-sm font-semibold text-slate-900 dark:text-white focus:border-[#FF5A4E] focus:outline-none"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-700 dark:text-slate-200">
                      Guion completo / Desarrollo
                    </label>
                    <textarea
                      rows={4}
                      value={draftPiece.script}
                      onChange={(e) => updateField('script', e.target.value)}
                      className="w-full rounded-xl border border-slate-900/12 dark:border-white/14 bg-white/90 dark:bg-[#0B1221] p-3.5 text-xs sm:text-sm leading-relaxed text-slate-900 dark:text-white focus:border-[#FF5A4E] focus:outline-none"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-700 dark:text-slate-200">
                      Llamado a la acción (CTA)
                    </label>
                    <input
                      type="text"
                      value={draftPiece.cta}
                      onChange={(e) => updateField('cta', e.target.value)}
                      className="w-full rounded-xl border border-slate-900/12 dark:border-white/14 bg-white/90 dark:bg-[#0B1221] px-3.5 py-2 text-xs sm:text-sm text-slate-900 dark:text-white focus:border-[#FF5A4E] focus:outline-none"
                    />
                  </div>

                  {guardrails && (
                    <div className="rounded-2xl border border-slate-900/10 dark:border-white/12 bg-white/60 dark:bg-white/[0.03] p-4 space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-bold text-slate-800 dark:text-slate-100">
                          Control de Marca Vibra
                        </span>
                        {guardrails.avoidHits.length === 0 &&
                        !guardrails.hasPlaceholders ? (
                          <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
                            Tono alineado
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-700 dark:text-[#F5A623]">
                            <AlertTriangle className="h-3.5 w-3.5" aria-hidden="true" />
                            <span>Revisar detalles</span>
                          </span>
                        )}
                      </div>

                      {guardrails.avoidHits.length > 0 && (
                        <p className="text-xs text-rose-600 dark:text-rose-400">
                          Evitar palabras detectadas: {guardrails.avoidHits.join(', ')}
                        </p>
                      )}

                      {guardrails.hasPlaceholders && (
                        <p className="text-xs text-amber-700 dark:text-[#F5A623]">
                          Campos por confirmar: {guardrails.detectedPlaceholders.join(' · ')}
                        </p>
                      )}

                      {guardrails.sayHits.length > 0 && (
                        <p className="text-[11px] text-emerald-700 dark:text-emerald-400">
                          Vocabulario Vibra presente: {guardrails.sayHits.join(' · ')}
                        </p>
                      )}
                    </div>
                  )}

                  {relatedRefs.length > 0 && (
                    <div className="rounded-2xl border border-slate-900/10 dark:border-white/12 bg-white/55 dark:bg-white/[0.025] p-4 space-y-2">
                      <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800 dark:text-slate-100">
                        <Sparkles className="h-3.5 w-3.5 text-[#F5A623]" aria-hidden="true" />
                        <span>Referencias Hanan para este formato</span>
                      </div>
                      {relatedRefs.map((ref) => (
                        <div key={ref.id} className="text-xs text-slate-700 dark:text-slate-200">
                          <span className="font-semibold text-slate-900 dark:text-white">
                            {ref.title}
                          </span>{' '}
                          <span className="font-mono-tabular text-[#FF5A4E]">
                            ({ref.views.toLocaleString('es-PE')} vistas)
                          </span>{' '}
                          — {ref.note}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'media' && (
                <div className="space-y-5">
                  <SceneClipUploader piece={draftPiece} onUpdate={setDraftPiece} />
                  <TtsVoicePanel piece={draftPiece} onUpdate={setDraftPiece} />
                </div>
              )}

              {activeTab === 'render' && (
                <SubtitleRenderPanel
                  piece={draftPiece}
                  totalDurationSec={totalDurationSec}
                  onUpdate={setDraftPiece}
                  onCommitRender={(rendered) => {
                    setDraftPiece(rendered);
                    savePiece(rendered);
                  }}
                />
              )}

              {activeTab === 'agent' && (
                <AgentPromptBuilderPanel
                  piece={draftPiece}
                  totalDurationSec={totalDurationSec}
                />
              )}
            </div>

            {/* Right Area: Permanent Interactive 9:16 Vertical Remotion Player */}
            <aside className="order-1 lg:order-2 lg:col-span-5 xl:col-span-4 bg-slate-900/[0.03] dark:bg-black/25 p-5 sm:p-6 flex flex-col items-center justify-center gap-3">
              <VerticalPreview9x16
                piece={draftPiece}
                playheadSec={playheadSec}
                totalDurationSec={totalDurationSec}
                onPlayheadChange={setPlayheadSec}
                seekTriggerSec={seekTriggerSec}
                onOpenSpectator={() => setSpectatorOpen(true)}
              />
              {draftPiece.spectatorAudit && (
                <p className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
                  <Eye className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>
                    Revisión espectador:{' '}
                    {
                      [
                        draftPiece.spectatorAudit.hookIn3Sec,
                        draftPiece.spectatorAudit.safeZonesClear,
                        draftPiece.spectatorAudit.paceNoDeadAir,
                        draftPiece.spectatorAudit.audioBalanced,
                        draftPiece.spectatorAudit.ctaClear,
                      ].filter(Boolean).length
                    }
                    /5 validado
                  </span>
                </p>
              )}
            </aside>
          </div>
        </div>

        {/* Multi-Track Remotion Timeline */}
        <MultiTrackTimeline
          piece={draftPiece}
          playheadSec={playheadSec}
          totalDurationSec={totalDurationSec}
          onSeekSec={(sec) => {
            setPlayheadSec(sec);
            setSeekTriggerSec((prev) => ({
              value: sec,
              nonce: (prev?.nonce ?? 0) + 1,
            }));
          }}
          onUpdatePiece={setDraftPiece}
        />

        {/* Draft Save / Discard Footer */}
        <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-900/10 dark:border-white/10 px-5 sm:px-6 py-3.5 bg-white/60 dark:bg-black/20">
          <div className="text-xs">
            {isDirty ? (
              <span className="font-semibold text-amber-700 dark:text-[#F5A623]">
                Tienes cambios sin guardar en el borrador
              </span>
            ) : (
              <span className="text-slate-500 dark:text-slate-400">
                Todos los cambios están guardados
              </span>
            )}
          </div>

          <div className="flex items-center gap-2.5">
            {isDirty && (
              <button
                type="button"
                onClick={handleDiscardChanges}
                className="inline-flex items-center gap-1.5 rounded-xl border border-slate-900/12 dark:border-white/14 px-3.5 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-900/5 dark:hover:bg-white/8 cursor-pointer"
              >
                <Undo2 className="h-3.5 w-3.5" aria-hidden="true" />
                <span>Descartar</span>
              </button>
            )}

            <button
              type="button"
              onClick={handleSaveChanges}
              disabled={!isDirty}
              className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-[#FF5A4E] to-[#F5A623] px-4 py-2 text-xs font-bold text-white shadow-sm hover:opacity-95 cursor-pointer disabled:opacity-40"
            >
              <Save className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Guardar cambios</span>
            </button>
          </div>
        </footer>

        {/* Dirty-State Protection Dialog */}
        {dirtyDialogOpen && (
          <div
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="dirty-dialog-title"
            className="absolute inset-0 z-40 flex items-center justify-center bg-slate-950/75 p-4"
          >
            <div className="glass-panel-strong w-full max-w-md rounded-3xl p-6 space-y-4">
              <h3
                id="dirty-dialog-title"
                className="font-display text-lg font-bold text-slate-900 dark:text-white"
              >
                ¿Salir sin guardar los cambios?
              </h3>
              <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300">
                Editaste el guion, tomas o subtítulos de esta pieza. Si cierras ahora sin guardar, se perderán tus cambios del borrador.
              </p>
              <div className="flex flex-wrap items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setDirtyDialogOpen(false)}
                  className="rounded-xl border border-slate-900/12 dark:border-white/14 px-3.5 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-900/5 dark:hover:bg-white/8 cursor-pointer"
                >
                  Seguir editando
                </button>
                <button
                  type="button"
                  onClick={closePieceEditor}
                  className="rounded-xl border border-rose-500/35 bg-rose-500/12 px-3.5 py-2 text-xs font-semibold text-rose-600 dark:text-rose-300 hover:bg-rose-500/20 cursor-pointer"
                >
                  Descartar y salir
                </button>
                <button
                  type="button"
                  onClick={() => {
                    savePiece(draftPiece);
                    closePieceEditor();
                  }}
                  className="rounded-xl bg-gradient-to-r from-[#FF5A4E] to-[#F5A623] px-4 py-2 text-xs font-bold text-white cursor-pointer"
                >
                  Guardar y cerrar
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Paso 5: Fullscreen Modo Espectador 9:16 */}
        <SpectatorPreviewModal
          open={spectatorOpen}
          piece={draftPiece}
          totalDurationSec={totalDurationSec}
          onClose={() => setSpectatorOpen(false)}
          onSaveAudit={(audit: SpectatorAudit) => {
            updateField('spectatorAudit', audit);
          }}
        />
      </div>
    </div>
  );
};
