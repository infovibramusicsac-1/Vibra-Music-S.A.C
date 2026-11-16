import React, { useEffect, useRef, useState } from 'react';
import {
  BookmarkPlus,
  Camera,
  CheckCircle2,
  Download,
  FileJson,
  Film,
  HardDrive,
  Image as ImageIcon,
  Layers,
  Plus,
  RotateCcw,
  Sparkles,
  Sticker,
  Trash2,
  Type,
  Upload,
} from 'lucide-react';
import { applyStudioTemplateToPiece } from '../../../application/use-cases/PieceWorkflowUseCases';
import type {
  ContentPiece,
  LocalBridgeStatus,
  LocalMediaFile,
  RenderJob,
  SubtitleCue,
} from '../../../domain/entities';
import {
  CAMERA_MOTION_PRESETS,
  COLOR_GRADE_PRESETS,
  CTA_STICKER_STYLES,
  DEFAULT_REMOTION_STYLE,
  HOOK_BANNER_STYLES,
  KINETIC_ANIMATION_PRESETS,
  REMOTION_FONT_FAMILIES,
  SUBTITLE_PRESETS,
  TRANSITION_PRESETS,
  VIBRA_STUDIO_TEMPLATES,
  type KineticPresetCard,
  type RemotionFontFamily,
  type RemotionStyleConfig,
  type StudioTemplatePreset,
  type TextAnimationStyle,
  type TransitionPreset,
} from '../../../domain/value-objects';
import { useVibraServices } from '../../context/VibraServicesContext';

interface SubtitleRenderPanelProps {
  piece: ContentPiece;
  totalDurationSec: number;
  onUpdate: (next: ContentPiece) => void;
  onCommitRender: (renderedPiece: ContentPiece) => void;
}

type InspectorSubTab = 'typography' | 'camera' | 'stickers';

const ACCENT_SWATCHES = [
  { hex: '#F4A048', bgClass: 'bg-[#F4A048]' },
  { hex: '#FF5A4E', bgClass: 'bg-[#FF5A4E]' },
  { hex: '#F5A623', bgClass: 'bg-[#F5A623]' },
  { hex: '#10B981', bgClass: 'bg-[#10B981]' },
  { hex: '#38BDF8', bgClass: 'bg-[#38BDF8]' },
  { hex: '#FFFFFF', bgClass: 'bg-white' },
];

const TRANSITION_HINTS: Record<TransitionPreset, string> = {
  Corte: 'Corte directo',
  Fade: 'Fundido suave',
  Slide: 'Entrada lateral',
  Wipe: 'Barrido vertical',
  Flash: 'Destello blanco',
  'Cross Zoom': 'Zoom + Blur',
  Glitch: 'Corte RGB',
  'Flip 3D': 'Giro 3D',
};

function getFontPreviewClass(font: RemotionFontFamily): string {
  switch (font) {
    case 'Oswald':
      return "font-['Oswald',sans-serif] tracking-wide";
    case 'Playfair Display':
      return "font-['Playfair_Display',serif]";
    case 'JetBrains Mono':
      return 'font-mono';
    default:
      return 'font-display';
  }
}

function getAccentPreviewClass(hex: string): string {
  switch (hex.toUpperCase()) {
    case '#FF5A4E':
      return 'text-[#FF5A4E]';
    case '#F5A623':
      return 'text-[#F5A623]';
    case '#38BDF8':
      return 'text-[#38BDF8]';
    default:
      return 'text-[#F4A048]';
  }
}

function getKineticHoverClass(anim: TextAnimationStyle): string {
  switch (anim) {
    case 'Pop Spring':
      return 'transition-transform duration-200 group-hover:scale-105';
    case 'Scale Slam':
      return 'transition-transform duration-150 group-hover:scale-110';
    case 'Slide Up':
      return 'transition-transform duration-200 group-hover:-translate-y-0.5';
    case 'Word Bounce':
      return 'transition-transform duration-200 group-hover:-translate-y-1';
    case 'Typewriter':
      return 'transition-opacity duration-200 group-hover:opacity-80';
  }
}

function downloadBlob(filename: string, blob: Blob): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function downloadFile(filename: string, content: string, mime: string): void {
  downloadBlob(filename, new Blob([content], { type: mime }));
}

