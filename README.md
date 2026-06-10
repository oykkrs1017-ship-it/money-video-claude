# money-video-claude

テクノロジー投資×地政学 YouTube チャンネルの動画自動生成モノレポ。
台本生成（Claude API）→ 音声合成（VOICEVOX）→ HTMLスライド/インフォグラフィック → 動画レンダリング（Remotion）→ YouTube 公開、までを一気通貫で自動化する。

## セットアップ

```bash
# 前提: Node.js >= 20 / VOICEVOX（localhost:50021）/ packages/.env に各種APIキー
npm ci                 # 全 workspace の依存を一括インストール
npm run typecheck      # 全パッケージ型チェック
npm test               # 全パッケージテスト（外部API不要・モック済み）
```

> 音声 WAV（`public/voices/`）・HTMLスライド PNG・`output/` は git 管理外（再生成可能）。
> 過去エピソードを再レンダリングする場合は音声生成と `npm run html:generate` を先に実行する。

## パッケージ構成

| パッケージ | 役割 |
|---|---|
| `packages/domain` | Zod スキーマ・ドメイン型・純粋関数（依存は zod のみ） |
| `packages/shared-ts` | Logger / Env / エラー基盤 |
| `packages/shared` | directive-manager（`knowledge/directive.yaml` SoT 読込） |
| `packages/adapters` | 外部I/O: Claude API / VOICEVOX / YouTube / Exa |
| `packages/usecases` | ビジネスロジック（GenerateScript / GenerateVoice / Publish） |
| `packages/tech-geopolitics-channel` | メイン: CLI パイプライン + Remotion コンポジション |
| `packages/_archived/` | 廃止パッケージ（履歴保全のみ） |

## エピソード制作（基本フロー）

```bash
cd packages/tech-geopolitics-channel
npm run new-ep              # トピック選定→台本→音声→画像生成まで一括
npm run new-ep:render       # さらに MP4 レンダリングまで
```

個別ステップ・SlidesVideo パイプライン・アップロード手順は [CLAUDE.md](CLAUDE.md) を参照。
運用ルール詳細は `.claude/rules/`、制作方針の SoT は `knowledge/directive.yaml`。

## CI

GitHub Actions（`.github/workflows/ci.yml`）が push / PR で typecheck + 全テストを実行する。
レンダリング・音声合成は CI では行わない（ローカル専用）。
