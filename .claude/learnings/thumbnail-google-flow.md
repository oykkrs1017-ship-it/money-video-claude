# 学び: Google Flow サムネイル生成 — 政治コンテンツ回避とキャラ外見保持
日付: 2026-05-16
カテゴリ: スキルルール
関連スキル: thumbnail-generation, google-flow

## 状況

ep016「米中首脳会談」のサムネイルを Google Flow で生成しようとした際、
国旗・政治シンボルを含むプロンプトが生成拒否された。
また初期プロンプトではキャラクター（まろくん・ぽんちゃん）の外見が保持されなかった。

---

## 齟齬①: 政治コンテンツ

- AI の判断: 「米中」「国旗カラー」「首脳会談」はテーマを正確に伝えるために必要
- ユーザーの意図: Google Flow のポリシーを通過させつつ、テーマを伝える表現
- 差分の本質: 生成AIの安全フィルターは単語・シンボルレベルで反応する

### 回避ルール

| NG 表現 | OK 代替 |
|---------|---------|
| 米国旗・中国旗の描写 | 抽象的なcircuit board / tech background |
| 国旗カラー（赤・青を国家で指定） | ニュートラルなカラーパレット指定 |
| 「米中首脳会談」 | 「グローバル首脳会談」「国際経済会議」 |
| 政治家名・肖像 | 削除。企業名・株価・チャートで代替 |
| 「米中関係」「地政学」単独 | 「テクノロジー投資」「サプライチェーン」文脈に埋め込む |

プロンプト末尾に必ず追加:
```
No national flags, no political figures, no country-specific symbols.
```

---

## 齟齬②: キャラクター外見の保持

- AI の判断: キャラの一般的な説明（「orange hair anime girl」）で再現できる
- ユーザーの意図: チャンネルのキャラクターデザインを完全に保持する
- 差分の本質: 一般描写だけでは生成AIがデザインを自由解釈してしまう

### キャラ保持プロンプト構造

```
CHARACTER REFERENCE: Use the two attached images as strict character references.
Do NOT alter their designs. Maintain exact appearance from reference images.

Character 1 — Maro:
Chibi anime tanuki boy. Extremely fluffy round brown fur-like hair.
Brown eyes, chubby cheeks, rosy blush. Beige/tan traditional Japanese
folk jacket with brown shorts. Wicker basket backpack. Small raccoon-dog tail.

Character 2 — Ponchan:
Chibi anime girl. Short orange bob hair with green leaf ornament on top
(mandarin orange motif). Orange/amber eyes. Elaborate orange-and-green
kimono with citrus pattern. Skirt shaped like mandarin orange slice.
Holding small orange in one hand.
```

**ポイント**:
1. `CHARACTER REFERENCE: Use attached images` を冒頭に明記（Google Flow の参照機能を呼び出す）
2. 服・髪・小道具を具体的にテキスト記述（画像参照と組み合わせて固定精度UP）
3. `Do NOT alter their designs` / `Preserve exact character designs` を必ず入れる

---

## 適用先
- [x] ep016 サムネイルプロンプトで検証済み（キャラ再現精度: 良好）
- [ ] サムネイル生成テンプレートに組み込む
