/**
 * generate-pptx.ts
 * script-input.json からリッチな PPTX プレゼンテーションを生成するスクリプト
 *
 * 使い方:
 *   npm run pptx:generate [-- --input ./input/script-input.json --output ./out/slides.pptx]
 *
 * ビジュアル対応:
 *   stat, chart (line/bar), rich-panel, timeline, comparison-table, flow-chart
 */

import * as fs from 'fs';
import * as path from 'path';
import PptxGenJS from 'pptxgenjs';
import { ScriptInput } from '../src/utils/types';

// ─── 設定 ────────────────────────────────────────────────────────────────────

// 単位: インチ (pptxgenjs デフォルト)
const W = 13.33; // 16:9 幅
const H = 7.5;   // 16:9 高さ

// ブランドカラー (hex, # なし)
const BG      = '0d1b2a';
const ACCENT  = '4a9eff';
const WHITE   = 'ffffff';
const GRAY    = '7a9cc6';
const DARK_PANEL = '1a2d42';
const HIGHLIGHT  = 'cc4444';

// チャートのブルー系パレット
const CHART_COLORS = [
  '4A9EFF', '7AB8FF', 'A0CCFF',
  '2C7BE5', '1A5CB8', 'C8E0FF',
];

const CHAPTER_LABELS: Record<string, string> = {
  hook: 'フック',
  explanation: '解説',
  analysis: '分析',
  summary: 'まとめ',
  cta: 'アクション',
};

// ─── CLI 引数 ─────────────────────────────────────────────────────────────────

function parseArgs(): { inputFile: string; outputFile: string } {
  const args = process.argv.slice(2);
  let inputFile = path.join(__dirname, '../input/script-input.json');
  let outputFile = '';
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--input' && args[i + 1]) inputFile = path.resolve(args[i + 1]);
    if (args[i] === '--output' && args[i + 1]) outputFile = path.resolve(args[i + 1]);
  }
  return { inputFile, outputFile };
}

function loadScript(filePath: string): ScriptInput {
  if (!fs.existsSync(filePath)) {
    console.error(`❌ スクリプトファイルが見つかりません: ${filePath}`);
    process.exit(1);
  }
  return JSON.parse(fs.readFileSync(filePath, 'utf-8')) as ScriptInput;
}

// ─── スライドヘルパー ─────────────────────────────────────────────────────────

function addBackground(slide: PptxGenJS.Slide) {
  slide.background = { color: BG };
}

/** スライド上部: チャプターバッジ + タイトル + アクセントライン */
function addSlideHeader(
  slide: PptxGenJS.Slide,
  badge: string,
  title: string,
  badgeColor = ACCENT,
) {
  // バッジ
  slide.addShape(pptx.ShapeType.rect, {
    x: 0.4, y: 0.3, w: 1.1, h: 0.28,
    fill: { color: badgeColor },
    line: { color: badgeColor, width: 0 },
  });
  slide.addText(badge, {
    x: 0.4, y: 0.3, w: 1.1, h: 0.28,
    color: WHITE, fontSize: 9, bold: true,
    align: 'center', valign: 'middle',
    fontFace: 'Meiryo UI',
  });
  // タイトル
  slide.addText(title, {
    x: 0.4, y: 0.62, w: W - 0.8, h: 0.55,
    color: WHITE, fontSize: 20, bold: true,
    fontFace: 'Meiryo UI',
  });
  // アクセントライン
  slide.addShape(pptx.ShapeType.rect, {
    x: 0.4, y: 1.2, w: W - 0.8, h: 0.03,
    fill: { color: ACCENT },
    line: { color: ACCENT, width: 0 },
  });
}

// ─── ビジュアル種別ハンドラ ────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyVisual = Record<string, any>;

function handleStat(slide: PptxGenJS.Slide, visual: AnyVisual) {
  const value: string = visual.value ?? '—';
  const label: string = visual.label ?? '';
  const detail: string = visual.detail ?? '';

  slide.addText(value, {
    x: 1.5, y: 2.2, w: W - 3, h: 2.0,
    color: ACCENT, fontSize: 80, bold: true,
    align: 'center', fontFace: 'Meiryo UI',
  });
  slide.addText(label, {
    x: 0.4, y: 4.3, w: W - 0.8, h: 0.6,
    color: WHITE, fontSize: 18, align: 'center',
    fontFace: 'Meiryo UI',
  });
  if (detail) {
    slide.addText(detail, {
      x: 0.4, y: 5.0, w: W - 0.8, h: 0.5,
      color: GRAY, fontSize: 12, align: 'center',
      fontFace: 'Meiryo UI',
    });
  }
}

