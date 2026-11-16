import type { KineticBeat, SfxKind } from '../../domain/entities';
import type {
  ContentConcept,
  FunnelStage,
  PillarName,
  VoiceType,
} from '../../domain/value-objects';

export interface ParsedPromptPost {
  title: string;
  coreIdea: string;
  totalDurationSec: number;
  pillar: PillarName;
  audienceName: string;
  funnelStage: FunnelStage;
  concept: ContentConcept;
  voice: VoiceType;
  hook: string;
  script: string;
  voiceoverText: string;
  cta: string;
  scenesToRecord: string[];
  beats: KineticBeat[];
}

export interface CustomPromptTemplate {
  id: string;
  name: string;
  coreIdea: string;
  pillar: PillarName;
  funnelStage: FunnelStage;
  concept: ContentConcept;
  beats: KineticBeat[];
  createdAt: string;
}

export const SAMPLE_MUSICA_TODO_EL_ANO_PROMPT = `Guion: “Música todo el año” (45–50 s)

Idea central: no es un curso de verano, es una escuela que no para. El verano es solo la excusa para escribir hoy.

Tiempo\tPresentador dice\tTexto kinetic en pantalla\tSFX
0–3 s (hook)\t“El verano empieza… pero en Vibra Music la música no se va de vacaciones.”\tLA MÚSICA NO SE VA DE VACACIONES (VACACIONES en naranja #F4A048)\tráfaga de 3 destellos + boom grave
3–8 s\t“Trabajamos todo el año y para todas las edades.”\tTODO EL AÑO · TODAS LAS EDADES\twhoosh
8–12 s\t“Estimulación musical, de 4 a 5 años: aprenden jugando con ritmo y sonidos.”\t4–5 · ESTIMULACIÓN MUSICAL\tpop
12–16 s\t“Categoría Infantil, de 5 a 6: dan sus primeros pasos en un instrumento.”\t5–6 · INFANTIL\tpop
16–21 s\t“Junior, de 7 a 12: avanzan con método y práctica.”\t7–12 · JUNIOR\tpop
21–26 s\t“Juvenil, de 13 a 17: tocan lo que realmente les gusta.”\t13–17 · JUVENIL\tpop
26–31 s\t“Y Master, de 18 a más. Porque nunca es tarde para empezar.”\t18+ · MASTER (la palabra NUNCA en naranja)\tpop + ding suave
31–38 s\t“Piano, guitarra, batería, canto y violín. Tú eliges por dónde empezar.”\tPIANO · GUITARRA · BATERÍA · CANTO · VIOLÍN (una por pantalla)\tpop por palabra
38–43 s\t“No esperes a marzo. Empieza este verano y llega al año ya tocando.”\tEMPIEZA ESTE VERANO\twhoosh
43–50 s (CTA)\t“Escríbenos por WhatsApp o comenta VIBRA, y te decimos qué categoría es la de tu hijo… o la tuya.”\tCOMENTA “VIBRA” + 📍 Av. Las Flores 1284-A, SJL\tding + corte seco`;

const COLOR_MAP: Record<string, string> = {
  naranja: '#F4A048',
  amber: '#F5A623',
  ámbar: '#F5A623',
  coral: '#FF5A4E',
  rojo: '#FF5A4E',
  amarillo: '#F5A623',
  verde: '#10B981',
  azul: '#38BDF8',
};

export function classifySfxKind(raw: string): SfxKind {
  const s = raw.toLowerCase();
  const hasBoom = s.includes('boom') || s.includes('impact');
  const hasFlash = s.includes('destello') || s.includes('ráfaga') || s.includes('flash');
  const hasWhoosh = s.includes('whoosh') || s.includes('barrido') || s.includes('swipe');
  const hasPop = s.includes('pop');
  const hasDing = s.includes('ding') || s.includes('campana');
  const hasStop = s.includes('corte') || s.includes('stop');

  if (hasBoom && hasFlash) return 'boom_flash';
  if (hasPop && hasDing) return 'pop_ding';
  if (hasDing && hasStop) return 'ding_stop';
  if (hasBoom) return 'boom';
  if (hasFlash) return 'flash';
  if (hasWhoosh) return 'whoosh';
  if (hasDing) return 'ding';
  if (hasPop) return 'pop';
  return 'none';
}

function stripQuotes(text: string): string {
  return text.trim().replace(/^[“"«]+|[”"»]+$/g, '').trim();
}

