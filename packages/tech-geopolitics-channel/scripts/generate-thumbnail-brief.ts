/**
 * scripts/generate-thumbnail-brief.ts
 * サムネイル制作ブリーフを自動生成するスクリプト
 *
 * 使い方:
 *   npx ts-node scripts/generate-thumbnail-brief.ts input/script-input.json
 *   npx ts-node scripts/generate-thumbnail-brief.ts input/ep003.json -o output/ep003_thumbnail.md
 */

import * as fs from 'fs';
import * as path from 'path';

// ─── CLI ────────────────────────────────────────
const args = process.argv.slice(2);
if (args.length === 0) {
  console.error('使い方: npx ts-node scripts/generate-thumbnail-brief.ts <input.json> [-o output.md] [--follow-winners]');
  process.exit(1);
}

const inputPath = path.resolve(args[0]!);
const outFlagIdx = args.indexOf('-o');
let outputPath: string | null = outFlagIdx >= 0 ? path.resolve(args[outFlagIdx + 1]!) : null;
const FOLLOW_WINNERS = args.includes('--follow-winners');

// ─── winning-patterns.json 読み込み ─────────────
interface ThumbnailWinPattern {
  analyzedAt: string;
  totalVideosAnalyzed: number;
  thumbnailPatterns: {
    colorScheme: string;
    textDensity: string;
    composition: string;
    facesPresent: boolean;
    numberHighlight: boolean;
    commonElements: string[];
    avoidElements: string[];
  };
  structureInsights: string[];
  recommendedHooks: string[];
}

function loadWinningPatterns(): ThumbnailWinPattern | null {
  const patternsPath = path.resolve(__dirname, '..', '..', '..', 'knowledge', 'winning-patterns.json');
  if (!fs.existsSync(patternsPath)) return null;
  try {
    return JSON.parse(fs.readFileSync(patternsPath, 'utf8')) as ThumbnailWinPattern;
  } catch {
    return null;
  }
}

const winningPatterns = FOLLOW_WINNERS ? loadWinningPatterns() : null;
if (FOLLOW_WINNERS) {
  if (winningPatterns) {
    console.log(`✅ 勝ちパターン読み込み済み (${winningPatterns.totalVideosAnalyzed}件分析, ${winningPatterns.analyzedAt.slice(0, 10)})`);
  } else {
    console.warn('⚠️  winning-patterns.json が見つかりません。通常モードで生成します');
    console.warn('   先に: npx ts-node --transpile-only scripts/analyze-winning-patterns.ts');
  }
}

// ─── 型定義（最小限） ────────────────────────────
interface ChartDataPoint { label: string; value: number; color?: string }
interface ChartDataSet { title?: string; chartType?: string; data: ChartDataPoint[] }
interface Visual { type: string; text?: string; value?: string; label?: string; [k: string]: unknown }
interface ScriptLine { speaker: string; text: string; emotion: string; visual?: Visual }
interface Chapter { type: string; topic?: string; duration: number; lines: ScriptLine[] }
interface ScriptInput {
  videoId: string;
  seed: string;
  title: string;
  description: string;
  tags: string[];
  chapters: Chapter[];
  chartData?: Record<string, ChartDataSet | ChartDataPoint[]>;
}

// ─── VariationEngine（インライン） ───────────────
type ThemeType = 'midnight-blue' | 'forest-green' | 'warm-sunset' | 'arctic-white' | 'crimson-dark';
const THEMES: ThemeType[] = ['midnight-blue', 'forest-green', 'warm-sunset', 'arctic-white', 'crimson-dark'];

function hashSeed(seed: string): number {
  let hash = 5381;
  for (let i = 0; i < seed.length; i++) {
    hash = ((hash << 5) + hash) ^ seed.charCodeAt(i);
    hash = hash >>> 0;
  }
  return hash;
}

function pick<T>(arr: T[], hash: number, offset: number): T {
  return arr[Math.abs((hash + offset * 2654435769) >>> 0) % arr.length]!;
}

const THEME_INFO: Record<ThemeType, { bg: string; accent: string; text: string; mood: string; colorDesc: string }> = {
  'midnight-blue':  { bg: '#0a0a1a', accent: '#0f3460', text: '#e0e0ff', mood: '知性的・神秘的・深夜感', colorDesc: '深紺 + ネイビーブルー' },
  'forest-green':   { bg: '#0a1a0a', accent: '#2d6a2d', text: '#e0ffe0', mood: '自然・落ち着き・信頼感', colorDesc: '深緑 + フォレストグリーン' },
  'warm-sunset':    { bg: '#1a0a00', accent: '#c0622a', text: '#ffe8d0', mood: '緊迫・エネルギー・危機感', colorDesc: '暗橙 + バーントオレンジ' },
  'arctic-white':   { bg: '#f5f8fc', accent: '#4a8fc4', text: '#1a2a3a', mood: '清潔・信頼・データドリブン', colorDesc: 'オフホワイト + スチールブルー' },
  'crimson-dark':   { bg: '#1a0000', accent: '#c42a2a', text: '#ffe0e0', mood: '警告・緊急・重大事態', colorDesc: '暗赤 + クリムゾン' },
};

// ─── メイン処理 ──────────────────────────────────

const data = JSON.parse(fs.readFileSync(inputPath, 'utf-8')) as ScriptInput;
const hash = hashSeed(data.seed);
const themeName = pick(THEMES, hash, 0);
const theme = THEME_INFO[themeName];

// hookチャプターを抽出
const hookChapter = data.chapters.find((c) => c.type === 'hook') ?? data.chapters[0]!;

// メインの数字・キーワードを抽出
const keyNumbers: string[] = [];
const keyKeywords: string[] = [];

data.chapters.forEach((ch) => {
  ch.lines.forEach((line) => {
    const v = line.visual;
    if (!v) return;
    if (v.type === 'stat' && v.value) keyNumbers.push(`${v.value}（${v.label ?? ''}）`);
    if (v.type === 'keyword' && v.text) keyKeywords.push(v.text as string);
    if (v.type === 'highlight' && v.text) keyKeywords.push(v.text as string);
  });
});

// chartData から最大値を持つ数値を抽出
const chartHighlights: string[] = [];
if (data.chartData) {
  Object.entries(data.chartData).forEach(([key, ds]) => {
    const dataset = Array.isArray(ds) ? ds : ds.data;
    if (!dataset?.length) return;
    const max = dataset.reduce((a, b) => (a.value > b.value ? a : b));
    const chartTitle = Array.isArray(ds) ? key : (ds.title ?? key);
    chartHighlights.push(`${chartTitle}: **${max.label}** (${max.value})`);
  });
}

