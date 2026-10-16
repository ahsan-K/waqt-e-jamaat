import type { Language } from '@/i18n/languages';

export type FontWeight = 'regular' | 'medium' | 'semibold' | 'bold' | 'extrabold';

const manrope: Record<FontWeight, string> = {
  regular: 'Manrope_400Regular',
  medium: 'Manrope_500Medium',
  semibold: 'Manrope_600SemiBold',
  bold: 'Manrope_700Bold',
  extrabold: 'Manrope_800ExtraBold',
};

const nastaliq: Record<FontWeight, string> = {
  regular: 'NotoNastaliqUrdu_400Regular',
  medium: 'NotoNastaliqUrdu_500Medium',
  semibold: 'NotoNastaliqUrdu_600SemiBold',
  bold: 'NotoNastaliqUrdu_700Bold',
  extrabold: 'NotoNastaliqUrdu_700Bold',
};

export type Script = 'latin' | 'urdu';

export function scriptFor(language: Language): Script {
  return language === 'ur' ? 'urdu' : 'latin';
}

export function fontFamily(script: Script, weight: FontWeight): string {
  return script === 'urdu' ? nastaliq[weight] : manrope[weight];
}

/** Nastaliq needs roughly double line height; Latin ~1.35. */
export function lineHeightFor(script: Script, size: number): number {
  return Math.round(size * (script === 'urdu' ? 2 : 1.35));
}

/** Font family for raw TextInput etc. that can't use <AppText>. */
export function fontFamilyFor(language: Language, weight: FontWeight = 'medium'): string {
  return fontFamily(scriptFor(language), weight);
}
