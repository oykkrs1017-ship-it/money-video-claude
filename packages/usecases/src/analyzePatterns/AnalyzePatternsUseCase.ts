/**
 * AnalyzePatternsUseCase
 *
 * 競合コーパスから「勝ちパターン」を抽出し knowledge/winning-patterns.json に保存する。
 *
 * フロー:
 *   1. コーパスから全動画メタデータを読み込む
 *   2. 再生数でソートして上位 topN 件を抽出
 *   3. タイトル・フック・サムネイルを LLM で分析
 *   4. 統合インサイトを生成
 *   5. winning-patterns.json に保存
 */

import type {
  AnalyzePatternsDeps,
  AnalyzePatternsInput,
  AnalyzePatternsResult,
  ThumbnailPattern,
  WinningPatterns,
} from './ports';

const DEFAULT_TOP_N = 50;

export class AnalyzePatternsUseCase {
  private readonly deps: AnalyzePatternsDeps;

  constructor(deps: AnalyzePatternsDeps) {
    this.deps = deps;
  }

  async execute(input: AnalyzePatternsInput): Promise<AnalyzePatternsResult> {
    const {
      corpusDir,
      outputPath,
      topN = DEFAULT_TOP_N,
      dryRun = false,
    } = input;

    const { corpusReader, patternAnalyzer, patternStore } = this.deps;

    // ─── 1. コーパス読み込み ─────────────────────────────────────────────────
    const allVideos = corpusReader.loadAll(corpusDir);

    if (allVideos.length === 0) {
      throw new Error(
        'コーパスが空です。fetch-competitor-corpus スクリプトを先に実行してください',
      );
    }

    // ─── 2. 上位 N 件を抽出 ──────────────────────────────────────────────────
    const sortedVideos = [...allVideos]
      .filter((v) => v.views !== null)
      .sort((a, b) => (b.views ?? 0) - (a.views ?? 0));
    const topVideos = sortedVideos.slice(0, Math.min(topN, sortedVideos.length));
    const topViewsThreshold = topVideos.at(-1)?.views ?? 0;

    // ─── 3. 分析（並列実行）─────────────────────────────────────────────────
    const [titleAnalysis, hookAnalysis, thumbnailAnalysis] = await Promise.all([
      patternAnalyzer.analyzeTitles(topVideos, dryRun),
      patternAnalyzer.analyzeHooks(topVideos, corpusDir, dryRun),
      patternAnalyzer.analyzeThumbnails(topVideos, corpusDir, dryRun),
    ]);

    // ─── 4. 統合インサイト ───────────────────────────────────────────────────
    const synthesis = await patternAnalyzer.synthesizeInsights(
      titleAnalysis,
      hookAnalysis,
      thumbnailAnalysis,
      topVideos,
      dryRun,
    );

    // ─── 5. 構造化データ構築 ─────────────────────────────────────────────────
    const titleData = safeParseJson<{
      titleTypes?: Array<Record<string, unknown>>;
      recommendedTemplates?: string[];
      avoidPatterns?: string[];
    }>(titleAnalysis, {});

    const hookData = safeParseJson<{
      hookTypes?: Array<Record<string, unknown>>;
      recommendedHookTemplates?: string[];
    }>(hookAnalysis, {});

    const thumbData = safeParseJson<ThumbnailPattern>(thumbnailAnalysis, {
      colorScheme: '不明',
      textDensity: '不明',
      composition: '不明',
      facesPresent: false,
      numberHighlight: true,
      commonElements: [],
      avoidElements: [],
    });

    const VALID_TITLE_TYPES = new Set([
      'question', 'number', 'negative', 'proper_noun', 'urgency', 'other',
    ]);

    const patterns: WinningPatterns = {
      analyzedAt: new Date().toISOString(),
      totalVideosAnalyzed: topVideos.length,
      topViewsThreshold,
      titlePatterns: (Array.isArray(titleData.titleTypes) ? titleData.titleTypes : []).map((t) => {
        const rawType = typeof t['type'] === 'string' ? t['type'] : '';
        return {
          type: (VALID_TITLE_TYPES.has(rawType)
            ? rawType
            : 'other') as WinningPatterns['titlePatterns'][number]['type'],
          label: (t['description'] as string) ?? '',
          examples: Array.isArray(t['examples']) ? (t['examples'] as string[]) : [],
          frequency: typeof t['frequency'] === 'number' ? t['frequency'] : 0,
          avgViews: 0,
        };
      }),
      hookPatterns: (Array.isArray(hookData.hookTypes) ? hookData.hookTypes : []).map((h) => ({
        type: (h['type'] as string) ?? 'other',
        label: (h['description'] as string) ?? '',
        description: (h['description'] as string) ?? '',
        examples: Array.isArray(h['examples']) ? (h['examples'] as string[]) : [],
        frequency: 0,
      })),
      thumbnailPatterns: {
        colorScheme: thumbData.colorScheme ?? '不明',
        textDensity: thumbData.textDensity ?? '不明',
        composition: thumbData.composition ?? '不明',
        facesPresent: thumbData.facesPresent ?? false,
        numberHighlight: thumbData.numberHighlight ?? true,
        commonElements: thumbData.commonElements ?? [],
        avoidElements: thumbData.avoidElements ?? [],
      },
      structureInsights: synthesis.structureInsights,
      recommendedHooks: [
        ...(hookData.recommendedHookTemplates ?? []),
        ...synthesis.recommendedHooks,
      ],
      avoidPatterns: [
        ...(titleData.avoidPatterns ?? []),
        ...synthesis.avoidPatterns,
      ],
      rawAnalysis: {
        titleAnalysis,
        hookAnalysis,
        thumbnailAnalysis,
      },
    };

    // ─── 6. 保存 ─────────────────────────────────────────────────────────────
    if (!dryRun) {
      patternStore.save(outputPath, patterns);
    }

    return {
      totalVideosAnalyzed: topVideos.length,
      outputPath,
    };
  }
}

function safeParseJson<T>(text: string, fallback: T): T {
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) return fallback;
  try {
    const parsed = JSON.parse(match[0]) as unknown;
    // パース結果が object でない場合は fallback を使用
    if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
      return fallback;
    }
    return parsed as T;
  } catch {
    // LLM が不正 JSON を返した場合は fallback を返す（呼び出し元がログ出力）
    return fallback;
  }
}
