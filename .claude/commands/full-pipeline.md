---
description: エピソードのフルパイプライン実行（台本→音声→レンダリング→公開）
argument-hint: [epId] [トピック]
---
## フルパイプライン: $ARGUMENTS

以下の順に実行:
1. **台本生成**: `npx ts-node --transpile-only scripts/generate-script.ts` でYAML台本を生成
2. **ユーザー確認**: 台本内容を報告し承認を待つ
3. **音声生成**: VOICEVOXでWAVを生成（`scripts/generate-voices.ts`）
4. **品質チェック**: still画像でhook・分析・まとめの3フレームを確認
5. **レンダリング**: MP4をレンダリング（ユーザー承認後）
6. **アップロード**: YouTube Data APIでスケジュール投稿（ユーザー承認後）

各ステップ後に必ずユーザーに確認を取ること。
