'use strict';
/**
 * render-engine.js — pptxgenjs ベースのスライドレンダリングエンジン
 * 各レイアウトは registerLayout() で登録し、renderDeck() で PPTX を生成する
 */

const PptxGenJS = require('pptxgenjs');
const {
  COLORS, FONTS, LAYOUT, CHART_COLORS,
  PageCounter,
  addCoverSlide, addSectionSlide, addContentSlide, addEndingSlide,
  hCell, lCell, dCell,
  defaultBarConfig, defaultDoughnutConfig,
  topBorderCard,
} = require('./shared');

// ─── レイアウトレジストリ ─────────────────────────────────────────────────────
const LAYOUTS = {};

function registerLayout(name, fn) {
  LAYOUTS[name] = fn;
}

// ─── コアエンジン ─────────────────────────────────────────────────────────────

/**
 * デッキ定義から PPTX を生成して保存する
 * @param {object} deck
 * @param {string} deck.title
 * @param {string} deck.subtitle
 * @param {string} [deck.version]
 * @param {Array<object>} deck.slides
 * @param {string} outPath
 */
async function renderDeck(deck, outPath) {
  const pres = new PptxGenJS();
  pres.layout = 'LAYOUT_WIDE'; // 16:9 (10 x 5.625 inch)
  pres.author  = 'AutoDeck';
  pres.subject = deck.title;
  pres.title   = deck.title;

  const pc = new PageCounter();

  // カバースライド
  addCoverSlide(pres, {
    title:      deck.title,
    subtitle:   deck.subtitle,
    version:    deck.version,
  });

  for (const slideDef of deck.slides) {
    const { layout, section, data } = slideDef;

    // セクション区切り（sectionStart フラグ）
    if (slideDef.sectionStart) {
      addSectionSlide(pres, section || '', { subtitle: slideDef.sectionSubtitle });
    }

    // コンテンツスライド生成
    if (layout && LAYOUTS[layout]) {
      const slide = addContentSlide(pres, section, pc.next());
      LAYOUTS[layout](slide, pres, data, pc.current);
    } else if (layout) {
      console.warn(`[render-engine] 未登録レイアウト: ${layout}`);
    }
  }

  // エンディングスライド
  if (deck.ending) {
    addEndingSlide(pres, deck.ending);
  }

  await pres.writeFile({ fileName: outPath });
  console.log(`[render-engine] 出力完了: ${outPath}`);
}

// ─── ヘルパー関数 ─────────────────────────────────────────────────────────────

const CONTENT_Y    = 1.05; // コンテンツ開始Y（ヘッダー下）
const CONTENT_H    = 4.4;  // コンテンツ高さ
const SLIDE_W      = 10;
const SLIDE_H      = 5.625;
const MARGIN       = 0.3;
const CONTENT_X    = 0.25;
const CONTENT_W    = 9.5;

function addSlideTitle(slide, title) {
  slide.addText(title || '', {
    x: 0.25, y: 0.1, w: 9.0, h: 0.75,
    fontSize: 20, fontFace: FONTS.heading,
    color: COLORS.headerDark, bold: true,
    valign: 'middle',
  });
}

// ─── レイアウト実装 ───────────────────────────────────────────────────────────

