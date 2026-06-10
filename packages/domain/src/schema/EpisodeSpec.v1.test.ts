import { describe, expect, it } from 'vitest';
import { EpisodeSpecV1Schema } from './EpisodeSpec.v1';

const validSpec = {
  videoId: 'ep007',
  seed: 'ep007-seed',
  title: 'タイトル',
  description: '説明',
  tags: ['tech', 'geopolitics'],
  chapters: [
    {
      type: 'hook',
      duration: 10,
      lines: [{ speaker: 'maro', text: 'hello', emotion: 'normal' }],
    },
  ],
  chartData: {
    sample: {
      title: 'サンプル',
      chartType: 'bar',
      data: [{ label: 'A', value: 10 }],
    },
  },
};

describe('EpisodeSpecV1Schema', () => {
  it('accepts a minimal valid spec', () => {
    expect(() => EpisodeSpecV1Schema.parse(validSpec)).not.toThrow();
  });

  it('rejects unknown speaker', () => {
    const bad = {
      ...validSpec,
      chapters: [
        {
          ...validSpec.chapters[0],
          lines: [{ speaker: 'unknown', text: 'x', emotion: 'normal' }],
        },
      ],
    };
    expect(() => EpisodeSpecV1Schema.parse(bad)).toThrow();
  });

  it('accepts legacy chartData as array', () => {
    const spec = {
      ...validSpec,
      chartData: {
        legacy: [{ label: 'A', value: 10 }],
      },
    };
    expect(() => EpisodeSpecV1Schema.parse(spec)).not.toThrow();
  });

  it('rejects bgmVolume out of 0..1 range', () => {
    expect(() =>
      EpisodeSpecV1Schema.parse({ ...validSpec, bgmVolume: 1.5 }),
    ).toThrow();
  });

  it('accepts a rich-panel visual with required fields', () => {
    const spec = {
      ...validSpec,
      chapters: [
        {
          type: 'explanation',
          duration: 10,
          lines: [
            {
              speaker: 'ponchan',
              text: 'x',
              emotion: 'normal',
              visual: {
                type: 'rich-panel',
                title: 'AI投資',
                body: '本文',
                points: ['a', 'b'],
              },
            },
          ],
        },
      ],
    };
    expect(() => EpisodeSpecV1Schema.parse(spec)).not.toThrow();
  });
});
