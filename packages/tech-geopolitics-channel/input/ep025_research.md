# Exa リサーチ: AIデータセンターが電気を食い尽くす、電力株の逆襲 (ep025)
生成日時: 2026-06-06T00:50:18.562Z
ソース数: 6

## AIデータセンター電力危機と原子力ルネサンス完全解説2026：MicrosoftがThree Mile Island再稼働・GoogleがKairos Power買収・AmazonのSMR参入から、日本の「脱炭素×AI競争」生存戦略まで——「AIの喉元に電力あり」が変える世界地図と、東京電力・関西電力が直面する1,000億ドル規模の賭けを徹底解剖 - ラボメモ
URL: https://labmemo.com/ai%e3%83%87%e3%83%bc%e3%82%bf%e3%82%bb%e3%83%b3%e3%82%bf%e3%83%bc%e9%9b%bb%e5%8a%9b%e5%8d%b1%e6%a9%9f%e3%81%a8%e5%8e%9f%e5%ad%90%e5%8a%9b%e3%83%ab%e3%83%8d%e3%82%b5%e3%83%b3%e3%82%b9%e5%ae%8c%e5%85%a8/
公開日: 2026-05-22
著者: labmemo

AIデータセンター電力危機と原子力ルネサンス完全解説2026：MicrosoftがThree Mile Island再稼働・GoogleがKairos Power買収・AmazonのSMR参入から、日本の「脱炭素×AI競争」生存戦略まで——「AIの喉元に電力あり」が変える世界地図と、東京電力・関西電力が直面する1,000億ドル規模の賭けを徹底解剖 - ラボメモ

# AIデータセンター電力危機と原子力ルネサンス完全解説2026：MicrosoftがThree Mile Island再稼働・GoogleがKairos Power買収・AmazonのSMR参入から、日本の「脱炭素×AI競争」生存戦略まで——「AIの喉元に電力あり」が変える世界地図と、東��電力・関西電力が直面する1,000億ドル規模の賭けを徹底解剖

---

## はじめに：AI革命の「見えないボトルネック」がついに顕在化

2026年、AI産業はかつてない転換点を迎えている。NVIDIAのBlackwell GPUが爆発的な需要を記録し、OpenAIのGPT-5シリーズが企業導入を加速させる一方で、業界最大の「見えない壁」が立ちふたがかった。それは電力だ。

米国のAIデータセンター消費電力は2023年の約50TWhから、2026年には150TWh超へと3倍以上に急増している。これはスウェーデン一国の総発電量に匹敵する数字だ。そしてこの「AIの電力飢餓」に対する解答として、世界のテック巨人たちが異常な行動に出ている——原子力の復権である。

Microsoftは事故の歴史を持つThree Mile Island原子力発電所の再稼働を決定。GoogleはSMR（小型モジュール炉）スタートアップのKairos Powerを買収。AmazonはTotalEnergiesと提携してSMR開発に参入。Metaも核融合スタートアップへの出資を拡大している。

本稿では、この「AI×原子力」という前代未聞の融合がなぜ起きているのか、どのような技術的・経済的・政治的背景があるのか、そして最も重要な——日本企業と日本社会がこの激動にどう対応すべきか——について、情報源を交えながら徹底的に解説する。

---

## 第1章：AIデータセンターの「電力消費爆発」——その衝撃的な実態

### 1-1. データセンター電力消費の指数関数的増加

国際エネルギー機関（IEA）の2026年版レポートによると、全球データセンターの電力消費量は以下のように推移している：

| 年 | 消費電力（TWh） | 前年比増加 | AI寄与度 |
| --- | --- | --- | --- |

|—|—|—|—|

| 2020年 | 約200 | — | 約5% |
| --- | --- | --- | --- |
| 2022年 | 約240 | +20% | 約15% |
| 2024年 | 約350 | +46% | 約40% |
| 2026年（予測） | 約550-650 | +60-80% | 約65% |

特に生成AI（Generative AI）の推論（Inference）処理が電力消費の主因となっている。ChatGPTへの1回のクエリで消費される電力は、通常のGoogle検索の約10倍と言われる。そしてGPT-4以降、マルチモーダル化・ chain-of-thought推論の高度化により、1クエリあたりの消費電力はさらに上昇傾向にある。

### 1-2. GPU自身の「電力暴食」