function handleChart(slide: PptxGenJS.Slide, visual: AnyVisual, chartData: Record<string, AnyVisual>) {
  const key: string = visual.key ?? '';
  const cd = chartData[key];
  if (!cd?.data) {
    slide.addText(`チャートデータなし: ${key}`, {
      x: 0.4, y: 2, w: W - 0.8, h: 1,
      color: GRAY, fontSize: 14, fontFace: 'Meiryo UI',
    });
    return;
  }

  // pptxgenjs のチャートXMLは日本語ラベルを正しく処理できないため
  // 連番ラベルに置き換え、日本語ラベルは凡例テキストボックスで別途表示する
  const origLabels: string[] = cd.data.map((d: AnyVisual) => d.label as string);
  const values: number[] = cd.data.map((d: AnyVisual) => d.value as number);
  const asciiLabels = origLabels.map((_: string, i: number) => String(i + 1));
  const chartType = cd.chartType === 'line' ? 'line' : 'bar';

  const chartOptions: PptxGenJS.OptsChartData = {
    name: 'data',
    labels: asciiLabels,
    values,
  };

  const chartH = H - 2.5;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const opts: any = {
    x: 0.5, y: 1.4, w: W - 1.0, h: chartH,
    chartColors: CHART_COLORS,
    showLegend: false,
    valAxisLabelColor: 'a0b8d0',
    catAxisLabelColor: 'a0b8d0',
    valGridLine: { style: 'solid', color: '1a2d42' },
    plotAreaBkgdColor: BG,
    dataLabelColor: WHITE,
    showValue: chartType === 'bar',
    dataLabelFontSize: 9,
    dataLabelFontBold: true,
    catAxisLineShow: false,
    valAxisLineShow: false,
    lineDataSymbol: 'none',
    barGapWidthPct: 50,
    chartAreaBkgdColor: BG,
  };

  slide.addChart(
    chartType === 'line' ? pptx.ChartType.line : pptx.ChartType.bar,
    [chartOptions],
    opts,
  );

  // 日本語ラベルを数値ラベルの下にテキストで表示
  const labelAreaY = 1.4 + chartH;
  const colW = (W - 1.0) / origLabels.length;
  origLabels.forEach((lbl, i) => {
    slide.addText(lbl, {
      x: 0.5 + i * colW, y: labelAreaY,
      w: colW, h: 0.3,
      color: GRAY, fontSize: 7, align: 'center',
      fontFace: 'Meiryo UI', wrap: true,
    });
  });

  // チャートタイトル（キャプション）
  if (cd.title) {
    slide.addText(cd.title, {
      x: 0.4, y: H - 0.4, w: W - 0.8, h: 0.3,
      color: GRAY, fontSize: 8, fontFace: 'Meiryo UI',
      italic: true,
    });
  }
}

function handleRichPanel(slide: PptxGenJS.Slide, visual: AnyVisual) {
  const title: string = visual.title ?? '';
  const body: string = visual.body ?? '';
  const points: string[] = visual.points ?? [];

  // パネル背景
  slide.addShape(pptx.ShapeType.rect, {
    x: 0.4, y: 1.4, w: W - 0.8, h: H - 2.0,
    fill: { color: DARK_PANEL },
    line: { color: ACCENT, width: 2 },
  });

  if (title) {
    slide.addText(title, {
      x: 0.6, y: 1.55, w: W - 1.2, h: 0.4,
      color: ACCENT, fontSize: 14, bold: true,
      fontFace: 'Meiryo UI',
    });
  }

  if (body) {
    slide.addText(body, {
      x: 0.6, y: 2.0, w: W - 1.2, h: 0.7,
      color: WHITE, fontSize: 11, fontFace: 'Meiryo UI',
      wrap: true,
    });
  }

  if (points.length > 0) {
    const startY = body ? 2.75 : 1.9;
    const rowH = (H - startY - 0.5) / Math.min(points.length, 6);
    points.slice(0, 6).forEach((p, i) => {
      // ドット
      slide.addShape(pptx.ShapeType.ellipse, {
        x: 0.55, y: startY + i * rowH + 0.05,
        w: 0.12, h: 0.12,
        fill: { color: ACCENT },
        line: { color: ACCENT, width: 0 },
      });
      slide.addText(p, {
        x: 0.75, y: startY + i * rowH,
        w: W - 1.3, h: rowH,
        color: WHITE, fontSize: 12, fontFace: 'Meiryo UI',
        valign: 'middle', wrap: true,
      });
    });
  }
}

