---
description: 指定エピソードの品質レビュー（still確認 + BAN回避チェック）
argument-hint: [epId]
---
## エピソード品質レビュー: $ARGUMENTS

!`ls packages/tech-geopolitics-channel/output/$ARGUMENTS_props.json 2>/dev/null || echo "propsファイルが見つかりません"`

以下を確認:
1. TypeScriptコンパイルチェック (`npx tsc --noEmit`)
2. 音声WAV存在確認
3. still画像で主要フレームを確認（タイトル, hook, 分析, まとめ）
4. BAN回避チェックリスト:
   - 全要素にアニメーションがあるか
   - キャラクター呼吸アニメーション
   - チャート同期アニメーション
   - VariationEngine通過
