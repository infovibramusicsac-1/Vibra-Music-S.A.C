export type FunnelStage = 'TOFU' | 'MOFU' | 'BOFU';

export type ProductionStatus = 'Por grabar' | 'Grabado' | 'En edición' | 'Listo';

export const PRODUCTION_STAGES: ProductionStatus[] = [
  'Por grabar',
  'Grabado',
  'En edición',
  'Listo',
];

export type ContentConcept =
  | 'POV'
  | 'UGC'
  | 'Fundador'
  | 'Venta'
  | 'Educativo'
  | 'Testimonio';

export const CONTENT_CONCEPTS: ContentConcept[] = [
  'POV',
  'UGC',
  'Fundador',
  'Venta',
  'Educativo',
  'Testimonio',
];

export type ContentFormat = 'Video' | 'Estático';

export type VoiceType = 'Con voz' | 'Sin voz';

export type PillarName =
  | 'Nueva Visión'
  | 'Tienda'
  | 'Festivo'
  | 'Conversión'
  | 'Comunidad';

export type SubtitlePreset = 'Hormozi Bold' | 'Minimal Glass' | 'Neón Urbano';

export const SUBTITLE_PRESETS: SubtitlePreset[] = [
  'Hormozi Bold',
  'Minimal Glass',
  'Neón Urbano',
];

export interface VoiceConfig {
  voiceURI: string;
  voiceName: string;
  rate: number; // 0.85 - 1.35
  pitch: number; // 0.9 - 1.15
}

export interface BgmTrack {
  id: string;
  title: string;
  mood: string;
  bpm: number;
  baseFreqHz: number;
  licenseNote: string;
}

export const BGM_CATALOG: BgmTrack[] = [
  {
    id: 'bgm-acustica-calida',
    title: 'Guitarra Acústica Tibia',
    mood: 'Familiar y cercano',
    bpm: 92,
    baseFreqHz: 261.63,
    licenseNote: 'Licencia Comercial Meta',
  },
  {
    id: 'bgm-ukelele-juego',
    title: 'Ukelele & Xilófono Semillas',
    mood: 'Alegre · Estimulación 4–5',
    bpm: 108,
    baseFreqHz: 329.63,
    licenseNote: 'Licencia Comercial Meta',
  },
  {
    id: 'bgm-cajon-ritmo',
    title: 'Pulso de Cajón & Marimba',
    mood: 'Orgánico peruano',
    bpm: 100,
    baseFreqHz: 293.66,
    licenseNote: 'Licencia Comercial Meta',
  },
  {
    id: 'bgm-piano-suave',
    title: 'Piano Nocturno SJL',
    mood: 'Emotivo · Testimonio',
    bpm: 78,
    baseFreqHz: 220.0,
    licenseNote: 'Licencia Comercial Meta',
  },
];

export type RoleTab = 'coordinador' | 'manager' | 'creador';
export type ThemeMode = 'dark' | 'light';
export type SocialSafeZoneMode = 'off' | 'reels' | 'tiktok';

export type TransitionPreset =
  | 'Corte'
  | 'Fade'
  | 'Slide'
  | 'Wipe'
  | 'Flash'
  | 'Cross Zoom'
  | 'Glitch'
  | 'Flip 3D';

export const TRANSITION_PRESETS: TransitionPreset[] = [
  'Corte',
  'Fade',
  'Slide',
  'Wipe',
  'Flash',
  'Cross Zoom',
  'Glitch',
  'Flip 3D',
];

export type RemotionFontFamily =
  | 'Plus Jakarta Sans'
  | 'Oswald'
  | 'Playfair Display'
  | 'JetBrains Mono';

export const REMOTION_FONT_FAMILIES: RemotionFontFamily[] = [
  'Plus Jakarta Sans',
  'Oswald',
  'Playfair Display',
  'JetBrains Mono',
];

export type TextAnimationStyle =
  | 'Pop Spring'
  | 'Slide Up'
  | 'Scale Slam'
  | 'Typewriter'
  | 'Word Bounce';

export const TEXT_ANIMATION_STYLES: TextAnimationStyle[] = [
  'Pop Spring',
  'Slide Up',
  'Scale Slam',
  'Typewriter',
  'Word Bounce',
];

export interface KineticPresetCard {
  id: string;
  name: string;
  description: string;
  textAnimation: TextAnimationStyle;
  subtitlePreset: SubtitlePreset;
  fontFamily: RemotionFontFamily;
  accentColor: string;
  uppercase: boolean;
  samplePrefix: string;
  sampleHighlight: string;
  sampleSuffix: string;
}

