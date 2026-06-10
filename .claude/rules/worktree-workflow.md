# Worktree 並列運用ルール

ep 制作は ep 単位で独立しているため worktree で並列作成できる。推奨 **2 本まで**（3本以上は render 中に詰まる）。

## セットアップ

```bash
git worktree add ../money_video_ep010 -b ep010
cd ../money_video_ep010/packages/tech-geopolitics-channel && npm install
cd ../money_video_ep010 && claude
```

## 共有リソースの競合

| リソース | 状態 |
|---|---|
| `public/voices/`, `output/` | worktree 独立 — 競合なし |
| VOICEVOX（:50021） | 共有。同時リクエスト可だが速度低下あり |
| Remotion レンダリング | CPU 競合。2本同時レンダリング禁止 |

## 削除（マージ後）

```bash
git worktree remove ../money_video_ep010 && git branch -d ep010
```

## よくあるミス

- `npm install` 忘れ → `npx ts-node` 失敗
- `script-input.json` を worktree 間でコピー → worktree ごとに独立した ep を制作
- master 変更の取り込み忘れ → 定期的に `git rebase master`
