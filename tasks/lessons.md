# プロジェクトの教訓（時系列）

> 日付順上から新しい順。標準化決定は `.claude/rules/` へ昇格。
> 昇格済・実装完了済は `tasks/lessons-archive.md` へ移動。

---

## 2026-06-06 — leadText 3層伝播パターン確定・feature-matrix labelAbove ロジック

**状況**: ep025 feature-matrix スライドで leadText が表示されないバグ＋ラベル重なりバグを修正。

**leadText は visual オブジェクトの外**: slides.json の `slide.leadText` は `slide.visual` の兄弟フィールド。`patch-visuals.js` で `{ ...slide.visual, leadText: slide.leadText }` としてマージしないと消える。

**3層伝播**: slides.json → patch-visuals.js（マージ） → visualToSlide()（読み込み） → レンダラー（`def.data.leadText`）。新ビジュアルタイプ追加時は3箇所すべて更新必須。詳細: `.claude/skills/html-slides-workflow/SKILL.md`

**feature-matrix labelAbove**: `cy > PAD + r + 60`（約120px以上）なら上方向、それ以下は下方向。上端付近アイテムのラベルがSVG外にはみ出すのを防ぐ。密集アイテムは15px以上、highlight は20px以上離す。

---

## 2026-06-05 — HTMLスライドをコンサル品質デザイン規律へ再構築（6色厳守・フラット化）

**状況**: ユーザー提示のコンサル設計ガイド（6色厳守・完全フラット・絵文字排除・ヘッドメッセージ必須・グラフは1系列だけ強調・余白で魅せる）に沿って、Vercel風の「装飾を足す」スライドを「削って構造で魅せる」方向へ転換。スコープは**中核8タイプ＋共有トークン**（vs-battle/color-cards/data-table/bar-diff/donut-center/chart/stat/rich-panel）。

**6色パレット**: メインブルー`#1976D2`・アクセント朱`#D84315`（強調KW/課題/減少のみ・1枚1〜2箇所）・ライトブルー`#E8F4FB`・本文`#222222`・サブ`#888888`・罫線`#E0E0E0`・背景純白。

**学び1: 色は3層あるが「明示色」がレンダラー既定を上書きする**
- `generate-html-slides.ts` の `C`/`SEMANTIC`/`CARD_COLOR_MAP`/`THEMES`/`CHART_PALETTE` を変えても、**台本JSONに焼かれた明示HEX（highlightColor/cell.color等）は素通り**する。よって①レンダラー既定 ②生成プロンプトの色例 ③渡し色のclamp の3点を揃えないと6色厳守にならない。
- **対策＝`clampToPalette()` 追加が決定打**: 任意HEXをHSL色相で役割色へ丸める（赤/橙→朱・黄/金/低彩度→グレー・緑/青/紫→ブルー）。これで**旧epの緑#1e6e45→青・橙→朱**を入力に依らず自動補正。LLMドリフトにも頑健。コア渡し色（cardColor/highlightColor/cell.color/labelColor/bar.color/diff.color/donut.color）に適用。

**学び2: 意味色は「国別」より「3役割」へ集約が一貫**
- 米=青/中=赤/日=緑/円=橙 の4色 → 青=注目/自社・グレー=中立・朱=課題/減少 の**3役割**に集約。色数が減り「色の意味を全ページ固定」のガイド原則と合致。緑は廃止し青へ集約（ガイドに緑はない）。

**学び3: 脱テンプレ（ban-avoidance）とガイド単一ブルーは両立できる**
- シリーズ別accentは残すが**朱と衝突しないクール抑制色**（monday=青/japan=teal#00838F/chokepoint=indigo#283593/reverse=深紫#4527A0/asset=濃teal#00695C）に統一。chartPaletteは`[accent, グレー諸段..., 朱予約]`。朱を強調専用に確保するため series accent に暖色（橙/赤）を使わないのが要点。

**学び4: グラフは「1系列だけaccent・他グレー・原点ゼロ」**
- 棒は`#B0BEC5`既定＋最大値1本のみaccent。`beginAtZero:true`・グリッド`#E0E0E0`細線。表は青帯ヘッダー＋横罫線のみ＋推奨列`#E8F4FB`淡塗り＋「推奨」テキストバッジ（👑/★/影は撤去）。

