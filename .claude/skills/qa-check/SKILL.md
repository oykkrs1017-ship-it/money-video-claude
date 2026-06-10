---
name: qa-check
description: 動画品質ダブルチェック。レンダリング前にstillで品質確認する。「品質チェック」「QA」「プレビュー確認」で起動。
allowed-tools: Read, Bash, Glob
---

## 実行手順
1. 確認すべきフレームを選定
   - f0: タイトル画面
   - f90〜f150: hookチャプター序盤
   - チャプター開始フレーム+20: ChapterCard表示
   - 各チャート表示フレーム
2. stillコマンドでスクリーンショット:
   `npx remotion still src/index.ts MainVideo --frame={N} --props="output/{epId}_props.json" --output="output/qa_f{N}.png"`
3. 画像を確認し問題があればコンポーネント修正

## BAN回避チェックリスト
- [ ] 全要素に最低1つのアニメーションがあるか
- [ ] キャラクターが呼吸（アイドル）しているか
- [ ] チャートがナレーションと同期アニメーションしているか
- [ ] seed値が異なれば見た目が変わるか
