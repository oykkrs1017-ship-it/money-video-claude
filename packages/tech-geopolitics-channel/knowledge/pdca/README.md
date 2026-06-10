# PDCA ディレクトリ

YouTube チャンネル成長の PDCA サイクルを管理するディレクトリ。

## ファイル構成

| ファイル | 役割 | 更新タイミング |
|---------|------|--------------|
| `baseline-metrics.md` | 現在のベースライン指標 | Act フェーズ後 |
| `hypotheses-current.md` | テスト中の仮説一覧 | Plan・Act フェーズ後 |
| `YYYY-MM-DD-plan.md` | Plan フェーズの記録 | Plan 実行後 |
| `YYYY-MM-DD-check-epXXX.md` | Check フェーズの記録 | Check 実行後 |
| `analysis-YYYY-MM-DD.json` | analyze-my-channel.ts の出力コピー | Plan 実行後 |

## PDCA サイクルの回し方

```
/youtube-pdca   →  フェーズを選択

Plan:  「分析して改善策を出して」
Check: 「ep007 の成果を確認して」
Act:   「今月の振り返りをまとめて」
```

## エージェントチーム

| エージェント | 役割 |
|------------|------|
| `youtube-analyst` | データ収集・数値整理（Haiku） |
| `pdca-strategist` | 仮説設計・学習昇格（Opus） |
| `performance-monitor` | 投稿後の継続監視（Sonnet） |

## サイクル頻度の目安

| フェーズ | 推奨頻度 |
|---------|---------|
| Plan | 月1回（新シリーズ企画前） |
| Check | 投稿後 7 日 + 30 日 |
| Act | Check の翌日 |
