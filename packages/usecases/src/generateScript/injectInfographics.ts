/**
 * injectInfographics（純粋関数）
 *
 * Claude が出力した YAML ドキュメント（parse 済み）に、エピソード用の
 * infographic 画像を章レベル visuals として分配する。
 *
 * 原典: scripts/generate-script.ts:injectInfographics
 *
 * I/O（ファイルスキャン）は呼び出し側（InfographicResolver）が担当し、
 * ここでは「画像パス配列 + YAML ドキュメント → 更新済みドキュメント」という
 * 純粋な変換に徹する。
 */

export interface ChapterVisualImage {
  type: 'image';
  at: number;
  imageData: {
    src: string;
    caption: string;
    position: string;
    width: number;
    duration: number;
    animation: string;
  };
}

export interface ScriptDocChapter {
  type: string;
  topic?: string;
  duration?: number;
  visuals?: Array<Record<string, unknown>>;
  lines?: unknown[];
}

export interface ScriptDoc {
  chapters?: ScriptDocChapter[];
  [key: string]: unknown;
}

/** explanation / analysis 系チャプターに infographic を順番に差し込む */
const TARGET_CHAPTER_TYPES: ReadonlySet<string> = new Set(['explanation', 'analysis']);

export interface InjectInfographicsResult {
  doc: ScriptDoc;
  /** 実際に差し込んだ枚数 */
  injectedCount: number;
}

/**
 * @param doc        - Claude 出力を YAML parse した結果
 * @param imagePaths - 相対パス（例: "content/infographic_ep007_1.png"）の配列
 */
export function injectInfographics(
  doc: ScriptDoc,
  imagePaths: ReadonlyArray<string>,
): InjectInfographicsResult {
  if (imagePaths.length === 0) {
    return { doc, injectedCount: 0 };
  }

  const chapters = doc.chapters ?? [];
  // 対象チャプターのみ抽出（元の順序を保つ）
  const targetIndices = chapters
    .map((ch, idx) => ({ ch, idx }))
    .filter(({ ch }) => TARGET_CHAPTER_TYPES.has(ch.type));

  if (targetIndices.length === 0) {
    return { doc, injectedCount: 0 };
  }

  // immutable 更新: chapters 配列を新規作成し、該当要素のみ差し替える
  const newChapters = chapters.map((ch) => ({ ...ch }));
  let injected = 0;

  for (let i = 0; i < imagePaths.length && i < targetIndices.length; i++) {
    const { idx } = targetIndices[i]!;
    const src = imagePaths[i]!;
    const visual: ChapterVisualImage = {
      type: 'image',
      at: 0,
      imageData: {
        src,
        caption: '',
        position: 'center',
        width: 1400,
        duration: 20,
        animation: 'fade',
      },
    };
    const existing = newChapters[idx]!;
    newChapters[idx] = {
      ...existing,
      visuals: [...(existing.visuals ?? []), visual as unknown as Record<string, unknown>],
    };
    injected += 1;
  }

  return {
    doc: { ...doc, chapters: newChapters },
    injectedCount: injected,
  };
}
