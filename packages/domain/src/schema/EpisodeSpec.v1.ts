import { z } from 'zod';

export const SpeakerSchema = z.enum(['maro', 'ponchan']);

export const EmotionSchema = z.enum([
  'normal',
  'happy',
  'surprised',
  'thinking',
  'serious',
  'sad',
]);

export const ChapterTypeSchema = z.enum([
  'hook',
  'explanation',
  'explanation_2',
  'analysis',
  'analysis_2',
  'summary',
  'cta',
  'chapter',
  'outro',
]);

export const ChartTypeSchema = z.enum(['line', 'bar', 'pie', 'area']);

export const SlideLayoutSchema = z.enum([
  'bullets',
  'compare',
  'numbers',
  'quote',
  'steps',
  'highlight',
]);

export const ImagePositionSchema = z.enum([
  'top-left',
  'top-right',
  'top-center',
  'center-right',
  'center',
]);

export const ImageAnimationSchema = z.enum([
  'fade',
  'slide-right',
  'slide-left',
  'zoom',
]);

export const SlideCompareColumnSchema = z.object({
  label: z.string(),
  color: z.string().optional(),
  items: z.array(z.string()),
});

export const SlideNumberSchema = z.object({
  value: z.string(),
  label: z.string(),
  subtext: z.string().optional(),
});

export const MetricSchema = z.object({
  key: z.string(),
  value: z.string(),
});

export const CompareItemSchema = z.object({
  label: z.string(),
  value: z.string().optional(),
  subtext: z.string().optional(),
  color: z.string().optional(),
  items: z.array(z.string()).optional(),
});

export const TimelineEventSchema = z.object({
  year: z.string(),
  label: z.string(),
  description: z.string().optional(),
  highlight: z.boolean().optional(),
  color: z.string().optional(),
});