function parseTimeRange(rawTime: string): {
  startSec: number;
  endSec: number;
  roleHint?: 'hook' | 'cta';
} | null {
  const lower = rawTime.toLowerCase();
  const roleHint = lower.includes('hook')
    ? 'hook'
    : lower.includes('cta')
      ? 'cta'
      : undefined;

  // Match "0–3 s", "0-3s", "31 a 38 s"
  const secMatch = rawTime.match(/(\d+(?:[.,]\d+)?)\s*(?:[–\-—]|a)\s*(\d+(?:[.,]\d+)?)/);
  if (secMatch) {
    const start = Number(secMatch[1].replace(',', '.'));
    const end = Number(secMatch[2].replace(',', '.'));
    if (Number.isFinite(start) && Number.isFinite(end) && end > start) {
      return { startSec: start, endSec: end, roleHint };
    }
  }

  // Match "0:00 - 0:03"
  const mmssMatch = rawTime.match(/(\d+):(\d{2})\s*[–\-—]\s*(\d+):(\d{2})/);
  if (mmssMatch) {
    const start = Number(mmssMatch[1]) * 60 + Number(mmssMatch[2]);
    const end = Number(mmssMatch[3]) * 60 + Number(mmssMatch[4]);
    if (end > start) {
      return { startSec: start, endSec: end, roleHint };
    }
  }

  return null;
}

