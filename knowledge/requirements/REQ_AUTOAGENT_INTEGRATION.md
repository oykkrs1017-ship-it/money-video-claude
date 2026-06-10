# 要件定義: AutoAgent クローズドループ最適化の統合

> autoagent (kevinrgu/autoagent) の「メタエージェント自律ハーネス改善」を
> money_video_cluade のパイプライン全体に適用する。
>
> 対象: `packages/tech-geopolitics-channel/` + `packages/ai-money-shorts/`
> 作成日: 2026-04-05

---

## 0. 現状の強みと差分

### 既に実装されている（活かす）

| 機能 | 場所 | AutoAgent 対応物 |
|------|------|----------------|
| フィードバックループ | `script-reviewer/feedback_loop.py` | 自己修正ループ（MAX_LOOPS=3） |
| エージェント分業 | `.claude/agents/*.md` | ハーネスの役割分離 |
| VariationEngine | `components/VariationEngine.tsx` | シード＝実験パラメータ |
| TypeA-E テンプレート | `ai-money-shorts/compositions/` | A/Bテストの軸 |
| knowledge-keeper | `.claude/agents/knowledge-keeper.md` | 教訓管理の器 |
| 品質ルール | `.claude/rules/quality-principles.md` | FIXED 境界の定義 |

### 不足しているもの（実装する）

| 欠如 | 影響 | 本要件での対応 |
|------|------|---------------|
| YouTube Analytics 収集 | スコアがない | analytics-collector を新設 |
| エピソード間スコア比較 | 改善判定ができない | results.tsv + scorecard スキーマ |
| 仮説→実験のループ | 改善が属人的 | hypothesis-generator を新設 |
| コスト追跡 | 費用対効果不明 | trace-recorder に原価埋め込み |
| directive ファイル | 方針が口頭 | `knowledge/directive.yaml` を新設 |

---

## 1. Directive System（program.md パターン）

### 1.1 `knowledge/directive.yaml` の新設

**目的**: パイプラインの「今回の制作方針」を宣言する唯一の入力ファイル。
`script-writer` エージェントはトピックと同時にこのファイルを読み込む。

```yaml
# knowledge/directive.yaml
version: 1
updated: "2026-04-05"

## チャンネル別方針
tech_geopolitics:
  focus_theme: "米中半導体戦争の投資インパクト"
  avoid:
    - "ETF選び方（飽和）"
    - "仮想通貨（BAN リスク高）"
  tone: "serious"               # serious | educational | alarming
  target_duration_min: 9        # 目標尺（分）
  hook_style: "数字で始める"     # 数字で始める | 問いかけ | 衝撃ファクト

  # 実験中の仮説（今回試す）
  current_hypothesis:
    id: "hyp_005"
    description: "hookチャプターでグラフを先に見せるとretention改善"
    param: "hook_visual_type=chart_first"
    seed: 42                    # VariationEngine シード（実験変数）

ai_money_shorts:
  focus_theme: "新NISAと高配当株"
  template_experiment: "TypeB"  # A/B テスト対象テンプレート
  avoid:
    - "仮想通貨"
    - "FX"
  tone: "pop"

## 共通制約
global:
  max_api_cost_usd_per_day: 5.0
  require_review_before_upload: true
  auto_loop_enabled: false      # true にすると自律制作開始
```

### 1.2 対象ファイル

| ファイル | 変更内容 |
|---------|---------|
| `knowledge/directive.yaml` | **新規作成** |
| `packages/tech-geopolitics-channel/scripts/generate-script.ts` | directive.yaml 読み込みと仮説注入 |
| `.claude/agents/script-writer.md` | directive.yaml 参照の明記 |

---

## 2. Episode Scorecard（スコア体系）

### 2.1 スキーマ定義（TypeScript）