// ① kpi-three-col: 3カラムKPIカード
registerLayout('kpi-three-col', (slide, pres, data) => {
  addSlideTitle(slide, data.title);
  const cards = (data.cards || []).slice(0, 3);
  cards.forEach((card, i) => {
    const x = CONTENT_X + i * (CONTENT_W / 3);
    const w = CONTENT_W / 3 - 0.15;
    const y = CONTENT_Y + 0.1;
    const h = CONTENT_H - 0.1;

    topBorderCard(slide, pres, { x, y, w, h, borderColor: card.color || COLORS.brandAccent });

    // KPI値
    slide.addText(card.value || '', {
      x: x + 0.15, y: y + 0.45, w: w - 0.3, h: 1.0,
      fontSize: 36, fontFace: FONTS.heading,
      color: card.color || COLORS.brandAccent,
      bold: true, align: 'center',
    });

    // ラベル
    slide.addText(card.label || '', {
      x: x + 0.15, y: y + 1.5, w: w - 0.3, h: 0.5,
      fontSize: 12, fontFace: FONTS.body,
      color: COLORS.textMuted, align: 'center',
    });

    // 説明
    if (card.description) {
      slide.addText(card.description, {
        x: x + 0.15, y: y + 2.1, w: w - 0.3, h: 1.8,
        fontSize: 10, fontFace: FONTS.body,
        color: COLORS.textDark, align: 'left',
        bullet: false,
      });
    }
  });
});

// ② two-col-text-chart: 左テキスト＋右チャート
registerLayout('two-col-text-chart', (slide, pres, data) => {
  addSlideTitle(slide, data.title);
  const leftW = 4.0;
  const rightW = 5.2;
  const rightX = CONTENT_X + leftW + 0.3;

  // 左テキスト
  if (data.points && data.points.length > 0) {
    const rows = data.points.map((p, i) => ([
      lCell(`${i + 1}`, { w: 0.4 }),
      dCell(p),
    ]));
    slide.addTable(rows, {
      x: CONTENT_X, y: CONTENT_Y + 0.1, w: leftW, h: CONTENT_H - 0.2,
      rowH: (CONTENT_H - 0.2) / rows.length,
      border: { type: 'none' },
      colW: [0.4, leftW - 0.4],
    });
  }

  // 縦区切り線
  slide.addShape(pres.shapes.LINE, {
    x: CONTENT_X + leftW + 0.1, y: CONTENT_Y, w: 0, h: CONTENT_H,
    line: { color: COLORS.divider, width: 0.5 },
  });

  // 右チャート
  if (data.chart) {
    _renderChart(slide, pres, data.chart, {
      x: rightX, y: CONTENT_Y + 0.1, w: rightW, h: CONTENT_H - 0.2,
    });
  }
});

// ③ comparison-table: 比較テーブル
registerLayout('comparison-table', (slide, pres, data) => {
  addSlideTitle(slide, data.title);
  const cols = data.columns || [];
  const rows = data.rows || [];
  if (!cols.length || !rows.length) return;

  const headerRow = [lCell(''), ...cols.map(c => hCell(c))];
  const dataRows = rows.map(row => [
    lCell(row.label || ''),
    ...cols.map((_c, ci) => dCell(row.values ? row.values[ci] : '')),
  ]);

  const colW = [1.6, ...Array(cols.length).fill((CONTENT_W - 1.6) / cols.length)];
  slide.addTable([headerRow, ...dataRows], {
    x: CONTENT_X, y: CONTENT_Y + 0.1,
    w: CONTENT_W, h: CONTENT_H - 0.2,
    rowH: 0.5,
    border: { pt: 0.5, color: COLORS.lightGray },
    colW,
  });
});

