# 検証チェックリスト

Claude は各ステップ完了後に**自分でコマンドを実行**して確認する。人間に委ねない。

## レンダリング前（must）

```bash
cd packages/tech-geopolitics-channel

# 1. 型チェック
npx tsc --noEmit

# 2. script-input.json が最新 ep と一致 かつ frameCount が入っているか確認
diff input/script-input.json input/ep$(ls input/ep*.json | sort | tail -1 | grep -oP 'ep\K[0-9]+').json && echo "OK" || echo "要 cp"
# frameCount チェック（undefinedなら音声生成後のJSONをコピーしていない）
node -e "const e=require('./input/script-input.json'); const fc=e.chapters[0].lines[0].frameCount; console.log(fc!==undefined?'frameCount OK: '+fc:'⚠️ frameCount undefined → cp input/epXXX.json input/script-input.json を実行')"

# 3. WAV 存在確認
ls public/voices/ep*.wav | wc -l

# 4. infographic PNG 存在確認（新規epは先に生成スクリプトを実行すること）
# 新規ep の場合は必ず事前に実行:
#   npx ts-node --transpile-only scripts/generate-infographics.ts --input input/epXXX.json
#   npx ts-node --transpile-only scripts/generate-ai-infographics.ts --input input/epXXX.json
ls public/images/ep*.png 2>/dev/null | wc -l

# 5. image/content ビジュアル参照ファイル確認（404でrender失敗するため必須）
node -e "const j=require('./input/script-input.json'),fs=require('fs'),m=[];j.chapters.forEach(ch=>(ch.lines||[]).forEach(l=>{if(l.visual?.type==='image'&&l.visual?.src){const p='public/'+l.visual.src;if(!fs.existsSync(p))m.push(p)}}));console.log(m.length?'Missing: '+m.join(', '):'All OK')"
```

- [ ] typecheck エラーゼロ
- [ ] script-input.json が対象 ep と同一
- [ ] WAV が台本セクション数以上存在
- [ ] infographic PNG が必要分存在（新規epは生成スクリプト実行済みか確認）
- [ ] Missing images がゼロ（「All OK」が出てからrender）

## Still 確認（3 フレーム）

詳細: `.claude/skills/remotion-still-check/SKILL.md`

```bash
npx remotion still src/index.ts MainVideo output/check_f{N}.png --props input/script-input.json --frame {N}
```

- [ ] フック（startFrame+30F 付近）
- [ ] 中盤チャート or インフォグラフィック
- [ ] アウトロ（最終セクション）

## Remotion プレビュー（レンダリング前）

**「レンダリングして」と言われても still 未確認の場合は先に still を実行する。並列指示があっても省略しない。**

1. still 3フレーム確認（下記 Still 確認セクション）
2. Remotion Studio をバックグラウンド起動: `node_modules/.bin/remotion studio src/index.ts --props=input/script-input.json`
3. `http://localhost:3000` をユーザーに共有
4. ユーザー確認後にレンダリング開始

> ⚠️ **SlidesVideo の Studio プレビューは HTML スライド PNG が白表示になる（2026-06-02 確認）**
> staticFile() 参照の PNG が Studio では遅延ロードされ白くなる。
> **SlidesVideo のスライド確認は必ず `remotion still` コマンドで行うこと。** Studio は URL 共有目的のみ。

## Chrome 拡張による UI 検証（アニメーション確認時のみ）

Still PNG では検知しづらい問題（レイアウト崩れ・アニメーション中間フレーム）を確認する。

**発火条件**: still では判断できないアニメーション確認時 / 「UI がおかしい」と言われた時 / 新しい Composition を追加した直後

```
http://localhost:3001/?compositionId=MainVideo&frame=30
```
`preview_screenshot` または Chrome 拡張の `computer` ツールでキャプチャ。

## Shorts レンダリング（ShortsVideo）

```bash
node_modules/.bin/remotion render src/index.ts ShortsVideo output/ep{N}_shorts.mp4 --props input/script-input.json --timeout 60000
```

Still 3点: f≈100（タイトル見切れ）/ f≈600（infographic+TopicBadge）/ f≈1700（RichPanel重なり）

## YouTube アップロード前（must）

```bash
ffprobe -v error -show_entries format=duration,size -of default=noprint_wrappers=1 output/ep{N}.mp4
ls output/thumbnail.jpeg || ls output/thumbnail.jpg
```

- [ ] duration が想定秒数 ±10%、size > 0
- [ ] サムネイル JPEG 存在
- [ ] YAML のタイトル・説明文を目視確認
