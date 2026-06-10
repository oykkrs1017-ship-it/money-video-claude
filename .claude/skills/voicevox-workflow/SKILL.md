---
name: voicevox-workflow
description: VOICEVOX の誤読防止（英字略語・ローマ字のアルファベット読み対策）と音声再生成コマンドの正しい使い分けを行うスキル。台本に略語・英字・数字混じりテキストが出てくるとき、または音声を再生成・一部スキップしたいときに発動する。
allowed-tools: Read, Edit, Bash
---

# スキル: VOICEVOXワークフロー
最終更新: 2026-04-06

## 誤読防止の2層対策

VOICEVOXは英字略語・ローマ字をアルファベット読みする（NISA→「エヌアイエスエー」）。
これを防ぐために**上流（台本生成）と下流（音声合成）の2層で対策する**。

```
[台本生成] script-system-prompt.md にカタカナ表記ルール表を記載
    ↓ AIがセリフを書く段階でカタカナで書かせる（根本対策）
[音声合成] generate-voice.ts で normalizeForVoicevox() を通す
    ↓ 既存台本・手動編集分のフォールバック（安全網）
[VOICEVOX API] audio_query に正規化済みテキストを送信
```

### 誤読が発生したら → textNormalizer.ts に追記する

ファイル: `src/utils/textNormalizer.ts` の `REPLACEMENT_RULES` 配列末尾に追記。

```typescript
{ pattern: /新語/gi, replacement: 'カタカナ読み', description: '説明' },
```

追記後は必ず `script-system-prompt.md` のルール表にも同じ語を追加すること（二重管理だが意図的）。

### 既知の誤読パターン（発見済み）

| 語 | 誤読 | 正読 | 発見日 |
|----|------|------|--------|
| NISA | エヌアイエスエー | ニーサ | 2026-04-06 |

### visuals.content はローマ字でよい

テロップ（`visuals[].content`）は音声合成に使わない。
画面表示用なので「NISA」「S&P500」等の正式表記のままにすること。
`normalizeForVoicevox()` は `line.text` にのみ適用する。

## generate.ts の再実行ルール（コスト・時間節約）

音声生成は56セリフで約8分かかる。すでに生成済みの場合は必ず `--skip-voices` を付ける。

```bash
# 音声が未生成 or 台本変更があった場合（フルパイプライン）
npx ts-node --transpile-only scripts/generate.ts input/ep_test.yaml

# 音声生成済み・レンダリングだけしたい場合（必須オプション）
npx ts-node --transpile-only scripts/generate.ts input/ep_test.yaml --render --no-studio --skip-voices

# Studio プレビューだけしたい場合
npx ts-node --transpile-only scripts/generate.ts input/ep_test.yaml --skip-voices --skip-images
```

| 状況 | 付けるオプション |
|------|----------------|
| 台本変更あり | オプションなし（全ステップ実行） |
| 音声生成済み・レンダリングのみ | `--render --no-studio --skip-voices` |
| Studio プレビュー確認のみ | `--skip-voices --skip-images` |
| 画像・音声両方生成済み | `--skip-voices --skip-images` |

## 音声生成コマンド（単体実行）

```bash
# VOICEVOX起動確認してから実行
npx ts-node --transpile-only scripts/generate-voice.ts --episode <episodeId>
```

## 音声確認チェックリスト

- [ ] 略語・英字が自然なカタカナ読みになっているか
- [ ] 固有名詞（商品名・会社名）が誤読されていないか
- [ ] 新しい誤読を発見した場合 → textNormalizer.ts と script-system-prompt.md に追記
