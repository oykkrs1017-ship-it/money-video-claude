# 学び: 新規ep は画像生成スクリプトを実行してからrenderする

日付: 2026-05-23
カテゴリ: スキルルール
関連スキル: video-render, remotion-still-check

## 状況
ep018（新規）のレンダリング時に `content/img_stock_market.png` と `content/img_ai_chip.png` が存在せず、
フレーム566付近でCancelledErrorが発生しレンダリング失敗。
verify-checklist.md には「infographic PNG が必要分存在」チェックがあるが、実行コマンドが書かれておらず確認漏れ。

## 齟齬の内容
- AI の判断: verify-checklist の画像チェックを「ls で件数確認」として実施（件数チェックのみ）
- ユーザーの意図（暗黙）: 画像ファイルが実際に全部揃っていること
- 差分の本質: チェックリストの「infographic PNG が必要分存在」は件数の話であり、`image` タイプで参照される `content/` 画像の存在チェックとは別物。スクリプトを実行したかどうかを確認していなかった。

## 学び
**新規epは以下の画像生成スクリプトをrenderの前に実行する：**

```bash
# 4. インフォグラフィック生成（必須 — 忘れるとrender失敗）
npx ts-node --transpile-only scripts/generate-infographics.ts --input input/epXXX.json

# 4.5 AI解説画像生成（台本に ai-infographic ビジュアルがある場合）
npx ts-node --transpile-only scripts/generate-ai-infographics.ts --input input/epXXX.json
```

また、`image` タイプで参照される `content/` 画像が全て存在するか確認するコマンド：

```bash
node -e "
const j=require('./input/script-input.json'),fs=require('fs'),m=[];
j.chapters.forEach(ch=>(ch.lines||[]).forEach(l=>{
  if(l.visual?.type==='image'&&l.visual?.src){
    const p='public/'+l.visual.src;
    if(!fs.existsSync(p))m.push(p);
  }
}));
console.log(m.length?'Missing:'+m.join(', '):'All images OK');
"
```

このコマンドが「All images OK」を返してからrenderすること。

## 適用先
- [ ] `.claude/rules/verify-checklist.md` の「4. infographic PNG 存在確認」セクションに、上記コマンドとimage参照チェックを追記
- [ ] CLAUDE.md のコマンド一覧「4. インフォグラフィック生成」の注記に「忘れるとrender失敗」を強調
