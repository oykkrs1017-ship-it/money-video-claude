# カスタムビジュアルタイプ一覧

> ゾーン別配置ルール: `visual-selection.md` の「SlidesVideo 専用」セクション参照

## bar-diff（差分強調型）
```json
{
  "type": "bar-diff",
  "title": "グラフタイトル",
  "insight": "右パネルの説明文（2〜3文）",
  "cagrLabel": "CAGR +40%",
  "diff": {
    "from": "旧目標 $535",
    "to": "新目標 $1,625",
    "label": "+204%",
    "color": "#059669"
  },
  "data": [
    { "label": "ラベル", "value": 535, "color": "#9ca3af" }
  ]
}
```
**注意**: `diff.from`/`diff.to` は `data[].label` と完全一致必須（スペース含む）

## donut-center（ドーナツ中央数値強調型）
```json
{
  "type": "donut-center",
  "title": "タイトル",
  "centerValue": "50%",
  "centerLabel": "HBMシェア（首位）",
  "insight": "右パネル説明文",
  "data": [
    { "label": "SK Hynix（首位）", "value": 50, "color": "#f97316" }
  ]
}
```

## color-cards（カラーカード3選型）
```json
{
  "type": "color-cards",
  "title": "今日わかること3選",
  "cards": [
    {
      "header": "① AIによるメモリの変貌",
      "headerColor": "blue",
      "icon": "🔄",
      "lines": ["なぜマイクロンは", "コモディティ株から", "AI成長株に変貌したのか"],
      "highlight": "強調テキスト（任意）",
      "highlightColor": "#1e6e45"
    }
  ],
  "footer": "フッターテキスト（任意）"
}
```

## vs-battle（VS比較型）
```json
{
  "type": "vs-battle",
  "title": "タイトル",
  "left": {
    "header": "旧モデル（コモディティ）",
    "headerColor": "red",
    "lines": ["四半期ごとに価格が決まる"],
    "highlight": "「買ってはいけない株」",
    "highlightColor": "#b52b27"
  },
  "right": {
    "header": "新モデル（AI長期契約）",
    "headerColor": "green",
    "lines": ["3〜5年の長期供給契約"],
    "highlight": "景気サイクルの呪いが解けた",
    "highlightColor": "#1e6e45"
  },
  "footer": "補足テキスト"
}
```

## step-icons（ステップフロー型）
```json
{
  "type": "step-icons",
  "title": "3段階アクションプラン",
  "steps": [
    {
      "number": 1,
      "label": "短期（〜1ヶ月）",
      "icon": "👀",
      "body": "具体的なアクション",
      "color": "blue"
    }
  ],
  "footer": "免責注記"
}
```

## data-table（比較表型）
```json
{
  "type": "data-table",
  "title": "テーブルタイトル",
  "labelHeader": "比較項目",
  "columns": [
    { "label": "Micron（MU）", "highlight": true },
    { "label": "SK Hynix" }
  ],
  "rows": [
    {
      "label": "HBMシェア",
      "cells": [
        { "value": "約20%", "color": "#16a34a" },
        { "value": "約50%（首位）", "bold": true }
      ]
    }
  ],
  "note": "出典・免責"
}
```
**注意**: `columns[i].highlight: true` で推奨列をハイライト（淡青背景＋★推奨バッジ）
