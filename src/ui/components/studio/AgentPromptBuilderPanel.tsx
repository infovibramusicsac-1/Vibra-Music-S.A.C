import React, { useEffect, useMemo, useState } from 'react';
import {
  Bot,
  Check,
  Copy,
  FolderTree,
  RefreshCw,
  Terminal,
} from 'lucide-react';
import type { ContentPiece, LocalMediaFile } from '../../../domain/entities';
import { BGM_CATALOG } from '../../../domain/value-objects';
import { useVibraServices } from '../../context/VibraServicesContext';

type AgentTarget = 'aistudio' | 'antigravity' | 'mcp';

interface AgentPromptBuilderPanelProps {
  piece: ContentPiece;
  totalDurationSec: number;
}

export const AgentPromptBuilderPanel: React.FC<AgentPromptBuilderPanelProps> = ({
  piece,
  totalDurationSec,
}) => {
  const { localMedia } = useVibraServices();
  const [target, setTarget] = useState<AgentTarget>('antigravity');
  const [expressAssets, setExpressAssets] = useState<LocalMediaFile[]>([]);
  const [includeKaraoke, setIncludeKaraoke] = useState(true);
  const [includeSafeZones, setIncludeSafeZones] = useState(true);
  const [includeLocalFolders, setIncludeLocalFolders] = useState(true);
  const [copied, setCopied] = useState(false);

  const loadAssets = async () => {
    try {
      const files = await localMedia.listExpressMedia('all');
      setExpressAssets(files);
    } catch {
      setExpressAssets([]);
    }
  };

  useEffect(() => {
    void loadAssets();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const bgm = BGM_CATALOG.find((b) => b.id === piece.bgmTrackId);

  const clipsList = expressAssets.filter((f) => f.category === 'clips');
  const audioList = expressAssets.filter((f) => f.category === 'audio');
  const resourcesList = expressAssets.filter((f) => f.category === 'resources');

  const exactPrompt = useMemo(() => {
    const headerByTarget =
      target === 'antigravity'
        ? 'Actúa como editor de video Remotion en Google Antigravity siguiendo `.antigravity/rules.md` y `AGENTS.md`.'
        : target === 'mcp'
          ? 'Conéctate al servidor MCP local (`npm run mcp`, herramienta `list_studio_assets`) y edita esta pieza en Remotion.'
          : 'Actúa como ingeniero de Remotion en Google AI Studio manteniendo Arquitectura Hexagonal (`src/infrastructure/remotion/VibraReelComposition.tsx`).';

    const lines: string[] = [
      headerByTarget,
      '',
      `PIEZA OBJETIVO: ${piece.id.toUpperCase()} — ${piece.pillar} (${piece.audienceName})`,
      `FORMATO: Vertical 9:16 (1080x1920 @ 30fps) · Duración total estimada: ${totalDurationSec}s`,
      '',
      '1. GUION Y ESTRUCTURA (3 ACTOS):',
      `- Hook (0s a ${piece.hookDurationSec ?? 2.8}s): "${piece.hook}"`,
      `- Desarrollo: "${piece.script}"`,
      `- Locución TTS / Voz: "${piece.voiceoverText || `${piece.hook}. ${piece.script}`}"`,
      `- CTA final (últimos ${piece.ctaDurationSec ?? 3.2}s): "${piece.cta}"`,
      '',
      '2. ESCENAS, TRANSICIONES Y AUDIO:',
      `- Clips asignados en la pieza (${piece.sceneClips.length}): ${
        piece.sceneClips.length > 0
          ? piece.sceneClips
              .map(
                (c, i) =>
                  `[${i + 1}] ${c.fileName} (${c.durationSec}s, in ${c.trimStartSec ?? 0}s)`
              )
              .join(' -> ')
          : 'Usar clips de local-studio/clips/'
      }`,
      `- Transición Remotion: ${piece.transitionPreset ?? 'Fade'} (${piece.transitionDurationSec ?? 0.4}s)`,
      `- Música BGM: ${bgm ? `${bgm.title} (${bgm.bpm} BPM)` : piece.bgmTrackId} al ${piece.bgmVolume}%${
        piece.customAudioName
          ? ` + Voz real "${piece.customAudioName}" (ducking BGM a 35%)`
          : ''
      }`,
    ];

    if (includeKaraoke) {
      lines.push(
        '',
        '3. SUBTÍTULOS KARAOKE PALABRA POR PALABRA:',
        `- Preset visual: "${piece.subtitlePreset}" · Karaoke activo: ${piece.karaokeMode !== false ? 'Sí' : 'No'}.`,
        '- Sincroniza cada palabra con progreso lineal dentro de su SubtitleCue, destacando la palabra activa en color Coral (#FF5A4E) o Ámbar (#F5A623).'
      );
    }

    if (includeSafeZones) {
      lines.push(
        '',
        '4. ZONAS SEGURAS (IG REELS / TIKTOK):',
        '- Mantén Hook superior bajo 11% desde arriba y subtítulos encima del 22% inferior para no chocar con avatar, descripción ni iconos derechos.'
      );
    }

    if (includeLocalFolders) {
      lines.push(
        '',
        '5. INVENTARIO REAL DE CARPETAS LOCALES (`local-studio/`):',
        `- clips/: ${clipsList.length > 0 ? clipsList.map((c) => c.name).join(', ') : '(vacía — coloca clips .mp4/.mov de Google Flow o cámara)'}`,
        `- audio/: ${audioList.length > 0 ? audioList.map((a) => a.name).join(', ') : '(vacía — coloca voces .wav/.mp3)'}`,
        `- resources/: ${resourcesList.length > 0 ? resourcesList.map((r) => r.name).join(', ') : '(vacía — coloca logos/overlays .png/.jpg)'}`,
        '- exports/: destino automático para renders finales .MP4 y .JSON'
      );
    }

    lines.push(
      '',
      'ENTREGABLE ESPERADO: Actualiza `VibraReelComposition.tsx` o la configuración de la pieza sin romper el Modo Espectador ni el exportador `.MP4`, y verifica con `npm run lint` + `npm run build`.'
    );

    return lines.join('\n');
  }, [
    target,
    piece,
    totalDurationSec,
    bgm,
    includeKaraoke,
    includeSafeZones,
    includeLocalFolders,
    clipsList,
    audioList,
    resourcesList,
  ]);

  const handleCopyPrompt = async () => {
    try {
      await navigator.clipboard.writeText(exactPrompt);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // ignore clipboard restriction
    }
  };

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-slate-900/10 dark:border-white/12 bg-white/60 dark:bg-white/[0.03] p-4 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Bot className="h-4 w-4 text-[#FF5A4E]" aria-hidden="true" />
            <div>
              <h4 className="font-display text-xs font-bold uppercase tracking-wide text-slate-900 dark:text-white">
                Pasos 3 & 4 · Portabilidad Multi-Agente y Prompt Exacto
              </h4>
              <p className="text-[11px] text-slate-600 dark:text-slate-300">
                Usa este proyecto en AI Studio, Google Antigravity (`.antigravity/rules.md`) o vía MCP (`npm run mcp`).
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => void loadAssets()}
            className="inline-flex items-center gap-1 rounded-lg border border-slate-900/12 dark:border-white/14 px-2.5 py-1 text-[11px] font-semibold text-slate-700 dark:text-slate-200 hover:border-[#F5A623] cursor-pointer"
          >
            <RefreshCw className="h-3 w-3" aria-hidden="true" />
            <span>Sincronizar carpetas</span>
          </button>
        </div>

        {/* Agent Target Selector */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          {(
            [
              {
                id: 'antigravity',
                label: 'Google Antigravity',
                hint: 'Lee .antigravity/rules.md',
              },
              {
                id: 'aistudio',
                label: 'Google AI Studio',
                hint: 'Prompt con contexto Hexagonal',
              },
              {
                id: 'mcp',
                label: 'Agente con MCP',
                hint: 'Conecta stdio mcp-server.ts',
              },
            ] as const
          ).map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setTarget(item.id)}
              className={`rounded-xl border p-2.5 text-left transition-colors cursor-pointer ${
                target === item.id
                  ? 'border-[#FF5A4E] bg-[#FF5A4E]/12'
                  : 'border-slate-900/10 dark:border-white/12 hover:border-slate-900/25'
              }`}
            >
              <p className="text-xs font-bold text-slate-900 dark:text-white">
                {item.label}
              </p>
              <p className="text-[11px] text-slate-600 dark:text-slate-300">
                {item.hint}
              </p>
            </button>
          ))}
        </div>

        {/* Prompt Inclusions */}
        <div className="flex flex-wrap gap-3 text-xs pt-1">
          <label className="inline-flex items-center gap-1.5 text-slate-800 dark:text-slate-100 cursor-pointer">
            <input
              type="checkbox"
              checked={includeKaraoke}
              onChange={(e) => setIncludeKaraoke(e.target.checked)}
              className="accent-[#FF5A4E]"
            />
            <span>Karaoke palabra por palabra</span>
          </label>
          <label className="inline-flex items-center gap-1.5 text-slate-800 dark:text-slate-100 cursor-pointer">
            <input
              type="checkbox"
              checked={includeSafeZones}
              onChange={(e) => setIncludeSafeZones(e.target.checked)}
              className="accent-[#FF5A4E]"
            />
            <span>Zonas Seguras IG/TikTok</span>
          </label>
          <label className="inline-flex items-center gap-1.5 text-slate-800 dark:text-slate-100 cursor-pointer">
            <input
              type="checkbox"
              checked={includeLocalFolders}
              onChange={(e) => setIncludeLocalFolders(e.target.checked)}
              className="accent-[#F5A623]"
            />
            <span>Rutas reales local-studio/</span>
          </label>
        </div>
      </div>

      {/* Exact Copyable Prompt */}
      <div className="rounded-2xl border border-slate-900/10 dark:border-white/12 bg-white/75 dark:bg-[#0B1221]/85 p-4 space-y-2.5">
        <div className="flex items-center justify-between gap-2">
          <span className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-900 dark:text-white">
            <Terminal className="h-3.5 w-3.5 text-[#F5A623]" aria-hidden="true" />
            <span>Prompt de Edición Exacto listo para copiar</span>
          </span>

          <button
            type="button"
            onClick={() => void handleCopyPrompt()}
            className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-[#FF5A4E] to-[#F5A623] px-3.5 py-1.5 text-xs font-bold text-white cursor-pointer"
          >
            {copied ? (
              <>
                <Check className="h-3.5 w-3.5" aria-hidden="true" />
                <span>Copiado</span>
              </>
            ) : (
              <>
                <Copy className="h-3.5 w-3.5" aria-hidden="true" />
                <span>Copiar prompt</span>
              </>
            )}
          </button>
        </div>

        <textarea
          readOnly
          rows={11}
          value={exactPrompt}
          aria-label="Prompt de edición exacto para agente"
          className="w-full rounded-xl border border-slate-900/10 dark:border-white/12 bg-slate-900/[0.03] dark:bg-black/35 p-3 font-mono text-[11px] leading-relaxed text-slate-800 dark:text-slate-100 focus:outline-none"
        />

        <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-600 dark:text-slate-300">
          <span className="inline-flex items-center gap-1.5">
            <FolderTree className="h-3.5 w-3.5 text-[#FF5A4E]" aria-hidden="true" />
            <span>
              Contratos en repo: <code>AGENTS.md</code> · <code>.antigravity/rules.md</code> · <code>mcp-server.ts</code>
            </span>
          </span>
          <span className="font-mono-tabular">
            CLI MCP: <code>npm run mcp</code>
          </span>
        </div>
      </div>
    </div>
  );
};