// hookの最初のセリフ（掴み文）
const hookOpeningLine = hookChapter.lines[0]?.text ?? '';

// 主要数字（優先: stat > keyword > hook text から推測）
const topNumber = keyNumbers[0] ?? '';
const topKeyword = keyKeywords[0] ?? data.title;

// タグからキーワード
const topTags = data.tags.slice(0, 5).join('、');

// 出力ファイルパス
if (!outputPath) {
  const outputDir = path.resolve('output');
  if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });
  outputPath = path.join(outputDir, `${data.videoId}_thumbnail-brief.md`);
}

// ─── ブリーフ本文生成 ────────────────────────────

const brief = `# サムネイル制作ブリーフ — ${data.videoId}

> 自動生成: ${new Date().toLocaleDateString('ja-JP')}
> 入力ファイル: ${path.basename(inputPath)}

---

## 📋 エピソード基本情報

| 項目 | 内容 |
|------|------|
| **タイトル** | ${data.title} |
| **テーマカラー** | ${themeName} |
| **カラーパレット** | ${theme.colorDesc} |
| **雰囲気** | ${theme.mood} |
| **背景色** | \`${theme.bg}\` |
| **アクセント色** | \`${theme.accent}\` |
| **キーワード** | ${topTags} |

### 強調すべき数字・キーワード

${keyNumbers.length > 0 ? keyNumbers.map((n) => `- 📊 ${n}`).join('\n') : '- （stat ビジュアルなし）'}

${keyKeywords.length > 0 ? keyKeywords.slice(0, 5).map((k) => `- 🔑 ${k}`).join('\n') : ''}

### チャートハイライト

${chartHighlights.length > 0 ? chartHighlights.map((c) => `- ${c}`).join('\n') : '- （chartData なし）'}

### フック冒頭セリフ（掴み文）

> 「${hookOpeningLine}」

---

## 🏆 Google Flow — ガーコスタイル（文字主役型・2026-05-30 正式採用）⭐最優先

> **新標準フロー（2026-05-30確立）**: 文字が面積の70-80%を占める純テキスト主役スタイル。
> ガーコちゃんねる（46万登録・直近平均18万再生）の最高CTRパターンを踏襲。
> Google Flow にプロンプトをそのままペーストして生成できる完全版。

### ガーコスタイル 案1 — 損回避・警告型（最推奨）

\`\`\`
${getGarkoStyle1(data)}
\`\`\`

---

### ガーコスタイル 案2 — VS比較対立型

\`\`\`
${getGarkoStyle2(data)}
\`\`\`

---

## 🎨 バリエーション A — 「衝撃の数字 × 人物写真」構成

### コンセプト
**大数字＋実在有名人の顔写真（右半分）で「信頼性＋インパクト」を同時に演出する構成。** 競合チャンネル調査で最高CTRを記録したパターン。

> **⚠️ 人物写真の取り扱いルール**
> - トランプ大統領・マスク・ジェンスン・ファン・習近平など**公人の報道写真**は解説・批評目的で使用可
> - AFP/Reuters/AP等のプレス写真をライセンス済み素材として使うか、スクリーンショット引用（フェアユース）で対応
> - AI生成では人物写真は作らない（幻覚リスク）→ Canvaで手動合成すること
> - 芸能タレント・俳優は避ける（パブリシティ権リスク）。政治家・経営者（公人）は許容範囲

### レイアウト指示

\`\`\`
┌─────────────────────────────────────────┐
│  [背景: 暗いシネマティック写真/地図]     │
│                                          │
│  ██████████████    ┌─────────────────┐  │
│  ${(topNumber || topKeyword).padEnd(12).slice(0, 12)} ← 特大数字   │ [人物写真:      │  │
│  （左〜中央）      │ 政治家/CEO      │  │
│                    │ 右半分に大きく] │  │
│  [タイトル: 2行]   └─────────────────┘  │
└─────────────────────────────────────────┘
\`\`\`

### テキストオーバーレイ（Canva/Photoshop で配置）

| 要素 | テキスト | フォントサイズ | 色 |
|------|--------|-----------|-----|
| メイン数字 | **${topNumber ? topNumber.split('（')[0] : topKeyword}** | 特大（200px+） | 白 \`#ffffff\` + 黄/赤縁取り 8px |
| キャッチコピー | ${data.title.length <= 12 ? data.title : data.title.slice(0, 12)} | 大（80px） | 白 \`#ffffff\` + 黒縁取り 5px |
| チャンネル名 | テクノロジー投資×地政学 | 小（28px） | グレー \`#aaaaaa\` |
| 人物写真 | ※ Canvaで右半分に手動配置（背景切り抜き） | — | — |

### 推奨人物写真（テーマ別）

| テーマキーワード | 推奨人物 | 写真の入手先 |
|---|---|---|
| ホルムズ/中東/米軍 | トランプ大統領 | AP通信・Reuters |
| AI/Tesla/SpaceX | イーロン・マスク | AP通信・Reuters |
| NVIDIA/半導体 | ジェンスン・ファン | AP通信・NVIDIA公式PR |
| 中国/習近平 | 習近平国家主席 | Xinhua/AP |
| 日本企業 | 該当CEO（東京エレクトロン/ファナック社長等） | 各社IR写真 |

### AI画像生成プロンプト（Midjourney / DALL-E 3）

\`\`\`
${getMidjourneyPromptA(data, theme)}
\`\`\`

**Midjourney パラメータ**: \`--ar 16:9 --v 7 --style cinematic --quality 2\`

---

## 🎨 バリエーション B — 「地図・現場感」構成

### コンセプト
**地政学的な現場感を強調する構成。** 地図・現地映像風の背景で「今起きていること」の緊迫感を演出。

### レイアウト指示

\`\`\`
┌─────────────────────────────────────────┐
│  [背景: 衛星地図 / 現地写真 風]         │
│  ██████████████████████████████████    │
│  [半透明暗幕オーバーレイ]               │
│                                          │
│  ⚠️  [警告ラベル]                       │
│  [大きなタイトルテキスト・2行]          │
│                                          │
│        [小数字or統計]  [矢印↑↑↑]       │
└─────────────────────────────────────────┘
\`\`\`

### テキストオーバーレイ

| 要素 | テキスト | スタイル |
|------|--------|---------|
| 警告ラベル | ⚠️ 緊急 / 速報 | 赤背景 \`#cc0000\` 白文字 |
| メインタイトル | ${data.title} | 太字白文字、黒縁取り |
| サブ情報 | ${topKeyword} | 細字・やや透明 |

### AI画像生成プロンプト

\`\`\`
${getMidjourneyPromptB(data, theme)}
\`\`\`

**Midjourney パラメータ**: \`--ar 16:9 --v 7 --style raw --quality 2\`

---

## 🎨 バリエーション C — 「データ比較」構成

### コンセプト
**左右比較・before/afterで「格差」を視覚化する構成。** 投資家・データ好きな視聴者に刺さる。

### レイアウト指示

\`\`\`
┌─────────────────────────────────────────┐
│          [タイトル上部]                  │
│  ┌──────────┐   vs   ┌──────────┐      │
│  │  一方    │ ◄─►   │  他方    │      │
│  │ [数字A]  │       │ [数字B]  │      │
│  │ [ラベル] │       │ [ラベル] │      │
│  └──────────┘       └──────────┘      │
│          [キャプション]                  │
└─────────────────────────────────────────┘
\`\`\`

### chartData から比較データを抽出

${chartHighlights.length >= 2 ? chartHighlights.slice(0, 2).map((c, i) => `- 比較${i + 1}: ${c}`).join('\n') : '- ※ chartData から手動でデータを選択してください'}

### AI画像生成プロンプト

\`\`\`
${getMidjourneyPromptC(data, theme)}
\`\`\`

**Midjourney パラメータ**: \`--ar 16:9 --v 7 --style graphic --quality 2\`

---

## 🤖 Google Flow / Imagen 3 — 超高密度プロンプト（7セクション構造）

> **使い方**:
> 1. [Google Flow](https://labs.google/flow) を開く
> 2. **バリエーション A / D（キャラなし）が推奨** — 主役は銘柄ティッカー・価格バッジ・衝撃数字・装置/地図ビジュアル
> 3. 生成後、Canva / Photoshop でテキストオーバーレイ（メイン数字・タイトル）を追加
>
> ⚠️ **サムネにキャラクターは使わない（2026-05-26 確定方針）**: 地政学×投資のシリアスチャンネルは権威性を優先する。
> 下のバリエーション E（キャラ版）は方針確定前の名残であり、原則使用しないこと。

### バリエーション E（キャラクター × 感情対比）🚫 非推奨（2026-05-26 キャラ禁止方針により封印）

> **【使用しない】** 2026-05-26 に「サムネはキャラクター禁止」が確定したため、このバリエーションは封印。
> 権威性を損なうため、地政学×投資チャンネルでは A / D（キャラなし・数字主役）を使うこと。
> 以下のプロンプトは参考履歴として残置。

\`\`\`
${getFlowUnifiedPrompt(data, theme)}
\`\`\`

**Google Flow パラメータ**: 参照画像（左: ぽんちゃん、右: まろくん）を両方アップロード、style strength 60-70%

---

### バリエーション A（衝撃の数字・背景のみ）

\`\`\`
${getFlow7SectionA(data, theme)}
\`\`\`

---

### バリエーション B（地図・現場感）

\`\`\`
${getFlow7SectionB(data, theme)}
\`\`\`

---

### バリエーション C（データ比較・対比）

\`\`\`
${getFlow7SectionC(data, theme)}
\`\`\`

---

### バリエーション D（Before / After — 感情対比）

\`\`\`
${getFlow7SectionD(data, theme)}
\`\`\`

### テキストオーバーレイ共通ルール（2026-05-05改訂）

> **⚠️ 文字数制限**: メインキャッチコピーは **13〜15文字以内**。スマホ縦120px（サムネイル一覧）で読めるか必ず確認。
> **⚠️ 色制限**: ダークモード対応のため **白 \`#FFFFFF\` または黄 \`#FFE500\` + 黒縁取り** のみ。赤テキストは暗背景で消える。
> **⚠️ 要素数制限**: 1枚あたり最大3要素。バッジは **3エピソードに1回まで**（同じバッジの連続使用禁止）。

| 要素 | テキスト | スタイル |
|------|--------|---------|
| メイン数字 | **${keyNumbers[0]?.split('（')[0] ?? ''}** | 特大・黄色 \`#FFE500\` + 黒縁取り 10px（赤縁取り禁止） |
| キャッチコピー（15文字以内） | ${data.title.length > 15 ? data.title.slice(0, 15) : data.title} | 太字白 \`#FFFFFF\` + 黒縁取り 6px |
| バッジ（任意・1個まで） | 速報 / 緊急 / 暴露（4文字以内） | 赤背景 \`#CC0000\` 白文字 |

### パターン選択ガイド（テーマ別ローテーション）

| テーマ | 推奨パターン | 連続使用時は次のパターンへ |
|--------|------------|------------------------|
| 暴落・危機・損失 | **A（衝撃数字）** → **D（Before/After）** | A→D→A→D の交互 |
| 地政学・地図・現場感 | **B（地図・現場）** | 3本に1本はAに変える |
| 比較・VS・格差 | **C（データ比較）** or **D（Before/After）** | 交互に使用 |
| 同テーマが連続する場合 | 必ずパターンを切り替える | 同パターン2連続禁止 |

---

## 🖌️ カラーパレット（コピー用）

| 用途 | カラーコード | 使い方 |
|------|------------|--------|
| 背景ベース | \`${theme.bg}\` | 背景色・暗幕 |
| アクセント | \`${theme.accent}\` | 枠線・強調要素 |
| テキスト | \`${theme.text}\` | メインテキスト |
| 警告赤 | \`#e53e3e\` | 警告ラベル・矢印 |
| 数字強調黄 | \`#f6e05e\` | 数字のハイライト |
| 白 | \`#ffffff\` | メインテキスト |

---

## ✅ サムネイル A/B テスト運用フロー

**毎回 A・B の2案を生成し、CTRデータを蓄積する。**

| フェーズ | タイミング | アクション |
|---------|-----------|-----------|
| **テスト A** | アップロード直後 | バリエーション A のプロンプトで生成 → YouTube Studio でサムネイル設定 |
| **CTR確認** | 7日後 | YouTube Studio Analytics で CTR を確認 |
| **テスト B** | 7日後（CTR < 3%なら差し替え） | バリエーション B のプロンプトで生成 → \`set-thumbnail.ts\` で差し替え |
| **記録** | 14日後 | A・B の CTR を比較 → 勝ちパターンとして記録 |

### 差し替えコマンド（CTRが低い場合）

\`\`\`bash
cd packages/tech-geopolitics-channel
node_modules\\.bin\\ts-node scripts/set-thumbnail.ts <videoId> output/${data.videoId}_thumbnail_B.jpg
\`\`\`

### A/B 仮説

| | バリエーション A | バリエーション B |
|--|----------------|----------------|
| **仮説** | 大数字インパクトで即クリック | 地図・現場感で好奇心喚起 |
| **想定CTR優位層** | 投資初心者・数字に敏感な層 | 地政学ファン・ニュース好きな層 |
| **判定基準** | CTR ≥ 3% → 継続 | A が負けた場合に採用 |

---
${winningPatterns ? buildWinnersSection(winningPatterns) : ''}
*このブリーフは \`scripts/generate-thumbnail-brief.ts\` により自動生成されました。*
`;

