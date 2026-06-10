import { z } from 'zod';

// ── 基本型 ──────────────────────────────────────────────────────────────

const characterIDSchema = z.enum(['pon', 'maro'] as const, {
  error: 'キャラクターIDは "pon" か "maro" である必要があります',
});

const expressionSchema = z.enum(
  ['normal', 'happy', 'surprised', 'thinking', 'angry', 'smug', 'sad', 'excited'] as const,
  { error: '表情が不正です' }
);

const emotionSchema = z.enum(
  ['neutral', 'excited', 'calm', 'serious', 'playful'] as const,
  { error: '感情が不正です' }
);

const animationSchema = z.enum(
  ['fade-in', 'slide-up', 'slide-left', 'bounce', 'typewriter', 'scale-up'] as const
);

const graphTypeSchema = z.enum(['bar', 'line', 'pie', 'comparison'] as const);

const graphDataPointSchema = z.object({
  label: z.string(),
  value: z.number(),
  color: z.string().optional(),
  unit: z.string().optional(),
});

// ── VisualElement discriminated union ──────────────────────────────────
//
// 各 type ごとに必要なフィールドのみを持つため、
// 型安全な switch 分岐が可能になる

const telopVisualSchema = z.object({
  type: z.literal('telop'),
  content: z.string().min(1),
  position: z.enum(['center', 'top', 'bottom', 'left', 'right'] as const).optional(),
  animation: animationSchema.optional(),
});

const graphVisualSchema = z.object({
  type: z.literal('graph'),
  /** グラフのタイトル（省略可） */
  title: z.string().optional(),
  graphType: graphTypeSchema,
  graphData: z.array(graphDataPointSchema).min(1),
});

const imageVisualSchema = z.object({
  type: z.literal('image'),
  /** public/ 以下の相対パス（例: "images/ep001/0.jpg"） */
  imagePath: z.string().min(1),
  caption: z.string().optional(),
  /** Pexels 帰属表示用 URL */
  imageCredit: z.string().optional(),
  /** Pexels 検索クエリ（デバッグ・再取得用） */
  imageSearchQuery: z.string().optional(),
  animation: animationSchema.optional(),
});

const dataCardVisualSchema = z.object({
  type: z.literal('data-card'),
  label: z.string().min(1),
  value: z.string().min(1),
  unit: z.string().optional(),
  subtext: z.string().optional(),
});

const quizChoiceVisualSchema = z.object({
  type: z.literal('quiz-choice'),
  choices: z.array(z.string()).min(2).max(4),
  /** 正解インデックス（0始まり） */
  correctIndex: z.number().int().min(0),
  question: z.string().optional(),
});

const rankingItemVisualSchema = z.object({
  type: z.literal('ranking-item'),
  rank: z.number().int().min(1).max(10),
  label: z.string().min(1),
  value: z.string().optional(),
  description: z.string().optional(),
});

const richPanelVisualSchema = z.object({
  type: z.literal('rich-panel'),
  title: z.string().min(1),
  body: z.string().min(1),
  icon: z.string().optional(),
  emphasis: z.string().optional(),
  points: z.array(z.string()).optional(),
  number: z.number().int().min(1).max(9).optional(),
});

const statVisualSchema = z.object({
  type: z.literal('stat'),
  value: z.string().min(1),
  label: z.string().min(1),
  subtext: z.string().optional(),
});

const multiStatItemSchema = z.object({
  label: z.string().min(1),
  value: z.string().min(1),
  unit: z.string().optional(),
  subtext: z.string().optional(),
  color: z.string().optional(),
});

const multiStatVisualSchema = z.object({
  type: z.literal('multi-stat'),
  /** 複数の統計値を横並びで表示。A vs B 比較などに最適 */
  title: z.string().optional(),
  stats: z.array(multiStatItemSchema).min(2).max(4),
});

const versusCardItemSchema = z.object({
  name: z.string().min(1),
  detail: z.string().min(1),
  score: z.number().min(0).max(100).optional(),
});

