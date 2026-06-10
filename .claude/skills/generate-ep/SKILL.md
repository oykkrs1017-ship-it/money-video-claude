---
name: generate-ep
description: エピソードのフルパイプライン実行（台本生成→音声合成→動画レンダリング→YouTube公開）。ep番号とトピックを受け取り全工程を順番に実行する。
tools: Bash, Read, Glob
---

# generate-ep — フルパイプライン実行スキル

エピソード1本を最初から最後まで生成する。各ステップを順番に実行し、失敗したら即停止してユーザーに報告する。

詳細コマンド → `resources/steps.md`

## 引数

- `--ep epXXX` （必須）: エピソードID（例: ep010）
- `--topic "..."` （必須）: トピック文字列
- `--desc "..."` （任意）: 補足説明
- `--with-exa` （任意）: Exaリサーチを自動実行してから台本生成
- `--skip-upload` （任意）: YouTube公開をスキップ（確認用）

## 実行フロー（概要）

### MainVideo フロー（標準）

| Step | 内容 | 完了条件 |
|------|------|---------|
| 1 | 事前確認（VOICEVOX起動・TSCチェック） | `version` 応答・エラーなし |
| 2 | 台本生成（generate-script.ts） | chapters 5・lines 55〜65 |
| 3 | YAML→JSON変換 + `cp` | `input/{epId}.json` 生成 |
| 4 | 音声生成（generate-voices.ts） | `public/voices/` に WAV 生成、frameCount付与後に `cp` |
| 5 | Still確認（任意） | ユーザー判断 |
| 6 | 動画レンダリング（remotion render） | MP4 出力・サイズ確認 |
| 7 | YouTube公開（upload-youtube.ts） | **ユーザー確認必須（不可逆）** |
| 8 | output/ クリーンアップ提案 | `output-cleanup.md` 参照 |

### SlidesVideo フロー（ep019〜 標準）

> `input/ep{N}-slides.json` が存在する場合はこちらを使う。

| Step | 内容 | 完了条件 |
|------|------|---------|
| 1 | 事前確認 | VOICEVOX応答・TSCエラーなし |
| 2 | スライド設計（ep{N}-slides.json） | カスタムビジュアル含む全スライド定義済み |
| 3 | 台本生成（--from-slides --html-slides） | `input/{epId}.yaml` 生成 |
| 4 | YAML→JSON変換 + `cp` | `input/{epId}.json` 生成 |
| 5 | 音声生成 + `cp`（frameCount付与） | WAV 生成・frameCount確認 |
| **2.5** | **★ スライドプレビュー → ユーザー承認（必須）** | `npx ts-node --transpile-only scripts/preview-slides.ts --ep {epId}` → PNG確認 → 修正あれば slides.json 編集して再実行 → 承認後に次へ |
| **6** | **★ ビジュアルパッチ（必須）** | `node scripts/patch-visuals.js --ep {epId}` → bar-diff/donut-center等が script-input.json に反映 |
| 7 | HTMLスライド生成（npm run html:generate） | `out/html-slides/png/` に PNG生成・slide-map.json確認 |
| 8 | Still確認（SlidesVideo） | 3フレーム確認 |
| 9 | レンダリング（SlidesVideo） | MP4 出力 |
| 10 | YouTube公開 | **ユーザー確認必須** |

> ⚠️ **Step 6 を省略すると bar-diff/donut-center/vs-battle/color-cards/data-table が消える。**
> generate-script.ts は chart/stat/rich-panel しか生成しないため、パッチが必須。
> 詳細: `.claude/skills/html-slides-workflow/SKILL.md`

## エラー対応

| エラー | 対応 |
|--------|------|
| VOICEVOX 未起動 | 停止→起動依頼 |
| TSC エラー | build-error-resolver エージェントに委譲 |
| セリフ数不足 | 台本を再生成（--desc で補足追加） |
| WAV 欠損 | generate-voices を再実行 |
| レンダリング失敗 | video-engineer エージェントに委譲 |
