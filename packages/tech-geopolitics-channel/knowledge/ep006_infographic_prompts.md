# ep006 インフォグラフィック生成プロンプト集
## テーマ：ホルムズ危機と日本のエネルギー安保

**スタイル統一仕様**
- 解像度：1920×1080
- 背景：ダークネイビー（#0A0F1E）
- アクセント：シアン（#00D4FF）・アンバー（#FFB800）
- 雰囲気：技術的・未来的・データビジュアル系
- テキストなし（NO text, NO watermark）

---

## 1. ホルムズ海峡マップ

### DALL-E 3 / Midjourney プロンプト（英語）

```
Photorealistic satellite-style map of the Persian Gulf and Indian Ocean region, focusing on the Strait of Hormuz chokepoint. Dark navy (#0A0F1E) ocean background with glowing cyan (#00D4FF) coastlines and borders. Amber (#FFB800) dotted tanker shipping routes flowing from the Persian Gulf through the strait into the Arabian Sea. The strait highlighted with a pulsing cyan circle. Countries shown as dark silhouettes with subtle topographic shading — Iran, UAE, Oman, Saudi Arabia, Qatar. Small tanker icons along the route in amber. No text labels, no watermarks. Cinematic lighting, ultra-detailed, 8K resolution, 16:9 ratio.
```

**Midjourney 追加パラメータ：**
```
--ar 16:9 --style raw --v 6 --q 2
```

### Stable Diffusion プロンプト（英語）

```
(satellite map:1.4), Persian Gulf region, Strait of Hormuz, dark navy blue ocean (#0A0F1E), (glowing cyan coastlines:1.3), amber tanker shipping routes, chokepoint highlighted, Iran UAE Oman Saudi Arabia silhouettes, (cinematic lighting:1.2), no text, no labels, ultra detailed, 8k, photorealistic, data visualization style, geopolitical map, dark theme
```

**Negative prompt：**
```
text, labels, watermark, letters, numbers, bright colors, white background, cartoon, anime, low quality, blurry
```

**推奨モデル：** Realistic Vision v5 / SDXL Base 1.0  
**CFG Scale：** 7-8 / Steps：30-40

### Canva / Figma 向けデザイン仕様（日本語）

| 項目 | 仕様 |
|------|------|
| ベースマップ | Mapbox Dark-v11 スタイル（衛星＋地形） |
| 海峡ハイライト | シアン円形グロー、外径120px、blur 40px |
| タンカールート | アンバー（#FFB800）破線 stroke 3px、矢印付き |
| 国境線 | シアン（#00D4FF）opacity 40%、stroke 1.5px |
| 背景 | #0A0F1E ベタ塗り |
| フレーム | 内側グラデーション黒ビネット（opacity 60%） |
| 輸出テキスト | なし（Remotion側でオーバーレイ） |

---

## 2. 日本エネルギー依存度チャート

### DALL-E 3 / Midjourney プロンプト（英語）

```
Sleek infographic-style donut chart showing Japan's crude oil import dependency. Dark navy (#0A0F1E) background. A large elegant donut/pie chart with glowing segments — 95% Middle East dependency shown in graduated amber-to-red (#FFB800 to #FF4444) occupying nearly the full ring, 5% other regions in muted dark gray. Center of the donut has a subtle Japan archipelago silhouette in dark teal. Surrounding the chart are small country flag-colored wedges: Saudi Arabia (dark gold), UAE (deep green), Kuwait (red-brown), Iraq (dark red), Qatar (crimson). Thin cyan grid lines in background. Futuristic HUD aesthetic. No text or numbers visible. 16:9 cinematic composition, 8K.
```

**Midjourney 追加パラメータ：**
```
--ar 16:9 --style raw --v 6
```

### Stable Diffusion プロンプト（英語）

