import { VariationConfig, ThemeType, TitleStyleType, CharacterLayoutType, SubtitleStyleType, TransitionType, BackgroundType } from '../utils/types';

export interface ThemeColors {
  primary: string;
  secondary: string;
  accent: string;
  background: string;
  backgroundGradient: [string, string];
  text: string;
  subtitleBg: string;
}

export const THEMES: Record<ThemeType, ThemeColors> = {
  'midnight-blue': {
    primary: '#1a1a2e',
    secondary: '#16213e',
    accent: '#0f3460',
    background: '#0a0a1a',
    backgroundGradient: ['#0a0a1a', '#1a1a2e'],
    text: '#e0e0ff',
    subtitleBg: 'rgba(15, 52, 96, 0.85)',
  },
  'forest-green': {
    primary: '#1a2e1a',
    secondary: '#162e16',
    accent: '#2d6a2d',
    background: '#0a1a0a',
    backgroundGradient: ['#0a1a0a', '#1a2e1a'],
    text: '#e0ffe0',
    subtitleBg: 'rgba(45, 106, 45, 0.85)',
  },
  'warm-sunset': {
    primary: '#2e1a0a',
    secondary: '#3e2010',
    accent: '#c0622a',
    background: '#1a0a00',
    backgroundGradient: ['#1a0a00', '#3e2010'],
    text: '#ffe8d0',
    subtitleBg: 'rgba(192, 98, 42, 0.85)',
  },
  'arctic-white': {
    primary: '#e8eef5',
    secondary: '#d0dce8',
    accent: '#4a8fc4',
    background: '#f5f8fc',
    backgroundGradient: ['#e8eef5', '#f5f8fc'],
    text: '#1a2a3a',
    subtitleBg: 'rgba(74, 143, 196, 0.85)',
  },
  'crimson-dark': {
    primary: '#2e0a0a',
    secondary: '#3e1010',
    accent: '#c42a2a',
    background: '#1a0000',
    backgroundGradient: ['#1a0000', '#3e1010'],
    text: '#ffe0e0',
    subtitleBg: 'rgba(196, 42, 42, 0.85)',
  },
};
