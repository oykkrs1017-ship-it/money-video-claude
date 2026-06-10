/**
 * AutonomousLoopUseCase テスト
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { AutonomousLoopUseCase } from './AutonomousLoopUseCase';
import type {
  DirectiveConfig,
  DirectiveReader,
  DailyCostReader,
  EpisodeIdGenerator,
  ScriptRunner,
  VoiceRunner,
  LoopScorecardWriter,
  LoopEpisodeRecord,
  TsvAppender,
} from './ports';

// ─── Fakes ───────────────────────────────────────────────────────────────────

function makeDirective(overrides?: Partial<DirectiveConfig>): DirectiveConfig {
  return {
    isAutoLoopEnabled: true,
    maxDailyCostUsd: 5.0,
    maxEpisodesPerLoop: 3,
    currentHypothesisId: null,
    currentHypothesisSeed: null,
    ...overrides,
  };
}

class FakeDirectiveReader implements DirectiveReader {
  constructor(private config: DirectiveConfig = makeDirective()) {}
  read(): DirectiveConfig {
    return this.config;
  }
  getDirectiveHash(): string {
    return 'abc123def456';
  }
}

class FakeDailyCostReader implements DailyCostReader {
  constructor(private cost: number = 0) {}
  getTodayTotalUsd(): number {
    return this.cost;
  }
}

class FakeEpisodeIdGenerator implements EpisodeIdGenerator {
  private counter = 1;
  next(): string {
    return `ep${String(this.counter++).padStart(3, '0')}`;
  }
}

class FakeScriptRunner implements ScriptRunner {
  calls: Array<{ topic: string; epId: string; dryRun: boolean }> = [];
  private shouldSucceed: boolean;
  constructor(shouldSucceed = true) {
    this.shouldSucceed = shouldSucceed;
  }
  async run(
    topic: string,
    epId: string,
    dryRun: boolean,
  ): Promise<{ success: boolean; output: string }> {
    this.calls.push({ topic, epId, dryRun });
    return { success: this.shouldSucceed, output: 'ok' };
  }
}

class FakeVoiceRunner implements VoiceRunner {
  calls: Array<{ epId: string; dryRun: boolean }> = [];
  private shouldSucceed: boolean;
  constructor(shouldSucceed = true) {
    this.shouldSucceed = shouldSucceed;
  }
  async run(epId: string, dryRun: boolean): Promise<{ success: boolean; output: string }> {
    this.calls.push({ epId, dryRun });
    return { success: this.shouldSucceed, output: 'ok' };
  }
}

class FakeLoopScorecardWriter implements LoopScorecardWriter {
  saved: LoopEpisodeRecord[] = [];
  save(record: LoopEpisodeRecord): void {
    this.saved.push(record);
  }
}

class FakeTsvAppender implements TsvAppender {
  lines: string[] = [];
  append(line: string): void {
    this.lines.push(line);
  }
}

function makeDeps(overrides?: {
  directiveReader?: DirectiveReader;
  dailyCostReader?: DailyCostReader;
  episodeIdGenerator?: EpisodeIdGenerator;
  scriptRunner?: ScriptRunner;
  voiceRunner?: VoiceRunner;
  scorecardWriter?: LoopScorecardWriter;
  tsvAppender?: TsvAppender;
}) {
  return {
    directiveReader: overrides?.directiveReader ?? new FakeDirectiveReader(),
    dailyCostReader: overrides?.dailyCostReader ?? new FakeDailyCostReader(),
    episodeIdGenerator: overrides?.episodeIdGenerator ?? new FakeEpisodeIdGenerator(),
    scriptRunner: overrides?.scriptRunner ?? new FakeScriptRunner(),
    voiceRunner: overrides?.voiceRunner ?? new FakeVoiceRunner(),
    scorecardWriter: overrides?.scorecardWriter ?? new FakeLoopScorecardWriter(),
    tsvAppender: overrides?.tsvAppender ?? new FakeTsvAppender(),
  };
}

// ─── テスト ───────────────────────────────────────────────────────────────────

describe('AutonomousLoopUseCase', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  // ── 正常系 ──────────────────────────────────────────────────────────────────

  it('トピックを順番に処理して正しい集計を返す', async () => {
    const deps = makeDeps();
    const useCase = new AutonomousLoopUseCase(deps);
    const promise = useCase.execute({
      topics: ['AI', '地政学', '半導体'],
      dryRun: true,
    });
    await vi.runAllTimersAsync();
    const result = await promise;

    expect(result.totalEpisodes).toBe(3);
    expect(result.successCount).toBe(3);
    expect(result.totalCostUsd).toBeCloseTo(0.18); // 0.06 * 3
  });

  it('台本生成に成功し音声合成が呼ばれる', async () => {
    const scriptRunner = new FakeScriptRunner(true);
    const voiceRunner = new FakeVoiceRunner(true);
    const deps = makeDeps({ scriptRunner, voiceRunner });
    const useCase = new AutonomousLoopUseCase(deps);
    const promise = useCase.execute({ topics: ['AI'], dryRun: true });
    await vi.runAllTimersAsync();
    await promise;

    expect(scriptRunner.calls).toHaveLength(1);
    expect(scriptRunner.calls[0]).toMatchObject({ topic: 'AI', dryRun: true });
    expect(voiceRunner.calls).toHaveLength(1);
  });

  it('スコアカードと TSV が保存される', async () => {
    const scorecardWriter = new FakeLoopScorecardWriter();
    const tsvAppender = new FakeTsvAppender();
    const deps = makeDeps({ scorecardWriter, tsvAppender });
    const useCase = new AutonomousLoopUseCase(deps);
    const promise = useCase.execute({ topics: ['AI'], dryRun: true });
    await vi.runAllTimersAsync();
    await promise;

    expect(scorecardWriter.saved).toHaveLength(1);
    expect(scorecardWriter.saved[0]?.episodeId).toBe('ep001');
    expect(scorecardWriter.saved[0]?.verdict).toBe('PENDING');
    expect(tsvAppender.lines).toHaveLength(1);
    expect(tsvAppender.lines[0]).toContain('ep001');
    expect(tsvAppender.lines[0]).toContain('tech-geopolitics');
  });

  it('エピソード ID が採番される', async () => {
    const generator = new FakeEpisodeIdGenerator();
    const deps = makeDeps({ episodeIdGenerator: generator });
    const useCase = new AutonomousLoopUseCase(deps);
    const promise = useCase.execute({ topics: ['A', 'B', 'C'], dryRun: true });
    await vi.runAllTimersAsync();
    const result = await promise;

    expect(result.totalEpisodes).toBe(3);
    // 内部でカウンタが進んでいることを検証（次の call は ep004 になる）
    expect(generator.next()).toBe('ep004');
  });

  // ── 費用上限 ─────────────────────────────────────────────────────────────────

  it('日次費用上限に達したらループを中断する', async () => {
    const scriptRunner = new FakeScriptRunner(true);
    const dailyCostReader = new FakeDailyCostReader(5.0); // 上限丁度
    const directive = makeDirective({ maxDailyCostUsd: 5.0 });
    const deps = makeDeps({
      directiveReader: new FakeDirectiveReader(directive),
      dailyCostReader,
      scriptRunner,
    });
    const useCase = new AutonomousLoopUseCase(deps);
    const promise = useCase.execute({ topics: ['A', 'B', 'C'], dryRun: true });
    await vi.runAllTimersAsync();
    const result = await promise;

    expect(result.totalEpisodes).toBe(0);
    expect(scriptRunner.calls).toHaveLength(0);
  });

  // ── maxEpisodesPerLoop ────────────────────────────────────────────────────

  it('directive の maxEpisodesPerLoop を上限として使う', async () => {
    const directive = makeDirective({ maxEpisodesPerLoop: 2 });
    const deps = makeDeps({ directiveReader: new FakeDirectiveReader(directive) });
    const useCase = new AutonomousLoopUseCase(deps);
    const promise = useCase.execute({ topics: ['A', 'B', 'C', 'D'], dryRun: true });
    await vi.runAllTimersAsync();
    const result = await promise;

    expect(result.totalEpisodes).toBe(2);
  });

  it('maxEpisodesOverride が directive より優先される', async () => {
    const directive = makeDirective({ maxEpisodesPerLoop: 5 });
    const deps = makeDeps({ directiveReader: new FakeDirectiveReader(directive) });
    const useCase = new AutonomousLoopUseCase(deps);
    const promise = useCase.execute({
      topics: ['A', 'B', 'C', 'D', 'E'],
      maxEpisodesOverride: 2,
      dryRun: true,
    });
    await vi.runAllTimersAsync();
    const result = await promise;

    expect(result.totalEpisodes).toBe(2);
  });

  // ── auto_loop_enabled チェック ────────────────────────────────────────────

  it('auto_loop_enabled=false のとき例外をスローする', async () => {
    const directive = makeDirective({ isAutoLoopEnabled: false });
    const deps = makeDeps({ directiveReader: new FakeDirectiveReader(directive) });
    const useCase = new AutonomousLoopUseCase(deps);

    await expect(useCase.execute({ topics: ['A'] })).rejects.toThrow(
      'auto_loop_enabled',
    );
  });

  it('force=true なら auto_loop_enabled=false でも実行する', async () => {
    const directive = makeDirective({ isAutoLoopEnabled: false });
    const deps = makeDeps({ directiveReader: new FakeDirectiveReader(directive) });
    const useCase = new AutonomousLoopUseCase(deps);
    const promise = useCase.execute({ topics: ['A'], force: true, dryRun: true });
    await vi.runAllTimersAsync();
    const result = await promise;

    expect(result.totalEpisodes).toBe(1);
  });

  // ── 失敗耐性 ─────────────────────────────────────────────────────────────────

  it('台本生成が失敗してもループが継続する', async () => {
    const scriptRunner = new FakeScriptRunner(false);
    const voiceRunner = new FakeVoiceRunner(true);
    const scorecardWriter = new FakeLoopScorecardWriter();
    const deps = makeDeps({ scriptRunner, voiceRunner, scorecardWriter });
    const useCase = new AutonomousLoopUseCase(deps);
    const promise = useCase.execute({ topics: ['A', 'B'], dryRun: true });
    await vi.runAllTimersAsync();
    const result = await promise;

    expect(result.totalEpisodes).toBe(2);
    expect(result.successCount).toBe(0);
    // 音声合成は呼ばれない（台本失敗時）
    expect(voiceRunner.calls).toHaveLength(0);
    // スコアカードは失敗でも保存される
    expect(scorecardWriter.saved).toHaveLength(2);
  });

  it('音声合成が失敗してもループが継続する', async () => {
    const voiceRunner = new FakeVoiceRunner(false);
    const scorecardWriter = new FakeLoopScorecardWriter();
    const deps = makeDeps({ voiceRunner, scorecardWriter });
    const useCase = new AutonomousLoopUseCase(deps);
    const promise = useCase.execute({ topics: ['A', 'B'], dryRun: true });
    await vi.runAllTimersAsync();
    const result = await promise;

    expect(result.totalEpisodes).toBe(2);
    expect(result.successCount).toBe(0);
    expect(scorecardWriter.saved[0]?.production.voiceSynthSuccessRate).toBe(0);
  });

  // ── 仮説 ─────────────────────────────────────────────────────────────────────

  it('仮説 ID がスコアカードに記録される', async () => {
    const directive = makeDirective({
      currentHypothesisId: 'hyp-001',
      currentHypothesisSeed: 'seed-42',
    });
    const scorecardWriter = new FakeLoopScorecardWriter();
    const deps = makeDeps({
      directiveReader: new FakeDirectiveReader(directive),
      scorecardWriter,
    });
    const useCase = new AutonomousLoopUseCase(deps);
    const promise = useCase.execute({ topics: ['AI'], dryRun: true });
    await vi.runAllTimersAsync();
    await promise;

    expect(scorecardWriter.saved[0]?.hypothesisId).toBe('hyp-001');
    expect(scorecardWriter.saved[0]?.seed).toBe('seed-42');
  });
});
