/**
 * knowledge/directive.yaml の script_rules ブロックの Zod スキーマ。
 *
 * directive.yaml は人間が編集する運用データなので、script_rules は「あれば検証して使う・
 * 不正なら drop してフォールバック」という partial 運用にする（読み込み失敗で台本生成全体を
 * 止めない）。検証は narrowDirective が safeParse 経由で行う。
 */

import { z } from 'zod';

export const ScriptRulesLengthSchema = z
  .object({
    duration_min: z.number().positive(),
    lines_min: z.number().int().positive(),
    lines_max: z.number().int().positive(),
  })
  .refine((v) => v.lines_max >= v.lines_min, {
    message: 'lines_max must be >= lines_min',
  });

export const ScriptRulesTitleSchema = z.object({
  patterns: z.array(z.string()).min(1),
  keyword_list: z.array(z.string()).min(1),
});

export const ScriptRulesHookSchema = z.object({
  total_sec: z.number().positive(),
  layers: z.array(z.string()).min(1),
});

export const ScriptRulesVisualSchema = z.object({
  rich_panel_policy: z.string(),
  diagram_first: z.boolean(),
  min_diagram_ratio: z.number().min(0).max(1),
  allowed_diagram_types: z.array(z.string()).min(1),
});

export const ScriptRulesOriginalitySchema = z.object({
  // 独自視点（ニュース要約から自動導出できない解釈）を analysis に最低 N 個
  unique_viewpoint_min: z.number().int().min(0),
  // 一次データに基づく自前の試算（worked example）を最低 N 個
  worked_example_min: z.number().int().min(0),
  // 想定反論への応答を入れるか
  require_counterargument: z.boolean(),
  // 直近 ep と同一の言い回し・数字提示フォーマットを避ける
  avoid_template_phrasing: z.boolean(),
});

export const ScriptRulesSchema = z.object({
  length: ScriptRulesLengthSchema,
  title: ScriptRulesTitleSchema,
  hook: ScriptRulesHookSchema,
  visual: ScriptRulesVisualSchema,
  // Inauthentic Content Policy 対策（任意・あれば台本生成に反映）
  originality: ScriptRulesOriginalitySchema.optional(),
});

export type ScriptRules = z.infer<typeof ScriptRulesSchema>;
