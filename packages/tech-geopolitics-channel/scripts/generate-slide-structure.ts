/**
 * generate-slide-structure.ts
 *
 * リサーチ結果から Claude Design 用スライド構造 JSON を生成する。
 * 出力 JSON は:
 *   1. Claude Design へのスライド設計指示として使う
 *   2. generate-script.ts --from-slides で台本生成の文脈として使う
 *
 * 使い方:
 *   npx ts-node --transpile-only scripts/generate-slide-structure.ts \
 *     --topic "トピック名" \
 *     --ep ep019 \
 *     [--research-file input/ep019_research.md] \
 *     [--with-exa]
 *
 * 出力: input/{epId}-slides.json
 */

import * as dotenv from 'dotenv';
import * as path from 'path';
import * as fs from 'fs';

dotenv.config({ path: path.join(__dirname, '..', '.env'), override: true });

import { createLogger } from '@money-video/shared-ts';
import { AnthropicClient } from '@money-video/adapters/llm';
import { ExaTopicResearcher } from '@money-video/adapters/research';

interface Args {
  topic: string;
  epId: string;
  researchFile?: string;
  withExa: boolean;
}

function parseArgs(argv: string[]): Args {
  const get = (flag: string, alt?: string): string | undefined => {
    const i = argv.indexOf(flag);
    if (i >= 0 && argv[i + 1]) return argv[i + 1];
    if (alt) {
      const j = argv.indexOf(alt);
      if (j >= 0 && argv[j + 1]) return argv[j + 1];
    }
    return undefined;
  };

  const topic = get('--topic');
  if (!topic) {
    // eslint-disable-next-line no-console
    console.error(
      '使い方: npx ts-node --transpile-only scripts/generate-slide-structure.ts --topic "トピック名" [--ep epXXX] [--research-file input/epXXX_research.md] [--with-exa]',
    );
    process.exit(1);
  }
  return {
    topic,
    epId: get('--ep') ?? 'ep_draft',
    researchFile: get('--research-file', '-r'),
    withExa: argv.includes('--with-exa'),
  };
}

