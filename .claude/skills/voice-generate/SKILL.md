---
name: voice-generate
description: 音声生成スキル。VOICEVOXで台本セリフからWAVを生成する。「音声を生成して」「ボイス作って」「VOICEVOX」で起動。
allowed-tools: Read, Bash, Glob
---

## 前提条件
- VOICEVOX エンジンが localhost:50021 で起動していること

## 実行手順
1. VOICEVOX疎通確認: `curl -s http://localhost:50021/version`
2. YAMLの場合JSON変換: `npx ts-node --transpile-only scripts/yaml-to-json.ts input/{epId}.yaml`
3. **YAML末尾チェック**: 末尾が `type: cta` セクションで終わっているか確認（生成が途中で切れていることがある）
4. 音声生成: `npx ts-node --transpile-only scripts/generate-voices.ts --input input/{epId}.json`
5. **script-input.json 再コピー（必須）**: 音声生成後にframeCount/audioDurationが付与されたJSONをコピー
   ```bash
   cp input/{epId}.json input/script-input.json
   ```
6. props更新: `cp input/{epId}.json output/{epId}_props.json`

> ⚠️ 手順5を忘れると script-input.json に frameCount が入らず Remotion が動画尺を0秒と認識する

## キャラクター
| キャラ | speakerId | 性格 |
|--------|-----------|------|
| maro   | 3         | 元気・語尾「〜のだ」 |
| ponchan| 2         | 明るい・丁寧 |

## ルール
- 生成されたWAVのdurationを検証（0秒はエラー）
- ファイル命名: `{連番4桁}_{キャラ名}.wav`
