'use strict';
/**
 * shared.js — ブランドシステム / スライドファクトリー / テーブルヘルパー
 * render-engine.js から require('./shared') で使用される
 */

const fs   = require('fs');
const path = require('path');

// ─── ブランドカラー（pptxgenjs: # なし 6桁 hex） ────────────────────────────
const COLORS = {
  // ブランド
  brandSkyBlue:   '1B3A6B',  // Royal Blue (プライマリ)
  brandBlue:      '3D6098',  // Blue2
  brandAccent:    '1B3A6B',  // アクセント
  brandPurple:    '5C4B8A',  // ベン図など補助用
  // UI
  headerDark:     '0B1F3F',  // Deep Navy (見出し背景)
  textDark:       '1A1A1A',
  textBlack:      '333333',
  textMuted:      '888888',
  white:          'FFFFFF',
  offWhite:       'F5F7FA',
  lightBlue:      'E8EFF8',
  lightGray:      'D8D8D8',
  divider:        'D0D0D0',
  tableLabelGray: '546E7A',
  greenAccent:    '2E7D32',
  // アクセントレッド
  accentRed:      'C8102E',
};

// ─── フォント ────────────────────────────────────────────────────────────────
const FONTS = {
  heading: 'Yu Gothic',
  body:    'Yu Gothic',
  accent:  'Yu Gothic',
  caption: 'Yu Gothic',
};

// ─── レイアウト定数 ───────────────────────────────────────────────────────────
const LAYOUT = {
  threeCol: {
    colWidth: 2.9,
    colX: (i) => 0.3 + i * (2.9 + 0.3),
  },
};

// ─── チャートカラーパレット ───────────────────────────────────────────────────
const CHART_COLORS = {
  sequence: ['0B1F3F', '1B3A6B', '3D6098', '7A9CC6', 'B8CCE4', 'C8102E'],
};

// ─── ページカウンター ─────────────────────────────────────────────────────────
class PageCounter {
  constructor() { this._n = 0; }
  next()          { return ++this._n; }
  get current()   { return this._n; }
}

// ─── アセットパスヘルパー ─────────────────────────────────────────────────────
function assetPath(relPath) {
  return path.join(__dirname, '..', relPath);
}
function assetPathIfExists(relPath) {
  const p = assetPath(relPath);
  return fs.existsSync(p) ? p : null;
}

// ─── スライドファクトリー ─────────────────────────────────────────────────────

/** カバースライド */
function addCoverSlide(pres, { title, subtitle, catchphrase, version } = {}) {
  const slide = pres.addSlide();
  slide.background = { color: COLORS.headerDark };

  // 左ネイビーバー
  slide.addShape(pres.shapes.RECTANGLE, {
    x: 0, y: 0, w: 0.1, h: 5.625,
    fill: { color: COLORS.brandSkyBlue },
  });

  // アクセントライン
  slide.addShape(pres.shapes.LINE, {
    x: 0.4, y: 2.9, w: 2.0, h: 0,
    line: { color: COLORS.brandSkyBlue, width: 3 },
  });

  // メインタイトル
  slide.addText(title || '', {
    x: 0.4, y: 1.2, w: 9.0, h: 1.6,
    fontSize: 34, fontFace: FONTS.heading,
    color: COLORS.white, bold: true,
    lineSpacingMultiple: 1.35, valign: 'bottom',
  });

  // サブタイトル
  if (subtitle || catchphrase) {
    slide.addText(subtitle || catchphrase, {
      x: 0.4, y: 3.1, w: 8.0, h: 0.7,
      fontSize: 15, fontFace: FONTS.body,
      color: 'B8CCE4',
    });
  }

  // バージョン
  if (version) {
    slide.addText(version, {
      x: 0.4, y: 5.1, w: 4.0, h: 0.3,
      fontSize: 9, fontFace: FONTS.caption,
      color: COLORS.textMuted,
    });
  }

  return slide;
}

/** セクション区切りスライド */
function addSectionSlide(pres, title, { subtitle } = {}) {
  const slide = pres.addSlide();
  slide.background = { color: COLORS.white };

  slide.addShape(pres.shapes.RECTANGLE, {
    x: 0, y: 0, w: 0.1, h: 5.625,
    fill: { color: COLORS.headerDark },
  });
  slide.addShape(pres.shapes.LINE, {
    x: 0.4, y: 2.05, w: 1.8, h: 0,
    line: { color: COLORS.brandSkyBlue, width: 3 },
  });
  slide.addText(title || '', {
    x: 0.4, y: 2.2, w: 9.0, h: 1.6,
    fontSize: 30, fontFace: FONTS.heading,
    color: COLORS.headerDark, bold: true,
    lineSpacingMultiple: 1.3,
  });
  if (subtitle) {
    slide.addText(subtitle, {
      x: 0.4, y: 3.9, w: 9.0, h: 0.5,
      fontSize: 13, fontFace: FONTS.body,
      color: COLORS.textMuted,
    });
  }
  return slide;
}

