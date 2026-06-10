/**
 * z-index 定数
 * 全コンポーネントでこの値を参照することで重なり順を明示的に管理する
 */
export const Z = {
  BACKGROUND:   0,
  VISUAL_LAYER: 10,
  CHARACTER:    20,
  TELOP:        30,
  PROGRESS_BAR: 35,
  CTA:          40,
  TITLE_HERO:   45,  // イントロ中央タイトル（HOOK_SPLASH より前面）
  HOOK_SPLASH:  50,
  TITLE_HEADER: 60,  // 上部固定ヘッダータイトル（常時表示）
} as const;

export type ZLayer = (typeof Z)[keyof typeof Z];
