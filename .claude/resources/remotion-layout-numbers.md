# Remotion レイアウト数値基準（ep006/ep007 確定）

## TopicBadge
- maxWidth: `videoWidth * 0.50`（= 540px）
- fontSize: `topic.length <= 15 ? 26 : topic.length <= 22 ? 22 : 18`
- wordBreak: 'break-all' 必須

## RichPanel
- maxHeight: `videoHeight * 0.50`（= 960px）— 字幕エリア(下28%) + キャラエリア(下45%) を避けた上限
- pointFontSize: `count <= 2 ? 28 : count <= 4 ? 22 : 18`
- bodyFontSize: `count <= 2 ? 30 : count <= 4 ? 26 : 22`

## TimelineScroll foreignObject カード
- width: `NODE_SPACING * 0.85` 以内（380 → 260px）
- x offset: `cx - width/2`
- fontSize: `isActive ? 24 : 19`（28/22では折り返しが多すぎる）

## SubtitleLayer（MainVideo）
- cinematic モード: `bottom: '22%'`
- standard モード: `bottom: '16%'`

## ビジュアルパネル高さ確保（1920x1080、MainVideo）
- `top: '8%'`, `bottom: '38%'` を両方指定（高さ約584px）

---

## SlidesVideo 確定値（ep015 検証済み）

### キャラクター
- height: `height * 0.42`（ビデオ高さの42%）
- offsetX: `50`（端方向へ50px追加）
- charOpacity: `1` 固定（スライド系では半透明化しない）

### スライド PNG
- top: `'9%'`（TopicBadge の下に収まる最小値）
- width: `width * 0.72`（キャラ・字幕と重ならない上限）
- height: `width * 0.72 * 9/16`（16:9固定）
- objectFit: `'fill'`（coverは上下クロップが発生するため禁止）

### テロップ（SubtitleLayer - SlidesVideo用）
- bottom: `calc(16% - 190px)`（standard）/ `calc(22% - 190px)`（cinematic）/ `calc(50% - 190px)`（shorts）
- ぽんちゃん: `#22c55e`（緑）、まろくん: `#ef4444`（赤）
- 白フチ: 6px 8方向 + 4px 4方向（textShadow 12方向指定）
- fontSize: 56px / fontWeight: 900
- 枠・背景なし（フチ文字スタイルのみ）
- 行頭禁則: `？！。、…」』）` を前ページに吸収（最大3文字）