function handleComparisonTable(slide: PptxGenJS.Slide, visual: AnyVisual) {
  const title: string = visual.title ?? '';
  const columns: AnyVisual[] = visual.columns ?? [];
  const rows: AnyVisual[] = visual.rows ?? [];
  const footer: string = visual.footer ?? '';

  if (title) {
    slide.addText(title, {
      x: 0.4, y: 1.3, w: W - 0.8, h: 0.35,
      color: ACCENT, fontSize: 13, bold: true,
      fontFace: 'Meiryo UI',
    });
  }

  if (columns.length === 0 || rows.length === 0) return;

  // 列数によって幅調整
  const colCount = columns.length + 1; // ラベル列 + データ列
  const colW = (W - 0.8) / colCount;
  const rowH = 0.48;
  const tableStartY = title ? 1.75 : 1.4;

  // ヘッダー行
  columns.forEach((col, ci) => {
    const isWinner = col.winner === true;
    slide.addShape(pptx.ShapeType.rect, {
      x: 0.4 + colW * (ci + 1), y: tableStartY,
      w: colW - 0.02, h: rowH,
      fill: { color: isWinner ? ACCENT : DARK_PANEL },
      line: { color: ACCENT, width: 1 },
    });
    slide.addText(col.label ?? '', {
      x: 0.4 + colW * (ci + 1), y: tableStartY,
      w: colW - 0.02, h: rowH,
      color: WHITE, fontSize: 10, bold: true,
      align: 'center', valign: 'middle',
      fontFace: 'Meiryo UI',
    });
  });
  // ラベル列ヘッダー
  slide.addShape(pptx.ShapeType.rect, {
    x: 0.4, y: tableStartY, w: colW - 0.02, h: rowH,
    fill: { color: BG },
    line: { color: ACCENT, width: 1 },
  });

  // データ行
  rows.forEach((row, ri) => {
    const y = tableStartY + rowH * (ri + 1);
    const isEven = ri % 2 === 0;
    const rowBg = isEven ? '122033' : BG;

    // ラベル
    slide.addShape(pptx.ShapeType.rect, {
      x: 0.4, y, w: colW - 0.02, h: rowH,
      fill: { color: DARK_PANEL },
      line: { color: ACCENT, width: 1 },
    });
    slide.addText(row.label ?? '', {
      x: 0.42, y, w: colW - 0.06, h: rowH,
      color: GRAY, fontSize: 10, bold: true,
      valign: 'middle', fontFace: 'Meiryo UI', wrap: true,
    });

    // 値
    (row.values as string[]).forEach((val, ci) => {
      slide.addShape(pptx.ShapeType.rect, {
        x: 0.4 + colW * (ci + 1), y, w: colW - 0.02, h: rowH,
        fill: { color: rowBg },
        line: { color: ACCENT, width: 1 },
      });
      slide.addText(val ?? '', {
        x: 0.42 + colW * (ci + 1), y, w: colW - 0.06, h: rowH,
        color: WHITE, fontSize: 10,
        align: 'center', valign: 'middle',
        fontFace: 'Meiryo UI', wrap: true,
      });
    });
  });

  if (footer) {
    const footerY = tableStartY + rowH * (rows.length + 1) + 0.1;
    slide.addText(`※ ${footer}`, {
      x: 0.4, y: footerY, w: W - 0.8, h: 0.3,
      color: GRAY, fontSize: 9, italic: true,
      fontFace: 'Meiryo UI',
    });
  }
}