NVIDIAの最新GPU「Blackwell B200」のTDP（熱設計電力）は1,000Wを超える。1基のAIサーバーラックに搭載��れるGPU数は72-96基が標準的であり、ラックあたりの消費電力は100kW超に達する。従来のデータセンターラック（平均5-10kW）と比較して、10-20倍の電力密度となっている。

この「電力密度の爆発」が意味することは単純ではない：

– 冷却システムの限界: 従来の空冷では追いつけず、液冷（直接チップ冷却）が必須に – 送電網の容量不足: 既存のインフラでは大規模AIデータセンターへの給電が物理的に不可能 – 再生可能エネルギーの「間欠性」との矛盾: 太陽光・風力は安定供給に不向き

### 1-3. テック企業の「カーボンニュートラル約束」との矛盾

Google、Microsoft、Meta、Amazonはすべて2040年までのカーボンニュートラル（正味ゼロ排出）を公約している。しかしAI投資の急拡大により、これらの企業のScope 2（調達電力由来）排出量は2023-2025年で30-50%増加している事実がある。

「AIの発展」と「脱炭素」

---

## AIデータセンターの電力危機：2026年、Microsoft・Google・Oracleが激争する「電力確保レース」の全貌と、日本が直面するエネルギー課題 —— TEPCo・関電の再稼働合意から小型原子炉（SMR）まで、AIブームが変える「電気の地政学」を徹底解説 - ラボメモ
URL: https://labmemo.com/ai%e3%83%87%e3%83%bc%e3%82%bf%e3%82%bb%e3%83%b3%e3%82%bf%e3%83%bc%e3%81%ae%e9%9b%bb%e5%8a%9b%e5%8d%b1%e6%a9%9f%ef%bc%9a2026%e5%b9%b4%e3%80%81microsoft%e3%83%bbgoogle%e3%83%bboracle%e3%81%8c%e6%bf%80/
公開日: 2026-05-25
著者: labmemo

AIデータセンターの電力危機：2026年、Microsoft・Google・Oracleが激争する「電力確保レース」の全貌と、日本が直面するエネルギー課題 —— TEPCo・関電の再稼働合意から小型原子炉（SMR）まで、AIブームが変える「電気の地政学」を徹底解説 - ラボメモ

# AIデータセンターの電力危機：2026年、Microsoft・Google・Oracleが激争する「電力確保レース」の全貌と、日本が直面するエネルギー課題 —— TEPCo・関電の再稼働合意から小型原子炉（SMR）まで、AIブームが変える「電気の地政学」を徹底解説

## リード

2026年5月現在、Microsoft、Google、Amazon、Oracleなどのテック巨人たちが、空前の「電力確保レース」に奔走している。単なるデータセンター建設競争ではない。AIモデルの訓練と推論に必要な電力需要が指数関数的に増加し、米国の複数州で送電網の容量限界に達しつつあるからだ。MicrosoftはThree Mile Island原子力発電所の再稼働に合意し、Amazonは直接データセンター向け発電所の建設に乗り出し、Oracleは「核融合データセンター」構想まで打ち出している。一方、日本では東京電力・関西電力がAIデータセンター向け大口供給プログラムを発表し、経産省が「AI・データセンター電力確保プロジェクト」を立ち上げるなど、エネルギー政策そのものがAIによって書き換えられようとしている。

本記事では、①AI電力消費の実態と規模 ②テック企業の電力確保戦略（原子力・再生可能エネルギー・自社発電） ③日本の電力市場への影響と国内事業者の対応 ④筆者の独自分析：この「電力危機」がAI業界の競争地図をどう変えるか ⑤個人・企業が今すぐできる備え を徹底解説する。

—

## 概要ボックス

| 項目 | 内容 |
| --- | --- |
| 主要テーマ | AIデータセンターの爆発的電力需要と、それを巡るテック企業・電力業界の激動 |
| キープレイヤー | Microsoft、Google、Amazon、Oracle、Meta、TEPCo、関電、ExxonMobil |
| 公式ソース | Microsoft Environmental Sustainability Report（一次） |
| 関連ソース | Google Sustainability（一次）/ IEA Electricity 2026（一次） |
| 重要度 | 🔴極めて高 — AI業界の持続可能性と競争構造を決定づける最重要課題 |

—

## 📎 情報源

—

## 1. 起きていること：AIの「電力暴食」が引き起こす危機

### 1.1 電力消費の爆発的増加

AIの電力消費は、従来のクラウドコンピューティングとは桁違いのスケールで増加している。その主因は3つある：

