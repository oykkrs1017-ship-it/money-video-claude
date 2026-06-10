# トラブルシューティング

## 既知の落とし穴

| 問題 | 原因 | 対処 |
|------|------|------|
| カスタムビジュアルが消える | html:generate が script-input.json（YAML由来）を使う | ★ビジュアルパッチ必須（Step 6） |
| bar-diff の diff バッジが出ない | data[].label と diff.from/to の不一致 | スペース区切り完全一致を確認 |
| frameCount が undefined | yaml-to-json 後に cp を忘れた | 音声生成後に必ず `cp ep{N}.json script-input.json` |
| スライドが一部動画に挿入されない | 台本のvisual slot数 < slides.jsonのスライド数 | 下記「visual slot数チェック」を html:generate 後に実行 |

## ★ visual slot数チェック（html:generate 後に必須）

`patch-visuals.js` は**既存の visual slot にしかパッチできない**。
台本生成時に LLM が visual slot を少なく生成すると、対応スライドが永遠に動画に挿入されない。

```bash
# slide-map の visual 数 と slides.json のコンテンツスライド数を比較
node -e "
const m = require('./out/slide-map.json');
const s = require('./input/ep0XX-slides.json');  // epId を変更
const visual = m.filter(e => e.type === 'visual').length;
const slideCount = s.chapters.reduce((n, ch) => n + ch.slides.length, 0);
if (visual === slideCount) {
  console.log('OK: visual=' + visual + ' == slides=' + slideCount);
} else {
  console.log('NG: visual=' + visual + ' != slides=' + slideCount + ' → 手動パッチ必要');
}
"
```

不一致の場合は `.claude/learnings/slides-visual-slot-count-mismatch.md` の手動パッチ手順を参照。

## ビジュアルパッチのマッピング法則

`node scripts/patch-visuals.js --ep ep{N}` が実行すること：

1. `ep{N}.json` の全ラインを列挙（`lineNum` = 1始まり）
2. `visual` を持つラインのみ対象
3. 各 chapter 内で視覚ラインが出現する順 → slides.json の同 role 内スライドの順と対応
4. `slide.visual` あり → そのまま代入
5. `slide.chartType !== 'none'` → `{ type:'chart', key:'slide_NNN_chart', leadText: slide.leadText }`