// ④ timeline: タイムライン
registerLayout('timeline', (slide, pres, data) => {
  addSlideTitle(slide, data.title);
  const items = (data.items || []).slice(0, 6);
  const itemW = CONTENT_W / Math.max(items.length, 1);

  // 中央横線
  slide.addShape(pres.shapes.LINE, {
    x: CONTENT_X, y: CONTENT_Y + 1.2, w: CONTENT_W, h: 0,
    line: { color: COLORS.brandAccent, width: 2 },
  });

  items.forEach((item, i) => {
    const cx = CONTENT_X + i * itemW + itemW / 2;

    // ドット
    slide.addShape(pres.shapes.OVAL, {
      x: cx - 0.15, y: CONTENT_Y + 1.05, w: 0.3, h: 0.3,
      fill: { color: item.accent ? COLORS.accentRed : COLORS.brandAccent },
      line: { color: COLORS.white, width: 1 },
    });

    // 日付（上）
    slide.addText(item.date || '', {
      x: cx - itemW / 2 + 0.05, y: CONTENT_Y + 0.1,
      w: itemW - 0.1, h: 0.6,
      fontSize: 10, fontFace: FONTS.caption,
      color: COLORS.textMuted, align: 'center', bold: item.accent,
    });

    // 内容（下）
    slide.addText(item.label || '', {
      x: cx - itemW / 2 + 0.05, y: CONTENT_Y + 1.5,
      w: itemW - 0.1, h: 1.0,
      fontSize: 10, fontFace: FONTS.body,
      color: COLORS.textDark, align: 'center',
    });

    // 説明（さらに下）
    if (item.description) {
      slide.addText(item.description, {
        x: cx - itemW / 2 + 0.05, y: CONTENT_Y + 2.5,
        w: itemW - 0.1, h: 1.8,
        fontSize: 9, fontFace: FONTS.body,
        color: COLORS.textMuted, align: 'center',
      });
    }
  });
});

// ⑤ text-data-emphasis: 大きな数値＋説明
registerLayout('text-data-emphasis', (slide, pres, data) => {
  addSlideTitle(slide, data.title);
  const stats = (data.stats || []).slice(0, 4);
  const n = stats.length;
  const colW = CONTENT_W / Math.max(n, 1);

  stats.forEach((s, i) => {
    const x = CONTENT_X + i * colW;
    const y = CONTENT_Y + 0.5;

    // 値（大文字）
    slide.addText(s.value || '', {
      x, y, w: colW - 0.1, h: 1.4,
      fontSize: 44, fontFace: FONTS.heading,
      color: s.color || COLORS.brandAccent,
      bold: true, align: 'center',
    });

    // ユニット
    if (s.unit) {
      slide.addText(s.unit, {
        x, y: y + 1.45, w: colW - 0.1, h: 0.4,
        fontSize: 11, fontFace: FONTS.caption,
        color: COLORS.textMuted, align: 'center',
      });
    }

    // ラベル
    slide.addText(s.label || '', {
      x, y: y + 1.95, w: colW - 0.1, h: 0.5,
      fontSize: 12, fontFace: FONTS.body,
      color: COLORS.textDark, align: 'center', bold: true,
    });

    // 説明
    if (s.description) {
      slide.addText(s.description, {
        x: x + 0.1, y: y + 2.55, w: colW - 0.2, h: 1.2,
        fontSize: 9, fontFace: FONTS.body,
        color: COLORS.textMuted, align: 'center',
      });
    }
  });
});

// ⑥ pricing-table: 多列比較テーブル（機能比較）
registerLayout('pricing-table', (slide, pres, data) => {
  addSlideTitle(slide, data.title);
  const cols = data.columns || [];
  const rows = data.rows || [];
  if (!cols.length || !rows.length) return;

  const featW = 2.5;
  const colW = (CONTENT_W - featW) / Math.max(cols.length, 1);

  const header = [hCell(data.featureLabel || '項目'), ...cols.map(c => hCell(c))];
  const tableRows = rows.map(row => [
    lCell(row.feature || '', { fontSize: 9 }),
    ...cols.map((_c, ci) => {
      const v = row.values ? row.values[ci] : '';
      const isCheck = v === true || v === 'yes' || v === 'o' || v === '○';
      const isCross = v === false || v === 'no' || v === 'x' || v === '×';
      return dCell(
        isCheck ? '○' : isCross ? '×' : (v || ''),
        {
          align: 'center',
          color: isCheck ? COLORS.greenAccent : isCross ? COLORS.accentRed : COLORS.textBlack,
        }
      );
    }),
  ]);

  slide.addTable([header, ...tableRows], {
    x: CONTENT_X, y: CONTENT_Y + 0.1,
    w: CONTENT_W, h: CONTENT_H - 0.2,
    rowH: Math.min(0.6, (CONTENT_H - 0.2) / (tableRows.length + 1)),
    border: { pt: 0.5, color: COLORS.lightGray },
    colW: [featW, ...Array(cols.length).fill(colW)],
  });
});