第一に、AIモデルの訓練（Training）における電力消費である。 GPT-4の訓練には約50GWh（ギガワット時）の電力が消費されたと推定されている。これは約5,000世帯の年間消費量に相当する。そしてGPT-5以降、モデルサイズはさらに指数関数的に拡大しており、最新のフラッグシップモデルの訓練には100GWh〜250GWhが必要になると見られている。

第二に、推論（Inference）の電力消費である。 モデルの訓練は一度きりだが、推論は毎日、毎秒行われ続ける。ChatGPTの一日の推論電力消費 alone で約1GWhに達すると推定されており、これはユーザー数の増加とともに直線的に増え続ける。Google検索にAI回答機能���AI Overviews）が統合されたことで、1回の検索あたりの電力消費は従来の約10倍に跳ね上がったとの分析もある。

第三に、データセンターの冷却（Cooling）である。 従来の空冷方式では、データセンターで消費される電力の30〜40%が冷却に使われる。AI用GPUは高熱を発するため、より強力な冷却が必要で、液体冷却や浸漬冷却への移行が進んでいるが、これ自体も追加の電力を必要とする。

### 1.2 具体的な数字：どれくらいの電力が必要か

IEA（国際エネルギー機関）の「Electricity 2026」レポートによると：

企業別では：

これらを合計すると、Big 4だけで日本の総発電量（約1,000TWh/年）の約10%を消費することになる。しかも、この増加率は加速の一途をたどっている。

### 1.3 なぜ「危機」なのか：送電網の限界

問題は電力の「量」だけではない。「場所」と「タイミング」だ。

米国では、バージニア州の「Data Cent

---

## 2026年「電気の奪い��い」が始まる、世界が見落とす日本の電源関連企業が持つ意外な優位性 - 日本個別株デューデリジェンスセンター
URL: https://sabatoashibuto.com/archives/40017/
公開日: 2026-04-29

2026年「電気の奪い合い」が始まる、世界が見落とす日本の電源関連企業が持つ意外な優位性 - 日本個別株デューデリジェンスセンター

MENU

銘柄さがし

銘柄さがし

# 2026年「電気の奪い合い」が始まる、世界が見落とす日本の電源関連企業が持つ意外な優位性

2026年4月29日

URLをコピーしました！

本記事の要点

- はじめに：株価が動く前に、何が起きているのかを掴む
- AIブームの本当のボトルネックは、半導体ではなく電気
- この記事で何が分かるか
- 「電気が足りない」は、もはや遠い未来の話ではない

マーケットアナリスト

「2026年「電気の奪い合い」が始まる、世界が見落とす日本の電」というテーマ、表面的なニュース以上に、需給面と業績面の両方で動く要因が揃っています。読み解く価値は大きいです。

投資リサーチャー

はじめに：株価が動く前に、何が起きているから終わ���にまで、論点を順に整理しています。投資家として何を判断材料にすべきかが具体的に見えてきます。

---

## はじめに：株価が動く前に、何が起きているのかを掴む

ここ数年、相場のテーマは目まぐるしく入れ替わってきました。半導体、生成AI、防衛、銀行株。次々と物色対象が変わるなか、しかし水面下で、もっと地味で、もっと長期に効いてくるテーマが静かに進行しています。

それが「電気の奪い合い」です。

## AIブームの本当のボトルネックは、半導体ではなく電気

生成AIの爆発的な普及は、エヌビディアのGPUが象徴的に語られがちです。ですが、ここ1〜2年、業界の関係者たちが本当に頭を抱えているのは別のところにあります。

それは、AIを動かすための「電気そのもの」が足りないという現実です。

国際エネルギー機関（IEA）は、世界のデータセンター・AI・暗号資産による電力消費量が、2022年の約460TWhから、2026年には最大1,050TWhに膨らむと試算しています。この1,050TWhという数字は、日本の年間総電力消費量とほぼ同規模です。

たった4年で、日本一国分の電力需要が「追加���される。

これは、いままでのデジタル化のトレンドとは桁が違います。

## この記事で何が分かるか

電力需要が膨らむ。そこまでは多くの投資家がなんとなく知っています。問題はその先です。

電気をどうやって増やすのか。誰がその電気をつくる設備を供給するのか。そして、その供給網のなかで、世界がいま静かに見落としている強者は誰なのか。

この記事では、AIインフラ相場の「中核」ではなく「裏側」にあたる電源関連企業を取り上げます。派手な半導体銘柄の陰で、世界中から受注が殺到し、納期が2030年代まで埋まりつつある日本企業群の話です。

