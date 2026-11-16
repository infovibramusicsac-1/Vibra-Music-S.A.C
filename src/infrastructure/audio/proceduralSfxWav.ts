import type { KineticBeat, SfxKind } from '../../domain/entities';

const cachedSfxUrls = new Map<string, string>();

function encodeWavPcm16(samples: Float32Array, sampleRate: number): Blob {
  const numChannels = 1;
  const bitsPerSample = 16;
  const byteRate = (sampleRate * numChannels * bitsPerSample) / 8;
  const blockAlign = (numChannels * bitsPerSample) / 8;
  const dataSize = samples.length * 2;
  const buffer = new ArrayBuffer(44 + dataSize);
  const view = new DataView(buffer);

  const writeStr = (offset: number, str: string) => {
    for (let i = 0; i < str.length; i += 1) {
      view.setUint8(offset + i, str.charCodeAt(i));
    }
  };

  writeStr(0, 'RIFF');
  view.setUint32(4, 36 + dataSize, true);
  writeStr(8, 'WAVE');
  writeStr(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, byteRate, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, bitsPerSample, true);
  writeStr(36, 'data');
  view.setUint32(40, dataSize, true);

  let offset = 44;
  for (let i = 0; i < samples.length; i += 1) {
    const clamped = Math.max(-1, Math.min(1, samples[i]));
    view.setInt16(
      offset,
      clamped < 0 ? clamped * 0x8000 : clamped * 0x7fff,
      true
    );
    offset += 2;
  }

  return new Blob([buffer], { type: 'audio/wav' });
}

function addBoom(
  samples: Float32Array,
  sampleRate: number,
  startSec: number
): void {
  const startIdx = Math.floor(startSec * sampleRate);
  const durSamples = Math.floor(0.55 * sampleRate);
  for (let i = 0; i < durSamples; i += 1) {
    const idx = startIdx + i;
    if (idx < 0 || idx >= samples.length) break;
    const t = i / sampleRate;
    const freq = 128 * Math.exp(-t * 5.2) + 34;
    const env = Math.exp(-t * 6.5) * Math.min(1, t / 0.008);
    samples[idx] += Math.sin(2 * Math.PI * freq * t) * env * 0.72;
  }
}

function addWhoosh(
  samples: Float32Array,
  sampleRate: number,
  startSec: number
): void {
  const startIdx = Math.floor(startSec * sampleRate);
  const durSamples = Math.floor(0.36 * sampleRate);
  let lp = 0;
  let seed = 1337;
  for (let i = 0; i < durSamples; i += 1) {
    const idx = startIdx + i;
    if (idx < 0 || idx >= samples.length) break;
    const t = i / durSamples;
    const env = Math.sin(Math.PI * t) ** 1.4;
    seed = (seed * 16807) % 2147483647;
    const white = (seed / 2147483647) * 2 - 1;
    const alpha = 0.08 + 0.32 * env;
    lp = lp + alpha * (white - lp);
    samples[idx] += lp * env * 0.45;
  }
}

function addPop(
  samples: Float32Array,
  sampleRate: number,
  startSec: number
): void {
  const startIdx = Math.floor(startSec * sampleRate);
  const durSamples = Math.floor(0.11 * sampleRate);
  for (let i = 0; i < durSamples; i += 1) {
    const idx = startIdx + i;
    if (idx < 0 || idx >= samples.length) break;
    const t = i / sampleRate;
    const freq = 340 + (t / 0.11) * 620;
    const env = Math.exp(-t * 36) * Math.min(1, t / 0.004);
    samples[idx] += Math.sin(2 * Math.PI * freq * t) * env * 0.48;
  }
}

function addDing(
  samples: Float32Array,
  sampleRate: number,
  startSec: number
): void {
  const startIdx = Math.floor(startSec * sampleRate);
  const durSamples = Math.floor(0.58 * sampleRate);
  for (let i = 0; i < durSamples; i += 1) {
    const idx = startIdx + i;
    if (idx < 0 || idx >= samples.length) break;
    const t = i / sampleRate;
    const env = Math.exp(-t * 6.8) * Math.min(1, t / 0.005);
    const bell =
      Math.sin(2 * Math.PI * 1046.5 * t) * 0.55 +
      Math.sin(2 * Math.PI * 1567.98 * t) * 0.25 +
      Math.sin(2 * Math.PI * 2093.0 * t) * 0.2;
    samples[idx] += bell * env * 0.36;
  }
}