const SLIDE_SYSTEM_PROMPT = `
あなたはYouTube解説動画のスライド構成設計の専門家です。
テクノロジー投資×地政学チャンネル向けに、10〜12枚のスライド構成をJSON形式で出力してください。

## ターゲット視聴者
30〜60代の個人投資家（特に老後資金に不安を持つ会社員）。
「明日の投資判断に使える具体的情報」を求めている。
エントリー価格帯・上昇トリガー・撤退シナリオの3要素を必ず含める。

## 出力形式（JSONのみ。コードブロック不要）

{
  "ep": "epXXX",
  "topic": "トピック",
  "title": "動画タイトル候補（30文字以内・損回避/断定型・王道KWを先頭20字に）",
  "generatedAt": "YYYY-MM-DD",
  "slides": [
    {
      "index": 1,
      "role": "hook | explanation | analysis | summary | cta",
      "title": "スライドタイトル（20文字以内）",
      "subTitle": "サブタイトル（省略時は空文字）",
      "leadText": "見出し下のリード文（2〜3行、32pxグレー表示。chartType使用時のみ）",
      "keyFacts": ["重要な事実1", "重要な事実2"],
      "numbers": [{"label": "ラベル", "value": "95%", "unit": "輸入割合"}],
      "chartType": "bar | line | pie | none",
      "chartData": [{"label": "項目A", "value": 95, "color": "#ff6b35"}],
      "visual": { ... },
      "speakerHint": "ぽんちゃんのセリフヒント（60文字以上）",
      "maroHint": "まろくんの疑問ヒント（省略可）"
    }
  ]
}

## カスタムビジュアルタイプ（visualフィールド）

chartType:none のスライドには必ず以下のいずれかのvisualを設定すること。
chartType:bar/pie のスライドは chartType+chartData+leadText で表現し、visualは不要。

### vs-battle（2択対比型）
台詞キーワード: 「AとB」「比べる」「どっちが」「対立」「違い」「旧モデルvs新モデル」
\`\`\`json
{
  "type": "vs-battle",
  "title": "タイトル",
  "left": {"header": "左側ラベル", "headerColor": "red", "lines": ["行1", "行2", "行3"], "highlight": "強調テキスト", "highlightColor": "#D84315"},
  "right": {"header": "右側ラベル", "headerColor": "blue", "lines": ["行1", "行2", "行3"], "highlight": "強調テキスト", "highlightColor": "#1976D2"},
  "footer": "補足テキスト"
}
\`\`\`

### color-cards（3項目カード型）
台詞キーワード: 「3つ」「ポイント」「今日わかること」「3選」「理由」「シナリオ」
\`\`\`json
{
  "type": "color-cards",
  "title": "タイトル",
  "cards": [
    {"header": "① ヘッダー", "headerColor": "blue", "lines": ["行1", "行2", "行3"], "highlight": "強調テキスト", "highlightColor": "#1976D2"},
    {"header": "② ヘッダー", "headerColor": "blue", "lines": ["行1", "行2", "行3"], "highlight": "強調テキスト", "highlightColor": "#1976D2"},
    {"header": "③ ヘッダー", "headerColor": "red", "lines": ["行1", "行2", "行3"], "highlight": "強調テキスト", "highlightColor": "#D84315"}
  ],
  "footer": "フッターテキスト"
}
\`\`\`

### step-icons（手順・フロー型）
台詞キーワード: 「ステップ」「手順」「流れ」「プロセス」「アクションプラン」「〜したら〜する」
\`\`\`json
{
  "type": "step-icons",
  "title": "タイトル",
  "steps": [
    {"number": 1, "label": "ステップ名", "icon": "🚀", "body": "説明文（1〜2文）", "color": "blue|green|orange|red"},
    {"number": 2, "label": "ステップ名", "icon": "🎯", "body": "説明文", "color": "green"},
    {"number": 3, "label": "ステップ名", "icon": "⚠️", "body": "説明文", "color": "red"}
  ],
  "footer": "補足テキスト"
}
\`\`\`

### data-table（比較表型）
台詞キーワード: 「一覧」「比較」「それぞれ」「〇社を比べると」「影響をまとめると」「整理すると」
\`\`\`json
{
  "type": "data-table",
  "title": "タイトル",
  "labelHeader": "比較項目",
  "columns": [
    {"label": "列A", "highlight": true},
    {"label": "列B"}
  ],
  "rows": [
    {"label": "行ラベル", "cells": [{"value": "値A", "color": "#1976D2"}, {"value": "値B"}]}
  ],
  "note": "出典・免責"
}
\`\`\`

### bar-diff（差分強調棒グラフ型）
台詞キーワード: 「差が開いた」「大きく上昇」「急騰」「CAGR」「成長率」「市場規模が〇倍」
\`\`\`json
{
  "type": "bar-diff",
  "title": "タイトル",
  "insight": "右パネルの説明文（2〜3文）",
  "cagrLabel": "CAGR +40%（省略可）",
  "diff": {"from": "旧ラベル（data[].labelと完全一致）", "to": "新ラベル", "label": "+204%", "color": "#1976D2"},
  "data": [{"label": "ラベル", "value": 535, "color": "#888888"}]
}
\`\`\`

### donut-center（ドーナツ中央強調型）
台詞キーワード: 「シェア」「占有率」「割合」「構成比」「どれくらいの比率」
\`\`\`json
{
  "type": "donut-center",
  "title": "タイトル",
  "centerValue": "50%",
  "centerLabel": "ラベル（2行まで）",
  "insight": "右パネル説明文",
  "data": [{"label": "ラベル（強調1区分）", "value": 50, "color": "#1976D2"}, {"label": "その他", "value": 50, "color": "#888888"}]
}
\`\`\`

### feature-matrix（ポジショニングマトリクス型）★推奨ハイライト
台詞キーワード: 「ポジション」「競合比較」「AとBの位置」「象限」「マトリクスで見ると」「どこに位置する」
\`\`\`json
{
  "type": "feature-matrix",
  "title": "タイトル",
  "xLabel": "← リスク低　　リスク高 →",
  "yLabel": "↑ 成長率高　低 ↓",
  "quadrantLabels": ["安定高成長", "高リスク高成長", "安定低成長", "撤退候補"],
  "items": [
    {"label": "NVIDIA", "x": 70, "y": 85, "highlight": true, "note": "推奨"},
    {"label": "Intel", "x": 40, "y": 35, "color": "#6b7280"},
    {"label": "AMD", "x": 55, "y": 65, "color": "#7c3aed"}
  ],
  "footer": "注: 相対評価（2026年時点）"
}
\`\`\`

### highlight-checklist（推奨列強調チェックリスト型）★推奨ハイライト
台詞キーワード: 「比べると」「どちらが優れている」「選ぶなら」「機能比較」「証券会社比較」「商品比較」
\`\`\`json
{
  "type": "highlight-checklist",
  "title": "タイトル",
  "columns": [
    {"label": "SBI証券", "recommended": true, "badge": "最推奨", "badgeColor": "#059669"},
    {"label": "楽天証券"},
    {"label": "松井証券"}
  ],
  "rows": [
    {"label": "新NISA対応", "values": ["✓", "✓", "✓"]},
    {"label": "外国株銘柄数", "values": ["6,000+", "3,000+", "なし"]},
    {"label": "積立頻度", "values": ["毎日/毎月", "毎日/毎月", "毎月のみ"]}
  ],
  "note": "2026年6月時点"
}
\`\`\`

### ranked-cards（ランキングカード型）★推奨ハイライト
台詞キーワード: 「ランキング」「順位をつけると」「最もおすすめ」「第1位」「トップ3」「どれが一番」
\`\`\`json
{
  "type": "ranked-cards",
  "title": "タイトル",
  "cards": [
    {"rank": 1, "label": "S&P500", "badge": "最推奨", "badgeColor": "#059669", "highlight": true, "points": ["CAGR+14%", "分散効果◎", "流動性高"]},
    {"rank": 2, "label": "オルカン", "points": ["CAGR+12%", "全世界分散", "新興国リスクあり"]},
    {"rank": 3, "label": "FANG+", "points": ["CAGR+20%", "集中投資型", "ボラティリティ高"]}
  ],
  "footer": "過去実績は将来を保証しません"
}
\`\`\`

### stacked-share（積み上げ棒グラフ型）
台詞キーワード: 「内訳」「構成が変わった」「〇%から〇%へ」「セクター推移」「ポートフォリオ推移」「割合が増えた」
\`\`\`json
{
  "type": "stacked-share",
  "title": "タイトル",
  "insight": "右パネルの説明文（2〜3文）",
  "highlightSegment": "テクノロジー",
  "xLabels": ["2020年", "2022年", "2024年"],
  "segments": [
    {"label": "テクノロジー", "color": "#0a72ef", "values": [25, 28, 32]},
    {"label": "ヘルスケア", "color": "#059669", "values": [14, 13, 12]},
    {"label": "その他", "color": "#9ca3af", "values": [61, 59, 56]}
  ],
  "unit": "%",
  "note": "出典: S&P Global"
}
\`\`\`

## ゾーン別ビジュアル配置ルール

| role | 推奨visual | chartType |
|------|-----------|-----------|
| hook 1枚目 | なし（chartType:bar推奨／speakerHintにガーコ式挨拶） | bar |
| hook 2枚目 | vs-battle or feature-matrix | none |
| hook 3枚目（目次） | color-cards（3選） | none |
| explanation | vs-battle / bar-diff / donut-center / stacked-share | bar/pie/none |
| analysis | data-table / highlight-checklist / ranked-cards / feature-matrix / step-icons | bar/pie/none |
| summary | step-icons / ranked-cards（アクションプラン）| none |
| cta | なし（chartType:none） | none |

## スライド枚数の目安
- hook: 3枚（衝撃数字→比較or解説→今日わかること3選）
- explanation: 4〜6枚（背景・仕組み・理由）
- analysis: 4〜6枚（投資影響・銘柄・価格帯・撤退）
- summary: 2枚（まとめ・アクションプラン）
- cta: 1枚

## スライド設計の原則
1. 1スライド = 1メッセージ
2. chartType:none のスライドには必ずvisualを設定する（noneのままにしない）
3. hook目次スライドは必ずcolor-cards（3選形式）
4. analysisには必ずエントリー価格・目標値・撤退ラインを含める
5. 数値は実在する信憑性のある数値（架空禁止）
6. speakerHintはぽんちゃんが実際に話す内容の骨格（60文字以上）
7. leadTextはchartType使用スライドのみ設定（visual使用スライドには不要）
8. **hook 1枚目の speakerHint は必ず『こんにちは、ぽんちゃんです。』で始める**（ガーコちゃんねる式定型挨拶）。続けて緊急性/問いかけ（「皆さま、大変です」「突然ですが〇〇をご存知でしょうか」等）＋『地政学の動きから具体的な投資判断・エントリー価格まで落とし込んでお話しいたします』（チャンネル価値提案句・固定）＋損失回避KW（大損/暴落/罠/超進化等）を含め、丁寧語で80文字以上にする。衝撃数字は2枚目以降に置く
9. **ビジュアルタイプの多様性保証**: vs-battle / data-table はエピソード全体で最大3回まで。同じゾーン内（explanation複数枚・analysis複数枚）で同じビジュアルタイプを2回連続して使わない
10. **titleは結論を一文で（コンサル品質ヘッドメッセージ）**: 名詞止め・「〜について」禁止。事実はボディ（lines/cells/data）に置き、示唆（だから何が言えるか）をtitleまたはinsight/footerに書く。1スライド=1メッセージ
11. **本文は箇条書きの羅列にしない**: 順序/比較/分類/問題解決/因果/ピラミッドのいずれかの構造で組む（linesは構造内の補足列挙のみ・各カード3行以内）
12. **色は6色パレット厳守**: メインブルー#1976D2（注目/自社/主系列）・朱#D84315（強調キーワード/課題/減少のみ・1スライド1〜2箇所まで・乱用禁止）・濃グレー#222222（本文）・サブグレー#888888（中立/非強調）。headerColorは "blue"/"red" などの色名で指定（システムがパレットへ自動変換）。緑・橙・紫・金などパレット外の色は使わない
13. **数値には可能なら出典（出所・期間）をnote/footerに添える**（架空の出典は書かない）

## デザイン・アンチパターン（禁止事項）

以下のパターンはスライド品質を著しく下げるため、**絶対に使用しない**こと。

| # | アンチパターン | 具体的な禁止事項 |
|---|---------------|----------------|
| AP-01 | **汎用タイトル禁止** | 「〇〇について」「〇〇の解説」「現状まとめ」など名詞止め・トピックラベル止めは使わない。titleは必ず「だから何か（So What）」を含む示唆・結論・断言の一文にする（原則10の強化）|
| AP-02 | **箇条書き羅列禁止** | ビジュアル要素（チャート・テーブル・フレームワーク・コールアウト）が2つ未満のスライドは不可。linesのみで構成されたスライドは必ずvisualまたはchartTypeを追加する |
| AP-03 | **フォントファミリー混在禁止** | フォント指定は 'Noto Sans JP' 1種のみ。3種類以上のfont-familyを混在させない。英語・日本語混在スライドでも同一フォントファミリーを使用する |
| AP-04 | **出典なしチャート禁止** | chartType:bar/line/pie を使うスライドは note または leadText に必ず出典（情報源・期間）を記載する。「出典不明」も可。架空の出典は絶対に書かない |
| AP-05 | **詰め込みレイアウト禁止** | 1スライドに情報を詰め込まない。linesは各カード3行以内・rowsは最大6行・ビジュアル要素は1スライド1種類に絞り、余白を意識したレイアウトにする |
| AP-06 | **パレット外高彩度色禁止** | 原則12の6色パレット（#1976D2・#D84315・#222222・#888888・#E8F4FB・#E0E0E0）以外の明るい・彩度の高い色（緑・橙・紫・金・ピンク等）は使わない |
| AP-07 | **情報を伝えない装飾禁止** | 意味を持たない絵文字・アイコンの羅列・グラデーション背景・装飾的な罫線・バッジの多用は禁止。すべての要素が情報伝達に貢献すること |
| AP-08 | **テキストのみスライド禁止** | チャート・テーブル・フレームワーク・コールアウトのうち最低2要素を含めること。例外はCTAスライドのみ |
| AP-09 | **日本語レンダリング非考慮フォント禁止** | Helvetica・Arialなど日本語グリフを持たないフォントを主フォントに指定しない。必ず 'Noto Sans JP' を先頭に指定する |
| AP-10 | **英日混在フォントサイズ不統一禁止** | 英語テキストと日本語テキストが混在する場合、視覚的な重みが均等になるよう同一font-sizeを使用する。英語テキストが相対的に大きく見える場合は同じ値でも構わない（Noto Sans JPは英語グリフも含むため自動調整される）|
`.trim();