```typescript
// packages/shared/src/scorecard.ts
export interface EpisodeScorecard {
  episodeId: string;            // "ep005"
  channel: 'tech-geopolitics' | 'ai-money-shorts';
  recordedAt: string;           // ISO 8601

  // 実験パラメータ（directives.yaml から）
  hypothesisId: string | null;
  seed: number;
  templateType?: string;        // Shorts のみ

  // 制作時スコア（即時）
  production: {
    scriptReviewLoops: number;  // feedback_loop.py の実行回数
    reviewIssueCount: number;   // 指摘事項数
    voiceSynthSuccessRate: number; // 0-1: WAV 生成成功率
    renderDurationSec: number;  // レンダリング所要時間
    costUsdEstimate: number;    // API 推定費用
  };

  // エンゲージメント（遅延収集）
  engagement: {
    collectedAt?: string;
    views24h?: number;
    views7d?: number;
    likes7d?: number;
    comments7d?: number;
    avgViewDurationSec?: number; // 平均視聴時間
    retentionRate?: number;      // 0-100
    ctr?: number;                // クリック率 0-100
    subscriberDelta7d?: number;
  };

  // 総合判定
  verdict: 'KEEP' | 'DISCARD' | 'PENDING';
  lessons: string[];            // 抽出した教訓 ID
}
```

### 2.2 スコア収集フロー

```
[upload-youtube.ts 完了]
  → scorecard.production を記録（即時）
  → brain/scorecards/ep005.json に保存

[24h 後: collect-analytics.ts 実行]
  → YouTube Data API でメトリクス取得
  → engagement フィールドを補完
  → verdict 算出（下記ロジック）
  → 教訓抽出トリガー（knowledge-keeper）

[7d 後: 最終収集]
  → 最終スコア確定
  → results.tsv に行追記
```

### 2.3 対象ファイル

| ファイル | 変更内容 |
|---------|---------|
| `packages/shared/src/scorecard.ts` | **新規作成**（スキーマ） |
| `packages/tech-geopolitics-channel/scripts/upload-youtube.ts` | 制作スコア記録の追加 |
| `packages/tech-geopolitics-channel/scripts/collect-analytics.ts` | **新規作成** |
| `brain/scorecards/` | **新規ディレクトリ** |

---

## 3. Keep/Discard 判定エンジン

### 3.1 判定ロジック（autoagent の `passed` 比較に対応）

```
仮説 H を適用したエピソード E_new の判定:

ベースライン = 同チャンネルの直近5エピソード（仮説なし）の平均値

IF E_new.retentionRate > baseline.retentionRate + 3%:
  → KEEP（視聴継続率改善）
  → 教訓: KEEP として knowledge-keeper に保存

ELIF E_new.ctr > baseline.ctr + 2%:
  → KEEP（発見性改善）

ELIF E_new.production.reviewIssueCount < baseline.reviewIssueCount * 0.7:
  → KEEP（制作品質改善）

ELSE:
  汎用性チェック: 「この仮説は他のトピックでも有効か？」
  → 仮説の description に "genre-specific" が含まれる → DISCARD
  → それ以外 → TENTATIVE（次の1エピソードで再試行）

TENTATIVE が 2 連続で改善なし → DISCARD
```

### 3.2 Overfitting ガード（autoagent の過学習防止ルールに対応）

- 仮説に `scope: 'episode-specific'` を付与できる（例: 「ep005 の修正」）
- `scope: 'episode-specific'` は KEEP にならず、DISCARD に自動移行
- `scope: 'channel-wide'` のみが真の学習として knowledge-keeper に蓄積

### 3.3 対象ファイル

| ファイル | 変更内容 |
|---------|---------|
| `packages/pipeline/src/pipeline/verdict_engine.py` | **新規作成** |
| `packages/script-reviewer/src/script_reviewer/feedback_loop.py` | verdict 判定の追加 |
| `knowledge/lessons.yaml` | KEEP/DISCARD/TENTATIVE フィールド追加 |

---

## 4. Production Trace（ATIF 対応フォーマット）

