import { BGM_CATALOG } from '../../domain/value-objects';

const cachedBgmUrls = new Map<string, string>();

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
  view.setUint16(20, 1, true); // PCM
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

/**
 * Generates a warm, loopable musical WAV track matched to the selected BGM mood & BPM.
 * Cached as an in-memory blob: URL for deterministic Remotion Player & MP4 WebRenderer use.
 */
export function getProceduralBgmWavUrl(trackId: string): string {
  const existing = cachedBgmUrls.get(trackId);
  if (existing) return existing;

  const track = BGM_CATALOG.find((t) => t.id === trackId) ?? BGM_CATALOG[0];
  const sampleRate = 22050;
  const beatSec = 60 / track.bpm;
  // 8 beats seamless musical loop
  const loopBeats = 8;
  const durationSec = beatSec * loopBeats;
  const totalSamples = Math.floor(sampleRate * durationSec);
  const samples = new Float32Array(totalSamples);

  // Chord progression intervals (I - V - vi - IV feel) in semitone ratios
  const chordRoots = [1, 1.4983, 1.6818, 1.3348];
  const rootHz = track.baseFreqHz;

  for (let i = 0; i < totalSamples; i += 1) {
    const t = i / sampleRate;
    const beatFloat = t / beatSec;
    const beatIdx = Math.floor(beatFloat);
    const beatPhase = beatFloat - beatIdx;
    const chordIdx = Math.floor(beatIdx / 2) % chordRoots.length;
    const chordMult = chordRoots[chordIdx];

    const f1 = rootHz * chordMult;
    const f3 = f1 * 1.2599; // major third
    const f5 = f1 * 1.4983; // fifth

    // Pluck envelope synced to each beat + eighth-note arpeggio
    const subPhase = (beatFloat * 2) % 1;
    const pluckEnv = Math.exp(-subPhase * 5.2);
    const padEnv = 0.35 + 0.15 * Math.sin((t / durationSec) * Math.PI * 2);

    const arpFreq = beatIdx % 2 === 0 ? (subPhase < 0.5 ? f1 : f3) : f5;
    const melody =
      Math.sin(2 * Math.PI * arpFreq * t) * pluckEnv * 0.24 +
      Math.sin(2 * Math.PI * arpFreq * 2 * t) * pluckEnv * 0.06;

    const warmPad =
      (Math.sin(2 * Math.PI * (f1 * 0.5) * t) * 0.18 +
        Math.sin(2 * Math.PI * f3 * t) * 0.08 +
        Math.sin(2 * Math.PI * f5 * t) * 0.08) *
      padEnv;

    // Gentle acoustic kick/cajon thump on beats 0 and 2
    const percEnv =
      beatIdx % 2 === 0
        ? Math.exp(-beatPhase * 18) * 0.2
        : Math.exp(-beatPhase * 28) * 0.08;
    const percFreq = 95 - beatPhase * 45;
    const perc = Math.sin(2 * Math.PI * percFreq * t) * percEnv;

    // Smooth crossfade at loop boundaries (first/last 20ms) to avoid clicks
    const edgeSamples = Math.floor(sampleRate * 0.02);
    let loopFade = 1;
    if (i < edgeSamples) loopFade = i / edgeSamples;
    else if (i > totalSamples - edgeSamples) {
      loopFade = (totalSamples - i) / edgeSamples;
    }

    samples[i] = (melody + warmPad + perc) * loopFade * 0.72;
  }

  const wavBlob = encodeWavPcm16(samples, sampleRate);
  const url = URL.createObjectURL(wavBlob);
  cachedBgmUrls.set(trackId, url);
  return url;
}
