/**
 * generate-google-slides.ts
 * script-input.json から McKinsey/BCG 品質の Google Slides を生成
 *
 * 使い方:
 *   npm run slides:generate [-- --input ./input/script-input.json]
 *
 * デザイン原則（slides-maker スキルに準拠）:
 *   - 白背景、ディープネイビー見出し
 *   - アクションタイトル（トピックラベルではなく洞察文）
 *   - 情報密度の高いレイアウト、最小余白
 *   - バッジ・ラベル・絵文字なし
 */

import * as fs from 'fs';
import * as path from 'path';
import * as http from 'http';
import * as dotenv from 'dotenv';
import { google } from 'googleapis';
import { OAuth2Client } from 'google-auth-library';
import { ScriptInput } from '../src/utils/types';

dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

// ─── 認証設定 ─────────────────────────────────────────────────────────────────

const CREDENTIALS_DIR = path.join(__dirname, '..', '.credentials');
const CLIENT_SECRET_PATH = path.join(CREDENTIALS_DIR, 'client_secret.json');
const TOKEN_PATH = path.join(CREDENTIALS_DIR, 'slides-token.json');
const SCOPES = [
  'https://www.googleapis.com/auth/presentations',
  'https://www.googleapis.com/auth/drive.file',
];
const REDIRECT_PORT = 4143;
const REDIRECT_URI = `http://localhost:${REDIRECT_PORT}/oauth2callback`;

// ─── デザインシステム（McKinsey/BCG 準拠）────────────────────────────────────

type Rgb = { red: number; green: number; blue: number };

const C: Record<string, Rgb> = {
  BG_WHITE:   { red: 1,     green: 1,     blue: 1     }, // #FFFFFF
  BG_NAVY:    { red: 0.043, green: 0.122, blue: 0.247 }, // #0B1F3F (タイトルスライドのみ)
  BG_LIGHT:   { red: 0.961, green: 0.969, blue: 0.98  }, // #F5F7FA 交互行
  TEXT_BLACK: { red: 0.102, green: 0.102, blue: 0.102 }, // #1A1A1A
  TEXT_DARK:  { red: 0.2,   green: 0.2,   blue: 0.2   }, // #333333
  TEXT_MUTED: { red: 0.533, green: 0.533, blue: 0.533 }, // #888888
  TEXT_WHITE: { red: 1,     green: 1,     blue: 1     },
  NAVY:       { red: 0.043, green: 0.122, blue: 0.247 }, // #0B1F3F
  ROYAL:      { red: 0.106, green: 0.227, blue: 0.42  }, // #1B3A6B チャートプライマリ
  BLUE2:      { red: 0.239, green: 0.376, blue: 0.596 }, // #3D6098
  BLUE3:      { red: 0.478, green: 0.612, blue: 0.776 }, // #7A9CC6
  BLUE4:      { red: 0.722, green: 0.8,   blue: 0.894 }, // #B8CCE4
  BLUE5:      { red: 0.851, green: 0.898, blue: 0.949 }, // #D9E5F2
  ACCENT_RED: { red: 0.784, green: 0.063, blue: 0.18  }, // #C8102E
  GRID:       { red: 0.816, green: 0.816, blue: 0.816 }, // #D0D0D0
};

// チャートカラー順
const CHART_PALETTE: Rgb[] = [C.ROYAL, C.BLUE2, C.BLUE3, C.BLUE4, C.BLUE5, C.ACCENT_RED];

// スライドサイズ (PT) — Google Slides デフォルト 16:9
const SW = 720;  // width
const SH = 405;  // height
const ML = 32;   // margin left/right
const MT = 22;   // margin top

// タイトル行レイアウト
const TITLE_Y   = MT;
const TITLE_H   = 52;
const DIVIDER_Y = TITLE_Y + TITLE_H + 4;
const CONTENT_Y = DIVIDER_Y + 8;
const CONTENT_H = SH - CONTENT_Y - 18; // ~305
const CONTENT_W = SW - ML * 2;          // 656

// ─── リクエストビルダー ──────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Req = Record<string, any>;

function pt(v: number) { return { magnitude: v, unit: 'PT' }; }

function solidFill(color: Rgb) {
  return { solidFill: { color: { rgbColor: color } } };
}

function emu(ptVal: number) { return ptVal * 12700; }

function transform(x: number, y: number) {
  return { scaleX: 1, scaleY: 1, translateX: x, translateY: y, unit: 'PT' };
}

function elProps(pageObjectId: string, x: number, y: number, w: number, h: number) {
  return {
    pageObjectId,
    size: { width: pt(w), height: pt(h) },
    transform: transform(x, y),
  };
}

/** テキストボックス作成 */
function mkTextBox(id: string, slideId: string, x: number, y: number, w: number, h: number): Req {
  return {
    createShape: {
      objectId: id,
      shapeType: 'TEXT_BOX',
      elementProperties: elProps(slideId, x, y, w, h),
    },
  };
}

/** テキスト挿入 */
function mkText(id: string, text: string): Req {
  return { insertText: { objectId: id, text } };
}

