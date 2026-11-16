import React, { useEffect, useState } from 'react';
import {
  Check,
  Copy,
  ExternalLink,
  Film,
  FolderOpen,
  HardDrive,
  Plus,
  RefreshCw,
  Sparkles,
  Trash2,
  Upload,
  Wand2,
} from 'lucide-react';
import type {
  ContentPiece,
  LocalBridgeStatus,
  LocalMediaFile,
  SceneClip,
} from '../../../domain/entities';
import { useVibraServices } from '../../context/VibraServicesContext';

interface SceneClipUploaderProps {
  piece: ContentPiece;
  onUpdate: (next: ContentPiece) => void;
}

function probeVideoDuration(url: string): Promise<number> {
  return new Promise((resolve) => {
    const video = document.createElement('video');
    video.preload = 'metadata';
    video.onloadedmetadata = () => {
      const dur =
        Number.isFinite(video.duration) && video.duration > 0
          ? video.duration
          : 5;
      resolve(Math.round(dur * 10) / 10);
    };
    video.onerror = () => resolve(5);
    video.src = url;
  });
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024 * 1024) {
    return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  }
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export const SceneClipUploader: React.FC<SceneClipUploaderProps> = ({
  piece,
  onUpdate,
}) => {
  const { batchRenderer, localMedia, aiCreative } = useVibraServices();
  const [bridgeStatus, setBridgeStatus] = useState<LocalBridgeStatus | null>(
    null
  );
  const [expressFiles, setExpressFiles] = useState<LocalMediaFile[]>([]);
  const [folderName, setFolderName] = useState<string | null>(null);
  const [folderFiles, setFolderFiles] = useState<LocalMediaFile[]>([]);
  const [localError, setLocalError] = useState<string | null>(null);
  const [loadingExpress, setLoadingExpress] = useState(false);

  // Google Flow & Veo/Omni 9:16 Video Bridge
  const [flowPrompt, setFlowPrompt] = useState<string>(() => {
    const firstScene = piece.scenesToRecord[0] ?? piece.shootingNotes;
    return `Vertical 9:16 cinematic shot for music academy Vibra Music: ${firstScene}. Warm coral and golden stage lighting, shallow depth of field, authentic expressive musicians, smooth gimbal motion, no text overlays.`;
  });
  const [copiedFlowPrompt, setCopiedFlowPrompt] = useState(false);
  const [generatingVideo, setGeneratingVideo] = useState(false);
  const [videoNotice, setVideoNotice] = useState<string | null>(null);

  useEffect(() => {
    const firstScene = piece.scenesToRecord[0] ?? piece.shootingNotes;
    setFlowPrompt(
      `Vertical 9:16 cinematic shot for music academy Vibra Music: ${firstScene}. Warm coral and golden stage lighting, shallow depth of field, authentic expressive musicians, smooth gimbal motion, no text overlays.`
    );
    setVideoNotice(null);
  }, [piece.id]);

  const refreshExpressBridge = async () => {
    setLoadingExpress(true);
    const status = await localMedia.checkExpressBridge();
    setBridgeStatus(status);
    if (status.available) {
      try {
        const files = await localMedia.listExpressMedia('clips');
        setExpressFiles(files);
      } catch {
        setExpressFiles([]);
      }
    } else {
      setExpressFiles([]);
    }
    setLoadingExpress(false);
  };

  useEffect(() => {
    void refreshExpressBridge();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const toggleSceneChecked = (index: number) => {
    const exists = piece.checkedScenes.includes(index);
    const checkedScenes = exists
      ? piece.checkedScenes.filter((i) => i !== index)
      : [...piece.checkedScenes, index];
    onUpdate({ ...piece, checkedScenes });
  };

  const handleEditSceneText = (index: number, nextValue: string) => {
    const nextScenes = piece.scenesToRecord.map((s, idx) =>
      idx === index ? nextValue : s
    );
    onUpdate({ ...piece, scenesToRecord: nextScenes });
  };

  const handleAddScene = () => {
    onUpdate({
      ...piece,
      scenesToRecord: [...piece.scenesToRecord, 'Nueva toma por grabar'],
    });
  };

  const handleRemoveScene = (index: number) => {
    const nextScenes = piece.scenesToRecord.filter((_, idx) => idx !== index);
    const nextChecked = piece.checkedScenes
      .filter((i) => i !== index)
      .map((i) => (i > index ? i - 1 : i));
    onUpdate({
      ...piece,
      scenesToRecord: nextScenes,
      checkedScenes: nextChecked,
    });
  };

  const handleFilesSelected = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    const newClips: SceneClip[] = [];
    for (let i = 0; i < files.length; i += 1) {
      const file = files[i];
      const objectUrl = URL.createObjectURL(file);
      const durationSec = await probeVideoDuration(objectUrl);
      const sceneLabel =
        piece.scenesToRecord[piece.sceneClips.length + i] ??
        `Toma local ${piece.sceneClips.length + i + 1}`;
      newClips.push({
        id: `clip-${Date.now()}-${i}`,
        sceneLabel,
        fileName: file.name,
        objectUrl,
        durationSec,
        trimStartSec: 0,
        sourceType: 'upload',
        isDemo: false,
        mimeType: file.type || 'video/mp4',
      });
    }

    onUpdate({
      ...piece,
      sceneClips: [...piece.sceneClips, ...newClips],
    });
    event.target.value = '';
  };

  const handlePickLocalFolder = async () => {
    setLocalError(null);
    try {
      const picked = await localMedia.pickLocalDirectory();
      if (!picked) return;
      setFolderName(picked.directoryName);
      setFolderFiles(picked.files);
    } catch (err) {
      setLocalError(
        err instanceof Error
          ? err.message
          : 'No se pudo abrir la carpeta local (usa «Subir videos» o Express local-studio/clips/).'
      );
    }
  };

  const handleAttachLocalFile = async (file: LocalMediaFile) => {
    if (file.kind !== 'video') return;
    const durationSec = await probeVideoDuration(file.url);
    const nextIdx = piece.sceneClips.length;
    const sceneLabel =
      piece.scenesToRecord[nextIdx] ?? `Toma ${nextIdx + 1} (${file.name})`;

    const clip: SceneClip = {
      id: `local-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      sceneLabel,
      fileName: file.name,
      objectUrl: file.url,
      durationSec,
      trimStartSec: 0,
      sourceType: file.source,
      isDemo: false,
      mimeType: file.mimeType,
    };

    onUpdate({
      ...piece,
      sceneClips: [...piece.sceneClips, clip],
    });
  };

  const handleCopyFlowPrompt = async () => {
    try {
      await navigator.clipboard.writeText(flowPrompt);
      setCopiedFlowPrompt(true);
      setTimeout(() => setCopiedFlowPrompt(false), 1800);
    } catch {
      // ignore
    }
  };

  const handleGenerateOmniClip = async () => {
    if (generatingVideo || !flowPrompt.trim()) return;
    setGeneratingVideo(true);
    setVideoNotice(null);
    try {
      const generated = await aiCreative.generateOmniVideo({
        prompt: flowPrompt,
        aspectRatio: '9:16',
        durationSec: 5,
        resolution: '720p',
        saveToLocal: true,
        fileNameHint: `vibra_${piece.id}_omni`,
      });
      const durationSec = await probeVideoDuration(generated.videoUrl);
      const nextClip: SceneClip = {
        id: `omni-${Date.now()}`,
        sceneLabel: `Clip Veo/Omni 9:16`,
        fileName: generated.fileName,
        objectUrl: generated.videoUrl,
        durationSec,
        trimStartSec: 0,
        sourceType: 'express-disk',
        isDemo: false,
        mimeType: generated.mimeType,
      };
      onUpdate({
        ...piece,
        sceneClips: [...piece.sceneClips, nextClip],
      });
      setVideoNotice(
        generated.savedPath
          ? `Clip IA guardado en ${generated.savedPath} y añadido al timeline.`
          : 'Clip IA generado y añadido al timeline.'
      );
      void refreshExpressBridge();
    } catch (err) {
      setVideoNotice(
        err instanceof Error
          ? err.message
          : 'No se pudo generar el clip con Veo / Gemini Omni.'
      );
    } finally {
      setGeneratingVideo(false);
    }
  };

  const handleLoadDemoClips = () => {
    const demoClips = batchRenderer.createDemoSceneClips(piece);
    onUpdate({
      ...piece,
      sceneClips: demoClips,
    });
  };

  const handleRemoveClip = (clipId: string) => {
    const target = piece.sceneClips.find((c) => c.id === clipId);
    if (
      target &&
      target.sourceType === 'upload' &&
      target.objectUrl.startsWith('blob:')
    ) {
      URL.revokeObjectURL(target.objectUrl);
    }
    onUpdate({
      ...piece,
      sceneClips: piece.sceneClips.filter((c) => c.id !== clipId),
    });
  };

  const videoFilesFromFolder = folderFiles.filter((f) => f.kind === 'video');
  const videoFilesFromExpress = expressFiles.filter((f) => f.kind === 'video');

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <div className="flex items-center justify-between gap-2">
          <h4 className="font-display text-xs font-bold uppercase tracking-wide text-slate-600 dark:text-slate-300">
            Qué grabar (Lista editable de tomas)
          </h4>
          <button
            type="button"
            onClick={handleAddScene}
            className="inline-flex items-center gap-1 rounded-lg border border-slate-900/12 dark:border-white/14 px-2.5 py-1 text-[11px] font-semibold text-slate-700 dark:text-slate-200 hover:border-[#FF5A4E] cursor-pointer"
          >
            <Plus className="h-3 w-3" aria-hidden="true" />
            <span>Añadir toma</span>
          </button>
        </div>

        {piece.scenesToRecord.length === 0 ? (
          <p className="text-xs text-slate-600 dark:text-slate-300">
            Sin tomas registradas ({piece.shootingNotes}). Usa «Añadir toma» si deseas agregar una.
          </p>
        ) : (
          <ul className="space-y-2">
            {piece.scenesToRecord.map((scene, idx) => {
              const checked = piece.checkedScenes.includes(idx);
              return (
                <li
                  key={idx}
                  className="flex items-center gap-2 rounded-xl border border-slate-900/10 dark:border-white/12 bg-white/60 dark:bg-white/[0.04] px-3 py-1.5"
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    aria-label={`Marcar toma ${idx + 1} como grabada`}
                    onChange={() => toggleSceneChecked(idx)}
                    className="accent-[#FF5A4E] cursor-pointer shrink-0"
                  />
                  <input
                    type="text"
                    value={scene}
                    aria-label={`Editar toma ${idx + 1}`}
                    onChange={(e) => handleEditSceneText(idx, e.target.value)}
                    className={`flex-1 bg-transparent text-xs text-slate-900 dark:text-white focus:outline-none ${
                      checked ? 'line-through opacity-60' : ''
                    }`}
                  />
                  <button
                    type="button"
                    onClick={() => handleRemoveScene(idx)}
                    aria-label={`Eliminar toma ${idx + 1}`}
                    className="rounded-lg p-1 text-slate-400 hover:text-rose-500 cursor-pointer shrink-0"
                  >
                    <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {/* Paso 2: Google Flow Bridge + Veo / Gemini Omni Video API */}
      <div className="rounded-2xl border border-[#F5A623]/30 bg-[#F5A623]/[0.06] p-3.5 space-y-2.5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-1.5">
            <Wand2 className="h-4 w-4 text-[#F5A623]" aria-hidden="true" />
            <h4 className="font-display text-xs font-bold uppercase tracking-wide text-slate-900 dark:text-white">
              Paso 2 · Google Flow & Clips Veo / Omni 9:16
            </h4>
          </div>
          <a
            href="https://labs.google/fx/tools/flow"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#FF5A4E] hover:underline"
          >
            <span>Abrir Google Flow</span>
            <ExternalLink className="h-3 w-3" aria-hidden="true" />
          </a>
        </div>

        <textarea
          rows={2}
          value={flowPrompt}
          onChange={(e) => setFlowPrompt(e.target.value)}
          aria-label="Prompt cinematográfico para Google Flow o Veo"
          className="w-full rounded-xl border border-slate-900/12 dark:border-white/12 bg-white/80 dark:bg-[#0B1221]/80 p-2.5 text-xs text-slate-900 dark:text-white focus:border-[#F5A623] focus:outline-none"
        />

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => void handleCopyFlowPrompt()}
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-900/12 dark:border-white/14 bg-white/80 dark:bg-white/[0.06] px-3 py-1.5 text-[11px] font-semibold text-slate-800 dark:text-slate-100 hover:border-[#F5A623] cursor-pointer"
          >
            {copiedFlowPrompt ? (
              <>
                <Check className="h-3.5 w-3.5 text-emerald-500" aria-hidden="true" />
                <span>Prompt copiado</span>
              </>
            ) : (
              <>
                <Copy className="h-3.5 w-3.5" aria-hidden="true" />
                <span>Copiar para Google Flow</span>
              </>
            )}
          </button>

          <button
            type="button"
            disabled={generatingVideo}
            onClick={() => void handleGenerateOmniClip()}
            className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-[#FF5A4E] to-[#F5A623] px-3 py-1.5 text-[11px] font-bold text-white hover:opacity-95 cursor-pointer disabled:opacity-50"
          >
            <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
            <span>
              {generatingVideo
                ? 'Generando clip 9:16…'
                : 'Generar Clip IA (Veo / Omni)'}
            </span>
          </button>
        </div>

        <p className="text-[11px] text-slate-600 dark:text-slate-300">
          Si generas tus videos gratis en Google Flow o grabas con tu celular, guárdalos en{' '}
          <code className="font-mono-tabular text-[#FF5A4E]">local-studio/clips/</code>{' '}
          y aparecerán abajo al instante.
        </p>

        {videoNotice && (
          <p className="rounded-xl border border-slate-900/10 dark:border-white/12 bg-white/75 dark:bg-[#0B1221]/80 px-3 py-2 text-[11px] text-slate-800 dark:text-slate-200">
            {videoNotice}
          </p>
        )}
      </div>

      {/* Hybrid Local Media Sync Section */}
      <div className="space-y-3 pt-3 border-t border-slate-900/8 dark:border-white/10">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h4 className="font-display text-xs font-bold uppercase tracking-wide text-slate-600 dark:text-slate-300">
              Conexión Local & Clips ({piece.sceneClips.length})
            </h4>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              Organización en 4 carpetas: <code>clips/</code>, <code>audio/</code>, <code>resources/</code>, <code>exports/</code>
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            <button
              type="button"
              onClick={handleLoadDemoClips}
              className="inline-flex items-center gap-1.5 rounded-xl border border-[#F5A623]/40 bg-[#F5A623]/14 px-2.5 py-1.5 text-xs font-semibold text-amber-800 dark:text-[#F5A623] hover:bg-[#F5A623]/22 cursor-pointer"
            >
              <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Demo</span>
            </button>

            <button
              type="button"
              onClick={handlePickLocalFolder}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-900/12 dark:border-white/14 bg-white/75 dark:bg-white/[0.06] px-2.5 py-1.5 text-xs font-semibold text-slate-800 dark:text-slate-100 hover:border-[#FF5A4E] cursor-pointer"
            >
              <FolderOpen className="h-3.5 w-3.5 text-[#FF5A4E]" aria-hidden="true" />
              <span>Carpeta PC</span>
            </button>

            <label className="inline-flex items-center gap-1.5 rounded-xl bg-slate-900 dark:bg-white px-3 py-1.5 text-xs font-semibold text-white dark:text-slate-900 hover:opacity-90 cursor-pointer">
              <Upload className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Subir videos</span>
              <input
                type="file"
                accept="video/*"
                multiple
                onChange={handleFilesSelected}
                className="sr-only"
              />
            </label>
          </div>
        </div>

        {localError && (
          <div className="rounded-xl border border-amber-500/35 bg-amber-500/10 px-3 py-2 text-[11px] text-amber-800 dark:text-[#F5A623]">
            {localError}
          </div>
        )}

        {/* Linked PC Folder Browser */}
        {folderName && (
          <div className="rounded-2xl border border-[#FF5A4E]/30 bg-[#FF5A4E]/[0.06] p-3 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-slate-900 dark:text-white flex items-center gap-1.5">
                <FolderOpen className="h-3.5 w-3.5 text-[#FF5A4E]" />
                <span>Carpeta vinculada: {folderName}</span>
              </span>
              <span className="font-mono-tabular text-[11px] text-slate-600 dark:text-slate-300">
                {videoFilesFromFolder.length} videos
              </span>
            </div>
            {videoFilesFromFolder.length === 0 ? (
              <p className="text-[11px] text-slate-600 dark:text-slate-300">
                No se hallaron videos (.mp4/.mov/.webm) dentro de esta carpeta.
              </p>
            ) : (
              <div className="max-h-32 overflow-y-auto space-y-1">
                {videoFilesFromFolder.map((file) => (
                  <div
                    key={file.name}
                    className="flex items-center justify-between gap-2 rounded-lg bg-white/75 dark:bg-[#0B1221]/75 px-2.5 py-1.5 text-[11px]"
                  >
                    <span className="truncate text-slate-800 dark:text-slate-100">
                      {file.name} · {formatFileSize(file.sizeBytes)}
                    </span>
                    <button
                      type="button"
                      onClick={() => void handleAttachLocalFile(file)}
                      className="rounded-md bg-[#FF5A4E] px-2 py-0.5 text-[10px] font-bold text-white hover:opacity-90 cursor-pointer shrink-0"
                    >
                      + Añadir
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Local Express Bridge (local-studio/clips) */}
        <div className="rounded-2xl border border-slate-900/10 dark:border-white/12 bg-white/60 dark:bg-white/[0.03] p-3 space-y-2">
          <div className="flex items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-1.5 min-w-0">
              <HardDrive className="h-3.5 w-3.5 text-[#F5A623] shrink-0" />
              <span className="font-semibold text-slate-800 dark:text-slate-100 truncate">
                {bridgeStatus?.available
                  ? `Express Studio: ${bridgeStatus.clipsCount} clips · ${bridgeStatus.audioCount} audios · ${bridgeStatus.resourcesCount} recursos`
                  : 'Puente Local Express (inactivo en vista estática)'}
              </span>
            </div>
            <button
              type="button"
              onClick={() => void refreshExpressBridge()}
              aria-label="Actualizar archivos locales"
              className="rounded-lg p-1 text-slate-500 hover:text-slate-900 dark:hover:text-white cursor-pointer"
            >
              <RefreshCw
                className={`h-3.5 w-3.5 ${loadingExpress ? 'animate-spin' : ''}`}
              />
            </button>
          </div>

          {bridgeStatus?.available && (
            <>
              {videoFilesFromExpress.length === 0 ? (
                <p className="text-[11px] text-slate-600 dark:text-slate-300">
                  Coloca tus clips `.mp4` o `.mov` (cámara o Google Flow) en{' '}
                  <code className="font-mono-tabular text-[#FF5A4E]">
                    local-studio/clips/
                  </code>{' '}
                  y presiona actualizar para importarlos al timeline.
                </p>
              ) : (
                <div className="max-h-32 overflow-y-auto space-y-1">
                  {videoFilesFromExpress.map((file) => (
                    <div
                      key={file.name}
                      className="flex items-center justify-between gap-2 rounded-lg bg-white/80 dark:bg-[#0B1221]/80 px-2.5 py-1.5 text-[11px]"
                    >
                      <span className="truncate text-slate-800 dark:text-slate-100">
                        {file.name} · {formatFileSize(file.sizeBytes)}
                      </span>
                      <button
                        type="button"
                        onClick={() => void handleAttachLocalFile(file)}
                        className="rounded-md bg-[#F5A623] px-2 py-0.5 text-[10px] font-bold text-slate-950 hover:opacity-90 cursor-pointer shrink-0"
                      >
                        + Añadir
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>

        {/* Active Clips List */}
        {piece.sceneClips.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-900/15 dark:border-white/15 px-4 py-5 text-center text-xs text-slate-600 dark:text-slate-300">
            Sube archivos MP4/MOV, vincula tu carpeta PC, usa{' '}
            <code>local-studio/clips/</code> o toca «Demo» para armar la secuencia Remotion.
          </div>
        ) : (
          <div className="space-y-2">
            {piece.sceneClips.map((clip, idx) => (
              <div
                key={clip.id}
                className="flex items-center justify-between gap-3 rounded-xl border border-slate-900/10 dark:border-white/12 bg-white/70 dark:bg-white/[0.04] px-3 py-2"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <Film className="h-4 w-4 text-[#FF5A4E] shrink-0" aria-hidden="true" />
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-slate-900 dark:text-white truncate">
                      {idx + 1}. {clip.fileName}
                    </p>
                    <p className="text-[11px] text-slate-600 dark:text-slate-300 truncate">
                      {clip.sceneLabel} · {clip.durationSec}s
                      {clip.trimStartSec ? ` · In ${clip.trimStartSec}s` : ''}
                      {clip.sourceType ? ` · ${clip.sourceType}` : ''}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => handleRemoveClip(clip.id)}
                  aria-label={`Quitar ${clip.fileName}`}
                  className="rounded-lg p-1.5 text-slate-400 hover:text-rose-500 cursor-pointer"
                >
                  <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
