# 学び: ts-node はパッケージディレクトリ内で実行しないとパスが解決されない
日付: 2026-04-25
カテゴリ: 個別の学び
関連スキル: video-render, voice-generate

## 状況
サムネイル単体設定スクリプトを `/tmp/set_thumbnail.ts` に書いて
`cd packages/tech-geopolitics-channel && npx ts-node /tmp/...` で実行したが、
`@money-video/adapters/youtube` が解決できず失敗した。

## 齟齬の内容
- AI の判断: `/tmp` に書いても `cd` でパッケージディレクトリに移動すれば tsconfig の paths が効く
- ユーザーの意図（実際の挙動）: ts-node は **スクリプトファイルの場所** を基準に tsconfig を探すため、`/tmp` 以下のファイルは `packages/tech-geopolitics-channel/tsconfig.json` の paths を参照しない
- 差分の本質: CWD ではなくスクリプトファイルのディレクトリが tsconfig 探索の起点になる

## 学び
- モノレポで `@money-video/*` 系のパスエイリアスを使うスクリプトは、**必ずそのパッケージの `scripts/` ディレクトリに置いて実行する**
- 一時スクリプトでも `/tmp` に書かず `scripts/` 配下に作成 → 実行後に削除（または恒久化）する
- `npx ts-node --transpile-only scripts/xxx.ts` のパターンを守る

## 適用先
- [ ] CLAUDE.md の「コマンド」セクションに注記追加（一時スクリプトも scripts/ に置くこと）

---

## 追記 2026-04-29: upload-youtube.ts は tsconfig-paths/register が必要

`upload-youtube.ts` が `@money-video/shared/scorecard`（サブパスエイリアス）を使っており、
`--transpile-only` 単独では解決できない。`tsconfig-paths` を install して以下のコマンドが必要:

```bash
npx ts-node -r tsconfig-paths/register --transpile-only scripts/upload-youtube.ts output/epNNN.mp4 --input input/epNNN.yaml --thumbnail "output/thumbnail.jpeg"
```

`tsconfig-paths` は `npm install tsconfig-paths` で install 済み（2026-04-29）。
