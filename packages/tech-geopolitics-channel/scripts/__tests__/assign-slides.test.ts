import { describe, expect, it } from 'vitest';
import {
  assignSectionChapterIndices,
  assignCoverTocAudioFiles,
  type SlideMapEntry,
} from '../lib/slide-assignment';

// ─── assignSectionChapterIndices ──────────────────────────────────────────────

describe('assignSectionChapterIndices', () => {
  it('assigns chapterIndex from the next visual entry audioFile', () => {
    const entries: SlideMapEntry[] = [
      { slideNum: 1, slidePng: 'slide-001.png', type: 'section' },
      { slideNum: 2, slidePng: 'slide-002.png', type: 'visual', audioFile: 'ep001_ch1_l1.wav' },
    ];
    const map = new Map<string, number>([['ep001_ch1_l1.wav', 2]]);

    const result = assignSectionChapterIndices(entries, map);

    expect(result[0]?.chapterIndex).toBe(2);
    expect(result[1]?.chapterIndex).toBeUndefined();
  });

  it('uses fallback (prevCi + 1) when no following visual exists', () => {
    const entries: SlideMapEntry[] = [
      { slideNum: 1, slidePng: 'slide-001.png', type: 'visual', audioFile: 'ep001_ch2_l1.wav' },
      { slideNum: 2, slidePng: 'slide-002.png', type: 'section' },
    ];
    const map = new Map<string, number>([['ep001_ch2_l1.wav', 3]]);

    const result = assignSectionChapterIndices(entries, map);

    expect(result[1]?.chapterIndex).toBe(4);
  });

  it('uses chapterIndex 1 as fallback when no prev visual exists and no next visual exists', () => {
    const entries: SlideMapEntry[] = [
      { slideNum: 1, slidePng: 'slide-001.png', type: 'section' },
    ];

    const result = assignSectionChapterIndices(entries, new Map());

    expect(result[0]?.chapterIndex).toBe(1);
  });

  it('does not overwrite an already-set chapterIndex', () => {
    const entries: SlideMapEntry[] = [
      { slideNum: 1, slidePng: 'slide-001.png', type: 'section', chapterIndex: 5 },
      { slideNum: 2, slidePng: 'slide-002.png', type: 'visual', audioFile: 'ep001_ch0_l1.wav' },
    ];
    const map = new Map<string, number>([['ep001_ch0_l1.wav', 0]]);

    const result = assignSectionChapterIndices(entries, map);

    expect(result[0]?.chapterIndex).toBe(5);
  });

  it('does not mutate the input array', () => {
    const entries: SlideMapEntry[] = [
      { slideNum: 1, slidePng: 'slide-001.png', type: 'section' },
      { slideNum: 2, slidePng: 'slide-002.png', type: 'visual', audioFile: 'ep001_ch1_l1.wav' },
    ];
    const map = new Map<string, number>([['ep001_ch1_l1.wav', 1]]);

    assignSectionChapterIndices(entries, map);

    expect(entries[0]?.chapterIndex).toBeUndefined();
  });
});

// ─── assignCoverTocAudioFiles ─────────────────────────────────────────────────

describe('assignCoverTocAudioFiles', () => {
  const hookAudioFiles = ['hook1.wav', 'hook2.wav', 'hook3.wav', 'hook4.wav'];

  it('converts cover entry to visual with first 2 hook audioFiles', () => {
    const entries: SlideMapEntry[] = [
      { slideNum: 1, slidePng: 'slide-001.png', type: 'cover' },
    ];

    const result = assignCoverTocAudioFiles(entries, hookAudioFiles);

    expect(result[0]?.type).toBe('visual');
    expect(result[0]?.audioFile).toBe('hook1.wav');
    expect(result[0]?.audioFiles).toEqual(['hook1.wav', 'hook2.wav']);
  });

  it('converts toc entry to visual with hook audioFiles 3-4', () => {
    const entries: SlideMapEntry[] = [
      { slideNum: 1, slidePng: 'slide-001.png', type: 'toc' },
    ];

    const result = assignCoverTocAudioFiles(entries, hookAudioFiles);

    expect(result[0]?.type).toBe('visual');
    expect(result[0]?.audioFile).toBe('hook3.wav');
    expect(result[0]?.audioFiles).toEqual(['hook3.wav', 'hook4.wav']);
  });

  it('does not convert cover when hookAudioFiles is empty', () => {
    const entries: SlideMapEntry[] = [
      { slideNum: 1, slidePng: 'slide-001.png', type: 'cover' },
    ];

    const result = assignCoverTocAudioFiles(entries, []);

    expect(result[0]?.type).toBe('cover');
    expect(result[0]?.audioFile).toBeUndefined();
  });

  it('does not convert toc when hookAudioFiles has fewer than 3 entries', () => {
    const entries: SlideMapEntry[] = [
      { slideNum: 1, slidePng: 'slide-001.png', type: 'toc' },
    ];

    const result = assignCoverTocAudioFiles(entries, ['hook1.wav', 'hook2.wav']);

    expect(result[0]?.type).toBe('toc');
  });

  it('does not overwrite cover with existing audioFiles', () => {
    const entries: SlideMapEntry[] = [
      {
        slideNum: 1,
        slidePng: 'slide-001.png',
        type: 'cover',
        audioFiles: ['existing.wav'],
        audioFile: 'existing.wav',
      },
    ];

    const result = assignCoverTocAudioFiles(entries, hookAudioFiles);

    expect(result[0]?.audioFile).toBe('existing.wav');
    expect(result[0]?.type).toBe('cover');
  });

  it('leaves non-cover/toc entries unchanged', () => {
    const entries: SlideMapEntry[] = [
      { slideNum: 1, slidePng: 'slide-001.png', type: 'visual', audioFile: 'visual1.wav' },
      { slideNum: 2, slidePng: 'slide-002.png', type: 'section', chapterIndex: 0 },
    ];

    const result = assignCoverTocAudioFiles(entries, hookAudioFiles);

    expect(result[0]?.type).toBe('visual');
    expect(result[0]?.audioFile).toBe('visual1.wav');
    expect(result[1]?.type).toBe('section');
  });

  it('does not mutate the input array', () => {
    const entries: SlideMapEntry[] = [
      { slideNum: 1, slidePng: 'slide-001.png', type: 'cover' },
    ];

    assignCoverTocAudioFiles(entries, hookAudioFiles);

    expect(entries[0]?.type).toBe('cover');
    expect(entries[0]?.audioFile).toBeUndefined();
  });
});