function handleTimeline(slide: PptxGenJS.Slide, visual: AnyVisual) {
  const events: AnyVisual[] = visual.events ?? [];
  if (events.length === 0) return;

  const startX = 0.5;
  const endX = W - 0.5;
  const lineY = H / 2;
  const evtW = (endX - startX) / events.length;

  // タイムライン横線
  slide.addShape(pptx.ShapeType.rect, {
    x: startX, y: lineY - 0.02,
    w: endX - startX, h: 0.04,
    fill: { color: ACCENT },
    line: { color: ACCENT, width: 0 },
  });

  events.forEach((evt, i) => {
    const x = startX + evtW * i + evtW / 2;
    const isHigh = evt.highlight === true;
    const dotColor = isHigh ? HIGHLIGHT : ACCENT;
    const dotSize = isHigh ? 0.22 : 0.15;
    const above = i % 2 === 0;

    // ドット
    slide.addShape(pptx.ShapeType.ellipse, {
      x: x - dotSize / 2, y: lineY - dotSize / 2,
      w: dotSize, h: dotSize,
      fill: { color: dotColor },
      line: { color: dotColor, width: 0 },
    });

    // 縦線
    const connH = 0.8;
    slide.addShape(pptx.ShapeType.rect, {
      x: x - 0.01, y: above ? lineY - connH : lineY,
      w: 0.02, h: connH,
      fill: { color: dotColor },
      line: { color: dotColor, width: 0 },
    });

    // 年ラベル
    const yearY = above ? lineY - connH - 0.3 : lineY + connH;
    slide.addText(evt.year ?? '', {
      x: x - evtW / 2, y: yearY, w: evtW, h: 0.28,
      color: isHigh ? HIGHLIGHT : ACCENT,
      fontSize: 8, bold: true, align: 'center',
      fontFace: 'Meiryo UI',
    });

    // イベントラベル
    const labelY = above ? lineY - connH - 0.7 : lineY + connH + 0.28;
    slide.addText(evt.label ?? '', {
      x: x - evtW / 2 + 0.05, y: labelY, w: evtW - 0.1, h: 0.5,
      color: WHITE, fontSize: 8.5, align: 'center',
      fontFace: 'Meiryo UI', wrap: true,
    });
  });
}

function handleFlowChart(slide: PptxGenJS.Slide, visual: AnyVisual) {
  const root: AnyVisual = visual.root ?? {};
  const children: AnyVisual[] = root.children ?? [];

  // ルートノード（中央上部）
  const rootX = (W - 2.5) / 2;
  const rootY = 1.5;
  slide.addShape(pptx.ShapeType.rect, {
    x: rootX, y: rootY, w: 2.5, h: 0.7,
    fill: { color: ACCENT },
    line: { color: ACCENT, width: 0 },
  });
  slide.addText(`${root.icon ?? ''}  ${root.label ?? ''}`, {
    x: rootX, y: rootY, w: 2.5, h: 0.4,
    color: WHITE, fontSize: 12, bold: true,
    align: 'center', valign: 'middle',
    fontFace: 'Meiryo UI',
  });
  if (root.sublabel) {
    slide.addText(root.sublabel, {
      x: rootX, y: rootY + 0.38, w: 2.5, h: 0.3,
      color: WHITE, fontSize: 8, align: 'center',
      fontFace: 'Meiryo UI',
    });
  }

  if (children.length === 0) return;

  // 子ノード
  const childW = 2.8;
  const totalChildW = childW * children.length + 0.3 * (children.length - 1);
  const childStartX = (W - totalChildW) / 2;
  const childY = 3.1;

  children.forEach((child, i) => {
    const cx = childStartX + i * (childW + 0.3);
    const isHighlight = child.highlight === true;
    const color = isHighlight ? HIGHLIGHT : DARK_PANEL;
    const borderColor = isHighlight ? HIGHLIGHT : ACCENT;

    // 接続線
    slide.addShape(pptx.ShapeType.rect, {
      x: cx + childW / 2 - 0.01, y: rootY + 0.7,
      w: 0.02, h: childY - rootY - 0.7,
      fill: { color: borderColor },
      line: { color: borderColor, width: 0 },
    });

    // 子ノード
    slide.addShape(pptx.ShapeType.rect, {
      x: cx, y: childY, w: childW, h: 0.65,
      fill: { color },
      line: { color: borderColor, width: 2 },
    });
    slide.addText(child.label ?? '', {
      x: cx, y: childY, w: childW, h: 0.38,
      color: WHITE, fontSize: 10, bold: true,
      align: 'center', valign: 'middle',
      fontFace: 'Meiryo UI',
    });
    if (child.sublabel) {
      slide.addText(child.sublabel, {
        x: cx, y: childY + 0.35, w: childW, h: 0.3,
        color: GRAY, fontSize: 8, align: 'center',
        fontFace: 'Meiryo UI',
      });
    }

    // 詳細ボックス
    if (child.detail?.items) {
      const detailY = childY + 0.75;
      const detailColor = child.detail.color ? child.detail.color.replace('#', '') : DARK_PANEL;
      slide.addShape(pptx.ShapeType.rect, {
        x: cx, y: detailY, w: childW, h: Math.min(child.detail.items.length, 3) * 0.32 + 0.15,
        fill: { color: detailColor === DARK_PANEL ? DARK_PANEL : detailColor },
        line: { color: borderColor, width: 1 },
      });
      (child.detail.items as string[]).slice(0, 3).forEach((item: string, ji: number) => {
        slide.addText(`• ${item}`, {
          x: cx + 0.1, y: detailY + ji * 0.32 + 0.06, w: childW - 0.2, h: 0.3,
          color: WHITE, fontSize: 8, fontFace: 'Meiryo UI',
        });
      });
    }
  });
}

