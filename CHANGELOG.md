# Changelog

Todos los cambios relevantes de **Vibra Marketing OS + Short Video Factory** se documentan siguiendo [Keep a Changelog](https://keepachangelog.com/es-ES/1.1.0/).

## [5.3.0] - 2026-11-16
### Added
- **Nuevas Transiciones Remotion (`VibraReelComposition.tsx`, `domain/value-objects`)**: Se amplía el motor de entrada entre clips de 4 a 8 efectos interpolados por frame: `Flash` (destello blanco + exposición), `Cross Zoom` (escala dinámica + blur transitorio), `Glitch` (desplazamiento horizontal + scanlines RGB) y `Flip 3D` (rotación en perspectiva `rotateY`).
- **Control de Intensidad Ken Burns (`cameraIntensity`)**: Nuevo deslizador (`5%–25%`) en `Cámara, Color & FX` que ajusta la amplitud exacta de `Zoom In`, `Zoom Out`, `Pan Left`, `Pan Right` y `Beat Pulse` dentro de `CameraMotionWrapper`.
- **Tarjetas Visuales de Presets Kinetic (`SubtitleRenderPanel.tsx`)**: Reemplaza el selector plano en `Subtítulos & Render` por 5 cards con vista previa tipográfica en vivo (`Pop Spring`, `Scale Slam`, `Slide Up`, `Word Bounce`, `Typewriter`) y conmutador rápido entre aplicar combo completo (*fuente + estilo + color + animación*) o solo animación de entrada.

## [5.2.0] - 2026-11-16
### Added
- **Remotion Studio Pro `<Sequence>` Multi-Capa (`VibraReelComposition.tsx`)**:
  - Cada clip, subtítulo/tarjeta kinetic, ráfaga FX visual, gancho inicial y CTA ahora corre en `<Sequence>` independientes con frame local.
  - **Motor Tipográfico y Estilo Visual**: Selector de fuentes (`Plus Jakarta Sans`, `Oswald`, `Playfair Display`, `JetBrains Mono`), escala, posición vertical `Y%`, opacidad, radio de caja, contorno/sombra, color de texto/acento y 5 animaciones de entrada (`Pop Spring`, `Slide Up`, `Scale Slam`, `Typewriter`, `Word Bounce`).
  - **Cámara Ken Burns, LUTs y Flashes SFX**: Movimiento por toma o global (`Static`, `Zoom In`, `Zoom Out`, `Pan Left`, `Pan Right`, `Beat Pulse`), gradación de color (`Natural`, `Warm Vibra`, `Cinematic`, `High Contrast`, `Nocturne Cool`), viñeta ajustable y destellos visuales sincronizados a los cues SFX (`ráfaga x3 destellos` en `boom_flash` y barrido luminoso en `whoosh`).
  - **Hook Styles & Stickers CTA Animados**: 4 estilos de Hook (`Glass Card`, `Kinetic Slam`, `Split Banner`, `Full Screen`) y stickers animados de conversión (`Comenta VIBRA`, `WhatsApp Directo`, `Pin SJL`).
- **Timeline NLE Completo (`MultiTrackTimeline.tsx`)**: Zoom horizontal `1x–4x`, ajuste magnético (*Snap*), herramienta **Dividir en Playhead** (`Split`) para clips y subtítulos, arrastre directo con el puntero y tiradores laterales de recorte (*trim* izq/der) en pistas de Clips, Subtítulos, Overlay PiP y SFX.
- **Presets Propios Reutilizables (`VibraServicesContext.tsx`, `SubtitleRenderPanel.tsx`, `BatchRenderModal.tsx`)**: Guardado de estilos personalizados por pieza en `localStorage`, exportación/importación `.JSON` y aplicación directa en **Fábrica en Lote**.

## [5.1.0] - 2026-11-16
### Added
- **Prompt-to-Post Wizard (`PromptToPostModal.tsx`)**: Nuevo flujo en el modo Creador («Crear desde Prompt») con plantilla precargada *«Música todo el año (45–50 s)»*, analizador instantáneo offline de tablas cronometradas (`PromptScriptParser.ts`), expansión opcional vía Gemini IA (`POST /api/gemini/prompt-post`), editor por escena (`Tiempo`, `Locución`, `Texto Kinetic`, `Color`, `Secuencia`, `SFX`) y guardado de plantillas reutilizables en `localStorage`.
- **Tarjetas Kinetic Secuenciales y Colores Inline**: Soporte en `VibraReelComposition.tsx` para resaltar palabras con color personalizado (ej. `VACACIONES` / `NUNCA` en `#F4A048`) y tarjetas secuenciales paso a paso (`PIANO · GUITARRA · BATERÍA · CANTO · VIOLÍN`, una por pantalla).
- **Motor de Audio SFX Sintetizado (`proceduralSfxWav.ts`) + Pista 5 en Timeline**: Síntesis PCM WAV en memoria sincronizada con cada beat (`boom_flash`, `whoosh`, `pop`, `pop_ding`, `ding_stop`), mezclada tanto en la vista previa 9:16 como en la exportación `.MP4` real con Remotion WebCodecs.

## [5.0.0] - 2026-11-16
### Added
- **Paso 1 — Asistente «Dato Curioso + Estructura 3 Actos»** en `PieceEditorSheet.tsx` con generación server-side (`POST /api/gemini/script` vía `gemini-4-hydrogen`) y plantilla local 100% offline.
- **Paso 2 — Gemini TTS `.WAV`, Veo / Omni `9:16` y Puente Google Flow**:
  - Endpoint `POST /api/gemini/tts` (`gemini-3.8-flash-lite-tts`) que sintetiza `.WAV` real, lo guarda en `local-studio/audio/` y lo conecta a la mezcla Remotion.
  - Endpoint `POST /api/gemini/video` (`gemini-omni-1.2-flash` vía `ai.interactions.create`) + puente de prompts y carga rápida desde **Google Flow** (`labs.google/fx/tools/flow`) en `SceneClipUploader.tsx`.
  - Puerto hexagonal `AiCreativePort` y adaptador `ServerGeminiAiAdapter` (degradación elegante si no hay `GEMINI_API_KEY`).
- **Organización Local en 4 Carpetas (`local-studio/`)**: `clips/`, `audio/`, `resources/` y `exports/` (con retrocompatibilidad sobre `media/`) y selección directa de audios/overlays desde disco en `TtsVoicePanel.tsx` y `SubtitleRenderPanel.tsx`.
- **Pasos 3 & 4 — Portabilidad Multi-Agente (`AI Studio`, `Antigravity`, `MCP`)**:
  - Archivo universal `AGENTS.md`, reglas `.antigravity/rules.md` y servidor MCP stdio JSON-RPC (`mcp-server.ts`, comando `npm run mcp`).
  - Nueva pestaña **Agente & Prompt** (`AgentPromptBuilderPanel.tsx`) que ensambla el prompt exacto de edición con inventario real de carpetas locales, karaoke y zonas seguras.
- **Paso 5 — Modo Espectador 9:16 (`SpectatorPreviewModal.tsx`)**: Vista previa inmersiva sin chrome de editor, indicador de ventana crítica `Hook 0–3s`, conmutador `Test Sound-Off` y checklist de 5 puntos persistido por pieza.
- **Documentación Formal**: Registros `docs/adr/0001`–`0005`, `CHANGELOG.md` y guía segura `GITHUB_SETUP.md`.

## [4.0.0] - 2026-11-16
### Added
- Selección múltiple con checkboxes, arrastre grupal (`multi-drag`) y barra de movimiento masivo en el Kanban del Creador (`Por grabar`, `Grabado`, `En edición`, `Listo`).
- Motor de transiciones en `VibraReelComposition.tsx` (`Corte`, `Fade`, `Slide`, `Wipe`), karaoke palabra por palabra, barra de retención superior, onda BPM y overlays gráficos con tiempo configurable.
- Síntesis musical WAV loopable por BPM (`proceduralBgmWav.ts`) + carga de voz propia con *ducking* automático del BGM y exportación `.MP4` con audio WebCodecs (`RemotionWebRenderAdapter.ts`).
- 4 Plantillas Vibra Studio de 1 clic (`VIBRA_STUDIO_TEMPLATES`) y exportación secuencial real de lotes `.MP4` en `BatchRenderModal.tsx`.

## [3.0.0] - 2026-11-16
### Added
- Integración de `remotion`, `@remotion/player` y `@remotion/web-renderer` (`1080×1920 @ 30fps`) en `VerticalPreview9x16.tsx` y `VibraReelComposition.tsx`.
- Línea de tiempo multipista interactiva (`MultiTrackTimeline.tsx`).
- Puente local Express (`server.ts`, puerto `3000`) y `HybridLocalMediaAdapter` (`showDirectoryPicker` + disco local).

## [2.0.0] - 2026-11-16
### Added
- Vista previa 9:16 interactiva con Zonas Seguras (`IG Reels` / `TikTok`), editor de subtítulos dinámicos, TTS en español (`BrowserTtsAdapter`) y protección *Dirty State* en `PieceEditorSheet.tsx`.

## [1.0.0] - 2026-11-16
### Added
- Base inicial bajo **Arquitectura Hexagonal** y estética **iOS Glassmorphism**.
- 3 roles integrados (**Coordinador**, **Content Manager**, **Creador**) con semilla completa Fase 1 «Sembrar» de **Vibra Music S.A.C.** (30 piezas, Mix `60·10·10·10·10`, 15 pendientes, 26 conceptos y 18 referencias benchmark).