### 4.1 EPTF（Episode Production Trace Format）

```typescript
// packages/shared/src/trace.ts
interface EpisodeTrace {
  schema: 'EPTF-v1.0';
  episodeId: string;
  channel: string;
  startedAt: string;
  completedAt: string;
  directiveHash: string;     // directive.yaml の SHA-256

  steps: Array<{
    agent: string;           // 'script-writer' | 'voice-producer' | ...
    startedAt: string;
    completedAt: string;
    status: 'SUCCESS' | 'FAILED' | 'RETRIED';
    input: Record<string, unknown>;
    output: Record<string, unknown>;
    error?: string;
    cost: {
      apiCalls: number;
      tokensInput?: number;
      tokensOutput?: number;
      usdEstimate: number;
    };
  }>;

  artifacts: Array<{
    type: 'yaml' | 'json' | 'wav' | 'mp4' | 'png';
    path: string;
    sizeBytes: number;
    hash: string;
  }>;
}
```

**保存先**: `brain/traces/ep005.json`

### 4.2 既存 knowledge-keeper への統合

knowledge-keeper エージェントがセッション終了時に自動で EPTF を生成・保存。
現在は Markdown ログを書いているが、JSON に移行する。

---

## 5. 自律ループ（Autonomous Loop）

### 5.1 設計原則（autoagent の「NEVER STOP」を有界化）

autoagent は無制限ループだが、YouTube 制作は**人間レビューが法的・品質上必要**。
そのため「半自律モード」を採用する：

```
自動化できる部分:
  ✅ 台本生成
  ✅ スクリプトレビュー（feedback_loop.py 3ループ）
  ✅ 音声合成
  ✅ still（プレビュー静止画）生成
  ✅ スコアカード記録
  ✅ 教訓抽出

人間確認が必要な部分:
  🔲 台本の内容確認（コンプライアンス）
  🔲 still プレビュー確認（VBan リスク）
  🔲 YouTube アップロード（不可逆）
```

### 5.2 バッチループの実装

```typescript
// packages/tech-geopolitics-channel/scripts/autonomous-loop.ts

async function loop(options: {
  topics: string[];
  maxEpisodes: number;
  maxCostUsd: number;
  skipStillConfirm: boolean;  // CI 環境用
}) {
  let totalCost = 0;

  for (let i = 0; i < Math.min(options.topics.length, options.maxEpisodes); i++) {
    const topic = options.topics[i];
    const epId = nextEpId();
    const trace = new TraceRecorder(epId);

    try {
      // 1. 仮説を directive.yaml から取得
      const hypothesis = await loadCurrentHypothesis();

      // 2. 台本生成（仮説注入済み）
      const script = await scriptWriter.generate(topic, hypothesis);
      trace.record('script-writer', script);

      // 3. 自動レビュー（feedback_loop.py）
      const reviewed = await scriptReviewer.reviewWithLoop(script);
      trace.record('script-reviewer', reviewed);

      // 4. 音声合成
      const voices = await voiceProducer.synthesize(reviewed);
      trace.record('voice-producer', voices);

      // 5. still 生成 + コスト確認
      const still = await videoEngineer.generateStill(reviewed);
      totalCost += trace.totalCostUsd();

      if (totalCost > options.maxCostUsd) {
        console.log(`💰 日次費用上限 $${options.maxCostUsd} に到達。ループ停止。`);
        break;
      }

      // 6. スコアカード記録（即時部分）
      await scorecardManager.saveProduction(epId, trace.toScorecard());

      // 7. 次の仮説を更新（前回の TENTATIVE → 再試行 or 新仮説）
      await directiveManager.advanceHypothesis(epId);

    } catch (err) {
      trace.recordError(err);
      console.error(`❌ ep ${epId} 失敗 → 次エピソードへ`);
    }

    await trace.save();
  }
}
```

### 5.3 results.tsv（実験台帳）

