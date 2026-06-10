/**
 * injectInfographics（純粋関数）のユニットテスト
 */

import { describe, expect, it } from 'vitest';
import { injectInfographics } from './injectInfographics';
import type { ScriptDoc } from './injectInfographics';

function buildDoc(): ScriptDoc {
  return {
    title: 'T',
    chapters: [
      { type: 'hook', lines: [] },
      { type: 'explanation', lines: [] },
      { type: 'explanation', lines: [] },
      { type: 'analysis', lines: [] },
      { type: 'summary', lines: [] },
      { type: 'cta', lines: [] },
    ],
  };
}

describe('injectInfographics', () => {
  it('imagePaths が空なら doc をそのまま返し injectedCount=0', () => {
    const doc = buildDoc();
    const { doc: out, injectedCount } = injectInfographics(doc, []);
    expect(injectedCount).toBe(0);
    expect(out).toBe(doc);
  });

  it('explanation / analysis チャプターのみに差し込む（hook/summary/cta には入らない）', () => {
    const doc = buildDoc();
    const paths = ['content/a.png', 'content/b.png', 'content/c.png'];
    const { doc: out, injectedCount } = injectInfographics(doc, paths);
    expect(injectedCount).toBe(3);

    const chapters = out.chapters!;
    expect(chapters[0]!.visuals).toBeUndefined(); // hook
    expect(chapters[1]!.visuals).toHaveLength(1); // explanation 1
    expect(chapters[2]!.visuals).toHaveLength(1); // explanation 2
    expect(chapters[3]!.visuals).toHaveLength(1); // analysis
    expect(chapters[4]!.visuals).toBeUndefined(); // summary
    expect(chapters[5]!.visuals).toBeUndefined(); // cta
  });

  it('対象チャプター数より多い画像は余りを捨てる', () => {
    const doc = buildDoc(); // explanation×2 + analysis×1 = 3 target
    const paths = ['a.png', 'b.png', 'c.png', 'd.png', 'e.png'];
    const { injectedCount } = injectInfographics(doc, paths);
    expect(injectedCount).toBe(3);
  });

  it('画像が少なければ対象チャプターの先頭から埋める', () => {
    const doc = buildDoc();
    const { doc: out, injectedCount } = injectInfographics(doc, ['only.png']);
    expect(injectedCount).toBe(1);
    const chapters = out.chapters!;
    expect(chapters[1]!.visuals).toHaveLength(1);
    expect(chapters[2]!.visuals).toBeUndefined();
    expect(chapters[3]!.visuals).toBeUndefined();
  });

  it('既存の visuals を温存して末尾に追加する', () => {
    const doc: ScriptDoc = {
      chapters: [
        {
          type: 'explanation',
          visuals: [{ type: 'keyword', at: 0 } as Record<string, unknown>],
          lines: [],
        },
      ],
    };
    const { doc: out, injectedCount } = injectInfographics(doc, ['content/new.png']);
    expect(injectedCount).toBe(1);
    const visuals = out.chapters![0]!.visuals!;
    expect(visuals).toHaveLength(2);
    expect((visuals[0] as Record<string, unknown>).type).toBe('keyword');
    expect((visuals[1] as Record<string, unknown>).type).toBe('image');
  });

  it('image visual は仕様通りの形（duration=20, width=1400, animation=fade）', () => {
    const doc = buildDoc();
    const { doc: out } = injectInfographics(doc, ['content/x.png']);
    const visual = out.chapters![1]!.visuals![0] as Record<string, unknown>;
    expect(visual.type).toBe('image');
    expect(visual.at).toBe(0);
    const imageData = visual.imageData as Record<string, unknown>;
    expect(imageData.src).toBe('content/x.png');
    expect(imageData.position).toBe('center');
    expect(imageData.width).toBe(1400);
    expect(imageData.duration).toBe(20);
    expect(imageData.animation).toBe('fade');
  });

  it('元 doc を mutate しない（immutable）', () => {
    const doc = buildDoc();
    const originalSnap = JSON.parse(JSON.stringify(doc));
    injectInfographics(doc, ['content/x.png']);
    expect(doc).toEqual(originalSnap);
  });

  it('対象チャプターが 1 つもなければ何もしない', () => {
    const doc: ScriptDoc = {
      chapters: [
        { type: 'hook', lines: [] },
        { type: 'summary', lines: [] },
      ],
    };
    const { doc: out, injectedCount } = injectInfographics(doc, ['a.png']);
    expect(injectedCount).toBe(0);
    expect(out).toBe(doc);
  });
});
