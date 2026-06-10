# generate-ep 詳細コマンドリファレンス

## コアロジックのファイル場所

**`scripts/` はCLIラッパーのみ。実装の変更は `packages/` を先に確認する。**

| 変更したいもの | 実際のファイル |
|---|---|
| YAML生成プロンプト | `packages/usecases/src/generateScript/prompt.ts` |
| スクリプト生成ロジック | `packages/usecases/src/generateScript/GenerateScriptUseCase.ts` |
| 音声生成ロジック | `packages/usecases/src/generateVoice/` |
| Anthropic API接続 | `packages/adapters/` 配下 |
| ログ・共通ユーティリティ | `packages/shared-ts/` |

---

## Step 1: 事前確認

```bash
curl -s http://localhost:50021/version
cd packages/tech-geopolitics-channel && npx tsc --noEmit
```

VOICEVOX 未起動なら停止してユーザーに起動依頼。

---

## MainVideo フロー（標準コマンド）

## Step 2: 台本生成

```bash
cd packages/tech-geopolitics-channel
npx ts-node --transpile-only scripts/generate-script.ts \
  --topic "{topic}" --ep {epId} [--desc "{desc}"] [--with-exa]
```

完了後 `input/{epId}.yaml` を確認: chapters 5章・lines 55〜65。

## Step 3: YAML→JSON 変換

```bash
npx ts-node --transpile-only scripts/yaml-to-json.ts input/{epId}.yaml
cp input/{epId}.json input/script-input.json
```

## Step 4: 音声生成

```bash
npx ts-node --transpile-only scripts/generate-voices.ts --input input/{epId}.json
cp input/{epId}.json input/script-input.json   # frameCount 付与後の JSON で上書き必須
```

`public/voices/` に WAV が生成されることを確認。

## Step 5: Still確認（任意）

```bash
npx remotion still src/index.ts MainVideo output/{epId}_check.png \
  --props input/script-input.json --frame 30
```

## Step 6: 動画レンダリング

```bash
npx remotion render src/index.ts MainVideo output/{epId}.mp4 \
  --props input/script-input.json
```

レンダリング後ファイルサイズ確認（極端に小さければ音声欠落の可能性）。

## Step 7: YouTube 公開

**必ずユーザー確認後に実行（不可逆操作）。**

```bash
node_modules/.bin/ts-node -r tsconfig-paths/register --transpile-only \
  scripts/upload-youtube.ts output/{epId}.mp4 --input input/{epId}.yaml \
  [--thumbnail "output/thumbnail.jpeg"]
```

## Step 8: 後処理

output/ クリーンアップを提案（`.claude/rules/output-cleanup.md` 参照）。

---

## SlidesVideo フロー（ep019〜 標準コマンド）

> `input/ep{N}-slides.json` が存在する場合はこちらを使う。

## SV-Step 2: スライド設計確認

`input/{epId}-slides.json` のカスタムビジュアル（bar-diff/donut-center/vs-battle等）が定義済みか確認。

## SV-Step 2.5: ★ スライドプレビュー → ユーザー承認（必須）

```bash
npx ts-node --transpile-only scripts/preview-slides.ts --ep {epId}
```

> `out/html-slides/index.html` をブラウザで開いて全スライドを確認する。
> 修正が必要な場合は `input/{epId}-slides.json` を編集して再実行する。
> **ユーザーの承認を得てから次のステップに進む（台本生成は不可逆操作ではないが、
> スライドが確定してから生成する方が品質が高い）。**

確認ポイント:
- [ ] vs-battle / color-cards / step-icons / data-table が正しく表示されているか
- [ ] leadText がグラフの下に2〜3行で表示されているか
- [ ] 連続する2スライドで同じビジュアルタイプを使っていないか
- [ ] hook 3枚目が color-cards（今日わかること3選）になっているか

## SV-Step 3: 台本生成（--from-slides --html-slides）

```bash
npx ts-node --transpile-only scripts/generate-script.ts \
  --from-slides input/{epId}-slides.json \
  --html-slides \
  --topic "{topic}" --ep {epId}
```

## SV-Step 4: YAML→JSON 変換

