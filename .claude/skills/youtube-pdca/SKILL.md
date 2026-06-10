---
name: youtube-pdca
description: YouTube PDCA サイクルを回すスキル。「分析して改善策を出して」「PDCAの Plan やって」「ep006 の成果を確認して」「今月の振り返りをして」などで起動。Plan（分析→仮説）/ Check（成果測定）/ Act（学習→次サイクル反映）の3フェーズを管理する。
tools: Read, Write, Edit, Bash, Glob, Grep, Agent
---

# youtube-pdca — YouTube PDCA サイクルスキル

YouTube チャンネルの成長を PDCA で体系的に管理する。
分析 → 仮説立案 → コンテンツ制作 → 成果測定 → 学習昇格 のループを回す。

## フェーズ

| フェーズ | コマンド例 | 担当エージェント |
|---------|-----------|----------------|
| **Plan** | 「分析して改善策を出して」「Plan やって」 | youtube-analyst → pdca-strategist |
| **Check** | 「ep006 の成果を確認して」「先週公開の動画を測定して」 | performance-monitor |
| **Act** | 「今月の振り返りをして」「学習をまとめて」 | pdca-strategist |

---

## Phase 1: Plan（分析 → 仮説立案）

### Step 1: チャンネル分析（youtube-analyst に委譲）

```bash
cd packages/tech-geopolitics-channel
npx ts-node --transpile-only scripts/analyze-my-channel.ts \
  --days 90 \
  --output output/deep-analysis.json
```

### Step 2: 前回サイクルの仮説を読み込む

```bash
# 最新サイクルログを確認
ls knowledge/pdca/ | sort | tail -3
cat knowledge/pdca/hypotheses-current.md
cat knowledge/pdca/baseline-metrics.md
```

### Step 3: 仮説生成（pdca-strategist に委譲）

`output/deep-analysis.json` + `knowledge/pdca/hypotheses-current.md` を渡し、以下を生成:

1. **前回仮説の検証結果** — 成立 / 不成立 / データ不足
2. **今サイクルの仮説 3〜5本** — 各仮説は「変数・期待効果・測定方法」を明記
3. **次の ep で試すべき変更点** — 具体的な制作指示に落とし込む

### Step 4: サイクルログ保存

`knowledge/pdca/YYYY-MM-DD-plan.md` として保存。

---

## Phase 2: Check（成果測定）

引数で ep 指定がある場合 `--ep epXXX`、なければ直近 3 本を対象とする。

### Step 1: Analytics 収集（performance-monitor に委譲）

```bash
cd packages/tech-geopolitics-channel

# 特定 ep の Analytics を収集
npx ts-node --transpile-only scripts/collect-analytics.ts --ep epXXX

# 全 ep（PENDING 状態のもの）
npx ts-node --transpile-only scripts/collect-analytics.ts --all
```

### Step 2: ベースラインと比較

`knowledge/pdca/baseline-metrics.md` の数値と対照し、以下を判定:

| 指標 | ベースライン | 判定基準 |
|------|------------|---------|
| 視聴維持率 | 25% | +10pt 以上 → 仮説成立 |
| CTR | 計測中 | 取得できれば 3% 以上で良好 |
| いいね率 | 1.04% | 2% 以上 → エンゲージメント改善 |
| 検索流入比率 | 8.4% | 15% 以上を目標 |

### Step 3: 測定レポート保存

`knowledge/pdca/YYYY-MM-DD-check-epXXX.md` として保存。

---

## Phase 3: Act（学習昇格 → 次サイクル準備）

### Step 1: 仮説の判定（pdca-strategist に委譲）

成立した仮説 → `tasks/lessons.md` および `knowledge/winning-patterns.json` に昇格。
不成立の仮説 → 原因分析を記録して次サイクルに引き継ぎ。

### Step 2: ルール化

3回以上同じパターンが成立 → `.claude/rules/` に原則ファイルとして昇格。

### Step 3: 次サイクル目標設定

現サイクルの結果を基に `knowledge/pdca/baseline-metrics.md` を更新し、
次 Plan フェーズの入力とする。

---

## knowledge/pdca/ ディレクトリ構成

```
knowledge/pdca/
├── README.md                    # このファイルの説明
├── baseline-metrics.md          # 現在のベースライン数値
├── hypotheses-current.md        # 現在テスト中の仮説
├── YYYY-MM-DD-plan.md           # Plan フェーズの記録
└── YYYY-MM-DD-check-epXXX.md   # Check フェーズの記録
```

---

## エラー対応

| エラー | 対応 |
|--------|------|
| YouTube 認証エラー | `scripts/youtube-reauth.ts` を実行して再認証 |
| `collect-analytics.ts` で videoId なし | `upload-youtube.ts` 実行済みか確認（scorecard に videoId が必要） |
| Analytics データ 0 件 | 投稿から 48 時間以上経過しているか確認 |
| `knowledge/pdca/` が存在しない | `mkdir -p packages/tech-geopolitics-channel/knowledge/pdca` で作成 |
