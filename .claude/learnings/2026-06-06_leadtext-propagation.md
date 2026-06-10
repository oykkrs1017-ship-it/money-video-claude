# 学び: leadText 3層伝播パターン — patch-visuals.js でのマージ漏れ
日付: 2026-06-06
カテゴリ: スキルルール
関連スキル: html-slides-workflow

## 状況
feature-matrix スライドに leadText を設定したが、HTML生成後も表示されなかった。

## 齟齬の内容
- AI の判断: `patch-visuals.js` で `line.visual = slide.visual` とすれば十分
- ユーザーの意図: `slide.leadText`（visual 外のフィールド）も visual に含めて渡す
- 差分の本質: slides.json のスキーマ構造を把握していなかった
  ```json
  // slides.json の構造
  { "visual": { "type": "feature-matrix", ... }, "leadText": "説明文" }
  //                                               ↑ visual の外にある
  ```

## 学び

**leadText の3層伝播パターン（確定 2026-06-06）**

1. **slides.json**: `slide.leadText` は `slide.visual` の外（兄弟フィールド）として定義
2. **patch-visuals.js**: `line.visual = slide.leadText ? { ...slide.visual, leadText: slide.leadText } : slide.visual`
3. **visualToSlide()**: `(visual as {leadText?: string}).leadText ?? ''` でデータに読み込む
4. **各レンダラー**: `const leadText = String(def.data.leadText ?? '')` で使用

**新ビジュアルタイプ追加時の必須チェックリスト:**
- [ ] `visualToSlide()` の該当 case に `leadText` を追加
- [ ] レンダラー関数で `const leadText = String(def.data.leadText ?? '')` を追加
- [ ] `ytSlideBase(title, body, footer, leadText || undefined)` に渡す

## 適用先
- [ ] `.claude/skills/html-slides-workflow/SKILL.md` — 新ビジュアル追加手順に追記
- [ ] `tasks/lessons.md` — 追記
