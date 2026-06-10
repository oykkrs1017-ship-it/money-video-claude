# 動画尺ルール（目標 8〜11 分）

> SoT: `knowledge/directive.yaml` → `tech_geopolitics.script_rules.length`。数値変更は directive.yaml を編集。

## 原則

本編は **8〜11 分・55〜65 セリフ** を目標とする。15〜20 分の長尺は禁止。

## 根拠（自チャンネル実データ 2026-05-28）

| 尺 | リテンション | 評価 |
|----|------|------|
| 10:47（円安160円） | **26.9%** | 最良 |
| 17:36（新NISA92%） | 8.93% | 崩壊 |
| 17:33（台湾封鎖） | 13.3% | 崩壊 |
| 12:49（量子） | 18.6% | 低 |

平均視聴時間は長尺でも 2.4〜2.7 分で頭打ち。**尺を伸ばしても視聴されず、リテンション率（アルゴリズム評価指標）を下げるだけ**。冗長な引き延ばしが離脱の最大要因。

## 実装箇所

- 台本生成プロンプト: `packages/usecases/src/generateScript/prompt.ts`
  - SYSTEM_PROMPT のチャプター構成（hook 1.5〜2分 / explanation 2.5〜3分 / analysis 3〜3.5分 / summary 1〜1.5分 / cta 30秒）
  - buildUserPrompt 必須ルール6「55〜65セリフ必須」

## 運用

- 深掘りが必要な大テーマは**複数エピソードに分割**する。1 本に詰め込まない。
- 各本は単一の核心に集中させる（密度を保ったまま短く）。
- Shorts は別途 hook チャプターから自動生成（`render-shorts.ts` / new-episode --render の Step 6）。

## 関連
- `.claude/rules/topic-selection.md` — トピック選定
- `.claude/rules/hook-structure.md` — フック30秒構造
