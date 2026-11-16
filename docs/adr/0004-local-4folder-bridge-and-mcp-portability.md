# ADR-0004: Puente Local en 4 Carpetas, Servidor MCP y Portabilidad Multi-Agente

- **Fecha:** 2026-11-16
- **Estado:** Aceptado

## Contexto
Los creadores trabajan alternando recursos grabados localmente, clips descargados de Google Flow, y distintos agentes de desarrollo (Google AI Studio, Google Antigravity u otros asistentes CLI/IDE). Un único directorio genérico mezclaba videos, audios e imágenes y dificultaba que un agente externo entendiera qué archivos existían en disco.

## Decisión
1. Estructurar `local-studio/` en `server.ts` y `HybridLocalMediaAdapter` en 4 carpetas dedicadas (manteniendo compatibilidad lectora con `local-studio/media/`):
   - `local-studio/clips/` (videos `.mp4`, `.mov`, `.webm`, `.m4v`)
   - `local-studio/audio/` (voces `.wav`, `.mp3`, `.m4a`, `.ogg`)
   - `local-studio/resources/` (logos y overlays `.png`, `.jpg`, `.webp`, `.svg`)
   - `local-studio/exports/` (`.mp4`, `.srt`, `.json`)
2. Servir medios locales con soporte HTTP `Range` (`206 Partial Content`) para scrubbing preciso en Remotion Player.
3. Añadir `AGENTS.md`, `.antigravity/rules.md`, un servidor MCP stdio JSON-RPC 2.0 (`mcp-server.ts` / `npm run mcp`) y el generador in-app **Agente & Prompt** (`AgentPromptBuilderPanel.tsx`) para producir prompts de edición exactos con inventario real de carpetas.

## Consecuencias
- **Positivas:** Portabilidad inmediata entre Google AI Studio, Google Antigravity y agentes MCP sin reconfigurar el flujo de archivos ni duplicar prompts a mano.
- **Compromiso:** El directorio `local-studio/` permanece excluido de Git (`.gitignore`) para evitar subir binarios pesados al repositorio remoto.
