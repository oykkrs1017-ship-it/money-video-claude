/**
 * SYSTEM_PROMPT セクション 5: 出力スキーマ定義（chartData / infographics / YAML雛形）
 * 変更時は prompt.test.ts の 'YAMLのみ出力' テストを確認すること
 */

export const OUTPUT_SPEC = `

---

## chartData（chart使用時は必ず定義）
\`\`\`
chartData:
  chartId名:
    title: "タイトル"
    type: bar | line | pie
    data:
      - { label: "ラベル", value: 数値 }
\`\`\`

---

## infographics（image visual で src: "content/infographic_*.png" を使うとき必ず定義）
\`\`\`
infographics:
  - id: "energy_share"          # outputPath のファイル名キー（英数字とアンダースコアのみ）
    type: donut_chart            # donut_chart | bar_chart | stat_card | flow_diagram
    title: "タイトル（20文字以内）"
    outputPath: "content/infographic_energy_share.png"
    accentColor: "#ff6b35"       # 省略可（省略時は #4a9eff）
    data:                        # donut_chart / bar_chart 用
      - { label: "中東", value: 95, color: "#ff6b35" }
      - { label: "その他", value: 5, color: "#4a9eff" }
\`\`\`

タイプ別フィールド:
- \`donut_chart\` / \`bar_chart\` → \`data\` (label + value + color)
- \`stat_card\` → \`value\`（大きな数値テキスト）+ \`label\`（説明）+ \`subtext\`（補足）
- \`flow_diagram\` → \`steps\` (label + icon) 最大5ステップ

生成ルール: 1エピソード2〜4件が目安。chartData に書いたデータと重複させてよい（異なる見せ方）。

---

## 出力形式（厳守）
YAMLのみ出力。コードブロック（\`\`\`yaml）は付けない。

videoId: "ep000"
seed: "ep000"
title: "タイトル（30文字以内・疑問形や数字を含める）"
description: "説明文（150文字程度）"
tags: ["タグ1", ...（75個程度、SEO最適化）]
bgmVolume: 0.12
bgmMap:
  hook: "bgm/news.mp3"
  explanation: "bgm/main_lofi.mp3"
  analysis: "bgm/main_lofi.mp3"
  summary: "bgm/uplifting_piano.mp3"
  cta: "bgm/uplifting_piano.mp3"

## SE（効果音）付与ルール

各セリフに \`se\` フィールドを指定すると、そのセリフの冒頭でSEが再生される。
**1チャプターにつき最大1〜2個**が上限。過剰に付けない。

### 利用可能SE
- \`se/impact.mp3\` — 衝撃数値・重大事実の発言冒頭（hook の強調セリフ）
- \`se/whoosh.mp3\` — 場面転換感を出したいセリフ（チャプター最初のセリフ）
- \`se/bell.mp3\` — まとめ・結論の重要発言（summary の核心セリフ）
- \`se/ding.mp3\` — ぽんちゃんの「なるほど！」系の気づきリアクション

### 付与基準
- hook の衝撃数値セリフ（1本目） → \`se/impact.mp3\`
- explanation / analysis の冒頭セリフ（章の切り替わり直後） → \`se/whoosh.mp3\`
- summary の結論発言 → \`se/bell.mp3\`
- まろくんの「じゃあ日本はもう終わり…」絶望セリフの直後のぽんちゃんの逆転セリフ → \`se/bell.mp3\`

### YAML記述例
\`\`\`
- ponchan: "実は日本の電力の3割がここで決まるんだよ！"
  emotion: surprised
  se: "se/impact.mp3"
\`\`\`

---

## BGM ランダム選択ルール（重要）
毎エピソード同じBGMだと量産型チャンネル判定のリスクあり。bgmMap は次の候補から
チャプターごとにランダムに選ぶこと（各エピソードで少なくとも2種類以上のBGMを混ぜる）。

### 利用可能BGM
- \`bgm/news.mp3\` — 緊張感・速報感。hook に最適
- \`bgm/main_lofi.mp3\` — 落ち着き・集中。explanation/analysis に最適
- \`bgm/uplifting_piano.mp3\` — 高揚・結論。summary/cta に最適
- \`bgm/なんということはない日常.mp3\` — 軽やか・日常感。hook の会話調導入や cta の柔らかい締めに使える

### チャプター別の選択方針
- hook: \`news.mp3\` または \`なんということはない日常.mp3\`（衝撃系 or 日常系でフック種類をローテーション）
- explanation: \`main_lofi.mp3\` 固定（集中を妨げない）
- analysis: \`main_lofi.mp3\` または \`uplifting_piano.mp3\`（データ深掘りなら lofi、投資機会の提示なら piano）
- summary: \`uplifting_piano.mp3\` 固定（結論の高揚感）
- cta: \`uplifting_piano.mp3\` または \`なんということはない日常.mp3\`（登録促進は明るさ or 親しみやすさ）

seed 値に基づき決定論的に揺らぎを与えてよいが、**直前エピソードと完全に同じ組み合わせにしないこと**。
chartData:
  key1: { title: "...", type: bar, data: [{label: "...", value: 0}] }
infographics:
  - id: "example_donut"
    type: donut_chart
    title: "構成比タイトル"
    outputPath: "content/infographic_example_donut.png"
    accentColor: "#ff6b35"
    data:
      - { label: "項目A", value: 95, color: "#ff6b35" }
      - { label: "項目B", value: 5, color: "#4a9eff" }
  - id: "example_bar"
    type: bar_chart
    title: "比較タイトル"
    outputPath: "content/infographic_example_bar.png"
    data:
      - { label: "シナリオA", value: 71, color: "#4a9eff" }
      - { label: "シナリオB", value: 200, color: "#ff4444" }
chapters:
  - type: hook
    topic: "トピック（15文字以内）"
    lines:
      - ponchan: "セリフ（60文字以上）"
        emotion: serious
        se: "se/impact.mp3"    # hook 冒頭の衝撃セリフにのみ付与
      - maro: "セリフ（60文字以上）"
        emotion: surprised
        show:
          type: rich-panel
          title: "パネルタイトル"
          body: "全体の概要説明。2〜3文で背景・文脈を書く。"
          points:
            - text: "ポイント見出し1"
              value: "88%"
              unit: "原油輸入量の割合"
              body: "中東依存が突出して高く、代替ルート開拓は数十年単位の課題とされている。"
              source: "資源エネルギー庁 石油統計 2024年度"
            - text: "ポイント見出し2"
              value: "215日"
              unit: "IEA基準備蓄量"
              body: "封鎖が長期化した場合に備蓄消費開始から30日で市場影響が表面化するとされる。"
              source: "IEA Oil Market Report 2024"`;
