# 学び: McKinseyスタイル スライドカードの実装定番パターン

日付: 2026-05-09
カテゴリ: スキルルール
関連スキル: generate-html-slides, visual-layout-fix

## 状況

HTML スライド（1920×1080）の情報密度が低く「1ページで何を伝えたいか分からない」と
ユーザーから指摘。McKinsey/BCG コンサルスタイルのリデザインを実施した。

## 確立した実装パターン（CSS/HTML）

### カードの基本構造
```css
/* hairline border + top accent */
border: 1px solid rgba(0,0,0,0.12);
border-top: 3px solid {ACCENT_COLOR};
border-radius: 2px;
background: #fafafa;
```

### ナンバリングラベル（01/02...）
```css
font-size: 13px;
font-weight: 700;
color: {ACCENT_COLOR};
letter-spacing: 3px;
font-family: 'Inter', sans-serif;
```

### KPI数値（右側に大きく）
```css
font-size: 54px;
font-weight: 700;
color: {ACCENT_COLOR};
line-height: 1;
font-variant-numeric: tabular-nums;
font-family: 'Inter', sans-serif;
```

### 出典（カード下部）
```css
font-size: 14px;
color: #808080;
margin-top: 14px;
padding-top: 10px;
border-top: 1px solid rgba(0,0,0,0.08);
font-family: 'Inter', sans-serif;
```

### タイトルフォント（Noto Serif JP）
```css
font-family: 'Noto Serif JP', serif;
font-size: 26px;
font-weight: 700;
color: #171717;
```

### カラーパレット（4〜6色ローテーション）
```
#0a72ef / #7c3aed / #059669 / #d97706 / #dc2626 / #0891b2
```

## カードレイアウトの基本骨格
```html
<div style="...CARD_BASE; display:flex; flex-direction:column; padding:22px 36px 18px">
  <!-- ナンバリング -->
  <div style="font-size:13px;font-weight:700;color:{COLOR};letter-spacing:3px">01</div>
  <!-- タイトル + KPI値 -->
  <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:20px;flex:1">
    <div style="flex:1">
      <div style="...serif;font-size:26px">見出し</div>
      <div style="...sans;font-size:17px;color:#4d4d4d">本文テキスト</div>
    </div>
    <div style="flex-shrink:0;text-align:right">
      <div style="font-size:54px;color:{COLOR}">88%</div>
      <div style="font-size:16px;color:#4d4d4d">単位ラベル</div>
    </div>
  </div>
  <!-- 出典 -->
  <div style="font-size:14px;color:#808080;border-top:1px solid rgba(0,0,0,0.08)">出典</div>
</div>
```

## 適用先
- [x] `generate-html-slides.ts` の `renderCheckGrid` 関数（実装済み）
- [x] 全7レイアウト関数をこのパターンで統一（実装済み）
- [ ] 次回スライドデザイン変更時の参照元として使う
