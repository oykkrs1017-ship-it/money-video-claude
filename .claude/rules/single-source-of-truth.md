---
paths:
  - "packages/tech-geopolitics-channel/src/types/**/*.ts"
  - "packages/tech-geopolitics-channel/src/components/**/*.tsx"
  - "packages/tech-geopolitics-channel/src/compositions/**/*.tsx"
  - "packages/tech-geopolitics-channel/config/**/*"
---
# 上位原則: 設定値・マスターデータは単一の参照元を持つ

設定値は1ファイルだけに書き、他はすべてそこを参照する。「修正が1箇所で済む設計か？」を実装前に確認する。

## このプロジェクトでの定義元
- キャラクター名・色: `src/types/character.ts` の `CHARACTER_CONFIGS`
- VOICEVOX誤読変換: `src/utils/textNormalizer.ts`（プロンプトとの二重管理は意図的）

## NG / OK
```
NG: CharacterDialogue.tsx で name = 'ポンちゃん' とハードコード
OK: CHARACTER_CONFIGS[line.character].name を参照
```

変更が必要になったとき → 1箇所だけ直せばよい状態を維持する。
