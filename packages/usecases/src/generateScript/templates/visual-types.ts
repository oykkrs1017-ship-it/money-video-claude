/**
 * SYSTEM_PROMPT セクション 4: ビジュアルタイプ仕様（YAMLスキーマ定義）
 * 新ビジュアルタイプ追加時はこのファイルと visual-selection.md / generate-html-slides.ts も更新すること
 */

export const VISUAL_TYPES = `

---

## ビジュアル（show フィールド）— 最重要ルール

**【大原則】文字だけのパネル（rich-panel）は最終手段。図解・ダイアグラム系ビジュアルを最優先で使うこと。**
explanation / analysis チャプターのすべての行において、下記の図解系ビジュアルから選択することを原則とする。
rich-panel は「どの図解型にも当てはまらない補足説明」にのみ使う（1チャプターに1個以下）。

### 【最優先】図解系ビジュアル — 必ず先にこれを検討する

**使い分け早見表**:
| 状況 | 推奨visual |
|------|-----------|
| AとBを比べる表がある | comparison-table |
| 「AかBどちらを選ぶか」という判断フロー | flow-chart |
| 使うべき/使ってはいけない仕分け | traffic-light |
| 繰り返しのサイクル・ループ構造 | cycle-loop |
| 損益・重さ・優劣のバランス表現 | scale-balance |
| 複数の要素が層状に積み重なる全体像 | isometric-stack |
| 数値推移・成長・歴史的変化 | chart（line/bar） |
| 時系列イベント | timeline |
| 階層・規模の上下関係（上流/下流・序列） | pyramid |
| 要素の重なり・包含・共通部分 | venn |
| 地理的な拠点・物流要衝・地政学リスクの位置 | map |

### 【図解系】comparison-table（A vs B 比較表）
\`\`\`
show:
  type: comparison-table
  title: "表のタイトル（省略可）"
  columns:
    - { label: "通常プラン", winner: false }
    - { label: "三木谷キャンペーン", winner: true }   # winner: true で黄色強調
  rows:
    - { label: "ポイント数", values: ["10,000pt", "14,000pt"] }
    - { label: "条件", values: ["新規のみ", "再契約OK"] }
  badge: "6ヶ月有効"        # 省略可。右下バッジ
  footer: "まとめの一文"    # 省略可
\`\`\`

### 【図解系】flow-chart（分岐フローチャート・決定木）
\`\`\`
show:
  type: flow-chart
  title: "What is your priority?"
  root:
    label: "中心ノード"
    sublabel: "サブテキスト（省略可）"
    icon: "👤"               # 省略可
    children:
      - label: "選択肢A"
        sublabel: "User Type A"
        highlight: true      # accentColor で強調
        detail:
          title: "詳細タイトル"
          items: ["ポイント1", "ポイント2"]
          color: "#cc4444"   # 省略可
      - label: "選択肢B"
        detail:
          items: ["ポイント1"]
  footer: "まとめの一文"
\`\`\`

### 【図解系】traffic-light（GO/STOP 信号機）
\`\`\`
show:
  type: traffic-light
  title: "楽天カードの使い分け"
  items:
    - signal: go           # go=緑 / stop=赤
      label: "楽天市場 3.0%〜"
      sublabel: "Still the ecosystem core"
      items: ["サブ項目1", "サブ項目2"]   # 省略可
    - signal: stop
      label: "公共料金 0.2%"
      items: ["電気・ガス・水道", "税金（住民税・自動車税）"]
  footer: "100円で1ポイント貯まる時代は終わった"
\`\`\`

### 【図解系】cycle-loop（循環ループ図）
\`\`\`
show:
  type: cycle-loop
  title: "The Loop."
  steps:
    - { label: "Buy Gift Card", sublabel: "マラソン・5と0の日", icon: "🛒" }
    - { label: "Earn SPU Points", sublabel: "月上限まで消費", icon: "⭐" }
    - { label: "Buy Apple Product", sublabel: "積立残高で購入", icon: "📱" }
  centerText: "The Loop."   # 省略可
  footer: "実質15〜20%還元でApple製品を購入可能"
\`\`\`

### 【図解系】scale-balance（天秤図）
\`\`\`
show:
  type: scale-balance
  title: "SPU +4倍の損益分岐点"
  left:
    label: "コスト"
    sublabel: "968円/月"
    direction: down          # up=上がる / down=下がる（重い側）
    box:
      title: "月額プラン内訳"
      items: ["楽天モバイル 3GB: 968円"]
  right:
    label: "ベネフィット"
    sublabel: "SPU +4倍"
    direction: up
    box:
      title: "Break-even Highlight"
      items: ["楽天市場で月2.5万円以上 → 実質無料"]
  footer: "さらに「5と0のつく日」や「マラソン」を併用すれば利益はさらに拡大"
\`\`\`

### 【図解系】isometric-stack（等角投影ブロック図）
\`\`\`
show:
  type: isometric-stack
  title: "2026年版：楽天経済圏の最強スタック完成図"
  layers:
    - { label: "Shopping", sublabel: "Core", color: "#c04040", icon: "🛒" }
    - { label: "Mobile", sublabel: "楽天モバイル最強プラン SPU+4x", color: "#e06020" }
    - { label: "Hardware", sublabel: "Android 1円端末 OR Apple Gift Card Loop", color: "#a0a0b0" }
  corners:
    - { position: tl, label: "Utilities/Tax", sublabel: "リクルートカード(1.2%)OR楽天ペイ請求書払い", color: "#8888cc" }
    - { position: tr, label: "Convenience Stores", sublabel: "三井住友カード(NL) 7%", color: "#44aa66" }
  topLabel: "Sub"   # 省略可
\`\`\`

### 【図解系】data-table（多列データ比較表 / ランキング表）
使いどき: 「比べる・ランキング・一覧」。4〜8列×3〜12行に対応。maxRowsPerSlide を超えると (1)(2) に自動分割。
\`\`\`
show:
  type: data-table
  title: "4本の半導体投信——比較①"
  subtitle: "基本情報とリターン"           # オプション: タイトル下のサブタイトル
  labelHeader: "ファンド"                 # 1列目ヘッダー名
  columns:
    - "タイプ"
    - "設定日"
    - label: "純資産額"
    - label: "信託報酬"
    - label: "1年リターン"
      highlight: true                    # 青ハイライトヘッダー
    - "3年リターン"
  rows:
    - label: "ニッセイSOX指数インデックスファンド"
      cells:
        - "SOX型"
        - "2023/3/31"
        - value: "約1,000億円超"
          color: "#dc2626"
          bold: true
        - value: "0.1815%"
          color: "#dc2626"
        - value: "175.76%"
          color: "#16a34a"
          bold: true
        - "59.94%"
    - label: "eMAXIS 日経半導体株"
      cells:
        - "日本半導体型"
        - "2024/1/26"
        - "約400億円台"
        - "0.297%"
        - value: "188.34%"
          color: "#16a34a"
          bold: true
        - "なし"
  maxRowsPerSlide: 6     # この行数を超えると自動で分割 (省略時: 6)
  note: "出典: 各社月次レポート (2026年4月時点)"   # 右下に小さく表示
\`\`\`
セルの色指定: color "#dc2626" = 赤（注意・高コスト）/ color "#16a34a" = 緑（好成績）/ 省略 = 通常色
ランキング表の場合: labelHeader を "順位" にして label を "1" "2" "3" と数字で指定。

### 【図解系】pyramid（ピラミッド / じょうろ図）
\`\`\`
show:
  type: pyramid
  title: "半導体サプライチェーンの階層構造"
  direction: up            # up=ピラミッド(上ほど小) / down=じょうろ(下ほど小)
  layers:
    - { label: "EUV露光装置", sublabel: "ASML 1社独占", value: "市場100%" }
    - { label: "製造装置", sublabel: "東京エレクトロン他", value: "日本シェア大" }
    - { label: "素材・ウェハ", sublabel: "信越化学・SUMCO", value: "供給基盤" }
  footer: "上流ほど代替不可能・参入障壁が高い"   # 省略可
\`\`\`

### 【図解系】venn（ベン図 — 重なり・包含）
\`\`\`
show:
  type: venn
  title: "円安メリットと地政学リスクの重なり"
  sets:                    # 2〜3セット対応
    - { label: "円安メリット", items: ["輸出企業", "インバウンド"], color: "#0a72ef" }
    - { label: "地政学リスク", items: ["資源高", "供給網寸断"], color: "#dc2626" }
  overlapLabel: "総合商社（両取り）"   # 重複領域のラベル（省略可）
  footer: "透明度で重なりを表現"          # 省略可
\`\`\`

### 【図解系】map（地図 / 拠点 — 物流要衝・地政学リスク）
\`\`\`
show:
  type: map
  title: "アジアの海上チョークポイント"
  region: asia             # asia | world | japan
  points:                  # x,y は地図枠内の 0〜100% 座標
    - { label: "マラッカ海峡", x: 58, y: 72, highlight: true, note: "原油の8割が通過" }
    - { label: "台湾海峡", x: 78, y: 48, highlight: true }
    - { label: "ホルムズ海峡", x: 20, y: 50, note: "中東原油の出口" }
  routes:                  # points配列の index で接続（省略可）
    - { from: 2, to: 0, label: "タンカー航路" }
  footer: "highlight: true で要衝を赤強調"   # 省略可
\`\`\`

### 【補助・最小限】rich-panel — 図解で表現できない場合の最終手段
1チャプターに1個以下。explanation / analysis チャプターで図解系が割り当てられた行には使わない。

\`\`\`
show:
  type: rich-panel
  number: 1              # 左の番号（1〜9、省略可）
  icon: "📊"
  title: "見出し（20文字以内）"
  body: "説明文。改行は\\n"
  emphasis: "強調文字列"
  color: "#0057B7"
  points:
    - text: "ポイント見出し（20文字以内）"
      value: "88%"              # KPI 数値（省略可）
      unit: "原油輸入量の割合"    # 数値の単位ラベル（省略可）
      body: "1〜2行の解説。数値の意味・インパクト・文脈を具体的に書く。（省略可）"
      source: "出典名 発行年"     # データの出典（省略可）
    - text: "ポイント2"
      value: "215日"
      unit: "IEA基準備蓄量"
      body: "封鎖が長期化した場合でも市場への影響が出るまでに猶予があることを示す重要指標。"
      source: "IEA Oil Market Report 2024"
\`\`\`

**points フィールドの使い方**:
- \`text\` のみ（文字列配列）: シンプルな箇条書き。後方互換あり。
- オブジェクト形式（推奨）: \`value\` + \`body\` + \`source\` を埋めることでスライドの情報密度が上がる。
  - \`value\` / \`unit\`: 右側に大きく表示されるKPI数値。印象的な統計がある場合は必ず入れる。
  - \`body\`: タイトルの下に小さく表示されるサポートテキスト。「なぜその数字が重要か」を1〜2文で説明する。
  - \`source\`: カードの下部に出典として表示。実在する資料・機関名＋年を記入する。

### 【補助】chart（各チャプター1〜2個）
\`\`\`
show: { type: chart, key: "chartId名" }
\`\`\`

### 【補助】timeline
\`\`\`
show:
  type: timeline
  title: "タイトル"
  events:
    - { year: "2020年", label: "出来事", highlight: false }
\`\`\`

### 【非推奨】keyword / stat / highlight（1チャプターにつき1個以下）

### 【推奨】image（各チャプターに1〜2枚）
地図・実写・Canvas図を組み合わせ、視覚的密度を上げる。

**地図 (Mapbox 衛星)**:
map_taiwan / map_usachina / map_japan / map_china / map_asia / map_world / map_europe / map_middleeast / map_southeastasia

**ストック写真 (Unsplash)**:
img_semiconductor / img_ai_chip / img_supply_chain / img_datacenter / img_stock_market / img_oil / img_currency / img_factory / img_defense / img_satellite

**Canvas インフォグラフィック**: \`content/infographic_{id}.png\` — トップレベル \`infographics\` フィールドで定義

\`\`\`
show:
  type: image
  src: "content/map_taiwan.png"     # map_* / img_* は fetch-images が取得。infographic_* は generate-infographics が生成
  caption: "台湾海峡（130km）"
  position: top-center              # top-left | top-center | top-right | center
  width: 1680
  duration: 8
  animation: fade                   # 静止表示は fade 必須
\`\`\`

使う場面の判断:
- 地名・地域が出る行 → \`map_*\`
- 工場・企業・産業の行 → \`img_*\`
- 数値・比較・フロー解説 → \`infographics\` に定義して \`content/infographic_{id}.png\` を参照
- 連続する2セクションで同じ image を繰り返さない（持続表示は自動）`;
