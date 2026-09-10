---
name: session-wrap
description: Claude Code セッション終了時の教訓記録と handoff 更新。トリガーは /session-end、セッション終わり、振り返り、learnings 記録、lessons.md 追記。毎回の自動全文明は禁止。
---

# session-wrap

終了処理を LLM に毎回やらせない。決定的な記録は hook、判断が要る記録だけこのスキル。

## 役割分担

| 仕組み | いつ | 何をする | トークン |
|---|---|---|---|
| SessionEnd hook `session-end-capture.js` | セッションが実際に終わるとき | git dirty / reason を JSON に書く | 0 |
| SessionStart hook `session-start-context.js` | 起動・resume | 短い追加コンテキストだけ注入 | 注入分のみ |
| PreCompact hook `precompact-handoff.js` | compact 前 | `handoff.md` を機械生成 | 0 |
| `/session-end` | ユーザーが明示 | 新教訓の可否を判定して最小追記 | 小 |
| knowledge-keeper | 「スキル改善」「昇格」と明示されたときだけ | 抽象化 | 中。終了のたびに呼ばない |

## 記録する条件（全て満たす）

- 今回の失敗または回避策が、次セッションの自分（別コンテキスト）が再現できる
- `tasks/lessons.md` 先頭の最新エントリと実質同じではない
- 「作業した」だけではない（進捗は todo / handoff 側）

## 記録しない

- 一度きりの探索、調査メモ、感想
- 既に `.claude/rules/` またはスキルに書いた内容の言い換え
- compact されたからという理由だけの再要約

## 読み込み上限

- `tasks/lessons.md`: 最新見出し 1 件
- `tasks/todo.md`: 「進行中」のみ
- トランスクリプト全件禁止

## 昇格

同じ失敗が lessons に 2 件溜まったら `.claude/rules/{topic}.md` への昇格を提案する。このスキルのターンでは原則ファイルを編集しない。
