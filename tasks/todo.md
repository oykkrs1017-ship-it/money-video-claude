# 現在のタスク

## 進行中
- [ ] **ゼロベース再設計 Week 1**（plan: `~/.claude/plans/youtube-youtube-bubbly-pine.md`）
  - [x] CTA配置ルールを「ctaチャプターのみ」に修正（prompt.ts）
  - [x] H-04タイトル銘柄名ルールを「先頭20字必須・自己チェック」に強化（prompt.ts）
  - [x] MEMORY.md のキャラ推奨記述をキャラ禁止に確定
  - [x] ep019公開後7日のCTR / 30秒残存率を ep018と比較 → CTR取得は認証スコープ不足。PDCA 2026-05-31-check-act.md に記録（ep019: https://youtu.be/MR4QRiDh2gs）

## PDCA アクション（2026-06-06 Check 結果）
- [ ] **ep025 7日後測定**（2026-06-18）: `collect-analytics.ts --ep ep025` → 個別銘柄テーマ（H-09）の証拠データ取得
- [ ] **ep026 尺チェック必須化**: レンダリング後 ffprobe で 11分超なら台本カット（H-06'）
- [ ] **ep026 トピック**: 全員影響型+王道KW着地を100%徹底（H-09）。個別銘柄のみ着地は不採用
- [ ] **H-05 lessons.md 昇格確認**: 次サイクルでも Shorts 流入50%以上なら昇格
- [ ] **H-08 検討**: ShortsVideo.tsx 冒頭0.5秒テロップ改善（ep026_shorts から適用検討）

## 次に着手

### Week 2-3 ゼロベース再設計（要ヒアリング項目あり）
- [ ] サムネ画像生成API選定（fal.ai Flux / OpenAI gpt-image-1 / Midjourney API）
- [ ] `generate-thumbnail.ts` 新規作成（API直結 + シリーズ別SVGテンプレ合成）
- [ ] シリーズ別プロンプト3本作成（monday-signal / japan-only / reverse-wind）
- [ ] `WeeklySignalVideo.tsx` 新規Composition
- [ ] `generate-shorts-from-long.ts` でShorts自動化
- [ ] `ai-money-shorts` を `packages/_archived/` へ移動
- [ ] `update-winning-patterns.ts` で週次フィードバックループ

### シリーズ企画（競合「栄一の書斎」分析より導出・2026-04-25 / ガーコちゃんねる分析でevergreen化 2026-05-28）

> 2026-05-28: ガーコちゃんねる分析より下記3シリーズ＋「資産防衛」を **定番evergreenシリーズ** として正式化。
> `knowledge/directive.yaml` の `evergreen_series` に定義済み・`topic-selection.md` に evergreen lane 追加済み。
> 旬ニュースが弱い週はここから1本選び投稿の谷間を埋める。タイトルは損回避・断定型（ガーコ型）に変換する。

- [ ] **「資産防衛」シリーズ（新・半evergreen）** ep企画: 為替介入・利上げ・選挙の度に再利用できる防衛テーマ
  - タイトル型: 「〇〇、NISAの米国株は今すぐ見直すべき」（損回避型）
- [ ] **「日本にしかない」シリーズ** ep企画: 中国が抜けない日本企業の技術障壁を1社ずつ解剖
  - 候補: 東京エレクトロン（露光装置）／ファナック（CNC制御）／信越化学（シリコンウェハ）／ディスコ（ダイシング）／レーザーテック（EUV検査）
  - タイトル型: 「東京エレクトロンを知らない投資家は損してる」（損回避型）
- [ ] **「チョークポイント」シリーズ** ep企画: 世界の物流・エネルギー要衝の有事シナリオ
  - 候補: マラッカ海峡／台湾海峡／スエズ運河／パナマ運河／宗谷海峡（北海道）
  - タイトル型: 「マラッカ海峡封鎖！あなたの資産はどうなる？」（損回避＋疑問型）
- [ ] **「逆風で笑う企業」シリーズ** ep企画: 一見悪材料が追い風になる構造を持つ銘柄分析
  - 候補: 円安メリット銘柄（トヨタ/ホンダ）／防衛株（川崎重工/三菱電機）／天然資源（INPEX）
  - タイトル型: 「円安なのにINPEXだけ上がる理由」（断定型）

### チャンネル改善（NotebookLM 第三者分析 2026-05-05）

#### 最優先3点（次ep制作時に必ず適用）
- [ ] **フック直後に目次テロップ追加** — フック（冒頭数字）の直後30秒以内に「この動画で学べること3つ」を5秒間テロップ表示する台本構造に変更
- [ ] **銘柄発表シーンに「スクショ推奨」テロップ** — エントリー価格・目標株価・撤退ラインを画面に出す際に「スクショ推奨📷」常時表示。台本変更不要・テンプレート修正のみ
- [ ] **CTAタイミング変更 + アルゴリズム言葉を台本から削除** — CTAを「具体銘柄発表の直前」に移動。「アルゴリズムに乗っているから登録して」系の台詞を台本プロンプトから禁止

#### タイトルSEO改善（次ep以降のタイトル設計）
- [ ] **タイトルに銘柄名を入れる** — TSMC/NVIDIA/INPEX/東京エレクトロン等の検索ボリュームワードを優先
- [ ] **「結論（エントリー価格/目標株価）」をタイトルに匂わせる** — 「具体銘柄の数字まで落とし込む」という強みをタイトルで訴求

#### 台本トーン改善（script-system-prompt.md の修正）
- [ ] **まろ君への「見下し」表現を抑制** — 「情弱」「カモ」「絶望的な数字を見せてあげる」系の冒頭攻撃を禁止し「一緒に危機を乗り越える」トーンに変更
- [ ] **ポジティブな感情報酬を中盤に配置** — 恐怖→解決策→「これで資産を守れる」という感情の着地点を必ず作る

#### 差別化強化（ポジショニング）
- [ ] **「地政学×具体的買い場」を全動画で前面に出す** — チャンネルの唯一の強み（エントリー価格・撤退ライン付き地政学分析）をサムネとタイトルで訴求する方針に変更

### 継続タスク
- [ ] `CharacterDialogue.tsx` の `speakerName` → `CHARACTER_CONFIGS[char].name` に変更（single-source-of-truth）
- [ ] `TypeE-Story.tsx` の `speakerName()` → `CHARACTER_CONFIGS[char].name` に変更（single-source-of-truth）
- [ ] `SPEAKER_COLOR` を `CHARACTER_CONFIGS[char].color` に統合検討
- [ ] 各Composition（TypeA〜E）を `section.bgm` 参照に変更（BGM動的切替 — prompt.ts には実装済み）

## 完了
- [x] Boris 30 Tips フェーズ A/B/C 実装（2026-05-01）
  - plan-mode.md / verify-checklist.md / worktree-workflow.md / chrome-ui-verify.md 新規
  - prettier-format.js / script-input-sync-check.js hook 新規
  - settings.json: ask 層・deny 拡張・statusLine 追加
- [x] ep006 MP4 フルレンダリング（2026-04-16）
- [x] ep006 インフォグラフィック 6枚生成（2026-04-16）
- [x] RichPanel 見切れ対策（maxHeight 拡大＋動的フォントサイズ）（2026-04-16）
- [x] domain パッケージ TypeCheck & テスト全件グリーン（2026-04-21）
- [x] Claude Code 3層設計への再編（2026-04-24）
