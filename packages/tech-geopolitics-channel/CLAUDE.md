# CLAUDE.md - プロジェクト作業ルール

## プロジェクト概要
テクノロジー投資×地政学のYouTubeチャンネル動画を自動生成するパイプライン。
Remotion + VOICEVOX + まろくん＆ぽんちゃんの掛け合い形式。

## 動画制作フロー
1. `input/script-input.json` を編集（or 別途Claudeで台本生成）
2. `npm run generate -- --input ./input/script-input.json` を実行
3. `output/` に完成MP4が出力される

## コーディングルール
- Remotion best-practicesに従う（Agent Skillsを参照）
- アニメーションは必ず `frame / fps` ベースで計算（elapsedTime禁止）
- spring() と interpolate() を積極活用
- 音声durationの計算にはWAVヘッダーから直接読み取る（Python不要）
- フレーム数は Math.floor() で必ず整数化し、+5フレームのバッファを追加

## BAN回避ルール（最重要）
- VariationEngineを必ず通す。seed値が異なれば全て異なる見た目になること
- 静止画スライドショーにしない。全ての画面要素に最低1つのアニメーションを付ける
- キャラクターは常にアイドルアニメーション（呼吸）をしていること
- チャートやデータは必ずナレーションと同期してアニメーションすること

## VOICEVOXの設定
- まろくん (maro): speakerId = 3（ノーマル）
- ぽんちゃん (ponchan): speakerId = 2（ノーマル）
- speedScale: 1.15（やや速め）
- 各セリフの後に0.3秒の無音バッファ