export const VisualSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('chart'),
    key: z.string(),
    chartType: ChartTypeSchema.optional(),
    title: z.string().optional(),
  }),
  z.object({
    type: z.literal('image'),
    src: z.string().optional(),
    url: z.string().optional(),
    caption: z.string().optional(),
    position: ImagePositionSchema.optional(),
    width: z.number().optional(),
    duration: z.number().optional(),
    animation: ImageAnimationSchema.optional(),
  }),
  z.object({
    type: z.literal('slide'),
    layout: SlideLayoutSchema.optional(),
    title: z.string().optional(),
    bullets: z.array(z.string()).optional(),
    highlight: z.string().optional(),
    subtext: z.string().optional(),
    quote: z.string().optional(),
    attribution: z.string().optional(),
    numbers: z.array(SlideNumberSchema).optional(),
    left: SlideCompareColumnSchema.optional(),
    right: SlideCompareColumnSchema.optional(),
    color: z.string().optional(),
  }),
  z.object({
    type: z.literal('stat'),
    value: z.string(),
    label: z.string(),
    subtext: z.string().optional(),
    metrics: z.array(MetricSchema).optional(),
  }),
  z.object({ type: z.literal('highlight'), text: z.string() }),
  z.object({ type: z.literal('keyword'), text: z.string() }),
  z.object({
    type: z.literal('timeline'),
    events: z.array(TimelineEventSchema),
    title: z.string().optional(),
    activeIndex: z.number().optional(),
    scrollSpeed: z.number().optional(),
  }),
  z.object({
    type: z.literal('split'),
    left: CompareItemSchema,
    right: CompareItemSchema,
    title: z.string().optional(),
  }),
  z.object({
    type: z.literal('rich-panel'),
    number: z.number().optional(),
    title: z.string(),
    icon: z.string().optional(),
    body: z.string().optional(),
    emphasis: z.string().optional(),
    points: z.array(z.union([z.string(), z.object({ text: z.string(), body: z.string().optional(), value: z.string().optional(), unit: z.string().optional(), source: z.string().optional() })])).optional(),
    color: z.string().optional(),
  }),
  z.object({
    type: z.literal('graph-catalog'),
    title: z.string().optional(),
    subtitle: z.string().optional(),
    sections: z.array(z.object({
      heading: z.string(),
      color: z.string().optional(),
      charts: z.array(z.object({
        name: z.string(),
        description: z.string().optional(),
        chartHint: z.enum(['pie', 'bar', 'line', 'scatter', 'heatmap']).optional(),
      })),
    })),
    tips: z.array(z.string()).optional(),
    decisions: z.array(z.object({
      label: z.string(),
      highlight: z.boolean().optional(),
    })).optional(),
  }),
  z.object({
    type: z.literal('z-layout'),
    title: z.string().optional(),
    rules: z.array(z.object({
      number: z.number(),
      heading: z.string(),
      description: z.string().optional(),
    })),
    diagramLabels: z.object({
      tl: z.string().optional(),
      tr: z.string().optional(),
      bl: z.string().optional(),
      br: z.string().optional(),
      center: z.string().optional(),
    }).optional(),
  }),
  z.object({
    type: z.literal('number-context'),
    title: z.string().optional(),
    before: z.object({
      label: z.string(),
      value: z.string(),
      description: z.string().optional(),
    }),
    after: z.object({
      label: z.string(),
      metrics: z.array(z.object({
        key: z.string(),
        value: z.string(),
        highlight: z.boolean().optional(),
      })),
      description: z.string().optional(),
    }),
  }),
  z.object({
    type: z.literal('fact-insight'),
    title: z.string().optional(),
    bad: z.object({
      label: z.string(),
      items: z.array(z.string()),
    }),
    good: z.object({
      label: z.string(),
      items: z.array(z.string()),
    }),
    tip: z.string().optional(),
  }),
  z.object({
    type: z.literal('audience-table'),
    title: z.string().optional(),
    rows: z.array(z.object({
      icon: z.string().optional(),
      role: z.string(),
      interests: z.array(z.string()),
      metrics: z.array(z.string()),
    })),
  }),
  z.object({
    type: z.literal('pyramid'),
    title: z.string(),
    direction: z.enum(['up', 'down']).optional(),
    layers: z.array(z.object({
      label: z.string(),
      sublabel: z.string().optional(),
      value: z.string().optional(),
    })),
    footer: z.string().optional(),
  }),
  z.object({
    type: z.literal('venn'),
    title: z.string(),
    sets: z.array(z.object({
      label: z.string(),
      items: z.array(z.string()).optional(),
      color: z.string().optional(),
    })),
    overlapLabel: z.string().optional(),
    footer: z.string().optional(),
  }),
  z.object({
    type: z.literal('map'),
    title: z.string(),
    region: z.enum(['asia', 'world', 'japan']),
    points: z.array(z.object({
      label: z.string(),
      x: z.number(),
      y: z.number(),
      highlight: z.boolean().optional(),
      note: z.string().optional(),
    })),
    routes: z.array(z.object({
      from: z.number(),
      to: z.number(),
      label: z.string().optional(),
    })).optional(),
    footer: z.string().optional(),
  }),
  z.object({
    type: z.literal('data-table'),
    title: z.string(),
    subtitle: z.string().optional(),
    labelHeader: z.string().optional(),
    columns: z.array(z.union([
      z.string(),
      z.object({ label: z.string(), color: z.string().optional(), highlight: z.boolean().optional() }),
    ])),
    rows: z.array(z.object({
      label: z.string(),
      labelColor: z.string().optional(),
      cells: z.array(z.union([
        z.string(),
        z.object({ value: z.string(), color: z.string().optional(), bold: z.boolean().optional() }),
      ])),
    })),
    maxRowsPerSlide: z.number().optional(),
    note: z.string().optional(),
  }),
]);

export const ScriptLineSchema = z.object({
  speaker: SpeakerSchema,
  text: z.string(),
  emotion: EmotionSchema,
  audioFile: z.string().optional(),
  audioDuration: z.number().optional(),
  frameCount: z.number().optional(),
  visual: VisualSchema.optional(),
  se: z.string().optional(),
});

export const ChapterSchema = z.object({
  type: ChapterTypeSchema,
  duration: z.number(),
  lines: z.array(ScriptLineSchema),
  topic: z.string().optional(),
});

export const ChartDataPointSchema = z.object({
  label: z.string(),
  value: z.number(),
  color: z.string().optional(),
});

export const ChartDataSetSchema = z.object({
  title: z.string().optional(),
  chartType: ChartTypeSchema.optional(),
  data: z.array(ChartDataPointSchema),
});

export const BgmMapSchema = z.object({
  hook: z.string().optional(),
  explanation: z.string().optional(),
  analysis: z.string().optional(),
  summary: z.string().optional(),
  cta: z.string().optional(),
});

export const EpisodeSpecV1Schema = z.object({
  videoId: z.string(),
  seed: z.string(),
  title: z.string(),
  description: z.string(),
  tags: z.array(z.string()),
  chapters: z.array(ChapterSchema),
  chartData: z.record(
    z.string(),
    z.union([ChartDataSetSchema, z.array(ChartDataPointSchema)]),
  ),
  bgm: z.string().optional(),
  bgmVolume: z.number().min(0).max(1).optional(),
  bgmMap: BgmMapSchema.optional(),
  seVolume: z.number().min(0).max(1).optional(),
});

export type EpisodeSpecV1 = z.infer<typeof EpisodeSpecV1Schema>;
