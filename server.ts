import 'dotenv/config';
import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI, Type } from '@google/genai';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT || 3000);
const LOCAL_ROOT = path.resolve(__dirname, 'local-studio');
const CLIPS_DIR = path.join(LOCAL_ROOT, 'clips');
const AUDIO_DIR = path.join(LOCAL_ROOT, 'audio');
const RESOURCES_DIR = path.join(LOCAL_ROOT, 'resources');
const EXPORTS_DIR = path.join(LOCAL_ROOT, 'exports');
const LEGACY_MEDIA_DIR = path.join(LOCAL_ROOT, 'media');

type StudioFolderCategory = 'clips' | 'audio' | 'resources';

const CATEGORY_DIRS: Record<StudioFolderCategory, string> = {
  clips: CLIPS_DIR,
  audio: AUDIO_DIR,
  resources: RESOURCES_DIR,
};

const ALLOWED_VIDEO_EXTS = new Set(['.mp4', '.mov', '.webm', '.m4v']);
const ALLOWED_AUDIO_EXTS = new Set(['.mp3', '.wav', '.m4a', '.ogg']);
const ALLOWED_IMAGE_EXTS = new Set(['.png', '.jpg', '.jpeg', '.webp', '.svg']);
const ALLOWED_MEDIA_EXTS = new Set([
  ...ALLOWED_VIDEO_EXTS,
  ...ALLOWED_AUDIO_EXTS,
  ...ALLOWED_IMAGE_EXTS,
]);

function ensureLocalStudioDirs(): void {
  fs.mkdirSync(CLIPS_DIR, { recursive: true });
  fs.mkdirSync(AUDIO_DIR, { recursive: true });
  fs.mkdirSync(RESOURCES_DIR, { recursive: true });
  fs.mkdirSync(EXPORTS_DIR, { recursive: true });
}

function getMimeType(filename: string): string {
  const ext = path.extname(filename).toLowerCase();
  switch (ext) {
    case '.mp4':
    case '.m4v':
      return 'video/mp4';
    case '.mov':
      return 'video/quicktime';
    case '.webm':
      return 'video/webm';
    case '.mp3':
      return 'audio/mpeg';
    case '.wav':
      return 'audio/wav';
    case '.m4a':
      return 'audio/mp4';
    case '.ogg':
      return 'audio/ogg';
    case '.png':
      return 'image/png';
    case '.jpg':
    case '.jpeg':
      return 'image/jpeg';
    case '.webp':
      return 'image/webp';
    case '.svg':
      return 'image/svg+xml';
    case '.srt':
      return 'text/plain; charset=utf-8';
    case '.json':
      return 'application/json; charset=utf-8';
    default:
      return 'application/octet-stream';
  }
}

function getKindFromMime(mimeType: string): 'video' | 'audio' | 'image' {
  if (mimeType.startsWith('audio/')) return 'audio';
  if (mimeType.startsWith('image/')) return 'image';
  return 'video';
}

function sanitizeFilename(rawName: string): string {
  const base = path.basename(rawName).replace(/[^a-zA-Z0-9._-]/g, '_');
  return base || `asset_${Date.now()}`;
}

function scanFolder(
  dirPath: string,
  category: StudioFolderCategory,
  routePrefix: string
) {
  if (!fs.existsSync(dirPath)) return [];
  const entries = fs.readdirSync(dirPath, { withFileTypes: true });
  return entries
    .filter(
      (entry) =>
        entry.isFile() &&
        ALLOWED_MEDIA_EXTS.has(path.extname(entry.name).toLowerCase())
    )
    .map((entry) => {
      const fullPath = path.join(dirPath, entry.name);
      const stat = fs.statSync(fullPath);
      const mimeType = getMimeType(entry.name);
      return {
        name: entry.name,
        sizeBytes: stat.size,
        mimeType,
        kind: getKindFromMime(mimeType),
        category,
        url: `${routePrefix}/${encodeURIComponent(entry.name)}`,
        source: 'express-disk' as const,
      };
    });
}

