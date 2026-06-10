---
name: remotion-still-check
description: Remotion のレンダリング前品質確認で、Still スクリーンショット用のフレーム番号を正しく選定するスキル。セクション開始直後のフェードイン区間を避け、レイアウト崩れ・見切れ・ビジュアル不整合を検出したいときに発動する。
allowed-tools: Read, Bash, Glob
---

# スキル: Remotion Still確認ガイド

## フレーム指定の鉄則

**セクション開始直後のフレームを指定しない。**

`CharacterDialogue` 等は `relativeFrame=0〜8` でフェードイン（opacity: 0→1）する。`Sequence.from=N` 直後はほぼ真っ暗。

```
セクション開始F  +8F     +30F〜         終了F-10F
     |          |        |               |
   真っ暗    半透明   ← 確認に適切 →    フェードアウト開始
```

### 確認フレームの選び方

| 目的 | 推奨フレーム |
|------|-------------|
| キャラクター・吹き出し | セクション startFrame + 30〜45F |
| グラフアニメーション | セクション startFrame + 60F以上 |
| CTA確認 | ctaStartFrame + 30F |
| 全体確認 | totalFrames × 0.4〜0.6 |

## コマンド例

```bash
npx remotion still --props=output/ep-sample-002_props.json --frame=240 --output=output/check.png TypeB-Ranking
```

## TypeE-Story の注意点

上下黒帯（80px）＋字幕スタイルのため通常のキャラクター吹き出しは非表示（意図的）。確認時は画面下部の字幕エリアを見ること。

## Still確認で見るべきポイント

1. キャラクター両方が表示されているか（スライドイン完了後）
   - **確定配置**: `left/right: -180px`（ぽんちゃん左・まろくん右）
   - キャラが横幅75〜80%見えていれば正常。ほぼ見えない場合は z-index か position を確認
2. 吹き出し・話者バッジの色（pon=ピンク / maro=シアン）
3. テロップが所定位置にあるか（SubtitleLayer z-index: 80 でキャラより前面）
4. ProgressBar が下部に出ているか
5. 背景色がセクション設定通りか
6. TopicBadge のテキストが見切れていないか（左上）
7. RichPanel の本文がclippingされていないか
8. TimelineScroll カードが左右にはみ出していないか

数値基準（TopicBadge / RichPanel 等）→ `.claude/resources/remotion-layout-numbers.md` を参照。

## ⚠️ pinFrame の罠

**section-01 にビジュアルを割り当てても表示されない。**

`VisualLayer` は `frame >= pinFrame`（= section-02 の startFrame）でガードされている。section-01 は pinFrame より前に終わるため常にブロックされる。

- section-01 の visual は hero title（DynamicTitle）が代替
- ビジュアルQCは **section-02 以降** のフレームで行う

### QCフレーム計算

```bash
node -e "
const ep = require('./src/data/episodes/EP_ID.json');
let frame = 0;
ep.sections.forEach((s, i) => {
  const f = s.lines.reduce((sum, l) => sum + (l.durationFrames || 0), 0);
  console.log(s.name + ': mid=' + (frame + Math.round(f * 0.6)));
  frame += f + 15;
});
"
```
