# ビジュアルタイプ選択原則

> SoT: `knowledge/directive.yaml` → `tech_geopolitics.script_rules.visual`。数値変更は directive.yaml を編集。

台詞内容を必ず読んでからビジュアルを選ぶ。データ種別だけで機械的に選ばない。

| ゾーン | 台詞キーワード | 最適タイプ |
|--------|--------------|-----------|
| フック（0-5秒）| 衝撃数値・冒頭 | `stat`（大数字1つ） |
| 展開1 | ─ | `infographic` |
| 展開2 | 「AとBを比べる」「差」 | `graph`（comparison） |
| クライマックス | 「成長」「推移」「〇年後」「手順」 | `graph`（line）/ `timeline` / `step-flow` |
| まとめ | 「グラフ」「図」「見て」→教訓 | `graph` 系 / `rich-panel` |
| CTA | ─ | `telop` |

## カスタムビジュアルタイプ（SlidesVideo 専用・ep020〜確立）

> JSONスキーマの詳細は `.claude/skills/html-slides-workflow/SKILL.md` を参照。
> `generate-slide-structure.ts` のプロンプトに全スキーマが組み込まれているため、
> `--topic` を指定して実行するだけで自動的に最適なビジュアルが選択される。

| 台詞キーワード | 最適タイプ | 用途 |
|--------------|-----------|------|
| 「AとB」「比べる」「どっちが」「対立」「旧モデルvs新モデル」 | `vs-battle` | 2択対比（左赤/右緑の対立構図） |
| 「3つ」「ポイント」「今日わかること3選」「理由」「シナリオ」 | `color-cards` | 3項目カード（hook目次・撤退シナリオ等） |
| 「ステップ」「手順」「アクションプラン」「流れ」「〜したら〜」 | `step-icons` | 番号付きフロー（積立判断・アクション） |
| 「一覧」「比較」「それぞれ」「〇社を比べると」「整理すると」 | `data-table` | 多列比較表（シナリオ分析・銘柄比較） |
| 「差が開いた」「急騰」「CAGR」「成長率」「市場規模が〇倍」 | `bar-diff` | 差分強調棒グラフ（成長期待可視化） |
| 「シェア」「占有率」「割合」「構成比」「どれくらいの比率」 | `donut-center` | ドーナツ中央強調（シェア一目表示） |
| 「比べる」「一覧」「ランキング」「何社」「違いを見て」 | `data-table` | 多列対応・maxRowsPerSlide で自動分割 |
| 「上流/下流」「序列」「階層」「規模の大小」 | `pyramid` | ピラミッド型階層図 |
| 「重なる」「共通点」「両方に当てはまる」「含まれる」 | `venn` | 2〜3セット・透明度で重複表現 |
| 「海峡」「拠点」「要衝」「どこにある」「物流網」 | `map` | region: asia/world/japan・要衝はhighlight |
| 「ポジション」「競合比較」「象限」「どこに位置する」「マトリクスで見ると」 | `feature-matrix` | 2×2散布図・推奨バブルをグロー強調 |
| 「機能比較」「証券会社比較」「選ぶなら」「どちらが優れている」 | `highlight-checklist` | 推奨列を👑+色で強調するチェックリスト表 |
| 「ランキング」「第1位」「最もおすすめ」「トップ3」「どれが一番」 | `ranked-cards` | 横並びカード・推奨をglow枠+バッジ強調 |
| 「内訳推移」「構成が変わった」「セクター比率」「ポートフォリオ推移」 | `stacked-share` | 積み上げ棒グラフ・強調セグメントにコールアウト |

### ゾーン別配置ルール（SlidesVideo）

| role | 推奨visual | chartType |
|------|-----------|-----------|
| hook 1枚目 | なし | bar（衝撃数字） |
| hook 2枚目 | vs-battle / feature-matrix | none |
| hook 3枚目（目次） | **color-cards（3選）必須** | none |
| explanation | vs-battle / bar-diff / donut-center / stacked-share | bar/pie/none |
| analysis | data-table / highlight-checklist / ranked-cards / feature-matrix / step-icons | bar/pie/none |
| summary 1枚目 | なし（leadText付きchart） | bar |
| summary 2枚目 | **step-icons / ranked-cards（アクションプラン）必須** | none |
| cta | なし | none |

> これらは `generate-html-slides.ts` がレンダリングし SlidesVideo に反映される。MainVideo（VisualLayer）は未対応。

## 禁止
- `chartType:none` のスライドで `visual` も設定しない（空スライドになる）
- 連続する2スライドで同じビジュアルタイプを使わない
- フックに `telop` や `rich-panel` を使わない（インパクト不足）