/** テキストスタイル更新 */
function mkTextStyle(
  id: string,
  color: Rgb,
  fontSize: number,
  bold = false,
  fontFace = 'Yu Gothic',
): Req {
  return {
    updateTextStyle: {
      objectId: id,
      style: {
        foregroundColor: { opaqueColor: { rgbColor: color } },
        fontSize: pt(fontSize),
        bold,
        fontFamily: fontFace,
      },
      fields: 'foregroundColor,fontSize,bold,fontFamily',
    },
  };
}

/** 段落スタイル（行間） */
function mkParaStyle(id: string, lineSpacing = 140): Req {
  return {
    updateParagraphStyle: {
      objectId: id,
      style: { lineSpacing, spaceAbove: pt(2) },
      fields: 'lineSpacing,spaceAbove',
    },
  };
}

/** 矩形シェイプ（背景装飾） */
function mkRect(
  id: string,
  slideId: string,
  x: number, y: number, w: number, h: number,
  fillColor: Rgb,
  borderColor?: Rgb,
): Req {
  return {
    createShape: {
      objectId: id,
      shapeType: 'RECTANGLE',
      elementProperties: elProps(slideId, x, y, w, h),
    },
  };
}

/** シェイプ背景色更新 */
function mkShapeFill(id: string, color: Rgb, borderColor?: Rgb): Req {
  const shapeBackgroundFill = solidFill(color);
  if (!borderColor) {
    return {
      updateShapeProperties: {
        objectId: id,
        shapeProperties: { shapeBackgroundFill },
        fields: 'shapeBackgroundFill',
      },
    };
  }
  const outline = { outlineFill: solidFill(borderColor), weight: pt(1) };
  return {
    updateShapeProperties: {
      objectId: id,
      shapeProperties: { shapeBackgroundFill, outline },
      fields: 'shapeBackgroundFill,outline',
    },
  };
}

/** スライド背景色設定 */
function mkSlideBg(slideId: string, color: Rgb): Req {
  return {
    updatePageProperties: {
      objectId: slideId,
      pageProperties: {
        pageBackgroundFill: solidFill(color),
      },
      fields: 'pageBackgroundFill',
    },
  };
}

// ─── 共通スライドヘッダー ─────────────────────────────────────────────────────

/**
 * 白背景スライドにアクションタイトル + 下線を追加
 * actionTitle: インサイト文（「〜が〜した」形式）
 */
function addSlideHeader(
  reqs: Req[],
  slideId: string,
  actionTitle: string,
  suffix = '',
): void {
  // タイトルテキスト
  const tid = `${slideId}_title`;
  reqs.push(mkTextBox(tid, slideId, ML, TITLE_Y, CONTENT_W - (suffix ? 80 : 0), TITLE_H));
  reqs.push(mkText(tid, actionTitle));
  reqs.push(mkTextStyle(tid, C.NAVY, 20, true, 'Yu Gothic'));

  // 右端にページ番号やサフィックス
  if (suffix) {
    const sid = `${slideId}_suffix`;
    reqs.push(mkTextBox(sid, slideId, SW - ML - 80, TITLE_Y + 30, 80, 22));
    reqs.push(mkText(sid, suffix));
    reqs.push(mkTextStyle(sid, C.TEXT_MUTED, 9));
  }

  // アクセントライン（ネイビー、細）
  const lid = `${slideId}_line`;
  reqs.push(mkRect(lid, slideId, ML, DIVIDER_Y, CONTENT_W, 2, C.NAVY));
  reqs.push(mkShapeFill(lid, C.NAVY));
}

// ─── ビジュアル描画 ───────────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyVis = Record<string, any>;

/** 大きな数値（stat ビジュアル） */
function buildStat(reqs: Req[], slideId: string, vis: AnyVis): void {
  const value: string = vis.value ?? '—';
  const label: string = vis.label ?? '';
  const detail: string = vis.detail ?? '';

  // 中央大きな数字
  const vid = `${slideId}_stat_val`;
  reqs.push(mkTextBox(vid, slideId, ML, CONTENT_Y + 20, CONTENT_W, 130));
  reqs.push(mkText(vid, value));
  reqs.push({
    updateTextStyle: {
      objectId: vid,
      style: {
        foregroundColor: { opaqueColor: { rgbColor: C.ROYAL } },
        fontSize: pt(88),
        bold: true,
        fontFamily: 'Yu Gothic',
      },
      fields: 'foregroundColor,fontSize,bold,fontFamily',
    },
  });
  reqs.push({
    updateParagraphStyle: {
      objectId: vid,
      style: { alignment: 'CENTER' },
      fields: 'alignment',
    },
  });

  // ラベル
  if (label) {
    const lid2 = `${slideId}_stat_lbl`;
    reqs.push(mkTextBox(lid2, slideId, ML, CONTENT_Y + 160, CONTENT_W, 36));
    reqs.push(mkText(lid2, label));
    reqs.push(mkTextStyle(lid2, C.TEXT_DARK, 15));
    reqs.push({
      updateParagraphStyle: {
        objectId: lid2,
        style: { alignment: 'CENTER' },
        fields: 'alignment',
      },
    });
  }

  // 補足
  if (detail) {
    const did = `${slideId}_stat_det`;
    reqs.push(mkTextBox(did, slideId, ML, CONTENT_Y + 202, CONTENT_W, 28));
    reqs.push(mkText(did, detail));
    reqs.push(mkTextStyle(did, C.TEXT_MUTED, 11));
    reqs.push({
      updateParagraphStyle: {
        objectId: did,
        style: { alignment: 'CENTER' },
        fields: 'alignment',
      },
    });
  }
}

