---
name: x-post-knowledge
description: X (Twitter) ポストURLを受け取り内容を取得・保存・検索するスキル。「このXを保存して」「X読み取って」「保存済みXを見せて」「X一覧」などで起動。URLが貼られたとき自動判定も可。
allowed-tools: Read, Write, Edit, Bash, Glob, Grep
---

# x-post-knowledge スキル

X (Twitter) のポスト URL から内容を取得し `knowledge/x-posts/` に蓄積する。
defuddle + FxTwitter API を使うため **X API キー・ログイン不要**。

## 呼び出しパターン

| ユーザー発言 | 動作 |
|------------|------|
| `https://x.com/...` を貼る | 自動検出 → 保存確認 → 取得 |
| `/x-post-knowledge <url>` | 即時取得・保存 |
| `/x-post-knowledge --list` | 保存済み一覧を表示 |
| `/x-post-knowledge --search <キーワード>` | 保存済みをキーワード検索 |
| `/x-post-knowledge --use` | 保存済みポストをトピック提案に活用 |

---

## フロー A: URL 取得・保存

### Step 1: URL 検出と確認

ユーザーが x.com または twitter.com の URL を貼ったら:

```
X ポストを知識として保存しますか？
  URL: {url}
  タグ（任意、カンマ区切り）: ___
  [y] 保存 / [n] スキップ
```

タグが未指定でも `y` なら続行。

### Step 2: スクリプト実行

```bash
cd packages/tech-geopolitics-channel
node_modules\.bin\ts-node.cmd --transpile-only scripts/fetch-x-post.ts \
  --url "{url}" \
  --tags "{タグ}"
```

Windows の場合は `node_modules\.bin\ts-node.cmd`、Mac/Linux は `../../node_modules/.bin/ts-node`。

### Step 3: 取得結果を表示

スクリプト出力から以下を抜き出してユーザーに報告:

```
✓ 保存完了
  投稿者 : {author}
  日付   : {created_at}
  タグ   : {tags}
  内容   : {text の最初 150 字}
  保存先 : knowledge/x-posts/{id}/metadata.json
```

---

## フロー B: 一覧表示 (`--list`)

```bash
# index.json を読んで表示
```

`knowledge/x-posts/index.json` を Read ツールで読み込み、以下の形式で表示:

```
保存済み X ポスト（{件数}件）

| # | 投稿者 | 日付 | タグ | 内容（先頭60字） |
|---|--------|------|------|-----------------|
| 1 | @xxx   | 2026-06-08 | 投資 | AIリメイク。箇条書き… |
...
```

---

## フロー C: キーワード検索 (`--search <keyword>`)

Grep ツールで `knowledge/x-posts/` を検索:

```
pattern: {keyword}
path: knowledge/x-posts/
glob: metadata.json
output_mode: content
```

ヒットした metadata.json のパスから id を取得 → 対象の内容を抜粋して表示。

---

## フロー D: トピック提案に活用 (`--use`)

1. `knowledge/x-posts/index.json` を Read で読み込む
2. 全ポストのテキストを結合してサマリを作成
3. 以下のコンテキストとして `research-topic` スキルに引き渡す:

```
# X ポストから得られたトレンド情報

{各ポストの author + text の要約}

上記 X トレンドを参考にして、チャンネルコンセプトに合うトピックを提案してください。
```

---

## 自動 URL 検出ルール

会話中に以下のパターンが含まれていたらこのスキルを自動起動:
- `https://x.com/` + `/status/` + 数字
- `https://twitter.com/` + `/status/` + 数字

ただし既にこのスキルが実行中の場合は二重起動しない。

---

## ファイル構造

```
knowledge/x-posts/
├── index.json                   # 全件インデックス（保存時に自動更新）
└── {post_id}/
    └── metadata.json            # id / author / title / text(md) / created_at / url / tags
```

## 関連コマンド

```bash
# 手動実行（スキル外から直接呼ぶ場合）
cd packages/tech-geopolitics-channel
npm run fetch-x -- --url "https://x.com/..." --tags "投資,NISA"
```

## 関連ファイル

| ファイル | 役割 |
|---------|------|
| `packages/tech-geopolitics-channel/scripts/fetch-x-post.ts` | 取得スクリプト本体 |
| `knowledge/x-posts/index.json` | 蓄積インデックス |
| `memory/x-posts-knowledge.md` | メモリポインタ |
| `.claude/skills/research-topic/SKILL.md` | トピック提案との連携先 |
