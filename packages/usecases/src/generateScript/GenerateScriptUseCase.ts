/**
 * GenerateScriptUseCase
 *
 * Claude API を呼び出してトピックから台本 YAML を生成し、
 * infographic を注入して input/{epId}.yaml に保存する。
 *
 * 原典: scripts/generate-script.ts の main IIFE。
 * I/O は全て Port 経由で注入されるため、テストでは Fake で完結する。
 */

import * as yaml from 'js-yaml';
import { DomainError, getErrorMessage } from '@money-video/shared-ts';
import { injectInfographics } from './injectInfographics';
import type { ScriptDoc } from './injectInfographics';
import { narrowDirective, narrowTopicResearch, narrowWinningPatterns } from './narrow';
import {
  SYSTEM_PROMPT,
  buildDirectiveInstructions,
  buildResearchContext,
  buildUserPrompt,
  buildWinningPatternsSection,
  estimateCostUsd,
} from './prompt';
import type {
  GenerateScriptDeps,
  GenerateScriptInput,
  GenerateScriptResult,
} from './ports';

const DEFAULT_MODEL = 'claude-sonnet-4-6';
const DEFAULT_MAX_TOKENS = 32_000;
/** トピック重複検出に使う過去エピソードの最大参照数 */
const PAST_EPISODES_LIMIT = 8;

export class GenerateScriptUseCase {
  constructor(private readonly deps: GenerateScriptDeps) {}

  async execute(input: GenerateScriptInput): Promise<GenerateScriptResult> {
    const { llm, knowledge, infographics, writer, logger, pastEpisodes } = this.deps;
    const {
      topic,
      epId,
      desc,
      researchFile,
      model = DEFAULT_MODEL,
      maxTokens = DEFAULT_MAX_TOKENS,
      outputPath,
    } = input;

    // 1. knowledge / research / past episodes のロード
    const [rawDirective, rawPatterns, rawTopicResearch, recentEpisodes] = await Promise.all([
      knowledge.loadDirective(),
      knowledge.loadWinningPatterns(),
      knowledge.loadTopicResearch(),
      pastEpisodes ? pastEpisodes.listRecent(epId, PAST_EPISODES_LIMIT) : Promise.resolve([]),
    ]);
    const directive = narrowDirective(rawDirective);
    const patterns = narrowWinningPatterns(rawPatterns);
    const topicResearch = narrowTopicResearch(rawTopicResearch);

    const researchContext = researchFile
      ? ((await knowledge.loadResearchFile(researchFile)) ?? '')
      : '';
    const topicResearchContext = buildResearchContext(topicResearch);

    // 2. プロンプト組み立て
    const directiveInstructions = buildDirectiveInstructions(directive);
    const winningPatternsSection = buildWinningPatternsSection(patterns);
    const userPrompt = buildUserPrompt({
      topic,
      desc,
      epId,
      directiveInstructions,
      researchContext,
      topicResearchContext,
      winningPatternsSection,
      pastEpisodes: recentEpisodes,
    });

    logger.info(
      {
        topic,
        epId,
        researchLoaded: researchContext.length,
        topicResearchLoaded: topicResearchContext.length,
        directiveLoaded: !!directive,
        patternsLoaded: !!patterns,
        pastEpisodesCount: recentEpisodes.length,
        model,
      },
      'generateScript: calling LLM',
    );

    // 3. LLM 呼び出し
    const startMs = Date.now();
    const completion = await llm.complete({
      system: SYSTEM_PROMPT,
      user: userPrompt,
      model,
      maxTokens,
    });
    const elapsedMs = Date.now() - startMs;
    const cacheReadTokens = completion.cacheReadTokens ?? 0;
    const cacheWriteTokens = completion.cacheWriteTokens ?? 0;
    const costUsd = estimateCostUsd(completion.inputTokens, completion.outputTokens, cacheReadTokens, cacheWriteTokens);

    logger.info(
      {
        inputTokens: completion.inputTokens,
        outputTokens: completion.outputTokens,
        cacheReadTokens,
        cacheWriteTokens,
        cacheHit: cacheReadTokens > 0,
        costUsd,
        elapsedMs,
      },
      'generateScript: LLM completed',
    );

    // 4. YAML parse
    let parsed: unknown;
    try {
      parsed = yaml.load(completion.text);
    } catch (err) {
      throw new DomainError(
        `LLM output is not valid YAML: ${getErrorMessage(err)}`,
        err,
      );
    }
    if (!parsed || typeof parsed !== 'object') {
      throw new DomainError('LLM output did not parse to an object');
    }

    // 5. infographic 注入
    const imagePaths = await infographics.listForEpisode(epId);
    const { doc: enrichedDoc, injectedCount } = injectInfographics(
      parsed as ScriptDoc,
      imagePaths,
    );

    const finalYaml =
      injectedCount > 0 ? yaml.dump(enrichedDoc, { lineWidth: -1, noRefs: true }) : completion.text;

    // 6. 書き出し
    await writer.write(outputPath, finalYaml);

    // 7. サマリ算出
    const doc = enrichedDoc as Record<string, unknown>;
    const title = typeof doc.title === 'string' ? doc.title : '';
    const chapters = Array.isArray(doc.chapters)
      ? (doc.chapters as Array<{ lines?: unknown[] }>)
      : [];
    const totalLines = chapters.reduce((s, c) => s + (c.lines?.length ?? 0), 0);

    logger.info(
      {
        outputPath,
        title,
        chapterCount: chapters.length,
        totalLines,
        infographicsInjected: injectedCount,
      },
      'generateScript: saved',
    );

    return {
      outputPath,
      title,
      chapterCount: chapters.length,
      totalLines,
      inputTokens: completion.inputTokens,
      outputTokens: completion.outputTokens,
      costUsd,
      elapsedMs,
      infographicsInjected: injectedCount,
    };
  }
}