/** バーチャート（シェイプで描画） */
function buildBarChart(
  reqs: Req[],
  slideId: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  chartData: Record<string, AnyVis>,
  chartKey: string,
  isLine = false,
): void {
  const cd = chartData[chartKey];
  if (!cd?.data) return;

  const data: { label: string; value: number }[] = cd.data;
  const n = data.length;
  const maxVal = Math.max(...data.map((d) => d.value), 0.01);

  const chartW = CONTENT_W;
  const valueLabelH = 22;                          // バー上のラベル高さ
  const catLabelH = 32;                            // バー下のラベル高さ
  const chartTopY = CONTENT_Y + valueLabelH;       // バー開始Y（ラベル分下げる）
  const barMaxH = CONTENT_H - valueLabelH - catLabelH - 20; // バー最大高さ

  const barW = Math.min(60, (chartW - 20) / n - 8);
  const totalW = n * (barW + 8) - 8;
  const offsetX = ML + (chartW - totalW) / 2;

  data.forEach((d, i) => {
    const barH = Math.max((d.value / maxVal) * barMaxH, 4);
    const bx = offsetX + i * (barW + 8);
    const by = chartTopY + barMaxH - barH;
    const color = i % 2 === 0 ? C.ROYAL : C.BLUE2;

    // バー
    const bid = `${slideId}_bar${i}`;
    reqs.push(mkRect(bid, slideId, bx, by, barW, barH, color));
    reqs.push(mkShapeFill(bid, color));

    // 値ラベル（バー上に確実に配置）
    const vlid = `${slideId}_bv${i}`;
    reqs.push(mkTextBox(vlid, slideId, bx - 4, by - valueLabelH, barW + 8, valueLabelH));
    reqs.push(mkText(vlid, String(d.value)));
    reqs.push(mkTextStyle(vlid, C.TEXT_DARK, 9, true));
    reqs.push({
      updateParagraphStyle: {
        objectId: vlid,
        style: { alignment: 'CENTER' },
        fields: 'alignment',
      },
    });
  });

  // カテゴリラベル（バー下）
  data.forEach((d, i) => {
    const bx = offsetX + i * (barW + 8);
    const lly = chartTopY + barMaxH + 3;
    const llid = `${slideId}_bl${i}`;
    reqs.push(mkTextBox(llid, slideId, bx - 10, lly, barW + 20, 30));
    reqs.push(mkText(llid, d.label));
    reqs.push(mkTextStyle(llid, C.TEXT_MUTED, 8));
    reqs.push({
      updateParagraphStyle: {
        objectId: llid,
        style: { alignment: 'CENTER' },
        fields: 'alignment',
      },
    });
  });

  // タイトル（キャプション）
  if (cd.title) {
    const ctid = `${slideId}_chart_cap`;
    reqs.push(mkTextBox(ctid, slideId, ML, SH - 20, CONTENT_W, 16));
    reqs.push(mkText(ctid, cd.title));
    reqs.push(mkTextStyle(ctid, C.TEXT_MUTED, 8));
  }
}

/** Rich-Panel（箇条書きパネル） */
function buildRichPanel(reqs: Req[], slideId: string, vis: AnyVis): void {
  const title: string = vis.title ?? '';
  const body: string = vis.body ?? '';
  const points: string[] = vis.points ?? [];

  let y = CONTENT_Y;

  if (title) {
    const ttid = `${slideId}_rp_title`;
    reqs.push(mkTextBox(ttid, slideId, ML, y, CONTENT_W, 28));
    reqs.push(mkText(ttid, title));
    reqs.push(mkTextStyle(ttid, C.NAVY, 14, true));
    y += 32;
  }

  if (body) {
    const bid = `${slideId}_rp_body`;
    reqs.push(mkTextBox(bid, slideId, ML, y, CONTENT_W, 38));
    reqs.push(mkText(bid, body));
    reqs.push(mkTextStyle(bid, C.TEXT_DARK, 11));
    reqs.push(mkParaStyle(bid, 145));
    y += 44;
  }

  const rowH = Math.min(40, (SH - y - 20) / Math.max(points.length, 1));
  points.forEach((p, i) => {
    // 交互背景（最初に描く）
    if (i % 2 === 0) {
      const bgid = `${slideId}_rp_bg${i}`;
      reqs.push(mkRect(bgid, slideId, ML, y, CONTENT_W, rowH - 2, C.BG_LIGHT));
      reqs.push(mkShapeFill(bgid, C.BG_LIGHT));
    }

    // 左端ライン
    const lineId = `${slideId}_rp_ln${i}`;
    reqs.push(mkRect(lineId, slideId, ML, y + 5, 4, rowH - 8, C.ROYAL));
    reqs.push(mkShapeFill(lineId, C.ROYAL));

    // テキスト
    const pid = `${slideId}_rp_p${i}`;
    reqs.push(mkTextBox(pid, slideId, ML + 10, y + 2, CONTENT_W - 10, rowH));
    reqs.push(mkText(pid, p));
    reqs.push(mkTextStyle(pid, C.TEXT_DARK, 13));
    reqs.push(mkParaStyle(pid, 140));

    y += rowH;
  });
}