// ── アンチパターンチェック（AP-01〜AP-08）────────────────────────────────────

interface ApViolation {
  rule: string;
  slide: string;
  detail: string;
}

const PALETTE_OK = new Set([
  '#1976d2', '#1565c0', '#d84315', '#888888', '#e8f4fb', '#222222',
  '#e0e0e0', '#b0bec5', '#90a4ae', '#cfd8dc', '#ffffff', '#fff',
  'blue', 'red', 'gray', 'grey', 'white', 'black',
]);

const GENERIC_TITLE_RE = /(について|の解説|概要|現状|紹介|とは|一覧)\s*$|^(まとめ|概要|背景|現状|解説|紹介)\s*$/u;

function isOutsidePalette(color: unknown): boolean {
  if (!color || typeof color !== 'string') return false;
  const c = color.toLowerCase().trim();
  if (PALETTE_OK.has(c)) return false;
  return /^#[0-9a-f]{3,8}$/.test(c);
}

function collectColorValues(obj: unknown, keys: string[]): string[] {
  if (!obj || typeof obj !== 'object') return [];
  const results: string[] = [];
  for (const [k, v] of Object.entries(obj as Record<string, unknown>)) {
    if (keys.includes(k) && typeof v === 'string') results.push(v);
    results.push(...collectColorValues(v, keys));
  }
  return results;
}

