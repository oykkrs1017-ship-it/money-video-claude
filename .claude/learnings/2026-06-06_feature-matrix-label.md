# 学び: feature-matrix ラベル配置 — 上端付近のオーバーフロー対策
日付: 2026-06-06
カテゴリ: スキルルール
関連スキル: visual-layout-fix, html-slides-workflow

## 状況
feature-matrix でアイテムが上端付近に集中した際、ラベルが SVG 外にはみ出し
他ラベルと重なる問題が発生。座標調整を3回繰り返した。

## 齟齬の内容
- AI の判断: ラベルは常に `cy + r + 32`（円の下）に配置すれば問題なし
- ユーザーの意図: y座標が高い（上端近く）アイテムはラベルを下方向に
- 差分の本質: SVG の上端（PAD=40）付近でラベルが境界外に出るケースを考慮していなかった

## 学び

**renderFeatureMatrix の labelAbove ロジック（確定 2026-06-06）**

```typescript
const PAD = 40;
const r = item.highlight ? 28 : 20;  // バブル半径
const labelAbove = cy > PAD + r + 60;  // 120px以上なら上方向

const labelY = labelAbove
  ? cy - r - (item.highlight ? 42 : 12)   // 上方向
  : cy + r + 32;                           // 下方向（上端近くのアイテム）
```

**座標設計指針:**
- 上端付近（y < 20%相当）のアイテムは `labelAbove: false` 相当になる
- 密集するアイテムは x/y を 15px 以上離す
- highlight アイテム（推奨銘柄等）は他と 20px 以上の間隔を確保

## 適用先
- [ ] `generate-html-slides.ts` — 修正済み（2026-06-06）
- [ ] ep025-slides.json の feature-matrix 座標設計を参考例として保存