読み終えたとき、ニュースの「データセンター投資〇兆円」という見出しを、別の角度から読めるようになるはずです。

## 「電気が足りない」は、もはや遠い未来の話ではない

電力需要の数字を、もう少し具体的に見ていきます。漠然とした「すごい」を、輪郭のある「すごい」に変えるためです。

## 数字で見る、需要の異常な伸び

日本国内の予測も衝撃的です。電力広域的運営推進機関の試算によると、データセンターと半���体工場の新増設による最大需要電力は、2034年度に2025年度比で約13倍になるとされています。

13倍です。2倍でも3倍でもなく、13倍。

世界規模でも事情は同じです。BCGの試算では、世界的なAI活用の拡大に伴って、国内のデータセンター需要は2030年には現状の2倍、2040年には9倍にまで高まるとみられています。

電力は、AIの「燃料」そのものになった。

この一文は、いまの相場を理解するうえで、いくつかのチャート分析より重要かもしれません。

## 米国ではすでに「電気の取り合い」が起きている

予兆はもう始まっています。

米独立系電力会社のタレン・エナジーは、2024年3月、ペンシルベニア州のデータセンターをアマゾン・ウェブ・サービス（AWS）に約940億円で売却しました。注目すべきは売却額ではなく、その立地です。

このデータセンターは、隣接する原子力発電所から直接、電力供給を受ける仕組みになっています。最終的に消費電力960メガワット規模、つまり約1ギガワットのデータセンターになる予定です。

つまり、こういうことです。

電気を欲しいハイテク企業が、電力���社の発電所そのものに張り付いて、出力を丸ごと押さえにかかっている。

## 需要の伸びに、供給は何年も追いつかない

ここに供給側の事情が重なります。

データセンターは早ければ2〜3年、長くても5年で建設できます。一方、新しい発電所や送電線の建設に

---

## The New Gold Rush: AI's Ravenous Appetite for Power Reshaping
URL: https://enmnews.com/2026/05/31/new-gold-rush-ais-ravenous-appetite-power-reshaping-corporate-america
公開日: 2026-05-31

The New Gold Rush: AI's Ravenous Appetite for Power Reshaping

Breaking

Louisiana Zoo's Long Road Back From Animal Escapes and Visitor Attacks Jury to decide fate of priest convicted in sexual assault case Manufacturing boom or mirage? Survey shows strength while jobs keep falling Pearl Abyss Takes Aim at Crimson Desert's Biggest Weak Spot: The Story Office Workers Are Flooding OpenAI's AI Platform Three Times Faster Than Coders Louisiana Zoo's Long Road Back From Animal Escapes and Visitor Attacks Jury to decide fate of priest convicted in sexual assault case Manufacturing boom or mirage? Survey shows strength while jobs keep falling Pearl Abyss Takes Aim at Crimson Desert's Biggest Weak Spot: The Story Office Workers Are Flooding OpenAI's AI Platform Three Times Faster Than Coders

Energy has suddenly become the hottest business asset in America. Companies from Ford to tech giants are racing to secure electricity as artificial intelligence demands reshape the power industry in ways not seen before.

The shift is striking. What was once treated as a cheap commodity that flowed invisibly through data centers is now a scarce, coveted resource. Major corporations are either racing into the energy business themselves or desperately hunting for power supplies to feed their AI infrastructure. The stakes are enormous: whoever secures reliable electricity wins the AI economy.

Ford just launched Ford Energy, a new subsidiary built around a $2 billion business focused on energy storage for data centers and large power users. The automaker called the move a response to "massive demand for domestic energy storage." Its stock hit a three-year high on the announcement.

Wall Street is betting heavily on the trend. Bloom Energy, once dismissed as a niche player, has seen its stock price soar more than 1,200% in the past year. GE Vernova booked $2.4 billion in electric equipment orders for data centers in the first quarter alone, more than its total equivalent sales for all of l

---

## Forget Nuclear: The Old-School Energy Source Quietly Winning the AI Power Race - 24/7 Wall St.
URL: https://247wallst.com/investing/2026/06/03/forget-nuclear-the-old-school-energy-source-quietly-winning-the-ai-power-race/
公開日: 2026-06-03
著者: Jeremy Phillips

Forget Nuclear: The Old-School Energy Source Quietly Winning the AI Power Race - 24/7 Wall St.

