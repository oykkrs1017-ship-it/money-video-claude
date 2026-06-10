import { VariationConfig, ThemeType, TitleStyleType, CharacterLayoutType, SubtitleStyleType, TransitionType, BackgroundType } from '../utils/types';

export interface ThemeColors {
  primary: string;
  secondary: string;
  accent: string;
  background: string;
  backgroundGradient: [string, string];
  text: string;
  subtitleBg: string;
  /** テーマ固有フォント（未指定時はデフォルトフォントを使用） */
  fontFamily?: string;
  /** アクセントカラー2（chalk-boardの黄色ハイライト等） */
  accent2?: string;
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
    fontFamily: "'Noto Sans JP', sans-serif",
  },
  'forest-green': {
    primary: '#1a2e1a',
    secondary: '#162e16',
    accent: '#2d6a2d',
    background: '#0a1a0a',
    backgroundGradient: ['#0a1a0a', '#1a2e1a'],
    text: '#e0ffe0',
    subtitleBg: 'rgba(45, 106, 45, 0.85)',
    fontFamily: "'Noto Sans JP', sans-serif",
  },
  'warm-sunset': {
    primary: '#2e1a0a',
    secondary: '#3e2010',
    accent: '#c0622a',
    background: '#1a0a00',
    backgroundGradient: ['#1a0a00', '#3e2010'],
    text: '#ffe8d0',
    subtitleBg: 'rgba(192, 98, 42, 0.85)',
    fontFamily: "'Noto Sans JP', sans-serif",
  },
  'arctic-white': {
    primary: '#e8eef5',
    secondary: '#d0dce8',
    accent: '#4a8fc4',
    background: '#f5f8fc',
    backgroundGradient: ['#e8eef5', '#f5f8fc'],
    text: '#1a2a3a',
    subtitleBg: 'rgba(74, 143, 196, 0.85)',
    fontFamily: "'Noto Sans JP', sans-serif",
  },
  'crimson-dark': {
    primary: '#2e0a0a',
    secondary: '#3e1010',
    accent: '#c42a2a',
    background: '#1a0000',
    backgroundGradient: ['#1a0000', '#3e1010'],
    text: '#ffe0e0',
    subtitleBg: 'rgba(196, 42, 42, 0.85)',
    fontFamily: "'Noto Sans JP', sans-serif",
  },
  'chalk-board': {
    primary: '#4A7C6F',
    secondary: '#5A9080',
    accent: '#FF6347',
    accent2: '#FFD700',
    background: '#3D6B5E',
    backgroundGradient: ['#4A7C6F', '#3D6B5E'],
    text: '#FFFFFF',
    subtitleBg: 'rgba(30, 70, 60, 0.82)',
    fontFamily: "'Yusei Magic', 'M PLUS Rounded 1c', sans-serif",
  },

  // ── 明るい・ニュース番組向けテーマ ──────────────────────────────

  'news-white': {
    // 清潔感ある白ベース。NHK・テレ東風
    // accent: #D62828（警告赤） WCAG AA 対白背景 5.74:1 確保
    primary: '#FFFFFF',
    secondary: '#F0F4F8',
    accent: '#D62828',        // 警告赤（WCAG AA 5.74:1 on white）
    accent2: '#F77F00',       // 警告オレンジ
    background: '#F5F7FA',
    backgroundGradient: ['#FFFFFF', '#E8EFF8'],
    text: '#0D1B2A',          // 濃紺テキスト（視認性高）
    subtitleBg: 'rgba(214, 40, 40, 0.90)',
    fontFamily: "'Noto Sans JP', sans-serif",
  },

  'news-blue': {
    // プロフェッショナルな明るいブルー。Bloomberg・CNN風
    primary: '#1A73E8',
    secondary: '#2196F3',
    accent: '#FF6D00',        // オレンジアクセント
    accent2: '#FFD600',       // 黄色ハイライト
    background: '#E3F2FD',    // 明るい水色
    backgroundGradient: ['#E3F2FD', '#BBDEFB'],
    text: '#0D2137',
    subtitleBg: 'rgba(26, 115, 232, 0.92)',
    fontFamily: "'Noto Sans JP', sans-serif",
  },

  'studio-green': {
    // 爽やかな明るいグリーン。環境・テクノロジー系ニュース風
    primary: '#00897B',
    secondary: '#26A69A',
    accent: '#FF6F00',        // アンバーアクセント
    accent2: '#FFEE58',       // 黄色ハイライト
    background: '#E0F2F1',    // ミントグリーン
    backgroundGradient: ['#E0F2F1', '#B2DFDB'],
    text: '#003D33',
    subtitleBg: 'rgba(0, 105, 92, 0.90)',
    fontFamily: "'Noto Sans JP', sans-serif",
  },
};
