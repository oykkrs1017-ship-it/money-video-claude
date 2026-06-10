# CLAUDE.md - テクノロジー投資×地政学 YouTubeチャンネル自動生成

## プロジェクト概要
テクノロジー投資×地政学のYouTubeチャンネル動画を自動生成するモノレポ。
台本生成 → 音声合成 → 動画レンダリング → YouTube公開 のパイプラインを統合。

## コマンド
```bash
# 動画パッケージ（packages/tech-geopolitics-channel/）
npm run dev            # Remotion Studio起動
npm run build          # ビルド
npx tsc --noEmit       # TypeScript型チェック
npx remotion still     # スクリーンショット
npx remotion render    # MP4レンダリング

# ★ 統合パイプライン（推奨）
# 1コマンドで「トピック選定 → 台本生成 → 音声/画像/インフォ生成」まで完了
npm run new-ep              # ニュース既存データで実行（Studio起動で確認）
npm run new-ep:fresh        # ニュース再取得してから実行（週1推奨）
npm run new-ep:render       # MP4レンダリングまで一括実行
# ★ 完了後に Still確認コマンドと upload コマンドが表示される

# ep生成パイプライン（手動個別実行）
# 1. 台本生成
npx ts-node --transpile-only scripts/generate-script.ts --topic "トピック" --ep epXXX
# 2. YAML→JSON変換
npx ts-node --transpile-only scripts/yaml-to-json.ts input/epXXX.yaml
# 2.5 script-input.json を更新（忘れるとStillで旧エピソードタイトルが出る）
cp input/epXXX.json input/script-input.json
# 3. 音声生成
npx ts-node --transpile-only scripts/generate-voices.ts --input input/epXXX.json
# 4. インフォグラフィック生成（忘れるとrender失敗）
npx ts-node --transpile-only scripts/generate-infographics.ts --input input/epXXX.json
# 4.5 AI解説画像生成（台本に ai-infographic ビジュアルがある場合）
npx ts-node --transpile-only scripts/generate-ai-infographics.ts --input input/epXXX.json
# 4.6 インフォグラフィック後処理（Adobe MCP・任意）Claude が MCP ツールを呼ぶ
#   手順: adobe_mandatory_init → --list で対象確認 → Adobe MCP で輝度/コントラスト/色温度補正 → --download で上書き保存
#   詳細: .claude/rules/adobe-enhance.md
npx ts-node --transpile-only scripts/enhance-infographics.ts --list --input input/epXXX.json
# 5. Still確認（3フレーム）→ Remotion Studio確認 → ユーザー承認
# 6. レンダリング
npx remotion render src/index.ts MainVideo output/epXXX.mp4

# SlidesVideo パイプライン（ep019〜）
# SV-1. スライド構造 JSON 生成
npx ts-node --transpile-only scripts/generate-slide-structure.ts --topic "トピック" --ep epXXX --with-exa
# SV-2. preview-slides でスライド確認（ユーザー承認）
npx ts-node --transpile-only scripts/preview-slides.ts --ep epXXX
# SV-3. 台本生成
npx ts-node --transpile-only scripts/generate-script.ts --from-slides input/epXXX-slides.json --html-slides --topic "トピック" --ep epXXX
# SV-4. YAML→JSON変換 + script-input.json 更新
npx ts-node --transpile-only scripts/yaml-to-json.ts input/epXXX.yaml
cp input/epXXX.json input/script-input.json
# SV-5. 音声生成
npx ts-node --transpile-only scripts/generate-voices.ts --input input/epXXX.json
# SV-6. カスタムビジュアル復元
node scripts/patch-visuals.js --ep epXXX
# SV-7. HTML スライド生成（slide-map.json を出力）
npm run html:generate -- --input ./input/script-input.json
# SV-8. 全スライドを slide-map.json に登録（section冒頭2秒表示・visual均等配分）★ep022〜必須
npx ts-node --transpile-only scripts/assign-slides.ts --ep epXXX
# SV-9. Still 確認 → ユーザー承認（stillコマンド必須・Studio白表示のため）
node_modules/.bin/remotion still src/index.ts SlidesVideo output/check_fXXX.png --props input/script-input.json --frame XXX
# SV-10. メイン動画レンダリング
node_modules/.bin/remotion render src/index.ts SlidesVideo output/epXXX.mp4 --props input/script-input.json --timeout 60000
# SV-10.5. Shorts レンダリング（ダイジェスト型・CTA3秒付き・ep023〜デフォルト）
node_modules/.bin/remotion render src/index.ts ShortsVideo output/epXXX_shorts.mp4 --props input/script-input.json --timeout 60000
# 7. YouTube公開（メイン + Shorts）tsconfig-paths 必須
node_modules/.bin/ts-node -r tsconfig-paths/register --transpile-only scripts/upload-youtube.ts output/epXXX.mp4 --input input/epXXX.yaml --thumbnail "output/thumbnail.jpeg"
node_modules/.bin/ts-node -r tsconfig-paths/register --transpile-only scripts/upload-youtube.ts output/epXXX_shorts.mp4 --input input/epXXX.yaml --thumbnail "output/thumbnail.jpeg" --shorts
```