export const SubtitleRenderPanel: React.FC<SubtitleRenderPanelProps> = ({
  piece,
  totalDurationSec,
  onUpdate,
  onCommitRender,
}) => {
  const {
    batchRenderer,
    localMedia,
    customStylePresets,
    saveCustomStylePreset,
    deleteCustomStylePreset,
    importCustomStylePresets,
  } = useVibraServices();

  const [subTab, setSubTab] = useState<InspectorSubTab>('typography');
  const [rendering, setRendering] = useState(false);
  const [activeJob, setActiveJob] = useState<RenderJob | undefined>(
    piece.lastRenderJob
  );

  // Custom preset form & kinetic preview mode
  const [savingPresetOpen, setSavingPresetOpen] = useState(false);
  const [newPresetName, setNewPresetName] = useState('');
  const [presetNotice, setPresetNotice] = useState<string | null>(null);
  const [kineticApplyCombo, setKineticApplyCombo] = useState(true);
  const importInputRef = useRef<HTMLInputElement | null>(null);

  // Remotion WebCodecs MP4 export state
  const [mp4Exporting, setMp4Exporting] = useState(false);
  const [mp4Progress, setMp4Progress] = useState(0);
  const [mp4StatusText, setMp4StatusText] = useState('');
  const [mp4Error, setMp4Error] = useState<string | null>(null);
  const [mp4Result, setMp4Result] = useState<{
    blob: Blob;
    url: string;
    durationSec: number;
    hasAudio: boolean;
  } | null>(null);

  const [bridgeStatus, setBridgeStatus] = useState<LocalBridgeStatus | null>(
    null
  );
  const [expressResources, setExpressResources] = useState<LocalMediaFile[]>(
    []
  );
  const [diskSaveMessage, setDiskSaveMessage] = useState<string | null>(null);

  useEffect(() => {
    void localMedia.checkExpressBridge().then(setBridgeStatus);
    void localMedia
      .listExpressMedia('resources')
      .then((files) =>
        setExpressResources(files.filter((f) => f.kind === 'image'))
      )
      .catch(() => setExpressResources([]));
  }, [localMedia]);

  useEffect(() => {
    return () => {
      if (mp4Result?.url) {
        URL.revokeObjectURL(mp4Result.url);
      }
    };
  }, [mp4Result]);

  const styleConfig: RemotionStyleConfig = {
    ...DEFAULT_REMOTION_STYLE,
    ...(piece.styleConfig ?? {}),
  };
  const cameraIntensity =
    styleConfig.cameraIntensity ?? DEFAULT_REMOTION_STYLE.cameraIntensity;

  const updateStyle = (patch: Partial<RemotionStyleConfig>) => {
    onUpdate({
      ...piece,
      styleConfig: {
        ...styleConfig,
        ...patch,
      },
    });
  };

  const handleApplyKineticPreset = (card: KineticPresetCard) => {
    if (!kineticApplyCombo) {
      updateStyle({ textAnimation: card.textAnimation });
      return;
    }
    onUpdate({
      ...piece,
      subtitlePreset: card.subtitlePreset,
      styleConfig: {
        ...styleConfig,
        textAnimation: card.textAnimation,
        fontFamily: card.fontFamily,
        accentColor: card.accentColor,
        uppercase: card.uppercase,
      },
    });
  };

  const cues: SubtitleCue[] = batchRenderer.buildSubtitleCues(
    piece,
    totalDurationSec
  );
  const isCustomized = Boolean(
    piece.customSubtitleCues && piece.customSubtitleCues.length > 0
  );

  const updateCues = (nextCues: SubtitleCue[]) => {
    const normalized = nextCues.map((c, idx) => ({ ...c, index: idx + 1 }));
    onUpdate({
      ...piece,
      customSubtitleCues: normalized,
    });
  };

  const handleCueChange = (index: number, patch: Partial<SubtitleCue>) => {
    const next = cues.map((cue, idx) =>
      idx === index ? { ...cue, ...patch } : cue
    );
    updateCues(next);
  };

  const handleAddCue = () => {
    const lastEnd = cues.length > 0 ? cues[cues.length - 1].endSec : 0;
    const nextCue: SubtitleCue = {
      index: cues.length + 1,
      startSec: Number(lastEnd.toFixed(1)),
      endSec: Number((lastEnd + 2.5).toFixed(1)),
      text: 'Nueva frase de subtítulo',
      highlightWord: 'subtítulo',
    };
    updateCues([...cues, nextCue]);
  };

  const handleRemoveCue = (index: number) => {
    updateCues(cues.filter((_, idx) => idx !== index));
  };

  const handleRegenerateFromScript = () => {
    const fresh = batchRenderer.buildSubtitleCues(
      piece,
      totalDurationSec,
      true
    );
    onUpdate({
      ...piece,
      customSubtitleCues: fresh,
    });
  };

  const handleSavePreset = () => {
    const cleanName = newPresetName.trim() || `Preset ${piece.subtopic.slice(0, 22)}`;
    const newPreset: StudioTemplatePreset = {
      id: `custom-tpl-${Date.now().toString(36)}`,
      name: cleanName,
      description: `${styleConfig.fontFamily} · ${styleConfig.cameraMotion} · ${styleConfig.ctaSticker}`,
      subtitlePreset: piece.subtitlePreset,
      transitionPreset: piece.transitionPreset ?? 'Fade',
      transitionDurationSec: piece.transitionDurationSec ?? 0.4,
      karaokeMode: piece.karaokeMode !== false,
      showProgressBar: piece.showProgressBar !== false,
      showWaveform: piece.showWaveform ?? false,
      hookDurationSec: piece.hookDurationSec ?? 3.2,
      ctaDurationSec: piece.ctaDurationSec ?? 3.2,
      bgmTrackId: piece.bgmTrackId,
      bgmVolume: piece.bgmVolume,
      styleConfig: { ...styleConfig },
      isCustom: true,
    };
    saveCustomStylePreset(newPreset);
    onUpdate({ ...piece, appliedTemplateId: newPreset.id });
    setNewPresetName('');
    setSavingPresetOpen(false);
    setPresetNotice(`Preset «${cleanName}» guardado en Studio y disponible en Batch Render.`);
  };

  const handleExportPresetsJson = () => {
    const payload =
      customStylePresets.length > 0
        ? customStylePresets
        : [
            {
              id: `export-style-${Date.now().toString(36)}`,
              name: piece.subtopic || 'Estilo Vibra Studio',
              description: `${styleConfig.fontFamily} · ${styleConfig.cameraMotion}`,
              subtitlePreset: piece.subtitlePreset,
              transitionPreset: piece.transitionPreset ?? 'Fade',
              transitionDurationSec: piece.transitionDurationSec ?? 0.4,
              karaokeMode: piece.karaokeMode !== false,
              showProgressBar: piece.showProgressBar !== false,
              showWaveform: piece.showWaveform ?? false,
              hookDurationSec: piece.hookDurationSec ?? 3.2,
              ctaDurationSec: piece.ctaDurationSec ?? 3.2,
              bgmTrackId: piece.bgmTrackId,
              bgmVolume: piece.bgmVolume,
              styleConfig,
              isCustom: true,
            },
          ];
    downloadFile(
      'vibra_studio_presets.json',
      JSON.stringify(payload, null, 2),
      'application/json;charset=utf-8'
    );
    setPresetNotice('Presets exportados en vibra_studio_presets.json.');
  };

  const handleImportPresetsJson = async (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const parsed = JSON.parse(text) as unknown;
      const list = Array.isArray(parsed) ? parsed : [parsed];
      const valid = list.filter(
        (item): item is StudioTemplatePreset =>
          Boolean(item) &&
          typeof item === 'object' &&
          typeof (item as StudioTemplatePreset).name === 'string' &&
          typeof (item as StudioTemplatePreset).subtitlePreset === 'string'
      );
      if (valid.length > 0) {
        importCustomStylePresets(valid);
        setPresetNotice(`Se importaron ${valid.length} preset(s) propios.`);
      } else {
        setPresetNotice('El JSON no contiene presets válidos de Vibra Studio.');
      }
    } catch {
      setPresetNotice('No se pudo leer el archivo JSON de presets.');
    } finally {
      e.target.value = '';
    }
  };

  const handleRenderPiece = async () => {
    if (rendering) return;
    setRendering(true);
    const completed = await batchRenderer.renderPiece(
      piece,
      piece.subtitlePreset,
      ({ job }) => {
        setActiveJob(job);
      }
    );
    setActiveJob(completed);
    onCommitRender({
      ...piece,
      status: 'Listo',
      lastRenderJob: completed,
    });
    setRendering(false);
  };

  const handleExportMp4 = async () => {
    if (mp4Exporting) return;
    setMp4Exporting(true);
    setMp4Error(null);
    setMp4Progress(0);
    setMp4StatusText('Preparando render Remotion…');
    setDiskSaveMessage(null);

    try {
      const res = await batchRenderer.exportMp4OnWeb(
        piece,
        totalDurationSec,
        (pct, statusText) => {
          setMp4Progress(pct);
          setMp4StatusText(statusText);
        }
      );

      if (mp4Result?.url) {
        URL.revokeObjectURL(mp4Result.url);
      }
      const url = URL.createObjectURL(res.blob);
      setMp4Result({
        blob: res.blob,
        url,
        durationSec: res.durationSec,
        hasAudio: res.hasAudio,
      });
    } catch (err) {
      setMp4Error(
        err instanceof Error
          ? err.message
          : 'No se pudo exportar el .MP4 con WebCodecs.'
      );
    } finally {
      setMp4Exporting(false);
    }
  };

  const handleSaveToExpressDisk = async (filename: string, blob: Blob) => {
    setDiskSaveMessage(null);
    try {
      const saved = await localMedia.saveExportToExpressDisk(filename, blob);
      setDiskSaveMessage(`Guardado en ${saved.savedPath}`);
    } catch (err) {
      setDiskSaveMessage(
        err instanceof Error
          ? err.message
          : 'No se pudo guardar en el disco local.'
      );
    }
  };

  const allPresets = [...customStylePresets, ...VIBRA_STUDIO_TEMPLATES];
  const transitionPreset = piece.transitionPreset ?? 'Fade';
  const transitionDurationSec = piece.transitionDurationSec ?? 0.4;
  const karaokeMode = piece.karaokeMode !== false;
  const showProgressBar = piece.showProgressBar !== false;
  const showWaveform = piece.showWaveform ?? false;

  return (
    <div className="space-y-4">
      {/* Studio Templates & Custom Reusable Presets */}
      <div className="space-y-2.5 rounded-2xl border border-slate-900/10 dark:border-white/12 bg-white/60 dark:bg-white/[0.03] p-3.5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-1.5">
            <Layers className="h-3.5 w-3.5 text-[#FF5A4E]" aria-hidden="true" />
            <h4 className="font-display text-xs font-bold uppercase tracking-wide text-slate-700 dark:text-slate-200">
              Plantillas &amp; Presets Propios
            </h4>
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            <button
              type="button"
              onClick={() => setSavingPresetOpen((prev) => !prev)}
              className="inline-flex items-center gap-1 rounded-lg border border-[#F4A048]/45 bg-[#F4A048]/12 px-2.5 py-1 text-[11px] font-bold text-[#C86D14] dark:text-[#F4A048] hover:bg-[#F4A048]/20 cursor-pointer"
            >
              <BookmarkPlus className="h-3 w-3" aria-hidden="true" />
              <span>Guardar Preset</span>
            </button>
            <button
              type="button"
              onClick={handleExportPresetsJson}
              className="inline-flex items-center gap-1 rounded-lg border border-slate-900/12 dark:border-white/14 px-2 py-1 text-[11px] font-medium text-slate-700 dark:text-slate-200 hover:border-[#F5A623] cursor-pointer"
              title="Exportar presets propios en .json"
            >
              <Download className="h-3 w-3" aria-hidden="true" />
              <span>JSON</span>
            </button>
            <button
              type="button"
              onClick={() => importInputRef.current?.click()}
              className="inline-flex items-center gap-1 rounded-lg border border-slate-900/12 dark:border-white/14 px-2 py-1 text-[11px] font-medium text-slate-700 dark:text-slate-200 hover:border-[#FF5A4E] cursor-pointer"
              title="Importar presets desde archivo .json"
            >
              <Upload className="h-3 w-3" aria-hidden="true" />
              <span>Importar</span>
            </button>
            <input
              ref={importInputRef}
              type="file"
              accept=".json,application/json"
              onChange={(e) => void handleImportPresetsJson(e)}
              className="sr-only"
            />
          </div>
        </div>

        {savingPresetOpen && (
          <div className="flex flex-col sm:flex-row gap-2 rounded-xl border border-[#F4A048]/35 bg-[#F4A048]/8 p-2.5">
            <input
              type="text"
              value={newPresetName}
              onChange={(e) => setNewPresetName(e.target.value)}
              placeholder="Ej: Vibra Verano Oswald + Zoom"
              className="flex-1 rounded-lg border border-slate-900/12 dark:border-white/15 bg-white dark:bg-[#0B1221] px-2.5 py-1.5 text-xs text-slate-900 dark:text-white"
            />
            <button
              type="button"
              onClick={handleSavePreset}
              className="rounded-lg bg-[#FF5A4E] px-3 py-1.5 text-xs font-bold text-white hover:opacity-95 cursor-pointer"
            >
              Guardar estilo actual
            </button>
          </div>
        )}

        {presetNotice && (
          <p className="text-[11px] font-medium text-emerald-700 dark:text-emerald-300">
            {presetNotice}
          </p>
        )}

        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {allPresets.map((tpl) => {
            const active = piece.appliedTemplateId === tpl.id;
            return (
              <div
                key={tpl.id}
                className={`relative rounded-xl border p-2.5 transition-colors ${
                  active
                    ? 'border-[#FF5A4E] bg-[#FF5A4E]/14'
                    : 'border-slate-900/10 dark:border-white/10 hover:border-[#F5A623]/60'
                }`}
              >
                <button
                  type="button"
                  onClick={() => onUpdate(applyStudioTemplateToPiece(piece, tpl))}
                  className="w-full text-left cursor-pointer pr-6"
                >
                  <p className="text-xs font-bold text-slate-900 dark:text-white truncate">
                    {tpl.isCustom ? `★ ${tpl.name}` : tpl.name}
                  </p>
                  <p className="text-[11px] text-slate-600 dark:text-slate-300 mt-0.5 truncate">
                    {tpl.description}
                  </p>
                </button>
                {tpl.isCustom && (
                  <button
                    type="button"
                    aria-label={`Eliminar preset ${tpl.name}`}
                    onClick={() => deleteCustomStylePreset(tpl.id)}
                    className="absolute top-2.5 right-2 rounded p-1 text-slate-400 hover:text-rose-500 cursor-pointer"
                  >
                    <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Remotion Deep Style & Motion Inspector (3 Sub-Tabs) */}
      <div className="rounded-2xl border border-slate-900/10 dark:border-white/12 bg-white/60 dark:bg-white/[0.03] p-3.5 space-y-3.5">
        <div className="flex flex-wrap items-center gap-1 rounded-xl bg-slate-900/6 dark:bg-white/6 p-1">
          <button
            type="button"
            onClick={() => setSubTab('typography')}
            className={`flex-1 inline-flex items-center justify-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap ${
              subTab === 'typography'
                ? 'bg-white dark:bg-[#111B33] text-slate-900 dark:text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Type className="h-3.5 w-3.5" aria-hidden="true" />
            <span>Tipografía &amp; Texto</span>
          </button>

          <button
            type="button"
            onClick={() => setSubTab('camera')}
            className={`flex-1 inline-flex items-center justify-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap ${
              subTab === 'camera'
                ? 'bg-white dark:bg-[#111B33] text-slate-900 dark:text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Camera className="h-3.5 w-3.5" aria-hidden="true" />
            <span>Cámara, Color &amp; FX</span>
          </button>

          <button
            type="button"
            onClick={() => setSubTab('stickers')}
            className={`flex-1 inline-flex items-center justify-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap ${
              subTab === 'stickers'
                ? 'bg-white dark:bg-[#111B33] text-slate-900 dark:text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Sticker className="h-3.5 w-3.5" aria-hidden="true" />
            <span>Hook, Stickers &amp; PiP</span>
          </button>
        </div>

        {/* Sub-Tab 1: Typography, Colors, Position Y & Text Animation */}
        {subTab === 'typography' && (
          <div className="space-y-3.5">
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
              {SUBTITLE_PRESETS.map((preset) => {
                const active = piece.subtitlePreset === preset;
                return (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => onUpdate({ ...piece, subtitlePreset: preset })}
                    className={`rounded-xl border p-2.5 text-left transition-all cursor-pointer ${
                      active
                        ? 'border-[#FF5A4E] bg-[#FF5A4E]/14'
                        : 'border-slate-900/12 dark:border-white/12 hover:bg-slate-900/4 dark:hover:bg-white/6'
                    }`}
                  >
                    <p className="font-display text-xs font-bold text-slate-900 dark:text-white">
                      {preset}
                    </p>
                    <p className="mt-0.5 text-[10px] text-slate-600 dark:text-slate-300">
                      {preset === 'Hormozi Bold'
                        ? 'Bloque sólido alto impacto'
                        : preset === 'Minimal Glass'
                          ? 'Cápsula translúcida suave'
                          : 'Borde neón con halo'}
                    </p>
                  </button>
                );
              })}
            </div>

            <div className="space-y-1.5">
              <span className="text-[11px] font-bold uppercase tracking-wide text-slate-600 dark:text-slate-300">
                Tipografía Remotion
              </span>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                {REMOTION_FONT_FAMILIES.map((font) => (
                  <button
                    key={font}
                    type="button"
                    onClick={() => updateStyle({ fontFamily: font })}
                    className={`rounded-lg border px-2 py-1.5 text-[11px] font-semibold truncate cursor-pointer ${
                      styleConfig.fontFamily === font
                        ? 'border-[#FF5A4E] bg-[#FF5A4E]/14 text-slate-900 dark:text-white'
                        : 'border-slate-900/12 dark:border-white/12 text-slate-700 dark:text-slate-200'
                    }`}
                  >
                    {font}
                  </button>
                ))}
              </div>
            </div>

            {/* Visual Preview Cards for Kinetic Text Animation Presets */}
            <div className="space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-[11px] font-bold uppercase tracking-wide text-slate-600 dark:text-slate-300">
                  Presets Kinetic con Vista Previa
                </span>
                <button
                  type="button"
                  onClick={() => setKineticApplyCombo((prev) => !prev)}
                  className={`rounded-lg border px-2 py-0.5 text-[10px] font-semibold transition-colors cursor-pointer ${
                    kineticApplyCombo
                      ? 'border-[#F4A048]/60 bg-[#F4A048]/14 text-amber-800 dark:text-[#F4A048]'
                      : 'border-slate-900/12 dark:border-white/14 text-slate-600 dark:text-slate-300'
                  }`}
                  title="Alterna entre aplicar el combo completo (fuente + estilo + animación) o solo la animación de entrada"
                >
                  {kineticApplyCombo
                    ? 'Aplica estilo + fuente'
                    : 'Solo animación'}
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                {KINETIC_ANIMATION_PRESETS.map((card) => {
                  const active = styleConfig.textAnimation === card.textAnimation;
                  const fontCls = getFontPreviewClass(card.fontFamily);
                  const accentCls = getAccentPreviewClass(card.accentColor);
                  const hoverMotionCls = getKineticHoverClass(card.textAnimation);
                  return (
                    <button
                      key={card.id}
                      type="button"
                      onClick={() => handleApplyKineticPreset(card)}
                      className={`group rounded-xl border p-2 text-left transition-colors cursor-pointer ${
                        active
                          ? 'border-[#F4A048] bg-[#F4A048]/12'
                          : 'border-slate-900/12 dark:border-white/12 bg-white/40 dark:bg-white/[0.02] hover:border-[#F4A048]/60'
                      }`}
                    >
                      <div className="rounded-lg bg-[#0B1221] px-2.5 py-2 overflow-hidden flex items-center justify-center min-h-[42px] border border-white/8">
                        <span
                          className={`text-xs font-extrabold leading-tight text-white text-center truncate ${fontCls} ${
                            card.uppercase ? 'uppercase' : ''
                          } ${hoverMotionCls}`}
                        >
                          {card.samplePrefix}{' '}
                          <span className={accentCls}>{card.sampleHighlight}</span>{' '}
                          {card.sampleSuffix}
                        </span>
                      </div>
                      <div className="mt-1.5 flex items-center justify-between gap-1">
                        <span className="text-[11px] font-bold text-slate-900 dark:text-white truncate">
                          {card.name}
                        </span>
                        <span className="text-[10px] font-medium text-slate-500 dark:text-slate-400 truncate">
                          {card.fontFamily === 'Plus Jakarta Sans'
                            ? 'Jakarta'
                            : card.fontFamily}
                        </span>
                      </div>
                      <p className="text-[10px] text-slate-600 dark:text-slate-300 leading-snug mt-0.5 line-clamp-1">
                        {card.description}
                      </p>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Sliders: Position Y%, Scale, Box Opacity, Radius, Stroke */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 text-xs">
              <label className="space-y-1">
                <div className="flex justify-between text-[11px] font-medium text-slate-700 dark:text-slate-200">
                  <span>Posición Vertical Y</span>
                  <span className="font-mono-tabular text-[#FF5A4E]">
                    {styleConfig.subtitleYPercent}%
                  </span>
                </div>
                <input
                  type="range"
                  min={20}
                  max={86}
                  step={1}
                  value={styleConfig.subtitleYPercent}
                  onChange={(e) =>
                    updateStyle({ subtitleYPercent: Number(e.target.value) })
                  }
                  className="w-full accent-[#FF5A4E] cursor-pointer"
                />
              </label>

              <label className="space-y-1">
                <div className="flex justify-between text-[11px] font-medium text-slate-700 dark:text-slate-200">
                  <span>Escala Texto</span>
                  <span className="font-mono-tabular text-[#FF5A4E]">
                    {Math.round(styleConfig.fontScale * 100)}%
                  </span>
                </div>
                <input
                  type="range"
                  min={0.75}
                  max={1.45}
                  step={0.05}
                  value={styleConfig.fontScale}
                  onChange={(e) =>
                    updateStyle({ fontScale: Number(e.target.value) })
                  }
                  className="w-full accent-[#FF5A4E] cursor-pointer"
                />
              </label>

              <label className="space-y-1">
                <div className="flex justify-between text-[11px] font-medium text-slate-700 dark:text-slate-200">
                  <span>Opacidad Fondo</span>
                  <span className="font-mono-tabular text-[#F5A623]">
                    {Math.round(styleConfig.boxOpacity * 100)}%
                  </span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.05}
                  value={styleConfig.boxOpacity}
                  onChange={(e) =>
                    updateStyle({ boxOpacity: Number(e.target.value) })
                  }
                  className="w-full accent-[#F5A623] cursor-pointer"
                />
              </label>

              <label className="space-y-1">
                <div className="flex justify-between text-[11px] font-medium text-slate-700 dark:text-slate-200">
                  <span>Radio Caja</span>
                  <span className="font-mono-tabular text-slate-600 dark:text-slate-300">
                    {styleConfig.boxRadius}px
                  </span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={44}
                  step={2}
                  value={styleConfig.boxRadius}
                  onChange={(e) =>
                    updateStyle({ boxRadius: Number(e.target.value) })
                  }
                  className="w-full accent-[#F5A623] cursor-pointer"
                />
              </label>

              <label className="space-y-1">
                <div className="flex justify-between text-[11px] font-medium text-slate-700 dark:text-slate-200">
                  <span>Sombra / Relieve</span>
                  <span className="font-mono-tabular text-slate-600 dark:text-slate-300">
                    {styleConfig.strokeWidth}px
                  </span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={6}
                  step={1}
                  value={styleConfig.strokeWidth}
                  onChange={(e) =>
                    updateStyle({ strokeWidth: Number(e.target.value) })
                  }
                  className="w-full accent-[#FF5A4E] cursor-pointer"
                />
              </label>

              <div className="space-y-1">
                <div className="flex justify-between text-[11px] font-medium text-slate-700 dark:text-slate-200">
                  <span>Acento &amp; Texto</span>
                  <span className="font-mono-tabular text-[10px] text-slate-500">
                    {styleConfig.accentColor}
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  {ACCENT_SWATCHES.map((swatch) => (
                    <button
                      key={swatch.hex}
                      type="button"
                      onClick={() => updateStyle({ accentColor: swatch.hex })}
                      aria-label={`Color acento ${swatch.hex}`}
                      className={`h-5 w-5 rounded-full border cursor-pointer ${swatch.bgClass} ${
                        styleConfig.accentColor.toLowerCase() ===
                        swatch.hex.toLowerCase()
                          ? 'ring-2 ring-[#FF5A4E] ring-offset-1 border-slate-900 dark:border-white'
                          : 'border-slate-400/50'
                      }`}
                    />
                  ))}
                  <input
                    type="color"
                    aria-label="Color acento personalizado"
                    value={styleConfig.accentColor}
                    onChange={(e) =>
                      updateStyle({ accentColor: e.target.value.toUpperCase() })
                    }
                    className="h-6 w-6 rounded border border-slate-900/15 dark:border-white/20 bg-transparent cursor-pointer"
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 text-xs">
              <label className="flex items-center gap-1.5 text-slate-800 dark:text-slate-100 cursor-pointer">
                <input
                  type="checkbox"
                  checked={styleConfig.uppercase}
                  onChange={(e) => updateStyle({ uppercase: e.target.checked })}
                  className="accent-[#FF5A4E]"
                />
                <span>Mayúsculas</span>
              </label>
              <label className="flex items-center gap-1.5 text-slate-800 dark:text-slate-100 cursor-pointer">
                <input
                  type="checkbox"
                  checked={karaokeMode}
                  onChange={(e) =>
                    onUpdate({ ...piece, karaokeMode: e.target.checked })
                  }
                  className="accent-[#FF5A4E]"
                />
                <span>Karaoke vivo</span>
              </label>
              <label className="flex items-center gap-1.5 text-slate-800 dark:text-slate-100 cursor-pointer">
                <input
                  type="checkbox"
                  checked={showProgressBar}
                  onChange={(e) =>
                    onUpdate({ ...piece, showProgressBar: e.target.checked })
                  }
                  className="accent-[#FF5A4E]"
                />
                <span>Barra retención</span>
              </label>
              <label className="flex items-center gap-1.5 text-slate-800 dark:text-slate-100 cursor-pointer">
                <input
                  type="checkbox"
                  checked={showWaveform}
                  onChange={(e) =>
                    onUpdate({ ...piece, showWaveform: e.target.checked })
                  }
                  className="accent-[#F5A623]"
                />
                <span>Onda BPM</span>
              </label>
            </div>
          </div>
        )}

        {/* Sub-Tab 2: Ken Burns Camera Motion, Color Grade LUTs & SFX Visual Flashes */}
        {subTab === 'camera' && (
          <div className="space-y-3.5">
            <div className="space-y-3">
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[11px] font-bold uppercase tracking-wide text-slate-600 dark:text-slate-300">
                    Transición entre clips
                  </span>
                  <span className="font-mono-tabular text-[11px] font-semibold text-[#FF5A4E]">
                    {transitionDurationSec.toFixed(2)}s
                  </span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                  {TRANSITION_PRESETS.map((tr) => {
                    const active = transitionPreset === tr;
                    return (
                      <button
                        key={tr}
                        type="button"
                        onClick={() => onUpdate({ ...piece, transitionPreset: tr })}
                        className={`rounded-xl border px-2.5 py-1.5 text-left transition-colors cursor-pointer ${
                          active
                            ? 'border-[#FF5A4E] bg-[#FF5A4E]/16 text-slate-900 dark:text-white'
                            : 'border-slate-900/12 dark:border-white/12 text-slate-700 dark:text-slate-200 hover:border-[#FF5A4E]/50'
                        }`}
                      >
                        <p className="text-[11px] font-bold truncate">{tr}</p>
                        <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate">
                          {TRANSITION_HINTS[tr]}
                        </p>
                      </button>
                    );
                  })}
                </div>
                <input
                  type="range"
                  min={0.2}
                  max={1.0}
                  step={0.05}
                  value={transitionDurationSec}
                  aria-label="Duración de transición"
                  onChange={(e) =>
                    onUpdate({
                      ...piece,
                      transitionDurationSec: Number(e.target.value),
                    })
                  }
                  className="w-full accent-[#FF5A4E] cursor-pointer"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                <div className="space-y-1.5">
                  <span className="text-[11px] font-bold uppercase tracking-wide text-slate-600 dark:text-slate-300">
                    Movimiento Cámara (Ken Burns)
                  </span>
                  <div className="grid grid-cols-3 gap-1.5">
                    {CAMERA_MOTION_PRESETS.map((cam) => (
                      <button
                        key={cam}
                        type="button"
                        onClick={() => updateStyle({ cameraMotion: cam })}
                        className={`rounded-lg px-2 py-1.5 text-[11px] font-semibold truncate cursor-pointer ${
                          styleConfig.cameraMotion === cam
                            ? 'bg-[#F4A048] text-slate-950 font-bold'
                            : 'border border-slate-900/12 dark:border-white/14 text-slate-700 dark:text-slate-200 hover:border-[#F4A048]/60'
                        }`}
                      >
                        {cam}
                      </button>
                    ))}
                  </div>
                </div>

                <label className="space-y-1.5 flex flex-col justify-center">
                  <div className="flex justify-between text-[11px] font-medium text-slate-700 dark:text-slate-200">
                    <span>Intensidad Ken Burns</span>
                    <span className="font-mono-tabular text-[#F4A048] font-bold">
                      {Math.round(cameraIntensity * 100)}%
                    </span>
                  </div>
                  <input
                    type="range"
                    min={0.05}
                    max={0.25}
                    step={0.01}
                    value={cameraIntensity}
                    disabled={styleConfig.cameraMotion === 'Static'}
                    onChange={(e) =>
                      updateStyle({ cameraIntensity: Number(e.target.value) })
                    }
                    className="w-full accent-[#F4A048] cursor-pointer disabled:opacity-40"
                  />
                  <span className="text-[10px] text-slate-500 dark:text-slate-400">
                    {styleConfig.cameraMotion === 'Static'
                      ? 'Selecciona Zoom, Pan o Beat Pulse para activar desplazamiento.'
                      : 'Controla el recorrido de escala/paneo en cada clip.'}
                  </span>
                </label>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <span className="text-[11px] font-bold uppercase tracking-wide text-slate-600 dark:text-slate-300">
                  Gradación de Color (LUT)
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {COLOR_GRADE_PRESETS.map((lut) => (
                    <button
                      key={lut}
                      type="button"
                      onClick={() => updateStyle({ colorGrade: lut })}
                      className={`rounded-lg px-2 py-1 text-[11px] font-semibold cursor-pointer ${
                        styleConfig.colorGrade === lut
                          ? 'bg-[#FF5A4E] text-white'
                          : 'border border-slate-900/12 dark:border-white/14 text-slate-700 dark:text-slate-200'
                      }`}
                    >
                      {lut}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <label className="block space-y-1">
                  <div className="flex justify-between text-[11px] font-medium text-slate-700 dark:text-slate-200">
                    <span>Viñeta Cinemática</span>
                    <span className="font-mono-tabular text-[#F4A048]">
                      {Math.round(styleConfig.vignetteIntensity * 100)}%
                    </span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={0.85}
                    step={0.05}
                    value={styleConfig.vignetteIntensity}
                    onChange={(e) =>
                      updateStyle({ vignetteIntensity: Number(e.target.value) })
                    }
                    className="w-full accent-[#F4A048] cursor-pointer"
                  />
                </label>

                <label className="flex items-center gap-2 text-xs font-medium text-slate-800 dark:text-slate-100 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={styleConfig.sfxVisualFlash}
                    onChange={(e) =>
                      updateStyle({ sfxVisualFlash: e.target.checked })
                    }
                    className="accent-[#F4A048]"
                  />
                  <span>Destellos visuales (x3 flash / whoosh) en cues SFX</span>
                </label>
              </div>
            </div>
          </div>
        )}

        {/* Sub-Tab 3: Hook Style, CTA Stickers & PiP Image Overlay */}
        {subTab === 'stickers' && (
          <div className="space-y-3.5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <span className="text-[11px] font-bold uppercase tracking-wide text-slate-600 dark:text-slate-300">
                  Diseño Hook Inicial (0–3s)
                </span>
                <div className="grid grid-cols-2 gap-1.5">
                  {HOOK_BANNER_STYLES.map((hs) => (
                    <button
                      key={hs}
                      type="button"
                      onClick={() => updateStyle({ hookStyle: hs })}
                      className={`rounded-lg border px-2.5 py-1.5 text-[11px] font-semibold cursor-pointer ${
                        styleConfig.hookStyle === hs
                          ? 'border-[#FF5A4E] bg-[#FF5A4E]/14 text-slate-900 dark:text-white'
                          : 'border-slate-900/12 dark:border-white/12 text-slate-700 dark:text-slate-200'
                      }`}
                    >
                      {hs}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-1.5">
                <span className="text-[11px] font-bold uppercase tracking-wide text-slate-600 dark:text-slate-300">
                  Sticker Animado CTA
                </span>
                <div className="grid grid-cols-2 gap-1.5">
                  {CTA_STICKER_STYLES.map((st) => (
                    <button
                      key={st}
                      type="button"
                      onClick={() => updateStyle({ ctaSticker: st })}
                      className={`rounded-lg border px-2.5 py-1.5 text-[11px] font-semibold cursor-pointer ${
                        styleConfig.ctaSticker === st
                          ? 'border-[#F4A048] bg-[#F4A048]/18 text-amber-800 dark:text-[#F4A048]'
                          : 'border-slate-900/12 dark:border-white/12 text-slate-700 dark:text-slate-200'
                      }`}
                    >
                      {st === 'None' ? 'Sin sticker' : st}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Visual B-Roll / Logo Image Overlay */}
            <div className="rounded-xl border border-slate-900/10 dark:border-white/12 bg-slate-900/[0.02] dark:bg-white/[0.02] p-3 space-y-2.5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-1.5">
                  <ImageIcon className="h-3.5 w-3.5 text-[#F5A623]" aria-hidden="true" />
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-100">
                    Overlay Visual (Foto B-Roll o Logo PiP)
                  </span>
                </div>

                <div className="flex items-center gap-1.5">
                  {piece.overlayImageUrl && (
                    <button
                      type="button"
                      onClick={() => {
                        if (piece.overlayImageUrl?.startsWith('blob:')) {
                          URL.revokeObjectURL(piece.overlayImageUrl);
                        }
                        onUpdate({
                          ...piece,
                          overlayImageUrl: undefined,
                          overlayLabel: undefined,
                        });
                      }}
                      className="rounded-lg border border-rose-500/35 px-2 py-1 text-[11px] font-semibold text-rose-600 dark:text-rose-300 cursor-pointer"
                    >
                      Quitar
                    </button>
                  )}

                  <label className="rounded-xl border border-slate-900/12 dark:border-white/14 bg-white/80 dark:bg-white/[0.06] px-2.5 py-1 text-[11px] font-semibold text-slate-800 dark:text-slate-100 hover:border-[#F5A623] cursor-pointer">
                    <span>
                      {piece.overlayImageUrl ? 'Cambiar imagen' : 'Subir PNG / JPG'}
                    </span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        if (piece.overlayImageUrl?.startsWith('blob:')) {
                          URL.revokeObjectURL(piece.overlayImageUrl);
                        }
                        onUpdate({
                          ...piece,
                          overlayImageUrl: URL.createObjectURL(file),
                          overlayLabel:
                            piece.overlayLabel ?? file.name.replace(/\.[^.]+$/, ''),
                          overlayStartSec: piece.overlayStartSec ?? 2.0,
                          overlayDurationSec: piece.overlayDurationSec ?? 5.0,
                        });
                        e.target.value = '';
                      }}
                      className="sr-only"
                    />
                  </label>
                </div>
              </div>

              {piece.overlayImageUrl && (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1">
                  <input
                    type="text"
                    value={piece.overlayLabel ?? ''}
                    placeholder="Texto del recuadro"
                    onChange={(e) =>
                      onUpdate({ ...piece, overlayLabel: e.target.value })
                    }
                    className="rounded-lg border border-slate-900/12 dark:border-white/14 bg-white/80 dark:bg-[#0B1221] px-2.5 py-1.5 text-xs text-slate-900 dark:text-white"
                  />
                  <label className="flex items-center gap-2 text-[11px] text-slate-600 dark:text-slate-300">
                    <span>Inicia (s):</span>
                    <input
                      type="number"
                      step={0.5}
                      min={0}
                      value={piece.overlayStartSec ?? 2.0}
                      onChange={(e) =>
                        onUpdate({
                          ...piece,
                          overlayStartSec: Math.max(0, Number(e.target.value)),
                        })
                      }
                      className="w-16 rounded-lg border border-slate-900/12 dark:border-white/14 bg-transparent px-1.5 py-1 font-mono-tabular text-xs text-[#FF5A4E]"
                    />
                  </label>
                  <label className="flex items-center gap-2 text-[11px] text-slate-600 dark:text-slate-300">
                    <span>Dura (s):</span>
                    <input
                      type="number"
                      step={0.5}
                      min={1}
                      value={piece.overlayDurationSec ?? 5.0}
                      onChange={(e) =>
                        onUpdate({
                          ...piece,
                          overlayDurationSec: Math.max(1, Number(e.target.value)),
                        })
                      }
                      className="w-16 rounded-lg border border-slate-900/12 dark:border-white/14 bg-transparent px-1.5 py-1 font-mono-tabular text-xs text-[#FF5A4E]"
                    />
                  </label>
                </div>
              )}

              {expressResources.length > 0 && (
                <div className="flex flex-wrap items-center gap-1.5 pt-1 border-t border-slate-900/8 dark:border-white/10">
                  <span className="text-[10px] font-semibold text-slate-600 dark:text-slate-300">
                    Recursos en <code>local-studio/resources/</code>:
                  </span>
                  {expressResources.map((resFile) => (
                    <button
                      key={resFile.name}
                      type="button"
                      onClick={() =>
                        onUpdate({
                          ...piece,
                          overlayImageUrl: resFile.url,
                          overlayLabel:
                            piece.overlayLabel ??
                            resFile.name.replace(/\.[^.]+$/, ''),
                          overlayStartSec: piece.overlayStartSec ?? 2.0,
                          overlayDurationSec: piece.overlayDurationSec ?? 5.0,
                        })
                      }
                      className="rounded-lg border border-slate-900/12 dark:border-white/14 bg-white/80 dark:bg-white/5 px-2 py-0.5 text-[10px] font-semibold text-slate-800 dark:text-slate-100 hover:border-[#F5A623] cursor-pointer"
                    >
                      + {resFile.name}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Directly Editable Subtitle Cues */}
      <div className="space-y-2.5 rounded-2xl border border-slate-900/10 dark:border-white/12 bg-white/60 dark:bg-white/[0.03] p-3.5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <span className="text-xs font-bold text-slate-800 dark:text-slate-100">
              Editor de frases sincronizadas ({cues.length})
            </span>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              {isCustomized
                ? 'Subtítulos personalizados · se reflejan en vivo en Remotion y .SRT'
                : 'Generados desde el guion · edita o arrastra en el timeline'}
            </p>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={handleRegenerateFromScript}
              className="inline-flex items-center gap-1 rounded-lg border border-slate-900/12 dark:border-white/14 px-2.5 py-1 text-[11px] font-medium text-slate-700 dark:text-slate-200 hover:border-[#F5A623] cursor-pointer"
              title="Regenerar subtítulos desde el guion"
            >
              <RotateCcw className="h-3 w-3" aria-hidden="true" />
              <span>Regenerar</span>
            </button>
            <button
              type="button"
              onClick={handleAddCue}
              className="inline-flex items-center gap-1 rounded-lg border border-slate-900/12 dark:border-white/14 px-2.5 py-1 text-[11px] font-semibold text-slate-700 dark:text-slate-200 hover:border-[#FF5A4E] cursor-pointer"
            >
              <Plus className="h-3 w-3" aria-hidden="true" />
              <span>Frase</span>
            </button>
          </div>
        </div>

        <div className="max-h-44 overflow-y-auto space-y-2 pr-1">
          {cues.map((cue, idx) => (
            <div
              key={`${cue.index}-${idx}`}
              className="flex flex-col sm:flex-row sm:items-center gap-2 rounded-xl border border-slate-900/8 dark:border-white/10 bg-white/85 dark:bg-[#0B1221]/70 p-2"
            >
              <div className="flex items-center gap-1 shrink-0">
                <input
                  type="number"
                  step={0.1}
                  min={0}
                  aria-label={`Inicio frase ${idx + 1} en segundos`}
                  value={cue.startSec}
                  onChange={(e) =>
                    handleCueChange(idx, {
                      startSec: Math.max(0, Number(e.target.value)),
                    })
                  }
                  className="w-14 rounded-lg border border-slate-900/10 dark:border-white/12 bg-transparent px-1.5 py-1 font-mono-tabular text-[11px] text-[#FF5A4E] text-center"
                />
                <span className="text-[11px] text-slate-400">–</span>
                <input
                  type="number"
                  step={0.1}
                  min={0.1}
                  aria-label={`Fin frase ${idx + 1} en segundos`}
                  value={cue.endSec}
                  onChange={(e) =>
                    handleCueChange(idx, {
                      endSec: Math.max(
                        cue.startSec + 0.2,
                        Number(e.target.value)
                      ),
                    })
                  }
                  className="w-14 rounded-lg border border-slate-900/10 dark:border-white/12 bg-transparent px-1.5 py-1 font-mono-tabular text-[11px] text-[#FF5A4E] text-center"
                />
              </div>

              <input
                type="text"
                value={cue.text}
                aria-label={`Texto de frase ${idx + 1}`}
                onChange={(e) =>
                  handleCueChange(idx, { text: e.target.value })
                }
                className="flex-1 min-w-0 rounded-lg border border-slate-900/10 dark:border-white/12 bg-transparent px-2 py-1 text-xs text-slate-900 dark:text-white focus:border-[#FF5A4E] focus:outline-none"
              />

              <input
                type="text"
                value={cue.highlightWord ?? ''}
                placeholder="Destacar"
                aria-label={`Palabra destacada frase ${idx + 1}`}
                onChange={(e) =>
                  handleCueChange(idx, {
                    highlightWord: e.target.value || undefined,
                  })
                }
                className="w-24 rounded-lg border border-slate-900/10 dark:border-white/12 bg-transparent px-2 py-1 text-[11px] text-amber-600 dark:text-[#F5A623] placeholder:text-slate-400"
              />

              <button
                type="button"
                onClick={() => handleRemoveCue(idx)}
                aria-label={`Eliminar frase ${idx + 1}`}
                className="rounded-lg p-1 text-slate-400 hover:text-rose-500 cursor-pointer shrink-0 self-end sm:self-center"
              >
                <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Remotion Client-Side MP4 Export + Package Render */}
      <div className="rounded-2xl border border-slate-900/10 dark:border-white/12 bg-white/70 dark:bg-white/[0.04] p-4 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h4 className="font-display text-sm font-bold text-slate-900 dark:text-white">
              Render Remotion &amp; Exportación .MP4
            </h4>
            <p className="text-xs text-slate-600 dark:text-slate-300">
              Exporta el video vertical 1080×1920 con estilos, motion, flashes SFX y audio o genera el paquete (.JSON + .SRT).
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              disabled={mp4Exporting}
              onClick={handleExportMp4}
              className="inline-flex items-center gap-2 rounded-xl border border-[#FF5A4E]/45 bg-[#FF5A4E]/15 px-3.5 py-2 text-xs font-bold text-[#FF5A4E] dark:text-[#FF7A6E] hover:bg-[#FF5A4E]/22 cursor-pointer disabled:opacity-50"
            >
              <Film className="h-3.5 w-3.5" aria-hidden="true" />
              <span>
                {mp4Exporting
                  ? `Exportando ${mp4Progress}%`
                  : 'Exportar .MP4 (Remotion)'}
              </span>
            </button>

            <button
              type="button"
              disabled={rendering}
              onClick={handleRenderPiece}
              className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#FF5A4E] to-[#F5A623] px-4 py-2 text-xs font-bold text-white shadow-md shadow-[#FF5A4E]/25 hover:opacity-95 cursor-pointer disabled:opacity-50"
            >
              <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
              <span>
                {rendering ? 'Renderizando…' : 'Ensamblar & Marcar Listo'}
              </span>
            </button>
          </div>
        </div>

        {(mp4Exporting || mp4Error || mp4Result) && (
          <div className="space-y-2.5 pt-2 border-t border-slate-900/8 dark:border-white/10">
            {mp4Exporting && (
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-700 dark:text-slate-200 font-medium">
                    {mp4StatusText}
                  </span>
                  <span className="font-mono-tabular font-bold text-[#FF5A4E]">
                    {mp4Progress}%
                  </span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-slate-900/10 dark:bg-white/10">
                  <div
                    style={{ width: `${mp4Progress}%` }}
                    className="h-full rounded-full bg-gradient-to-r from-[#FF5A4E] to-[#F5A623] transition-all duration-150"
                  />
                </div>
              </div>
            )}

            {mp4Error && (
              <p className="rounded-xl border border-rose-500/35 bg-rose-500/10 px-3 py-2 text-xs text-rose-600 dark:text-rose-300">
                {mp4Error}
              </p>
            )}

            {mp4Result && !mp4Exporting && (
              <div className="space-y-2.5 rounded-xl border border-emerald-500/30 bg-emerald-500/[0.07] p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-700 dark:text-emerald-300">
                    <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
                    <span>
                      MP4 H.264 {mp4Result.hasAudio ? 'con mezcla de audio' : '(video)'} ({mp4Result.durationSec}s · 1080×1920)
                    </span>
                  </span>

                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() =>
                        downloadBlob(`vibra_${piece.id}_reel.mp4`, mp4Result.blob)
                      }
                      className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-emerald-500 cursor-pointer"
                    >
                      <Download className="h-3.5 w-3.5" aria-hidden="true" />
                      <span>Descargar .MP4</span>
                    </button>

                    {bridgeStatus?.available && (
                      <button
                        type="button"
                        onClick={() =>
                          void handleSaveToExpressDisk(
                            `vibra_${piece.id}_reel.mp4`,
                            mp4Result.blob
                          )
                        }
                        className="inline-flex items-center gap-1.5 rounded-xl border border-slate-900/15 dark:border-white/15 bg-white/80 dark:bg-white/10 px-3 py-1.5 text-xs font-semibold text-slate-900 dark:text-white hover:border-[#F5A623] cursor-pointer"
                      >
                        <HardDrive className="h-3.5 w-3.5 text-[#F5A623]" />
                        <span>Guardar en PC (`exports/`)</span>
                      </button>
                    )}
                  </div>
                </div>

                <video
                  src={mp4Result.url}
                  controls
                  playsInline
                  className="max-h-52 mx-auto rounded-xl border border-white/15 bg-black"
                />
              </div>
            )}
          </div>
        )}

        {activeJob && (
          <div className="space-y-2 pt-2 border-t border-slate-900/8 dark:border-white/10">
            <div className="flex items-center justify-between text-xs">
              <span className="flex items-center gap-1.5 font-semibold text-slate-800 dark:text-slate-100">
                {activeJob.status === 'completed' && (
                  <CheckCircle2
                    className="h-4 w-4 text-emerald-500"
                    aria-hidden="true"
                  />
                )}
                <span>
                  {activeJob.status === 'completed'
                    ? `Pieza ensamblada (${activeJob.estimatedDurationSec}s)`
                    : `Procesando: ${activeJob.status}…`}
                </span>
              </span>
              <span className="font-mono-tabular font-bold text-[#FF5A4E]">
                {activeJob.progress}%
              </span>
            </div>

            <div className="h-2 w-full overflow-hidden rounded-full bg-slate-900/10 dark:bg-white/10">
              <div
                style={{ width: `${activeJob.progress}%` }}
                className="h-full rounded-full bg-gradient-to-r from-[#FF5A4E] to-[#F5A623] transition-all duration-200"
              />
            </div>

            {activeJob.status === 'completed' && (
              <div className="flex flex-wrap items-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={() =>
                    downloadFile(
                      `vibra_${piece.id}_subtitulos.srt`,
                      activeJob.srtContent,
                      'text/plain;charset=utf-8'
                    )
                  }
                  className="inline-flex items-center gap-1.5 rounded-xl border border-slate-900/12 dark:border-white/14 px-3 py-1.5 text-xs font-semibold text-slate-800 dark:text-slate-100 hover:border-[#FF5A4E] cursor-pointer"
                >
                  <Download className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>Descargar .SRT</span>
                </button>

                <button
                  type="button"
                  onClick={() =>
                    downloadFile(
                      `vibra_${piece.id}_produccion.json`,
                      activeJob.manifestJson,
                      'application/json;charset=utf-8'
                    )
                  }
                  className="inline-flex items-center gap-1.5 rounded-xl border border-slate-900/12 dark:border-white/14 px-3 py-1.5 text-xs font-semibold text-slate-800 dark:text-slate-100 hover:border-[#F5A623] cursor-pointer"
                >
                  <FileJson className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>Descargar Paquete .JSON</span>
                </button>

                {bridgeStatus?.available && (
                  <button
                    type="button"
                    onClick={() =>
                      void handleSaveToExpressDisk(
                        `vibra_${piece.id}_produccion.json`,
                        new Blob([activeJob.manifestJson], {
                          type: 'application/json',
                        })
                      )
                    }
                    className="inline-flex items-center gap-1.5 rounded-xl border border-slate-900/12 dark:border-white/14 px-3 py-1.5 text-xs font-semibold text-slate-800 dark:text-slate-100 hover:border-[#F5A623] cursor-pointer"
                  >
                    <HardDrive className="h-3.5 w-3.5 text-[#F5A623]" />
                    <span>Guardar JSON en PC</span>
                  </button>
                )}
              </div>
            )}
          </div>
        )}

        {diskSaveMessage && (
          <p className="text-[11px] font-semibold text-emerald-700 dark:text-emerald-300">
            {diskSaveMessage}
          </p>
        )}
      </div>
    </div>
  );
};
