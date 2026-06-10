---
name: competitor-research
description: 競合チャンネルのコーパス収集 + ep単体/全体のアナリティクス収集。「競合を調べて」「コーパスを更新して」「ep005のアナリティクスを取って」などで起動。
tools: Bash, Read
---

# competitor-research — 競合リサーチ＆アナリティクス収集スキル

競合チャンネルの動画メタデータを収集してコーパスを更新し、自チャンネルのアナリティクスを取得する。

## 引数

- `--corpus`（任意）: コーパス収集のみ実行
- `--analytics --ep epXXX`（任意）: ep単体のアナリティクス収集
- `--analytics --all`（任意）: 全epのアナリティクス収集
- `--top N`（任意）: 競合1チャンネルから取得する動画数（デフォルト 20）
- `--dry-run`（任意）: API 呼び出しなしで動作確認

## 実行フロー

### A: コーパス収集（`--corpus` または引数なし）

```bash
cd packages/tech-geopolitics-channel
npx ts-node --transpile-only scripts/fetch-competitor-corpus.ts \
  [--top N] \
  [--dry-run]
```

完了後、`knowledge/corpus/` にメタデータが保存されることを確認。

### B: ep アナリティクス収集（`--analytics`）

```bash
# ep単体
npx ts-node --transpile-only scripts/collect-analytics.ts --ep {epId}

# 全ep
npx ts-node --transpile-only scripts/collect-analytics.ts --all
```

完了後、スコアカードが更新されることを確認。

### 結果報告

```
## 競合リサーチ完了

### コーパス
- 収集チャンネル数: N
- 新規動画数: N件
- knowledge/corpus/ 更新済み

→ channel-analyzer スキルで勝ちパターン抽出が可能です。
```

## エラー対応

| エラー | 対応 |
|--------|------|
| yt-dlp 未インストール | `pip install yt-dlp` を実行 |
| YouTube 認証エラー | `youtube-reauth.ts` で再認証 |
| レート制限 | `--top 10` で件数を減らして再実行 |
