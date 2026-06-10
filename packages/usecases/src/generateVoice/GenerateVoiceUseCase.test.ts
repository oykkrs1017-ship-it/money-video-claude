/**
 * GenerateVoiceUseCase のユニットテスト
 *
 * Port (TtsClient / VoiceStorage / ScriptStore / SpeakerResolver / Logger) を全て Fake に
 * 差し替え、ネットワーク・ファイルシステム非依存で execute() の挙動を検証する。
 *
 * 検証ポイント:
 *   - 全セリフ合成成功時: audioFile/audioDuration/frameCount が付与され、scriptStore.save が一度呼ばれる
 *   - 合成失敗時: フォールバック（3.0s）で継続し failureCount が加算される
 *   - totalDurationSec が正しく合算される
 *   - ensureDirectory が execute の冒頭で一度呼ばれる
 *   - resolveSpeakerId の解決結果が synthesize に渡される
 */

import { describe, expect, it } from 'vitest';
import { lineContentHash } from '@money-video/domain';
import type { ScriptInput, SpeakerType } from '@money-video/domain';
import type { Logger } from '@money-video/shared-ts';
import { GenerateVoiceUseCase } from './GenerateVoiceUseCase';
import type {
  ScriptStore,
  SpeakerResolver,
  TtsClient,
  VoiceCache,
  VoiceStorage,
} from './ports';

// ---------- Fakes ----------

interface FakeTtsCall {
  text: string;
  speakerId: number;
}

class FakeTtsClient implements TtsClient {
  readonly calls: FakeTtsCall[] = [];
  constructor(
    private readonly handler: (input: FakeTtsCall) => { wav: Buffer; durationSec: number },
  ) {}

  async synthesize(input: FakeTtsCall): Promise<{ wav: Buffer; durationSec: number }> {
    this.calls.push(input);
    return this.handler(input);
  }
}

class FakeVoiceStorage implements VoiceStorage {
  readonly saved: Array<{ path: string; size: number }> = [];
  readonly dirsEnsured: string[] = [];

  async saveWav(relativePath: string, data: Buffer): Promise<void> {
    this.saved.push({ path: relativePath, size: data.length });
  }

  async ensureDirectory(relativePath: string): Promise<void> {
    this.dirsEnsured.push(relativePath);
  }
}

class FakeVoiceCache implements VoiceCache {
  readonly store = new Map<string, { wav: Buffer; durationSec: number }>();
  readonly getKeys: string[] = [];
  readonly setKeys: string[] = [];

  constructor(seed?: Record<string, { wav: Buffer; durationSec: number }>) {
    if (seed) for (const [k, v] of Object.entries(seed)) this.store.set(k, v);
  }

  async get(key: string): Promise<{ wav: Buffer; durationSec: number } | null> {
    this.getKeys.push(key);
    return this.store.get(key) ?? null;
  }

  async set(key: string, value: { wav: Buffer; durationSec: number }): Promise<void> {
    this.setKeys.push(key);
    this.store.set(key, value);
  }
}

class FakeScriptStore implements ScriptStore {
  readonly loads: string[] = [];
  readonly saves: Array<{ path: string; data: ScriptInput }> = [];

  constructor(private readonly initial: ScriptInput) {}

  async load(inputPath: string): Promise<ScriptInput> {
    this.loads.push(inputPath);
    // ユースケースが mutate するので deep clone して返す（元データを保護）
    return JSON.parse(JSON.stringify(this.initial)) as ScriptInput;
  }

  async save(inputPath: string, data: ScriptInput): Promise<void> {
    this.saves.push({ path: inputPath, data: JSON.parse(JSON.stringify(data)) as ScriptInput });
  }
}