// ─── 勝ちパターンセクション生成 ─────────────────
function buildWinnersSection(wp: ThumbnailWinPattern): string {
  const tp = wp.thumbnailPatterns;
  const elements = tp.commonElements.length > 0
    ? tp.commonElements.map((e) => `- ✅ ${e}`).join('\n')
    : '- （データなし）';
  const avoids = tp.avoidElements.length > 0
    ? tp.avoidElements.map((e) => `- ❌ ${e}`).join('\n')
    : '- （データなし）';
  const hooks = wp.recommendedHooks.length > 0
    ? wp.recommendedHooks.map((h) => `- 「${h}」`).join('\n')
    : '- （データなし）';

  return `
## 🏆 競合分析 — 勝ちパターン参考（${wp.totalVideosAnalyzed}件分析 / ${wp.analyzedAt.slice(0, 10)}）

### サムネイルで使うべき要素
${elements}

### 避けるべき要素
${avoids}

### 色・構図の傾向
- **カラースキーム**: ${tp.colorScheme}
- **テキスト密度**: ${tp.textDensity}
- **構図**: ${tp.composition}
- **顔・人物**: ${tp.facesPresent ? '顔アップが多い → 感情表現を強調' : '顔より情報優先 → データ・数字を前面に'}
- **数字強調**: ${tp.numberHighlight ? '大きな数字が高CTRと相関 → 最重要数字を特大フォントで配置' : '数字より概念が優先される傾向'}

### タイトル・フック参考テンプレート
${hooks}

---
`;
}