/** 比較テーブル（Google Slides createTable API） */
function buildComparisonTable(reqs: Req[], slideId: string, vis: AnyVis): void {
  const columns: AnyVis[] = vis.columns ?? [];
  const rows: AnyVis[] = vis.rows ?? [];
  const footer: string = vis.footer ?? '';
  if (columns.length === 0 || rows.length === 0) return;

  const colCount = columns.length + 1; // ラベル列 + データ列
  const rowCount = rows.length + 1;    // ヘッダー行 + データ行
  const tableH = Math.min(CONTENT_H - (footer ? 25 : 5), rowCount * 38);
  const tableId = `${slideId}_table`;

  reqs.push({
    createTable: {
      objectId: tableId,
      elementProperties: elProps(slideId, ML, CONTENT_Y, CONTENT_W, tableH),
      rows: rowCount,
      columns: colCount,
    },
  });

  // ヘッダー行の背景（ラベル列）
  reqs.push({
    updateTableCellProperties: {
      objectId: tableId,
      tableRange: { location: { rowIndex: 0, columnIndex: 0 }, rowSpan: 1, columnSpan: 1 },
      tableCellProperties: {
        tableCellBackgroundFill: solidFill(C.BG_NAVY),
        contentAlignment: 'MIDDLE',
      },
      fields: 'tableCellBackgroundFill,contentAlignment',
    },
  });
  reqs.push({ insertText: { objectId: tableId, cellLocation: { rowIndex: 0, columnIndex: 0 }, text: '' } });

  // ヘッダー行のデータ列
  columns.forEach((col, ci) => {
    const isWinner = col.winner === true;
    reqs.push({
      updateTableCellProperties: {
        objectId: tableId,
        tableRange: { location: { rowIndex: 0, columnIndex: ci + 1 }, rowSpan: 1, columnSpan: 1 },
        tableCellProperties: {
          tableCellBackgroundFill: solidFill(isWinner ? C.ROYAL : C.NAVY),
          contentAlignment: 'MIDDLE',
        },
        fields: 'tableCellBackgroundFill,contentAlignment',
      },
    });
    reqs.push({
      insertText: {
        objectId: tableId,
        cellLocation: { rowIndex: 0, columnIndex: ci + 1 },
        text: col.label ?? '',
      },
    });
    reqs.push({
      updateTextStyle: {
        objectId: tableId,
        cellLocation: { rowIndex: 0, columnIndex: ci + 1 },
        style: {
          foregroundColor: { opaqueColor: { rgbColor: C.TEXT_WHITE } },
          fontSize: pt(11),
          bold: true,
          fontFamily: 'Yu Gothic',
        },
        fields: 'foregroundColor,fontSize,bold,fontFamily',
      },
    });
  });

  // データ行
  rows.forEach((row, ri) => {
    const isEven = ri % 2 === 0;
    const rowBg = isEven ? C.BG_WHITE : C.BG_LIGHT;

    // ラベル列
    reqs.push({
      updateTableCellProperties: {
        objectId: tableId,
        tableRange: { location: { rowIndex: ri + 1, columnIndex: 0 }, rowSpan: 1, columnSpan: 1 },
        tableCellProperties: {
          tableCellBackgroundFill: solidFill(C.BG_LIGHT),
          contentAlignment: 'MIDDLE',
        },
        fields: 'tableCellBackgroundFill,contentAlignment',
      },
    });
    reqs.push({
      insertText: {
        objectId: tableId,
        cellLocation: { rowIndex: ri + 1, columnIndex: 0 },
        text: row.label ?? '',
      },
    });
    reqs.push({
      updateTextStyle: {
        objectId: tableId,
        cellLocation: { rowIndex: ri + 1, columnIndex: 0 },
        style: {
          foregroundColor: { opaqueColor: { rgbColor: C.TEXT_DARK } },
          fontSize: pt(11),
          bold: true,
          fontFamily: 'Yu Gothic',
        },
        fields: 'foregroundColor,fontSize,bold,fontFamily',
      },
    });

    // データ列
    (row.values as string[]).forEach((val, ci) => {
      reqs.push({
        updateTableCellProperties: {
          objectId: tableId,
          tableRange: { location: { rowIndex: ri + 1, columnIndex: ci + 1 }, rowSpan: 1, columnSpan: 1 },
          tableCellProperties: {
            tableCellBackgroundFill: solidFill(rowBg),
            contentAlignment: 'MIDDLE',
          },
          fields: 'tableCellBackgroundFill,contentAlignment',
        },
      });
      reqs.push({
        insertText: {
          objectId: tableId,
          cellLocation: { rowIndex: ri + 1, columnIndex: ci + 1 },
          text: val ?? '',
        },
      });
      reqs.push({
        updateTextStyle: {
          objectId: tableId,
          cellLocation: { rowIndex: ri + 1, columnIndex: ci + 1 },
          style: {
            foregroundColor: { opaqueColor: { rgbColor: C.TEXT_DARK } },
            fontSize: pt(11),
            fontFamily: 'Yu Gothic',
          },
          fields: 'foregroundColor,fontSize,fontFamily',
        },
      });
    });
  });

  // フッター
  if (footer) {
    const fid = `${slideId}_tbl_foot`;
    reqs.push(mkTextBox(fid, slideId, ML, CONTENT_Y + tableH + 4, CONTENT_W, 20));
    reqs.push(mkText(fid, `出典: ${footer}`));
    reqs.push(mkTextStyle(fid, C.TEXT_MUTED, 9));
  }
}

