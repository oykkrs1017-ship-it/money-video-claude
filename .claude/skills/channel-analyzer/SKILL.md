---
name: channel-analyzer
description: 自チャンネル分析 + 勝ちパターン抽出。「チャンネルを分析して」「勝ちパターンを調べて」「月次分析して」で起動。analyze-my-channel.ts → analyze-winning-patterns.ts を順に実行する。
tools: Bash, Read
---

# channel-analyzer — 自チャンネル分析スキル

自チャンネルのパフォーマンスデータを取得し、Claude で勝ちパターンを抽出する。

## 引数

- `--days N`（任意）: 集計期間（デフォルト 30日）
- `--top-n N`（任意）: 抽出パターン数（デフォルト 50）
- `--dry-run`（任意）: API 呼び出しなしで動作確認

## 実行フロー

### Step 1: 前提確認

```bash
# YouTube 認証トークンの存在確認
ls packages/tech-geopolitics-channel/.credentials/youtube-token.json
```

トークンがなければ停止してユーザーに `npx ts-node scripts/youtube-reauth.ts` の実行を依頼。

### Step 2: チャンネルパフォーマンス取得

```bash
cd packages/tech-geopolitics-channel
npx ts-node --transpile-only scripts/analyze-my-channel.ts \
  [--days N] \
  [--output output/channel-analysis.json]
```

完了後、`output/channel-analysis.json` が生成されることを確認。

### Step 3: 勝ちパターン抽出

```bash
npx ts-node --transpile-only scripts/analyze-winning-patterns.ts \
  [--top-n N] \
  [--dry-run]
```

完了後、`knowledge/winning-patterns.json` が更新されることを確認。

### Step 4: 結果サマリ

`knowledge/winning-patterns.json` を Read して上位3パターンをユーザーに報告:

```
## チャンネル分析完了（{days}日間）

### 勝ちパターン TOP3
1. {pattern1}
2. {pattern2}
3. {pattern3}

→ 次のエピソード企画に活用できます。
```

## エラー対応

| エラー | 対応 |
|--------|------|
| 認証エラー | `youtube-reauth.ts` を実行して再認証 |
| コーパス未作成 | `competitor-research` スキルを先に実行 |
| ANTHROPIC_API_KEY 未設定 | .env に ANTHROPIC_API_KEY を追加 |