// ⑦ step-flow: ステップフロー
registerLayout('step-flow', (slide, pres, data) => {
  addSlideTitle(slide, data.title);
  const steps = (data.steps || []).slice(0, 5);
  const n = steps.length;
  const stepW = (CONTENT_W - 0.4) / n;

  steps.forEach((step, i) => {
    const x = CONTENT_X + i * stepW;
    const boxX = x + 0.05;
    const boxY = CONTENT_Y + 0.8;
    const boxW = stepW - 0.2;
    const boxH = CONTENT_H - 1.5;

    // カード背景
    topBorderCard(slide, pres, {
      x: boxX, y: boxY, w: boxW, h: boxH,
      borderColor: step.color || COLORS.brandAccent,
    });

    // 番号サークル
    slide.addShape(pres.shapes.OVAL, {
      x: boxX + boxW / 2 - 0.25, y: boxY - 0.3, w: 0.5, h: 0.5,
      fill: { color: step.color || COLORS.brandAccent },
      line: { color: COLORS.white, width: 1 },
    });
    slide.addText(String(i + 1), {
      x: boxX + boxW / 2 - 0.25, y: boxY - 0.3, w: 0.5, h: 0.5,
      fontSize: 12, fontFace: FONTS.heading,
      color: COLORS.white, bold: true, align: 'center', valign: 'middle',
    });

    // ステップタイトル
    slide.addText(step.title || '', {
      x: boxX + 0.1, y: boxY + 0.25, w: boxW - 0.2, h: 0.55,
      fontSize: 11, fontFace: FONTS.heading,
      color: COLORS.headerDark, bold: true, align: 'center',
    });

    // ステップ説明
    if (step.description) {
      slide.addText(step.description, {
        x: boxX + 0.1, y: boxY + 0.85, w: boxW - 0.2, h: boxH - 1.05,
        fontSize: 9, fontFace: FONTS.body,
        color: COLORS.textDark, align: 'left',
      });
    }

    // 矢印
    if (i < n - 1) {
      slide.addShape(pres.shapes.LINE, {
        x: x + stepW - 0.1, y: boxY + boxH / 2, w: 0.15, h: 0,
        line: { color: COLORS.brandAccent, width: 1.5 },
      });
    }
  });
});

// ⑧ three-column: 3カラムテキスト
registerLayout('three-column', (slide, pres, data) => {
  addSlideTitle(slide, data.title);
  const cols = (data.columns || []).slice(0, 3);
  const colW = LAYOUT.threeCol.colWidth;

  cols.forEach((col, i) => {
    const x = LAYOUT.threeCol.colX(i);
    const y = CONTENT_Y + 0.1;
    const h = CONTENT_H - 0.1;

    // ヘッダーバー
    slide.addShape(pres.shapes.RECTANGLE, {
      x, y, w: colW, h: 0.45,
      fill: { color: col.color || COLORS.headerDark },
    });
    slide.addText(col.title || '', {
      x: x + 0.1, y, w: colW - 0.2, h: 0.45,
      fontSize: 12, fontFace: FONTS.heading,
      color: COLORS.white, bold: true, valign: 'middle',
    });

    // コンテンツ
    if (col.points && col.points.length) {
      const pts = col.points.map(p => ({ text: p, options: { bullet: true } }));
      slide.addText(pts, {
        x: x + 0.1, y: y + 0.55, w: colW - 0.2, h: h - 0.65,
        fontSize: 10, fontFace: FONTS.body,
        color: COLORS.textDark,
      });
    } else if (col.content) {
      slide.addText(col.content, {
        x: x + 0.1, y: y + 0.55, w: colW - 0.2, h: h - 0.65,
        fontSize: 10, fontFace: FONTS.body,
        color: COLORS.textDark,
      });
    }
  });
});

