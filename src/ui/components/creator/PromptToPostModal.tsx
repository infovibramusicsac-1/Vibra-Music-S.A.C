import React, { useMemo, useState } from 'react';
import {
  Bookmark,
  Clapperboard,
  FileSpreadsheet,
  Layers,
  Plus,
  Sparkles,
  Trash2,
  Volume2,
  Wand2,
  X,
} from 'lucide-react';
import { buildContentPieceFromBeats } from '../../../application/use-cases/PieceWorkflowUseCases';
import {
  classifySfxKind,
  parsePromptToKineticPost,
  SAMPLE_MUSICA_TODO_EL_ANO_PROMPT,
  type CustomPromptTemplate,
} from '../../../application/use-cases/PromptScriptParser';
import type { KineticBeat } from '../../../domain/entities';
import {
  CONTENT_CONCEPTS,
  PRODUCTION_STAGES,
  SUBTITLE_PRESETS,
  type ContentConcept,
  type FunnelStage,
  type PillarName,
  type ProductionStatus,
  type SubtitlePreset,
  type VoiceType,
} from '../../../domain/value-objects';
import { useVibraServices } from '../../context/VibraServicesContext';

interface PromptToPostModalProps {
  open: boolean;
  onClose: () => void;
}

const PILLAR_OPTIONS: PillarName[] = [
  'Nueva Visión',
  'Conversión',
  'Tienda',
  'Festivo',
  'Comunidad',
];

const FUNNEL_OPTIONS: FunnelStage[] = ['TOFU', 'MOFU', 'BOFU'];

const VOICE_OPTIONS: VoiceType[] = ['Con voz', 'Sin voz'];

const ROLE_OPTIONS: Array<KineticBeat['role']> = ['hook', 'body', 'cta'];

const ACCENT_SWATCHES = [
  { hex: '#F4A048', bgClass: 'bg-[#F4A048]' },
  { hex: '#FF5A4E', bgClass: 'bg-[#FF5A4E]' },
  { hex: '#F5A623', bgClass: 'bg-[#F5A623]' },
  { hex: '#10B981', bgClass: 'bg-[#10B981]' },
  { hex: '#38BDF8', bgClass: 'bg-[#38BDF8]' },
];

const INITIAL_PARSED = parsePromptToKineticPost(SAMPLE_MUSICA_TODO_EL_ANO_PROMPT);

