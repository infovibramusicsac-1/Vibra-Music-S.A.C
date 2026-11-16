# Vibra Marketing OS + Short Video Factory

Sistema operativo de marketing y estudio de ensamblaje vertical **9:16** para **Vibra Music S.A.C.** (Fase 1 «Sembrar», 5 de noviembre – 4 de diciembre de 2026), construido en **React, TypeScript, Remotion y Tailwind CSS** bajo **Arquitectura Hexagonal (Ports & Adapters)**.

## Características principales (v5.0)

### 1. Tres Roles Integrados (Barra Flotante estilo iOS)
- **Coordinador**: Cuenta regresiva hacia la **Clase Piloto del 21 de noviembre**, KPIs objetivo (`6 asistentes`, `3 matrículas`, `S/ 6.67 diarios`), cálculo en vivo del **Mix 60·10·10·10·10**, cola de aprobación y checklist de **15 pendientes críticos**.
- **Content Manager**: Filtros combinables, **Matriz de Embudo** (`TOFU` / `MOFU` / `BOFU`), **Calendario de 30 días** y **Guía de Marca + 18 Benchmarks Hanan**.
- **Creador + Fábrica en Lote**: Kanban de 4 columnas con **selección múltiple**, **arrastre grupal (`multi-drag`)**, barra de movimiento masivo, **4 Plantillas Vibra Studio** y exportación secuencial real de **`.MP4` (Remotion WebCodecs)** o paquetes **`.SRT` + `.JSON`**.

### 2. Flujo IA Completo de Shorts (Capítulos 1–5) & Remotion 9:16
- **Paso 1 — Dato Curioso & Guion 3 Actos**: Asistente en el editor para generar o aplicar plantillas locales de *Dato curioso*, *Mito vs. Realidad* o *Micro-historia*.
- **Paso 2 — Clips y Voz (Google Flow, Veo/Omni y Gemini TTS)**:
  - Generador de prompts cinematográficos 9:16 para **Google Flow** (`labs.google/fx/tools/flow`) y generación server-side con `gemini-omni-1.2-flash`.
  - Síntesis de locución real `.WAV` (`gemini-3.8-flash-lite-tts`), vista previa con Web Speech API o carga de audios propios con atenuación automática del BGM al 35%.
- **Organización Local en 4 Carpetas (`local-studio/`)**:
  - `local-studio/clips/` (tomas MP4/MOV de cámara, Google Flow o Veo)
  - `local-studio/audio/` (voces WAV/MP3/M4A y pistas)
  - `local-studio/resources/` (logos PNG y overlays gráficos)
  - `local-studio/exports/` (videos `.MP4`, subtítulos `.SRT` y manifiestos `.JSON`)
- **Pasos 3 & 4 — Portabilidad Multi-Agente (`AGENTS.md`, `.antigravity/rules.md`, `MCP`)**:
  - Pestaña **Agente & Prompt** dentro del Studio para copiar el prompt exacto de edición hacia **Google AI Studio**, **Google Antigravity** o un cliente **MCP** (`npm run mcp`).
- **Paso 5 — Modo Espectador 9:16**: Pantalla completa sin guías de editor con indicador de ventana `Hook 0–3s`, conmutador `Test Sound-Off` y auditoría de retención en 5 puntos.

## Documentación y Decisiones
- Decisiones de Arquitectura: [`docs/adr/README.md`](./docs/adr/README.md)
- Historial de Versiones: [`CHANGELOG.md`](./CHANGELOG.md)
- Subida Segura a GitHub: [`GITHUB_SETUP.md`](./GITHUB_SETUP.md)
- Contrato Multi-Agente: [`AGENTS.md`](./AGENTS.md) y [`.antigravity/rules.md`](./.antigravity/rules.md)

## Desarrollo Local

```bash
npm install
npm run dev      # Express Bridge + Vite en http://localhost:3000
npm run mcp      # Servidor MCP local sobre stdio (local-studio/*)
npm run lint     # tsc --noEmit
npm run build    # vite build
npm run start    # Servidor Express en producción
```
