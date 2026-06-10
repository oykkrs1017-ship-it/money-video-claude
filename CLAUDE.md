# CLAUDE.md - クノロジー投×地政学 YouTubeチャンネル自動生

## プロジェクト概
クノロジー投×地政学のYouTubeチャンネル動画を動生成するモノレポ
台本生  音声合  動画レンダリング  YouTube公 のパイプラインを統合

## コマン
```bash
# 動画パッケージpackages/tech-geopolitics-channel/
npm run dev            # Remotion Studio起
npm run build          # ビル
npx tsc --noEmit       # TypeScript型チェク
npx remotion still     # スクリーンショ
npx remotion render    # MP4レンダリング

#  統合パイプライン推奨
# 1コマンドで「トピック選  台本生  音声/画/インフォ生」まで完
npm run new-ep              # ニュース既存データで実行Studio起動で確認
npm run new-ep:fresh        # ニュース再取得してから実行（週1推奨
npm run new-ep:render       # MP4レンダリングまで一括実
#  完後に Still確認コマンドと upload コマンドが表示され

# ep生パイプライン手動個別実行
# 1. 台本生
npx ts-node --transpile-only scripts/generate-script.ts --topic "トピク" --ep epXXX
# 2. YAML→JSON変換
npx ts-node --transpile-only scripts/yaml-to-json.ts input/epXXX.yaml
# 2.5 script-input.json を更新 忘れるとStillで旧エピソードタイトルが
cp input/epXXX.json input/script-input.json
# 3. 音声生
npx ts-node --transpile-only scripts/generate-voices.ts --input input/epXXX.json
# 4. インフォグラフィク生 忘れるとrender失
npx ts-node --transpile-only scripts/generate-infographics.ts --input input/epXXX.json
# 4.5 AI解説画像生成（台本に ai-infographic ビジュアルがある場合
npx ts-node --transpile-only scripts/generate-ai-infographics.ts --input input/epXXX.json
# 4.6 インフォグラフィク後琼Adobe MCP任意Claude  MCP ールを呼ぶ
#   手: adobe_mandatory_init  --list で対象確  Adobe MCP で輝度/コントラス/色温度補正  --download で上書き保
#   詳細: .claude/rules/adobe-enhance.md
npx ts-node --transpile-only scripts/enhance-infographics.ts --list --input input/epXXX.json
# 5. Still確認3フレーム Remotion Studio確  ユーザー承
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
# 7. YouTube公開（メイン + Shorts）tsconfig-paths須
node_modules/.bin/ts-node -r tsconfig-paths/register --transpile-only scripts/upload-youtube.ts output/epXXX.mp4 --input input/epXXX.yaml --thumbnail "output/thumbnail.jpeg"
node_modules/.bin/ts-node -r tsconfig-paths/register --transpile-only scripts/upload-youtube.ts output/epXXX_shorts.mp4 --input input/epXXX.yaml --thumbnail "output/thumbnail.jpeg" --shorts
```

## アーキクチャ
- モノレポ構packages/
- Remotion + React で動画レンダリング
- VOICEVOX で音声合localhost:50021
- Claude API で台本自動生

## ィレクトリ構
```
packages/tech-geopolitics-channel/
├── input/          # 台本YAML/JSON
├── output/         # 生物MP4, PNG, props.json
├── public/voices/  # 音声WAVファイル
├── public/images/  # コンン画
├── scripts/        # CLI スクリプト
└── src/
    ├── compositions/  # Remotionコンポジション
    ├── components/    # Reactコンポネン
    ├── styles/        # ーマ設
    └── utils/         # 型定義・ユーィリィ
```

## Plan Mode 須トリガー

以下ずれかに該当する場合、実前に ** Plan Mode で調査・計画してから着手す**

- 3 ファイル以上を同時に変更する
- 新しい npm パッケージを追加する
- VOICEVOX クライアントRemotion コアcompositions/を改修する
- スクリプトのパイプライン序や引数インターフェースを変え
- 新しい ep シリーズ Composition Type を追加する

詳細: `.claude/rules/plan-mode.md`

## 注意事
- レンダリング前に `npx tsc --noEmit` でチェクverify-checklist も参照
- 音声WAVが欠けるとサイレント動画になるで事前確
- アプロード不可。ずユーザー確認を取る
- レンダリング・アプロード前の検証手: `.claude/rules/verify-checklist.md`

## 実行前チェクリスト（スクリプト実行時
- `packages/.env` がロードされてるかEXA_API_KEY, YouTube API 等
- YouTube OAuth トクンが有効か（アプロードセション開始前
- 実行ディレクトリ `packages/tech-geopolitics-channel/` である

## Verification Rule
「設定済み」「動化済み」「動作してる」と主張するとき、確認したファイルパスと行番号をず示する。記から断言しな

## Session End Protocol
ep完主要機実完後毎回自動で learnings  `tasks/lessons.md` + daily log に記録する指示不覼

## 並行作業
レンダリング開始後別 worktree で次 ep の台本・音声を並行して進めることを検討する。詳細: `.claude/rules/worktree-workflow.md`

## 詳細ルール
ドメイン固有ルールは `.claude/rules/` に割管

## プロジェクト固有学び・原則
- `.claude/skills/voicevox-workflow/SKILL.md`  VOICEVOX誤読防止・2層対策フロー
- `.claude/skills/remotion-still-check/SKILL.md`  Still確認フレームの選び方
- `.claude/skills/thumbnail-generation/SKILL.md`  サムネイル高度プロンプト設
- `.claude/rules/single-source-of-truth.md`  設定値は1所に定義する原則
- `tasks/lessons.md`  時系列教訓集
- `tasks/todo.md`  進行中タスク

## タスク管
@tasks/todo.md
@tasks/lessons.md

## 教訓格フロー

```
lessons.md に記録即時
     同じ問題が2回発
.claude/rules/{topic}.md に原則ファイルとして格
     容確
MEMORY.md インクスを更新~/.claude/projects/.../memory/MEMORY.md
```

格の判断基:
- 同じ失敗パターン2回以上発生し
- 「毎回確認が要」な手が定型化できる
- VOICEVOX誤読・Remotionレイアウト等ドメイン知

## ai-money-shorts 固有注意事
- キャラ名色は `src/types/character.ts` の CHARACTER_CONFIGS が唯一の定義
- VOICEVOXにはキストをそまま渡さず `normalizeForVoicevox()` を通す
- Still確認セクション startFrame+30F 以降フレームを指定す
- 新しい誤読を発見したら `src/utils/textNormalizer.ts` と `prompts/script-system-prompt.md` の両方に追

---

## 行動規

詳細: `.claude/rules/behavior-rules.md`

要点: 実前にえる・シンプルさ優先外科的変更・ゴール起点・トクン予算厳守（タスク4k/セション30k失敗大声で報告