# Forget Nuclear: The Old-School Energy Source Quietly Winning the AI Power Race

By Jeremy Phillips Updated Jun 4, 6:25PM EDT · Published Jun 3, 7:04AM EDT

### Quick Read

KMI says 70% of future data center power demand runs on its assets, while GEV booked $2.4B in Q1 2026 data center equipment orders alone.

Appalachian producers AR and CNX both beat earnings expectations, reinforcing broad AI-driven demand tailwinds for natural gas producers.

U.S. electricity demand was effectively flat for 15 years while AI compute explodes into a grid that forgot how to grow.

Act now: the analyst who called NVIDIA in 2010 just named his top 10 AI stocks — and EQT didn't make the cut. Grab the names FREE today.

### How to Add Us to Google News

Sending You to Google News in 3

The AI power conversation is dominated by nuclear restarts and small modular reactor headlines. The electrons heating GPU racks today come from natural gas. I’ve been tracking the AI infrastructure buildout for over a year, and the picture keeps sharpening: gas is winning because it can be built behind the meter, at gigawatt scale, with build cycles measured in months.

Look at xAI’s COLOSSUS II, one of the world’s largest AI training data center clusters, powered by a self-built behind-the-meter gigawatt-scale natural gas power plant. Operators have explicitly said their ability to scale depends in part on continued access to natural gas supply at economically feasible prices, the availability of gas turbines and related equipment, and the maintenance of a regulatory environment that permits and supports the use of natural gas for large-scale power generation.

The macro setup is wild. U.S. electricity generation was effectively flat from 2008 to 2023 at a 0.1% CAGR, and growth between 2023 and 2025 has only modestly accelerated to under 3% annually. AI compute demand is exploding into a grid that forgot ho

---

## TIGER DAILY ALPHA｜ Jun 4: The Bottleneck Has Moved — Own the Megawatts, Fade the GPU
URL: https://princetonchen.substack.com/p/tiger-daily-alpha-jun-4-the-bottleneck
公開日: 2026-06-04
著者: Tiger Capital Research

TIGER DAILY ALPHA｜ Jun 4: The Bottleneck Has Moved — Own the Megawatts, Fade the GPU

SubscribeSign in

# TIGER DAILY ALPHA｜ Jun 4: The Bottleneck Has Moved — Own the Megawatts, Fade the GPU

Jun 04, 2026

15

1

Share

Jun 4: The Bottleneck Has Moved — Own the Megawatts, Fade the GPU

**Regime:** Stagflation-watch · AI capex *accelerating* while AI equities *saturate* · oil premium deflating on the overnight Israel–Lebanon ceasefire.

-----

## ① THE ONE THING

Broadcom guided AI revenue to **$16B next quarter** and a **$100B+ path to 2027** : and fell **13%**. The market still prices the GPU as the scarce asset. The binding constraint has already moved to **megawatts and memory**. Own the bottleneck; fade the compute that depends on it.

-----

## ② THE BOARD

Today: 2 new, 1 pass : the conviction is in the THEME below.*

**#1 · HEDGE / SHORT · SMH Jul put spread · ★★★☆☆ · NEW**

Semis are priced for perfection: AVGO −13% on a beat-and-raise, sector RSI 82, 28% above its 200-day. Defined-risk fade — and it doubles as the beta hedge for today’s theme basket.

**Entry** on the open · **Target** SMH → 50-day (~6–8% lower) · **Invalidation** SMH *closes above* Wed’s high, or AVGO recovers its gap · **Horizon** 2–4 wks · **Sizing** 0.5–0.75% risk. A hedge, not a naked short — the secular story is intact.

**#2 · LONG · CRWD Jul call spread (starter) · ★★☆☆☆ · NEW**

Beat top and bottom line, announced a 4-for-1 split, dumped ~9% on sector contagion into its 50-day. A quality overshoot, off-theme, small.

**Entry** at/near the 50-day · **Target** reclaim the 20-day · **Invalidation** daily close **< $620** · **Horizon** 1–3 wks · **Sizing** 0.5%. The soft guide is the real risk — a probe, not a position.

**PASS · Crude & energy.** Not chasing WTI $96 into an overnight ceasefire already bleeding the risk premium. Re-engage only on a *confirmed* Hormuz disruption, or WTI reclaiming **> $97 on a pullback**.

-----

## ③ THEME OF THE DAY → THE BOTTLENECK BASKET

**The them

---
