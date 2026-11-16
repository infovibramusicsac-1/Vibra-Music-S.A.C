# Arquitectura Hexagonal — Vibra Marketing OS

Este proyecto aplica **Ports & Adapters (Arquitectura Hexagonal)** para aislar completamente la lógica estratégica y editorial de Vibra Music respecto al almacenamiento, generación IA en servidor, motor de voz y renderizado de video.

## Capas y Dirección de Dependencias

`UI (React) ──▶ Application (Use Cases & Seed) ──▶ Domain (Entities, Value Objects & Ports) ◀── Infrastructure (Adapters)`

1. **`src/domain/`** *(Núcleo puro TypeScript, cero dependencias de React o DOM)*
   - `entities/`: `ContentPiece`, `SpectatorAudit`, `ChecklistItem`, `SceneClip`, `LocalMediaFile`, `LocalBridgeStatus`, `RenderJob`, `SubtitleCue`, `BrandProfile`, `AudienceCategory`, `ReferenceItem`, `VibraWorkspaceData`.
   - `value-objects/`: `FunnelStage`, `ProductionStatus`, `ContentConcept`, `SubtitlePreset`, `TransitionPreset`, `VIBRA_STUDIO_TEMPLATES`, `SocialSafeZoneMode`, `BGM_CATALOG`.
   - `ports/`: `ContentRepositoryPort`, `TtsEnginePort`, `VideoBatchRendererPort`, `LocalMediaPort`, `AiCreativePort`.

2. **`src/application/`** *(Casos de uso puros y datos semilla)*
   - `use-cases/`: `GetDashboardMetrics`, `FilterContentPieces`, `movePieceToStage`, `movePiecesToStage`, `applyStudioTemplateToPiece`, `advancePieceStage`, `regressPieceStage`, `checkBrandGuardrails`.
   - `seed/vibraSeedData.ts`: Plan maestro Fase 1 «Sembrar» con 30 piezas, 15 pendientes, 26 conceptos, 5 categorías de audiencia y 18 referencias benchmark.

3. **`src/infrastructure/`** *(Implementaciones intercambiables, Remotion y puente servidor)*
   - `adapters/LocalContentAdapter.ts`: Persistencia local con `localStorage`.
   - `adapters/InsforgeContentAdapter.ts`: Sincronización remota en Etapa 2 con fallback transparente a local.
   - `adapters/BrowserTtsAdapter.ts`: Previsualización con `window.speechSynthesis`.
   - `adapters/ServerGeminiAiAdapter.ts`: Implementa `AiCreativePort` invocando rutas `/api/gemini/*` en `server.ts` (nunca expone claves en navegador).
   - `adapters/BrowserBatchRenderAdapter.ts` y `adapters/RemotionWebRenderAdapter.ts`: Composición, colas en lote y exportación `.MP4` H.264 1080×1920 con WebCodecs (`renderMediaOnWeb`).
   - `adapters/HybridLocalMediaAdapter.ts`: Combina `window.showDirectoryPicker()` y las 4 carpetas de `server.ts` (`local-studio/clips`, `audio`, `resources`, `exports`).
   - `audio/proceduralBgmWav.ts`: Síntesis WAV 16-bit loopable por BPM.
   - `remotion/VibraReelComposition.tsx`: Composición vertical 9:16 a 30 fps compartida entre `@remotion/player`, Modo Espectador y exportador `.MP4`.

4. **`src/ui/`** *(Presentación e Inyección de Dependencias)*
   - `context/VibraServicesContext.tsx`: Inyecta adaptadores hacia `coordinator/`, `manager/`, `creator/` y `studio/`.
   - `components/studio/`: `PieceEditorSheet.tsx`, `VerticalPreview9x16.tsx`, `SpectatorPreviewModal.tsx`, `MultiTrackTimeline.tsx`, `SceneClipUploader.tsx`, `TtsVoicePanel.tsx`, `SubtitleRenderPanel.tsx`, `AgentPromptBuilderPanel.tsx`.
   - `theme/tokens.ts`: Tokens Warm Coral (`#FF5A4E`), Amber Gold (`#F5A623`) y Deep Navy (`#0B1221`), soporte WCAG AA y capa única de `backdrop-blur`.

5. **Portabilidad y Servidor (`server.ts` & `mcp-server.ts`)**
   - `server.ts`: Express Bridge (streaming HTTP `Range` sobre `local-studio/*` + proxy seguro `/api/gemini/*` + Vite middlewares).
   - `mcp-server.ts`: Servidor MCP JSON-RPC 2.0 (`npm run mcp`) para Google Antigravity y agentes externos.
   - `docs/adr/`: Registros formales de decisiones arquitectónicas (`0001`–`0005`).
