# Reglas para Google Antigravity — Vibra Short Video Factory

Cuando abras este proyecto dentro de **Google Antigravity**, aplica estas convenciones operativas en cada edición:

## 1. Flujo de Trabajo de Shorts (Capítulos 1–5)
1. **Dato Curioso & Guion (Paso 1):** Usa estructura *Hook (0–3s) -> Desarrollo -> CTA*, sin frases vacías como `"desbloquea tu potencial"` ni placeholders `[...]`.
2. **Clips y Voz (Paso 2):** Combina recursos locales de `local-studio/clips/` (cámara o Google Flow) y `local-studio/audio/` (voz propia o Gemini TTS `.wav`). Si `GEMINI_API_KEY` no está configurada, el flujo local debe funcionar al 100% sin bloqueos.
3. **Carpetas Locales:** Respeta siempre la separación `clips/`, `audio/`, `resources/`, `exports/` dentro de `local-studio/`.
4. **Edición Remotion & Karaoke (Paso 4):** Toda mejora visual de video va en `src/infrastructure/remotion/VibraReelComposition.tsx` sincronizada por `frame` a `30fps` (`1080×1920`). Respeta las zonas seguras de IG Reels y TikTok (11% superior, 22% inferior).
5. **Ojos de Espectador (Paso 5):** Mantén funcional el `SpectatorPreviewModal` sin ruido de editor y con test Sound-Off.

## 2. Diseño & UI
- Estética **iOS Glassmorphism** con paleta **Warm Coral (`#FF5A4E`)**, **Amber Gold (`#F5A623`)** y **Deep Navy (`#0B1221`)**.
- Usa **Tailwind CSS v4** exclusivamente; evita estilos inline en componentes UI (excepto estilos declarativos de Remotion dentro de `VibraReelComposition.tsx`).
- Mantén contraste **WCAG AA** en modo claro y oscuro y **cero pills** para etiquetas estáticas.

## 3. Verificación & MCP
- Puedes consultar las carpetas locales vía el servidor MCP (`npm run mcp`, tool `list_studio_assets`).
- Nunca escribas ni comites credenciales (`.env`, PATs, llaves) en el código.
- Al finalizar cualquier cambio ejecuta `npm run lint` y `npm run build`.
