# ADR-001: Greenfield Redesign to Hexagonal Architecture

- **Status**: Accepted
- **Date**: 2026-04-21
- **Plan**: `~/.claude/plans/solid-ddd-luminous-phoenix.md`

## Context

現状のモノレポは8パッケージに分散している (`packages/pipeline`, `script-generator`, `script-reviewer`, `trend-extractor`, `shared`, `video-renderer`, `ai-money-shorts`, `tech-geopolitics-channel`) が、実働しているのは `tech-geopolitics-channel/` 一本のみ。Python側 (`pipeline/` など) は 2026-03-20 以降凍結、存在しない依存 (`audio-synthesizer`, `uploader`) を宣言したまま壊れている。TS側は3パッケージで型・コンポーネント・スクリプトを重複実装。

詳細な課題は `docs/baseline/deadcode-inventory-2026-04-21.md` に記録。

## Decision

Hexagonal Architecture (Ports & Adapters) に基づき、**同一リポジトリ内に並走配置**で段階移行する。

- `apps/cli/` と `apps/studio/` を新エントリポイント
- `packages/domain/` を Single Source of Truth に
- `packages/usecases/` にアプリケーションサービス
- `packages/adapters/` に外部I/O (VOICEVOX, Claude, YouTube, etc.)
- `packages/renderer/` に Remotion compositions（純粋UI）
- `episodes/epXXX/` にコンテンツ資産を隔離
- Python系パッケージは全廃し TypeScript に一本化
- `ai-money-shorts/` は Phase 3 冒頭で存廃判断

## Rationale

1. **SSOT確立**: `VariationEngine` と型定義の二重実装を物理的に不可能にする
2. **テスト容易性**: port/adapter 分離により usecase が Fake で完結テスト可能
3. **再現性**: `episodes/epXXX/spec.yaml` → artifacts/ の純粋変換、in-place mutation 廃止
4. **観測可能性**: pino + episodeID 相関で、LLMトークン・VOICEVOX合成秒数を追跡

## Phase Plan

- **Phase 0** (1-2日) — 地盤整備: 死骸棚卸し＋ベースライン化（本ADR作成で完了）
- **Phase 1** (1-2週) — 骨格導入: pnpm workspace化、`domain/` SSOT構築、Vitest回帰テスト
- **Phase 2** (2-3週) — UseCase/Adapter分離: `scripts/` 配下23ファイルを段階解体、Python系廃止
- **Phase 3** (2-3週) — 拡張機能再構築: E2E テスト、ルート大掃除、レガシー退役

## Gate Conditions

| Phase | ゲート条件 |
|---|---|
| 1 | `vitest run` 全緑 + 旧 `npm run generate` が従来通り動作 |
| 2 | 新CLI `pnpm cli run-pipeline --episode ep007` で ffprobe 尺が `docs/baseline/episodes-2026-04-21.md` と ±1フレーム以内一致 |
| 3 | Playwright E2E + CI lint/typecheck/test 全緑、ルート直下が `apps/ packages/ episodes/ assets/ knowledge/ docs/` のみ |

## Consequences

### Positive

- 型安全・テスト可能・再現可能な動画パイプライン
- 新LLMプロバイダ・新TTSバックエンド追加が1 adapter 実装で完結
- 新エピソード投入が `pnpm cli run-pipeline --episode epXXX` の一行に

### Negative

- 移行期間 5-8週間、その間は新旧2系統の並走コスト
- Python資産 (script-reviewer の fact-check ロジック等) は TypeScript で書き直し必要

### Neutral

- 既存 `tech-geopolitics-channel/` は Phase 3 まで**完全に稼働状態を維持**。ビッグバン書き換え禁止。

## References

- プランファイル: `~/.claude/plans/solid-ddd-luminous-phoenix.md`
- ベースライン: `docs/baseline/episodes-2026-04-21.md`
- 死骸棚卸し: `docs/baseline/deadcode-inventory-2026-04-21.md`
