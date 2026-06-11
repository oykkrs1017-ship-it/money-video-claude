/**
 * scripts/lib/slide-assignment.ts
 *
 * assign-slides.ts のコアロジックを純粋関数として切り出したモジュール。
 * ファイルI/Oを行わず、データ変換のみを担当するためテスト可能。
 */

export interface SlideMapEntry {
  slideNum: number;
  slidePng: string;
  type: string;
  audioFile?: string;
  audioFiles?: string[];
  chapterIndex?: number;
}

/**
 * section エントリに chapterIndex を付与する（Step 1）。
 * 直後の visual エントリの audioFile から chapterIndex を推定し、
 * 見つからない場合は前の visual の chapterIndex + 1 をフォールバックとして使用。
 *
 * @param entries - 入力 slideMap（変更なし）
 * @param audioToChapterIndex - audioFile → chapterIndex マップ
 * @returns chapterIndex が付与された新しいエントリ配列
 */
export function assignSectionChapterIndices(
  entries: SlideMapEntry[],
  audioToChapterIndex: Map<string, number>,
): SlideMapEntry[] {
  const result = entries.map((e) => ({ ...e }));
  for (let i = 0; i < result.length; i++) {
    const entry = result[i]!;
    if (entry.type !== 'section') continue;
    if (entry.chapterIndex !== undefined) continue;

    const nextVisual = result.slice(i + 1).find((e) => e.type === 'visual' && e.audioFile);
    if (nextVisual?.audioFile) {
      entry.chapterIndex = audioToChapterIndex.get(nextVisual.audioFile) ?? 0;
    } else {
      const prevVisual = result
        .slice(0, i)
        .reverse()
        .find((e) => e.type === 'visual' && e.audioFile);
      const prevCi = prevVisual?.audioFile
        ? (audioToChapterIndex.get(prevVisual.audioFile) ?? 0)
        : 0;
      entry.chapterIndex = prevCi + 1;
    }
  }
  return result;
}

/**
 * cover / toc エントリを visual 化し audioFiles を付与する（Step 2）。
 * cover: hookAudioFiles の先頭2本
 * toc: hookAudioFiles の 3〜4本目
 *
 * @param entries - 入力 slideMap（変更なし）
 * @param hookAudioFiles - hook チャプターの audioFile リスト
 * @returns 変換後の新しいエントリ配列
 */
export function assignCoverTocAudioFiles(
  entries: SlideMapEntry[],
  hookAudioFiles: string[],
): SlideMapEntry[] {
  return entries.map((entry) => {
    if (entry.type !== 'cover' && entry.type !== 'toc') return { ...entry };
    if ((entry.audioFiles?.length ?? 0) > 0) return { ...entry };

    if (entry.type === 'cover') {
      const files = hookAudioFiles.slice(0, 2);
      if (files.length === 0) return { ...entry };
      return { ...entry, type: 'visual', audioFile: files[0], audioFiles: files };
    } else {
      const files = hookAudioFiles.slice(2, 4);
      if (files.length === 0) return { ...entry };
      return { ...entry, type: 'visual', audioFile: files[0], audioFiles: files };
    }
  });
}