function createNoopLogger(): Logger {
  const noop = (): void => {
    /* no-op */
  };
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

function createScriptInput(): ScriptInput {
  return {
    videoId: 'ep-test',
    seed: 'test-seed',
    title: 'T',
    description: 'D',
    tags: [],
    chapters: [
      {
        type: 'hook',
        duration: 0,
        lines: [
          { speaker: 'maro', text: 'こんにちは', emotion: 'normal' },
          { speaker: 'ponchan', text: 'よろしく', emotion: 'happy' },
        ],
      },
      {
        type: 'explanation',
        duration: 0,
        lines: [{ speaker: 'maro', text: '本日のテーマ', emotion: 'serious' }],
      },
    ],
    chartData: {},
  };
}

const simpleResolver: SpeakerResolver = (speaker: SpeakerType | string) =>
  speaker === 'maro' ? 3 : speaker === 'ponchan' ? 2 : 3;

// ---------- Tests ----------

describe('GenerateVoiceUseCase', () => {
  it('全セリフ合成成功時: audioFile / audioDuration / frameCount を付与する', async () => {
    const tts = new FakeTtsClient(() => ({
      wav: Buffer.alloc(48_000),
      durationSec: 1.0,
    }));
    const storage = new FakeVoiceStorage();
    const store = new FakeScriptStore(createScriptInput());
    const logger = createNoopLogger();

    const uc = new GenerateVoiceUseCase({
      tts,
      storage,
      scriptStore: store,
      resolveSpeakerId: simpleResolver,
      logger,
    });

    const result = await uc.execute({
      inputPath: '/tmp/input.json',
      voicesDirRelative: 'voices',
      fps: 30,
    });

    expect(result.successCount).toBe(3);
    expect(result.failureCount).toBe(0);
    expect(result.totalDurationSec).toBeCloseTo(3.0, 5);

    // 保存された script-input の各 line に audio 情報が付与されている
    expect(store.saves).toHaveLength(1);
    const saved = store.saves[0]!.data;
    const lines = saved.chapters.flatMap((c) => c.lines);
    expect(lines).toHaveLength(3);
    for (const line of lines) {
      expect(line.audioFile).toMatch(/^voices\/\d{4}_(maro|ponchan)\.wav$/);
      expect(line.audioDuration).toBe(1.0);
      // 1.0 × 30fps + 5 buffer = 35
      expect(line.frameCount).toBe(35);
    }
  });

  it('ensureDirectory を冒頭で 1 回呼び、storage.saveWav を各セリフで呼ぶ', async () => {
    const tts = new FakeTtsClient(() => ({
      wav: Buffer.alloc(100),
      durationSec: 0.5,
    }));
    const storage = new FakeVoiceStorage();
    const store = new FakeScriptStore(createScriptInput());

    const uc = new GenerateVoiceUseCase({
      tts,
      storage,
      scriptStore: store,
      resolveSpeakerId: simpleResolver,
      logger: createNoopLogger(),
    });

    await uc.execute({
      inputPath: '/tmp/input.json',
      voicesDirRelative: 'voices',
      fps: 30,
    });

    expect(storage.dirsEnsured).toEqual(['voices']);
    expect(storage.saved).toHaveLength(3);
    expect(storage.saved[0]!.path).toBe('voices/0001_maro.wav');
    expect(storage.saved[1]!.path).toBe('voices/0002_ponchan.wav');
    expect(storage.saved[2]!.path).toBe('voices/0003_maro.wav');
  });

  it('resolveSpeakerId の解決結果が synthesize に渡る', async () => {
    const tts = new FakeTtsClient(() => ({
      wav: Buffer.alloc(100),
      durationSec: 1.0,
    }));
    const uc = new GenerateVoiceUseCase({
      tts,
      storage: new FakeVoiceStorage(),
      scriptStore: new FakeScriptStore(createScriptInput()),
      resolveSpeakerId: (speaker) => (speaker === 'maro' ? 99 : 42),
      logger: createNoopLogger(),
    });

    await uc.execute({
      inputPath: '/tmp/input.json',
      voicesDirRelative: 'voices',
      fps: 30,
    });

    expect(tts.calls.map((c) => c.speakerId)).toEqual([99, 42, 99]);
    expect(tts.calls.map((c) => c.text)).toEqual([
      'こんにちは',
      'よろしく',
      '本日のテーマ',
    ]);
  });

  it('合成失敗時: 3.0s フォールバックで継続し failureCount が加算される', async () => {
    let callCount = 0;
    const tts = new FakeTtsClient(() => {
      callCount += 1;
      // 2 番目のセリフだけ失敗させる
      if (callCount === 2) {
        throw new Error('TTS network error');
      }
      return { wav: Buffer.alloc(100), durationSec: 1.0 };
    });
    const store = new FakeScriptStore(createScriptInput());

    const uc = new GenerateVoiceUseCase({
      tts,
      storage: new FakeVoiceStorage(),
      scriptStore: store,
      resolveSpeakerId: simpleResolver,
      logger: createNoopLogger(),
    });

    const result = await uc.execute({
      inputPath: '/tmp/input.json',
      voicesDirRelative: 'voices',
      fps: 30,
    });

    expect(result.successCount).toBe(2);
    expect(result.failureCount).toBe(1);
    // 1.0 + 3.0 (fallback) + 1.0 = 5.0
    expect(result.totalDurationSec).toBeCloseTo(5.0, 5);

    const lines = store.saves[0]!.data.chapters.flatMap((c) => c.lines);
    // 失敗した 2 番目のセリフもフォールバック値で埋まっている
    expect(lines[1]!.audioDuration).toBe(3.0);
    // 3.0 × 30fps + 5 = 95
    expect(lines[1]!.frameCount).toBe(95);
    expect(lines[1]!.audioFile).toBe('voices/0002_ponchan.wav');
  });

  it('bufferFrames を上書きできる', async () => {
    const tts = new FakeTtsClient(() => ({
      wav: Buffer.alloc(100),
      durationSec: 1.0,
    }));
    const store = new FakeScriptStore(createScriptInput());

    const uc = new GenerateVoiceUseCase({
      tts,
      storage: new FakeVoiceStorage(),
      scriptStore: store,
      resolveSpeakerId: simpleResolver,
      logger: createNoopLogger(),
    });

    await uc.execute({
      inputPath: '/tmp/input.json',
      voicesDirRelative: 'voices',
      fps: 30,
      bufferFrames: 0,
    });

    const line = store.saves[0]!.data.chapters[0]!.lines[0]!;
    // 1.0 × 30fps + 0 = 30
    expect(line.frameCount).toBe(30);
  });

  it('scriptStore.load は inputPath をそのまま受け取る', async () => {
    const tts = new FakeTtsClient(() => ({
      wav: Buffer.alloc(100),
      durationSec: 1.0,
    }));
    const store = new FakeScriptStore(createScriptInput());

    const uc = new GenerateVoiceUseCase({
      tts,
      storage: new FakeVoiceStorage(),
      scriptStore: store,
      resolveSpeakerId: simpleResolver,
      logger: createNoopLogger(),
    });

    await uc.execute({
      inputPath: '/path/to/ep007.json',
      voicesDirRelative: 'public/voices',
      fps: 30,
    });

    expect(store.loads).toEqual(['/path/to/ep007.json']);
    expect(store.saves[0]!.path).toBe('/path/to/ep007.json');
  });

  it('キャッシュ全ヒット時: TTS を呼ばず frameCount をキャッシュ秒数から復元する', async () => {
    const tts = new FakeTtsClient(() => {
      throw new Error('TTS は呼ばれてはいけない（全行キャッシュヒット想定）');
    });
    // 3 行分のキャッシュを事前投入（speakerId は simpleResolver と一致させる）
    const cache = new FakeVoiceCache({
      [lineContentHash(3, 'こんにちは')]: { wav: Buffer.alloc(10), durationSec: 2.0 },
      [lineContentHash(2, 'よろしく')]: { wav: Buffer.alloc(10), durationSec: 2.0 },
      [lineContentHash(3, '本日のテーマ')]: { wav: Buffer.alloc(10), durationSec: 2.0 },
    });
    const store = new FakeScriptStore(createScriptInput());

    const uc = new GenerateVoiceUseCase({
      tts,
      storage: new FakeVoiceStorage(),
      scriptStore: store,
      resolveSpeakerId: simpleResolver,
      logger: createNoopLogger(),
      voiceCache: cache,
    });

    const result = await uc.execute({
      inputPath: '/tmp/input.json',
      voicesDirRelative: 'voices',
      fps: 30,
    });

    expect(tts.calls).toHaveLength(0);
    expect(result.cacheHits).toBe(3);
    expect(result.successCount).toBe(3);
    const lines = store.saves[0]!.data.chapters.flatMap((c) => c.lines);
    for (const line of lines) {
      // 2.0s × 30fps + 5 buffer = 65（キャッシュ秒数から再計算される）
      expect(line.frameCount).toBe(65);
      expect(line.audioDuration).toBe(2.0);
    }
  });

  it('キャッシュミス時: TTS を呼び結果を cache.set で保存する', async () => {
    const tts = new FakeTtsClient(() => ({ wav: Buffer.alloc(100), durationSec: 1.0 }));
    const cache = new FakeVoiceCache();
    const store = new FakeScriptStore(createScriptInput());

    const uc = new GenerateVoiceUseCase({
      tts,
      storage: new FakeVoiceStorage(),
      scriptStore: store,
      resolveSpeakerId: simpleResolver,
      logger: createNoopLogger(),
      voiceCache: cache,
    });

    const result = await uc.execute({
      inputPath: '/tmp/input.json',
      voicesDirRelative: 'voices',
      fps: 30,
    });

    expect(tts.calls).toHaveLength(3);
    expect(cache.setKeys).toHaveLength(3);
    expect(result.cacheHits).toBe(0);
    // 同じキーが get と set で使われている
    expect(new Set(cache.getKeys)).toEqual(new Set(cache.setKeys));
  });
});
