import { describe, expect, it } from 'vitest';
import { buildTimeline } from './buildTimeline';
import type { ScriptInput } from '../episode/ScriptInput';

const FPS = 30;

function makeScript(overrides: Partial<ScriptInput> = {}): ScriptInput {
  return {
    videoId: 'ep-test',
    seed: 'ep-test',
    title: 'サンプル動画',
    description: '',
    tags: [],
    chapters: [
      {
        type: 'hook',
        duration: 10,
        lines: [
          { speaker: 'maro', text: 'hello', emotion: 'normal', frameCount: 60 },
          { speaker: 'ponchan', text: 'hi', emotion: 'normal', frameCount: 45 },
        ],
      },
      {
        type: 'explanation',
        duration: 10,
        lines: [
          {
            speaker: 'maro',
            text: 'body',
            emotion: 'normal',
            audioDuration: 2,
          },
        ],
      },
    ],
    chartData: {},
    ...overrides,
  };
}

describe('buildTimeline', () => {
  it('starts first line at titleFrames', () => {
    const script = makeScript();
    const result = buildTimeline(script, FPS);
    expect(result.timeline[0]?.startFrame).toBe(result.titleFrames);
  });

  it('computes titleFrames as max(fps*3, title.length*3 + fps)', () => {
    const shortTitle = buildTimeline(makeScript({ title: '短い' }), FPS);
    expect(shortTitle.titleFrames).toBe(FPS * 3);

    const longTitle = buildTimeline(
      makeScript({ title: 'あ'.repeat(50) }),
      FPS,
    );
    expect(longTitle.titleFrames).toBe(50 * 3 + FPS);
  });

  it('uses frameCount when present', () => {
    const script = makeScript();
    const result = buildTimeline(script, FPS);
    const first = result.timeline[0]!;
    expect(first.endFrame - first.startFrame).toBe(60);
  });

  it('falls back to audioDuration * fps + 5 buffer when frameCount absent', () => {
    const script = makeScript();
    const result = buildTimeline(script, FPS);
    const third = result.timeline[2]!;
    expect(third.endFrame - third.startFrame).toBe(Math.floor(2 * FPS) + 5);
  });

  it('falls back to 3s default when both frameCount and audioDuration absent', () => {
    const script = makeScript({
      chapters: [
        {
          type: 'hook',
          duration: 3,
          lines: [{ speaker: 'maro', text: 'x', emotion: 'normal' }],
        },
      ],
    });
    const result = buildTimeline(script, FPS);
    const first = result.timeline[0]!;
    expect(first.endFrame - first.startFrame).toBe(Math.floor(3 * FPS) + 5);
  });

  it('appends 2s tail to totalFrames', () => {
    const script = makeScript();
    const result = buildTimeline(script, FPS);
    const lastEnd = result.timeline[result.timeline.length - 1]!.endFrame;
    expect(result.totalFrames).toBe(lastEnd + FPS * 2);
  });

  it('chains chapterIndex/lineIndex correctly', () => {
    const script = makeScript();
    const result = buildTimeline(script, FPS);
    expect(result.timeline.map((e) => [e.chapterIndex, e.lineIndex])).toEqual([
      [0, 0],
      [0, 1],
      [1, 0],
    ]);
  });

  it('sets titleFrames=0 and starts first line at frame 0 when hideTitleCard is true', () => {
    const script = makeScript({ hideTitleCard: true });
    const result = buildTimeline(script, FPS);
    expect(result.titleFrames).toBe(0);
    expect(result.timeline[0]?.startFrame).toBe(0);
  });
});
