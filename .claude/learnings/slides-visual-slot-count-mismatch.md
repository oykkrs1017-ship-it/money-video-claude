# 学び: SlidesVideo visual slot数とスライド数の不一致
日付: 2026-06-03
カテゴリ: スキルルール
関連スキル: html-slides-workflow

## 状況
ep024でanalysisチャプターに4枚のスライドを設計したが、台本生成後に確認すると
visual slot（`show:` 付きponchan行）が2つしかなく、スライド9・10が動画に挿入されなかった。

## 齟齬の内容
- AI の判断: `patch-visuals.js` を実行すれば全カスタムビジュアルが適用される
- ユーザーの意図: 設計した全12枚のスライドが動画に表示されること
- 差分の本質: `patch-visuals.js` は既存のvisual slotにしかパッチできない。
  LLMが台本生成時にvisual slotを少なく生成すると、
  対応スライドは永遠に動画に挿入されない。
  台本のvisual slot数 ≠ スライド数、という前提を見落としていた。

## 学び
### 原則
**SlidesVideoでは「台本のvisual slot数」が「スライド数」と一致していることを
html:generate前に必ず確認する。**

### 検証コマンド（html:generate後に実行）
```bash
# slide-map.json の visual エントリ数を確認
node -e "
const m = require('./out/slide-map.json');
const visual = m.filter(e => e.type === 'visual').length;
const section = m.filter(e => e.type === 'section').length;
console.log('visual:', visual, '/ section:', section, '/ total:', m.length);
"

# ep{N}-slides.json のコンテンツスライド数を確認
node -e "
const s = require('./input/ep024-slides.json');
const total = s.chapters.reduce((n, ch) => n + ch.slides.length, 0);
console.log('slides.json コンテンツスライド数:', total);
"
```

`visual` と `slides.json コンテンツスライド数` が一致していれば OK。
不一致の場合はscript-input.jsonを手動パッチ（または台本再生成）する。

### 手動パッチ手順（visual slotが不足している場合）
```js
// Node.js で直接実行
const fs = require('fs');
const j = JSON.parse(fs.readFileSync('input/script-input.json', 'utf-8'));

// analysis chapter の対象行にvisualを追加
const analysis = j.chapters.find(c => c.type === 'analysis');
analysis.lines[8].visual = {
  type: 'chart',
  key: 'slide_009_chart',  // スライド番号に合わせて変更
  leadText: 'リード文'
};

// 対応するchartDataも追加
j.chartData['slide_009_chart'] = {
  title: 'グラフタイトル',
  chartType: 'bar',
  data: [{ label: 'A', value: 50 }, { label: 'B', value: 30 }]
};

fs.writeFileSync('input/script-input.json', JSON.stringify(j, null, 2));
fs.writeFileSync('input/ep024.json', JSON.stringify(j, null, 2));
```

## 適用先
- [x] `.claude/skills/html-slides-workflow/resources/troubleshooting.md` に追記
- [ ] `scripts/generate-script.ts` の `buildSlidesModeDescHtml` に制約追加済み（2026-06-03）
      → 効果検証は次epで確認