// ⑨ numbered-feature-cards: 番号付き特徴カード（2列）
registerLayout('numbered-feature-cards', (slide, pres, data) => {
  addSlideTitle(slide, data.title);
  const cards = (data.cards || []).slice(0, 6);
  const perRow = 2;
  const rows = Math.ceil(cards.length / perRow);
  const cardW = (CONTENT_W - 0.2) / perRow;
  const cardH = (CONTENT_H - 0.2) / rows;

  cards.forEach((card, i) => {
    const col = i % perRow;
    const row = Math.floor(i / perRow);
    const x = CONTENT_X + col * (cardW + 0.1);
    const y = CONTENT_Y + 0.1 + row * cardH;

    // カード背景（薄い）
    slide.addShape(pres.shapes.ROUNDED_RECTANGLE, {
      x, y, w: cardW - 0.05, h: cardH - 0.1,
      fill: { color: COLORS.offWhite },
      rectRadius: 0.05,
      line: { color: COLORS.lightGray, width: 0.5 },
    });

    // 番号サークル
    const circleR = 0.28;
    slide.addShape(pres.shapes.OVAL, {
      x: x + 0.15, y: y + cardH / 2 - circleR, w: circleR * 2, h: circleR * 2,
      fill: { color: card.color || COLORS.brandAccent },
    });
    slide.addText(String(i + 1), {
      x: x + 0.15, y: y + cardH / 2 - circleR, w: circleR * 2, h: circleR * 2,
      fontSize: 13, fontFace: FONTS.heading,
      color: COLORS.white, bold: true, align: 'center', valign: 'middle',
    });

    // タイトル
    slide.addText(card.title || '', {
      x: x + 0.75, y: y + 0.08, w: cardW - 0.85, h: 0.45,
      fontSize: 11, fontFace: FONTS.heading,
      color: COLORS.headerDark, bold: true,
    });

    // 説明
    if (card.description) {
      slide.addText(card.description, {
        x: x + 0.75, y: y + 0.53, w: cardW - 0.85, h: cardH - 0.65,
        fontSize: 9, fontFace: FONTS.body,
        color: COLORS.textDark,
      });
    }
  });
});

// ⑩ rich-panel-list: リスト形式（縞模様）
registerLayout('rich-panel-list', (slide, pres, data) => {
  addSlideTitle(slide, data.title);
  const items = (data.items || []).slice(0, 8);
  const rowH = Math.min(0.65, (CONTENT_H - 0.1) / Math.max(items.length, 1));

  items.forEach((item, i) => {
    const y = CONTENT_Y + 0.05 + i * rowH;

    if (i % 2 === 0) {
      slide.addShape(pres.shapes.RECTANGLE, {
        x: CONTENT_X, y, w: CONTENT_W, h: rowH - 0.03,
        fill: { color: COLORS.offWhite },
        line: { type: 'none' },
      });
    }

    // 左アクセントライン
    slide.addShape(pres.shapes.RECTANGLE, {
      x: CONTENT_X + 0.02, y: y + 0.05, w: 0.04, h: rowH - 0.13,
      fill: { color: item.color || COLORS.brandAccent },
    });

    // テキスト
    slide.addText(item.text || item || '', {
      x: CONTENT_X + 0.15, y: y + 0.04, w: CONTENT_W - 0.25, h: rowH - 0.1,
      fontSize: 11, fontFace: FONTS.body,
      color: COLORS.textDark, valign: 'middle',
    });
  });
});