function streamMediaFile(
  req: express.Request,
  res: express.Response,
  baseDir: string,
  filename: string
): void {
  const safeName = path.basename(filename);
  const targetPath = path.resolve(baseDir, safeName);

  if (!targetPath.startsWith(baseDir) || !fs.existsSync(targetPath)) {
    res.status(404).json({ error: 'Archivo no encontrado en local-studio.' });
    return;
  }

  const stat = fs.statSync(targetPath);
  const fileSize = stat.size;
  const range = req.headers.range;
  const contentType = getMimeType(safeName);

  if (range) {
    const parts = range.replace(/bytes=/, '').split('-');
    const start = parseInt(parts[0], 10);
    const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
    const chunkSize = end - start + 1;
    const stream = fs.createReadStream(targetPath, { start, end });
    res.writeHead(206, {
      'Content-Range': `bytes ${start}-${end}/${fileSize}`,
      'Accept-Ranges': 'bytes',
      'Content-Length': chunkSize,
      'Content-Type': contentType,
    });
    stream.pipe(res);
    return;
  }

  res.writeHead(200, {
    'Content-Length': fileSize,
    'Content-Type': contentType,
    'Accept-Ranges': 'bytes',
  });
  fs.createReadStream(targetPath).pipe(res);
}

function getGeminiClient(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) return null;
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

function wrapPcm16AsWav(pcmBytes: Buffer, sampleRate = 24000): Buffer {
  const header = Buffer.alloc(44);
  const byteRate = sampleRate * 2;
  header.write('RIFF', 0);
  header.writeUInt32LE(36 + pcmBytes.length, 4);
  header.write('WAVE', 8);
  header.write('fmt ', 12);
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20);
  header.writeUInt16LE(1, 22);
  header.writeUInt32LE(sampleRate, 24);
  header.writeUInt32LE(byteRate, 28);
  header.writeUInt16LE(2, 32);
  header.writeUInt16LE(16, 34);
  header.write('data', 36);
  header.writeUInt32LE(pcmBytes.length, 40);
  return Buffer.concat([header, pcmBytes]);
}