export const KINETIC_ANIMATION_PRESETS: KineticPresetCard[] = [
  {
    id: 'kin-pop-hormozi',
    name: 'Pop Spring',
    description: 'Rebote ágil estilo Hormozi con foco ámbar',
    textAnimation: 'Pop Spring',
    subtitlePreset: 'Hormozi Bold',
    fontFamily: 'Plus Jakarta Sans',
    accentColor: '#F4A048',
    uppercase: true,
    samplePrefix: 'LA',
    sampleHighlight: 'MÚSICA',
    sampleSuffix: 'NO PARA',
  },
  {
    id: 'kin-slam-impacto',
    name: 'Scale Slam',
    description: 'Golpe frontal condensado para hooks de 3s',
    textAnimation: 'Scale Slam',
    subtitlePreset: 'Hormozi Bold',
    fontFamily: 'Oswald',
    accentColor: '#FF5A4E',
    uppercase: true,
    samplePrefix: 'SIN',
    sampleHighlight: 'EXCUSAS',
    sampleSuffix: 'HOY',
  },
  {
    id: 'kin-slide-editorial',
    name: 'Slide Up',
    description: 'Deslizamiento limpio sobre cápsula iOS Glass',
    textAnimation: 'Slide Up',
    subtitlePreset: 'Minimal Glass',
    fontFamily: 'Playfair Display',
    accentColor: '#F5A623',
    uppercase: false,
    samplePrefix: 'Aprende',
    sampleHighlight: 'música',
    sampleSuffix: 'real',
  },
  {
    id: 'kin-bounce-ritmo',
    name: 'Word Bounce',
    description: 'Salto palabra por palabra al ritmo del beat',
    textAnimation: 'Word Bounce',
    subtitlePreset: 'Neón Urbano',
    fontFamily: 'Plus Jakarta Sans',
    accentColor: '#F4A048',
    uppercase: true,
    samplePrefix: 'TOCA',
    sampleHighlight: 'EN VIVO',
    sampleSuffix: 'SJL',
  },
  {
    id: 'kin-type-dato',
    name: 'Typewriter',
    description: 'Revelado progresivo ideal para datos curiosos',
    textAnimation: 'Typewriter',
    subtitlePreset: 'Minimal Glass',
    fontFamily: 'JetBrains Mono',
    accentColor: '#38BDF8',
    uppercase: false,
    samplePrefix: 'Dato:',
    sampleHighlight: '4–18+',
    sampleSuffix: 'años',
  },
];

export type CameraMotionPreset =
  | 'Static'
  | 'Zoom In'
  | 'Zoom Out'
  | 'Pan Left'
  | 'Pan Right'
  | 'Beat Pulse';

export const CAMERA_MOTION_PRESETS: CameraMotionPreset[] = [
  'Static',
  'Zoom In',
  'Zoom Out',
  'Pan Left',
  'Pan Right',
  'Beat Pulse',
];

export type ColorGradePreset =
  | 'Natural'
  | 'Warm Vibra'
  | 'Cinematic'
  | 'High Contrast'
  | 'Nocturne Cool';

export const COLOR_GRADE_PRESETS: ColorGradePreset[] = [
  'Natural',
  'Warm Vibra',
  'Cinematic',
  'High Contrast',
  'Nocturne Cool',
];

export type HookBannerStyle =
  | 'Glass Card'
  | 'Kinetic Slam'
  | 'Split Banner'
  | 'Full Screen';

export const HOOK_BANNER_STYLES: HookBannerStyle[] = [
  'Glass Card',
  'Kinetic Slam',
  'Split Banner',
  'Full Screen',
];

export type CtaStickerStyle =
  | 'None'
  | 'Comenta VIBRA'
  | 'WhatsApp Directo'
  | 'Pin SJL';

export const CTA_STICKER_STYLES: CtaStickerStyle[] = [
  'None',
  'Comenta VIBRA',
  'WhatsApp Directo',
  'Pin SJL',
];

export interface RemotionStyleConfig {
  fontFamily: RemotionFontFamily;
  fontScale: number; // 0.75 - 1.45
  uppercase: boolean;
  textColor: string;
  accentColor: string;
  boxOpacity: number; // 0 - 1
  boxRadius: number; // 0 - 48
  strokeWidth: number; // 0 - 6
  subtitleYPercent: number; // 18 - 88
  textAnimation: TextAnimationStyle;
  cameraMotion: CameraMotionPreset;
  cameraIntensity: number; // 0.05 - 0.25
  colorGrade: ColorGradePreset;
  vignetteIntensity: number; // 0 - 0.85
  sfxVisualFlash: boolean;
  hookStyle: HookBannerStyle;
  ctaSticker: CtaStickerStyle;
}

export const DEFAULT_REMOTION_STYLE: RemotionStyleConfig = {
  fontFamily: 'Plus Jakarta Sans',
  fontScale: 1.0,
  uppercase: true,
  textColor: '#FFFFFF',
  accentColor: '#F4A048',
  boxOpacity: 0.88,
  boxRadius: 28,
  strokeWidth: 2,
  subtitleYPercent: 76,
  textAnimation: 'Pop Spring',
  cameraMotion: 'Zoom In',
  cameraIntensity: 0.14,
  colorGrade: 'Natural',
  vignetteIntensity: 0.35,
  sfxVisualFlash: true,
  hookStyle: 'Glass Card',
  ctaSticker: 'Comenta VIBRA',
};

