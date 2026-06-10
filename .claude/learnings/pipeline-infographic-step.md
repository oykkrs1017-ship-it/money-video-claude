# 学び: インフォグラフィック生成のパイプライン組み込み漏れ

日付: 2026-04-29
カテゴリ: スキルルール
関連スキル: remotion-still-check / ep-pipeline

## 状況
ep010 レンダリング時に `infographic_bubble_comparison.png` が存在せずエラー。
generate-infographics.ts を実行し忘れていた。

## 齟齬の内容
- AI の判断: yaml-to-json.ts → generate-voices.ts → render の順で十分
- ユーザーの意図（暗黙）: インフォグラフィックも事前生成されているべき
- 差分の本質: パイプライン手順に infographics 生成ステップが明記されていなかった

## 学び

### ep生成パイプラインの正しい順序
```
1. generate-script.ts      → input/epNNN.yaml
2. yaml-to-json.ts         → input/epNNN.json + script-input.json
3. generate-voices.ts      → public/voices/*.wav（frameCount書き戻し）
4. generate-infographics.ts → public/content/infographic_*.png  ← ★ここが抜けがち
5. remotion still（確認）
6. remotion render
7. upload-youtube.ts
```

### 実行コマンド（JSON を入力として使う）
```bash
npx ts-node --transpile-only scripts/generate-infographics.ts --input input/epNNN.json
```
※ YAML を渡すと JSON.parse エラーになる（スクリプトが JSON を期待）

## 適用先
- [ ] CLAUDE.md の「コマンド」セクションにパイプライン順序として追記
- [ ] plan ファイル（shiny-imagining-prism.md）に Phase 3.5 として追記を検討