// ─── プロンプト生成ヘルパー ───────────────────────
function getMidjourneyPromptA(d: ScriptInput, t: typeof theme): string {
  const topTag = d.tags[0] ?? 'geopolitics';
  return `Dramatic dark cinematic background, ${t.colorDesc} color tones,
high contrast professional photography, tension and urgency atmosphere,
related to: ${topTag}, ${d.tags[1] ?? 'investment risk'},
empty center-left area for text overlay, bokeh background blur,
16:9 aspect ratio, 4K photorealistic, no text, no watermarks,
dramatic studio lighting, documentary style`;
}

function getMidjourneyPromptB(d: ScriptInput, t: typeof theme): string {
  const location = d.tags.find((tag) => /海|国|州|島|湾|アジア|欧|米|中|日/.test(tag)) ?? d.tags[0] ?? 'Asia';
  return `Aerial satellite map view of ${location}, dramatic cinematic lighting,
${t.colorDesc} color grading, dark overlay, emergency situation atmosphere,
high contrast, sharp details, photorealistic, 16:9 ratio,
no text, no watermarks, space for text overlay at bottom third,
documentary photography style, teal and orange color grade`;
}

function getMidjourneyPromptC(d: ScriptInput, t: typeof theme): string {
  return `Clean data visualization background, ${t.colorDesc} gradient,
professional infographic style, dark background with subtle grid,
abstract financial chart elements, blue and red contrast sections,
left-right split composition with dividing line,
16:9 aspect ratio, no text, no watermarks,
modern tech company presentation aesthetic, high contrast`;
}

function getFlowUnifiedPrompt(d: ScriptInput, t: typeof theme): string {
  const topTag  = d.tags[0] ?? 'geopolitics';
  const subTag  = d.tags[1] ?? 'economic crisis';
  const topNum  = keyNumbers[0]?.split('（')[0] ?? '';

  // チャプター種別から雰囲気と場所を推定
  const isCrisis = /危機|戦争|封鎖|崩壊|暴落|制裁|リスク|ショック/.test(d.title + d.tags.join(''));
  const isPositive = /急騰|爆上|高配当|億|成長|最高|上昇/.test(d.title + d.tags.join(''));

  // キャラ表情
  const ponExpression = isCrisis
    ? 'shocked and alarmed expression, wide eyes, mouth open in disbelief, pointing dramatically at a crisis alert screen'
    : isPositive
    ? 'smug triumphant expression (ドヤ顔), confident smile, pointing at a rising chart'
    : 'serious focused expression, arms crossed, looking intently at data screens';

  const maroExpression = isCrisis
    ? 'overwhelmed and panicked expression, sweating, hands on head in despair, surrounded by warning symbols and falling chart graphics'
    : isPositive
    ? 'shocked amazed expression, eyes wide open, surrounded by flying money and gold elements'
    : 'curious puzzled expression, tilting head, looking at the screen with one hand raised';

  // シーン設定（タグから推定）
  const hasMiddleEast = /ホルムズ|イラン|中東|石油|原油|湾/.test(d.tags.join(''));
  const hasTech = /半導体|AI|テック|デジタル|EV|電気/.test(d.tags.join(''));
  const hasEconomy = /株|投資|経済|GDP|円|金利|インフレ/.test(d.tags.join(''));

  const sceneDesc = hasMiddleEast
    ? 'a dramatic crisis war room with glowing screens showing Middle East maps, oil price surge charts, and emergency alerts. Oil barrels and tanker silhouettes visible in background haze'
    : hasTech
    ? 'a cutting-edge futuristic tech control center with holographic displays showing circuit patterns, satellite imagery, and real-time data streams'
    : hasEconomy
    ? 'a high-tech financial trading floor with massive screens displaying stock charts, currency exchange data, and economic indicators'
    : 'a dramatic dark studio with glowing data screens showing geopolitical maps and financial charts';

  const atmosphereDesc = isCrisis
    ? 'ultra urgent and tense, deep dark background with ominous red and amber warning lights, emergency sirens implied, high-stakes atmosphere'
    : isPositive
    ? 'electrifying and exciting, dark background with golden and green wealth energy, celebratory yet dramatic'
    : 'tense and analytical, dark background with cool blue and white data light, professional and authoritative';

  const colorStyle = isCrisis
    ? 'deep black background, crimson red emergency lights, amber warning glow, high contrast'
    : isPositive
    ? 'deep black background, rich gold and emerald green accents, warm celebratory glow'
    : `deep black background, ${t.colorDesc} accent tones, cool professional lighting`;

  // テキストスタイル（テーマ別）
  const textStyle = isCrisis
    ? 'bold crisis-red and blazing orange gradient font, cracked/burning effect, glowing ember outline, sparkling danger particles, extremely high contrast against dark background'
    : isPositive
    ? 'bold luxurious gold gradient font with shiny metallic effects, sparkling light particles and star bursts, rich warm glow'
    : 'bold electric blue and white gradient font, sharp tech-style clean lines, subtle glow effect';

  // 数字とタイトルのテキスト構成
  const textLine1 = topNum ? topNum : d.title.split('？')[0] + '？';
  const textLine2 = topNum ? d.title : (d.title.split('？')[1] ?? '');

  return `Subject & Layout: A YouTube thumbnail composition designed for maximum CTR, focusing on ${topTag} and ${subTag}. The layout has characters on the left and right, with bold impactful text rendered prominently at the TOP of the image.

Scene: Inside ${sceneDesc}.

Text Rendering (Top Priority): At the very TOP of the image, render the large bold Japanese text in two lines:
Line 1 (biggest, most prominent): "${textLine1}" — in ${textStyle}.
${textLine2 ? `Line 2 (slightly smaller, below line 1): "${textLine2}" — same style but slightly smaller size.` : ''}
The text must be sharp, vivid, and immediately eye-catching against the dark background.

Characters:

Left: The character ponchan (reference image 1, orange-hair anime girl) — ${ponExpression}. She stands on the LEFT side, full body visible, naturally integrated into the dark environment with dramatic rim lighting from behind in orange-amber.

Right: The character maro (reference image 2, brown-hair anime boy with furry hood) — ${maroExpression}. He stands on the RIGHT side, full body or upper body visible, naturally integrated with dramatic rim lighting from behind in red.

Background & Atmosphere: ${atmosphereDesc}. Visible in the background: ${sceneDesc}. The floor glows faintly. The overall composition draws the eye between the two characters and upward to the bold title text.

Style: 8k resolution, hyper-realistic anime style, high contrast, vibrant colors, cinematic lighting, highly detailed textures, ${colorStyle}, 16:9 aspect ratio, no watermarks.`;
}

