---
name: thumbnail-generation
description: YouTube サムネイル画像生成用プロンプトを設計するスキル。2026-05-30 よりガーコスタイル（文字70-80%主役型）が正式標準。キャラクター禁止・CTR 最大化・テキスト直接埋め込みを基本方針。「サムネイルを作って」「サムネプロンプト」「ep の thumbnail」と依頼されたときに発動する。
allowed-tools: Read, Write, Edit, Glob, Grep
---

# スキル: サムネイル生成プロンプト設計

詳細仕様:
- ガーコスタイル設計標準・テーマ別ビジュアル: `resources/garco-style-guide.md`
- プロンプトテンプレート・自動生成コマンド: `resources/prompt-templates.md`

---

## 最優先原則（不変）

1. **キャラクター絶対禁止** — まろくん・ぽんちゃんはサムネイルに入れない
2. **著名人・シルエット禁止（Google Flow ポリシー）** — 人物名をプロンプトに含めると生成失敗。シルエットも禁止
3. **超高密度プロンプト必須** — 7セクション構造化プロンプトで出力（`resources/prompt-templates.md` 参照）
4. **テキスト埋め込み** — 日本語テキストをプロンプトに直接記述してサムネイルに焼き込む
5. **日本語テキスト強制** — プロンプト冒頭に必ず「出力する画像内テキストは必ず日本語で出力して」を追加
6. **CTR最大化** — 「見た瞬間に止まる」「見ないと損」を設計する

---

## 標準フロー

1. `generate-thumbnail-brief.ts` でガーコスタイル案1・案2を自動生成（`resources/prompt-templates.md` 参照）
2. Google Flow または DALL-E 3 で画像生成
3. `output/thumbnail.jpeg` として保存
4. YouTube アップロード前チェックリスト（`verify-checklist.md`）でファイル存在確認
