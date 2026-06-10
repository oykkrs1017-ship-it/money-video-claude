---
name: visual-layout-fix
description: チャート・グラフィックコンポーネント（FlowChart/TrafficLight/ComparisonTable/ScaleBalance/IsometricStack）の視認性修正スキル。明るい背景上でのダークテーマ残留・太字未適用・セル上寄り・枠外はみ出しを診断し修正する。「図解が見えない」「文字が薄い」「太字にして」「枠に収まっていない」などで発動。
allowed-tools: Read, Edit, Bash, Glob, Grep
---

# スキル: ビジュアルレイアウト修正

詳細仕様:
- コンポーネント別チェックリスト: `resources/component-checklist.md`
- ライト化カラー変換リファレンス: `resources/color-conversion.md`

---

## 発動トリガー

- 「文字が薄い / 見えない」「太字にして」「枠に収まっていない」「セルが上寄り」
- 新しい ep をレンダリングする前の視認性チェック

---

## 修正フロー

### Step 1: 問題診断
症状→原因→修正対象の対応は `resources/color-conversion.md` 参照

### Step 2: コンポーネント別修正
コンポーネントごとのチェック項目は `resources/component-checklist.md` 参照

### Step 3: Still 確認フレームの特定

```bash
cd packages/tech-geopolitics-channel
node -e "
const d=require('./input/script-input.json');
let f=0;
d.chapters.forEach((ch,ci)=>(ch.lines||[]).forEach(l=>{
  if(l.frameCount) f+=l.frameCount;
  if(l.visual) console.log(l.visual.type, 'endFrame:', f, 'startFrame:', f-l.frameCount);
}));
" | grep -E "flow-chart|traffic-light|comparison-table|scale-balance|isometric"
```

### Step 4: 修正優先順位
1. ダークテーマ残留（テキスト全不可視）
2. 枠外はみ出し（レイアウト崩壊）
3. 太字未適用（読みにくい）
4. セル垂直中央揃え（見た目の整合性）

### Step 5: 「全て同様に」ルール
「このコンポーネントを太字に」と言われたら **同じパターンを持つ全コンポーネントの全プロパティに適用**する。
