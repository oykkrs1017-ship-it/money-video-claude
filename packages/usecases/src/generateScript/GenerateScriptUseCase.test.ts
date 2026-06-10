/**
 * GenerateScriptUseCase のユニットテスト
 *
 * 全 Port を Fake に差し替えてネットワーク・ファイルシステム非依存で検証する。
 */

import { describe, expect, it } from 'vitest';
import * as yaml from 'js-yaml';
import type { Logger } from '@money-video/shared-ts';
import { GenerateScriptUseCase } from './GenerateScriptUseCase';
import type {
  InfographicResolver,
  KnowledgeRepository,
  LlmClient,
  LlmCompletion,
  PastEpisodeSummary,
  PastEpisodesResolver,
  ScriptYamlWriter,
} from './ports';

// ---------- Fakes ----------

class FakeLlmClient implements LlmClient {
  readonly calls: Array<{ system: string; user: string; model: string; maxTokens: number }> = [];
  constructor(private readonly response: LlmCompletion) {}
  async complete(input: {
    system: string;
    user: string;
    model: string;
    maxTokens: number;
  }): Promise<LlmCompletion> {
    this.calls.push(input);
    return this.response;
  }
}

class FakeKnowledge implements KnowledgeRepository {
  readonly researchLoads: string[] = [];
  constructor(
    private readonly directive: Record<string, unknown> | null = null,
    private readonly patterns: Record<string, unknown> | null = null,
    private readonly research: string | null = null,
  ) {}
  async loadDirective(): Promise<Record<string, unknown> | null> {
    return this.directive;
  }
  async loadWinningPatterns(): Promise<Record<string, unknown> | null> {
    return this.patterns;
  }
  async loadResearchFile(relativePath: string): Promise<string | null> {
    this.researchLoads.push(relativePath);
    return this.research;
  }
  async loadTopicResearch(): Promise<Record<string, unknown> | null> {
    return null;
  }
}

class FakePastEpisodes implements PastEpisodesResolver {
  constructor(private readonly episodes: PastEpisodeSummary[] = []) {}
  async listRecent(_excludeEpId: string, _limit: number): Promise<PastEpisodeSummary[]> {
    return [...this.episodes];
  }
}

class FakeInfographics implements InfographicResolver {
  constructor(private readonly paths: string[]) {}
  async listForEpisode(_epId: string): Promise<string[]> {
    return [...this.paths];
  }
}

class FakeWriter implements ScriptYamlWriter {
  readonly writes: Array<{ path: string; content: string }> = [];
  async write(absolutePath: string, yamlText: string): Promise<void> {
    this.writes.push({ path: absolutePath, content: yamlText });
  }
}

function createNoopLogger(): Logger {
  const noop = (): void => {};
  const logger: Logger = {
    name: 'test',
    level: 'info',
    trace: noop,
    debug: noop,
    info: noop,
    warn: noop,
    error: noop,
    fatal: noop,
    child: () => logger,
  };
  return logger;
}

const VALID_YAML = `videoId: "ep001"
title: "テスト台本"
chapters:
  - type: hook
    lines:
      - ponchan: "こんにちは"
        emotion: normal
  - type: explanation
    lines:
      - maro: "本題なのだ"
        emotion: serious
      - ponchan: "そうだよ"
        emotion: happy
  - type: analysis
    lines:
      - ponchan: "分析だよ"
        emotion: thinking
`;

// ---------- Tests ----------