const versusSideSchema = z.object({
  label: z.string().min(1),
  color: z.string(),
  score: z.number().min(0).max(100).optional(),
  items: z.array(versusCardItemSchema).min(1).max(5),
});

const versusCardVisualSchema = z.object({
  type: z.literal('versus-card'),
  /** カード上部のタイトル */
  title: z.string().optional(),
  left: versusSideSchema,
  right: versusSideSchema,
});

const stepFlowVisualSchema = z.object({
  type: z.literal('step-flow'),
  title: z.string().optional(),
  steps: z
    .array(
      z.object({
        label: z.string().min(1),
        detail: z.string().optional(),
      })
    )
    .min(2)
    .max(5),
});

const timelineVisualSchema = z.object({
  type: z.literal('timeline'),
  title: z.string().optional(),
  items: z
    .array(
      z.object({
        label: z.string().min(1),
        value: z.string().optional(),
        detail: z.string().optional(),
      })
    )
    .min(2)
    .max(6),
});

const flowChartNodeSchema = z.object({
  label: z.string().min(1),
  detail: z.string().optional(),
  /** ノード形状: start=角丸大, process=長方形, decision=ひし形, end=角丸強調 */
  nodeType: z.enum(['start', 'process', 'decision', 'end'] as const).optional(),
});

const flowChartVisualSchema = z.object({
  type: z.literal('flow-chart'),
  title: z.string().optional(),
  /** 上から順に矢印で接続されるノード。2〜5個 */
  nodes: z.array(flowChartNodeSchema).min(2).max(5),
});

const infographicPointSchema = z.object({
  icon: z.string().optional(),
  text: z.string().min(1),
  /** accentColorで強調したい語句 */
  highlight: z.string().optional(),
});

const infographicVisualSchema = z.object({
  type: z.literal('infographic'),
  /** メインの大きな数字・見出し */
  headline: z.object({
    label: z.string().min(1),
    value: z.string().min(1),
    unit: z.string().optional(),
  }),
  /** 支持データ・ポイント（2〜4個） */
  points: z.array(infographicPointSchema).min(1).max(4),
  footnote: z.string().optional(),
});

export const visualElementSchema = z.discriminatedUnion('type', [
  telopVisualSchema,
  graphVisualSchema,
  imageVisualSchema,
  dataCardVisualSchema,
  quizChoiceVisualSchema,
  rankingItemVisualSchema,
  richPanelVisualSchema,
  statVisualSchema,
  multiStatVisualSchema,
  versusCardVisualSchema,
  stepFlowVisualSchema,
  timelineVisualSchema,
  flowChartVisualSchema,
  infographicVisualSchema,
]);

// ── DialogueLine ─────────────────────────────────────────────────────

const dialogueLineSchema = z.object({
  id: z.string().regex(/^line-\d{3,}$/, 'IDは "line-001" 形式である必要があります'),
  character: characterIDSchema,
  text: z.string().min(1, 'セリフが空です').max(50, 'セリフは50文字以内にしてください'),
  expression: expressionSchema,
  emotion: emotionSchema,
  voiceSpeedScale: z.number().min(0.5).max(2.0).optional(),
  voicePitchScale: z.number().min(-0.15).max(0.15).optional(),
  /** 音声ファイルパス（generate-voice.ts が付与） */
  audioFile: z.string().optional(),
  /** 音声長ミリ秒（generate-voice.ts が付与） */
  audioDurationMs: z.number().positive().optional(),
  /** フレーム数（build-episode.ts が付与） */
  durationFrames: z.number().positive().int().optional(),
});

// ── Section ──────────────────────────────────────────────────────────

const sectionSchema = z.object({
  id: z.string().regex(/^section-\d{2,}$/, 'セクションIDは "section-01" 形式である必要があります'),
  name: z.string().min(1, 'セクション名が空です'),
  /** セクションのロール（hook / explanation / data / conclusion / cta） */
  role: z.enum(['hook', 'explanation', 'data', 'conclusion', 'cta'] as const).optional(),
  lines: z.array(dialogueLineSchema).min(1, 'セクションに最低1行のセリフが必要です'),
  visuals: z.array(visualElementSchema).min(1, '各セクションに最低1つのビジュアル要素が必要です'),
  /** セクション専用 BGM（省略時は bgmMap から自動選択） */
  bgm: z.string().optional(),
  sfx: z
    .array(
      z.object({
        timing: z.union([z.enum(['start', 'end'] as const), z.number()]),
        file: z.string(),
      })
    )
    .optional(),
  backgroundColor: z.string().optional(),
});