function countEmoji(text: string): number {
  return (text.match(/\p{Emoji_Presentation}/gu) ?? []).length;
}

function runAntiPatternCheck(parsed: unknown): ApViolation[] {
  const slides = (parsed as { slides?: unknown[] }).slides ?? [];
  const violations: ApViolation[] = [];
  const colorKeys = ['color', 'highlightColor', 'cardColor', 'headerColor', 'badgeColor', 'labelColor'];

  slides.forEach((raw, i) => {
    const slide = raw as Record<string, unknown>;
    const sid = `slide[${i + 1}] role=${slide['role'] ?? '?'} title="${String(slide['title'] ?? '').slice(0, 20)}"`;
    const v = slide['visual'] as Record<string, unknown> | undefined;
    const ct = slide['chartType'] as string | undefined;
    const isCTA = slide['role'] === 'cta';
    const isHook = slide['role'] === 'hook';

    // AP-01: 汎用タイトル
    const title = String(slide['title'] ?? '').trim();
    if (title && GENERIC_TITLE_RE.test(title)) {
      violations.push({ rule: 'AP-01', slide: sid, detail: `汎用タイトル: 「${title}」` });
    }

    // AP-02: chartType:none かつ visual なし (CTA除く)
    if (!isCTA && (!ct || ct === 'none') && !v) {
      violations.push({ rule: 'AP-02', slide: sid, detail: 'chartType:none かつ visual 未設定（空スライド）' });
    }

    // AP-04: bar/line/pie チャートで note/leadText なし
    if (ct && ct !== 'none' && !slide['note'] && !slide['leadText']) {
      violations.push({ rule: 'AP-04', slide: sid, detail: `chartType:${ct} で note/leadText に出典なし` });
    }

    // AP-05: カード内 lines が 4行以上
    const cards = (v ? ((v['cards'] ?? v['steps'] ?? []) as unknown[]) : []);
    (cards as Record<string, unknown>[]).forEach((card, ci) => {
      const lines = ((card['lines'] ?? card['points'] ?? []) as unknown[]);
      if (lines.length > 3) {
        violations.push({ rule: 'AP-05', slide: sid, detail: `card[${ci + 1}] に lines ${lines.length}行（上限3行）` });
      }
    });

    // AP-05: data-table rows が 7行以上
    const rows = (v ? (v['rows'] as unknown[] ?? []) : []);
    if (rows.length > 6) {
      violations.push({ rule: 'AP-05', slide: sid, detail: `rows ${rows.length}件（上限6行）` });
    }

    // AP-06: パレット外の色
    collectColorValues(slide, colorKeys).forEach(c => {
      if (isOutsidePalette(c)) {
        violations.push({ rule: 'AP-06', slide: sid, detail: `パレット外の色: ${c}` });
      }
    });

    // AP-07: 絵文字の過剰使用（5個以上）
    const emojiCount = countEmoji(JSON.stringify(slide));
    if (emojiCount >= 5) {
      violations.push({ rule: 'AP-07', slide: sid, detail: `絵文字 ${emojiCount}個（5個以上は装飾過多）` });
    }

    // AP-08: ビジュアル要素数 < 2（CTA・hook以外）
    if (!isCTA && !isHook) {
      let count = 0;
      if (v) count++;
      if (ct && ct !== 'none') count++;
      if (((slide['keyFacts'] as unknown[]) ?? []).length > 0) count++;
      if (((slide['numbers'] as unknown[]) ?? []).length > 0) count++;
      if (count < 2) {
        violations.push({ rule: 'AP-08', slide: sid, detail: `ビジュアル要素数 ${count}個（最低2要素必要）` });
      }
    }
  });

  return violations;
}

