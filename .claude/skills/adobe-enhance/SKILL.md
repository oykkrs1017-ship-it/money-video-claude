---
name: adobe-enhance
description: インフォグラフィック PNG を Adobe MCP で輝度・コントラスト・色温度補正する。generate-infographics.ts 実行後、動画上での視認性が低いと感じたときに使う。
tools: Bash, mcp__32020229-960e-4a00-b006-ff2216f4372a__*
---

# adobe-enhance — インフォグラフィック後処理スキル

## トリガー
`generate-infographics.ts` でインフォグラフィック PNG を生成した後、任意で実行する。
動画上での視認性が低いと感じたとき（暗い・コントラスト不足）に使う。

## 事前条件
- Adobe MCP (`mcp__32020229-960e-4a00-b006-ff2216f4372a__*`) がセッション中に有効
- `enhance-infographics.ts` が `scripts/` に存在する

## 実行手順

```
1. adobe_mandatory_init()

2. npx ts-node --transpile-only scripts/enhance-infographics.ts --list --input input/epXXX.json
   → [{ path: "/.../public/content/infographic_xxx.png", size: 12345 }, ...]

3. 各ファイルに対して連続実行（presigned URL は時限付きなので1ファイルずつ）:
   a. asset_initialize_file_upload(
        path: "content/infographic_xxx.png",
        file_size: <size>,
        media_type: "image/png"
      ) → { uploadUrl, filename, transferDoc }

   b. Bash: curl -s -X PUT "<uploadUrl>" \
        --upload-file "<localPath>" \
        -H "Content-Type: image/png"

   c. asset_finalize_file_upload(filename, transferDoc)
      → { presignedAssetUrl }

   d. image_adjust_brightness_and_contrast(
        imageURIs: [presignedAssetUrl],
        options: { brightness: 20, contrast: 15 }
      ) → { outputUrl: url1 }

   e. image_adjust_color_temperature(
        imageURIs: [url1],
        options: { a: 5, b: 30, luminance: 50 }
      ) → { outputUrl: url2 }

   f. npx ts-node --transpile-only scripts/enhance-infographics.ts \
        --download "<url2>" "<localPath>"
      （元ファイルを上書き）

4. Still 確認で処理結果を目視確認
```

## 調整値

| 調整 | 値 | 理由 |
|------|----|------|
| brightness | +20 | ダーク背景（#0d1b2a）のチャートを動画で見やすく |
| contrast | +15 | テキスト・データポイントをくっきりさせる |
| color temp a/b | 5/30 | 冷青パレットに微ウォームを加える |
| luminance | 50 | Lab 中輝度（既存の明度に追従） |

## 注意
- presigned URL は時限付き。ステップ a〜f を1ファイルずつ完結させる
- 処理後は必ず `npx remotion still` で still 確認してから render に進む
