---
name: slide-antipattern-check
description: slides.jsonのアンチパターン検証エージェント。AP-01〜AP-10（10ルール）を自動チェックし、違反スライドをFLAG/PASS判定する。「スライドチェック」「APチェック」「ep025のアンチパターンを確認」で起動。引数: エピソードID（例: ep025）
allowed-tools: Read, Bash, Glob, Edit
---

# slide-antipattern-check スキル

`$ARGUMENTS` からエピソードIDを取得し `input/{epId}-slides.json` を10ルールで検証する。

---

## ステップ0: ファイル確認

```bash
ls packages/tech-geopolitics-channel/input/$ARGUMENTS-slides.json 2>/dev/null || echo "NOT_FOUND"
```

NOT_FOUND の場合は「`input/$ARGUMENTS-slides.json` が存在しません」と報告して終了。

---

## ステップ1: チェックスクリプトを一時ファイルに書き出して実行

`$` をシェル補間から守るため、スクリプトをファイルに書き出してから node で実行する。

```bash
cat > /tmp/ap_check.js << 'SCRIPT'
const fs = require('fs');
const epId = process.argv[2];
const filePath = `packages/tech-geopolitics-channel/input/${epId}-slides.json`;
const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
const slides = data.slides || [];

// 6色パレット許容セット
const PALETTE_OK = new Set([
  '#1976d2','#1565c0','#d84315','#888888','#e8f4fb','#222222',
  '#e0e0e0','#b0bec5','#90a4ae','#cfd8dc','#ffffff','#fff',
  'blue','red','gray','grey','white','black',
]);

// AP-01: 汎用タイトルパターン
const GENERIC_RE = /(について|の解説|概要|現状|紹介|とは|一覧)$|^(まとめ|概要|背景|現状|解説|紹介)$/;

function isOutsidePalette(color) {
  if (!color || typeof color !== 'string') return false;
  const c = color.toLowerCase().trim();
  if (PALETTE_OK.has(c)) return false;
  return /^#[0-9a-f]{3,8}$/.test(c);
}

function collectValues(obj, keys) {
  const results = [];
  if (!obj || typeof obj !== 'object') return results;
  for (const k of Object.keys(obj)) {
    if (keys.includes(k)) results.push(obj[k]);
    if (Array.isArray(obj[k])) obj[k].forEach(item => results.push(...collectValues(item, keys)));
    else if (typeof obj[k] === 'object') results.push(...collectValues(obj[k], keys));
  }
  return results;
}

function countEmoji(text) {
  const matches = (text || '').match(/\p{Emoji_Presentation}/gu) || [];
  return matches.length;
}

const violations = [];

slides.forEach((slide, i) => {
  const sid = `slide[${i+1}] role=${slide.role||'?'} title="${(slide.title||'').slice(0,20)}"`;
  const v = slide.visual;
  const ct = slide.chartType;
  const isCTA = slide.role === 'cta';
  const isHook = slide.role === 'hook';

  // AP-01: 汎用タイトル
  if (slide.title && GENERIC_RE.test(slide.title.trim())) {
    violations.push({ rule: 'AP-01', slide: sid, detail: `汎用タイトル: 「${slide.title}」` });
  }

  // AP-02: chartType:none かつ visual なし (CTA除く)
  if (!isCTA && (!ct || ct === 'none') && !v) {
    violations.push({ rule: 'AP-02', slide: sid, detail: 'chartType:none かつ visual 未設定（空スライド）' });
  }

  // AP-04: bar/line/pie チャートで出典なし
  if (ct && ct !== 'none' && !slide.note && !slide.leadText) {
    violations.push({ rule: 'AP-04', slide: sid, detail: `chartType:${ct} で note/leadText に出典なし` });
  }

  // AP-05: カード内 lines が 4行以上
  const cards = (v && (v.cards || v.steps || [])) || [];
  cards.forEach((card, ci) => {
    const lines = card.lines || card.points || [];
    if (lines.length > 3) {
      violations.push({ rule: 'AP-05', slide: sid, detail: `card[${ci+1}] に lines ${lines.length}行（上限3行）` });
    }
  });

  // AP-05: data-table の rows が 7行以上
  const rows = (v && v.rows) || [];
  if (rows.length > 6) {
    violations.push({ rule: 'AP-05', slide: sid, detail: `rows ${rows.length}件（上限6行）` });
  }

  // AP-06: パレット外の色
  const colorKeys = ['color','highlightColor','cardColor','headerColor','badgeColor','labelColor'];
  collectValues(slide, colorKeys).forEach(c => {
    if (isOutsidePalette(c)) {
      violations.push({ rule: 'AP-06', slide: sid, detail: `パレット外の色: ${c}` });
    }
  });

  // AP-07: 絵文字の過剰使用（スライド全体で5個以上）
  const emojiCount = countEmoji(JSON.stringify(slide));
  if (emojiCount >= 5) {
    violations.push({ rule: 'AP-07', slide: sid, detail: `絵文字 ${emojiCount}個（5個以上は装飾過多）` });
  }

  // AP-08: ビジュアル要素数 < 2（CTA・hook以外）
  if (!isCTA && !isHook) {
    let count = 0;
    if (v) count++;
    if (ct && ct !== 'none') count++;
    if ((slide.keyFacts || []).length > 0) count++;
    if ((slide.numbers || []).length > 0) count++;
    if (count < 2) {
      violations.push({ rule: 'AP-08', slide: sid, detail: `ビジュアル要素数 ${count}個（最低2要素必要）` });
    }
  }
});

console.log(JSON.stringify({ ep: epId, total: slides.length, violationCount: violations.length, violations }, null, 2));
SCRIPT
node /tmp/ap_check.js $ARGUMENTS
```

