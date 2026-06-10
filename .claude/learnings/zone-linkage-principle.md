# 学び: レイアウトゾーンは連動設計・連動変更する
日付: 2026-05-22
カテゴリ: 上位原則候補
関連スキル: video-render, shorts-generation

## 状況
ShortsVideo の TopicBadge 重複問題を修正する際、
`visualTop` を変えたが `visualBottom` と `subtitle top` を連動させず、
字幕が visual zone の内側に入り込むバグが発生した。
結果として「visual → subtitle → visual bottom → subtitle」と修正が往復した。

## 齟齬の内容
- AI の判断: 問題箇所（TopicBadge重複）だけをピンポイントで修正
- ユーザーの意図: 隣接するゾーンとの整合も含めて一度に解決してほしい
- 差分の本質: ゾーン境界値には「依存関係」があるが、AIがそれを考慮せず単点修正した

## 学び

**レイアウトゾーンの境界値は常にセットで管理する。**

1点変更するとき、必ず「このゾーン境界に依存している他の値」を列挙してから変更する。

### ShortsVideo の依存関係マップ
```
TopicBadge 高さ → visualTop の下限
visualTop        → （制約なし）
visualBottom     → subtitle top の上限（= visualBottom + gap）
subtitle top     → characters との衝突チェック
characters 上端  → subtitle top の上限
```

### 変更前チェックリスト（ゾーン境界を変えるとき）
- [ ] このゾーン境界に依存している他の値はどれか？
- [ ] 変更後、依存値との整合は取れているか？
- [ ] Still 確認は依存関係のある全フレームで行ったか？

## 適用先
- [ ] `.claude/rules/remotion-coding.md` に「ゾーン連動設計」節として追記
- [ ] CLAUDE.md の「Plan Mode 必須トリガー」に「ゾーン境界値の変更」を追加検討
