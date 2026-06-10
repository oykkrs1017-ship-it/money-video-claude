# 学び: 日本語テロップの固定文字数分割では行頭禁則が必ず発生する
日付: 2026-05-11
カテゴリ: スキルルール
関連スキル: slides-video-layout

## 状況
SubtitleLayerで50文字固定分割を使っていた。
「？そんな数字、現実にあり得るのだぞ？」という形で「？」がページ先頭に現れた。
ユーザーから「文節が途中で途切れる場合は次の字幕で」と修正指示。

## 齟齬の内容
- AIの判断: 固定文字数でページを切ればシンプルに動く
- ユーザーの意図: 自然な文節区切り。句読点が先頭に来るのは日本語として不自然
- 差分の本質: 日本語組版の「行頭禁則」を意識していなかった。英語基準の実装

## 学び

**日本語テロップは行頭禁則処理が必須**。固定文字数分割は必ずこのバグを引き起こす。

```tsx
const NO_LINE_START = new Set(['。','、','！','？','…','」','』','）',')','．']);
let pos = 0;
while (pos < text.length) {
  let end = Math.min(pos + CHARS_PER_PAGE, text.length);
  // 次ページ先頭が禁則文字なら現ページに吸収（最大3文字）
  let absorbed = 0;
  while (end < text.length && NO_LINE_START.has(text[end]) && absorbed < 3) {
    end++; absorbed++;
  }
  pages.push(text.slice(pos, end));
  pos = end;
}
```

**対象禁則文字**: `。、！？…」』）)．` （全角・半角両方）
**吸収上限**: 3文字（無限ループ防止）

## 適用先
- [x] `SubtitleLayer.tsx`（実装済み）
- [x] `.claude/rules/slides-video-layout.md`（コードスニペット記載済み）
- [ ] 将来 ShortsVideo や他の字幕コンポーネントを作る際も同じロジックを適用すること
