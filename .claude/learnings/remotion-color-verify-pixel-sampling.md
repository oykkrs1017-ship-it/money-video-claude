# 学び: テロップ色の確認はpixelサンプリングで行う
日付: 2026-05-11
カテゴリ: スキルルール
関連スキル: remotion-coding, slides-video-layout

## 状況
SubtitleLayerのテロップ色をぽんちゃん=緑(`#22c55e`)・まろくん=赤(`#ef4444`)に変更した。
stillをレンダリングしてチャットUIで確認したが、両者が同じ緑色に見えた。
コードは正しかったが、視覚的に確認できず何度も別フレームをレンダリングして迷走した。

## 齟齬の内容
- AIの判断: still画像を目視確認すれば色が正しいか分かる
- ユーザーの意図: 実際に色が当たっているかの事実確認
- 差分の本質: チャットUIのサムネイル表示はJPEG圧縮されており、近似色（緑系と赤系が圧縮で混濁）が区別できない。PNGとして保存されていても、表示段階で色情報が失われる

## 学び
Remotion stillで色を確認するときは `@napi-rs/canvas` でピクセルをサンプリングする。
目視確認は「レイアウト」の確認には使えるが「色」の確認には使えない。

```js
// packages/tech-geopolitics-channel で実行
const {createCanvas, loadImage} = require('@napi-rs/canvas');
loadImage('C:/Users/81808/AppData/Local/Temp/preview.png').then(img => {
  const canvas = createCanvas(img.width, img.height);
  const ctx = canvas.getContext('2d');
  ctx.drawImage(img, 0, 0);
  // テロップ領域の代表点（1080p: y=870-950あたり）
  const p = ctx.getImageData(960, 890, 1, 1).data;
  console.log(`r:${p[0]}, g:${p[1]}, b:${p[2]}`);
  // ponchan期待値: r:34, g:197, b:94 (#22c55e)
  // maro期待値:    r:239, g:68, b:68  (#ef4444)
});
```

## 適用先
- [x] `.claude/rules/slides-video-layout.md`（色確認方法セクション追加済み）
- [ ] `.claude/rules/remotion-coding.md` にも「色確認はpixelサンプリング」を追記