```bash
npx ts-node --transpile-only scripts/yaml-to-json.ts input/{epId}.yaml
cp input/{epId}.json input/script-input.json
```

## SV-Step 5: 音声生成

```bash
npx ts-node --transpile-only scripts/generate-voices.ts --input input/{epId}.json
cp input/{epId}.json input/script-input.json   # frameCount 付与後の JSON で上書き必須
```

## SV-Step 6: ★ ビジュアルパッチ（必須・省略禁止）

```bash
node scripts/patch-visuals.js --ep {epId}
```

> ⚠️ **このステップを省略すると bar-diff/donut-center/vs-battle/color-cards/data-table が全て消える。**
> generate-script.ts は chart/stat/rich-panel しか生成しない。パッチで ep{N}-slides.json の
> カスタムビジュアルを script-input.json に差し替える。

## SV-Step 7: HTMLスライド生成

```bash
npm run html:generate -- --input ./input/script-input.json
```

`out/html-slides/png/` にPNG、`out/html-slides/slide-map.json` を確認。

## SV-Step 8: Still確認（SlidesVideo）

> ⚠️ **Studio preview は HTML スライド PNG が白表示になる（2026-06-02確認）。スライド確認は必ず `still` コマンドで行うこと。**

```bash
node_modules/.bin/remotion still src/index.ts SlidesVideo output/{epId}_check_f500.png \
  --props input/script-input.json --frame 500
node_modules/.bin/remotion still src/index.ts SlidesVideo output/{epId}_check_mid.png \
  --props input/script-input.json --frame 6000
node_modules/.bin/remotion still src/index.ts SlidesVideo output/{epId}_check_end.png \
  --props input/script-input.json --frame 15000
```

確認ポイント:
- [ ] カバースライドが表示されている（f=500）
- [ ] 中盤でスライドが切り替わっている（f=6000）
- [ ] analysis/summary チャプターのスライドが表示されている（f=15000）

## SV-Step 9: レンダリング（SlidesVideo）

```bash
node_modules/.bin/remotion render src/index.ts SlidesVideo output/{epId}.mp4 \
  --props input/script-input.json --timeout 60000
```

## SV-Step 9.5: ★ Shorts レンダリング（ダイジェスト型・デフォルト）

> **ep023〜 デフォルト仕様**: hook/explanation/analysis チャプターから時間予算分を抽出して連続再生。
> summary/cta は除外し、末尾に3秒間のロング動画誘導 CTA スクリーンを表示する。
> ユーザー指示がない限りこのフォーマットで生成する。

```bash
node_modules/.bin/remotion render src/index.ts ShortsVideo output/{epId}_shorts.mp4 \
  --props input/script-input.json --timeout 60000
```

Still確認（3フレーム）:
```bash
# hook冒頭確認
node_modules/.bin/remotion still src/index.ts ShortsVideo output/{epId}_shorts_f100.png \
  --props input/script-input.json --frame 100
# analysis後半確認
node_modules/.bin/remotion still src/index.ts ShortsVideo output/{epId}_shorts_mid.png \
  --props input/script-input.json --frame 1500
# CTA画面確認（digestEndFrame直後 ≒ 総フレーム数 - 60）
node_modules/.bin/remotion still src/index.ts ShortsVideo output/{epId}_shorts_cta.png \
  --props input/script-input.json --frame 2300
```

## SV-Step 10: YouTube 公開（ユーザー確認必須）

メイン動画とShorts動画を順番にアップロードする。

```bash
# メイン動画
node_modules/.bin/ts-node -r tsconfig-paths/register --transpile-only \
  scripts/upload-youtube.ts output/{epId}.mp4 --input input/{epId}.yaml \
  --thumbnail "output/thumbnail.jpeg"

# Shorts動画（--shorts フラグで #Shorts ハッシュタグ付与）
node_modules/.bin/ts-node -r tsconfig-paths/register --transpile-only \
  scripts/upload-youtube.ts output/{epId}_shorts.mp4 --input input/{epId}.yaml \
  --thumbnail "output/thumbnail.jpeg" --shorts
```