## アーキテクチャ
- モノレポ構成（packages/）
- Remotion + React で動画レンダリング
- VOICEVOX で音声合成（localhost:50021）
- Claude API で台本自動生成

## ディレクトリ構成
```
packages/tech-geopolitics-channel/
├── input/          # 台本YAML/JSON
├── output/         # 生成物（MP4, PNG, props.json）
├── public/voices/  # 音声WAVファイル
├── public/images/  # コンテンツ画像
├── scripts/        # CLI スクリプト
└── src/
    ├── compositions/  # Remotionコンポジション
    ├── components/    # Reactコンポーネント
    ├── styles/        # テーマ設定
    └── utils/         # 型定義・ユーティリティ
```

## Plan Mode 必須トリガー

以下のいずれかに該当する場合、実装前に **必ず Plan Mode で調査・計画してから着手する**

- 3 ファイル以上を同時に変更する
- 新しい npm パッケージを追加する
- VOICEVOX クライアント・Remotion コア（compositions/）を改修する
- スクリプトのパイプライン順序や引数インターフェースを変える
- 新しい ep シリーズ・Composition Type を追加する

詳細: `.claude/rules/plan-mode.md`

## 注意事項
- レンダリング前に `npx tsc --noEmit` で型チェック（verify-checklist も参照）
- 音声WAVが欠けるとサイレント動画になるので事前確認
- 無断アップロード不可。必ずユーザー確認を取る
- レンダリング・アップロード前の検証手順: `.claude/rules/verify-checklist.md`

## 実行前チェックリスト（スクリプト実行時）
- `packages/.env` がロードされているか（EXA_API_KEY, YouTube API 等）
- YouTube OAuth トークンが有効か（アップロードはセッション開始前に確認）
- 実行ディレクトリが `packages/tech-geopolitics-channel/` であるか

## Verification Rule
「設定済み」「自動化済み」「動作している」と主張するとき、確認したファイルパスと行番号を必ず提示する。記憶から断言しない。

## Session End Protocol
ep完成・主要機能実装完了後、毎回自動で learnings を `tasks/lessons.md` + daily log に記録する（指示不要）。

## 並行作業
レンダリング開始後、別 worktree で次 ep の台本・音声を並行して進めることを検討する。詳細: `.claude/rules/worktree-workflow.md`

## 詳細ルール
ドメイン固有ルールは `.claude/rules/` に分割管理。

## プロジェクト固有学び・原則
- `.claude/skills/voicevox-workflow/SKILL.md` — VOICEVOX誤読防止・2層対策フロー
- `.claude/skills/remotion-still-check/SKILL.md` — Still確認フレームの選び方
- `.claude/skills/thumbnail-generation/SKILL.md` — サムネイル高度プロンプト設計
- `.claude/rules/single-source-of-truth.md` — 設定値は1箇所に定義する原則
- `tasks/lessons.md` — 時系列教訓集
- `tasks/todo.md` — 進行中タスク

## タスク管理
@tasks/todo.md
@tasks/lessons.md

## 教訓昇格フロー

```
lessons.md に記録（即時）
  ↓ 同じ問題が2回発生
.claude/rules/{topic}.md に原則ファイルとして昇格
  ↓ 内容確認
MEMORY.md インデックスを更新（~/.claude/projects/.../memory/MEMORY.md）
```

昇格の判断基準:
- 同じ失敗パターンが2回以上発生した
- 「毎回確認が必要」な手順が定型化できる
- VOICEVOX誤読・Remotionレイアウト等のドメイン知識

## ai-money-shorts 固有注意事項
- キャラ名・色は `src/types/character.ts` の CHARACTER_CONFIGS が唯一の定義
- VOICEVOXにはテキストをそのまま渡さず `normalizeForVoicevox()` を通す
- Still確認はセクション startFrame+30F 以降のフレームを指定する
- 新しい誤読を発見したら `src/utils/textNormalizer.ts` と `prompts/script-system-prompt.md` の両方に追記

---

## 行動規範

詳細: `.claude/rules/behavior-rules.md`

要点: 実装前に考える・シンプルさ優先・外科的変更・ゴール起点・トークン予算厳守（タスク4k/セッション30k）・失敗は大声で報告
