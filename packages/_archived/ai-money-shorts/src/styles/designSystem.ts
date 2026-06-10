export const DESIGN = {
  colors: {
    primaryBg: '#0A0E27',
    secondaryBg: '#1A1F3A',
    accentGold: '#FFD700',
    accentCyan: '#00E5FF',
    accentPink: '#FF6B9D',
    textWhite: '#FFFFFF',
    textGray: '#B0B8D1',
    successGreen: '#4CAF50',
    warningOrange: '#FF9800',
  },
  fonts: {
    heading: "'Noto Sans JP', sans-serif",
    body: "'Noto Sans JP', sans-serif",
    number: "'Montserrat', sans-serif",
  },
  canvas: {
    width: 1080,
    height: 1920,
    fps: 30,
  },
} as const;

export type DesignColors = typeof DESIGN.colors;