function parseKineticCell(rawCell: string): {
  kineticText: string;
  highlightWord?: string;
  highlightColor?: string;
  stepByStepItems?: string[];
} {
  let cleanText = rawCell.trim();
  let highlightWord: string | undefined;
  let highlightColor: string | undefined;
  let stepByStepItems: string[] | undefined;

  const parenMatches = [...rawCell.matchAll(/\(([^)]+)\)/g)];
  for (const match of parenMatches) {
    const inside = match[1].trim();
    const lowerInside = inside.toLowerCase();

    if (
      lowerInside.includes('una por pantalla') ||
      lowerInside.includes('uno por pantalla') ||
      lowerInside.includes('palabra por pantalla') ||
      lowerInside.includes('secuencial')
    ) {
      cleanText = cleanText.replace(match[0], '').trim();
      stepByStepItems = cleanText
        .split(/[·,|/]/)
        .map((item) => item.trim())
        .filter(Boolean);
      continue;
    }

    // e.g. "(VACACIONES en naranja #F4A048)" or "(la palabra NUNCA en naranja)"
    const hexMatch = inside.match(/#[0-9a-fA-F]{6}/);
    if (hexMatch) {
      highlightColor = hexMatch[0];
    } else {
      for (const [colorName, hex] of Object.entries(COLOR_MAP)) {
        if (lowerInside.includes(colorName)) {
          highlightColor = hex;
          break;
        }
      }
    }

    const wordMatch =
      inside.match(/(?:la\s+palabra\s+)?([A-ZÁÉÍÓÚÑ0-9+“"”_-]{2,})\s+en\s+/i) ??
      inside.match(/destacar\s+([A-ZÁÉÍÓÚÑ0-9+“"”_-]{2,})/i);
    if (wordMatch) {
      highlightWord = stripQuotes(wordMatch[1]);
      if (!highlightColor) highlightColor = '#F4A048';
      cleanText = cleanText.replace(match[0], '').trim();
    }
  }

  // Fallback highlight for quoted keyword like COMENTA “VIBRA” if none set
  if (!highlightWord) {
    const quoted = cleanText.match(/[“"]([^”"]+)[”"]/);
    if (quoted) {
      highlightWord = quoted[1].trim();
      highlightColor = highlightColor ?? '#F4A048';
    }
  }

  // Also check "la palabra X" even if cleanText mentions a word not literally in kineticText (e.g. NUNCA in beat 7)
  if (
    highlightWord &&
    !cleanText.toLowerCase().includes(highlightWord.toLowerCase())
  ) {
    // Keep cleanText crisp and mark highlightWord for emphasis badge / spoken sync
  }

  return {
    kineticText: cleanText,
    highlightWord,
    highlightColor,
    stepByStepItems:
      stepByStepItems && stepByStepItems.length > 1 ? stepByStepItems : undefined,
  };
}

function inferMetadataFromText(text: string): {
  pillar: PillarName;
  audienceName: string;
  funnelStage: FunnelStage;
  concept: ContentConcept;
} {
  const lower = text.toLowerCase();

  let pillar: PillarName = 'Nueva Visión';
  if (lower.includes('tienda') || lower.includes('instrumento en venta')) {
    pillar = 'Tienda';
  } else if (
    lower.includes('whatsapp') ||
    lower.includes('inscr') ||
    lower.includes('matríc') ||
    lower.includes('comenta') ||
    lower.includes('verano') ||
    lower.includes('piloto')
  ) {
    pillar = 'Conversión';
  } else if (lower.includes('navidad') || lower.includes('festivo')) {
    pillar = 'Festivo';
  } else if (lower.includes('evento') || lower.includes('recital') || lower.includes('sjl')) {
    pillar = 'Comunidad';
  }

  let audienceName = 'Todas las edades (4–18+)';
  if (lower.includes('4 a 5') || lower.includes('estimulación')) {
    audienceName = lower.includes('master') || lower.includes('todas las edades')
      ? 'Todas las edades (Estimulación a Master)'
      : 'Estimulación (4–5 años)';
  } else if (lower.includes('junior')) {
    audienceName = 'Junior (7–12 años)';
  } else if (lower.includes('juvenil')) {
    audienceName = 'Juvenil (13–17 años)';
  } else if (lower.includes('master')) {
    audienceName = 'Master (18+ años)';
  }

  const funnelStage: FunnelStage =
    lower.includes('whatsapp') || lower.includes('comenta') || lower.includes('reserva')
      ? 'BOFU'
      : lower.includes('método') || lower.includes('categoría')
        ? 'MOFU'
        : 'TOFU';

  const concept: ContentConcept =
    lower.includes('whatsapp') || lower.includes('comenta') || lower.includes('empieza')
      ? 'Venta'
      : lower.includes('testimonio')
        ? 'Testimonio'
        : 'Educativo';

  return { pillar, audienceName, funnelStage, concept };
}

export function parsePromptToKineticPost(rawPrompt: string): ParsedPromptPost {
  const normalized = rawPrompt.replace(/\r\n/g, '\n').trim();
  const lines = normalized.split('\n').map((l) => l.trim()).filter(Boolean);

  // Extract Title & Core Idea if provided
  let title = 'Nuevo Reel / Short Vibra Music';
  let coreIdea = 'Propuesta audiovisual vertical 9:16 para redes sociales.';
  for (const line of lines) {
    const titleMatch = line.match(/^(?:guion|título|titulo|post)\s*:\s*(.+)$/i);
    if (titleMatch) {
      title = titleMatch[1].replace(/\s*\([^)]*s\)\s*$/i, '').trim();
      title = stripQuotes(title);
      continue;
    }
    const ideaMatch = line.match(/^idea(?:\s+central)?\s*:\s*(.+)$/i);
    if (ideaMatch) {
      coreIdea = ideaMatch[1].trim();
    }
  }

  const beats: KineticBeat[] = [];

  // Pass 1: Detect structured timed rows ("0–3 s \t Presentador \t Kinetic \t SFX" or "|" separated)
  for (const line of lines) {
    // Skip table header lines
    if (/^tiempo\b/i.test(line) || /^[-|:\s]+$/.test(line)) continue;

    let cols: string[] = [];
    if (line.includes('\t')) {
      cols = line.split('\t').map((c) => c.trim());
    } else if (line.includes('|')) {
      cols = line
        .split('|')
        .map((c) => c.trim())
        .filter((c, idx, arr) => !(idx === 0 && c === '') && !(idx === arr.length - 1 && c === ''));
    } else {
      // Check if line starts with a time range followed by 2+ spaces or colon
      const leadTime = line.match(
        /^(\d+(?:[.,]\d+)?\s*(?:[–\-—]|a)\s*\d+(?:[.,]\d+)?\s*s?(?:\s*\([^)]*\))?)\s{2,}(.+)$/i
      );
      if (leadTime) {
        cols = [leadTime[1], ...leadTime[2].split(/\s{2,}/)];
      }
    }

    if (cols.length >= 2) {
      const range = parseTimeRange(cols[0]);
      if (!range) continue;

      const spokenText = stripQuotes(cols[1] ?? '');
      const rawKinetic = cols[2] ? cols[2] : spokenText.toUpperCase();
      const sfxLabel = cols[3] ? cols[3] : range.roleHint === 'hook' ? 'boom grave' : 'pop';
      const kineticParsed = parseKineticCell(rawKinetic);

      beats.push({
        id: `beat-${beats.length + 1}`,
        role: range.roleHint ?? 'body',
        startSec: range.startSec,
        endSec: range.endSec,
        spokenText,
        kineticText: kineticParsed.kineticText || spokenText.toUpperCase(),
        highlightWord: kineticParsed.highlightWord,
        highlightColor: kineticParsed.highlightColor,
        stepByStepItems: kineticParsed.stepByStepItems,
        sfxLabel,
        sfxKind: classifySfxKind(sfxLabel),
      });
    }
  }

  // Normalize last beat role to CTA if labeled or final beat
  if (beats.length > 0) {
    if (beats[0].role !== 'hook') beats[0].role = 'hook';
    const last = beats[beats.length - 1];
    if (
      last.role !== 'cta' &&
      (last.spokenText.toLowerCase().includes('whatsapp') ||
        last.spokenText.toLowerCase().includes('comenta') ||
        last.spokenText.toLowerCase().includes('escríbenos') ||
        last.kineticText.toLowerCase().includes('comenta'))
    ) {
      last.role = 'cta';
    }
  }

  // Pass 2 Fallback: Free-text prompt without time table -> build a crisp 5-beat 28s structure
  if (beats.length === 0) {
    const cleanPrompt = normalized || 'Música todo el año en Vibra Music SJL';
    const sentences = cleanPrompt
      .split(/[.!?\n]+/)
      .map((s) => s.trim())
      .filter((s) => s.length > 4);

    const hookSentence =
      sentences[0] ?? `¿Buscas clases de música reales todo el año?`;
    const body1 =
      sentences[1] ??
      'En Vibra Music trabajamos con método práctico por edades desde los 4 años hasta adultos.';
    const body2 =
      sentences[2] ??
      'Piano, guitarra, batería, canto y violín con clases dinámicas desde el primer día.';
    const ctaSentence =
      sentences.find((s) =>
        /whatsapp|comenta|escríbenos|inscr|clase|piloto|reserva/i.test(s)
      ) ?? 'Escríbenos por WhatsApp o comenta VIBRA para reservar tu clase piloto en SJL.';

    const generated: Array<Omit<KineticBeat, 'id'>> = [
      {
        role: 'hook',
        startSec: 0,
        endSec: 4,
        spokenText: hookSentence,
        kineticText: hookSentence.toUpperCase().slice(0, 64),
        highlightWord: hookSentence.split(/\s+/)[1]?.replace(/[.,!?]/g, ''),
        highlightColor: '#F4A048',
        sfxLabel: 'ráfaga de 3 destellos + boom grave',
        sfxKind: 'boom_flash',
      },
      {
        role: 'body',
        startSec: 4,
        endSec: 11,
        spokenText: body1,
        kineticText: 'TODO EL AÑO · TODAS LAS EDADES',
        sfxLabel: 'whoosh',
        sfxKind: 'whoosh',
      },
      {
        role: 'body',
        startSec: 11,
        endSec: 19,
        spokenText: body2,
        kineticText: 'PIANO · GUITARRA · BATERÍA · CANTO · VIOLÍN',
        stepByStepItems: ['PIANO', 'GUITARRA', 'BATERÍA', 'CANTO', 'VIOLÍN'],
        sfxLabel: 'pop por palabra',
        sfxKind: 'pop',
      },
      {
        role: 'cta',
        startSec: 19,
        endSec: 26,
        spokenText: ctaSentence,
        kineticText: 'COMENTA “VIBRA” · AV. LAS FLORES 1284-A, SJL',
        highlightWord: 'VIBRA',
        highlightColor: '#F4A048',
        sfxLabel: 'ding + corte seco',
        sfxKind: 'ding_stop',
      },
    ];

    generated.forEach((b, i) => beats.push({ id: `beat-${i + 1}`, ...b }));
  }

  const totalDurationSec = Math.max(
    10,
    Math.round(Math.max(...beats.map((b) => b.endSec)) * 10) / 10
  );

  const hookBeat = beats.find((b) => b.role === 'hook') ?? beats[0];
  const ctaBeat =
    [...beats].reverse().find((b) => b.role === 'cta') ??
    beats[beats.length - 1];
  const bodyBeats = beats.filter((b) => b.id !== hookBeat.id && b.id !== ctaBeat.id);

  const hook = hookBeat.spokenText || title;
  const script =
    bodyBeats.map((b) => b.spokenText).join(' ') || coreIdea;
  const voiceoverText = beats.map((b) => b.spokenText).filter(Boolean).join(' ');
  const cta = ctaBeat.spokenText || 'Comenta VIBRA o escríbenos por WhatsApp.';

  const scenesToRecord = beats.map(
    (b) =>
      `${b.startSec}–${b.endSec}s · ${b.kineticText}${b.sfxLabel && b.sfxLabel !== 'none' ? ` [SFX: ${b.sfxLabel}]` : ''}`
  );

  const meta = inferMetadataFromText(`${title}\n${coreIdea}\n${voiceoverText}`);

  return {
    title,
    coreIdea,
    totalDurationSec,
    pillar: meta.pillar,
    audienceName: meta.audienceName,
    funnelStage: meta.funnelStage,
    concept: meta.concept,
    voice: 'Con voz',
    hook,
    script,
    voiceoverText,
    cta,
    scenesToRecord,
    beats,
  };
}
