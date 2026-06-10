---
paths:
  - "packages/tech-geopolitics-channel/scripts/generate-voices*"
  - "packages/tech-geopolitics-channel/input/**"
---
# VOICEVOX 音声生成ルール

## キャラクター設定
- まろくん (maro): speakerId = 3（ノーマル）
- ぽんちゃん (ponchan): speakerId = 2（ノーマル）
- speedScale: 1.0（標準速度。地政学・固有名詞頻出テーマの認知負荷を抑える）
- 各セリフの後に0.3秒の無音バッファ

## 発音修正
- `m` → `メートル`
- `%` → `パーセント`
- `km` → `キロメートル`
- 大きな数字は `1兆2000億` のように漢数字混じりで書く
