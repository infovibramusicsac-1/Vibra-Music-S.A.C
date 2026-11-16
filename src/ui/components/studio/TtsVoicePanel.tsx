import React, { useEffect, useState } from 'react';
import {
  HardDrive,
  Mic,
  Music,
  RefreshCw,
  Sparkles,
  Square,
  Volume2,
} from 'lucide-react';
import type { ContentPiece, LocalMediaFile } from '../../../domain/entities';
import type { TtsVoiceOption } from '../../../domain/ports/TtsEnginePort';
import { BGM_CATALOG } from '../../../domain/value-objects';
import { useVibraServices } from '../../context/VibraServicesContext';

interface TtsVoicePanelProps {
  piece: ContentPiece;
  onUpdate: (next: ContentPiece) => void;
}

const GEMINI_TTS_VOICES = [
  { id: 'Aoede', label: 'Aoede (Cálida expresiva)' },
  { id: 'Puck', label: 'Puck (Dinámica juvenil)' },
  { id: 'Kore', label: 'Kore (Clara educativa)' },
  { id: 'Zephyr', label: 'Zephyr (Natural brillante)' },
  { id: 'Charon', label: 'Charon (Grave narrativa)' },
];

export const TtsVoicePanel: React.FC<TtsVoicePanelProps> = ({
  piece,
  onUpdate,
}) => {
  const { ttsEngine, aiCreative, localMedia } = useVibraServices();
  const [voices, setVoices] = useState<TtsVoiceOption[]>(() =>
    ttsEngine.getSpanishVoices()
  );
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [ttsNotice, setTtsNotice] = useState<string | null>(null);

  // Server-side Gemini TTS (.WAV real) + Express local-studio/audio/
  const [geminiVoice, setGeminiVoice] = useState('Aoede');
  const [generatingWav, setGeneratingWav] = useState(false);
  const [geminiTtsNotice, setGeminiTtsNotice] = useState<string | null>(null);
  const [expressAudioFiles, setExpressAudioFiles] = useState<LocalMediaFile[]>(
    []
  );

  const loadExpressAudio = async () => {
    try {
      const files = await localMedia.listExpressMedia('audio');
      setExpressAudioFiles(files.filter((f) => f.kind === 'audio'));
    } catch {
      setExpressAudioFiles([]);
    }
  };

  useEffect(() => {
    void loadExpressAudio();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const refreshVoices = () => {
      setVoices(ttsEngine.getSpanishVoices());
    };
    refreshVoices();
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.addEventListener('voiceschanged', refreshVoices);
      return () => {
        window.speechSynthesis.removeEventListener(
          'voiceschanged',
          refreshVoices
        );
      };
    }
    return undefined;
  }, [ttsEngine]);

  const voiceText =
    piece.voiceoverText.trim().length > 0
      ? piece.voiceoverText
      : `${piece.hook}. ${piece.script}`;

  const estimatedSec = ttsEngine.estimateDurationSec(
    voiceText,
    piece.voiceConfig.rate
  );

  const handleToggleSpeak = () => {
    if (isSpeaking) {
      ttsEngine.stop();
      setIsSpeaking(false);
      return;
    }

    setTtsNotice(null);
    ttsEngine.speak(voiceText, piece.voiceConfig, {
      onStart: () => setIsSpeaking(true),
      onEnd: () => setIsSpeaking(false),
      onError: (reason) => {
        setIsSpeaking(false);
        setTtsNotice(reason);
      },
    });
  };

  const handleGenerateGeminiWav = async () => {
    if (generatingWav) return;
    setGeneratingWav(true);
    setGeminiTtsNotice(null);
    try {
      const res = await aiCreative.generateGeminiTts({
        text: voiceText,
        voiceName: geminiVoice,
        saveToLocal: true,
        fileNameHint: `vibra_${piece.id}_voz`,
      });
      onUpdate({
        ...piece,
        customAudioUrl: res.audioUrl,
        customAudioName: res.fileName,
      });
      setGeminiTtsNotice(
        res.savedPath
          ? `Voz .WAV guardada en ${res.savedPath} y conectada al reproductor.`
          : 'Voz .WAV generada y conectada al reproductor.'
      );
      void loadExpressAudio();
    } catch (err) {
      setGeminiTtsNotice(
        err instanceof Error
          ? err.message
          : 'No se pudo sintetizar la voz con Gemini TTS.'
      );
    } finally {
      setGeneratingWav(false);
    }
  };

  return (
    <div className="space-y-4 pt-2 border-t border-slate-900/8 dark:border-white/10">
      {piece.voice === 'Con voz' ? (
        <div className="space-y-3 rounded-2xl border border-[#FF5A4E]/25 bg-[#FF5A4E]/[0.06] p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Mic className="h-4 w-4 text-[#FF5A4E]" aria-hidden="true" />
              <h4 className="font-display text-xs font-bold uppercase tracking-wide text-slate-900 dark:text-white">
                Locución TTS en Español & Gemini Audio (.WAV)
              </h4>
            </div>
            <span className="font-mono-tabular text-xs font-semibold text-[#FF5A4E] dark:text-[#FF7A6E]">
              Duración estimada: {estimatedSec}s
            </span>
          </div>

          <div className="space-y-1.5">
            <label className="text-[11px] font-medium text-slate-600 dark:text-slate-300">
              Texto para locución
            </label>
            <textarea
              rows={3}
              value={piece.voiceoverText}
              onChange={(e) =>
                onUpdate({ ...piece, voiceoverText: e.target.value })
              }
              placeholder="Escribe el texto exacto que leerá la voz IA..."
              className="w-full rounded-xl border border-slate-900/10 dark:border-white/12 bg-white/80 dark:bg-[#0B1221]/80 p-2.5 text-xs text-slate-900 dark:text-white focus:border-[#FF5A4E] focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="space-y-1">
              <label className="text-[11px] font-medium text-slate-600 dark:text-slate-300">
                Voz navegador (previsualización)
              </label>
              <select
                value={piece.voiceConfig.voiceURI}
                onChange={(e) => {
                  const found = voices.find(
                    (v) => v.voiceURI === e.target.value
                  );
                  onUpdate({
                    ...piece,
                    voiceConfig: {
                      ...piece.voiceConfig,
                      voiceURI: e.target.value,
                      voiceName: found?.name ?? 'Voz Español Automática',
                    },
                  });
                }}
                className="w-full rounded-xl border border-slate-900/10 dark:border-white/12 bg-white/80 dark:bg-[#0B1221]/80 px-2.5 py-2 text-xs text-slate-900 dark:text-white"
              >
                <option value="">Automática (es-PE / es-419)</option>
                {voices.map((v) => (
                  <option key={v.voiceURI} value={v.voiceURI}>
                    {v.name} ({v.lang})
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <div className="flex items-center justify-between text-[11px]">
                <span className="font-medium text-slate-600 dark:text-slate-300">
                  Velocidad
                </span>
                <span className="font-mono-tabular font-semibold text-slate-900 dark:text-white">
                  {piece.voiceConfig.rate.toFixed(2)}x
                </span>
              </div>
              <input
                type="range"
                min={0.85}
                max={1.3}
                step={0.05}
                value={piece.voiceConfig.rate}
                onChange={(e) =>
                  onUpdate({
                    ...piece,
                    voiceConfig: {
                      ...piece.voiceConfig,
                      rate: Number(e.target.value),
                    },
                  })
                }
                className="w-full accent-[#FF5A4E] cursor-pointer"
              />
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
            <button
              type="button"
              onClick={handleToggleSpeak}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-900/12 dark:border-white/15 bg-white/80 dark:bg-white/8 px-3.5 py-2 text-xs font-bold text-slate-900 dark:text-white cursor-pointer"
            >
              {isSpeaking ? (
                <>
                  <Square className="h-3.5 w-3.5 text-[#FF5A4E]" aria-hidden="true" />
                  <span>Detener voz</span>
                </>
              ) : (
                <>
                  <Volume2 className="h-3.5 w-3.5 text-[#FF5A4E]" aria-hidden="true" />
                  <span>Escuchar navegador</span>
                </>
              )}
            </button>

            <div className="flex flex-wrap items-center gap-1.5">
              <select
                value={geminiVoice}
                aria-label="Voz Gemini TTS"
                onChange={(e) => setGeminiVoice(e.target.value)}
                className="rounded-xl border border-slate-900/12 dark:border-white/14 bg-white/85 dark:bg-[#0B1221] px-2.5 py-2 text-xs text-slate-900 dark:text-white"
              >
                {GEMINI_TTS_VOICES.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.label}
                  </option>
                ))}
              </select>

              <button
                type="button"
                disabled={generatingWav}
                onClick={() => void handleGenerateGeminiWav()}
                className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-[#FF5A4E] to-[#F5A623] px-3.5 py-2 text-xs font-bold text-white shadow-sm cursor-pointer disabled:opacity-50"
              >
                <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
                <span>
                  {generatingWav ? 'Sintetizando…' : 'Generar .WAV Gemini TTS'}
                </span>
              </button>
            </div>
          </div>

          {ttsNotice && (
            <p className="text-[11px] text-rose-500">{ttsNotice}</p>
          )}
          {geminiTtsNotice && (
            <p className="rounded-xl border border-slate-900/10 dark:border-white/12 bg-white/75 dark:bg-[#0B1221]/80 px-3 py-2 text-[11px] text-slate-800 dark:text-slate-200">
              {geminiTtsNotice}
            </p>
          )}
        </div>
      ) : null}

      {/* Commercial BGM Track Selector + Custom Audio / local-studio/audio */}
      <div className="space-y-3 rounded-2xl border border-slate-900/8 dark:border-white/10 bg-white/50 dark:bg-white/[0.03] p-4">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Music className="h-4 w-4 text-[#F5A623]" aria-hidden="true" />
            <h4 className="font-display text-xs font-bold uppercase tracking-wide text-slate-800 dark:text-slate-100">
              Pista musical de fondo (BGM con licencia)
            </h4>
          </div>
          <span className="font-mono-tabular text-[11px] text-slate-500 dark:text-slate-400">
            Volumen: {piece.bgmVolume}%
          </span>
        </div>

        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {BGM_CATALOG.map((track) => {
            const active = piece.bgmTrackId === track.id;
            return (
              <button
                key={track.id}
                type="button"
                onClick={() => onUpdate({ ...piece, bgmTrackId: track.id })}
                className={`rounded-xl border p-2.5 text-left transition-colors cursor-pointer ${
                  active
                    ? 'border-[#F5A623] bg-[#F5A623]/12'
                    : 'border-slate-900/8 dark:border-white/10 hover:border-slate-900/20 dark:hover:border-white/25'
                }`}
              >
                <p className="text-xs font-semibold text-slate-900 dark:text-white">
                  {track.title}
                </p>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  {track.mood} · {track.bpm} BPM
                </p>
              </button>
            );
          })}
        </div>

        <input
          type="range"
          min={0}
          max={100}
          value={piece.bgmVolume}
          aria-label="Volumen de música de fondo"
          onChange={(e) =>
            onUpdate({ ...piece, bgmVolume: Number(e.target.value) })
          }
          className="w-full accent-[#F5A623] cursor-pointer"
        />

        {/* Custom Uploaded / Local-Studio Audio */}
        <div className="pt-2 border-t border-slate-900/8 dark:border-white/10 space-y-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="min-w-0">
              <p className="text-[11px] font-semibold text-slate-800 dark:text-slate-100">
                Pista de voz / audio real para .MP4 (<code>local-studio/audio/</code>)
              </p>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                {piece.customAudioName
                  ? `Activa: ${piece.customAudioName} (BGM baja a 35% automáticamente)`
                  : 'Sube tu .MP3/.WAV/.M4A o selecciona uno de local-studio/audio/'}
              </p>
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              {piece.customAudioUrl && (
                <button
                  type="button"
                  onClick={() => {
                    if (piece.customAudioUrl?.startsWith('blob:')) {
                      URL.revokeObjectURL(piece.customAudioUrl);
                    }
                    onUpdate({
                      ...piece,
                      customAudioUrl: undefined,
                      customAudioName: undefined,
                    });
                  }}
                  className="rounded-lg border border-rose-500/35 px-2.5 py-1 text-[11px] font-semibold text-rose-600 dark:text-rose-300 hover:bg-rose-500/12 cursor-pointer"
                >
                  Quitar audio
                </button>
              )}

              <label className="rounded-xl border border-slate-900/12 dark:border-white/14 bg-white/80 dark:bg-white/[0.06] px-3 py-1.5 text-[11px] font-semibold text-slate-800 dark:text-slate-100 hover:border-[#FF5A4E] cursor-pointer">
                <span>
                  {piece.customAudioUrl ? 'Cambiar audio' : 'Subir .MP3 / .WAV'}
                </span>
                <input
                  type="file"
                  accept="audio/*"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    if (piece.customAudioUrl?.startsWith('blob:')) {
                      URL.revokeObjectURL(piece.customAudioUrl);
                    }
                    const url = URL.createObjectURL(file);
                    onUpdate({
                      ...piece,
                      customAudioUrl: url,
                      customAudioName: file.name,
                    });
                    e.target.value = '';
                  }}
                  className="sr-only"
                />
              </label>
            </div>
          </div>

          {expressAudioFiles.length > 0 && (
            <div className="rounded-xl border border-slate-900/8 dark:border-white/10 bg-white/60 dark:bg-[#0B1221]/60 p-2 space-y-1">
              <div className="flex items-center justify-between text-[10px] font-semibold text-slate-600 dark:text-slate-300">
                <span className="inline-flex items-center gap-1">
                  <HardDrive className="h-3 w-3 text-[#F5A623]" />
                  <span>Audios en local-studio/audio/</span>
                </span>
                <button
                  type="button"
                  onClick={() => void loadExpressAudio()}
                  className="hover:text-slate-900 dark:hover:text-white cursor-pointer"
                  aria-label="Actualizar audios locales"
                >
                  <RefreshCw className="h-3 w-3" />
                </button>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {expressAudioFiles.map((file) => (
                  <button
                    key={file.name}
                    type="button"
                    onClick={() =>
                      onUpdate({
                        ...piece,
                        customAudioUrl: file.url,
                        customAudioName: file.name,
                      })
                    }
                    className="rounded-lg border border-slate-900/10 dark:border-white/12 bg-white/80 dark:bg-white/5 px-2 py-1 text-[10px] font-semibold text-slate-800 dark:text-slate-100 hover:border-[#F5A623] cursor-pointer"
                  >
                    Usar {file.name}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