```
(infographic donut chart:1.5), Japan energy import dependency, dark navy background, (glowing amber segments:1.3), 95 percent middle east, pie chart visualization, (futuristic HUD aesthetic:1.2), cyan accent lines, Japan silhouette center, data visualization, no text, no numbers, cinematic lighting, ultra detailed, 8k
```

**Negative prompt：**
```
text, numbers, labels, percentages, watermark, white background, cartoon, bright background, low quality
```

**推奨モデル：** SDXL Base 1.0 + Refiner  
**CFG Scale：** 7 / Steps：35

### Canva / Figma 向けデザイン仕様（日本語）

| 項目 | 仕様 |
|------|------|
| チャートタイプ | ドーナツチャート、外径520px、内径280px |
| 中東依存セグメント | #FFB800→#FF6B35 グラデーション、95% |
| その他セグメント | #1A2744（ダークネイビー）、5% |
| 内円デザイン | 日本地図シルエット（#00D4FF opacity 30%） |
| 背景 | #0A0F1E |
| 装飾 | シアングリッドライン opacity 10%、stroke 1px |
| サブ円グラフ | 国別内訳 5セグメント（240px）、右寄せ配置 |
| 国別色 | サウジ：#C8A84B / UAE：#2E6B3E / クウェート：#A0391E / イラク：#8B2020 / カタール：#6B0D1E |

---

## 3. 原油価格タイムライン（2020〜2026年）

### DALL-E 3 / Midjourney プロンプト（英語）

```
Sleek financial data chart showing crude oil price timeline from 2020 to 2026. Dark navy (#0A0F1E) background with subtle hex grid texture. A dramatic glowing line chart — starting low in 2020, sharp V-recovery, then gradually rising to a plateau around 2024-2026. The line glows cyan (#00D4FF) with a soft luminous trail below filled with a gradient fade to transparent navy. Key crisis points marked with amber (#FFB800) circular pulse nodes. Background shows faint candlestick patterns in dark gray. Horizontal grid lines in dim cyan. Futuristic trading terminal aesthetic. No text, no axis numbers. 16:9 ratio, 8K ultra detailed.
```

**Midjourney 追加パラメータ：**
```
--ar 16:9 --style raw --v 6 --q 2
```

### Stable Diffusion プロンプト（英語）

```
(financial line chart:1.5), crude oil price 2020 to 2026, dark navy background, (glowing cyan line:1.4), amber highlight nodes, gradient fill below line, (futuristic trading terminal:1.2), hex grid texture, candlestick background, data visualization, no text, no numbers, cinematic, ultra detailed, 8k
```

**Negative prompt：**
```
text, numbers, axis labels, watermark, white background, cartoon, stock photo, low quality, blurry
```

**推奨モデル：** SDXL Base 1.0  
**CFG Scale：** 7.5 / Steps：40

### Canva / Figma 向けデザイン仕様（日本語）

| 項目 | 仕様 |
|------|------|
| チャートタイプ | エリアラインチャート |
| ライン色 | #00D4FF、stroke 3px、グロー効果 blur 8px |
| エリア塗り | #00D4FF→transparent グラデーション、opacity 25% |
| 主要ノード | #FFB800 円形 直径16px、グロー blur 12px |
| 背景グリッド | シアン水平線 opacity 8%、stroke 1px |
| 背景テクスチャ | ヘックスグリッド opacity 4% |
| X軸幅 | 2020 / 2021 / 2022 / 2023 / 2024 / 2025 / 2026（7分割） |
| 危機ポイント数 | 4ノード（2020年急落・2022年ウクライナ・2024年中東緊張・2026年ホルムズ） |
| テキスト | なし（Remotion側でオーバーレイ） |

---

## 4. 封鎖シナリオ影響フロー図

### DALL-E 3 / Midjourney プロンプト（英語）

