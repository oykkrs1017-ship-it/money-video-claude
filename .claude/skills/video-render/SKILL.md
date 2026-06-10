---
name: video-render
description: 動画レンダリングスキル。Remotionで台本JSONからMP4を生成する。「レンダリングして」「動画生成」「MP4作って」で起動。
allowed-tools: Read, Bash, Glob, Edit
---

## 実行手順
1. **既存Remotionサーバーの確認・停止**:
   ```bash
   netstat -ano | grep ":300[01]" | grep LISTENING
   # 不要なプロセスがあれば: powershell -Command "Stop-Process -Id {PID} -Force"
   ```
2. `input/script-input.json` を確認（frameCountが入っているか検証）:
   ```bash
   node -e "const e=require('./input/script-input.json'); console.log(e.chapters[0].lines[0].frameCount)"
   # 数値が出ればOK、undefinedなら音声生成後のJSONをまだコピーしていない
   # 必ず「音声生成完了後」に cp input/epXXX.json input/script-input.json を実行すること
   # （音声生成前にコピーすると frameCount=0 → Remotionが3000フレーム程度と誤認する）
   ```
3. TypeScriptコンパイルチェック: `npx tsc --noEmit`
4. 音声WAVの存在確認（欠けているとサイレント動画）
5. プレビュー確認（必須）: `npx remotion studio src/index.ts --port 3000`
   - ユーザー承認を得てからレンダリングへ進む
6. `npx remotion render src/index.ts MainVideo output/{epId}.mp4 --concurrency=4`

## ルール
- レンダリング前に必ず TypeScript コンパイルチェック
- フレーム数は Math.floor() + 5フレームバッファ
- VariationEngine を通すこと（BAN回避）
- **プレビュー→ユーザー承認→レンダリング** の順番を厳守（承認前にレンダリング開始禁止）
- `--props` フラグは Root.tsx の静的 import を上書きしない。script-input.json を更新することで反映する

## Remotion 残り時間推計の特性（ユーザーへの説明必須）

**序盤（0〜5%）は推計が不安定**。フォント読み込み（NotoSansJP: 1116リクエスト×並列数分）が完了するまで fps が低く、残り時間が「増える」ように見える。

```
典型パターン:
  frame 100: 残り 40分（フォント読み込み中・遅い）
  frame 150: 残り 22分（フォント完了・急加速）
  frame 300: 残り 27分（重いセクション・再び遅化）
  frame 600: 残り 26分（安定）
  frame 10000: 残り 12分（後半加速）
```

ユーザーに「残り時間が増えてる」と言われたら: **「序盤の推計は不安定です。5〜10%以降で安定します」** と説明する。
「やり直して」と言われても、既に `--concurrency 4` かつ 5% 未満なら再実行しても同じ結果になる。