export const PromptToPostModal: React.FC<PromptToPostModalProps> = ({
  open,
  onClose,
}) => {
  const { aiCreative, createPiece, customTemplates, saveCustomTemplate } =
    useVibraServices();

  const [rawPrompt, setRawPrompt] = useState<string>(
    SAMPLE_MUSICA_TODO_EL_ANO_PROMPT
  );
  const [title, setTitle] = useState<string>(INITIAL_PARSED.title);
  const [coreIdea, setCoreIdea] = useState<string>(INITIAL_PARSED.coreIdea);
  const [date, setDate] = useState<string>('2026-11-18');
  const [pillar, setPillar] = useState<PillarName>(INITIAL_PARSED.pillar);
  const [audienceName, setAudienceName] = useState<string>(
    INITIAL_PARSED.audienceName
  );
  const [funnelStage, setFunnelStage] = useState<FunnelStage>(
    INITIAL_PARSED.funnelStage
  );
  const [concept, setConcept] = useState<ContentConcept>(INITIAL_PARSED.concept);
  const [voice, setVoice] = useState<VoiceType>(INITIAL_PARSED.voice);
  const [targetStage, setTargetStage] =
    useState<ProductionStatus>('Por grabar');
  const [subtitlePreset, setSubtitlePreset] =
    useState<SubtitlePreset>('Hormozi Bold');
  const [beats, setBeats] = useState<KineticBeat[]>(INITIAL_PARSED.beats);
  const [saveAsTemplate, setSaveAsTemplate] = useState<boolean>(false);
  const [templateName, setTemplateName] = useState<string>('');
  const [aiLoading, setAiLoading] = useState<boolean>(false);
  const [feedback, setFeedback] = useState<{
    type: 'info' | 'error';
    text: string;
  } | null>(null);

  const computedDurationSec = useMemo(() => {
    if (beats.length === 0) return 15;
    return Math.max(
      10,
      Math.round(
        beats.reduce((max, b) => Math.max(max, Number(b.endSec) || 0), 0) * 10
      ) / 10
    );
  }, [beats]);

  const sfxActiveCount = useMemo(
    () => beats.filter((b) => b.sfxKind !== 'none').length,
    [beats]
  );

  if (!open) return null;

  const applyParsedResult = (parsed: ReturnType<typeof parsePromptToKineticPost>) => {
    setTitle(parsed.title);
    setCoreIdea(parsed.coreIdea);
    setPillar(parsed.pillar);
    setAudienceName(parsed.audienceName);
    setFunnelStage(parsed.funnelStage);
    setConcept(parsed.concept);
    setVoice(parsed.voice);
    setBeats(parsed.beats);
  };

  const handleLoadExample = () => {
    setRawPrompt(SAMPLE_MUSICA_TODO_EL_ANO_PROMPT);
    const parsed = parsePromptToKineticPost(SAMPLE_MUSICA_TODO_EL_ANO_PROMPT);
    applyParsedResult(parsed);
    setFeedback({
      type: 'info',
      text: `Ejemplo «${parsed.title}» cargado con ${parsed.beats.length} escenas cronometradas (${parsed.totalDurationSec} s).`,
    });
  };

  const handleParseLocal = () => {
    const parsed = parsePromptToKineticPost(rawPrompt);
    applyParsedResult(parsed);
    setFeedback({
      type: 'info',
      text: `Prompt analizado en modo local: ${parsed.beats.length} beats (${parsed.totalDurationSec} s) listos para editar o enviar al Studio.`,
    });
  };

  const handleExpandWithGemini = async () => {
    if (!rawPrompt.trim()) {
      setFeedback({
        type: 'error',
        text: 'Escribe primero una idea o tabla de guion en el recuadro superior.',
      });
      return;
    }

    setAiLoading(true);
    setFeedback(null);
    try {
      const result = await aiCreative.generatePostFromPrompt({
        prompt: rawPrompt,
        targetDurationSec: computedDurationSec,
      });

      const normalizeHex = (raw?: string) => {
        if (!raw) return '#F4A048';
        const cleaned = raw.trim().replace(/^#+/, '');
        return /^[0-9a-fA-F]{6}$/.test(cleaned) ? `#${cleaned.toUpperCase()}` : '#F4A048';
      };

      const mappedBeats: KineticBeat[] = result.beats.map((b, idx) => ({
        id: `beat-ai-${idx + 1}`,
        role: b.role === 'hook' || b.role === 'cta' ? b.role : 'body',
        startSec: Number(b.startSec) || idx * 4,
        endSec: Number(b.endSec) || idx * 4 + 4,
        spokenText: b.spokenText,
        kineticText: b.kineticText,
        highlightWord: b.highlightWord,
        highlightColor: normalizeHex(b.highlightColor),
        stepByStepItems:
          b.stepByStepItems && b.stepByStepItems.length > 1
            ? b.stepByStepItems
            : undefined,
        sfxLabel: b.sfxLabel || 'pop',
        sfxKind: classifySfxKind(b.sfxLabel || 'pop'),
      }));

      setTitle(result.title || title);
      setCoreIdea(result.coreIdea || coreIdea);
      if (PILLAR_OPTIONS.includes(result.pillar)) setPillar(result.pillar);
      setAudienceName(result.audienceName || audienceName);
      if (FUNNEL_OPTIONS.includes(result.funnelStage))
        setFunnelStage(result.funnelStage);
      if (CONTENT_CONCEPTS.includes(result.concept)) setConcept(result.concept);
      if (VOICE_OPTIONS.includes(result.voice)) setVoice(result.voice);
      if (mappedBeats.length > 0) {
        setBeats(mappedBeats);
      }

      setFeedback({
        type: 'info',
        text: `Gemini IA generó ${mappedBeats.length} beats con texto kinetic y cues SFX listos.`,
      });
    } catch (err) {
      const msg =
        err instanceof Error
          ? err.message
          : 'No se pudo conectar con Gemini IA.';
      setFeedback({
        type: 'error',
        text: `${msg} Puedes seguir editando con «Analizar Prompt (Local)» sin conexión ni API Key.`,
      });
    } finally {
      setAiLoading(false);
    }
  };

  const handleLoadCustomTemplate = (tpl: CustomPromptTemplate) => {
    setTitle(tpl.name);
    setCoreIdea(tpl.coreIdea);
    setPillar(tpl.pillar);
    setFunnelStage(tpl.funnelStage);
    setConcept(tpl.concept);
    setBeats(tpl.beats.map((b) => ({ ...b })));
    setFeedback({
      type: 'info',
      text: `Plantilla «${tpl.name}» cargada (${tpl.beats.length} beats).`,
    });
  };

  const updateBeat = (beatId: string, patch: Partial<KineticBeat>) => {
    setBeats((prev) =>
      prev.map((b) => {
        if (b.id !== beatId) return b;
        const next = { ...b, ...patch };
        if (patch.sfxLabel !== undefined) {
          next.sfxKind = classifySfxKind(patch.sfxLabel);
        }
        return next;
      })
    );
  };

  const handleAddBeat = () => {
    const lastEnd =
      beats.length > 0 ? Math.max(...beats.map((b) => b.endSec)) : 0;
    const nextBeat: KineticBeat = {
      id: `beat-${Date.now().toString(36)}`,
      role: 'body',
      startSec: lastEnd,
      endSec: lastEnd + 4,
      spokenText: 'Nueva frase del presentador para este segmento.',
      kineticText: 'NUEVO TITULAR KINETIC',
      highlightColor: '#F4A048',
      sfxLabel: 'whoosh',
      sfxKind: 'whoosh',
    };
    setBeats((prev) => [...prev, nextBeat]);
  };

  const handleRemoveBeat = (beatId: string) => {
    setBeats((prev) => prev.filter((b) => b.id !== beatId));
  };

  const handleCreate = (openInStudio: boolean) => {
    const safeBeats =
      beats.length > 0
        ? beats
        : parsePromptToKineticPost(rawPrompt || SAMPLE_MUSICA_TODO_EL_ANO_PROMPT)
            .beats;

    if (saveAsTemplate) {
      const tplLabel = (templateName || title || 'Plantilla Vibra').trim();
      saveCustomTemplate({
        id: `tpl-prompt-${Date.now().toString(36)}`,
        name: tplLabel,
        coreIdea,
        pillar,
        funnelStage,
        concept,
        beats: safeBeats,
        createdAt: new Date().toISOString(),
      });
    }

    const piece = buildContentPieceFromBeats({
      title: title.trim() || 'Nuevo Reel Vibra Music',
      coreIdea: coreIdea.trim() || 'Guion generado desde Prompt-to-Post.',
      date,
      pillar,
      audienceName: audienceName.trim() || 'Todas las edades (4–18+)',
      funnelStage,
      concept,
      voice,
      status: targetStage,
      subtitlePreset,
      beats: safeBeats,
    });

    createPiece(piece, openInStudio);
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/75 backdrop-blur-md"
      role="dialog"
      aria-modal="true"
      aria-labelledby="prompt-to-post-title"
    >
      <div className="w-full max-w-6xl max-h-[92vh] flex flex-col rounded-3xl border border-slate-900/10 dark:border-white/15 bg-white dark:bg-[#0B1221] shadow-2xl overflow-hidden">
        {/* Header */}
        <header className="flex items-center justify-between gap-4 px-5 sm:px-6 py-4 border-b border-slate-900/10 dark:border-white/10 bg-slate-50/80 dark:bg-white/[0.03]">
          <div className="flex items-center gap-3 min-w-0">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-[#FF5A4E] to-[#F4A048] text-white shadow-md shadow-[#FF5A4E]/25">
              <Wand2 className="h-5 w-5" aria-hidden="true" />
            </div>
            <div className="min-w-0">
              <h2
                id="prompt-to-post-title"
                className="font-display text-lg sm:text-xl font-extrabold text-slate-900 dark:text-white truncate"
              >
                Prompt-to-Post · Generador de Guion Kinetic + SFX
              </h2>
              <p className="text-xs text-slate-600 dark:text-slate-300 truncate">
                Pega una idea o tabla (Tiempo · Presentador · Texto Kinetic · SFX) y crea la tarjeta Kanban + timeline Remotion 9:16 al instante.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar asistente Prompt-to-Post"
            className="rounded-xl p-2 text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-slate-900/5 dark:hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </header>

        {/* Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-5">
          {/* Prompt Input & Parsers */}
          <section className="rounded-2xl border border-slate-900/10 dark:border-white/12 bg-slate-50/70 dark:bg-white/[0.03] p-4 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <label
                htmlFor="prompt-script-input"
                className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-200 flex items-center gap-1.5"
              >
                <FileSpreadsheet className="h-4 w-4 text-[#F4A048]" aria-hidden="true" />
                <span>Prompt o Tabla de Guion (Tabulado, Pipe | o Idea libre)</span>
              </label>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={handleLoadExample}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-[#F4A048]/40 bg-[#F4A048]/10 px-3 py-1.5 text-xs font-bold text-[#C86D14] dark:text-[#F4A048] hover:bg-[#F4A048]/20 transition-colors cursor-pointer"
                >
                  <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>Cargar ejemplo: Música todo el año (45–50 s)</span>
                </button>
              </div>
            </div>

            {customTemplates.length > 0 && (
              <div className="flex flex-wrap items-center gap-2 pt-1">
                <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 inline-flex items-center gap-1">
                  <Bookmark className="h-3.5 w-3.5" aria-hidden="true" />
                  Mis plantillas guardadas:
                </span>
                {customTemplates.map((tpl) => (
                  <button
                    key={tpl.id}
                    type="button"
                    onClick={() => handleLoadCustomTemplate(tpl)}
                    className="rounded-lg border border-slate-900/12 dark:border-white/15 bg-white dark:bg-white/8 px-2.5 py-1 text-[11px] font-semibold text-slate-700 dark:text-slate-200 hover:border-[#FF5A4E] transition-colors cursor-pointer"
                  >
                    {tpl.name} ({tpl.beats.length} beats)
                  </button>
                ))}
              </div>
            )}

            <textarea
              id="prompt-script-input"
              rows={7}
              value={rawPrompt}
              onChange={(e) => setRawPrompt(e.target.value)}
              placeholder="Pega aquí tu guion con columnas (Tiempo, Presentador dice, Texto kinetic en pantalla, SFX) o escribe una idea breve..."
              className="w-full rounded-xl border border-slate-900/12 dark:border-white/15 bg-white dark:bg-[#080E1A] p-3 text-xs font-mono text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-[#F4A048]"
            />

            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-2.5">
                <button
                  type="button"
                  onClick={handleParseLocal}
                  className="inline-flex items-center gap-2 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 px-4 py-2 text-xs font-bold hover:opacity-90 transition-opacity cursor-pointer"
                >
                  <Layers className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>Analizar Prompt (Local)</span>
                </button>

                <button
                  type="button"
                  onClick={handleExpandWithGemini}
                  disabled={aiLoading}
                  className="inline-flex items-center gap-2 rounded-xl border border-[#FF5A4E]/40 bg-[#FF5A4E]/10 px-4 py-2 text-xs font-bold text-[#FF5A4E] hover:bg-[#FF5A4E]/20 disabled:opacity-50 transition-colors cursor-pointer"
                >
                  <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>
                    {aiLoading ? 'Generando con Gemini...' : 'Expandir con Gemini IA (Opcional)'}
                  </span>
                </button>
              </div>

              <div className="text-xs font-semibold text-slate-600 dark:text-slate-300 tabular-nums">
                {beats.length} escenas · {computedDurationSec} s · {sfxActiveCount} SFX activos
              </div>
            </div>

            {feedback && (
              <div
                className={`rounded-xl border px-3.5 py-2.5 text-xs font-medium ${
                  feedback.type === 'error'
                    ? 'border-amber-500/40 bg-amber-500/10 text-amber-800 dark:text-amber-200'
                    : 'border-emerald-500/35 bg-emerald-500/10 text-emerald-800 dark:text-emerald-200'
                }`}
              >
                {feedback.text}
              </div>
            )}
          </section>

          {/* Post Metadata Configuration */}
          <section className="rounded-2xl border border-slate-900/10 dark:border-white/12 bg-white/70 dark:bg-white/[0.03] p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="sm:col-span-2">
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">
                Título / Subtema del Post
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full rounded-xl border border-slate-900/12 dark:border-white/15 bg-white dark:bg-[#080E1A] px-3 py-2 text-xs font-semibold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#F4A048]"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">
                Fecha Programada
              </label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full rounded-xl border border-slate-900/12 dark:border-white/15 bg-white dark:bg-[#080E1A] px-3 py-2 text-xs font-semibold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#F4A048]"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">
                Columna Kanban Inicial
              </label>
              <select
                value={targetStage}
                onChange={(e) =>
                  setTargetStage(e.target.value as ProductionStatus)
                }
                className="w-full rounded-xl border border-slate-900/12 dark:border-white/15 bg-white dark:bg-[#080E1A] px-3 py-2 text-xs font-semibold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#F4A048]"
              >
                {PRODUCTION_STAGES.map((stage) => (
                  <option key={stage} value={stage}>
                    {stage}
                  </option>
                ))}
              </select>
            </div>

            <div className="sm:col-span-2">
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">
                Idea Central / Nota de Rodaje
              </label>
              <input
                type="text"
                value={coreIdea}
                onChange={(e) => setCoreIdea(e.target.value)}
                className="w-full rounded-xl border border-slate-900/12 dark:border-white/15 bg-white dark:bg-[#080E1A] px-3 py-2 text-xs text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-[#F4A048]"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">
                Audiencia / Categoría
              </label>
              <input
                type="text"
                value={audienceName}
                onChange={(e) => setAudienceName(e.target.value)}
                className="w-full rounded-xl border border-slate-900/12 dark:border-white/15 bg-white dark:bg-[#080E1A] px-3 py-2 text-xs text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-[#F4A048]"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">
                Estilo Kinetic Remotion
              </label>
              <select
                value={subtitlePreset}
                onChange={(e) =>
                  setSubtitlePreset(e.target.value as SubtitlePreset)
                }
                className="w-full rounded-xl border border-slate-900/12 dark:border-white/15 bg-white dark:bg-[#080E1A] px-3 py-2 text-xs font-semibold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#F4A048]"
              >
                {SUBTITLE_PRESETS.map((preset) => (
                  <option key={preset} value={preset}>
                    {preset}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">
                Pilar
              </label>
              <select
                value={pillar}
                onChange={(e) => setPillar(e.target.value as PillarName)}
                className="w-full rounded-xl border border-slate-900/12 dark:border-white/15 bg-white dark:bg-[#080E1A] px-3 py-2 text-xs font-semibold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#F4A048]"
              >
                {PILLAR_OPTIONS.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">
                Embudo
              </label>
              <select
                value={funnelStage}
                onChange={(e) => setFunnelStage(e.target.value as FunnelStage)}
                className="w-full rounded-xl border border-slate-900/12 dark:border-white/15 bg-white dark:bg-[#080E1A] px-3 py-2 text-xs font-semibold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#F4A048]"
              >
                {FUNNEL_OPTIONS.map((f) => (
                  <option key={f} value={f}>
                    {f}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">
                Concepto
              </label>
              <select
                value={concept}
                onChange={(e) => setConcept(e.target.value as ContentConcept)}
                className="w-full rounded-xl border border-slate-900/12 dark:border-white/15 bg-white dark:bg-[#080E1A] px-3 py-2 text-xs font-semibold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#F4A048]"
              >
                {CONTENT_CONCEPTS.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">
                Formato de Voz
              </label>
              <select
                value={voice}
                onChange={(e) => setVoice(e.target.value as VoiceType)}
                className="w-full rounded-xl border border-slate-900/12 dark:border-white/15 bg-white dark:bg-[#080E1A] px-3 py-2 text-xs font-semibold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#F4A048]"
              >
                {VOICE_OPTIONS.map((v) => (
                  <option key={v} value={v}>
                    {v}
                  </option>
                ))}
              </select>
            </div>
          </section>

          {/* Editable Beats Grid */}
          <section className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  Escenas Cronometradas, Tarjetas Kinetic &amp; Cues SFX
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Cada fila genera automáticamente un cue visual en Remotion y un disparo de audio sintetizado en la pista SFX.
                </p>
              </div>
              <button
                type="button"
                onClick={handleAddBeat}
                className="inline-flex items-center gap-1.5 rounded-xl border border-slate-900/12 dark:border-white/15 bg-white dark:bg-white/8 px-3 py-1.5 text-xs font-bold text-slate-800 dark:text-white hover:border-[#F4A048] transition-colors cursor-pointer"
              >
                <Plus className="h-3.5 w-3.5" aria-hidden="true" />
                <span>Añadir escena</span>
              </button>
            </div>

            <div className="space-y-2.5">
              {beats.map((beat, idx) => (
                <div
                  key={beat.id}
                  className="rounded-2xl border border-slate-900/10 dark:border-white/12 bg-white/80 dark:bg-white/[0.03] p-3.5 space-y-2.5"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="inline-flex h-6 min-w-6 items-center justify-center rounded-lg bg-slate-900 dark:bg-white text-[11px] font-extrabold text-white dark:text-slate-900 px-1.5 tabular-nums">
                        #{idx + 1}
                      </span>
                      <select
                        value={beat.role}
                        aria-label={`Rol de escena ${idx + 1}`}
                        onChange={(e) =>
                          updateBeat(beat.id, {
                            role: e.target.value as KineticBeat['role'],
                          })
                        }
                        className="rounded-lg border border-slate-900/12 dark:border-white/15 bg-white dark:bg-[#080E1A] px-2 py-1 text-[11px] font-bold uppercase text-slate-800 dark:text-slate-100"
                      >
                        {ROLE_OPTIONS.map((role) => (
                          <option key={role} value={role}>
                            {role}
                          </option>
                        ))}
                      </select>

                      <div className="flex items-center gap-1 text-xs">
                        <input
                          type="number"
                          min={0}
                          step={0.5}
                          aria-label={`Inicio escena ${idx + 1}`}
                          value={beat.startSec}
                          onChange={(e) =>
                            updateBeat(beat.id, {
                              startSec: Math.max(0, Number(e.target.value) || 0),
                            })
                          }
                          className="w-16 rounded-lg border border-slate-900/12 dark:border-white/15 bg-white dark:bg-[#080E1A] px-2 py-1 text-xs font-mono text-slate-900 dark:text-white tabular-nums"
                        />
                        <span className="text-slate-400">–</span>
                        <input
                          type="number"
                          min={0.5}
                          step={0.5}
                          aria-label={`Fin escena ${idx + 1}`}
                          value={beat.endSec}
                          onChange={(e) =>
                            updateBeat(beat.id, {
                              endSec: Math.max(
                                beat.startSec + 0.5,
                                Number(e.target.value) || beat.startSec + 1
                              ),
                            })
                          }
                          className="w-16 rounded-lg border border-slate-900/12 dark:border-white/15 bg-white dark:bg-[#080E1A] px-2 py-1 text-xs font-mono text-slate-900 dark:text-white tabular-nums"
                        />
                        <span className="text-[11px] text-slate-500 dark:text-slate-400">
                          s
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="inline-flex items-center gap-1 rounded-lg border border-[#F4A048]/35 bg-[#F4A048]/10 px-2 py-1 text-[11px] font-semibold text-[#C86D14] dark:text-[#F4A048]">
                        <Volume2 className="h-3 w-3" aria-hidden="true" />
                        <span>SFX: {beat.sfxKind}</span>
                      </span>
                      {beats.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveBeat(beat.id)}
                          aria-label={`Eliminar escena ${idx + 1}`}
                          className="rounded-lg p-1.5 text-slate-400 hover:text-[#FF5A4E] hover:bg-[#FF5A4E]/10 transition-colors cursor-pointer"
                        >
                          <Trash2 className="h-4 w-4" aria-hidden="true" />
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-2.5">
                    <div className="lg:col-span-4">
                      <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">
                        Presentador dice (Locución)
                      </label>
                      <textarea
                        rows={2}
                        value={beat.spokenText}
                        onChange={(e) =>
                          updateBeat(beat.id, { spokenText: e.target.value })
                        }
                        className="w-full rounded-xl border border-slate-900/12 dark:border-white/15 bg-white dark:bg-[#080E1A] px-2.5 py-1.5 text-xs text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-[#F4A048]"
                      />
                    </div>

                    <div className="lg:col-span-4">
                      <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">
                        Texto Kinetic en Pantalla
                      </label>
                      <textarea
                        rows={2}
                        value={beat.kineticText}
                        onChange={(e) =>
                          updateBeat(beat.id, { kineticText: e.target.value })
                        }
                        className="w-full rounded-xl border border-slate-900/12 dark:border-white/15 bg-white dark:bg-[#080E1A] px-2.5 py-1.5 text-xs font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#F4A048]"
                      />
                    </div>

                    <div className="lg:col-span-2">
                      <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">
                        Palabra &amp; Color Destacado
                      </label>
                      <div className="flex items-center gap-1.5 mb-1.5">
                        <input
                          type="text"
                          placeholder="Ej: VACACIONES"
                          value={beat.highlightWord ?? ''}
                          onChange={(e) =>
                            updateBeat(beat.id, {
                              highlightWord: e.target.value || undefined,
                            })
                          }
                          className="w-full rounded-lg border border-slate-900/12 dark:border-white/15 bg-white dark:bg-[#080E1A] px-2 py-1 text-xs text-slate-800 dark:text-white"
                        />
                        <input
                          type="color"
                          aria-label={`Color destacado escena ${idx + 1}`}
                          value={beat.highlightColor || '#F4A048'}
                          onChange={(e) =>
                            updateBeat(beat.id, { highlightColor: e.target.value })
                          }
                          className="h-7 w-7 shrink-0 rounded-lg border border-slate-900/15 dark:border-white/20 bg-transparent cursor-pointer"
                        />
                      </div>
                      <div className="flex items-center gap-1">
                        {ACCENT_SWATCHES.map((swatch) => (
                          <button
                            key={swatch.hex}
                            type="button"
                            onClick={() =>
                              updateBeat(beat.id, { highlightColor: swatch.hex })
                            }
                            aria-label={`Aplicar color ${swatch.hex}`}
                            className={`h-4 w-4 rounded-full border cursor-pointer transition-transform ${swatch.bgClass} ${
                              (beat.highlightColor || '#F4A048').toLowerCase() ===
                              swatch.hex.toLowerCase()
                                ? 'scale-110 border-slate-900 dark:border-white ring-1 ring-offset-1 ring-[#F4A048]'
                                : 'border-white/30'
                            }`}
                          />
                        ))}
                      </div>
                    </div>

                    <div className="lg:col-span-2">
                      <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">
                        SFX &amp; Modo Secuencial
                      </label>
                      <input
                        type="text"
                        placeholder="whoosh / pop / ding"
                        value={beat.sfxLabel}
                        onChange={(e) =>
                          updateBeat(beat.id, { sfxLabel: e.target.value })
                        }
                        className="w-full rounded-lg border border-slate-900/12 dark:border-white/15 bg-white dark:bg-[#080E1A] px-2 py-1 text-xs text-slate-800 dark:text-white mb-1.5"
                      />
                      <input
                        type="text"
                        placeholder="Secuencial: PIANO, GUITARRA..."
                        value={beat.stepByStepItems?.join(', ') ?? ''}
                        onChange={(e) => {
                          const items = e.target.value
                            .split(/[·,|]/)
                            .map((s) => s.trim())
                            .filter(Boolean);
                          updateBeat(beat.id, {
                            stepByStepItems: items.length > 1 ? items : undefined,
                          });
                        }}
                        className="w-full rounded-lg border border-slate-900/12 dark:border-white/15 bg-white dark:bg-[#080E1A] px-2 py-1 text-[11px] text-slate-700 dark:text-slate-200"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>

        {/* Footer */}
        <footer className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-5 sm:px-6 py-4 border-t border-slate-900/10 dark:border-white/10 bg-slate-50/90 dark:bg-white/[0.03]">
          <div className="flex flex-wrap items-center gap-2.5">
            <label className="inline-flex items-center gap-2 text-xs font-semibold text-slate-700 dark:text-slate-200 cursor-pointer">
              <input
                type="checkbox"
                checked={saveAsTemplate}
                onChange={(e) => setSaveAsTemplate(e.target.checked)}
                className="h-4 w-4 rounded border-slate-300 text-[#FF5A4E] focus:ring-[#FF5A4E]"
              />
              <span>Guardar también como plantilla reutilizable</span>
            </label>
            {saveAsTemplate && (
              <input
                type="text"
                placeholder="Nombre de plantilla (opcional)"
                value={templateName}
                onChange={(e) => setTemplateName(e.target.value)}
                className="rounded-xl border border-slate-900/12 dark:border-white/15 bg-white dark:bg-[#080E1A] px-3 py-1.5 text-xs text-slate-800 dark:text-white"
              />
            )}
          </div>

          <div className="flex flex-wrap items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-slate-900/12 dark:border-white/15 px-4 py-2.5 text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-900/5 dark:hover:bg-white/10 transition-colors cursor-pointer"
            >
              Cancelar
            </button>

            <button
              type="button"
              onClick={() => handleCreate(false)}
              className="inline-flex items-center gap-2 rounded-xl border border-[#F4A048]/45 bg-[#F4A048]/12 px-4 py-2.5 text-xs font-bold text-[#C86D14] dark:text-[#F4A048] hover:bg-[#F4A048]/20 transition-colors cursor-pointer"
            >
              <Plus className="h-4 w-4" aria-hidden="true" />
              <span>Crear en Kanban</span>
            </button>

            <button
              type="button"
              onClick={() => handleCreate(true)}
              className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#FF5A4E] to-[#F4A048] px-5 py-2.5 text-xs font-bold text-white shadow-md shadow-[#FF5A4E]/25 hover:opacity-95 transition-opacity cursor-pointer"
            >
              <Clapperboard className="h-4 w-4" aria-hidden="true" />
              <span>Crear y Abrir Studio 9:16</span>
            </button>
          </div>
        </footer>
      </div>
    </div>
  );
};
