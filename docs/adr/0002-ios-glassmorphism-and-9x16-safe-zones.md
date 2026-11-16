# ADR-0002: Sistema Visual iOS Glassmorphism y Zonas Seguras 9:16

- **Fecha:** 2026-11-16
- **Estado:** Aceptado

## Contexto
El producto combina un centro de mando estratégico (KPIs, Mix 60·10·10·10·10, Kanban multi-selección y calendario) con un estudio vertical 9:16. Si los subtítulos o hooks invaden los bordes del reproductor, quedan ocultos por la interfaz de Instagram Reels o TikTok.

## Decisión
1. Adoptar **iOS Glassmorphism** sobre fondo `#0B1221` (modo oscuro) y `#F5F6FA` (modo claro) con acentos **Warm Coral (`#FF5A4E`)** y **Amber Gold (`#F5A623`)**, capa única de `backdrop-blur` y contraste **WCAG AA**.
2. Eliminar *pills* decorativos en metadata estática para privilegiar escaneabilidad tipográfica.
3. Integrar guías activables de **Zona Segura** (`IG Reels`, `TikTok`, `Off`) en `VerticalPreview9x16` y un **Modo Espectador 9:16** (`SpectatorPreviewModal`) limpio sin distracciones de editor, con verificación de primeros 3 segundos (`Hook`) y test `Sound-Off`.

## Consecuencias
- **Positivas:** Los creadores validan retención y legibilidad móvil antes de exportar o publicar.
- **Compromiso:** La composición `VibraReelComposition` debe respetar márgenes superiores (>=11%) e inferiores (>=22%) para Hook y subtítulos.