// ─── 7セクション構造プロンプト生成（Google Flow / Imagen 3 向け・キャラ禁止） ───

function buildSceneTheme(d: ScriptInput, t: typeof theme): { atmosphere: string; palette: string; mainVisual: string } {
  const isCrisis = /危機|戦争|封鎖|崩壊|暴落|制裁|リスク|ショック/.test(d.title + d.tags.join(''));
  const isTech = /量子|半導体|AI|テック|デジタル|サイバー/.test(d.title + d.tags.join(''));
  const hasMiddleEast = /ホルムズ|イラン|中東|石油|原油|湾/.test(d.tags.join(''));
  const hasEconomy = /株|投資|経済|GDP|円|金利|インフレ/.test(d.tags.join(''));

  const atmosphere = isCrisis
    ? 'ultra-urgent, tense crisis atmosphere with blood-orange emergency lighting and deep shadow'
    : isTech
    ? 'futuristic, awe-inspiring, electric blue quantum energy with glowing circuit patterns'
    : 'dramatic, high-stakes financial thriller atmosphere with cold blue institutional lighting';

  const palette = isCrisis
    ? `Primary: #1A0000 | Accent: #D62828 | Highlight: #F77F00 | Text: #FFFFFF`
    : isTech
    ? `Primary: #000820 | Accent: #0080FF | Highlight: #00E5FF | Text: #FFFFFF`
    : `Primary: #020B18 | Accent: #1A73E8 | Highlight: #F77F00 | Text: #FFFFFF`;

  const mainVisual = hasMiddleEast
    ? 'dramatic satellite view of Middle East / Persian Gulf with oil tanker silhouettes, glowing horizon, and data overlay of oil prices crashing'
    : isTech
    ? 'photorealistic quantum computer visualization with superconducting qubit array glowing in blue, surrounded by cascading encrypted data and breaking-point security shields'
    : hasEconomy
    ? 'high-altitude aerial shot of a global financial district at dusk, with stock chart hologram overlay showing a sharp cliff-drop, dollar signs dissolving'
    : 'dramatic editorial composite: world map with glowing crisis hotspots, interconnected lines showing supply chain collapse, satellite view';

  return { atmosphere, palette, mainVisual };
}

function getFlow7SectionA(d: ScriptInput, t: typeof theme): string {
  const { atmosphere, palette, mainVisual } = buildSceneTheme(d, t);
  const topNum = keyNumbers[0]?.split('（')[0] ?? d.tags[0] ?? '';
  // 15字以内に切り詰める（スマホ120px視認性確保）
  const shortTitle = d.title.length > 15 ? d.title.slice(0, 15) : d.title;

  return `=== BACKGROUND VISUAL ===
${mainVisual}
Color palette: ${palette}
Lighting: ${atmosphere}
Style: editorial photorealism, Bloomberg/Reuters documentary quality, 4K ultra-sharp

=== TEXT OVERLAYS (Japanese) — MAX 3 ELEMENTS, DARK-MODE SAFE ===
CRITICAL RULE: Main catchphrase text MUST be 13-15 Japanese characters maximum.
Do NOT add more than 3 text elements total. Less is more for mobile CTR.
All text must use WHITE (#FFFFFF) or YELLOW (#FFE500) with BLACK stroke — NEVER red text on dark background (invisible in dark mode).

TOP CENTER (dominant, 40% of frame height) — "${topNum}" — blazing yellow-white #FFE500, black 10px stroke, maximum contrast
MIDDLE CENTER (bold) — "${shortTitle}" — pure white #FFFFFF, black 6px stroke (NO red stroke — dark mode compatibility)
BOTTOM LEFT BADGE (ONE badge max, never repeat same badge across episodes) — 1 short word only, e.g. "速報" or "緊急" — red bg #CC0000, white bold text

=== TYPOGRAPHY SPECS ===
Main number: 320px+ ultra-bold, golden-yellow #FFE500, black 10px stroke — visible on both light and dark mode
Title: 80px bold, pure white #FFFFFF, black 6px stroke — no colored stroke
Badge: max 4 chars, 40px bold, white on red bg — use sparingly (once per 3 episodes)
All text must remain legible at 320px thumbnail width (mobile preview requirement)

=== COMPOSITION ===
Rule-of-thirds: main number occupies top 1/3, title in middle third
Visual hierarchy: Number (primary eye entry) → Title (secondary) → Scene (tertiary)
Depth: foreground data layer → midground crisis scene → dark atmospheric background

=== EMOTIONAL TRIGGERS ===
Target emotion: SHOCK and URGENCY — viewer must feel "I need to watch this NOW"
Psychological hook: loss aversion ("if I don't know this, I'll lose money")
Secondary: intellectual curiosity / status signaling ("I want to understand this")

=== STYLE REFERENCE ===
References: Bloomberg Quicktake thumbnail, Reuters investigative documentary poster, NHK WORLD crisis report
NO anime characters, NO cartoons, NO illustrated personas, NO cute mascots
Resolution: 1280x720px minimum, 2560x1440 preferred, 16:9 ratio

=== AVOID ===
Any anime, manga, or cartoon characters
Faces of real politicians or celebrities (legal risk)
Cluttered text (max 4 text elements)
Pastel or muted color schemes
Generic stock photo backgrounds`;
}