// ⑪ before-after-split: ビフォーアフター
registerLayout('before-after-split', (slide, pres, data) => {
  addSlideTitle(slide, data.title);
  const halfW = CONTENT_W / 2 - 0.1;
  const y = CONTENT_Y + 0.05;
  const h = CONTENT_H - 0.05;

  const panels = [
    { side: data.before, color: COLORS.accentRed,   label: data.beforeLabel || 'Before', x: CONTENT_X },
    { side: data.after,  color: COLORS.greenAccent,  label: data.afterLabel  || 'After',  x: CONTENT_X + halfW + 0.2 },
  ];

  panels.forEach(panel => {
    // ヘッダー
    slide.addShape(pres.shapes.RECTANGLE, {
      x: panel.x, y, w: halfW, h: 0.4,
      fill: { color: panel.color },
    });
    slide.addText(panel.label, {
      x: panel.x + 0.1, y, w: halfW - 0.2, h: 0.4,
      fontSize: 13, fontFace: FONTS.heading,
      color: COLORS.white, bold: true, valign: 'middle',
    });

    // コンテンツ
    slide.addShape(pres.shapes.RECTANGLE, {
      x: panel.x, y: y + 0.4, w: halfW, h: h - 0.4,
      fill: { color: COLORS.offWhite },
      line: { color: COLORS.lightGray, width: 0.5 },
    });

    if (panel.side && panel.side.points) {
      const pts = panel.side.points.map(p => ({ text: p, options: { bullet: true } }));
      slide.addText(pts, {
        x: panel.x + 0.15, y: y + 0.55, w: halfW - 0.3, h: h - 0.65,
        fontSize: 10, fontFace: FONTS.body,
        color: COLORS.textDark,
      });
    } else if (panel.side && typeof panel.side === 'string') {
      slide.addText(panel.side, {
        x: panel.x + 0.15, y: y + 0.55, w: halfW - 0.3, h: h - 0.65,
        fontSize: 10, fontFace: FONTS.body,
        color: COLORS.textDark,
      });
    }
  });

  // 中央矢印
  slide.addShape(pres.shapes.LINE, {
    x: CONTENT_X + halfW + 0.03, y: y + h / 2, w: 0.14, h: 0,
    line: { color: COLORS.brandAccent, width: 2 },
  });
});

// ⑫ bar-chart-full: フル幅棒グラフ
registerLayout('bar-chart-full', (slide, pres, data) => {
  addSlideTitle(slide, data.title);

  if (!data.chart) return;
  _renderChart(slide, pres, data.chart, {
    x: CONTENT_X, y: CONTENT_Y + 0.1, w: CONTENT_W, h: CONTENT_H - 0.2,
  });

  // 注記
  if (data.note) {
    slide.addText(data.note, {
      x: CONTENT_X, y: CONTENT_Y + CONTENT_H - 0.05, w: CONTENT_W, h: 0.25,
      fontSize: 8, fontFace: FONTS.caption,
      color: COLORS.textMuted,
    });
  }
});

// ⑬ horizontal-bar-ranking: 横棒ランキング
registerLayout('horizontal-bar-ranking', (slide, pres, data) => {
  addSlideTitle(slide, data.title);
  const items = (data.items || []).slice(0, 7);
  const maxVal = Math.max(...items.map(it => it.value || 0), 1);
  const barAreaX = CONTENT_X + 2.5;
  const barAreaW = CONTENT_W - 3.2;
  const rowH = (CONTENT_H - 0.2) / Math.max(items.length, 1);

  items.forEach((item, i) => {
    const y = CONTENT_Y + 0.1 + i * rowH;
    const barW = (item.value / maxVal) * barAreaW;
    const accent = i === 0 ? COLORS.brandAccent : (i < 3 ? COLORS.brandBlue : COLORS.lightGray);

    // ラベル
    slide.addText(item.label || '', {
      x: CONTENT_X, y: y + rowH * 0.15, w: 2.4, h: rowH * 0.7,
      fontSize: 10, fontFace: FONTS.body,
      color: COLORS.textDark, align: 'right', valign: 'middle',
    });

    // バー
    slide.addShape(pres.shapes.RECTANGLE, {
      x: barAreaX, y: y + rowH * 0.2, w: Math.max(barW, 0.05), h: rowH * 0.6,
      fill: { color: accent },
    });

    // 値ラベル
    slide.addText(String(item.value) + (data.unit || ''), {
      x: barAreaX + barW + 0.05, y: y + rowH * 0.15, w: 0.6, h: rowH * 0.7,
      fontSize: 10, fontFace: FONTS.body,
      color: COLORS.textDark, valign: 'middle',
    });
  });
});

