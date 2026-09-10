# セッション終了プロトコル

詳細手順は `/session-end`（`.claude/commands/session-end.md`）。このファイルは原則だけ置く。

- 終了のたびに lessons.md へ長文を書かない
- 機械的スナップショットは hook に任せる（`.claude/logs/`、gitignored）
- LLM が書いてよいのは「次に同じ失敗を防ぐ 1 ルール」だけ
- `tasks/lessons.md` と `tasks/todo.md` を CLAUDE.md から毎回全件ロードしない
- knowledge-keeper は終了フックに繋ぐない
