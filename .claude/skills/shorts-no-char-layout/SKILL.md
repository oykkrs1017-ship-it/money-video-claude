---
name: shorts-no-char-layout
description: Shorts動画のキャラなし3ゾーンレイアウト。「Shortsのレイアウトを変えて」「キャラなしで」「新しいShortsテンプレート」などで参照。ep022以降の標準テンプレート。
tools: Read, Edit, Bash
---

# ShortsVideo キャラなし3ゾーンレイアウト（ep022〜標準）

## 概要

参考: 競合「ガーコちゃんねる」スタイル。
- **上部**: 赤文字タイトル（白フチ）＋トピックバッジ → 固定帯
- **中央**: HTMLスライドPNG（16:9）
- **下部**: テロップ（字幕）

キャラクター・TopicBadge・CinematicLayerは非表示。
背景は常に純黒（`#000000`）。

---

## ゾーン定義（1080×1920）

```
[top:3%, height:23%]  上部テキストエリア（下端=top:26%）
  gap 2%
[top:28%]             スライドPNG開始
  スライド高さ: width*0.95*9/16 = 577px → 下端≈58%
  gap 1%
[top:calc(59%+8px)]   字幕（SubtitleLayer: shorts-no-char）
```

| ゾーン | 値 | px換算（1080×1920） |
|--------|-----|-----|
| headerTop | `3%` | 57.6px |
| headerHeight | `23%` | 441.6px |
| visualTop | `28%` | 537.6px |
| スライド幅 | `width*0.95` | 1026px |
| スライド高さ | `width*0.95*9/16` | 577px |
| スライド下端 | `≈58%` | 1114.6px |
| 字幕 | `calc(59%+8px)` | 1140px〜 |

---

## ShortsVideo.tsx 主要設定

```tsx
// 背景
<div style={{ position: 'absolute', inset: 0, background: '#000000', zIndex: 0 }} />

// 上部テキストエリア
<div style={{
  position: 'absolute',
  top: '3%', height: '23%',
  left: '5%', right: '5%',
  zIndex: 60,
  display: 'flex', flexDirection: 'column',
  justifyContent: 'center', alignItems: 'center', gap: 12,
}}>
  {/* 見出し（タイトル） */}
  <div style={{
    color: '#ff2222',
    fontSize: Math.floor(width * 0.065),  // テロップ56pxより大きい70px
    fontWeight: 700,
    fontFamily: "'Noto Sans JP', sans-serif",
    lineHeight: 1.55,
    textAlign: 'center',
    // テロップと同じ白フチ（12方向）
    textShadow: '6px 6px 0 #fff, -6px -6px 0 #fff, 6px -6px 0 #fff, -6px 6px 0 #fff, 0 6px 0 #fff, 6px 0 0 #fff, -6px 0 0 #fff, 0 -6px 0 #fff, 4px 4px 0 #fff, -4px -4px 0 #fff, 4px -4px 0 #fff, -4px 4px 0 #fff',
    letterSpacing: '0.06em',
    wordBreak: 'break-all',
  }}>
    {scriptInput.title}
  </div>
  {/* リード文（トピック） */}
  {hookChapter?.topic && (
    <div style={{
      color: '#ffffff', fontSize: 30, fontWeight: 700,
      backgroundColor: 'rgba(255,255,255,0.12)',
      border: '1px solid rgba(255,255,255,0.25)',
      borderRadius: 6, padding: '4px 18px',
    }}>
      {hookChapter.topic}
    </div>
  )}
</div>

// スライドPNG
<div style={{
  position: 'absolute',
  top: '28%', left: '50%',
  transform: 'translateX(-50%)',
  width: Math.round(width * 0.95),
  height: Math.round(width * 0.95 * 9 / 16),
  zIndex: 40,
}}>
  <Img src={staticFile(currentSlidePng)} style={{ width: '100%', height: '100%', objectFit: 'fill' }} />
</div>

// 字幕
<SubtitleLayer subtitleStyle="shorts-no-char" ... />
```

---

## SubtitleLayer `shorts-no-char` スタイル

`src/components/SubtitleLayer.tsx` の positionStyle に追加済み:

```tsx
subtitleStyle === 'shorts-no-char'
  ? { top: 'calc(59% + 8px)' as const }
```

左右余白: `left: '5%', right: '5%'`（shortsと同じ）

---

## 非表示にしたコンポーネント

| コンポーネント | 理由 |
|---|---|
| `CharacterLayer` | 3ゾーンレイアウトでキャラ不要 |
| `TopicBadge` | 上部テキストエリアにtopicを表示済み |
| `CinematicLayer` | キャラなしのため不要 |
| `BackgroundRenderer` | 純黒固定に変更 |

---

## レンダリングコマンド

```bash
cd packages/tech-geopolitics-channel

# Still確認（3フレーム）
node_modules/.bin/remotion still src/index.ts ShortsVideo output/{epId}_shorts_f100.png --props input/script-input.json --frame 100
node_modules/.bin/remotion still src/index.ts ShortsVideo output/{epId}_shorts_f600.png --props input/script-input.json --frame 600
node_modules/.bin/remotion still src/index.ts ShortsVideo output/{epId}_shorts_f1700.png --props input/script-input.json --frame 1700

# レンダリング
node_modules/.bin/remotion render src/index.ts ShortsVideo output/{epId}_shorts.mp4 --props input/script-input.json --timeout 60000
```

---

## レイアウト変更時の注意

ゾーン境界は連動している。変更時は必ず全体を再計算する:

```
headerTop(3%) + headerHeight(23%) = 26%(下端)
  ↓ 2%余白
visualTop(28%) + スライド高さ(577px/30%) = 58%(下端)
  ↓ 1%余白
subtitleTop(59%)
```

いずれかを変更する場合は連動する値を全てセットで変更すること。

---

## 確認済みエピソード

| ep | 結果 |
|----|------|
| ep022 | 初適用・検証済み（2026-06-02） |
