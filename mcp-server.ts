import fs from 'fs';
import path from 'path';
import readline from 'readline';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const LOCAL_ROOT = path.resolve(__dirname, 'local-studio');

const FOLDERS = ['clips', 'audio', 'resources', 'exports'] as const;

type JsonRpcRequest = {
  jsonrpc: '2.0';
  id?: string | number | null;
  method: string;
  params?: Record<string, unknown>;
};

function ensureFolders() {
  for (const folder of FOLDERS) {
    fs.mkdirSync(path.join(LOCAL_ROOT, folder), { recursive: true });
  }
}

function listFolderAssets() {
  ensureFolders();
  const result: Record<string, Array<{ name: string; sizeBytes: number }>> = {};
  for (const folder of FOLDERS) {
    const dir = path.join(LOCAL_ROOT, folder);
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    result[folder] = entries
      .filter((e) => e.isFile())
      .map((e) => ({
        name: e.name,
        sizeBytes: fs.statSync(path.join(dir, e.name)).size,
      }));
  }
  return result;
}

function writeResponse(
  id: string | number | null | undefined,
  result: unknown
) {
  if (id === undefined || id === null) return;
  const payload = JSON.stringify({ jsonrpc: '2.0', id, result });
  process.stdout.write(`${payload}\n`);
}

function writeError(
  id: string | number | null | undefined,
  code: number,
  message: string
) {
  if (id === undefined || id === null) return;
  const payload = JSON.stringify({
    jsonrpc: '2.0',
    id,
    error: { code, message },
  });
  process.stdout.write(`${payload}\n`);
}

const TOOLS = [
  {
    name: 'list_studio_assets',
    description:
      'Lista todos los archivos actuales en local-studio/clips, local-studio/audio, local-studio/resources y local-studio/exports.',
    inputSchema: {
      type: 'object',
      properties: {
        category: {
          type: 'string',
          enum: ['all', 'clips', 'audio', 'resources', 'exports'],
        },
      },
    },
  },
  {
    name: 'build_exact_edit_prompt',
    description:
      'Genera un prompt de edición Remotion 9:16 con subtítulos karaoke, zonas seguras y referencias reales a local-studio/*.',
    inputSchema: {
      type: 'object',
      required: ['hook', 'script'],
      properties: {
        hook: { type: 'string' },
        script: { type: 'string' },
        cta: { type: 'string' },
        bpm: { type: 'number' },
      },
    },
  },
  {
    name: 'verify_local_folders',
    description:
      'Verifica y crea si faltan las 4 carpetas de trabajo en local-studio/ (clips, audio, resources, exports).',
    inputSchema: {
      type: 'object',
      properties: {},
    },
  },
];

const RESOURCES = [
  {
    uri: 'vibra://local-studio/manifest',
    name: 'Inventario Local Studio Vibra',
    description: 'Listado JSON de clips, audios, recursos y exportaciones',
    mimeType: 'application/json',
  },
  {
    uri: 'vibra://agents/guide',
    name: 'Guía Multi-Agente Vibra (AGENTS.md)',
    description: 'Contrato arquitectónico y reglas para AI Studio / Antigravity',
    mimeType: 'text/markdown',
  },
];

function handleRequest(req: JsonRpcRequest) {
  const { id, method, params } = req;

  if (method === 'initialize') {
    writeResponse(id, {
      protocolVersion: '2024-11-05',
      serverInfo: {
        name: 'vibra-short-factory-mcp',
        version: '5.0.0',
      },
      capabilities: {
        tools: {},
        resources: {},
      },
    });
    return;
  }

  if (method === 'notifications/initialized') {
    return;
  }

  if (method === 'tools/list') {
    writeResponse(id, { tools: TOOLS });
    return;
  }

  if (method === 'tools/call') {
    const toolName = String(params?.name ?? '');
    const args = (params?.arguments ?? {}) as Record<string, unknown>;

    if (toolName === 'list_studio_assets') {
      const assets = listFolderAssets();
      const cat = String(args.category ?? 'all');
      const filtered =
        cat !== 'all' && cat in assets ? { [cat]: assets[cat] } : assets;
      writeResponse(id, {
        content: [{ type: 'text', text: JSON.stringify(filtered, null, 2) }],
      });
      return;
    }

    if (toolName === 'verify_local_folders') {
      ensureFolders();
      writeResponse(id, {
        content: [
          {
            type: 'text',
            text: `Carpetas verificadas en ${LOCAL_ROOT}: ${FOLDERS.join(', ')}`,
          },
        ],
      });
      return;
    }

    if (toolName === 'build_exact_edit_prompt') {
      const assets = listFolderAssets();
      const hook = String(args.hook ?? '');
      const script = String(args.script ?? '');
      const cta = String(
        args.cta ?? 'Reserva tu clase piloto gratuita en Vibra Music'
      );
      const prompt = [
        'Edita este Short vertical 9:16 (1080x1920 @ 30fps) en VibraReelComposition.tsx:',
        `HOOK (0-3s): ${hook}`,
        `DESARROLLO: ${script}`,
        `CTA: ${cta}`,
        `CLIPS DISPONIBLES: ${assets.clips.map((c) => c.name).join(', ') || 'ninguno aún'}`,
        `AUDIO DISPONIBLE: ${assets.audio.map((a) => a.name).join(', ') || 'ninguno aún'}`,
        `RECURSOS DISPONIBLES: ${assets.resources.map((r) => r.name).join(', ') || 'ninguno aún'}`,
      ].join('\n');

      writeResponse(id, {
        content: [{ type: 'text', text: prompt }],
      });
      return;
    }

    writeError(id, -32601, `Herramienta desconocida: ${toolName}`);
    return;
  }

  if (method === 'resources/list') {
    writeResponse(id, { resources: RESOURCES });
    return;
  }

  if (method === 'resources/read') {
    const uri = String(params?.uri ?? '');
    if (uri === 'vibra://local-studio/manifest') {
      writeResponse(id, {
        contents: [
          {
            uri,
            mimeType: 'application/json',
            text: JSON.stringify(listFolderAssets(), null, 2),
          },
        ],
      });
      return;
    }
    if (uri === 'vibra://agents/guide') {
      const agentsPath = path.resolve(__dirname, 'AGENTS.md');
      const text = fs.existsSync(agentsPath)
        ? fs.readFileSync(agentsPath, 'utf-8')
        : '# Vibra Marketing OS — AGENTS.md';
      writeResponse(id, {
        contents: [{ uri, mimeType: 'text/markdown', text }],
      });
      return;
    }
    writeError(id, -32602, `Recurso no encontrado: ${uri}`);
    return;
  }

  writeError(id, -32601, `Método JSON-RPC no soportado: ${method}`);
}

ensureFolders();

const rl = readline.createInterface({
  input: process.stdin,
  terminal: false,
});

rl.on('line', (line) => {
  const trimmed = line.trim();
  if (!trimmed) return;
  try {
    const parsed = JSON.parse(trimmed) as JsonRpcRequest;
    handleRequest(parsed);
  } catch (err) {
    writeError(
      null,
      -32700,
      err instanceof Error ? err.message : 'JSON inválido'
    );
  }
});