function getFlow7SectionB(d: ScriptInput, t: typeof theme): string {
  const { atmosphere, palette, mainVisual } = buildSceneTheme(d, t);
  const location = d.tags.find((tag) => /海|国|州|島|湾|アジア|欧|米|中|日|台湾|中東/.test(tag)) ?? d.tags[0] ?? 'geopolitical hotspot';
  const shortTitle = d.title.length > 15 ? d.title.slice(0, 15) : d.title;

  return `=== BACKGROUND VISUAL ===
Ultra-realistic aerial / satellite photography composite of ${location} region at dusk or night
Glowing city lights with crisis-red and amber overlay on strategic locations
Data visualization layer: heat map of economic impact zones, shipping route disruption arrows
Color palette: ${palette}
Lighting: tense ${atmosphere}

=== TEXT OVERLAYS (Japanese) — MAX 3 ELEMENTS, DARK-MODE SAFE ===
CRITICAL RULE: Max 13-15 Japanese characters for main text. Max 3 elements total.
All text must use WHITE or YELLOW with BLACK stroke — avoid red text on dark (dark mode invisible).

TOP LEFT BADGE — "⚠️ 速報" — red bg #CC0000, white 60px bold text (use this badge max once per 3 episodes)
UPPER CENTER — "${shortTitle}" — large white #FFFFFF with heavy 6px black stroke — NO colored stroke
(OMIT lower strip if title already fills the reading space — 3 elements max)

=== TYPOGRAPHY SPECS ===
Badge: 60px ultra-bold, white on #CC0000 — limit to one badge per thumbnail
Title: 90px bold #FFFFFF, 6px black stroke, NO red shadow (dark mode safe)
Must be legible on 320px mobile thumbnail

=== COMPOSITION ===
Geographic vista occupies 70% of frame — sense of scale and real-world stakes
Text elements float above in upper portion with strong contrast
Visual weight balanced: crisis indicator (left) ↔ title (center-right)
Eye path: warning badge → title → geographic scene below

=== EMOTIONAL TRIGGERS ===
Target emotion: URGENCY and REALITY — "this is happening now, in the real world"
Psychological hook: proximity bias ("this affects me directly")
Secondary: fear of missing critical information

=== STYLE REFERENCE ===
References: CNN Breaking News graphics, NHK crisis coverage title card, War Room documentary
NO anime characters, NO cartoons, NO illustrated characters whatsoever
Photorealistic only — must look like a real news program thumbnail
Resolution: 1280x720px minimum, 16:9 ratio

=== AVOID ===
Any anime, manga, or cartoon characters or mascots
Soft or cheerful color tones
More than 3-4 text elements
Faces of real people`;
}

function getFlow7SectionC(d: ScriptInput, t: typeof theme): string {
  const { atmosphere, palette } = buildSceneTheme(d, t);
  const compareData = chartHighlights.slice(0, 2);
  const leftLabel = compareData[0]?.split(':')[0]?.trim() ?? d.tags[0] ?? 'Before';
  const rightLabel = compareData[1]?.split(':')[0]?.trim() ?? d.tags[1] ?? 'After';
  const shortTitle = d.title.length > 15 ? d.title.slice(0, 15) : d.title;

  return `=== BACKGROUND VISUAL ===
Dramatic split-screen composition: left half vs right half with a glowing vertical divider line
Left half: cold blue-grey industrial or institutional imagery (status quo / loser scenario)
Right half: warm amber-red or gold urgent imagery (crisis / winner scenario)
Background: dark vignette pushing attention to center comparison
Color palette: ${palette}
Lighting: ${atmosphere}

=== TEXT OVERLAYS (Japanese) ===
TOP CENTER — "${shortTitle}" — white 80px bold with black stroke
LEFT SECTION HEADER — "${leftLabel}" — cold blue #4A90E2, bold
RIGHT SECTION HEADER — "${rightLabel}" — warm orange #F77F00, bold
CENTER DIVIDER — "VS" — white, extra-large, centered on the split line
BOTTOM BAR — "テクノロジー投資×地政学 — 徹底解説" — semi-transparent strip

=== TYPOGRAPHY SPECS ===
Title: 80px ultra-bold white, 5px black stroke, positioned top-center
Section headers: 60px bold, colored (#4A90E2 left / #F77F00 right)
VS text: 120px ultra-bold white, centered, slight drop shadow
Bottom bar: 36px regular white, low-contrast background for secondary info
Legibility at 320px mobile width required

=== COMPOSITION ===
Perfect vertical split at 50% mark with glowing divider line
Left section: ~45% width, right section: ~45%, divider: ~10%
Title floats above the split, unifying both sides
Rule of thirds: main content in middle third, title in top third

=== EMOTIONAL TRIGGERS ===
Target emotion: COMPARISON ANXIETY and INTELLECTUAL CURIOSITY
"Which side will YOU be on?" — FOMO and status threat
Viewer wants to understand the difference before making a decision

=== STYLE REFERENCE ===
References: Bloomberg comparison graphics, Financial Times data journalism, Wired split-feature covers
NO anime characters, NO cartoons, NO illustrated mascots
Clean editorial design — data journalism aesthetic
Resolution: 1280x720px minimum, 16:9 ratio

=== AVOID ===
Any anime, manga, cartoon characters
Faces of real people (legal risk)
More than 5 text elements total
Cluttered or busy backgrounds that compete with the comparison`;
}