function addFlashBurst(
  samples: Float32Array,
  sampleRate: number,
  startSec: number
): void {
  const offsets = [0, 0.09, 0.18];
  const freqs = [1320, 1760, 2349];
  offsets.forEach((off, idxBurst) => {
    const startIdx = Math.floor((startSec + off) * sampleRate);
    const durSamples = Math.floor(0.08 * sampleRate);
    const f = freqs[idxBurst];
    for (let i = 0; i < durSamples; i += 1) {
      const idx = startIdx + i;
      if (idx < 0 || idx >= samples.length) break;
      const t = i / sampleRate;
      const env = Math.exp(-t * 32) * Math.min(1, t / 0.003);
      samples[idx] += Math.sin(2 * Math.PI * f * t) * env * 0.28;
    }
  });
}

function addSharpStop(
  samples: Float32Array,
  sampleRate: number,
  startSec: number
): void {
  const startIdx = Math.floor(startSec * sampleRate);
  const durSamples = Math.floor(0.07 * sampleRate);
  for (let i = 0; i < durSamples; i += 1) {
    const idx = startIdx + i;
    if (idx < 0 || idx >= samples.length) break;
    const t = i / sampleRate;
    const env = Math.exp(-t * 48);
    samples[idx] += Math.sin(2 * Math.PI * 190 * t) * env * 0.42;
  }
}

function renderSfxEvent(
  samples: Float32Array,
  sampleRate: number,
  beat: KineticBeat
): void {
  const kind: SfxKind = beat.sfxKind;
  if (kind === 'none') return;

  if (kind === 'boom') {
    addBoom(samples, sampleRate, beat.startSec);
    return;
  }
  if (kind === 'whoosh') {
    addWhoosh(samples, sampleRate, beat.startSec);
    return;
  }
  if (kind === 'flash') {
    addFlashBurst(samples, sampleRate, beat.startSec);
    return;
  }
  if (kind === 'boom_flash') {
    addFlashBurst(samples, sampleRate, beat.startSec);
    addBoom(samples, sampleRate, beat.startSec + 0.12);
    return;
  }
  if (kind === 'ding') {
    addDing(samples, sampleRate, beat.startSec);
    return;
  }
  if (kind === 'pop_ding') {
    addPop(samples, sampleRate, beat.startSec);
    addDing(samples, sampleRate, beat.startSec + 0.22);
    return;
  }
  if (kind === 'ding_stop') {
    addDing(samples, sampleRate, beat.startSec);
    addSharpStop(samples, sampleRate, Math.max(beat.startSec + 0.4, beat.endSec - 0.15));
    return;
  }

  // kind === 'pop': if stepByStepItems has multiple items, trigger a pop per word/item
  if (beat.stepByStepItems && beat.stepByStepItems.length > 1) {
    const span = Math.max(1, beat.endSec - beat.startSec);
    const step = span / beat.stepByStepItems.length;
    beat.stepByStepItems.forEach((_, idx) => {
      addPop(samples, sampleRate, beat.startSec + idx * step);
    });
  } else {
    addPop(samples, sampleRate, beat.startSec);
  }
}

/**
 * Generates an exact-duration PCM 16-bit WAV audio track containing all synthesized SFX cues
 * aligned to each KineticBeat timestamp. Cached by beats signature.
 */
export function getProceduralSfxWavUrl(
  beats: KineticBeat[] | undefined,
  totalDurationSec: number
): string | undefined {
  if (!beats || beats.length === 0) return undefined;
  const activeBeats = beats.filter((b) => b.sfxKind !== 'none');
  if (activeBeats.length === 0) return undefined;

  const safeDur = Math.max(8, Number(totalDurationSec.toFixed(1)));
  const cacheKey = `${safeDur}|${activeBeats
    .map(
      (b) =>
        `${b.startSec}-${b.endSec}:${b.sfxKind}:${b.stepByStepItems?.length ?? 0}`
    )
    .join(';')}`;

  const existing = cachedSfxUrls.get(cacheKey);
  if (existing) return existing;

  const sampleRate = 22050;
  const totalSamples = Math.floor(sampleRate * safeDur);
  const samples = new Float32Array(totalSamples);

  for (const beat of activeBeats) {
    renderSfxEvent(samples, sampleRate, beat);
  }

  // Soft limiter to prevent clipping when multiple effects overlap
  for (let i = 0; i < samples.length; i += 1) {
    if (samples[i] > 0.92 || samples[i] < -0.92) {
      samples[i] = Math.tanh(samples[i]);
    }
  }

  const blob = encodeWavPcm16(samples, sampleRate);
  const url = URL.createObjectURL(blob);
  cachedSfxUrls.set(cacheKey, url);
  return url;
}
