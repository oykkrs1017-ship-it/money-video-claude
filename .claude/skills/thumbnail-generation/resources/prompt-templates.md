# サムネイルプロンプトテンプレート

## Google Flow 必須要素（7セクション構造）

プロンプト冒頭に必ず追加（日本語テキスト強制）:
```
出力する画像内テキストは必ず日本語で出力して
```

```
=== BACKGROUND VISUAL ===
[背景・メインビジュアルの詳細記述]
[色パレット: HEXコード指定]
[照明・雰囲気・スタイル]

=== TEXT OVERLAYS (Japanese) ===
[配置場所 — テキスト内容]
...

=== TYPOGRAPHY SPECS ===
[No drop shadows — black outlines only]
[Legible at 320px thumbnail width]

=== COMPOSITION ===
[三分割法での配置指定]

=== EMOTIONAL TRIGGERS ===
[損回避 or 比較不安]

=== STYLE REFERENCE ===
[Japanese financial YouTube channel style]
[NO anime, NO characters, NO human faces]

=== AVOID ===
[除外要素リスト]
```

## ガーコスタイル（文字主役型）Google Flow テンプレート

```
出力する画像内テキストは必ず日本語で出力して

=== BACKGROUND ===
単色濃紺 #0A0F2E 背景。装飾なし。

=== TEXT LAYOUT (render ALL text exactly as written) ===
L1 上部: "{王道KW}の" — 白・60px・黒縁2px
L2 中上: "{銘柄/KW}" — 黄#FFE500・120px・黒縁4px
L3 中: "今すぐ" — 白・最大サイズ・黒縁4px
L4 中下: "{警告ワード}" — 白・140px・黒縁4px
下帯: "{衝撃文}" — 白文字・赤帯#CC0000・高さ80px

=== TYPOGRAPHY SPECS ===
No drop shadows — black outlines only
Legible at 320px thumbnail width

=== EMOTIONAL TRIGGERS ===
損回避バイアス（今すぐ行動しないと損する）

=== STYLE REFERENCE ===
Japanese financial YouTube channel, text-dominant style
NO anime, NO characters, NO human faces, NO people
```

## テキストオーバーレイ配置ゾーン（16:9）

| ゾーン | 用途 | スタイル |
|--------|------|----------|
| 上部1/3 | メインタイトル（大） | 白文字＋黒縁 |
| 下部左 | 数字バッジ | 黄色角丸バッジ |
| 下部右 | 緊急スタンプ | 赤バッジ |
| 中央帯 | 補足ラベル | 半透明黒帯＋白文字 |

## DALL-E 3 / Midjourney 併用版

```
Midjourney: [1行・英語・キーワード圧縮] --ar 16:9 --style raw --v 6.1
AVOID: cartoons, anime, soft colors, calm atmosphere, English text only, people
```

## 自動生成コマンド

```bash
cd packages/tech-geopolitics-channel
node_modules\.bin\ts-node --transpile-only scripts/generate-thumbnail-brief.ts input/ep{N}.json
# → output/ep{N}_thumbnail-brief.md の冒頭にガーコスタイル案1・案2が出力される
```
