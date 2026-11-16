# ADR-0001: Arquitectura Hexagonal (Ports & Adapters) y Aislamiento de Dominio

- **Fecha:** 2026-11-16
- **Estado:** Aceptado

## Contexto
Vibra Marketing OS nació como un MVP quirúrgico pero con visión escalable: comenzar operando localmente con `localStorage` y recursos de disco en una sola máquina, pero permitiendo migrar a bases de datos remotas, motores TTS en la nube o workers FFmpeg sin reescribir la lógica de negocio ni la interfaz.

## Decisión
Estructurar el proyecto en cuatro capas concéntricas bajo **Arquitectura Hexagonal**:
1. `src/domain/`: Entidades, Value Objects y contratos (`Port`) sin dependencias de React, DOM ni Express.
2. `src/application/`: Casos de uso puros (`GetDashboardMetrics`, `PieceWorkflowUseCases`, `FilterContentPieces`) y datos semilla.
3. `src/infrastructure/`: Adaptadores concretos que implementan los puertos (`LocalContentAdapter`, `InsforgeContentAdapter`, `BrowserTtsAdapter`, `RemotionWebRenderAdapter`, `HybridLocalMediaAdapter`, `ServerGeminiAiAdapter`).
4. `src/ui/`: Componentes React e inyección centralizada en `VibraServicesContext`.

## Consecuencias
- **Positivas:** Cualquier adaptador (por ejemplo pasar de `LocalContentAdapter` a backend remoto) se reemplaza en un único punto de inyección sin tocar componentes UI ni reglas de cálculo de embudo o guardrails de marca.
- **Compromiso:** Requiere mantener contratos explícitos en `src/domain/ports/` antes de añadir nuevas integraciones externas.