function getFlow7SectionD(d: ScriptInput, t: typeof theme): string {
  const { atmosphere, palette } = buildSceneTheme(d, t);
  const isCrisis = /危機|戦争|封鎖|崩壊|暴落|制裁|リスク|ショック/.test(d.title + d.tags.join(''));
  const shortTitle = d.title.length > 15 ? d.title.slice(0, 15) : d.title;

  const leftDesc = isCrisis
    ? 'cold blue-grey: a person looking devastated, empty wallet, red downward chart — the "loser" scenario'
    : 'cold grey: generic worried person, stagnant savings, flat chart';
  const rightDesc = isCrisis
    ? 'warm gold-amber: a person looking calm and confident, growing portfolio, green upward chart — the "winner" scenario'
    : 'warm gold: confident investor, rising chart, wealth symbols';

  return `=== BACKGROUND VISUAL ===
Dramatic BEFORE / AFTER split-screen composition — left half cold blue-grey, right half warm gold-amber
A single glowing vertical line divides the two halves at center
Left half: ${leftDesc}
Right half: ${rightDesc}
Color palette: ${palette}
Lighting: ${atmosphere}, with cold light on left and warm light on right

=== TEXT OVERLAYS (Japanese) — MAX 3 ELEMENTS, DARK-MODE SAFE ===
CRITICAL RULE: Max 13-15 Japanese characters for main text. Max 3 elements total.
All text WHITE (#FFFFFF) or YELLOW (#FFE500) with BLACK stroke.

TOP CENTER — "${shortTitle}" — white #FFFFFF, 7px black stroke, spans both halves
CENTER DIVIDER — large "VS" text — bright white, centered on the split line, dramatic size
BOTTOM STRIP (optional, only if space allows) — one short insight phrase, max 10 chars

=== TYPOGRAPHY SPECS ===
Title: 80px ultra-bold white, 7px black stroke — positioned at top spanning both halves
VS: 140px ultra-bold white, slight drop shadow — must dominate center
Bottom strip: 36px white, semi-transparent bg, max 10 chars
Legible at 320px mobile width

=== COMPOSITION ===
Perfect 50/50 vertical split — psychological contrast drives "which side will I be on?" emotion
Cold vs Warm color temperature creates instant visual hierarchy
Eye path: Title (top) → VS (center) → Left scene → Right scene

=== EMOTIONAL TRIGGERS ===
Target emotion: COMPARISON ANXIETY + HOPE — "I want to be on the right side"
Psychological hook: status threat ("Am I the loser on the left?") + resolution ("Here's how to be the winner")
Most powerful for loss-aversion topics: tax, crash, inflation

=== STYLE REFERENCE ===
References: Business Insider before/after comparison, Money Forward comparison ads
NO anime characters, NO cartoons
Split must be instantly obvious — do not blend the two sides
Resolution: 1280x720px minimum, 16:9 ratio

=== AVOID ===
Blending the two halves (contrast must be stark)
More than 3 text elements
Faces of real people
Same badge used in recent episodes`;
}

// ─── ガーコスタイル（文字70-80%型）プロンプト生成 ─────────────────────────────

/**
 * ガーコちゃんねる型サムネイル（2026-05-30確立）
 * 文字が面積の70-80%を占める純テキスト主役スタイル。
 * 4行スタック + 帯強調。背景はシンプル（テキストの邪魔をしない）。
 * Google Flow がテキストを直接焼き込んでくれる前提で設計。
 */
function getGarkoStyle1(d: ScriptInput): string {
  // コンテキストKW（「〜の」で置く行）: 新NISA > iDeCo を優先
  const contextKw = ['新NISA', 'iDeCo', 'つみたて投資枠', '成長投資枠']
    .find((kw) => (d.title + d.tags.join('')).includes(kw)) ?? '新NISAの';
  // 主語銘柄（大きく見せる行）: S&P500 > オルカン > FANG+ > 銘柄名
  const subjectKw = ['S&P500', 'オルカン', 'FANG+', '高配当ETF', 'SBI証券', '楽天証券', 'NVIDIA', 'TSMC']
    .find((kw) => (d.title + d.tags.join('')).includes(kw)) ?? d.tags[1] ?? d.tags[0] ?? '';

  // 損回避ワード抽出
  const warningWord =
    /今すぐ見直すべき/.test(d.title) ? '見直すべき' :
    /大損/.test(d.title)             ? '大損する理由' :
    /改悪/.test(d.title)             ? '改悪！確認必須' :
    /乗り換え/.test(d.title)         ? '乗り換え時期' :
    /答えが変わった/.test(d.title)   ? '今すぐ見直せ' :
                                       '今すぐ確認';

  const mainNum = keyNumbers[0]?.split('（')[0] ?? '';
  const accentLine = mainNum ? `${mainNum}の衝撃` : `${subjectKw}に異変`;

  return `出力する画像内テキストは必ず日本語で出力して

=== BACKGROUND ===
Extremely clean solid dark navy background, color #0A0F2E.
Subtle diagonal gradient from #0A0F2E to #1a1f4a — barely noticeable.
Very faint abstract financial grid lines, almost invisible.
This background exists ONLY to make text pop. Minimal decoration.
No people, no charts, no decorative elements, no characters.
16:9 ratio, 1280x720px.

=== TEXT LAYOUT (render ALL text exactly as written) ===
This thumbnail is TEXT-DOMINANT. Text covers 75-80% of the image area.
Four lines of stacked text + one accent bar at bottom.

LINE 1 — upper-left, approximately 12% from top:
Text: "${contextKw}の"
Font: ultra-bold Japanese sans-serif (Noto Sans JP Black weight)
Size: medium (60-70px equivalent)
Color: pure white #FFFFFF
Outline: solid black 4px around every character

LINE 2 — center, immediately below LINE 1:
Text: "${subjectKw}"
Font: ultra-bold condensed
Size: very large (110-130px equivalent) — 3x the size of LINE 1
Color: METALLIC GOLD — rich vertical gradient on each character: top edge bright #FFFDE0 (specular highlight), center body #FFD700, bottom edge warm amber #B8860B. Each character looks like polished gold metal with a gleaming light reflection across the upper 25%. Add subtle sparkle/glitter particles (3-5 tiny 4-pointed stars) scattered around the text.
Outline: solid black 6px around every character (beneath the metallic surface)

LINE 3 — center, immediately below LINE 2:
Text: "今すぐ"
Font: ultra-bold Japanese sans-serif
Size: maximum — fills 80% of image width
Color: vivid crisis red #FF2020
Outline: solid WHITE 10px around every character — white border, NOT black

LINE 4 — center, immediately below LINE 3:
Text: "${warningWord}"
Font: ultra-bold Japanese sans-serif
Size: large (slightly smaller than LINE 3, 130-150px equivalent)
Color: vivid crisis red #FF2020
Outline: solid WHITE 8px around every character — white border, NOT black

ACCENT BAR — bottom strip, 78-88% from top:
Solid dark navy-blue rectangle #0D1B6E, spanning 88% of image width, height ~10% of image.
Centered inside the bar: "${accentLine}"
Bar text: ultra-bold white #FFFFFF, 50-58px, black 3px outline.

=== TYPOGRAPHY SPECS ===
Zero padding between lines — stacked tight for maximum density.
RED text rule: ALL red-colored text (#FF2020) MUST use solid WHITE outline (8-10px). Never black outline on red text.
GOLD text rule: ALL gold/yellow text uses metallic gradient (bright top → #FFD700 center → amber base) with specular highlight. Add 3-5 tiny sparkle stars around gold text.
White text: solid black outline 4-6px.
All text legible at 320px thumbnail width (mobile requirement).
Font weight: Black / ExtraBold (900 weight) throughout.

=== COMPOSITION ===
Text occupies 75-80% of visible frame area.
Visual hierarchy: LINE 3 (largest) is the dominant focal point.
Eye path: LINE 1 (context) → LINE 2 (subject) → LINE 3-4 (action) → BAR (proof)
Background visible only at far edges as framing device.

=== EMOTIONAL TRIGGERS ===
Target emotion: URGENCY + LOSS AVERSION
Psychological hook: "If I don't act on this right now, I'll lose money."
Secondary: authority through confident declarative text (no questions)

=== STYLE REFERENCE ===
Japanese financial YouTube channel style (ガーコちゃんねる, 両学長 style)
Pure text-dominant layout, 4 stacked lines, accent bar
Broadcast news emergency alert aesthetic crossed with financial education
NO anime, NO characters, NO human faces, NO complex backgrounds
Resolution: 1280x720px minimum, 16:9 ratio`;
}

