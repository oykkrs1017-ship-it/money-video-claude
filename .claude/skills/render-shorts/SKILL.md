---
name: render-shorts
description: YouTube Shorts（縦型 1080x1920）動画のレンダリング。「Shortsをレンダリングして」「縦型動画を作って」「ep005のShortsを生成して」などで起動。ep022以降はキャラなし3ゾーンテンプレートを使用。
tools: Bash, Read
---

# render-shorts — Shorts レンダリングスキル

縦型（1080×1920）フォーマットで Shorts 動画を MP4 出力する。
**ep022以降**: キャラなし・黒背景・3ゾーンレイアウト（`shorts-no-char-layout` スキル参照）

## 実行フロー

### Step 1: Still確認（レンダリング前に必ず実行・ユーザー承認を得てから進む）

```bash
cd packages/tech-geopolitics-channel

node_modules/.bin/remotion still src/index.ts ShortsVideo output/{epId}_shorts_f100.png \
  --props input/script-input.json --frame 100

node_modules/.bin/remotion still src/index.ts ShortsVideo output/{epId}_shorts_f600.png \
  --props input/script-input.json --frame 600

node_modules/.bin/remotion still src/index.ts ShortsVideo output/{epId}_shorts_f1700.png \
  --props input/script-input.json --frame 1700
```

確認ポイント:
- 上部: 赤タイトル（白フチ）＋トピックバッジが収まっているか
- 中央: スライドPNGが正しく表示されているか
- 下部: 字幕エリアに余白があるか（YouTube UIとの重なり確認）

### Step 2: ユーザー承認

Still 3枚をユーザーに共有し **y/n 確認を取る**。承認なしにレンダリング開始しない。

### Step 3: レンダリング

```bash
node_modules/.bin/remotion render src/index.ts ShortsVideo output/{epId}_shorts.mp4 \
  --props input/script-input.json --timeout 60000
```

### Step 4: 完了確認

```bash
ffprobe -v error -show_entries format=duration,size \
  -of default=noprint_wrappers=1 output/{epId}_shorts.mp4
```

- duration: 60〜120秒が目安（hookチャプターの長さ）
- size: 10MB未満はWAV欠落の可能性

## セーフゾーン（Shorts 1080×1920）

| ゾーン | 座標 |
|--------|------|
| コンテンツ安全領域 | X: 50-1030px, Y: 205-1527px |
| 右下UIアイコン回避 | X上限 894px, Y上限 1206px |
| 字幕配置 | top: calc(59%+8px) = Y≈1140px |

## テンプレート詳細

レイアウト定義: `.claude/skills/shorts-no-char-layout/SKILL.md`

## エラー対応

| エラー | 対応 |
|--------|------|
| WAV 欠損（duration短い） | `voice-generate` スキルで再生成 |
| PNG not found | `npm run html:generate` を先に実行 |
| OOM / クラッシュ | `--concurrency 2` オプションを追加 |