**検証**: `npm run html:generate` でPNG生成 → **Readツールで画像目視**が最速の検証パス（音声/MP4不要）。型チェックは編集ファイルゼロエラー（既存`src/data/script.ts`の`../config`エラーは無関係）。

**残課題（スコープ外）**: ①旧JSONのセルテキスト内絵文字（⚠️等）は色でなく文字列のため未除去＝新プロンプトで抑制 ②非中核26レンダラー（step-icons金矢印/feature-matrixグロー/👑）は装飾残存・中核8と差が出る既知の不整合 ③旧データの朱多用（新プロンプト規律#12で1〜2箇所に制限）。

**変更ファイル**: `packages/tech-geopolitics-channel/scripts/generate-html-slides.ts`（トークン6色化・8レンダラーflat化・`clampToPalette`新設）/ `generate-slide-structure.ts`（中核色例を6色限定・icon削除・設計原則10〜13追記）

---

## 2026-06-02 — ガーコ式冒頭3秒フック導入（挨拶禁止ルール撤廃）

**状況**: 競合ガーコちゃんねる（46万登録・平均18万再生）の全動画共通フックを台本生成に取り込み。視聴維持率の最大レバーである冒頭3秒を強化。

**方針転換**: これまで `prompt.ts` は「こんにちは」挨拶を**明示禁止**していたが撤廃。ガーコ式 **H-00挨拶層（0〜8秒）** を最優先層として新設し、hook を3段（30秒）→**4段（34秒）**化。

**新4段構成**: H-00挨拶層（0-8s）→ H-05逆説層（8-18s）→ H-01結論層（18-26s）→ H-03学べる3つ（26-34s）。既存の「衝撃数字——結論」フックは捨てず H-05/H-01 に維持。

**冒頭3秒テンプレ**: 「こんにちは、ぽんちゃんです。[緊急性/問いかけ]。本日は[テーマ]について解説いたします。これを知らないと[損失回避KW]になってしまうかもしれません！」

**学び1: トーンはハイブリッド許容**
- H-00挨拶＋テーマ提示部分のみ丁寧語（「ぽんちゃんです」「解説いたします」「かもしれません！」）、H-05以降の本編は既存タメ口（「〜だよ」）。ガーコ完全フォーマット採用のため混在を許容。

**学び2: hook ルールは3層伝播でSoTから自動反映**
- `directive.yaml hook.layers`（string[]）→ `buildDirectiveInstructions()` が自動展開 → 台本生成に注入。スキーマ変更なしで層構造を差し替えられる。`opening_greeting`/`opening_patterns` は Zod で strip されるため SYSTEM_PROMPT 直書きで担保。
- SlidesVideo は `generate-slide-structure.ts` の speakerHint がそのまま台本に伝播するため、hook1枚目 speakerHint に挨拶指示を入れれば `generate-script.ts` 無改修で効く。

**変更ファイル**: `knowledge/directive.yaml`（hook 4層化＋active_lessons）/ `packages/usecases/src/generateScript/prompt.ts`（禁止撤廃・H-00新設・H-01/H-05時間帯）/ `generate-slide-structure.ts`（speakerHint）/ `.claude/rules/hook-structure.md`（4段化）/ `title-conventions.md`（期待感KW）

**未対応（別タスク）**: MainVideo の `CounterIntuitionLayer`（最初2ライン優先表示）は H-00 挨拶層追加に未対応。SlidesVideo は image/slide ベースで影響なし。次回ep生成で実セリフを目視検証予定。

---

## 2026-06-02 — ダイジェストShorts・Studioプレビュー白表示・サムネイル競合参照フロー

**状況**: ep023 SlidesVideo完成後、ShortsVideoをhook切り抜きからダイジェスト型に改修。合わせてサムネイルプロンプトロジックを競合参照スタイルに更新。

**学び1: ダイジェスト行数予算の過小見積もり（要注意）**
- 秒数予算（例: hook=15秒=450f）で `relStart >= budget` breakしても、最後の行の**全長が含まれる**ため実測尺が理論値の1.5〜2倍になる
- ep023実測: 理論42秒 → 実測74秒（行長が400-590fと長かったため）
- **次回対策**: 行数上限で制御する方が安定。`hook:2行/explanation:1行/analysis:2行` など。秒数予算は「大まかな目安」として使い、行数で上限を設ける二重制御を検討

