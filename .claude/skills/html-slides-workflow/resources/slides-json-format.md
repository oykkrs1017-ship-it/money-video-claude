# ep{N}-slides.json フォーマット仕様

## 基本構造
```json
{
  "ep": "ep020",
  "topic": "トピック説明",
  "title": "動画タイトル",
  "generatedAt": "2026-05-30",
  "slides": [
    {
      "index": 1,
      "role": "hook|explanation|analysis|summary|cta",
      "title": "スライドタイトル",
      "subTitle": "サブタイトル（設計メモ用・画面非表示）",
      "leadText": "見出し下のリード文（2〜3行、32px グレー）",
      "keyFacts": ["..."],
      "numbers": [{ "label": "...", "value": "...", "unit": "..." }],
      "chartType": "bar|line|pie|none",
      "chartData": [{ "label": "...", "value": 0, "color": "#..." }],
      "visual": { ... },
      "speakerHint": "ぽんちゃんのセリフ参考",
      "maroHint": "まろくんのセリフ参考"
    }
  ]
}
```

## role の意味とレイアウト対応

| role | 用途 | 推奨ビジュアル |
|------|------|----------------|
| hook | フック（最初3スライド） | stat/bar-diff/color-cards |
| explanation | 解説 | bar-diff/donut-center/vs-battle/chart |
| analysis | 分析・投資判断 | chart+leadText/donut-center |
| summary | まとめ | rich-panel/step-icons/data-table |
| cta | 次回予告・登録促進 | rich-panel/telop |

## chartType + leadText（グラフ＋リード文型）

`visual` フィールドは不要。スライド直下に追加：
```json
{
  "chartType": "bar",
  "chartData": [...],
  "leadText": "見出し下に表示する2〜3行のリード文。スマホで視認できる情報密度で。"
}
```

## slide-map.json の役割

`out/html-slides/slide-map.json` が SlidesVideo のコア：
```json
[
  { "slideNum": 4, "slidePng": "html-slides/png/slide-004.png", "type": "visual",
    "audioFiles": ["voices/0001_ponchan.wav"] }
]
```
- `audioFiles` に含まれる WAV が再生されている間、対応する PNG が表示される
- カバー・TOC・セクションスライドは `audioFiles` なし（自動表示時間制御）
