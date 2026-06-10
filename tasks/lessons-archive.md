# アーカイブ済み教訓（昇格・実装完了済み）

> ここに移動した教訓はルールファイルまたはhookとして実体化済み。参照のみ。

---

## 2026-05-04 — 動画内の制作構造ラベルはAI生成感を与える
→ `.claude/rules/ban-avoidance.md` に昇格済み。CTA は最終チャプターのみ。

## 2026-05-04 — image ビジュアルの参照ファイルはレンダリング前に存在確認が必要
→ `.claude/rules/verify-checklist.md` に追記済み。fetch-images.ts 実行を render 前チェックに追加。

---

## 2026-05-01 — Boris 30 Tips 採用判定（完了）

採用 13 / 既存 8 / 見送り 9。フェーズ A→B→C で実装完了。

採用済みルール・hook:
- Plan Mode 必須トリガー → `CLAUDE.md` + `.claude/rules/plan-mode.md`
- 自己検証チェックリスト → `.claude/rules/verify-checklist.md`
- Worktree 並列運用 → `.claude/rules/worktree-workflow.md`
- ask 層追加 → `settings.json`（git push / rm / upload は ask）
- prettier hook → `.claude/hooks/prettier-format.js`
- status line → `settings.json`
- Chrome 拡張 UI 検証 → `.claude/rules/chrome-ui-verify.md`
- script-input 同期チェック hook → `.claude/hooks/script-input-sync-check.js`

見送り: --add-dir / PRコメントCLAUDE.md更新 / claude -p CI / Issue直接実装 / GitHub Action @claude / Routines / Ultraplan / Remote Control

---

## 2026-04-27 — Claude Code 設定・コード堅牢化まとめ（完了済み）
settings.local.json 整理、VoicevoxClient リトライ追加、Zod バリデーション追加、assets.yaml 外部化。詳細は git log 2026-04-27 参照。

---

## 2026-04-25 — outputディレクトリはep完成後に毎回クリーンアップする
→ `.claude/hooks/post-upload-cleanup.js` で自動提案済み。
残すもの: `ep{N}.mp4` / upload_result.json / thumbnail-brief.md / props.json（1世代）/ thumbnail / channel-analysis.json
削除するもの: `*.png`（still確認用）/ `*_test.mp4` / 旧props.json