// ─── メイン生成 ───────────────────────────────────────────────────────────────

let pptx: PptxGenJS;

async function generatePptx(script: ScriptInput, outputFile: string): Promise<string> {
  pptx = new PptxGenJS();
  pptx.layout = 'LAYOUT_WIDE'; // 13.33 x 7.5 inch (16:9)
  pptx.author = 'money_video_claude';
  pptx.title = script.title;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const chartData = (script as any).chartData ?? {};

  // ── タイトルスライド ─────────────────────────────────────────────────────
  const titleSlide = pptx.addSlide();
  addBackground(titleSlide);

  // 装飾: 左側グラデーション矩形
  titleSlide.addShape(pptx.ShapeType.rect, {
    x: 0, y: 0, w: 0.08, h: H,
    fill: { color: ACCENT },
    line: { color: ACCENT, width: 0 },
  });

  titleSlide.addText(script.videoId.toUpperCase(), {
    x: 0.5, y: 1.5, w: W - 1, h: 0.5,
    color: ACCENT, fontSize: 16, bold: true,
    fontFace: 'Meiryo UI',
  });
  titleSlide.addText(script.title, {
    x: 0.5, y: 2.1, w: W - 1, h: 2.4,
    color: WHITE, fontSize: 32, bold: true,
    fontFace: 'Meiryo UI', wrap: true,
  });
  titleSlide.addText(script.tags.slice(0, 6).join('  /  '), {
    x: 0.5, y: 4.8, w: W - 1, h: 0.4,
    color: GRAY, fontSize: 12,
    fontFace: 'Meiryo UI',
  });

  // 章数バッジ
  titleSlide.addShape(pptx.ShapeType.rect, {
    x: W - 2.0, y: H - 0.8, w: 1.6, h: 0.4,
    fill: { color: DARK_PANEL },
    line: { color: ACCENT, width: 1 },
  });
  titleSlide.addText(`${script.chapters.length} チャプター`, {
    x: W - 2.0, y: H - 0.8, w: 1.6, h: 0.4,
    color: GRAY, fontSize: 10, align: 'center', valign: 'middle',
    fontFace: 'Meiryo UI',
  });

  // ── チャプターごとのスライド ──────────────────────────────────────────────
  for (let ci = 0; ci < script.chapters.length; ci++) {
    const chapter = script.chapters[ci];
    const chLabel = CHAPTER_LABELS[chapter.type] ?? chapter.type;

    // チャプター区切りスライド
    const divSlide = pptx.addSlide();
    addBackground(divSlide);

    // 大きな番号（背景装飾）
    divSlide.addText(String(ci + 1).padStart(2, '0'), {
      x: W - 4.5, y: -0.5, w: 5, h: 4,
      color: '1a2d42', fontSize: 240, bold: true,
      fontFace: 'Meiryo UI', valign: 'top',
    });

    // バッジ
    divSlide.addShape(pptx.ShapeType.rect, {
      x: 0.5, y: 1.8, w: 1.2, h: 0.32,
      fill: { color: ACCENT },
      line: { color: ACCENT, width: 0 },
    });
    divSlide.addText(chLabel, {
      x: 0.5, y: 1.8, w: 1.2, h: 0.32,
      color: WHITE, fontSize: 11, bold: true,
      align: 'center', valign: 'middle', fontFace: 'Meiryo UI',
    });

    // チャプタートピック
    const topicText = chapter.topic ?? chLabel;
    divSlide.addText(topicText, {
      x: 0.5, y: 2.2, w: W - 4, h: 2.0,
      color: WHITE, fontSize: 36, bold: true,
      fontFace: 'Meiryo UI', wrap: true,
    });

    // 進捗ドット
    for (let di = 0; di < script.chapters.length; di++) {
      divSlide.addShape(pptx.ShapeType.ellipse, {
        x: 0.5 + di * 0.28, y: H - 0.6,
        w: 0.18, h: 0.18,
        fill: { color: di === ci ? ACCENT : DARK_PANEL },
        line: { color: ACCENT, width: di === ci ? 0 : 1 },
      });
    }

    // 代表セリフ（最初の line のテキスト）
    if (chapter.lines.length > 0) {
      divSlide.addShape(pptx.ShapeType.rect, {
        x: 0, y: H - 1.5, w: 0.08, h: 1.5,
        fill: { color: ACCENT },
        line: { color: ACCENT, width: 0 },
      });
      divSlide.addText(`" ${chapter.lines[0].text.slice(0, 60)}..."`, {
        x: 0.5, y: H - 1.35, w: W - 1, h: 0.9,
        color: GRAY, fontSize: 11, italic: true,
        fontFace: 'Meiryo UI', wrap: true,
      });
    }

    // コンテンツスライド（visual がある行のみ）
    for (const line of chapter.lines) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const visual = (line as any).visual as AnyVisual | undefined;
      if (!visual) continue;

      // 簡単なビジュアルはスキップ（image, traffic-light 等は文字情報で代替）
      const supported = ['stat', 'chart', 'rich-panel', 'comparison-table', 'timeline', 'flow-chart'];
      if (!supported.includes(visual.type)) continue;

      const contentSlide = pptx.addSlide();
      addBackground(contentSlide);

      // スライドタイトル = セリフの最初の30文字
      const slideTitle = line.text.slice(0, 50) + (line.text.length > 50 ? '…' : '');
      addSlideHeader(contentSlide, chLabel, slideTitle);

      switch (visual.type) {
        case 'stat':
          handleStat(contentSlide, visual);
          break;
        case 'chart':
          handleChart(contentSlide, visual, chartData);
          break;
        case 'rich-panel':
          handleRichPanel(contentSlide, visual);
          break;
        case 'comparison-table':
          handleComparisonTable(contentSlide, visual);
          break;
        case 'timeline':
          handleTimeline(contentSlide, visual);
          break;
        case 'flow-chart':
          handleFlowChart(contentSlide, visual);
          break;
      }

      // ページ番号（右下）
      contentSlide.addText(chLabel, {
        x: W - 1.2, y: H - 0.3, w: 1.0, h: 0.25,
        color: GRAY, fontSize: 8, align: 'right',
        fontFace: 'Meiryo UI',
      });
    }
  }

  // ─ まとめスライド ─────────────────────────────────────────────────────────
  const endSlide = pptx.addSlide();
  addBackground(endSlide);
  endSlide.addShape(pptx.ShapeType.rect, {
    x: 0, y: 0, w: 0.08, h: H,
    fill: { color: ACCENT },
    line: { color: ACCENT, width: 0 },
  });
  endSlide.addText('Thank you', {
    x: 0.5, y: 2.0, w: W - 1, h: 1.5,
    color: ACCENT, fontSize: 48, bold: true,
    fontFace: 'Meiryo UI',
  });
  endSlide.addText(script.title, {
    x: 0.5, y: 3.6, w: W - 1, h: 0.5,
    color: WHITE, fontSize: 16, fontFace: 'Meiryo UI',
  });
  endSlide.addText(script.videoId.toUpperCase(), {
    x: 0.5, y: 4.2, w: W - 1, h: 0.35,
    color: GRAY, fontSize: 12, fontFace: 'Meiryo UI',
  });

  // 保存
  const outDir = path.dirname(outputFile);
  fs.mkdirSync(outDir, { recursive: true });
  await pptx.writeFile({ fileName: outputFile });
  return outputFile;
}

// ─── エントリポイント ─────────────────────────────────────────────────────────

async function main(): Promise<void> {
  const { inputFile, outputFile: rawOutput } = parseArgs();

  console.log(`\n📂 スクリプトを読み込んでいます: ${inputFile}`);
  const script = loadScript(inputFile);

  const outputFile = rawOutput || path.join(
    path.dirname(inputFile),
    '..',
    'out',
    `${script.videoId}-slides.pptx`,
  );

  console.log(`   タイトル: ${script.title}`);
  console.log(`   チャプター数: ${script.chapters.length}`);
  console.log(`   出力先: ${outputFile}`);

  console.log('\n🔄 PPTX 生成中...');
  await generatePptx(script, outputFile);

  console.log('\n✅ PPTX を生成しました！');
  console.log(`   ファイル: ${outputFile}`);
  console.log('\n💡 PowerPoint / Google スライドで開いて編集できます。');
}

main().catch((err: unknown) => {
  const message = err instanceof Error ? err.message : String(err);
  console.error('❌ エラー:', message);
  process.exit(1);
});