```tsv
ep_id	date	channel	hypothesis_id	seed	template	review_loops	cost_usd	retention_rate	ctr	views_7d	verdict
ep003	2026-03-28	tech-geo	null	13	-	2	1.85	54.2	4.1	1203	KEEP
ep004	2026-04-01	tech-geo	hyp_004	21	-	1	2.10	51.8	3.9	980	DISCARD
ep005	2026-04-05	tech-geo	hyp_005	42	-	PENDING	PENDING	-	-	-	PENDING
```

### 5.4 対象ファイル

| ファイル | 変更内容 |
|---------|---------|
| `packages/tech-geopolitics-channel/scripts/autonomous-loop.ts` | **新規作成** |
| `packages/shared/src/trace-recorder.ts` | **新規作成** |
| `packages/shared/src/directive-manager.ts` | **新規作成** |
| `brain/results.tsv` | **新規作成**（自動追記） |
| `package.json` | `"loop": "npx ts-node scripts/autonomous-loop.ts"` 追加 |

---

## 6. Tool Specialization 強化

### 6.1 現状の問題と改善

| 問題 | 現状 | 改善 |
|------|------|------|
| script-reviewer の指摘が次回に活かされない | feedback_loop は単一セッション | 指摘を `knowledge/lessons.yaml` に蓄積 → 次回台本生成プロンプトに注入 |
| VariationEngine のシードが実験に使われていない | シードはランダム | directive.yaml の `seed` フィールドで制御 → 仮説の変数に |
| TypeA-E の選択が手動 | Shorts は毎回人が選ぶ | スコアカードからテンプレート別の engagement を比較 → 最良を directive に反映 |
| feedback_loop.py の結果が消える | ループ完了後に破棄 | issueCount を scorecard.production に記録 |

### 6.2 `feedback_loop.py` への追加（最小変更）

```python
# script_reviewer/feedback_loop.py に追記

def run_feedback_loop(script_json: str, max_loops: int = MAX_LOOPS) -> FeedbackResult:
    """Returns corrected script + metadata for scorecard."""
    loop_count = 0
    issue_history = []

    for i in range(max_loops):
        issues = reviewer.review(current_script)
        issue_history.extend(issues)
        if not issues:
            break
        current_script = apply_corrections(current_script, issues)
        loop_count += 1

    # ← 追記: スコアカード用データを返す
    return FeedbackResult(
        script=current_script,
        loops_used=loop_count,
        total_issues=len(issue_history),
        remaining_issues=[i for i in issue_history if not i.resolved]
    )
```

### 6.3 `knowledge-keeper` エージェントの拡張

現在: セッションログを Markdown で書く
改善後: 以下を追加で実行

```markdown
## 追加タスク（knowledge-keeper）

### 教訓の自動抽出（セッション終了時）
EPTF トレースと scorecard から以下を抽出して knowledge/lessons.yaml に追記:

KEEP が確定したエピソードから:
- どのチャプター構成が高 retention を出したか
- どのビジュアルタイプが多く使われたか
- 台本レビューで最も多かった指摘カテゴリ

DISCARD が確定したエピソードから:
- どの仮説が効果なしだったか（scope: channel-wide のみ）

### lessons.yaml フォーマット
```yaml
lessons:
  - id: "les_012"
    verdict: "KEEP"
    scope: "channel-wide"
    category: "hook_structure"
    do: "hookの最初のセリフでグラフを言及する"
    dont: "グラフを先に出してから台詞で説明する"
    reason: "ep003, ep007 で retention +5% 確認"
    episodes: ["ep003", "ep007"]
    created: "2026-04-05"
```
```

---

## 7. AI Money Shorts への展開

### 7.1 TypeA-E テンプレート A/B テスト

```yaml
# directive.yaml の ai_money_shorts セクション
ai_money_shorts:
  template_experiment:
    active: true
    current: "TypeB"
    history:
      TypeA: { episodes: ["short_012", "short_013"], avg_retention: 62.1 }
      TypeB: { episodes: ["short_014"], avg_retention: null }  # 計測中
    next_if_keep: "TypeB"
    next_if_discard: "TypeC"
```