// ─────────────────────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));
  const logger = createLogger({ name: 'generate-slide-structure', level: 'info' });

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    logger.fatal('ANTHROPIC_API_KEY が設定されていません');
    process.exit(1);
  }

  const packageRoot = path.resolve(__dirname, '..');
  const inputDir = path.join(packageRoot, 'input');

  let researchFile = args.researchFile;

  if (args.withExa) {
    const exaApiKey = process.env['EXA_API_KEY'] ?? '';
    const researcher = new ExaTopicResearcher(exaApiKey);
    logger.info({ topic: args.topic }, '[Exa] リサーチ開始...');
    const { markdown, sourceCount } = await researcher.research(args.topic, args.epId);
    const researchPath = path.join(inputDir, `${args.epId}_research.md`);
    fs.writeFileSync(researchPath, markdown, 'utf-8');
    logger.info({ sourceCount, researchPath }, '[Exa] リサーチ完了');
    researchFile = `input/${args.epId}_research.md`;
  }

  let researchContext = '';
  if (researchFile) {
    const absPath = path.join(packageRoot, researchFile);
    if (fs.existsSync(absPath)) {
      researchContext = fs.readFileSync(absPath, 'utf-8');
      logger.info({ researchFile, chars: researchContext.length }, 'リサーチファイル読み込み完了');
    }
  }

  const today = new Date().toLocaleDateString('ja-JP', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const userPrompt = `今日の日付: ${today}
エピソードID: ${args.epId}
トピック: ${args.topic}
${researchContext ? `\n## リサーチ結果\n${researchContext}\n` : ''}
上記のトピックで、Claude Designで作成するスライドの構成JSONを生成してください。
10〜12枚のスライドで、各スライドのspeakerHintは台本生成に使います。
JSONのみ出力してください（コードブロック不要）。`;

  // extended output beta (128k) を使用して JSON 出力の切れを防ぐ
  const AnthropicSDK = (await import('@anthropic-ai/sdk')).default;
  const anthropic = new AnthropicSDK({ apiKey });
  logger.info({ topic: args.topic, epId: args.epId }, 'スライド構造生成開始...');

  const startMs = Date.now();
  const message = await anthropic.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 16000,
    system: [{ type: 'text', text: SLIDE_SYSTEM_PROMPT, cache_control: { type: 'ephemeral' } }],
    messages: [{ role: 'user', content: userPrompt }],
  }, {
    headers: { 'anthropic-beta': 'output-128k-2025-02-19' },
  });
  const firstBlock = message.content[0];
  const completion = {
    text: firstBlock && firstBlock.type === 'text' ? firstBlock.text : '',
    inputTokens: message.usage.input_tokens,
    outputTokens: message.usage.output_tokens,
  };
  const elapsedMs = Date.now() - startMs;

  let parsed: unknown;
  try {
    const jsonText = completion.text
      .replace(/^```json\n?/, '')
      .replace(/\n?```$/, '')
      .trim();
    parsed = JSON.parse(jsonText);
  } catch {
    logger.error({ text: completion.text.slice(0, 500) }, 'JSON parse 失敗');
    process.exit(1);
  }

  const outputPath = path.join(inputDir, `${args.epId}-slides.json`);
  fs.writeFileSync(outputPath, JSON.stringify(parsed, null, 2), 'utf-8');

  const slideCount = (parsed as { slides?: unknown[] }).slides?.length ?? 0;
  logger.info(
    {
      outputPath,
      slideCount,
      inputTokens: completion.inputTokens,
      outputTokens: completion.outputTokens,
      elapsedMs,
    },
    'スライド構造生成完了',
  );

  // ── アンチパターン自動チェック（AP-01〜AP-08）────────────────────────────
  const apViolations = runAntiPatternCheck(parsed);
  const apSummary = apViolations.length === 0
    ? '🟢 AP-CHECK PASS — 全10ルール準拠'
    : `🔴 AP-CHECK FAIL — ${apViolations.length}件の違反:\n${apViolations.map(v => `   ❌ ${v.rule} ${v.slide}: ${v.detail}`).join('\n')}`;
  // ─────────────────────────────────────────────────────────────────────────

  // eslint-disable-next-line no-console
  console.log(`
✅ スライド構造 JSON を生成しました: ${outputPath}
   スライド数: ${slideCount}枚

${apSummary}

📋 次のステップ:
1. ${outputPath} の内容を Claude Design に渡してスライドを作成する
2. 各スライドを JPEG でエクスポートして public/images/${args.epId}/ に配置する
   命名規則: slide-01.jpg, slide-02.jpg ...
3. 台本生成:
   npx ts-node --transpile-only scripts/generate-script.ts \\
     --topic "${args.topic}" \\
     --ep ${args.epId} \\
     --from-slides input/${args.epId}-slides.json
`);
}

main().catch((err: unknown) => {
  const logger = createLogger({ name: 'generate-slide-structure', level: 'error' });
  const message = err instanceof Error ? err.message : String(err);
  logger.fatal({ err: message }, 'generate-slide-structure: fatal');
  process.exit(1);
});