/** タイムライン（横線 + イベントドット） */
function buildTimeline(reqs: Req[], slideId: string, vis: AnyVis): void {
  const events: AnyVis[] = vis.events ?? [];
  if (events.length === 0) return;

  const lineY = CONTENT_Y + CONTENT_H / 2 - 5;
  const lineId = `${slideId}_tl_line`;
  reqs.push(mkRect(lineId, slideId, ML, lineY, CONTENT_W, 3, C.ROYAL));
  reqs.push(mkShapeFill(lineId, C.ROYAL));

  const step = CONTENT_W / events.length;

  events.forEach((evt, i) => {
    const cx = ML + step * i + step / 2;
    const isHigh = evt.highlight === true;
    const dotColor = isHigh ? C.ACCENT_RED : C.ROYAL;
    const dotSize = isHigh ? 14 : 10;
    const above = i % 2 === 0;

    // ドット
    const dotId = `${slideId}_td${i}`;
    reqs.push({
      createShape: {
        objectId: dotId,
        shapeType: 'ELLIPSE',
        elementProperties: elProps(slideId, cx - dotSize / 2, lineY - dotSize / 2 + 1, dotSize, dotSize),
      },
    });
    reqs.push(mkShapeFill(dotId, dotColor));

    const connH = 55;
    const connId = `${slideId}_tc${i}`;
    reqs.push(mkRect(
      connId, slideId,
      cx - 1, above ? lineY - connH : lineY + 3,
      2, connH, dotColor,
    ));
    reqs.push(mkShapeFill(connId, dotColor));

    // 年ラベル
    const yearY = above ? lineY - connH - 18 : lineY + connH + 3;
    const yid = `${slideId}_ty${i}`;
    reqs.push(mkTextBox(yid, slideId, cx - step / 2, yearY, step, 16));
    reqs.push(mkText(yid, evt.year ?? ''));
    reqs.push(mkTextStyle(yid, isHigh ? C.ACCENT_RED : C.ROYAL, 9, true));
    reqs.push({
      updateParagraphStyle: {
        objectId: yid,
        style: { alignment: 'CENTER' },
        fields: 'alignment',
      },
    });

    // イベントラベル
    const labelY = above ? lineY - connH - 45 : lineY + connH + 20;
    const elid = `${slideId}_te${i}`;
    reqs.push(mkTextBox(elid, slideId, cx - step / 2 + 2, labelY, step - 4, 30));
    reqs.push(mkText(elid, evt.label ?? ''));
    reqs.push(mkTextStyle(elid, C.TEXT_DARK, 9));
    reqs.push({
      updateParagraphStyle: {
        objectId: elid,
        style: { alignment: 'CENTER' },
        fields: 'alignment',
      },
    });
  });
}