async function startServer(): Promise<void> {
  ensureLocalStudioDirs();

  const app = express();
  app.use(express.json({ limit: '150mb' }));

  app.get('/api/local/status', (_req, res) => {
    ensureLocalStudioDirs();
    const clipsFiles = scanFolder(CLIPS_DIR, 'clips', '/api/local/media/clips');
    const audioFiles = scanFolder(AUDIO_DIR, 'audio', '/api/local/media/audio');
    const resourcesFiles = scanFolder(
      RESOURCES_DIR,
      'resources',
      '/api/local/media/resources'
    );
    const legacyFiles = scanFolder(
      LEGACY_MEDIA_DIR,
      'clips',
      '/api/local/media/file'
    );
    const exportFiles = fs.existsSync(EXPORTS_DIR)
      ? fs.readdirSync(EXPORTS_DIR)
      : [];

    const clipsCount =
      clipsFiles.length +
      legacyFiles.filter((f) => f.kind === 'video').length;
    const audioCount =
      audioFiles.length +
      legacyFiles.filter((f) => f.kind === 'audio').length;
    const resourcesCount =
      resourcesFiles.length +
      legacyFiles.filter((f) => f.kind === 'image').length;

    res.json({
      available: true,
      mediaDir: 'local-studio/clips',
      clipsDir: 'local-studio/clips',
      audioDir: 'local-studio/audio',
      resourcesDir: 'local-studio/resources',
      exportsDir: 'local-studio/exports',
      mediaCount: clipsCount + audioCount + resourcesCount,
      clipsCount,
      audioCount,
      resourcesCount,
      exportCount: exportFiles.length,
    });
  });

  app.get('/api/local/media', (req, res) => {
    ensureLocalStudioDirs();
    const rawCat = String(req.query.category ?? 'all');

    const clips = scanFolder(CLIPS_DIR, 'clips', '/api/local/media/clips');
    const audio = scanFolder(AUDIO_DIR, 'audio', '/api/local/media/audio');
    const resources = scanFolder(
      RESOURCES_DIR,
      'resources',
      '/api/local/media/resources'
    );
    const legacy = scanFolder(
      LEGACY_MEDIA_DIR,
      'clips',
      '/api/local/media/file'
    ).map((file) => ({
      ...file,
      category:
        file.kind === 'audio'
          ? ('audio' as const)
          : file.kind === 'image'
            ? ('resources' as const)
            : ('clips' as const),
    }));

    let files = [...clips, ...audio, ...resources, ...legacy];
    if (rawCat === 'clips' || rawCat === 'audio' || rawCat === 'resources') {
      files = files.filter((f) => f.category === rawCat);
    }

    res.json({ files });
  });

  app.get('/api/local/media/:category/:filename', (req, res) => {
    ensureLocalStudioDirs();
    const category = req.params.category;
    if (category === 'file') {
      const targetDir = fs.existsSync(
        path.resolve(LEGACY_MEDIA_DIR, path.basename(req.params.filename))
      )
        ? LEGACY_MEDIA_DIR
        : CLIPS_DIR;
      streamMediaFile(req, res, targetDir, req.params.filename);
      return;
    }

    if (
      category !== 'clips' &&
      category !== 'audio' &&
      category !== 'resources'
    ) {
      res.status(400).json({ error: 'Categoría local inválida.' });
      return;
    }

    streamMediaFile(req, res, CATEGORY_DIRS[category], req.params.filename);
  });

  app.get('/api/local/exports', (_req, res) => {
    ensureLocalStudioDirs();
    const entries = fs.readdirSync(EXPORTS_DIR, { withFileTypes: true });
    const files = entries
      .filter((e) => e.isFile())
      .map((e) => {
        const fullPath = path.join(EXPORTS_DIR, e.name);
        const stat = fs.statSync(fullPath);
        return {
          name: e.name,
          sizeBytes: stat.size,
          updatedAt: stat.mtime.toISOString(),
        };
      });
    res.json({ files });
  });

  app.post('/api/local/export', (req, res) => {
    ensureLocalStudioDirs();
    const { filename, contentBase64 } = req.body as {
      filename?: string;
      contentBase64?: string;
    };

    if (!filename || !contentBase64) {
      res.status(400).json({ error: 'Falta filename o contentBase64' });
      return;
    }

    const safeName = sanitizeFilename(filename);
    const targetPath = path.resolve(EXPORTS_DIR, safeName);
    if (!targetPath.startsWith(EXPORTS_DIR)) {
      res.status(400).json({ error: 'Ruta inválida' });
      return;
    }

    const buffer = Buffer.from(contentBase64, 'base64');
    fs.writeFileSync(targetPath, buffer);

    res.json({
      savedPath: `local-studio/exports/${safeName}`,
      sizeBytes: buffer.length,
    });
  });

  // ---------------------------------------------------------------------------
  // Server-side Gemini Creative API Endpoints (API key never sent to browser)
  // ---------------------------------------------------------------------------

  app.get('/api/gemini/status', (_req, res) => {
    res.json({
      configured: Boolean(process.env.GEMINI_API_KEY?.trim()),
      models: {
        script: 'gemini-4-hydrogen',
        tts: 'gemini-3.8-flash-lite-tts',
        video: 'gemini-omni-1.2-flash',
      },
    });
  });

  app.post('/api/gemini/script', async (req, res) => {
    const ai = getGeminiClient();
    if (!ai) {
      res.status(503).json({
        configured: false,
        error:
          'GEMINI_API_KEY no configurada en el servidor. Usa «Aplicar plantilla local de Dato Curioso» o edita el guion manualmente.',
      });
      return;
    }

    const { topic, pillar, audienceName, angle, cta } = req.body as {
      topic?: string;
      pillar?: string;
      audienceName?: string;
      angle?: string;
      cta?: string;
    };

    try {
      const prompt = [
        'Eres director creativo de Vibra Music S.A.C. (academia de música moderna en San Juan de Lurigancho, Lima).',
        `Genera un guion vertical 9:16 (18 a 25 segundos) en español peruano cercano y enérgico.`,
        `Pilar: ${pillar || 'Educación Musical'}. Audiencia: ${audienceName || 'Niños y padres'}.`,
        `Enfoque narrativo: ${angle || 'dato_curioso'}. Tema base: ${topic || 'Beneficios reales de tocar un instrumento'}.`,
        `CTA objetivo: ${cta || 'Reserva tu clase piloto gratuita en Vibra Music'}.`,
        'Reglas de marca: prohibido usar frases clichés como "desbloquea tu potencial" o placeholders entre corchetes.',
      ].join('\n');

      const response = await ai.models.generateContent({
        model: 'gemini-4-hydrogen',
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              curiousFactTitle: { type: Type.STRING },
              hook: { type: Type.STRING },
              script: { type: Type.STRING },
              voiceoverText: { type: Type.STRING },
              cta: { type: Type.STRING },
            },
            required: [
              'curiousFactTitle',
              'hook',
              'script',
              'voiceoverText',
              'cta',
            ],
          },
        },
      });

      const parsed = JSON.parse(response.text || '{}');
      res.json(parsed);
    } catch (err) {
      console.error('Error /api/gemini/script:', err);
      res.status(500).json({
        error:
          err instanceof Error
            ? err.message
            : 'No se pudo generar el guion con Gemini.',
      });
    }
  });

  app.post('/api/gemini/prompt-post', async (req, res) => {
    const ai = getGeminiClient();
    if (!ai) {
      res.status(503).json({
        configured: false,
        error:
          'GEMINI_API_KEY no configurada en el servidor. Usa «Analizar Prompt (Local)» para parsear guiones y tablas sin API al instante.',
      });
      return;
    }

    const { prompt, targetDurationSec } = req.body as {
      prompt?: string;
      targetDurationSec?: number;
    };

    if (!prompt?.trim()) {
      res.status(400).json({ error: 'Falta el prompt o guion de entrada.' });
      return;
    }

    try {
      const instruction = [
        'Eres director de edición de Vibra Music S.A.C. (academia de música moderna en San Juan de Lurigancho, Lima).',
        `Convierte el siguiente prompt/guion en una escaleta vertical 9:16 exacta (~${targetDurationSec ?? 45}s) dividida en beats cronometrados.`,
        'Para cada beat incluye: startSec, endSec, role (hook|body|cta), spokenText (locución exacta), kineticText (texto en pantalla corto e impactante), highlightWord (palabra clave a destacar), highlightColor (ej. #F4A048 o #FF5A4E), stepByStepItems (opcional si va palabra por pantalla) y sfxLabel (boom grave, whoosh, pop, ding suave, ráfaga de 3 destellos + boom grave, ding + corte seco).',
        'Usa pillar válido: Nueva Visión | Tienda | Festivo | Conversión | Comunidad.',
        'Usa funnelStage válido: TOFU | MOFU | BOFU.',
        'Usa concept válido: POV | UGC | Fundador | Venta | Educativo | Testimonio.',
        '',
        'PROMPT DEL USUARIO:',
        prompt.trim(),
      ].join('\n');

      const response = await ai.models.generateContent({
        model: 'gemini-4-hydrogen',
        contents: instruction,
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              title: { type: Type.STRING },
              coreIdea: { type: Type.STRING },
              durationSec: { type: Type.NUMBER },
              pillar: { type: Type.STRING },
              audienceName: { type: Type.STRING },
              funnelStage: { type: Type.STRING },
              concept: { type: Type.STRING },
              voice: { type: Type.STRING },
              cta: { type: Type.STRING },
              beats: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    startSec: { type: Type.NUMBER },
                    endSec: { type: Type.NUMBER },
                    role: { type: Type.STRING },
                    spokenText: { type: Type.STRING },
                    kineticText: { type: Type.STRING },
                    highlightWord: { type: Type.STRING },
                    highlightColor: { type: Type.STRING },
                    stepByStepItems: {
                      type: Type.ARRAY,
                      items: { type: Type.STRING },
                    },
                    sfxLabel: { type: Type.STRING },
                  },
                  required: [
                    'startSec',
                    'endSec',
                    'role',
                    'spokenText',
                    'kineticText',
                    'sfxLabel',
                  ],
                },
              },
            },
            required: ['title', 'coreIdea', 'durationSec', 'beats'],
          },
        },
      });

      const parsed = JSON.parse(response.text || '{}') as Record<string, unknown>;
      const validPillars = ['Nueva Visión', 'Tienda', 'Festivo', 'Conversión', 'Comunidad'];
      const validFunnels = ['TOFU', 'MOFU', 'BOFU'];
      const validConcepts = ['POV', 'UGC', 'Fundador', 'Venta', 'Educativo', 'Testimonio'];
      const validRoles = ['hook', 'body', 'cta'];

      const normalizeHex = (raw: unknown): string | undefined => {
        if (typeof raw !== 'string') return undefined;
        const cleaned = raw.trim().replace(/^#+/, '');
        return /^[0-9a-fA-F]{6}$/.test(cleaned) ? `#${cleaned.toUpperCase()}` : '#F4A048';
      };

      const rawVoice = typeof parsed.voice === 'string' ? parsed.voice : '';
      const normalizedVoice =
        rawVoice === 'Sin voz' || rawVoice.toLowerCase().includes('sin voz')
          ? 'Sin voz'
          : 'Con voz';

      const rawBeats = Array.isArray(parsed.beats) ? parsed.beats : [];
      const normalizedBeats = rawBeats.map((b: Record<string, unknown>) => ({
        ...b,
        role: validRoles.includes(String(b.role)) ? b.role : 'body',
        highlightColor: normalizeHex(b.highlightColor),
      }));

      res.json({
        ...parsed,
        pillar: validPillars.includes(String(parsed.pillar))
          ? parsed.pillar
          : 'Conversión',
        funnelStage: validFunnels.includes(String(parsed.funnelStage))
          ? parsed.funnelStage
          : 'BOFU',
        concept: validConcepts.includes(String(parsed.concept))
          ? parsed.concept
          : 'Venta',
        voice: normalizedVoice,
        beats: normalizedBeats,
      });
    } catch (err) {
      console.error('Error /api/gemini/prompt-post:', err);
      res.status(500).json({
        error:
          err instanceof Error
            ? err.message
            : 'No se pudo expandir el prompt con Gemini.',
      });
    }
  });

  app.post('/api/gemini/tts', async (req, res) => {
    const ai = getGeminiClient();
    if (!ai) {
      res.status(503).json({
        configured: false,
        error:
          'GEMINI_API_KEY no configurada en el servidor. Sube tu voz (.MP3/.WAV) o colócala en local-studio/audio/.',
      });
      return;
    }

    const { text, voiceName, saveToLocal, fileNameHint } = req.body as {
      text?: string;
      voiceName?: string;
      saveToLocal?: boolean;
      fileNameHint?: string;
    };

    if (!text?.trim()) {
      res.status(400).json({ error: 'Falta el texto para locución TTS.' });
      return;
    }

    try {
      const response = await ai.models.generateContent({
        model: 'gemini-3.8-flash-lite-tts',
        contents: text.trim(),
        config: {
          responseModalities: ['AUDIO'],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: {
                voiceName: voiceName || 'Aoede',
              },
            },
          },
        },
      });

      const parts = response.candidates?.[0]?.content?.parts ?? [];
      const audioPart = parts.find((p) => p.inlineData?.data);
      const rawData = audioPart?.inlineData?.data;
      const rawMime = audioPart?.inlineData?.mimeType || 'audio/wav';

      if (!rawData) {
        res
          .status(502)
          .json({ error: 'Gemini TTS no devolvió audio generado.' });
        return;
      }

      let audioBuf: Buffer = Buffer.from(rawData, 'base64');
      let finalMime = rawMime;
      if (rawMime.includes('L16') || rawMime.includes('pcm')) {
        audioBuf = wrapPcm16AsWav(audioBuf, 24000);
        finalMime = 'audio/wav';
      }

      const safeName = sanitizeFilename(
        `${fileNameHint || 'vibra_tts'}_${Date.now()}.wav`
      );
      let savedPath: string | undefined;
      let url: string | undefined;

      if (saveToLocal !== false) {
        ensureLocalStudioDirs();
        const target = path.resolve(AUDIO_DIR, safeName);
        if (target.startsWith(AUDIO_DIR)) {
          fs.writeFileSync(target, audioBuf);
          savedPath = `local-studio/audio/${safeName}`;
          url = `/api/local/media/audio/${encodeURIComponent(safeName)}`;
        }
      }

      res.json({
        audioBase64: audioBuf.toString('base64'),
        mimeType: finalMime,
        fileName: safeName,
        savedPath,
        url,
      });
    } catch (err) {
      console.error('Error /api/gemini/tts:', err);
      res.status(500).json({
        error:
          err instanceof Error
            ? err.message
            : 'No se pudo sintetizar la voz con Gemini TTS.',
      });
    }
  });

  app.post('/api/gemini/video', async (req, res) => {
    const ai = getGeminiClient();
    if (!ai) {
      res.status(503).json({
        configured: false,
        error:
          'GEMINI_API_KEY de pago no configurada. Copia el prompt para Google Flow o agrega clips locales en local-studio/clips/.',
      });
      return;
    }

    const {
      prompt,
      aspectRatio,
      durationSec,
      resolution,
      saveToLocal,
      fileNameHint,
    } = req.body as {
      prompt?: string;
      aspectRatio?: '9:16' | '16:9';
      durationSec?: number;
      resolution?: '360p' | '720p' | '1080p';
      saveToLocal?: boolean;
      fileNameHint?: string;
    };

    if (!prompt?.trim()) {
      res.status(400).json({ error: 'Falta el prompt visual del clip.' });
      return;
    }

    try {
      const clampedDuration = Math.min(
        15,
        Math.max(3, Math.round(durationSec ?? 5))
      );

      const interaction = await ai.interactions.create(
        {
          model: 'gemini-omni-1.2-flash',
          input: prompt.trim(),
          background: false,
          store: false,
          stream: false,
          response_format: {
            type: 'video',
            aspect_ratio: aspectRatio || '9:16',
            duration: `${clampedDuration}s`,
            resolution: resolution || '720p',
          },
        },
        { timeout: 300000 }
      );

      const videoPart = interaction.output_video;
      if (!videoPart?.data) {
        res.status(502).json({
          error: 'Veo / Gemini Omni Flash no devolvió un clip de video.',
        });
        return;
      }

      const videoBuf = Buffer.from(videoPart.data, 'base64');
      const mimeType = videoPart.mime_type || 'video/mp4';
      const safeName = sanitizeFilename(
        `${fileNameHint || 'vibra_omni_clip'}_${Date.now()}.mp4`
      );
      let savedPath: string | undefined;
      let url: string | undefined;

      if (saveToLocal !== false) {
        ensureLocalStudioDirs();
        const target = path.resolve(CLIPS_DIR, safeName);
        if (target.startsWith(CLIPS_DIR)) {
          fs.writeFileSync(target, videoBuf);
          savedPath = `local-studio/clips/${safeName}`;
          url = `/api/local/media/clips/${encodeURIComponent(safeName)}`;
        }
      }

      res.json({
        videoBase64: videoBuf.toString('base64'),
        mimeType,
        fileName: safeName,
        savedPath,
        url,
      });
    } catch (err) {
      console.error('Error /api/gemini/video:', err);
      res.status(500).json({
        error:
          err instanceof Error
            ? err.message
            : 'No se pudo generar el clip con Veo / Gemini Omni.',
      });
    }
  });

  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(__dirname, 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(
      `Vibra Marketing OS + Local Bridge running on http://0.0.0.0:${PORT}`
    );
  });
}

void startServer();
