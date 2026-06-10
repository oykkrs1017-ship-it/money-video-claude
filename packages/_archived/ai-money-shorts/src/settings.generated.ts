// このファイルは自動生成されます
// 編集する場合は video-settings.yaml を編集してください
// npm run sync-settings で再生成されます

export const SETTINGS = {
  "video": {
    "width": 1080,
    "height": 1920,
    "fps": 30
  },
  "font": {
    "family": "Noto Sans JP",
    "numberFamily": "Montserrat",
    "headingSize": 52,
    "bodySize": 40,
    "weight": "900",
    "color": "#ffffff"
  },
  "subtitle": {
    "bottomOffset": 430,
    "maxWidthPercent": 88,
    "fontSize": 40,
    "fontWeight": "700",
    "lineHeight": 1.4
  },
  /** YouTube Shorts セーフティゾーン（1080x1920） */
  "safeZone": {
    "top": 205,
    "bottom": 393,
    "left": 50,
    "right": 50,
    "commentUiRight": 186,
    "commentUiHeight": 1020
  },
  "character": {
    "height": 600,
    "useImages": true,
    "imagesBasePath": "images"
  },
  "colors": {
    "primaryBg": "#0A0E27",
    "secondaryBg": "#1A1F3A",
    "accentGold": "#FFD700",
    "accentCyan": "#00E5FF",
    "textWhite": "#FFFFFF",
    "textGray": "#B0B8D1"
  }
} as const;

export type VideoSettings = typeof SETTINGS;

export const CHARACTER_CONFIGS = {
  pon: {
    id: 'pon' as const,
    name: 'ポンちゃん',
    role: '解説役',
    voicevoxSpeakerId: 2,
    defaultSpeedScale: 1.15,
    defaultPitchScale: 0.0,
    color: '#4CAF50',
    position: 'left' as const,
    expressions: ['normal', 'happy', 'surprised', 'thinking', 'angry', 'smug'] as const,
  },
  maro: {
    id: 'maro' as const,
    name: 'まろくん',
    role: '質問役',
    voicevoxSpeakerId: 3,
    defaultSpeedScale: 1.10,
    defaultPitchScale: 0.0,
    color: '#E91E63',
    position: 'right' as const,
    expressions: ['normal', 'happy', 'surprised', 'thinking', 'sad', 'excited'] as const,
  },
} as const;

export type CharacterID = keyof typeof CHARACTER_CONFIGS;
export type CharacterConfig = (typeof CHARACTER_CONFIGS)[CharacterID];