// ── Episode ──────────────────────────────────────────────────────────

const episodeMetadataSchema = z.object({
  createdAt: z.string(),
  scriptVersion: z.number().int().positive(),
  aiDisclosure: z.string().min(1),
  affiliateLinks: z
    .array(z.object({ service: z.string(), url: z.string().url() }))
    .optional(),
});

export const compositionTypeSchema = z.enum(
  [
    'TypeA-Mystery',
    'TypeB-Ranking',
    'TypeC-Versus',
    'TypeD-Quiz',
    'TypeE-Story',
    'TypeF-NewsFlash',
    'TypeG-MythBuster',
  ] as const,
  { error: '構成タイプが不正です' }
);

export const episodeSchema = z.object({
  id: z.string().regex(/^ep-[\w-]+$/, 'エピソードIDの形式が不正です'),
  title: z.string().min(1).max(100),
  description: z.string().min(1),
  tags: z.array(z.string()).min(1),
  compositionType: compositionTypeSchema,
  topic: z.string().min(1),
  /** トピックカテゴリ（ analytics 分類用） */
  topicCategory: z
    .enum([
      'saving',
      'nisa-ideco',
      'investment-basics',
      'ai-tech',
      'economy',
      'real-estate',
      'tax',
      'lifestyle',
    ] as const)
    .optional(),
  sections: z.array(sectionSchema).min(1).max(12),
  totalDurationMs: z.number().positive().optional(),
  totalDurationFrames: z.number().positive().int().optional(),
  /** VariationEngine に渡す seed（省略時は id を使用） */
  variationSeed: z.string().optional(),
  metadata: episodeMetadataSchema,
});

// ── 型エクスポート（z.infer が source of truth） ──────────────────────

export type Episode = z.infer<typeof episodeSchema>;
export type Section = z.infer<typeof sectionSchema>;
export type DialogueLine = z.infer<typeof dialogueLineSchema>;
export type VisualElement = z.infer<typeof visualElementSchema>;
export type CompositionType = z.infer<typeof compositionTypeSchema>;
export type EpisodeMetadata = z.infer<typeof episodeMetadataSchema>;

// discriminated union の各ブランチ型
export type TelopVisual = z.infer<typeof telopVisualSchema>;
export type GraphVisual = z.infer<typeof graphVisualSchema>;
export type ImageVisual = z.infer<typeof imageVisualSchema>;
export type DataCardVisual = z.infer<typeof dataCardVisualSchema>;
export type QuizChoiceVisual = z.infer<typeof quizChoiceVisualSchema>;
export type RankingItemVisual = z.infer<typeof rankingItemVisualSchema>;
export type RichPanelVisual = z.infer<typeof richPanelVisualSchema>;
export type StatVisual = z.infer<typeof statVisualSchema>;
export type MultiStatVisual = z.infer<typeof multiStatVisualSchema>;
export type VersusCardVisual = z.infer<typeof versusCardVisualSchema>;
export type StepFlowVisual = z.infer<typeof stepFlowVisualSchema>;
export type TimelineVisual = z.infer<typeof timelineVisualSchema>;
export type FlowChartVisual = z.infer<typeof flowChartVisualSchema>;
export type InfographicVisual = z.infer<typeof infographicVisualSchema>;

// ── バリデーション関数 ──────────────────────────────────────────────

export function validateEpisode(
  data: unknown
): { success: true; data: Episode } | { success: false; errors: string[] } {
  const result = episodeSchema.safeParse(data);
  if (result.success) return { success: true, data: result.data };
  const errors = result.error.issues.map(
    (issue) => `[${issue.path.join('.')}] ${issue.message}`
  );
  return { success: false, errors };
}