function getGarkoStyle2(d: ScriptInput): string {
  // VS比較対象を抽出
  const vsMatch = (d.title + d.tags.join(' ')).match(/([^\s]+)\s+vs\s+([^\s、。！？]+)/i) ??
                  (d.title + d.tags.join(' ')).match(/([^\s]+)か([^\s]+)か/);
  const leftTarget  = vsMatch ? vsMatch[1]! : d.tags[0] ?? 'オルカン';
  const rightTarget = vsMatch ? vsMatch[2]! : d.tags[1] ?? 'S&P500';

  // 結論ワード
  const conclusionWord =
    /答えが/.test(d.title)  ? '答えが変わった！' :
    /逆転/.test(d.title)    ? '逆転確定！' :
    /勝ち/.test(d.title)    ? '勝ち方が変わった！' :
                              '2026年の答えが出た！';

  return `出力する画像内テキストは必ず日本語で出力して

=== BACKGROUND ===
Pure deep black background #080808.
Almost completely flat black — ultra minimal.
Faint dark blue-grey vignette at four corners only, barely visible.
Zero decorative elements. Background is a stage for text, nothing more.
No people, no charts, no characters, no patterns.
16:9 ratio, 1280x720px.

=== TEXT LAYOUT (render ALL text exactly as written) ===
This thumbnail is TEXT-DOMINANT. Text covers 80% of the image area.
Three main text lines + year line + accent bar.

LINE 1 — upper area, 8-12% from top, centered:
Text: "${leftTarget}"
Font: ultra-bold Japanese sans-serif (Noto Sans JP Black weight)
Size: large (90-110px equivalent)
Color: METALLIC GOLD — vertical gradient per character: top #FFFDE0 (specular highlight), center #FFD700, bottom #B8860B. Polished gold metal appearance with gleaming reflection on upper 25% of each character. Add 3-5 tiny sparkle stars around the text.
Outline: solid black 6px around every character

LINE 2 — absolute center of image, dominant element:
Text: "VS"
Font: ultra-bold, condensed, maximum possible size
Size: fills 55-65% of image width (180-200px equivalent)
Color: vivid crisis red #FF2020
Outline: solid WHITE 14px around every character — white border, NOT black
This "VS" is the LARGEST, most visually dominant element in the image.

LINE 3 — immediately below LINE 2, centered:
Text: "${rightTarget}"
Font: ultra-bold condensed
Size: large (100-120px equivalent)
Color: pure white #FFFFFF
Outline: solid black 8px around every character

LINE 4 — below LINE 3, centered:
Text: "2026年"
Font: ultra-bold
Size: medium (65-75px equivalent)
Color: pure white #FFFFFF
Outline: solid black 4px around every character

ACCENT BAR — bottom strip, 83-92% from top:
Solid green rectangle #16a34a, spanning 88% of image width, height ~9% of image.
Centered inside the bar: "${conclusionWord}"
Bar text: ultra-bold white #FFFFFF, 52-60px, black 3px outline.

=== TYPOGRAPHY SPECS ===
VS text is the undisputed focal point — it must dominate the center.
Tight vertical stacking — lines nearly touching for maximum impact.
RED text rule: ALL red text (#FF2020) uses solid WHITE outline (12-14px for VS, 8px for others). Never black outline on red.
GOLD text rule: ALL gold/yellow text uses metallic vertical gradient (#FFFDE0 top → #FFD700 center → #B8860B base) with specular highlight + 3-5 sparkle stars.
White text: solid black outline 6-8px.
Legible at 320px mobile thumbnail width.

=== COMPOSITION ===
LINE 1 (top label) → VS (center anchor) → LINE 3-4 (counterpart + year) → BAR
VS creates an unmissable visual anchor at image center.
Text stack occupies center 80% of width.
Black background visible only at far edges.

=== EMOTIONAL TRIGGERS ===
Target emotion: COMPARISON ANXIETY + DECISIVE CURIOSITY
Hook: "These two are head-to-head — which one should I hold?"
Urgency layer: "2026年" signals timeliness — this information is current

=== STYLE REFERENCE ===
Japanese financial YouTube rivalry-style thumbnail (ガーコちゃんねる VS format)
Sports rivalry poster aesthetic crossed with financial news alert
Stark black background, maximum contrast, ultra-bold type
NO anime, NO characters, NO human faces
Resolution: 1280x720px minimum, 16:9 ratio`;
}

// ─── 出力 ─────────────────────────────────────────
fs.writeFileSync(outputPath, brief, 'utf-8');
console.log(`✅ サムネイルブリーフ生成完了: ${outputPath}`);
