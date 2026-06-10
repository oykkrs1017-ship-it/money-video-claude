# Plan Mode 運用ルール

## 発動タイミング

CLAUDE.md の「Plan Mode 必須トリガー」に該当する場合は自動 Plan Mode 入り。迷ったら「影響ファイルが3つ以上か？」で判断。

**進め方**: Read/Grep/Glob で調査（実装不可）→ 変更ファイル・内容を箇条書き → ExitPlanMode で承認 → 実装。

## 台本企画はインタビューから

新 ep トピック決定は即台本生成しない。AskUserQuestion で先に確認:
- 視聴者の関心（投資家 / 地政学 / 両方）
- 主軸テーマ（企業分析 / チョークポイント / 逆張り銘柄 等）
- 動画の長さ感（短め 5-7 min / 標準 10-15 min）
- 既存シリーズとの差別化

## compact 後の再読込

`/compact` 後にサブパッケージのルールが消える場合がある。`packages/tech-geopolitics-channel/` 再開時は CLAUDE.md 存在確認 → 「このファイルを読んで」で文脈復元。

## checkpoint と /rewind

全操作は自動で checkpoint 記録される。`Esc×2` または `/rewind` で戻せる。

**戻せないもの（操作前に必ず y/n 確認）**:
- YouTube アップロード済み動画
- VOICEVOX WAV 生成済みファイル
- `git push` 済みコミット