---

## ステップ2: 結果を解釈してレポートを出力

JSON出力を解釈して以下のフォーマットで日本語報告する:

```
## slide-antipattern-check: {epId} — 結果サマリー

チェック対象: X枚のスライド

| ルール | 説明 | 状態 |
|--------|------|------|
| AP-01 | 汎用タイトル禁止 | ✅ PASS / ❌ FLAG X件 |
| AP-02 | 箇条書きのみ禁止 | ✅ PASS / ❌ FLAG X件 |
| AP-03 | フォント混在禁止 | ✅ PASS（レンダラー固定） |
| AP-04 | 出典なしチャート禁止 | ✅ PASS / ❌ FLAG X件 |
| AP-05 | 詰め込みレイアウト禁止 | ✅ PASS / ❌ FLAG X件 |
| AP-06 | パレット外色禁止 | ✅ PASS / ❌ FLAG X件 |
| AP-07 | 装飾過多禁止 | ✅ PASS / ❌ FLAG X件 |
| AP-08 | ビジュアル不足禁止 | ✅ PASS / ❌ FLAG X件 |
| AP-09 | 日本語非対応フォント禁止 | ✅ PASS（Noto Sans JP固定） |
| AP-10 | 英日フォントサイズ不統一禁止 | ✅ PASS（Noto Sans JP自動調整） |

### 違反詳細
- ❌ AP-01 slide[3] — 汎用タイトル: 「まとめ」
- ❌ AP-04 slide[5] — chartType:bar で note/leadText に出典なし
（違反なしの場合は「違反なし」と記載）

### 総合判定
🟢 PASS（全ルール準拠）
または
🔴 FAIL — X件の違反（修正必要）
```

---

## ステップ3: 自動修正（FAILの場合）

以下の違反は `Edit` ツールで自動修正を提案する（ユーザー確認後に実行）:

**AP-04（出典なし）の自動修正例**:
```json
// Before
"chartType": "bar"
// After
"chartType": "bar",
"note": "出典: 各種公開データ（2026年時点）"
```

**AP-01（汎用タイトル）の自動修正例**:
```
// 「まとめ」→「3つのアクションで資産を守れる」
// 「背景」→「なぜ今この問題が投資家を直撃するのか」
```

AP-02 / AP-05 / AP-06 / AP-08 の構造的違反は修正案を提示してユーザーに判断を委ねる。

---

## AP-03 / AP-09 / AP-10 について

レンダラー（`generate-html-slides.ts`）レベルで制御済みのため `slides.json` では検証不要:

- **AP-03/AP-09**: `context.ts:11` で `FONT = 'Noto Sans JP',sans-serif` を全要素に適用
- **AP-10**: Noto Sans JP は英日グリフを同一フォント内に持つため自動調整される

これら3ルールは常に `✅ PASS（レンダラー固定）` として扱う。
