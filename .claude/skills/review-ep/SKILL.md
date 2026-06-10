---
name: review-ep
description: エピソードの総合品質レビュー。YAML台本チェック（PRE-render）とstill画像確認（POST-render）を1コマンドで実行する。「ep016をレビューして」「ep015のQAして」などで起動。引数: エピソードID（例: ep016）
allowed-tools: Read, Bash, Grep, Glob, Edit
---

# review-ep スキル

引数 `$ARGUMENTS` からエピソードIDを取得して総合レビューを実施する。

## ステップ1: YAML台本 PRE-renderチェック

### 1-1. YAMLファイルの読み込み
```bash
cat packages/tech-geopolitics-channel/input/$ARGUMENTS.yaml
```

### 1-2. 品質チェック（全項目必須）

以下を `grep` + テキスト解析で実行する:

| 項目 | 基準 | 判定 |
|------|------|------|
| セリフ総数 | 90〜110件 | `grep -c "ponchan:\|maro:"` |
| 1セリフ長 | 全て60文字以上 | 各 `text:` フィールドの文字数 |
| rich-panel割合 | show の 60%以上が rich-panel | show type カウント |
| チャプター構成 | hook/explanation/analysis/summary/cta の5章 | `type:` フィールド確認 |
| チャートデータ | 3〜5個 | `chartData` キー数 |
| タグ数 | 20〜30個 | `tags:` 配列長 |
| タイトル | 数字含む・30文字以内 | 正規表現 |
| **Why型タイトル** | `なぜ〜のか【〜×〜】` 形式 | 正規表現（必須） |
| **H-05逆説層** | hookチャプター冒頭15秒（0〜15s）に逆説フレーズ | ponchan の最初2ライン確認 |
| **自分ごと化** | 「あなたの〜」「自分の〜」「投資家として」等のフレーズ | grep で存在確認 |
| CTAは最終章のみ | hook/explanation/analysis/summary に CTA なし | type=cta の位置確認 |

### 1-3. YAML構文検証
```bash
npx ts-node -e "const y=require('js-yaml'); y.load(require('fs').readFileSync('packages/tech-geopolitics-channel/input/$ARGUMENTS.yaml','utf8')); console.log('OK')"
```

## ステップ2: POST-render stillチェック（output が存在する場合）

propsファイルが存在するか確認:
```bash
ls packages/tech-geopolitics-channel/output/$ARGUMENTS_props.json 2>/dev/null || echo "SKIP: propsファイルなし（未レンダリング）"
```

存在する場合、以下のフレームでstillを生成して確認:
- `f=30`: Hook タイトル画面
- `f=180`: Hook 逆説層（CounterIntuitionLayer）
- `f=450`: Explanation 開始
- `f=最終チャプター中盤`: CTA 画面

```bash
npx remotion still src/index.ts MainVideo --frame=30 --props="output/$ARGUMENTS_props.json" --output="output/review_$ARGUMENTS_f30.png" --log=quiet
```

## ステップ3: 結果サマリー

以下のフォーマットで日本語報告する:

```
## review-ep: $ARGUMENTS — 結果サマリー

### PRE-render YAML チェック
✅/❌ セリフ数: XX件（基準: 90〜110）
✅/❌ セリフ長: 最短XX文字（基準: 60文字以上）
✅/❌ rich-panel割合: XX%（基準: 60%以上）
✅/❌ チャプター構成: hook/explanation/analysis/summary/cta
✅/❌ チャートデータ: X個（基準: 3〜5）
✅/❌ タグ数: X個（基準: 20〜30）
✅/❌ タイトル: 「...」（XX文字、数字含む: Y/N）
✅/❌ Why型タイトル: Y/N
✅/❌ H-05逆説層: Y/N
✅/❌ 自分ごと化フレーズ: Y/N
✅/❌ CTA位置: Y/N

### POST-render still チェック
（実行済みの場合）
- f30: [所見]
- f180: [所見]

### 総合判定
🟢 PASS / 🔴 FAIL（要修正: X件）

### 要修正項目（FAILの場合）
1. [具体的な修正指示]
```

FAILの場合は `Edit` ツールで即時修正を提案する。
