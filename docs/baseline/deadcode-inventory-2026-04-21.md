# Dead Code Inventory — 2026-04-21

Phase 0 棚卸し結果。**この時点では削除・移動は一切行わない**。Phase 2-3 で退避→削除する対象の確定リスト。

## 検証手段

- `knip@5` (プロジェクトルートから `scripts/` 呼び出しを追跡できず誤検知あり)
- `ts-prune@0.10.3` (named / default 双方の未使用を検出)
- Grep による import グラフの手動トレース

## カテゴリA: 真の死骸（Root.tsx から到達不能）

現役の entry chain は `src/index.ts → Root.tsx → compositions/MainVideo.tsx → *` のみ。以下は**どの経路からも到達しない**:

| ファイル | 行数 | 死骸の理由 |
|---|---:|---|
| `packages/tech-geopolitics-channel/src/Main.tsx` | 162 | 旧Remotion root。`index.ts` で登録されていない |
| `packages/tech-geopolitics-channel/src/config.ts` | 95 | `Main.tsx` と `components/{Character,Subtitle,SceneVisuals}.tsx` のみから参照 |
| `packages/tech-geopolitics-channel/src/data/script.ts` | 109+ | `Main.tsx`, `components/SceneVisuals.tsx` のみから参照 |
| `packages/tech-geopolitics-channel/src/components/Character.tsx` | 137 | `Main.tsx` のみから参照 (**CharacterLayer.tsx が使うのは MetanStage/ZundamonStage**) |
| `packages/tech-geopolitics-channel/src/components/Subtitle.tsx` | 119 | `Main.tsx` のみから参照 (現役字幕は `SubtitleLayer.tsx`) |
| `packages/tech-geopolitics-channel/src/components/SceneVisuals.tsx` | 130 | `Main.tsx` のみから参照 (現役は `VisualLayer.tsx`) |
| `packages/tech-geopolitics-channel/src/utils/parseScript.ts` | 43 | `parseScriptInput` がどこからも未参照 |

**合計: 約795行**の純粋な死骸。

## カテゴリB: 要検証（knip 誤検知の可能性あり）

knip は npm scripts ("`npx ts-node scripts/foo.ts`") を追跡できないため、`package.json` の scripts に登録されたファイルはすべて unused 判定されている。以下は現役:

| ファイル | knip判定 | 実態 |
|---|---|---|
| `scripts/generate.ts` | unused | `npm run pipeline` 経由で稼働 |
| `scripts/generate-script.ts` | unused | `create-script` 経由で稼働 |
| `scripts/upload-youtube.ts` | unused | `npm run upload` 経由で稼働 |
| `scripts/autonomous-loop.ts` | unused | `npm run loop` 経由で稼働 |
| `scripts/analyze-winning-patterns.ts` | unused | `npm run analyze-patterns` 経由で稼働 |
| `scripts/fetch-competitor-corpus.ts` | unused | `npm run fetch-corpus` 経由で稼働 |
| `scripts/collect-analytics.ts` | unused | `npm run collect-analytics` 経由で稼働 |
| `scripts/generate-thumbnail-brief.ts` | unused | 手動実行だが現役 |
| `scripts/research-topics.ts` | unused | 手動実行だが現役 |
| `scripts/generate-infographics.js` | unused | 要確認 (`create-script` 等からの呼び出し有無) |
| `scripts/analyze-my-channel.ts` | unused | 手動分析、半現役 |
| `scripts/create-placeholder-images.ts` | unused | dev時のみ |
| `scripts/youtube-reauth.ts` | unused | OAuth切れ時のみ |

**方針**: Phase 2 で全て `apps/cli/` 配下に移植するため、ここでは削除しない。

## カテゴリC: 重複エクスポート（整理候補）

`ts-prune` 結果: コンポーネント22ファイルが **named export + default export の両方** を持ち、default 側がどこからも参照されていない。

```
AudioTrack, BackgroundRenderer, ChapterCard, CharacterLayer, CinematicLayer,
DataChart, ImageOverlay, KeywordFloat, MetanStage, ProgressBar, RichPanel,
SlideCard, SplitCompare, StatCard, SubtitleLayer, TimelineScroll,
TitleAnimation, TopicBadge, VariationEngine, VisualLayer, ZundamonStage,
MainVideo (composition)
```

**方針**: Phase 1 で `packages/renderer/` に移設する際、`export default` を削除して named export のみに統一。

## カテゴリD: 死骸パッケージ（Python系 + TS重複）

| パッケージ | 最終コミット | 判定 | Phase |
|---|---|---|---|
| `packages/pipeline/` | 2026-03-20 | 全廃 | Phase 2 |
| `packages/script-generator/` | 2026-03-20 | 全廃 | Phase 2 |
| `packages/script-reviewer/` | 2026-03-20 (feedback_loop.py は modified) | 全廃 | Phase 2 |
| `packages/trend-extractor/` | 2026-03-20 | TS に書き直し | Phase 2-3 |
| `packages/shared/` (Python) | 2026-03-20 | 全廃 | Phase 2 |
| `packages/video-renderer/` | 2026-03-21 | 全廃 (tech-geopolitics-channel と重複) | Phase 2 |
| `packages/ai-money-shorts/` | 2026-04-12 | Phase 3 冒頭で判断 | Phase 3 |

**`packages/pipeline/pyproject.toml`** は存在しない `audio-synthesizer`, `uploader` を workspace dependency として宣言しており、`pip install -e` すると即座に解決失敗する（既に壊れている）。

## カテゴリE: ルート汚染

| パス | サイズ | 判定 |
|---|---:|---|
| `BGM/` | 8.5 MB | `assets/bgm/` に移動 (Phase 3) |
| `素材格納-20260321T141033Z-1-001/` | 1.2 MB | 内容確認の上 `assets/raw/` へ移動 or 削除 |
| `brain/` | 10 KB | `.gitignore` 対象 or `tools/traces/` へ |
| `knowledge/` | 12 MB | ルート維持可、ただしアクセスは `AssetResolver` 経由に限定 |
| `analyze_tokens.py` | 13 KB | `tools/` へ移動 |

## 未使用依存関係

`package.json` で未使用と判定:

- **dependencies**: `@remotion/bundler`, `@remotion/renderer`, `dotenv`, `open` (knip判定。実稼働確認要)
- **devDependencies**: `@napi-rs/canvas`, `@types/js-yaml`, `googleapis`, `js-yaml`

※ `googleapis` / `js-yaml` は scripts 内で使用されている可能性が高く、knip の誤検知。Phase 2 の CLI 再構成時に実態確認。

## editor/ サブプロジェクト

- `packages/tech-geopolitics-channel/editor/`
- 最終コミット: 2026-03-22（1ヶ月前）、それ以降触られていない
- React + Vite + Tailwind のフルスタック（server + client）
- npm scripts: `editor`, `editor:client`, `editor:server`, `editor:install`, `editor:build`
- **判定**: 現在使われていない可能性が高い。Phase 2 でユーザーに利用状況ヒアリング、未使用なら Phase 3 で `archive/` へ退避。
