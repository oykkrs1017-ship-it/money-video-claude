# 学び: ShortsVideo 確定レイアウト（ep017で更新）
日付: 2026-05-22（初版: 2026-04-26 ep009）
カテゴリ: スキルルール
関連スキル: video-render, shorts-generation

## 状況
ep017のShorts生成で TopicBadge 重複・字幕位置・画像クリップ・タイトル折り返しと
複数レイアウト問題が連続発生。根本原因は「3ゾーンを独立して設計しておらず、
変更時に連動するパラメータをセットで更新しなかった」こと。

---

## ⚠️ 3点セット設計原則（最重要）

`visual zone top` / `visual zone bottom` / `subtitle top` は**常にセットで設計する**。
1点変えたら必ず他2点も連動して確認すること。

```
[TopicBadge]  top:28px + 高さ≈97px = 下端 y≈125px
                ↓ 余白
[visual zone] top: 9% (173px) 〜 bottom: 55% (1056px)
                ↓ 8px 余白
[subtitle]    top: calc(55% + 8px) = 1064px
                ↓ ギャップ（≈130px）
[char heads]  y≈1200px 付近
[characters]  y=645〜1720px（translateY(-200px) + height*0.56）
```

---

## 確定レイアウト値（ShortsVideo.tsx / ep017検証済み）

### セーフゾーン定数
```tsx
const SAFE_TB = '3%';   // 上下57.6px
const SAFE_LR = '5%';   // 左右54px
```

### ゾーン定義
```tsx
// visualTop: TopicBadge(top:28px + 高さ≈97px = ~125px)を避けるため9%=173px以降
const ZONE = {
  visualTop:    '9%',   // ビジュアル上端（TopicBadge下端をクリア）
  visualBottom: '55%',  // ビジュアル下端（字幕の top と連動）
} as const;
```

### VisualLayer wrapper（zIndex: 30）
```tsx
<div style={{
  position: 'absolute',
  top: ZONE.visualTop,
  left: SAFE_LR, right: SAFE_LR,
  bottom: ZONE.visualBottom,
  overflow: 'hidden',
  zIndex: 30,
}}>
  <VisualLayer ... width={width} height={height} />
</div>
```

### SubtitleLayer（'shorts'スタイル）
SubtitleLayer内で `top` 基準に切り替え（`bottom` 基準は visual bottom との相対がズレやすい）:
```tsx
// subtitleStyle === 'shorts' の場合
const positionStyle = { top: 'calc(55% + 8px)' as const };
// ↑ ZONE.visualBottom（55%）と一致させること
```

### CharacterLayer wrapper（zIndex: 50）
```tsx
<div style={{
  position: 'absolute', inset: 0,
  zIndex: 50, pointerEvents: 'none',
  transform: 'translateY(-200px)',
}}>
  <CharacterLayer
    currentLine={currentLine}
    characterLayout={variation.characterLayout}
    height={height * 0.56}
  />
</div>
```

### charOpacity
```tsx
const charOpacity = 1; // Shortsでは常時1
```

---

## RichPanel の Shorts 対応（fillContainer）

RichPanel は MainVideo と Shorts の両方で使われる。
Shorts（height > 1200）では visual container 全体を埋める必要がある:

```tsx
// VisualLayer.tsx でRichPanelを呼ぶ際
<RichPanel
  ...
  fillContainer={height > 1200}  // Shorts=true → top:0, bottom:0
/>

// RichPanel.tsx 内
top: fillContainer ? 0 : '8%',
bottom: fillContainer ? 0 : '38%',
```

---

## image ビジュアルの Shorts 幅制約

`top-center` 配置の image が コンテナ幅（width×0.90≈972px）を超えると
左右対称にクリップされ、タイトル文字が消える。

```tsx
// VisualLayer.tsx の image 型処理
const maxImgWidth = height > 1200
  ? Math.round(width * 0.90)
  : (visual.width ?? 1280);
const imageData: ImageData = {
  ...
  width: Math.min(visual.width ?? 1280, maxImgWidth),
};
```

**⚠️ 旧形式（chapter.visuals）の image は未対応**（次回要修正）

---

## TitleAnimation の Shorts 対応

`TitleText` の `whiteSpace: 'nowrap'` は長タイトルで必ずはみ出す。
Shorts では折り返し許可 + フォントサイズ縮小が必要:

```tsx
// TitleAnimation.tsx（TitleText コンポーネント）
whiteSpace: 'normal',
wordBreak: 'break-all',

// ShortsVideo.tsx
fontSize={Math.floor(width * 0.047)}  // 50px（0.07=75pxだと33文字が2475px）
```

---

## Shorts レンダリング時の注意

```bash
# Google Fonts タイムアウト対策: --timeout 60000 を必ず付ける
node_modules/.bin/remotion render src/index.ts ShortsVideo output/ep017_shorts.mp4 \
  --props input/script-input.json --timeout 60000
```

---

## 罠・注意事項（ep009より継承）

### CharacterLayer height 二重乗算の罠
- **NG**: `height={height * 0.34}` → 内部でさらに乗算→極小
- **OK**: `height={height * 0.56}` → 適切なサイズ

### MainVideoからのロジック流用時
- MainVideo の `charOpacity` は stat/chart 型で 0.12 フェードするロジックあり
- Shorts では `const charOpacity = 1` にハードコード

## 適用先
- [x] ShortsVideo.tsx（ZONE値更新済み・ep017確定）
- [x] SubtitleLayer.tsx（top基準に変更済み）
- [x] VisualLayer.tsx（fillContainer + image幅制約）
- [x] RichPanel.tsx（fillContainer prop追加）
- [x] TitleAnimation.tsx（whiteSpace修正）
- [ ] 旧形式 chapter.visuals の image 幅制約（未対応）
