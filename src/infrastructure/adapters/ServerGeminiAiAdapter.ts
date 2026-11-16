import type {
  AiBackendStatus,
  AiCreativePort,
  GeneratedPromptPostResult,
  GeneratedScriptResult,
  GeneratedTtsResult,
  GeneratedVideoResult,
  ScriptAngle,
} from '../../domain/ports/AiCreativePort';

function base64ToBlobUrl(base64: string, mimeType: string): string {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  const blob = new Blob([bytes], { type: mimeType });
  return URL.createObjectURL(blob);
}

async function parseErrorMessage(response: Response): Promise<string> {
  try {
    const payload = (await response.json()) as { error?: string };
    if (payload?.error) return payload.error;
  } catch {
    // ignore JSON error
  }
  return `Error HTTP ${response.status} al comunicarse con el puente Express IA.`;
}

export class ServerGeminiAiAdapter implements AiCreativePort {
  public async checkStatus(): Promise<AiBackendStatus> {
    try {
      const response = await fetch('/api/gemini/status', {
        headers: { Accept: 'application/json' },
      });
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      return (await response.json()) as AiBackendStatus;
    } catch {
      return {
        configured: false,
        models: {
          script: 'gemini-4-hydrogen',
          tts: 'gemini-3.8-flash-lite-tts',
          video: 'gemini-omni-1.2-flash',
        },
      };
    }
  }

  public async generateCuriosoScript(params: {
    topic: string;
    pillar: string;
    audienceName: string;
    angle: ScriptAngle;
    cta: string;
  }): Promise<GeneratedScriptResult> {
    const response = await fetch('/api/gemini/script', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    });
    if (!response.ok) {
      throw new Error(await parseErrorMessage(response));
    }
    return (await response.json()) as GeneratedScriptResult;
  }

  public async generatePostFromPrompt(params: {
    prompt: string;
    targetDurationSec?: number;
  }): Promise<GeneratedPromptPostResult> {
    const response = await fetch('/api/gemini/prompt-post', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    });
    if (!response.ok) {
      throw new Error(await parseErrorMessage(response));
    }
    return (await response.json()) as GeneratedPromptPostResult;
  }

  public async generateGeminiTts(params: {
    text: string;
    voiceName: string;
    saveToLocal?: boolean;
    fileNameHint?: string;
  }): Promise<GeneratedTtsResult> {
    const response = await fetch('/api/gemini/tts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    });
    if (!response.ok) {
      throw new Error(await parseErrorMessage(response));
    }
    const payload = (await response.json()) as {
      audioBase64?: string;
      mimeType: string;
      fileName: string;
      savedPath?: string;
      url?: string;
    };

    const audioUrl =
      payload.url ??
      (payload.audioBase64
        ? base64ToBlobUrl(payload.audioBase64, payload.mimeType)
        : '');

    if (!audioUrl) {
      throw new Error('El servidor no devolvió datos de audio válidos.');
    }

    return {
      audioUrl,
      fileName: payload.fileName,
      mimeType: payload.mimeType,
      savedPath: payload.savedPath,
    };
  }

  public async generateOmniVideo(params: {
    prompt: string;
    aspectRatio?: '9:16' | '16:9';
    durationSec?: number;
    resolution?: '360p' | '720p' | '1080p';
    saveToLocal?: boolean;
    fileNameHint?: string;
  }): Promise<GeneratedVideoResult> {
    const response = await fetch('/api/gemini/video', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    });
    if (!response.ok) {
      throw new Error(await parseErrorMessage(response));
    }
    const payload = (await response.json()) as {
      videoBase64?: string;
      mimeType: string;
      fileName: string;
      savedPath?: string;
      url?: string;
    };

    const videoUrl =
      payload.url ??
      (payload.videoBase64
        ? base64ToBlobUrl(payload.videoBase64, payload.mimeType)
        : '');

    if (!videoUrl) {
      throw new Error('El servidor no devolvió datos de video válidos.');
    }

    return {
      videoUrl,
      fileName: payload.fileName,
      mimeType: payload.mimeType,
      savedPath: payload.savedPath,
    };
  }
}