```
Futuristic cause-and-effect flowchart diagram showing geopolitical crisis chain reaction. Dark navy (#0A0F1E) background. Top node: Strait of Hormuz blockade icon (a blocked tanker silhouette in amber). Flowing downward with glowing arrow connectors in cyan (#00D4FF): LNG/crude oil supply halt → energy shortage → electricity price surge → Japanese economy impact. Each node is a rounded rectangle with subtle gradient — amber borders for crisis nodes, cyan borders for economic impact nodes. Connecting arrows pulse with animated glow. Background has faint circuit-board trace patterns. Minimal geometric icons inside each node (no text). 16:9 layout, ultra detailed, 8K, cinematic.
```

**Midjourney 追加パラメータ：**
```
--ar 16:9 --style raw --v 6
```

### Stable Diffusion プロンプト（英語）

```
(flowchart diagram:1.5), cause and effect chain, dark navy background, (glowing cyan arrows:1.4), amber crisis nodes, rounded rectangle boxes, tanker blockade icon, energy crisis chain, geopolitical impact visualization, (circuit board background texture:1.2), no text, no labels, futuristic HUD, ultra detailed, 8k
```

**Negative prompt：**
```
text, labels, watermark, white background, cartoon, bright colors, low quality, blurry, complex background
```

**推奨モデル：** SDXL Base 1.0  
**CFG Scale：** 7 / Steps：35

### Canva / Figma 向けデザイン仕様（日本語）

| 項目 | 仕様 |
|------|------|
| レイアウト | 縦型フロー（上→下）、中央揃え |
| ノード形状 | 角丸矩形 radius 16px、幅320px 高さ80px |
| 危機ノード色 | border #FFB800、背景 #1A1000、グロー amber |
| 影響ノード色 | border #00D4FF、背景 #001A1E、グロー cyan |
| コネクター | #00D4FF 矢印、stroke 2px、グロー blur 6px |
| ノード間隔 | 垂直80px |
| アイコン | Material Icons / Lucide（塗り #00D4FF / #FFB800） |
| ノード数 | 5段（封鎖→供給停止→電力不足→電気代高騰→経済打撃） |
| 背景テクスチャ | 回路基板パターン opacity 5% |

---

## 5. 投資銘柄マップ（恩恵セクター）

### DALL-E 3 / Midjourney プロンプト（英語）

```
Futuristic investment sector relationship network map. Dark navy (#0A0F1E) background with subtle star-field texture. Central node: a glowing amber oil barrel icon representing the Hormuz crisis. Connected outward via cyan glowing lines to four sector clusters: upstream energy (drill platform icon), trading companies (globe-briefcase icon), renewable energy (wind turbine icon), defense industry (shield icon). Each cluster has 2-3 smaller satellite nodes representing individual companies as hexagonal badges. Node borders glow cyan for beneficiary sectors, amber for direct energy plays. Connection lines vary in thickness by correlation strength. No text, no company names. 16:9 ultra detailed 8K cinematic composition.
```

**Midjourney 追加パラメータ：**
```
--ar 16:9 --style raw --v 6 --q 2
```

### Stable Diffusion プロンプト（英語）

```
(network relationship map:1.5), investment sector diagram, dark navy background, (glowing cyan connection lines:1.4), amber central node, hexagonal badges, oil barrel icon, renewable energy wind turbine icon, defense shield icon, trading globe icon, (star field background:1.1), no text, no labels, futuristic data visualization, 8k, ultra detailed
```

**Negative prompt：**
```
text, labels, company names, watermark, white background, cartoon, low quality, blurry
```

**推奨モデル：** SDXL Base 1.0  
**CFG Scale：** 7 / Steps：35

### Canva / Figma 向けデザイン仕様（日本語）

| 項目 | 仕様 |
|------|------|
| レイアウト | ラジアル（中心→4方向） |
| 中央ノード | 六角形 直径120px、#FFB800 グロー、石油タンク アイコン |
| セクタークラスタ | 4方向（上：エネルギー / 右：商社 / 下：再エネ / 左：防衛） |
| セクターノード | 円形 直径80px、#00D4FF border 2px |
| 銘柄ノード | 六角形 直径56px、border 1px、opacity 80% |
| 接続線 | 太さ：強相関3px / 中2px / 弱1px |
| 接続線色 | #00D4FF グロー blur 4px |
| 背景 | #0A0F1E + 星フィールド opacity 15% |
| テキスト | なし（Remotionで銘柄名オーバーレイ） |

