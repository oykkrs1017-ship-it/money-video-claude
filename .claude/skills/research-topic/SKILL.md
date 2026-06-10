---
name: research-topic
description: YouTubeトレンド・競合チャンネルをリサーチしてトピックを選定するスキル。「リサーチして」「トピック提案」「競合調査」「今週のネタ」などで起動。
allowed-tools: Read, Write, Edit, Bash, Glob, Grep, WebSearch, WebFetch, Agent
---

# research-topic スキル

YouTubeの競合チャンネル・トレンドニュースを自動収集し、チャンネルコンセプトに最適なトピックを提案するフロー。
ユーザーが番号を選ぶだけで、あとは既存パイプライン（台本生成→音声→動画）に引き継ぐ。

## フラグ

```
/research-topic              # 通常実行（YouTube + Jina強化ニュース・無料）
/research-topic --no-youtube # ニュースのみ（yt-dlp 未インストール時）
/research-topic --no-news    # YouTube のみ
/research-topic --reuse      # 前回の topic-research.json を再利用（API 節約）
```

---

## 実行フロー

### Step 1: 前回結果の確認（--reuse 時のみスキップ）

```bash
ls -la knowledge/topic-research.json 2>/dev/null && echo "前回結果あり" || echo "初回実行"
```

`--reuse` フラグがある場合は Step 2 をスキップして Step 3 へ。

### Step 2: 過去エピソード一覧を取得してからエージェントを起動

**Grep ツール**で過去ep タイトルを取得する（Windows環境のためbash grepではなくGrep ツールを使う）:
- pattern: `^title:`
- path: `packages/tech-geopolitics-channel/input/`
- glob: `ep*.yaml`
- output_mode: `content`

取得した過去epタイトルを含めて `topic-researcher` エージェントに以下を委譲:

> 「競合チャンネルの最新動画とトレンドニュースをリサーチして、
> テクノロジー投資×地政学チャンネル向けのトピックを5〜7件提案してください。
> フラグ: {ユーザーが指定したフラグ}
>
> **重複禁止**: 以下は既に生成済みのエピソードです。同一テーマ・企業・シナリオの提案は禁止します:
> {取得した過去epタイトルの箇条書き}」

エージェントが完了したら Step 3 へ。

### Step 3: 提案を確認・表示

```bash
# 最新の提案ファイルを確認
ls -t knowledge/proposals/*.md | head -1
```

最新の提案ファイルの内容をユーザーに表示する。

### Step 4: ユーザーの番号選択を待つ

ユーザーが番号（例: `3`）または複数番号（例: `1,3`）を返答するまで待機。

### Step 5: 選択トピックで台本生成フローを開始

ユーザーが選択した番号のトピックを確認し、以下を実行前に確認する:

> ⚠️ 以下のトピックで台本生成を開始してよいですか？
>
> **「{選択されたトピックタイトル}」**
>
> - 推定コスト: ~$0.06（Claude API 台本生成）
> - 音声合成: VOICEVOX（ローカル、コスト0）
>
> [y] 実行 / [n] キャンセル / [edit] トピックを編集

ユーザーが `y` と答えた場合のみ、次のコマンドを実行:

```bash
cd packages/tech-geopolitics-channel
npx ts-node --transpile-only scripts/autonomous-loop.ts \
  --topics "{選択トピック}" \
  --force
```

### Step 6: 結果報告

台本生成が完了したら以下を報告:

```
✅ 台本生成完了

- エピソードID: epXXX
- 台本: input/epXXX.yaml
- スコアカード: brain/scorecards/epXXX.json

次のステップ:
  1. input/epXXX.yaml で台本内容を確認
  2. /voice-generate でVOICEVOX音声合成
  3. still 確認後、/video-render でMP4生成
  4. /qa-check で品質チェック
  5. publisher エージェントでYouTubeアップロード
```

---

## ルール

- **必ず human confirm を挟む**（autonomous-loop.ts 起動前）
- コスト上限（directive.yaml の `max_api_cost_usd_per_day`）を超えていれば中断
- ユーザーが `n` またはキャンセルした場合は即座に停止
- `--reuse` を使う場合は前回のリサーチ日時を表示して確認を取る

## X ポスト知識の活用

`knowledge/x-posts/index.json` に保存済み X ポストがある場合、トピック提案の補助情報として活用できる。

Step 2 のエージェント呼び出し時に以下を追記:

```
# 参考: 保存済み X ポストのトレンド
{index.json から抜粋した author + text 先頭100字}
```

X ポストの保存・検索は `/x-post-knowledge` スキルを参照。

## 関連ファイル

| ファイル | 役割 |
|---------|------|
| `knowledge/competitor-channels.yaml` | 競合チャンネル・キーワード設定 |
| `knowledge/directive.yaml` | チャンネル方針・避けるテーマ |
| `knowledge/topic-research.json` | リサーチ結果キャッシュ |
| `knowledge/proposals/YYYY-MM-DD.md` | 提案履歴 |
| `knowledge/x-posts/index.json` | 保存済み X ポスト（トレンド補助情報） |
| `packages/tech-geopolitics-channel/input/TOPIC_PROPOSAL_PROMPT.md` | プロンプト（リサーチ結果注入済み） |
| `.claude/agents/topic-researcher.md` | リサーチ実行エージェント |
