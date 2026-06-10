# HTMLスライドワークフロー (SlidesVideo)

## 概要
`ep{N}-slides.json` でスライドを先行設計し、`SlidesVideo` コンポジションで動画を生成するパイプライン。ep019〜 の標準フォーマット。

詳細仕様:
- JSONフォーマット・role定義: `resources/slides-json-format.md`
- カスタムビジュアル6種: `resources/visual-types.md`
- トラブルシューティング: `resources/troubleshooting.md`

---

## 完全パイプライン（順序厳守）

```bash
cd packages/tech-geopolitics-channel

# 1. スライド構造設計
#    → input/ep{N}-slides.json を作成・編集

# 2. ビジュアルプレビュー（承認前に必ず実施）
npx ts-node --transpile-only scripts/preview-slides.ts --ep ep{N}

# 3. 台本生成
npx ts-node --transpile-only scripts/generate-script.ts \
  --from-slides input/ep{N}-slides.json \
  --html-slides --topic "トピック文字列" --ep ep{N}

# 4. YAML→JSON変換
npx ts-node --transpile-only scripts/yaml-to-json.ts input/ep{N}.yaml
cp input/ep{N}.json input/script-input.json

# 5. 音声生成（VOICEVOX）
npx ts-node --transpile-only scripts/generate-voices.ts --input input/ep{N}.json
cp input/ep{N}.json input/script-input.json  # frameCount付き上書き必須

# ★ 6. ビジュアルパッチ（最重要・省略禁止）
# generate-script.ts は chart/stat/rich-panel しか生成しない → カスタムビジュアルを復元
node scripts/patch-visuals.js --ep ep{N}

# 7. HTMLスライド生成
npm run html:generate -- --input ./input/script-input.json

# 8. Still確認 3フレーム（verify-checklist.md 参照）
npx remotion still src/index.ts SlidesVideo output/ep{N}_check_f30.png \
  --props input/script-input.json --frame 30

# 9. レンダリング（ユーザー承認後）
npx remotion render src/index.ts SlidesVideo output/ep{N}.mp4 \
  --props input/script-input.json
```

---

## leadText 伝播パターン（2026-06-06 確定）

slides.json の `leadText` は **`visual` オブジェクトの外（兄弟フィールド）** に定義される。
新ビジュアルタイプ追加時は以下3箇所を必ず更新する。

```
slides.json: { "visual": {...}, "leadText": "..." }
                                ↑ visual 外のフィールド

patch-visuals.js:
  line.visual = slide.leadText
    ? { ...slide.visual, leadText: slide.leadText }  // マージ必須
    : slide.visual;

generate-html-slides.ts — visualToSlide():
  const lt = (visual as {leadText?: string}).leadText ?? '';
  // → data: { ..., leadText: lt }

generate-html-slides.ts — レンダラー関数:
  const leadText = String(def.data.leadText ?? '');
  return ytSlideBase(title, body, footer, leadText || undefined);
```

**新ビジュアルタイプ追加チェックリスト:**
- [ ] `visualToSlide()` の case に `leadText` を追加
- [ ] レンダラー関数で `leadText` を読んで `ytSlideBase` に渡す
- [ ] `preview-slides.ts` の `slideToVisual()` でも `slide.leadText` をマージ

## feature-matrix 座標設計指針

ラベルが重なる原因の多くは「上端付近のアイテム」。y < 15% 相当の位置には置かない。
`labelAbove = cy > PAD + r + 60`（cy ≈ 120px 以上なら上方向）が現在の判定ロジック。
密集するアイテムは x/y を 15px 以上、highlight アイテムは 20px 以上離す。

## サブエージェント化

`/generate-ep` から呼び出す場合は `generate-ep/SKILL.md` を参照。