/** フローチャート（ルート + 子ノード） */
function buildFlowChart(reqs: Req[], slideId: string, vis: AnyVis): void {
  const root: AnyVis = vis.root ?? {};
  const children: AnyVis[] = root.children ?? [];

  const rootW = 200;
  const rootX = (SW - rootW) / 2;
  const rootY = CONTENT_Y + 8;
  const rootH = 42;

  // ルートノード
  const rid = `${slideId}_fc_root`;
  reqs.push(mkRect(rid, slideId, rootX, rootY, rootW, rootH, C.NAVY));
  reqs.push(mkShapeFill(rid, C.NAVY));
  reqs.push(mkTextBox(`${rid}_t`, slideId, rootX, rootY, rootW, rootH));
  reqs.push(mkText(`${rid}_t`, `${root.icon ?? ''}  ${root.label ?? ''}`));
  reqs.push(mkTextStyle(`${rid}_t`, C.TEXT_WHITE, 13, true));
  reqs.push({
    updateParagraphStyle: {
      objectId: `${rid}_t`,
      style: { alignment: 'CENTER', spaceAbove: pt(8) },
      fields: 'alignment,spaceAbove',
    },
  });

  if (children.length === 0) return;

  const childW = Math.min(180, (CONTENT_W - (children.length - 1) * 12) / children.length);
  const totalW = childW * children.length + 12 * (children.length - 1);
  const childStartX = ML + (CONTENT_W - totalW) / 2;
  const childY = rootY + rootH + 40;
  const childH = 40;

  children.forEach((ch, i) => {
    const cx = childStartX + i * (childW + 12);
    const isHigh = ch.highlight === true;
    const fillColor = isHigh ? C.ACCENT_RED : C.ROYAL;

    // 接続線
    const connId = `${slideId}_fc_conn${i}`;
    reqs.push(mkRect(connId, slideId, cx + childW / 2, rootY + rootH, 2, 40, fillColor));
    reqs.push(mkShapeFill(connId, fillColor));

    // 子ノード
    const cnid = `${slideId}_fc_ch${i}`;
    reqs.push(mkRect(cnid, slideId, cx, childY, childW, childH, fillColor));
    reqs.push(mkShapeFill(cnid, fillColor));
    reqs.push(mkTextBox(`${cnid}_t`, slideId, cx, childY, childW, childH));
    reqs.push(mkText(`${cnid}_t`, ch.label ?? ''));
    reqs.push(mkTextStyle(`${cnid}_t`, C.TEXT_WHITE, 11, true));
    reqs.push({
      updateParagraphStyle: {
        objectId: `${cnid}_t`,
        style: { alignment: 'CENTER', spaceAbove: pt(10) },
        fields: 'alignment,spaceAbove',
      },
    });

    // 詳細ボックス
    if (ch.detail?.items) {
      const detailY = childY + childH + 6;
      const items: string[] = (ch.detail.items as string[]).slice(0, 3);
      const detailH = items.length * 22 + 6;
      const did = `${slideId}_fc_det${i}`;
      const detBg = isHigh ? { red: 0.95, green: 0.88, blue: 0.88 } : C.BG_LIGHT;
      reqs.push(mkRect(did, slideId, cx, detailY, childW, detailH, detBg, fillColor));
      reqs.push(mkShapeFill(did, detBg));
      items.forEach((item, ji) => {
        const iid = `${slideId}_fc_di${i}_${ji}`;
        reqs.push(mkTextBox(iid, slideId, cx + 6, detailY + ji * 22 + 4, childW - 12, 20));
        reqs.push(mkText(iid, `• ${item}`));
        reqs.push(mkTextStyle(iid, C.TEXT_DARK, 9));
      });
    }
  });
}

// ─── スライド選定ヘルパー ─────────────────────────────────────────────────────

/** チャプター内の最重要ビジュアルを最大N件選ぶ */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function pickTopVisuals(chapter: AnyVis, maxCount = 3): Array<{ line: AnyVis; vis: AnyVis }> {
  const PRIORITY = ['comparison-table', 'chart', 'stat', 'rich-panel', 'timeline', 'flow-chart'];
  const supported = new Set(PRIORITY);
  const found: Array<{ line: AnyVis; vis: AnyVis; score: number }> = [];

  for (const line of chapter.lines) {
    const vis = line.visual as AnyVis | undefined;
    if (!vis || !supported.has(vis.type)) continue;
    const score = PRIORITY.length - PRIORITY.indexOf(vis.type);
    found.push({ line, vis, score });
  }

  // 同じtype は1件だけ（最初のもの）
  const seen = new Set<string>();
  const deduped = found.filter((f) => {
    if (seen.has(f.vis.type)) return false;
    seen.add(f.vis.type);
    return true;
  });

  return deduped
    .sort((a, b) => b.score - a.score)
    .slice(0, maxCount);
}

