# AGENTS.md — Vibra Marketing OS + Short Video Factory

Este documento es el contrato universal para trabajar en este repositorio desde **Google AI Studio**, **Google Antigravity**, **Codex/Claude Code** o cualquier cliente conectado por **MCP**.

## 1. Propósito del Proyecto
Sistema operativo de marketing y estudio de ensamblaje vertical **9:16** (`1080×1920 @ 30fps`) para **Vibra Music S.A.C.** (Fase 1 «Sembrar»). Permite planificar 30 piezas mensuales, gestionar producción por roles (`Coordinador`, `Content Manager`, `Creador`) y ensamblar Reels/Shorts reales con **Remotion**, **timeline multipista**, **Gemini API server-side**, **Google Flow** y archivos locales.

## 2. Arquitectura Hexagonal (Regla Estricta)
Las dependencias siempre apuntan hacia adentro (`UI -> Application -> Domain <- Infrastructure`):
- `src/domain/`: Entidades puras, Value Objects y Puertos (`ContentRepositoryPort`, `TtsEnginePort`, `VideoBatchRendererPort`, `LocalMediaPort`, `AiCreativePort`). Prohibido importar React, DOM o librerías HTTP.
- `src/application/`: Casos de uso puros (`GetDashboardMetrics`, `PieceWorkflowUseCases`, `FilterContentPieces`) y datos semilla (`vibraSeedData.ts`).
- `src/infrastructure/`: Adaptadores intercambiables (`LocalContentAdapter`, `HybridLocalMediaAdapter`, `RemotionWebRenderAdapter`, `ServerGeminiAiAdapter`, `BrowserTtsAdapter`), síntesis WAV (`proceduralBgmWav.ts`) y composición Remotion (`VibraReelComposition.tsx`).
- `src/ui/`: Componentes React + Tailwind CSS v4 (`@import "tailwindcss";`) y contexto de inyección (`VibraServicesContext.tsx`).

## 3. Reglas de Seguridad y Gemini API
- **NUNCA** importar `@google/genai` ni exponer `GEMINI_API_KEY` en archivos de `src/`.
- Todas las llamadas a Gemini (`gemini-4-hydrogen`, `gemini-3.8-flash-lite-tts`, `gemini-omni-1.2-flash`) viven únicamente en `server.ts` bajo `/api/gemini/*`.
- **NUNCA** crear campos UI para pegar API keys ni subir archivos `.env` o tokens a Git.

## 4. Organización Local de Medios (`local-studio/`)
El puente Express en `server.ts` (puerto `3000`) organiza el estudio en 4 carpetas:
- `local-studio/clips/`: Clips de cámara, Google Flow o Veo/Omni (`.mp4`, `.mov`, `.webm`, `.m4v`).
- `local-studio/audio/`: Locuciones `.WAV` (Gemini TTS) o grabaciones `.mp3`/`.m4a`.
- `local-studio/resources/`: Logos `.PNG`, overlays gráficos y recursos B-Roll.
- `local-studio/exports/`: Videos `.MP4` renderizados con Remotion, subtítulos `.SRT` y manifiestos `.JSON`.

## 5. Servidor MCP Local
Ejecuta `npm run mcp` para exponer herramientas JSON-RPC 2.0 sobre `stdio`:
- `list_studio_assets`: Lista archivos en `clips/`, `audio/`, `resources/`, `exports/`.
- `build_exact_edit_prompt`: Construye el prompt exacto de edición Remotion 9:16.
- `verify_local_folders`: Asegura la existencia de las 4 carpetas locales.

## 6. Verificación Obligatoria Antes de Entregar
```bash
npm run lint    # tsc --noEmit (cero errores de tipo)
npm run build   # vite build (bundle limpio de producción)
npm run dev     # Express Bridge + Vite en http://localhost:3000
```
