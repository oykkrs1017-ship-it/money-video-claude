# CLAUDE.md - tech-geopolitics-channel パッケージ固有ルール

> 共通ルール・12行動規範・コマンド一覧はリポジトリルートの CLAUDE.md を参照。

## スライド先行ワークフロー（ep019〜）

ビジュアルを先に設計し、スライドに合わせた台本を生成する新フロー。

```bash
# Step 1: スライド構造 JSON を生成（Claude Design 向け）
npx ts-node --transpile-only scripts/generate-slide-structure.ts \
  --topic "トピック名" --ep ep019 [--with-exa]
# → input/ep019-slides.json を出力

# Step 2: input/ep019-slides.json を Claude Design に渡してスライド作成（ユーザー担当）
# → 各スライドを JPEG で export し public/images/ep019/slide-01.jpg〜 に配置

# Step 3: スライドに合わせた台本を生成
npx ts-node --transpile-only scripts/generate-script.ts \
  --topic "トピック名" --ep ep019 \
  --from-slides input/ep019-slides.json
# → input/ep019.yaml を出力（各 line の visual = image タイプ / animation: fade）

# Step 4 以降は従来通り（yaml-to-json → 音声生成 → Still確認 → レンダリング）
```

**スライド画像の配置ルール**:
- 保存先: `public/images/{epId}/slide-01.jpg`, `slide-02.jpg`, ...（ゼロ埋め 2 桁）
- フォーマット: JPEG 推奨（PNG も可）
- Remotion での参照: `src: "images/{epId}/slide-XX.jpg"` + `animation: fade`

## Remotion コーディングルール
- アニメーションは必ず `frame / fps` ベースで計算（`elapsedTime` 禁止）
- `spring()` と `interpolate()` を積極活用
- フレーム数は `Math.floor()` で必ず整数化し、+5フレームのバッファを追加
- 音声 duration は WAVヘッダーから直接読み取る（Python 不要）
- BAN回避・VOICEVOX設定: `.claude/rules/ban-avoidance.md` / `.claude/rules/voicevox.md` 参照
