# ADR-0003: Timeline Multipista, Remotion Player 9:16 y Exportación .MP4 WebCodecs

- **Fecha:** 2026-11-16
- **Estado:** Aceptado

## Contexto
Se evaluó integrar plantillas externas (`morluto/rea`) frente a construir una arquitectura propia en React + `@remotion/player` y `@remotion/web-renderer`. El equipo necesitaba editar múltiples tomas, ajustar entradas/salidas en una línea de tiempo de 4 pistas, aplicar transiciones y exportar `.MP4` reales en lote sin servidores FFmpeg externos en Fase 1.

## Decisión
1. Descartar dependencias acopladas a `morluto/rea` e implementar `VibraReelComposition.tsx` directamente sobre **Remotion 4** (`1080×1920 @ 30fps`).
2. Construir `MultiTrackTimeline.tsx` con 4 pistas interactivas (`Clips`, `Subs`, `Capas`, `Audio`) sincronizadas frame-a-frame con `Player`.
3. Soportar transiciones (`Corte`, `Fade`, `Slide`, `Wipe`), **karaoke palabra por palabra**, barra superior de retención, onda reactiva al BPM y overlays gráficos con tiempo configurable.
4. Mezclar audio BGM sintetizado por BPM (`proceduralBgmWav.ts`) + pista de locución real (`customAudioUrl`) con *ducking* automático al 35% del BGM, exportando `.MP4` H.264 vía WebCodecs (`renderMediaOnWeb`) con fallback seguro a video silencioso cuando el navegador no expone encoder de audio.

## Consecuencias
- **Positivas:** Vista previa idéntica al render final, cero dependencias binarias en el cliente y soporte para colas secuenciales en *Fábrica en Lote* con plantillas de 1 clic (`VIBRA_STUDIO_TEMPLATES`).
- **Compromiso:** La exportación `.MP4` client-side requiere navegadores modernos con WebCodecs (Chrome/Edge).