/** ビジュアルのアクションタイトルを生成 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function getActionTitle(vis: AnyVis, chartData: Record<string, AnyVis>, chapterTopic: string): string {
  switch (vis.type) {
    case 'stat':
      return vis.label ?? chapterTopic;
    case 'chart': {
      const cd = chartData[vis.key ?? ''];
      return cd?.title ?? chapterTopic;
    }
    case 'rich-panel':
    case 'comparison-table':
    case 'timeline':
    case 'flow-chart':
      return vis.title ?? chapterTopic;
    default:
      return chapterTopic;
  }
}

// ─── Google Slides 生成メイン ─────────────────────────────────────────────────

async function generateSlides(auth: OAuth2Client, script: ScriptInput): Promise<string> {
  const slidesApi = google.slides({ version: 'v1', auth });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const chartData = (script as any).chartData ?? {};

  // プレゼンテーション作成
  console.log('📊 プレゼンテーションを作成中...');
  const { data: pres } = await slidesApi.presentations.create({
    requestBody: { title: script.title },
  });
  const presentationId = pres.presentationId!;
  const titleSlideId = pres.slides![0].objectId!;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const requests: Req[] = [];

  // ── タイトルスライド（白背景） ───────────────────────────────────────────
  requests.push(mkSlideBg(titleSlideId, C.BG_WHITE));

  // 左端ネイビーバー
  const tBarId = 'title_bar';
  requests.push(mkRect(tBarId, titleSlideId, 0, 0, 6, SH, C.NAVY));
  requests.push(mkShapeFill(tBarId, C.NAVY));

  // タイトル（大きく中央配置）
  const tTitleId = 'title_main';
  requests.push(mkTextBox(tTitleId, titleSlideId, 28, SH / 2 - 80, SW - 56, 160));
  requests.push(mkText(tTitleId, script.title));
  requests.push(mkTextStyle(tTitleId, C.NAVY, 32, true, 'Yu Gothic'));
  requests.push(mkParaStyle(tTitleId, 150));

  // 上部アクセントライン
  const tLineId = 'title_line';
  requests.push(mkRect(tLineId, titleSlideId, 28, SH / 2 - 88, 120, 3, C.ROYAL));
  requests.push(mkShapeFill(tLineId, C.ROYAL));

  // ── チャプターごと ────────────────────────────────────────────────────────
  let slideIndex = 1;

  for (let ci = 0; ci < script.chapters.length; ci++) {
    const chapter = script.chapters[ci];
    // CTAチャプターはスライドに含めない
    if (chapter.type === 'cta') continue;
    const topicText = chapter.topic ?? chapter.type;

    // ── チャプター区切りスライド（白地、大見出し） ─────────────────────────
    const divId = `ch_div_${ci}`;
    requests.push({
      createSlide: {
        insertionIndex: slideIndex++,
        objectId: divId,
        slideLayoutReference: { predefinedLayout: 'BLANK' },
      },
    });
    requests.push(mkSlideBg(divId, C.BG_WHITE));

    // 左端ネイビーバー（ページに厚みを出す）
    const dBarId = `${divId}_bar`;
    requests.push(mkRect(dBarId, divId, 0, 0, 6, SH, C.NAVY));
    requests.push(mkShapeFill(dBarId, C.NAVY));

    // 大きな章番号（背景装飾、薄い）
    const dNumId = `${divId}_num`;
    requests.push(mkTextBox(dNumId, divId, SW - 220, -10, 240, 200));
    requests.push(mkText(dNumId, String(ci + 1).padStart(2, '0')));
    requests.push({
      updateTextStyle: {
        objectId: dNumId,
        style: {
          foregroundColor: { opaqueColor: { rgbColor: C.BG_LIGHT } },
          fontSize: pt(180),
          bold: true,
          fontFamily: 'Yu Gothic',
        },
        fields: 'foregroundColor,fontSize,bold,fontFamily',
      },
    });

    // チャプタートピック（大きく）
    const dTopId = `${divId}_topic`;
    requests.push(mkTextBox(dTopId, divId, 28, 80, SW - 260, 160));
    requests.push(mkText(dTopId, topicText));
    requests.push(mkTextStyle(dTopId, C.NAVY, 32, true, 'Yu Gothic'));
    requests.push(mkParaStyle(dTopId, 145));

    // 区切り線
    const dLineId = `${divId}_line`;
    requests.push(mkRect(dLineId, divId, 28, 72, 200, 3, C.ROYAL));
    requests.push(mkShapeFill(dLineId, C.ROYAL));


    // ── コンテンツスライド（ビジュアルごと） ─────────────────────────────
    const topVisuals = pickTopVisuals(chapter as unknown as AnyVis, 3);

    for (const { vis } of topVisuals) {
      const slideId = `ch${ci}_vis_${vis.type}`;
      const actionTitle = getActionTitle(vis, chartData, topicText);

      requests.push({
        createSlide: {
          insertionIndex: slideIndex++,
          objectId: slideId,
          slideLayoutReference: { predefinedLayout: 'BLANK' },
        },
      });
      requests.push(mkSlideBg(slideId, C.BG_WHITE));

      // 左端バー
      const vBarId = `${slideId}_bar`;
      requests.push(mkRect(vBarId, slideId, 0, 0, 6, SH, C.NAVY));
      requests.push(mkShapeFill(vBarId, C.NAVY));

      // アクションタイトル + 下線
      addSlideHeader(requests, slideId, actionTitle);

      // ビジュアル描画
      switch (vis.type) {
        case 'stat':
          buildStat(requests, slideId, vis);
          break;
        case 'chart':
          buildBarChart(requests, slideId, chartData, vis.key ?? '', vis.chartType === 'line');
          break;
        case 'rich-panel':
          buildRichPanel(requests, slideId, vis);
          break;
        case 'comparison-table':
          buildComparisonTable(requests, slideId, vis);
          break;
        case 'timeline':
          buildTimeline(requests, slideId, vis);
          break;
        case 'flow-chart':
          buildFlowChart(requests, slideId, vis);
          break;
      }
    }
  }

  // ── バッチ送信（分割して API 制限を回避） ─────────────────────────────────
  const BATCH_SIZE = 50;
  console.log(`🔄 合計 ${requests.length} リクエストを送信中...`);
  for (let i = 0; i < requests.length; i += BATCH_SIZE) {
    const batch = requests.slice(i, i + BATCH_SIZE);
    await slidesApi.presentations.batchUpdate({
      presentationId,
      requestBody: { requests: batch },
    });
    console.log(`   ${Math.min(i + BATCH_SIZE, requests.length)}/${requests.length} 完了`);
  }

  return `https://docs.google.com/presentation/d/${presentationId}/edit`;
}

// ─── OAuth2 認証（変更なし） ─────────────────────────────────────────────────

function createOAuth2Client(): OAuth2Client {
  const clientId = process.env.YOUTUBE_CLIENT_ID;
  const clientSecret = process.env.YOUTUBE_CLIENT_SECRET;
  if (clientId && clientSecret) {
    return new google.auth.OAuth2(clientId, clientSecret, REDIRECT_URI);
  }
  if (!fs.existsSync(CLIENT_SECRET_PATH)) {
    console.error('❌ OAuth2 認証情報が設定されていません。');
    process.exit(1);
  }
  const raw = JSON.parse(fs.readFileSync(CLIENT_SECRET_PATH, 'utf-8'));
  const { client_id, client_secret } = (raw.installed ?? raw.web) as { client_id: string; client_secret: string };
  return new google.auth.OAuth2(client_id, client_secret, REDIRECT_URI);
}

function saveToken(token: object): void {
  fs.mkdirSync(CREDENTIALS_DIR, { recursive: true });
  fs.writeFileSync(TOKEN_PATH, JSON.stringify(token, null, 2), 'utf-8');
}

async function authorizeWithBrowser(oauth2Client: OAuth2Client): Promise<OAuth2Client> {
  const authUrl = oauth2Client.generateAuthUrl({ access_type: 'offline', scope: SCOPES });
  console.log('\n🔐 ブラウザでGoogleにログインしてください:', authUrl);
  try {
    const { execSync } = await import('child_process');
    if (process.platform === 'win32') execSync(`start "" "${authUrl}"`, { stdio: 'ignore' });
  } catch { /* ignore */ }

  const code = await new Promise<string>((resolve, reject) => {
    const server = http.createServer((req, res) => {
      const url = new URL(req.url!, `http://localhost:${REDIRECT_PORT}`);
      const authCode = url.searchParams.get('code');
      if (authCode) { res.end('<h2>✅ 認証完了！</h2>'); server.close(); resolve(authCode); }
      else { res.end('<h2>❌ エラー</h2>'); reject(new Error('No code')); }
    });
    server.listen(REDIRECT_PORT);
    setTimeout(() => { server.close(); reject(new Error('タイムアウト')); }, 5 * 60 * 1000);
  });

  const { tokens } = await oauth2Client.getToken(code);
  oauth2Client.setCredentials(tokens);
  saveToken(tokens);
  if (tokens.refresh_token) {
    console.log(`\n💡 .env に追加: SLIDES_REFRESH_TOKEN=${tokens.refresh_token}`);
  }
  return oauth2Client;
}

