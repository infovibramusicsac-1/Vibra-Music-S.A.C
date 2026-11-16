# ADR-0005: Gemini TTS, Veo/Omni 9:16 Server-Side y Puente con Google Flow

- **Fecha:** 2026-11-16
- **Estado:** Aceptado

## Contexto
Se requiere asistir la creación completa de Shorts: generar datos curiosos y guiones en 3 actos (Paso 1), locuciones reales `.WAV` para el exportador `.MP4`, clips verticales `9:16` mediante API (`gemini-omni-1.2-flash`) o mediante **Google Flow** (`labs.google/fx/tools/flow`), y operar con **cero dependencias obligatorias de clave paga** cuando el creador prefiere trabajar con sus propios clips y grabaciones locales.

## Decisión
1. Centralizar todas las llamadas a `@google/genai` en endpoints Express del servidor (`/api/gemini/script`, `/api/gemini/tts`, `/api/gemini/video`), usando `process.env.GEMINI_API_KEY` y nunca exponiendo claves ni inputs de API key en el navegador.
2. Configurar en el cliente el puerto hexagonal `AiCreativePort` (`ServerGeminiAiAdapter`) con degradación elegante (HTTP `503` informativo cuando no hay `GEMINI_API_KEY`), manteniendo 100% activos el botón **Plantilla local**, subida manual de audio/clips y el **Puente Google Flow** (generador de prompts cinematográficos 9:16 + enlace directo + recarga de `local-studio/clips/`).
3. En video IA (`gemini-omni-1.2-flash`), usar `ai.interactions.create` con `aspect_ratio: '9:16'`; en TTS (`gemini-3.8-flash-lite-tts`), devolver y persistir audio `.WAV` en `local-studio/audio/` listo para mezclarse con ducking en Remotion `.MP4`.

## Consecuencias
- **Positivas:** Seguridad total de credenciales, compatibilidad mixta entre producción 100% local y generación IA bajo demanda, y audio TTS real embebido en `.MP4`.
- **Compromiso:** La generación de clips con `gemini-omni-1.2-flash` requiere una clave API de pago configurada en el entorno servidor (`GEMINI_API_KEY`) cuando se invoque desde la UI.