export interface StudioTemplatePreset {
  id: string;
  name: string;
  description: string;
  subtitlePreset: SubtitlePreset;
  transitionPreset: TransitionPreset;
  transitionDurationSec: number;
  karaokeMode: boolean;
  showProgressBar: boolean;
  showWaveform: boolean;
  hookDurationSec: number;
  ctaDurationSec: number;
  bgmTrackId: string;
  bgmVolume: number;
  styleConfig?: RemotionStyleConfig;
  isCustom?: boolean;
}

export const VIBRA_STUDIO_TEMPLATES: StudioTemplatePreset[] = [
  {
    id: 'tpl-pov-dinamico',
    name: 'POV Dinámico',
    description: 'Oswald Impacto, Zoom In y flashes en SFX',
    subtitlePreset: 'Hormozi Bold',
    transitionPreset: 'Slide',
    transitionDurationSec: 0.4,
    karaokeMode: true,
    showProgressBar: true,
    showWaveform: false,
    hookDurationSec: 2.8,
    ctaDurationSec: 3.0,
    bgmTrackId: 'bgm-cajon-ritmo',
    bgmVolume: 65,
    styleConfig: {
      ...DEFAULT_REMOTION_STYLE,
      fontFamily: 'Oswald',
      fontScale: 1.15,
      accentColor: '#F4A048',
      textAnimation: 'Scale Slam',
      cameraMotion: 'Zoom In',
      colorGrade: 'Warm Vibra',
      hookStyle: 'Kinetic Slam',
      ctaSticker: 'Comenta VIBRA',
    },
  },
  {
    id: 'tpl-ugc-testimonio',
    name: 'UGC Testimonio',
    description: 'Minimal Glass, Playfair editorial y luz cálida',
    subtitlePreset: 'Minimal Glass',
    transitionPreset: 'Fade',
    transitionDurationSec: 0.5,
    karaokeMode: true,
    showProgressBar: true,
    showWaveform: true,
    hookDurationSec: 3.2,
    ctaDurationSec: 3.4,
    bgmTrackId: 'bgm-piano-suave',
    bgmVolume: 32,
    styleConfig: {
      ...DEFAULT_REMOTION_STYLE,
      fontFamily: 'Playfair Display',
      fontScale: 0.95,
      uppercase: false,
      accentColor: '#F5A623',
      boxOpacity: 0.74,
      boxRadius: 34,
      textAnimation: 'Slide Up',
      cameraMotion: 'Pan Right',
      colorGrade: 'Cinematic',
      hookStyle: 'Glass Card',
      ctaSticker: 'Pin SJL',
    },
  },
  {
    id: 'tpl-estimulacion-alegre',
    name: 'Estimulación 4–5 Alegre',
    description: 'Ukelele brillante, Beat Pulse y rebote cálido',
    subtitlePreset: 'Hormozi Bold',
    transitionPreset: 'Wipe',
    transitionDurationSec: 0.45,
    karaokeMode: true,
    showProgressBar: true,
    showWaveform: true,
    hookDurationSec: 3.0,
    ctaDurationSec: 3.5,
    bgmTrackId: 'bgm-ukelele-juego',
    bgmVolume: 72,
    styleConfig: {
      ...DEFAULT_REMOTION_STYLE,
      fontFamily: 'Plus Jakarta Sans',
      fontScale: 1.05,
      accentColor: '#F4A048',
      textAnimation: 'Word Bounce',
      cameraMotion: 'Beat Pulse',
      colorGrade: 'Warm Vibra',
      hookStyle: 'Split Banner',
      ctaSticker: 'WhatsApp Directo',
    },
  },
  {
    id: 'tpl-venta-piloto',
    name: 'Venta Clase Piloto',
    description: 'Neón Urbano, alto contraste y CTA WhatsApp',
    subtitlePreset: 'Neón Urbano',
    transitionPreset: 'Fade',
    transitionDurationSec: 0.35,
    karaokeMode: true,
    showProgressBar: true,
    showWaveform: true,
    hookDurationSec: 2.6,
    ctaDurationSec: 4.0,
    bgmTrackId: 'bgm-acustica-calida',
    bgmVolume: 55,
    styleConfig: {
      ...DEFAULT_REMOTION_STYLE,
      fontFamily: 'Oswald',
      fontScale: 1.1,
      accentColor: '#FF5A4E',
      textAnimation: 'Pop Spring',
      cameraMotion: 'Zoom Out',
      colorGrade: 'High Contrast',
      hookStyle: 'Full Screen',
      ctaSticker: 'Comenta VIBRA',
    },
  },
];

export function mapConceptIdToContentConcept(conceptId: string): ContentConcept {
  if (conceptId.includes('pov')) return 'POV';
  if (conceptId.includes('ugc')) return 'UGC';
  if (conceptId.includes('celebridad') || conceptId.includes('entrevista')) return 'Fundador';
  if (
    conceptId.includes('venta') ||
    conceptId.includes('oferta') ||
    conceptId.includes('comercial') ||
    conceptId.includes('editado') ||
    conceptId.includes('catalogo')
  ) {
    return 'Venta';
  }
  if (conceptId.includes('transformacional') || conceptId.includes('post-redes')) {
    return 'Testimonio';
  }
  return 'Educativo';
}
