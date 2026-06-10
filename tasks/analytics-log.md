# YouTube Analytics ログ（自動生成）

> このファイルは `scripts/update-analytics-log.ts` により上書きされる。
> 初回実行後は自動的に最新の KPI テーブルに置き換わる。

## 実行方法

```bash
cd packages/tech-geopolitics-channel
# API 経由で最新値を取得 → 上書き
npx ts-node --transpile-only scripts/update-analytics-log.ts

# ローカルの scorecards からだけ再描画（API コストなし）
npx ts-node --transpile-only scripts/update-analytics-log.ts --skip-fetch
```

## KPI 目標（3ヶ月後）

- CTR: **7.0%** 以上
- 平均視聴維持率: **60.0%** 以上
- 平均視聴時間: **6m00s** 以上

（初回 `scripts/update-analytics-log.ts` 実行後、このプレースホルダーは
 エピソード別テーブル + 集計セクションで上書きされる）
