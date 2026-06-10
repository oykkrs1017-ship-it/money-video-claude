# 学び: このモノレポのCLI/ロジック分離パターン

日付: 2026-05-09
カテゴリ: 個別の学び
関連スキル: generate-ep

## 状況

`scripts/generate-script.ts` にプロンプトがあると想定して `Select-String` で検索したが
パターンにマッチしなかった。実際のプロンプトは `packages/usecases/src/generateScript/prompt.ts`
に完全移設されていた。

## 齟齬の内容

- AI の判断: CLIスクリプト内にプロンプト文字列が定義されているはず
- 実際の構造: `scripts/` はCLI引数パース + DI配線のみ。ロジックは `packages/` に分離済み
- 差分の本質: モノレポへのリファクタリング後の構造を把握していなかった

## このプロジェクトの構造マップ

```
scripts/generate-script.ts        ← 薄いCLIラッパー（引数パース・DI配線）
  ↓ 呼び出す
packages/usecases/src/generateScript/
  ├── GenerateScriptUseCase.ts     ← ユースケース本体
  ├── prompt.ts                    ← SYSTEM_PROMPT / buildUserPrompt
  └── ports.ts                     ← インターフェース定義

packages/adapters/                 ← 外部連携実装（Anthropic API, FS, Exa等）
packages/shared-ts/               ← 共通ユーティリティ（logger等）
```

## 学び

**このプロジェクトで `scripts/` 内のファイルを修正しても効果がない場合が多い。**
コアロジック（プロンプト・ビジネスロジック）の変更は `packages/usecases/` を先に確認する。

検索の優先順位:
1. `packages/usecases/src/{機能名}/` を先に確認
2. `scripts/` は引数パースのみと想定
3. `packages/adapters/` は外部I/O実装

## 適用先
- [ ] `generate-ep` スキルのリソースファイルに構造マップを追記する