**学び2: SlidesVideo Studio白表示はHTMLスライドPNGの遅延ロードが原因**
- Remotion Studio previewではstaticFile()のHTML slides PNGが遅延ロード→白く表示される
- **ルール**: SlidesVideoのプレビュー確認は必ず`remotion still`コマンドで行う。Studio起動はURL共有目的のみ
- verify-checklist.md に注記追加済み（2026-06-02）

**学び3: サムネイル競合参照フロー（標準化）**
- ユーザーが競合サムネキャプチャを貼る→特徴を言語化→プロンプト更新というフローが今回確立
- 分析観点: ①文字色とその縁取り色の組み合わせ ②金色/特殊効果 ③レイアウト構造（行数・バー位置）
- 今回判明: 赤文字→白縁取り、金色→メタリックグラデーション＋キラキラ星（ガーコちゃんねる標準）
- `generate-thumbnail-brief.ts` の `getGarkoStyle1/2` に反映済み

**学び4: ダイジェストCTA設計**
- 「結論を見せずにロング動画へ誘導」構成：summary/ctaチャプターをShorts除外し末尾にCTAスクリーンを差し込む
- CTA内容: 「結論と投資判断はロング動画で公開中！」＋「👆概要欄のリンクから見る」＋「エントリー価格・撤退ラインまで全て解説しています」
- 表示時間: 3秒（7秒は長すぎる。3秒で十分視認可能）
- 7日後のShortsクリック率データで効果検証予定

---

## 2026-05-31 — PDCA Act: 閉じたエコシステム化の警告とShorts復活の緊急性

**状況**: 第2回PDCA計測（2026-05-31）で、SUBSCRIBER流入が29.3%->61.1%に急増。Shorts流入は56.5%->24.3%に崩壊。検索流入も8.4%->5.7%に悪化。新規リーチ経路が全て縮小し、既存登録者のみで視聴が成り立つ「閉じたエコシステム」状態。

**確定ルール（2回以上のデータで確認）**:
- **尺9-11分が最適**: ep013(10:47)=26.9%・ep018(9:55)=28.5%のリテンション。12-13分帯は平均28再生、14分超は11再生。17分台は維持率14.41%で崩壊（2026-05-28 + 2026-05-31 の2回確認）
- **個別銘柄テーマは伸びない**: 「スズキだけが〜」(0再生)・「NVIDIAだけじゃない〜」(2再生)。一方「円安160円」(785再生)は全員影響型。対象が狭いテーマは再生数が伸びない
- **Shorts投稿を止めると新規流入が消える**: 前回Shorts依存56.5%を「問題」と認識したが、止めた結果SUBSCRIBER依存61.1%というさらに悪い状態に。ep021_shortsは315再生と即効性確認。Shortsは新規発見の生命線

**新規学習（2026-05-31 再認証後データ）**:
- **YouTube Analytics は `yt-analytics.readonly` スコープが別途必要**: `YouTubeAuth.ts` の SCOPES に最初から含めるべき（漏れると collect-analytics.ts が全失敗）
- **CTRメトリクス名は `impressionClickThroughRate` → 要修正**: YouTubeAnalyticsAdapter.tsのfetchCtr()が誤ったメトリクス名を使用（常に0返却）

**数値根拠**: ベースライン維持率25%->20.2%、検索流入8.4%->5.7%、Shorts流入56.5%->24.3%、SUBSCRIBER流入29.3%->61.1%

---

## 2026-05-28 — チャンネル分析: 尺短縮・Shorts復活・サムネ初速（実装済み）

**状況**: 最新アナリティクス（31本）で、流入81%が登録者・Shorts2.4%（37.5%から崩壊）・新作再生が一桁台までリーチ崩壊。長尺17分台はリテンション9-13%、10:47分が26.9%で最良。

