import type {
  ChecklistItem,
  ContentPiece,
  FormatTargets,
  PillarTarget,
} from '../../domain/entities';
import type { PillarName, ProductionStatus } from '../../domain/value-objects';

export interface PillarMixStat {
  name: PillarName;
  count: number;
  targetPieces: number;
  targetPct: number;
  actualPct: number;
}

export interface DashboardMetrics {
  daysToPilot: number;
  totalPieces: number;
  byStatus: Record<ProductionStatus, number>;
  approvedCount: number;
  readyPendingApprovalCount: number;
  pillarMix: PillarMixStat[];
  stimulationCount: number;
  stimulationTarget: number;
  sinVozCount: number;
  sinVozTarget: number;
  conVozCount: number;
  conVozTarget: number;
  tasksDoneCount: number;
  tasksTotalCount: number;
}

export function getDashboardMetrics(
  pieces: ContentPiece[],
  tasks: ChecklistItem[],
  pillars: PillarTarget[],
  formatTargets: FormatTargets,
  pilotDateIso: string,
  referenceDate: Date = new Date('2026-11-16T12:00:00')
): DashboardMetrics {
  const byStatus: Record<ProductionStatus, number> = {
    'Por grabar': 0,
    Grabado: 0,
    'En edición': 0,
    Listo: 0,
  };

  const pillarCounts: Record<PillarName, number> = {
    'Nueva Visión': 0,
    Tienda: 0,
    Festivo: 0,
    Conversión: 0,
    Comunidad: 0,
  };

  let approvedCount = 0;
  let readyPendingApprovalCount = 0;
  let stimulationCount = 0;
  let sinVozCount = 0;
  let conVozCount = 0;

  for (const p of pieces) {
    byStatus[p.status] += 1;
    pillarCounts[p.pillar] = (pillarCounts[p.pillar] ?? 0) + 1;
    if (p.approved) approvedCount += 1;
    if (p.status === 'Listo' && !p.approved) readyPendingApprovalCount += 1;
    if (p.targetsStimulation) stimulationCount += 1;
    if (p.voice === 'Sin voz') sinVozCount += 1;
    else conVozCount += 1;
  }

  const totalPieces = pieces.length;
  const pillarMix: PillarMixStat[] = pillars.map((pt) => ({
    name: pt.name,
    count: pillarCounts[pt.name] ?? 0,
    targetPieces: pt.targetPieces,
    targetPct: pt.targetPct,
    actualPct:
      totalPieces > 0
        ? Math.round(((pillarCounts[pt.name] ?? 0) / totalPieces) * 100)
        : 0,
  }));

  const pilotMs = new Date(`${pilotDateIso}T12:00:00`).getTime();
  const refMs = referenceDate.getTime();
  const diffDays = Math.max(0, Math.round((pilotMs - refMs) / (1000 * 60 * 60 * 24)));

  return {
    daysToPilot: diffDays,
    totalPieces,
    byStatus,
    approvedCount,
    readyPendingApprovalCount,
    pillarMix,
    stimulationCount,
    stimulationTarget: formatTargets.estimulacionMin.pieces,
    sinVozCount,
    sinVozTarget: formatTargets.sinVoz.pieces,
    conVozCount,
    conVozTarget: formatTargets.conVoz.pieces,
    tasksDoneCount: tasks.filter((t) => t.done).length,
    tasksTotalCount: tasks.length,
  };
}