// ⑭ radial-spread: 放射状スプレッド（中心テーマ＋周辺要素）
registerLayout('radial-spread', (slide, pres, data) => {
  addSlideTitle(slide, data.title);
  const items = (data.items || []).slice(0, 6);
  const cx = SLIDE_W / 2;
  const cy = CONTENT_Y + CONTENT_H / 2;
  const r = 1.7; // 放射半径

  // 中心円
  slide.addShape(pres.shapes.OVAL, {
    x: cx - 0.8, y: cy - 0.45, w: 1.6, h: 0.9,
    fill: { color: COLORS.headerDark },
    line: { color: COLORS.brandAccent, width: 2 },
  });
  slide.addText(data.center || '', {
    x: cx - 0.8, y: cy - 0.45, w: 1.6, h: 0.9,
    fontSize: 11, fontFace: FONTS.heading,
    color: COLORS.white, bold: true, align: 'center', valign: 'middle',
  });

  items.forEach((item, i) => {
    const angle = (i / items.length) * 2 * Math.PI - Math.PI / 2;
    const ix = cx + r * Math.cos(angle);
    const iy = cy + r * Math.sin(angle);
    const bw = 1.8;
    const bh = 0.7;

    // 接続線
    slide.addShape(pres.shapes.LINE, {
      x: cx, y: cy, w: ix - cx, h: iy - cy,
      line: { color: COLORS.divider, width: 0.75 },
    });

    // アイテムカード
    slide.addShape(pres.shapes.ROUNDED_RECTANGLE, {
      x: ix - bw / 2, y: iy - bh / 2, w: bw, h: bh,
      fill: { color: item.color || COLORS.lightBlue },
      rectRadius: 0.06,
      line: { color: COLORS.brandBlue, width: 0.5 },
    });
    slide.addText(item.label || '', {
      x: ix - bw / 2, y: iy - bh / 2, w: bw, h: bh,
      fontSize: 10, fontFace: FONTS.body,
      color: COLORS.headerDark, bold: true, align: 'center', valign: 'middle',
    });
  });
});

// ─── チャートレンダリングヘルパー ─────────────────────────────────────────────

function _renderChart(slide, pres, chartDef, pos) {
  const { x, y, w, h } = pos;
  const type = chartDef.type || 'bar';

  // カテゴリ名は英数字/ASCII のみに正規化（日本語はpptxgenjs でエンコード問題）
  // → data.categories をそのまま使い、別途ラベルをテキストボックスで描画
  const cats = chartDef.categories || [];
  const series = (chartDef.series || []).map((s, si) => ({
    name: `S${si + 1}`,
    labels: cats,
    values: s.values || [],
  }));

  if (type === 'bar' || type === 'col') {
    slide.addChart(pres.charts.BAR, series, {
      ...defaultBarConfig({ barDir: type === 'bar' ? 'bar' : 'col' }),
      x, y, w, h,
    });
  } else if (type === 'doughnut') {
    slide.addChart(pres.charts.DOUGHNUT, series, {
      ...defaultDoughnutConfig(),
      x, y, w, h,
    });
  } else if (type === 'pie') {
    slide.addChart(pres.charts.PIE, series, {
      ...defaultDoughnutConfig({ holeSize: 0 }),
      x, y, w, h,
    });
  } else if (type === 'line') {
    slide.addChart(pres.charts.LINE, series, {
      ...defaultBarConfig({ barDir: 'col' }),
      x, y, w, h,
    });
  }
}

// ─── エクスポート ─────────────────────────────────────────────────────────────
module.exports = {
  renderDeck,
  registerLayout,
  LAYOUTS,
};
