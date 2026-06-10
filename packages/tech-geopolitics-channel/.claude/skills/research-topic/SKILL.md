---
name: research-topic
description: 過去1週間のトレンドニュースをスコアリングし、次回エピソードのトピックを選定する。select-topic.ts を実行してユーザーが番号選択 → next-topic.json に保存。
origin: project
---

# トピック選定フロー

## 前提条件

- `EXA_API_KEY` が設定されていること（`.env` または環境変数）
- `ANTHROPIC_API_KEY` が設定されていること

## 実行コマンド

```bash
cd packages/tech-geopolitics-channel

# 【基本】既存の topic-research.json を使って提案生成
npx ts-node --transpile-only scripts/select-topic.ts

# 【推奨】ニュースを再取得してから提案生成（週1回）
npx ts-node --transpile-only scripts/select-topic.ts --fresh

# 提案件数を変更（デフォルト5）
npx ts-node --transpile-only scripts/select-topic.ts --top 7
```

## フロー

```
1. topic-research.json 読み込み（--fresh なら再取得）
        ↓
2. NewsScorer でスコアリング（鮮度×0.4 + 関連度×0.35 + ソース信頼度×0.15 - 競合被り×0.1）
        ↓
3. 上位15件 + 競合動画を Claude に渡してトピック提案生成
        ↓
4. 番号付きリストを表示 → ユーザーが番号を入力
        ↓
5. input/next-topic.json に保存
```

## 出力ファイル

`input/next-topic.json`:
```json
{
  "selectedAt": "2026-05-03T...",
  "number": 3,
  "title": "東京エレクトロンが米中半導体戦争で漁夫の利を得る理由",
  "theme": "米中規制の狭間で日本半導体装置メーカーが独自ポジションを確立",
  "whyNow": "...",
  "valueForViewers": "...",
  "titleCandidates": ["タイトル案1", "タイトル案2"],
  "sourceUrls": ["https://..."],
  "sourceNews": [{ "title": "...", "url": "...", "score": 8.3 }]
}
```

## 次のステップ（台本生成）

```bash
# next-topic.json のタイトルをそのまま使う
npx ts-node --transpile-only scripts/generate-script.ts \
  --topic "$(cat input/next-topic.json | python -c 'import json,sys; print(json.load(sys.stdin)["title"])')" \
  --ep epXXX \
  --with-exa
```

## スコアリング基準（NewsScorer）

| 指標 | 重み | 計算方法 |
|---|---|---|
| 鮮度 | 40% | 今日=10, 昨日=8, 3日以内=6, 7日以内=4, それ以上=2 |
| キーワード関連度 | 35% | タイトル一致×2 + サマリー一致×1（cap 10） |
| ソース信頼度 | 15% | Bloomberg/Reuters/日経=3, TechCrunch/CNBC=2, other=1 |
| 競合被り補正 | 10% | 競合タイトルと単語2件以上被り → -3 |

## トラブルシューティング

| 症状 | 原因 | 対処 |
|---|---|---|
| `ニュースが0件` | EXA_API_KEY 未設定 | `.env` に `EXA_API_KEY=...` を追加 |
| `topic-research.json が見つかりません` | --fresh 未実行 | `--fresh` を付けて実行 |
| JSON パースエラー | Claude 出力形式崩れ | もう一度実行（稀に発生） |

## キーワード設定

`knowledge/competitor-channels.yaml` の `keywords_for_news` を編集して検索キーワードを追加・変更できる。