/** コンテンツスライドのベース（タイトルはrenderContentが追加） */
function addContentSlide(pres, sectionName, _pageNum, _opts = {}) {
  const slide = pres.addSlide();
  slide.background = { color: COLORS.white };

  // 左ネイビーバー
  slide.addShape(pres.shapes.RECTANGLE, {
    x: 0, y: 0, w: 0.1, h: 5.625,
    fill: { color: COLORS.headerDark },
  });

  // セクション名（上部小テキスト）
  if (sectionName) {
    slide.addText(sectionName, {
      x: 0.25, y: 0.07, w: 7.0, h: 0.28,
      fontSize: 8, fontFace: FONTS.caption,
      color: COLORS.textMuted,
    });
  }

  // ヘッダー下区切り線
  slide.addShape(pres.shapes.LINE, {
    x: 0.25, y: 0.95, w: 9.5, h: 0,
    line: { color: COLORS.divider, width: 0.5 },
  });

  return slide;
}

/** エンディングスライド */
function addEndingSlide(pres, def = {}) {
  const slide = pres.addSlide();
  slide.background = { color: COLORS.headerDark };

  slide.addShape(pres.shapes.RECTANGLE, {
    x: 0, y: 0, w: 0.1, h: 5.625,
    fill: { color: COLORS.brandSkyBlue },
  });
  slide.addText(def.title || 'まとめ', {
    x: 0.5, y: 1.8, w: 9.0, h: 1.2,
    fontSize: 36, fontFace: FONTS.heading,
    color: COLORS.white, bold: true, align: 'center',
  });
  if (def.subtitle) {
    slide.addText(def.subtitle, {
      x: 0.5, y: 3.2, w: 9.0, h: 0.6,
      fontSize: 14, fontFace: FONTS.body,
      color: 'B8CCE4', align: 'center',
    });
  }
  return slide;
}

// ─── テーブルセルヘルパー ─────────────────────────────────────────────────────

function hCell(text, extra = {}) {
  return {
    text,
    options: {
      bold: true, fontSize: 11, fontFace: FONTS.body,
      color: COLORS.white,
      fill: { color: COLORS.headerDark },
      align: 'center', valign: 'middle',
      ...extra,
    },
  };
}

function lCell(text, extra = {}) {
  return {
    text: text ?? '',
    options: {
      bold: true, fontSize: 10, fontFace: FONTS.body,
      color: COLORS.white,
      fill: { color: COLORS.tableLabelGray },
      valign: 'middle',
      ...extra,
    },
  };
}

function dCell(text, extra = {}) {
  return {
    text: text ?? '',
    options: {
      fontSize: 10, fontFace: FONTS.body,
      color: COLORS.textBlack, valign: 'middle',
      ...extra,
    },
  };
}

// ─── チャート設定ヘルパー ─────────────────────────────────────────────────────

function defaultBarConfig(overrides = {}) {
  return {
    barDir: 'col',
    barGrouping: 'clustered',
    chartColors: CHART_COLORS.sequence,
    showValue: true,
    valueFontSize: 9,
    valueFontFace: FONTS.body,
    catAxisLabelFontSize: 9,
    catAxisLabelFontFace: FONTS.body,
    catAxisLabelColor: COLORS.textBlack,
    valAxisLabelFontSize: 8,
    valAxisLabelColor: COLORS.textMuted,
    catGridLine: { style: 'none' },
    valGridLine: { color: COLORS.divider, width: 0.5 },
    showLegend: false,
    ...overrides,
  };
}

function defaultDoughnutConfig(overrides = {}) {
  return {
    holeSize: 55,
    chartColors: CHART_COLORS.sequence,
    showValue: true,
    valueFontSize: 9,
    valueFontFace: FONTS.body,
    showLegend: true,
    legendFontSize: 9,
    legendFontFace: FONTS.body,
    legendPos: 'b',
    ...overrides,
  };
}

/** カード上端アクセントボーダー */
function topBorderCard(slide, pres, { x, y, w, h, borderColor }) {
  slide.addShape(pres.shapes.ROUNDED_RECTANGLE, {
    x, y, w, h,
    fill: { color: COLORS.offWhite },
    rectRadius: 0.06,
    line: { color: COLORS.divider, width: 0.5 },
  });
  slide.addShape(pres.shapes.RECTANGLE, {
    x, y, w, h: 0.07,
    fill: { color: borderColor || COLORS.brandAccent },
  });
}

// ─── エクスポート ─────────────────────────────────────────────────────────────
module.exports = {
  COLORS,
  FONTS,
  LAYOUT,
  CHART_COLORS,
  PageCounter,
  assetPath,
  assetPathIfExists,
  addCoverSlide,
  addSectionSlide,
  addContentSlide,
  addEndingSlide,
  hCell,
  lCell,
  dCell,
  defaultBarConfig,
  defaultDoughnutConfig,
  topBorderCard,
};
