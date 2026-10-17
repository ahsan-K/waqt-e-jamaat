export const colors = {
  primary: '#0F5C4A',
  primaryPressed: '#0A4235',
  primarySoft: '#E3EFEA',
  onPrimaryMuted: '#CFE3DB',
  onPrimarySoft: '#E3EFEA',
  accent: '#B86B1E',
  accentText: '#8A4B0F',
  accentBg: '#FBEBD6',
  ink: '#14201C',
  muted: '#5B6660',
  surface: '#FFFFFF',
  background: '#F6F4EE',
  border: '#E4E1D7',
  mapBase: '#E8E4D8',
  danger: '#B42318',
  dangerBg: '#FDECEA',
  pinGrey: '#8A938E',
  white: '#FFFFFF',
  glassLight: 'rgba(255,255,255,0.72)',
  glassLightFallback: 'rgba(250,251,250,0.94)',
  glassOnPrimary: 'rgba(255,255,255,0.16)',
  glassOnPrimaryBorder: 'rgba(255,255,255,0.32)',
  overlay: 'rgba(20,32,28,0.35)',
} as const;

export const radii = {
  card: 26,
  cardLg: 28,
  cardXl: 30,
  sheet: 34,
  pill: 999,
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
} as const;

/** Minimum touch target (pt). */
export const TOUCH = 44;

export type ColorName = keyof typeof colors;
