# 学び: MainVideoのルールを派生コンポーネントにそのまま適用しない
日付: 2026-05-11
カテゴリ: 上位原則候補
関連スキル: remotion-coding, slides-video-layout

## 状況
SlidesVideoを実装する際、MainVideoから以下のロジックをそのまま継承した：
- `charOpacity`: stat/chart ビジュアル時 → 0.45に半透明化
- `CharacterLayer` をそのまま使用（offsetX非対応）

両方ともユーザーフィードバックで修正が必要になった。

## 齟齬の内容

### charOpacity
- AIの判断: MainVideoで検証済みのopacity=0.45ルールをSlidesVideoにも適用すべき
- ユーザーの意図: スライド系ではキャラはフル不透明（スライドが画面72%幅なのでキャラと干渉しない）
- 差分の本質: 「なぜ半透明にするか」の理由（全画面ビジュアルがキャラに重なる）がSlidesVideoでは成立しない。理由なきルールを継承した

### CharacterLayer
- AIの判断: 既存のCharacterLayerをそのまま使えば再利用性が高い
- ユーザーの意図: キャラを端に50px追加でずらしたい（offsetX）
- 差分の本質: CharacterLayerはoffsetXを渡せる設計でなかった。再利用性より要件適合性を優先すべきだった

## 学び

**ルール: 派生コンポーネントのルール継承前に「なぜそのルールが存在するか」を確認する**

派生（SlidesVideo）に親（MainVideo）のルールを移植するとき：
1. そのルールの「前提条件」が派生でも成立するか確認する
2. 成立しなければ派生固有のルールを定義する

| ルール | MainVideo前提 | SlidesVideo前提 | 適用 |
|--------|-------------|----------------|------|
| charOpacity=0.45 | 全画面ビジュアルとキャラが重なる | スライドはwidth*0.72で重ならない | ❌ 不適用 |
| CharacterLayer使用 | offsetX不要 | offsetX=50必要 | ❌ 直接Stage使用 |
| ビジュアルtop:8% | ページ上部から開始 | TopicBadgeと重なる | ❌ top:9%に調整 |

## 適用先
- [ ] `~/.claude/principles/` に「ルール継承前の前提確認」として上位原則化を検討
- [x] `.claude/rules/slides-video-layout.md`（SlidesVideo固有ルールとして確定済み）
