---
paths:
  - "packages/tech-geopolitics-channel/src/compositions/SlidesVideo.tsx"
  - "packages/tech-geopolitics-channel/src/components/SubtitleLayer.tsx"
  - "packages/tech-geopolitics-channel/src/components/MetanStage.tsx"
  - "packages/tech-geopolitics-channel/src/components/ZundamonStage.tsx"
---
# SlidesVideo レイアウト標準（ep015 確定値）

SlidesVideo は MainVideo の派生。VisualLayer を HTML スライド PNG に置き換えたもの。
**以下の数値はすべて ep015 で検証済み。変更前に必ず理由を記録すること。**

---

## キャラクター配置

| パラメータ | 値 | 備考 |
|-----------|-----|------|
| ぽんちゃん(MetanStage) | `position="left"` | 左側固定 |
| まろくん(ZundamonStage) | `position="right"` | 右側固定 |
| height | `Math.round(height * 0.42)` | ビデオ高さの42% |
| offsetX | `50` | 端方向へ50px追加オフセット |
| charOpacity | `1`（固定） | スライド系では半透明化しない |

```tsx
<MetanStage
  emotion={currentLine?.speaker === 'ponchan' ? (currentLine.emotion ?? 'normal') : 'normal'}
  isSpeaking={currentLine?.speaker === 'ponchan'}
  startFrame={currentEntry?.startFrame ?? 0}
  position="left"
  height={Math.round(height * 0.42)}
  offsetX={50}
/>
<ZundamonStage
  emotion={currentLine?.speaker === 'maro' ? (currentLine.emotion ?? 'normal') : 'normal'}
  isSpeaking={currentLine?.speaker === 'maro'}
  startFrame={currentEntry?.startFrame ?? 0}
  position="right"
  height={Math.round(height * 0.42)}
  offsetX={50}
/>
```

> ⚠️ `CharacterLayer` は使わない。offsetX を渡せないため。

---

## HTML スライド PNG 表示

| パラメータ | 値 | 備考 |
|-----------|-----|------|
| top | `'9%'` | TopicBadge(top:28px固定) の下に収まる最小値 |
| width | `Math.round(width * 0.78)` | キャラ・字幕と重ならない上限（ep016確定）|
| height | `Math.round(width * 0.78 * 9 / 16)` | 16:9 固定（歪み防止） |
| objectFit | `'fill'` | 1920×1080 PNG をそのまま埋める（cover は上下クロップ発生） |
| zIndex | `40` | キャラ(70)・字幕(80)より下 |

### スライド幅の安全計算

スライド幅を変更する前に必ず以下を確認すること：

```
sideMargin = (1920 - width * ratio) / 2
キャラ右端（left配置）= 約 -(-180 - offsetX) + charImageWidth
              MetanStage offsetX=50 → left:-230px、charWidth≈300px → 右端≈70px
安全条件: sideMargin > キャラ右端 (≈ 70-100px)
```

- `width*0.72` → margin=211px（余裕あり、可読性やや低い）  
- `width*0.78` → margin=211px（ep016確定値、キャラと重ならない上限）  
- `width*0.85` → margin=144px ❌（キャラ右端と干渉、使用禁止）

```tsx
<div style={{
  position: 'absolute',
  top: '9%',
  left: '50%',
  transform: 'translateX(-50%)',
  width: Math.round(width * 0.78),
  height: Math.round(width * 0.78 * 9 / 16),
  zIndex: 40,
  borderRadius: 8,
  overflow: 'hidden',
  boxShadow: '0 8px 32px rgba(0,0,0,0.45)',
}}>
  <Img src={staticFile(currentSlidePng)} style={{ width: '100%', height: '100%', objectFit: 'fill' }} />
</div>
```

---

## テロップ（SubtitleLayer）

### 色・フォント

| パラメータ | 値 |
|-----------|-----|
| ぽんちゃん色 | `#22c55e`（緑） |
| まろくん色 | `#ef4444`（赤） |
| 白フチ | 6px 8方向 + 4px 4方向（計12方向） |
| fontSize | `56px` |
| fontWeight | `900` |
| lineHeight | `1.55` |
| 最大高さ | `174px`（2行 = 56 × 1.55 × 2） |

```tsx
const speakerColor = currentLine.speaker === 'ponchan' ? '#22c55e' : '#ef4444';
const whiteOutline = '6px 6px 0 #fff, -6px -6px 0 #fff, 6px -6px 0 #fff, -6px 6px 0 #fff, 0 6px 0 #fff, 6px 0 0 #fff, -6px 0 0 #fff, 0 -6px 0 #fff, 4px 4px 0 #fff, -4px -4px 0 #fff, 4px -4px 0 #fff, -4px 4px 0 #fff';
```

### 位置

| subtitleStyle | bottom 値 | 1080px での実値 |
|--------------|-----------|----------------|
| `'shorts'` | `'calc(50% - 190px)'` | +350px（中央上） |
| `'cinematic'` | `'calc(22% - 190px)'` | +47.6px（表示内） |
| `'standard'`(default) | `'calc(18% - 190px)'` | +4.4px（表示内） |

> ⚠️ `calc(N% - 190px)` は N < 17.6% でフレーム外にはみ出す（1080px基準）。  
> 旧値 `calc(16% - 190px)` = **-17.2px**（テロップ下が約17px切れる）→ ep016で修正済み。

```tsx
bottom: subtitleStyle === 'shorts' ? 'calc(50% - 190px)'
      : subtitleStyle === 'cinematic' ? 'calc(22% - 190px)'
      : 'calc(18% - 190px)',
left: subtitleStyle === 'shorts' ? '5%' : '20%',
right: subtitleStyle === 'shorts' ? '5%' : '20%',
```

### 枠・背景
**なし**。フチ文字スタイルのみ。背景ボックス・borderLeft は使わない。

### 行頭禁則処理（必須）
`？！。、…」』）` が次ページ先頭に来ないよう前ページに吸収する（最大3文字）。

```tsx
const NO_LINE_START = new Set(['。','、','！','？','…','」','』','）',')','．']);
let pos = 0;
while (pos < text.length) {
  let end = Math.min(pos + CHARS_PER_PAGE, text.length);
  let absorbed = 0;
  while (end < text.length && NO_LINE_START.has(text[end]) && absorbed < 3) {
    end++; absorbed++;
  }
  pages.push(text.slice(pos, end));
  pos = end;
}
```

---

## 色の確認方法

チャットUI上のサムネイルJPEGでは色が正確に見えない。`@napi-rs/canvas` でピクセルサンプリングして確認する。

```js
const {createCanvas, loadImage} = require('@napi-rs/canvas');
loadImage('path/to/still.png').then(img => {
  const canvas = createCanvas(img.width, img.height);
  const ctx = canvas.getContext('2d');
  ctx.drawImage(img, 0, 0);
  const p = ctx.getImageData(x, y, 1, 1).data;
  console.log('r:', p[0], 'g:', p[1], 'b:', p[2]);
});
```

---

## Remotion still コマンド（Windows）

```bash
cd /c/Users/81808/Desktop/money_video_cluade/packages/tech-geopolitics-channel
node_modules/.bin/remotion.cmd still --props=input/script-input.json --frame=700 SlidesVideo /tmp/preview.png --scale=2
```

> `npx remotion` は RTK proxy が書き換えるため失敗する。必ず `node_modules/.bin/remotion.cmd` を使う。