async function authorize(): Promise<OAuth2Client> {
  const oauth2Client = createOAuth2Client();
  const refreshToken = process.env.SLIDES_REFRESH_TOKEN;
  if (refreshToken) {
    oauth2Client.setCredentials({ refresh_token: refreshToken });
    return oauth2Client;
  }
  if (fs.existsSync(TOKEN_PATH)) {
    const token = JSON.parse(fs.readFileSync(TOKEN_PATH, 'utf-8'));
    oauth2Client.setCredentials(token);
    if (token.expiry_date && token.expiry_date < Date.now()) {
      const { credentials } = await oauth2Client.refreshAccessToken();
      oauth2Client.setCredentials(credentials);
      saveToken(credentials);
    }
    return oauth2Client;
  }
  return authorizeWithBrowser(oauth2Client);
}

// ─── エントリポイント ─────────────────────────────────────────────────────────

function parseArgs(): { inputFile: string } {
  const args = process.argv.slice(2);
  let inputFile = path.join(__dirname, '../input/script-input.json');
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--input' && args[i + 1]) inputFile = path.resolve(args[i + 1]);
  }
  return { inputFile };
}

async function main(): Promise<void> {
  const { inputFile } = parseArgs();
  console.log(`\n📂 スクリプト読み込み: ${inputFile}`);
  const script = JSON.parse(fs.readFileSync(inputFile, 'utf-8')) as ScriptInput;
  console.log(`   タイトル: ${script.title}`);

  const auth = await authorize();
  const url = await generateSlides(auth, script);

  console.log('\n✅ Google Slides 生成完了！');
  console.log(`   URL: ${url}`);
}

main().catch((err: unknown) => {
  console.error('❌ エラー:', err instanceof Error ? err.message : String(err));
  process.exit(1);
});
