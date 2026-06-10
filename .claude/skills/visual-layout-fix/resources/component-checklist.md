# コンポーネント別チェックリスト

## 共通（全コンポーネント）

- [ ] タイトル: `color: '#1a1a3e'`, `fontWeight: 'bold'`
- [ ] サブラベル: `color: '#444466'`, `fontWeight: 'bold'`
- [ ] フッター: `color: '#2a2a4a'`, `fontWeight: 'bold'`, `background: rgba(30,40,100,0.10)`
- [ ] ボックス内テキスト: `color: '#333355'`, `fontWeight: 'bold'`
- [ ] ボーダー: `rgba(40,60,120,0.xx)` (SVGストローク)

## FlowChart.tsx

```
- [ ] nodeBox の justifyContent: 'center' が有効か（minHeight 使用時）
- [ ] 3ノード時に maxStep が適切か（svgW * 0.185 が目安）
- [ ] 子ノード幅: n >= 3 ? Math.min(250, svgW * 0.23) : Math.min(260, svgW * 0.28)
- [ ] svgH が footer 有無で可変か（height * 0.78 or 0.88）
- [ ] detail ボックスが minHeight を使っているか（固定 height だと内容が切れる）
- [ ] 全ラベル・sublabel・detail items に fontWeight: 'bold'
```

ダーク→ライト変換:
```tsx
// Before: color: '#ffffff'
// After:  color: '#1a1a3e' (通常) / color: '#ffffff' (highlight=true のノードのみ)
```

## TrafficLight.tsx

```
- [ ] 行背景: rgba(255,255,255,0.88)
- [ ] 行の maxWidth: 960
- [ ] signal circle: 62×62px
- [ ] label: fontSize 26, fontWeight: 'bold'
- [ ] sublabel: fontSize 19, fontWeight: 'bold'
- [ ] items: fontSize 19, fontWeight: 'bold'
- [ ] footer: fontWeight: 'bold'
```

## ComparisonTable.tsx

```
- [ ] ヘッダーセル: display:flex, alignItems:center, justifyContent:center
- [ ] 行ラベル: display:flex, alignItems:center
- [ ] 値セル: display:flex, alignItems:center, justifyContent:center
- [ ] 全セル fontWeight: 'bold'
- [ ] header fontSize: 28, row label fontSize: 26, values fontSize: 26-28
- [ ] background: rgba(255,255,255,0.92)
```

セル垂直中央揃えのパターン:
```tsx
// CSS Grid の子要素はデフォルト上寄りのため明示的に flex 指定が必要
<div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }}>
```

## ScaleBalance.tsx

```
- [ ] タイトル: color: '#1a1a3e'
- [ ] SVG 支柱・台座: stroke="rgba(40,60,120,0.55)"
- [ ] SVG ビーム: stroke="#1a1a3e"
- [ ] 左右ラベル sublabel: color: '#444466', fontWeight: 'bold'
- [ ] 左ボックス: background rgba(255,255,255,0.92), border 2px solid #4a90ff
- [ ] 右ボックス: background rgba(255,255,255,0.92), border 2px solid #ff6644
- [ ] box.items: color '#333355', fontWeight: 'bold'
```

## IsometricStack.tsx

3D等角投影は視認困難なため水平スタックバー型に置き換え済み:
- layers/corners（% 含む）→ 水平バーのセグメント（`parsePct()` で自動抽出）
- corners（% なし）→ ノート欄として別表示
- topLabel → フッターバッジ