describe('GenerateScriptUseCase', () => {
  it('LLM 出力を YAML parse し outputPath に書き出す', async () => {
    const llm = new FakeLlmClient({
      text: VALID_YAML,
      inputTokens: 100,
      outputTokens: 500,
    });
    const writer = new FakeWriter();

    const uc = new GenerateScriptUseCase({
      llm,
      knowledge: new FakeKnowledge(),
      infographics: new FakeInfographics([]),
      writer,
      logger: createNoopLogger(),
    });

    const result = await uc.execute({
      topic: 'テストトピック',
      epId: 'ep001',
      outputPath: '/tmp/ep001.yaml',
    });

    expect(writer.writes).toHaveLength(1);
    expect(writer.writes[0]!.path).toBe('/tmp/ep001.yaml');
    expect(writer.writes[0]!.content).toContain('videoId');

    expect(result.title).toBe('テスト台本');
    expect(result.chapterCount).toBe(3);
    expect(result.totalLines).toBe(4);
    expect(result.inputTokens).toBe(100);
    expect(result.outputTokens).toBe(500);
    expect(result.infographicsInjected).toBe(0);
    // Sonnet 4.6 単価: 100 × 0.000003 + 500 × 0.000015 = 0.0003 + 0.0075 = 0.0078
    expect(result.costUsd).toBeCloseTo(0.0078, 4);
  });

  it('LLM 呼び出しのデフォルト model / maxTokens を適用する', async () => {
    const llm = new FakeLlmClient({ text: VALID_YAML, inputTokens: 0, outputTokens: 0 });
    const uc = new GenerateScriptUseCase({
      llm,
      knowledge: new FakeKnowledge(),
      infographics: new FakeInfographics([]),
      writer: new FakeWriter(),
      logger: createNoopLogger(),
    });
    await uc.execute({ topic: 'T', epId: 'ep001', outputPath: '/tmp/x.yaml' });
    expect(llm.calls[0]!.model).toBe('claude-sonnet-4-6');
    expect(llm.calls[0]!.maxTokens).toBe(32000);
  });

  it('model / maxTokens を上書きできる', async () => {
    const llm = new FakeLlmClient({ text: VALID_YAML, inputTokens: 0, outputTokens: 0 });
    const uc = new GenerateScriptUseCase({
      llm,
      knowledge: new FakeKnowledge(),
      infographics: new FakeInfographics([]),
      writer: new FakeWriter(),
      logger: createNoopLogger(),
    });
    await uc.execute({
      topic: 'T',
      epId: 'ep001',
      outputPath: '/tmp/x.yaml',
      model: 'claude-sonnet-4-6',
      maxTokens: 8000,
    });
    expect(llm.calls[0]!.model).toBe('claude-sonnet-4-6');
    expect(llm.calls[0]!.maxTokens).toBe(8000);
  });

  it('directive / patterns をプロンプトに差し込む', async () => {
    const llm = new FakeLlmClient({ text: VALID_YAML, inputTokens: 0, outputTokens: 0 });
    const knowledge = new FakeKnowledge(
      { tech_geopolitics: { focus_theme: '半導体' } },
      {
        analyzedAt: '2026-04-23',
        totalVideosAnalyzed: 1,
        structureInsights: ['Insight-X'],
        recommendedHooks: ['Hook-A'],
        avoidPatterns: [],
        titlePatterns: [],
        hookPatterns: [],
        thumbnailPatterns: { colorScheme: '', commonElements: [] },
      },
    );
    const uc = new GenerateScriptUseCase({
      llm,
      knowledge,
      infographics: new FakeInfographics([]),
      writer: new FakeWriter(),
      logger: createNoopLogger(),
    });
    await uc.execute({ topic: 'T', epId: 'ep001', outputPath: '/tmp/x.yaml' });
    const userPrompt = llm.calls[0]!.user;
    expect(userPrompt).toContain('重点テーマ: 半導体');
    expect(userPrompt).toContain('Insight-X');
    expect(userPrompt).toContain('Hook-A');
  });

  it('researchFile が指定されていれば knowledge.loadResearchFile が呼ばれプロンプトに注入される', async () => {
    const llm = new FakeLlmClient({ text: VALID_YAML, inputTokens: 0, outputTokens: 0 });
    const knowledge = new FakeKnowledge(null, null, 'リサーチ内容ABC');
    const uc = new GenerateScriptUseCase({
      llm,
      knowledge,
      infographics: new FakeInfographics([]),
      writer: new FakeWriter(),
      logger: createNoopLogger(),
    });
    await uc.execute({
      topic: 'T',
      epId: 'ep001',
      outputPath: '/tmp/x.yaml',
      researchFile: 'input/ep001_research.md',
    });
    expect(knowledge.researchLoads).toEqual(['input/ep001_research.md']);
    expect(llm.calls[0]!.user).toContain('リサーチ内容ABC');
  });

  it('infographic が存在すれば explanation/analysis に注入し、書き出される YAML に反映する', async () => {
    const llm = new FakeLlmClient({ text: VALID_YAML, inputTokens: 0, outputTokens: 0 });
    const writer = new FakeWriter();
    const uc = new GenerateScriptUseCase({
      llm,
      knowledge: new FakeKnowledge(),
      infographics: new FakeInfographics([
        'content/infographic_ep001_1.png',
        'content/infographic_ep001_2.png',
      ]),
      writer,
      logger: createNoopLogger(),
    });
    const result = await uc.execute({ topic: 'T', epId: 'ep001', outputPath: '/tmp/x.yaml' });
    expect(result.infographicsInjected).toBe(2);

    // 書き出された YAML を再 parse して検証
    const parsed = yaml.load(writer.writes[0]!.content) as {
      chapters: Array<{ type: string; visuals?: unknown[] }>;
    };
    const explanationCh = parsed.chapters.find((c) => c.type === 'explanation');
    const analysisCh = parsed.chapters.find((c) => c.type === 'analysis');
    expect(explanationCh?.visuals).toHaveLength(1);
    expect(analysisCh?.visuals).toHaveLength(1);
  });

  it('YAML として不正な出力なら DomainError を投げる', async () => {
    const llm = new FakeLlmClient({
      text: '::::this is not: valid: yaml::: { broken',
      inputTokens: 0,
      outputTokens: 0,
    });
    const uc = new GenerateScriptUseCase({
      llm,
      knowledge: new FakeKnowledge(),
      infographics: new FakeInfographics([]),
      writer: new FakeWriter(),
      logger: createNoopLogger(),
    });
    await expect(
      uc.execute({ topic: 'T', epId: 'ep001', outputPath: '/tmp/x.yaml' }),
    ).rejects.toThrow(/not valid YAML|did not parse/);
  });

  it('LLM が空文字を返した場合 DomainError', async () => {
    const llm = new FakeLlmClient({ text: '', inputTokens: 0, outputTokens: 0 });
    const uc = new GenerateScriptUseCase({
      llm,
      knowledge: new FakeKnowledge(),
      infographics: new FakeInfographics([]),
      writer: new FakeWriter(),
      logger: createNoopLogger(),
    });
    await expect(
      uc.execute({ topic: 'T', epId: 'ep001', outputPath: '/tmp/x.yaml' }),
    ).rejects.toThrow(/did not parse/);
  });

  it('SYSTEM_PROMPT がそのまま LLM.system に渡る', async () => {
    const llm = new FakeLlmClient({ text: VALID_YAML, inputTokens: 0, outputTokens: 0 });
    const uc = new GenerateScriptUseCase({
      llm,
      knowledge: new FakeKnowledge(),
      infographics: new FakeInfographics([]),
      writer: new FakeWriter(),
      logger: createNoopLogger(),
    });
    await uc.execute({ topic: 'T', epId: 'ep001', outputPath: '/tmp/x.yaml' });
    expect(llm.calls[0]!.system).toContain('ponchan');
    expect(llm.calls[0]!.system).toContain('rich-panel');
  });

  it('pastEpisodes が渡された場合、プロンプトに過去エピソード一覧が注入される', async () => {
    const llm = new FakeLlmClient({ text: VALID_YAML, inputTokens: 0, outputTokens: 0 });
    const uc = new GenerateScriptUseCase({
      llm,
      knowledge: new FakeKnowledge(),
      infographics: new FakeInfographics([]),
      writer: new FakeWriter(),
      logger: createNoopLogger(),
      pastEpisodes: new FakePastEpisodes([
        { epId: 'ep005', title: '台湾有事で半導体が消える？' },
        { epId: 'ep007', title: '量子コンピューター覇権争い！', topic: '量子コンピューター' },
      ]),
    });
    await uc.execute({ topic: 'T', epId: 'ep008', outputPath: '/tmp/x.yaml' });
    const userPrompt = llm.calls[0]!.user;
    expect(userPrompt).toContain('ep005');
    expect(userPrompt).toContain('台湾有事で半導体が消える？');
    expect(userPrompt).toContain('ep007');
    expect(userPrompt).toContain('量子コンピューター');
  });

  it('pastEpisodes が省略された場合、プロンプトに過去エピソードセクションは含まれない', async () => {
    const llm = new FakeLlmClient({ text: VALID_YAML, inputTokens: 0, outputTokens: 0 });
    const uc = new GenerateScriptUseCase({
      llm,
      knowledge: new FakeKnowledge(),
      infographics: new FakeInfographics([]),
      writer: new FakeWriter(),
      logger: createNoopLogger(),
    });
    await uc.execute({ topic: 'T', epId: 'ep001', outputPath: '/tmp/x.yaml' });
    expect(llm.calls[0]!.user).not.toContain('過去エピソード');
  });

  it('injectedCount=0 のときは LLM の raw text をそのまま書き出す', async () => {
    // infographic 0 枚 → finalYaml = completion.text（dump 経由しない）
    const llm = new FakeLlmClient({
      text: VALID_YAML,
      inputTokens: 0,
      outputTokens: 0,
    });
    const writer = new FakeWriter();
    const uc = new GenerateScriptUseCase({
      llm,
      knowledge: new FakeKnowledge(),
      infographics: new FakeInfographics([]),
      writer,
      logger: createNoopLogger(),
    });
    await uc.execute({ topic: 'T', epId: 'ep001', outputPath: '/tmp/x.yaml' });
    expect(writer.writes[0]!.content).toBe(VALID_YAML);
  });
});