---

## 6. サムネイル画像

### DALL-E 3 / Midjourney プロンプト（英語）

```
Dramatic YouTube thumbnail composition. Dark navy background (#0A0F1E). Left side: photorealistic burning oil tanker on the Strait of Hormuz with amber flames and black smoke, reflected in dark choppy water. Right side: stylized dark silhouette map of Japan archipelago glowing with cyan interior light. Center: large dramatic crack/split visual effect in the strait dividing the two halves. Top: missile trails or military aircraft silhouettes in amber. Bottom foreground: power lines going dark suggesting blackout. Color palette strictly dark navy, glowing cyan (#00D4FF), amber (#FFB800), dramatic red-orange flames. Cinematic movie poster composition, ultra dramatic lighting, 8K, 16:9.
```

**Midjourney 追加パラメータ：**
```
--ar 16:9 --style raw --v 6 --q 2 --stylize 750
```

### Stable Diffusion プロンプト（英語）

```
(YouTube thumbnail:1.3), (burning oil tanker:1.5), Strait of Hormuz, dark navy ocean, (Japan map silhouette glowing cyan:1.4), (dramatic flames amber orange:1.5), military aircraft silhouettes, power lines blackout, (cinematic movie poster composition:1.3), dark dramatic lighting, ultra detailed, 8k, photorealistic, no text, no watermark
```

**Negative prompt：**
```
text, watermark, letters, cartoon, anime, flat colors, bright sky, daytime, low quality, blurry, overexposed
```

**推奨モデル：** Realistic Vision v5.1 / DreamShaper XL  
**CFG Scale：** 8-9 / Steps：40-50

### Canva / Figma 向けデザイン仕様（日本語）

| 項目 | 仕様 |
|------|------|
| キャンバスサイズ | 1920×1080px（YouTube サムネイル標準） |
| 背景 | 炎上タンカー写真（Unsplash / 生成AI） + overlay #0A0F1E opacity 50% |
| 左側要素 | 燃えるタンカー画像、左1/3エリア配置 |
| 右側要素 | 日本地図シルエット SVG、#00D4FF グロー（blur 24px） |
| 中央亀裂 | グラフィック素材、#FFB800 エッジライン |
| テキスト1 | 「電気が消える？」フォント：Noto Sans JP Black 120px、#FFFFFF、テキストシャドウ #FFB800 |
| テキスト2 | サブタイトル 60px、#00D4FF |
| ビネット | 四隅グラデーション黒 opacity 70% |
| 全体フィルター | Contrast +20、Saturation -10、暗部強調 |

---

## 使用ガイド

### ツール別推奨用途

| ツール | 推奨インフォグラフィック | 理由 |
|--------|--------------------------|------|
| DALL-E 3 | #1（マップ）、#6（サムネイル） | 構図制御が得意 |
| Midjourney v6 | #4（フロー）、#5（ネットワーク） | 複雑な構造物に強い |
| Stable Diffusion SDXL | #2（円グラフ）、#3（ラインチャート） | 反復修正が容易 |
| Canva | #2、#3 | データ正確性が必要な場合 |
| Figma | #4、#5 | コンポーネント再利用性重視 |

### Remotion 統合メモ

- 全画像は `public/images/ep006/` に格納
- ファイル名規則：`ep006_map.png` / `ep006_chart_dependency.png` / `ep006_price_timeline.png` / `ep006_flow_blockade.png` / `ep006_investment_map.png` / `ep006_thumbnail.png`
- `ImageOverlay` コンポーネントで表示（`src/components/ImageOverlay.tsx`）
- テキストオーバーレイはすべて Remotion 側で処理（画像にテキスト埋め込みしない）