**実装**:
- 尺: `prompt.ts` を 15-20分/90-110セリフ → **8-11分/55-65セリフ**（`.claude/rules/video-length.md` 昇格）
- Shorts: `new-episode.ts --render` の Step6 に `render-shorts.ts` を配線（新規発見の最大入口を復活）
- サムネ: `generate-thumbnail-brief.ts` のキャラ版E（「最高CTR推奨」）を封印しキャラなしA/D推奨に統一（MEMORY「キャラ禁止2026-05-26」と整合）

**✅ 解決済み（2026-06-07 b1c0334「図解比率 SoT 修正」）**: `prompt.ts` の自己矛盾は解消。現在は SYSTEM_PROMPT / buildUserPrompt とも「図解系を60%以上・rich-panelは最終手段」で統一され、`prompt.test.ts` 含む全テスト PASS（2026-06-10 監査で実行確認）。

---

## 2026-05-04 — フィードバック「このタイミング」＝恒久ルール

**状況**: 「2196フレーム付近チャンネル登録促進このタイミング不要」→ ep013該当箇所のみ削除。後日「次回以降途中CTA不要で最後のみ」追加指示。

**ルール**: 修正指示受けたら「同パターン他箇所・他epで起きるか？」自問、Yesなら恒久ルール記録。

---

## 2026-05-03 — mp3へvideo stream埋込がBGM音量制御破壊

**原因**: iTunes系DL mp3にカバーアート（video stream）埋込、Remotion AudioTrack音量制御不能。

**診断**: `ffprobe -show_streams public/bgm/xxx.mp3 | grep codec_type` → video出たら除去
**修正**: `ffmpeg -y -i input.mp3 -vn -acodec copy output_clean.mp3`

---

## 2026-05-03 — bgmVolume変更はJSON直接編集（yaml-to-json再実行禁止）

**ルール**: bgmVolume・タイトル等軽微修正はEdit toolで `input/epXXX.json` 直接編集。yaml-to-json再実行でframeCount消失、Remotion duration崩壊。

```
JSON の値を変えたい → yaml-to-json 再実行？ → NO
→ Edit tool で input/epXXX.json を直接編集 → script-input.json にもコピー
```

---

## 2026-05-03 — fetch-images.ts新スキーマ（lines[].visual）未対応

**原因**: fetch-images.ts旧スキーマ（`chapter.visuals[].imageData.src`）のみ対応。台本生成は新スキーマ（`chapter.lines[].visual.src`）出力。

**ルール**: 台本生成スクリプトスキーマ変更時fetch-images.ts同時更新必須。

---

## 2026-05-01 — stat/chartビジュアル中キャラopacity 0.45適正

`interpolate(relativeFrame, [0, 20], [1, 0.45])` — 0.12視認不可、1.0 VisualLayerと重複。
対象: `packages/tech-geopolitics-channel/src/compositions/MainVideo.tsx`

---

## 2026-04-20 — 確認ループより速度優先

```
問題が既知（ユーザー指摘済み）？
  → YES: Grep で行特定 → 即 Edit → Still で確認
  → NO:  Read → 問題箇所特定 → Edit → Still で確認
```

同ファイル直前Readなら再Read不要。Still確認修正後1回のみ。

---

## 2026-04-10 — 新API機能は許可リスト確認後実装

ブログ公開 ≠ API GA。最小構成動作確認後全展開。
| 記事種別 | 信頼度 |
|---------|-------|
| docs.anthropic.com | 高：実装可 |
| claude.com/blog | 中：GA確認後 |
| サードパーティ | 低：API動作確認必須 |

---

## 2026-04-09 — 台詞とビジュアルタイプ整合性チェック

| ゾーン | 最適タイプ |
|---|---|
| フック（0-5秒） | `stat`（数字ドーン） |
| 展開1（最初驚き） | `infographic` |
| 展開2（比較・対比） | `graph`(comparison) |
| クライマックス | `graph`(line) or `timeline` |
| 教訓・まとめ | `rich-panel` |
| CTA | `telop`（シンプル） |

連続2セクション同ビジュアルタイプ使い回し禁止。

---

## 2026-04-06 — BGM動的切替未実装

台本生成時 `section.bgm` ランダム指定、各Compositionで参照設計。
未着手: `script-system-prompt.md` + 各Composition（TypeA〜E）の `section.bgm` 参照変更。
→ `tasks/todo.md` 継続タスク記録済。