---
paths:
  - "packages/tech-geopolitics-channel/src/**/*.tsx"
  - "packages/tech-geopolitics-channel/src/**/*.ts"
---
# Remotion コーディングルール

- アニメーションは `frame / fps` ベースで計算（elapsedTime禁止）
- spring() と interpolate() を積極活用
- 音声durationはWAVヘッダーから直接読み取る
- フレーム数は Math.floor() + 5フレームバッファ

## エフェクト制御

### Ken Burns 無効化
`animation === 'fade'` を静止表示の識別子として使う。動かしたくない画像には必ず `animation: 'fade'` を指定する。

```tsx
const enableKenBurns = animation !== 'fade';
const kbScale = enableKenBurns ? interpolate(...) : 1;
```

## レイアウト

### ビジュアルパネルの絶対配置
`top` と `bottom` を両方指定して高さを確定する（片方だけ禁止）。

```tsx
style={{ position:'absolute', top:'8%', bottom:'38%', left:'50%', transform:'translateX(-50%)', width:'92%' }}
```

### ⚠️ CSS `bottom: 'N%'` の落とし穴（2026-06-02 確認）

**`bottom: '26%'` は「上から26%の位置に下端」ではない。「下端から26%の距離（=上から74%）」。**

| 意図 | 正しい指定 | 誤った指定 |
|------|-----------|-----------|
| 上から26%の位置に下端を置きたい | `top:'3%', height:'23%'` または `top:'3%', bottom:'74%'` | `top:'3%', bottom:'26%'` ❌ |

「エリアの下端を上からN%に固定したい」場合は `height` で指定するのが最も明確:
```tsx
// ✅ 上から3%〜26%のエリア（高さ23%）
style={{ position:'absolute', top:'3%', height:'23%', left:'5%', right:'5%' }}

// ❌ top:3% + bottom:26% → 実際は上から3%〜74%（高さ71%）になる
style={{ position:'absolute', top:'3%', bottom:'26%', left:'5%', right:'5%' }}
```

実装前に「この要素の下端は上からX%」を計算し、`height = X - top` で確認すること。

### flex + br の罠
`<br>` を含むテキストを包む要素に `display:'flex'` を直接付けない → 外flex + 内block divの2層構造にする。

### テキストカラー
独立ダーク背景コンポーネント（Timeline等）は `'#ffffff'` をハードコード（テーマ継承すると明るいテーマで消える）。

### キャラクター配置（確定値 ep010検証済み）

**画像の特性**: まろくん・ぽんちゃんの画像はいずれもランドスケープ（横長）。
- ponchan: 691×361px → height=410px でレンダリング時 width≈785px
- maro: 669×373px → height=410px でレンダリング時 width≈736px

**確定値: `left: '-180px'` / `right: '-180px'`**
- この値でキャラが横幅の約75〜80%表示され、テロップとの重なりなし
- SubtitleLayer は `left: '20%', right: '20%'`（中央60%）なので問題なし

```tsx
// MetanStage.tsx / ZundamonStage.tsx 共通
const positionStyle =
  position === 'left'  ? { left:  '-180px' } :
  position === 'right' ? { right: '-180px' } :
  { left: '50%', transform: 'translateX(-50%)' };
```

**調整が必要な場合**: `-180px` を基準に ±50px 刻みで調整する。確認は still 1枚のみ（ループ禁止）。

### z-index スタッキング（確定値）

| レイヤー | z-index | 備考 |
|---------|---------|------|
| BackgroundRenderer | 0〜10 | 背景 |
| VisualLayer | 30〜40 | チャート・インフォグラフィック |
| CharacterLayer | 70 | キャラクター（VisualLayerより上） |
| SubtitleLayer | 80 | テロップ（キャラより上） |
| TopicBadge / ChapterCard | 90〜100 | バッジ類 |
| チャプターフェードオーバーレイ | 200 | 最前面 |

### キャラクター opacity（確定値 ep011検証済み）

stat / chart ビジュアル表示中はキャラを「控えめ」に下げるが、**最小値は 0.45**。

| 値 | 結果 |
|----|------|
| 0.12 | 事実上非表示（ユーザー視認不可）|
| **0.45** | ビジュアルが主役・キャラも認識できる適正値 ✓ |
| 1.0 | VisualLayer と重なりすぎ |

```tsx
// MainVideo.tsx — stat/chart ビジュアル時
const charOpacity = isFullScreenVisual
  ? interpolate(relativeFrame, [0, 20], [1, 0.45], { extrapolateRight: 'clamp' })
  : 1;
```

---

## 色の確認方法（重要）

チャットUI上のstillサムネイルはJPEG圧縮で色が劣化する。**目視では色の正確性を確認できない**。
`@napi-rs/canvas` でpixelサンプリングして確認すること。

```js
const {createCanvas, loadImage} = require('@napi-rs/canvas');
loadImage('path/to/still.png').then(img => {
  const canvas = createCanvas(img.width, img.height);
  const ctx = canvas.getContext('2d');
  ctx.drawImage(img, 0, 0);
  const p = ctx.getImageData(x, y, 1, 1).data;
  console.log(`r:${p[0]}, g:${p[1]}, b:${p[2]}`);
});
```

---

## Shorts レイアウトゾーン連動設計（ep017確定）

ゾーン境界値は**依存関係を持つ。1点変更するとき必ず連動値もセットで変更する**。

```
TopicBadge 下端（≈125px） → visualTop の最小値（9%=173px）
visualBottom（55%=1056px） → subtitle top の最小値（calc(55%+8px)=1064px）
subtitle top（1064px）     → characters 上端（≈1200px）との衝突チェック
```

変更前チェック: 「このゾーン境界に依存している他の値は何か？」を必ず確認。

### image ビジュアルの Shorts 幅制約

`top-center` 配置の image がコンテナ幅（width×0.90≈972px）を超えると左右クリップでタイトルが消える:
```tsx
const maxImgWidth = height > 1200 ? Math.round(width * 0.90) : (visual.width ?? 1280);
width: Math.min(visual.width ?? 1280, maxImgWidth),
```

### Shorts レンダリング
```bash
# Google Fonts タイムアウト対策: --timeout 60000 必須
node_modules/.bin/remotion render src/index.ts ShortsVideo output/ep_shorts.mp4 \
  --props input/script-input.json --timeout 60000
```

ShortsVideoレイアウト確定値 → `.claude/learnings/shorts-layout-standard.md` を参照。

---

数値基準（TopicBadge / RichPanel / SubtitleLayer 等）→ `.claude/resources/remotion-layout-numbers.md` を参照。
SlidesVideoレイアウト確定値 → `.claude/rules/slides-video-layout.md` を参照。