**ロジック**:
- 同テーマで同じ台本を TypeA と TypeB でレンダリング
- 7日後の retention で比較 → 高い方のテンプレートを directive に反映

### 7.2 対象ファイル

| ファイル | 変更内容 |
|---------|---------|
| `packages/ai-money-shorts/scripts/ab-render.ts` | **新規作成**（2テンプレート同時レンダリング） |
| `packages/ai-money-shorts/scripts/collect-analytics.ts` | **新規作成** |

---

## 8. ハーネス境界の明確化

autoagent の「EDITABLE / FIXED」境界をこのプロジェクトに適用する。

### EDITABLE（メタエージェントが変更してよい）
```
knowledge/directive.yaml        ← 制作方針（毎回変わる）
knowledge/lessons.yaml          ← 蓄積教訓（KEEP/DISCARD で更新）
brain/results.tsv               ← 実験台帳（自動追記）
brain/scorecards/*.json         ← エピソードスコア（自動生成）
.claude/agents/script-writer.md ← プロンプト改善（スコアに基づき）
```

### FIXED（変更禁止）
```
.claude/rules/ban-avoidance.md  ← YouTube BAN 防止ルール（法的リスク）
.claude/rules/voicevox.md       ← VOICEVOX 設定（音声品質）
src/compositions/MainVideo.tsx  ← Remotion コア（壊れると全滅）
packages/shared/src/types.ts    ← 型定義（連鎖変更リスク）
```

---

## 9. 実装フェーズ

### Phase A: 計測（2日）
1. `packages/shared/src/scorecard.ts` — スキーマ定義
2. `packages/shared/src/trace.ts` — EPTF スキーマ
3. `packages/shared/src/trace-recorder.ts` — 計測クラス
4. `packages/tech-geopolitics-channel/scripts/upload-youtube.ts` — scorecard 記録追加
5. `brain/results.tsv` — 台帳ファイル初期化

### Phase B: フィードバック接続（2日）
6. `knowledge/directive.yaml` — 新設
7. `packages/tech-geopolitics-channel/scripts/generate-script.ts` — directive 読み込み
8. `packages/script-reviewer/src/script_reviewer/feedback_loop.py` — FeedbackResult 追加
9. `knowledge/lessons.yaml` — スキーマ整備
10. `.claude/agents/knowledge-keeper.md` — 教訓抽出タスク追加

### Phase C: Analytics 接続（1日）
11. `packages/tech-geopolitics-channel/scripts/collect-analytics.ts` — **新規**
12. YouTube Data API Analytics 接続

### Phase D: 判定エンジン（2日）
13. `packages/pipeline/src/pipeline/verdict_engine.py` — Keep/Discard ロジック
14. `packages/shared/src/directive-manager.ts` — 仮説前進ロジック

### Phase E: 自律ループ（2日）
15. `packages/tech-geopolitics-channel/scripts/autonomous-loop.ts` — **新規**
16. `packages/ai-money-shorts/scripts/ab-render.ts` — **新規**

---

## 10. 成功指標

| 指標 | 現状ベースライン | 目標 | 測定タイミング |
|------|----------------|------|---------------|
| 台本レビューループ数 | 2-3回 | 1-2回（教訓活用で初稿品質向上） | Phase B 後 |
| 平均視聴継続率 | 未計測 | 計測開始後 +5% | Phase C 後30日 |
| 制作費用 / エピソード | 未計測 | $2.00 以下 | Phase A 後 |
| 仮説 KEEP 率 | 0%（実験なし） | 40%以上 | Phase D 後5仮説 |
| VariationEngine シード再利用 | なし | 高スコアシードを次回に優先 | Phase D 後 |

**判定**: 3指標以上が達成 → この要件定義は KEEP。それ以下 → 見直し。
