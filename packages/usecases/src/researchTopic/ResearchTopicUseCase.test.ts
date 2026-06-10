/**
 * ResearchTopicUseCase のユニットテスト
 */

import { describe, expect, it, vi } from 'vitest';
import { ResearchTopicUseCase } from './ResearchTopicUseCase';
import type {
  ChannelConfigReader,
  CompetitorChannel,
  CompetitorChannelsConfig,
  CompetitorVideo,
  CompetitorVideoFetcher,
  NewsFetcher,
  NewsItem,
  ResearchStore,
  TopicPromptUpdater,
  TopicResearch,
} from './ports';

// ---------- Fakes ----------

const SAMPLE_CONFIG: CompetitorChannelsConfig = {
  channels: [
    { handle: '@channel1', name: 'チャンネル1', category: 'tech', note: '' },
    { handle: '@channel2', name: 'チャンネル2', category: 'finance', note: '' },
  ],
  keywords_for_news: ['AI半導体', '地政学'],
  settings: {
    max_videos_per_channel: 5,
    news_lookback_days: 7,
    max_news_per_keyword: 3,
  },
};

class FakeChannelConfigReader implements ChannelConfigReader {
  readonly calls: string[] = [];
  constructor(private readonly config: CompetitorChannelsConfig = SAMPLE_CONFIG) {}
  async read(configPath: string): Promise<CompetitorChannelsConfig> {
    this.calls.push(configPath);
    return this.config;
  }
}

class FakeVideoFetcher implements CompetitorVideoFetcher {
  readonly fetchCalls: Array<{ channel: CompetitorChannel; maxVideos: number; dryRun: boolean }> =
    [];
  constructor(
    private readonly videos: CompetitorVideo[] = [],
    private readonly available = true,
  ) {}
  isAvailable(): boolean {
    return this.available;
  }
  fetch(channel: CompetitorChannel, maxVideos: number, dryRun: boolean): CompetitorVideo[] {
    this.fetchCalls.push({ channel, maxVideos, dryRun });
    return this.videos.map((v) => ({ ...v, channel: channel.name }));
  }
}

class FakeNewsFetcher implements NewsFetcher {
  readonly calls: string[] = [];
  constructor(
    private readonly items: NewsItem[] = [],
    private readonly available = true,
  ) {}
  isAvailable(): boolean {
    return this.available;
  }
  async searchByKeyword(keyword: string): Promise<NewsItem[]> {
    this.calls.push(keyword);
    return this.items.map((item) => ({ ...item, keyword }));
  }
}

class FakeResearchStore implements ResearchStore {
  readonly saves: Array<{ path: string; research: TopicResearch }> = [];
  save(outputPath: string, research: TopicResearch): void {
    this.saves.push({ path: outputPath, research });
  }
}

class FakePromptUpdater implements TopicPromptUpdater {
  readonly calls: Array<{ path: string; dryRun: boolean }> = [];
  update(promptPath: string, _research: TopicResearch, dryRun: boolean): void {
    this.calls.push({ path: promptPath, dryRun });
  }
}

function buildUseCase(
  overrides: Partial<{
    configReader: ChannelConfigReader;
    videoFetcher: CompetitorVideoFetcher;
    newsFetcher: NewsFetcher;
    store: ResearchStore;
    promptUpdater: TopicPromptUpdater;
  }> = {},
) {
  return new ResearchTopicUseCase({
    channelConfigReader: overrides.configReader ?? new FakeChannelConfigReader(),
    videoFetcher: overrides.videoFetcher ?? new FakeVideoFetcher(),
    newsFetcher: overrides.newsFetcher ?? new FakeNewsFetcher(),
    researchStore: overrides.store ?? new FakeResearchStore(),
    topicPromptUpdater: overrides.promptUpdater ?? new FakePromptUpdater(),
  });
}

const BASE_INPUT = {
  configPath: '/tmp/competitor-channels.yaml',
  outputPath: '/tmp/topic-research.json',
};

describe('ResearchTopicUseCase', () => {
  it('正常系: 競合動画 + ニュースを取得して結果を返す', async () => {
    vi.useFakeTimers();
    const videoFetcher = new FakeVideoFetcher([
      {
        channel: 'X',
        title: '動画タイトル',
        views: 10000,
        published: '2026-04-01',
        url: 'https://youtu.be/xxx',
        duration: '12:34',
      },
    ]);
    const newsFetcher = new FakeNewsFetcher([
      {
        keyword: 'k',
        title: 'ニュース1',
        url: 'https://example.com',
        summary: '概要',
        published: '2026-04-01',
      },
    ]);

    const uc = buildUseCase({ videoFetcher, newsFetcher });

    const promise = uc.execute(BASE_INPUT);
    // タイマーを全部進める
    await vi.runAllTimersAsync();
    const result = await promise;

    // チャンネル2件 × 動画1件 = 2件
    expect(result.competitorVideoCount).toBe(2);
    // キーワード2件 × ニュース1件 = 2件
    expect(result.newsItemCount).toBe(2);
    expect(result.outputPath).toBe('/tmp/topic-research.json');

    vi.useRealTimers();
  });

  it('skipYoutube=true: videoFetcher.fetch が呼ばれない', async () => {
    vi.useFakeTimers();
    const videoFetcher = new FakeVideoFetcher([
      { channel: 'X', title: 'T', views: null, published: null, url: '', duration: null },
    ]);
    const uc = buildUseCase({ videoFetcher });

    const promise = uc.execute({ ...BASE_INPUT, skipYoutube: true });
    await vi.runAllTimersAsync();
    await promise;

    expect(videoFetcher.fetchCalls).toHaveLength(0);
    vi.useRealTimers();
  });

  it('skipNews=true: newsFetcher.searchByKeyword が呼ばれない', async () => {
    vi.useFakeTimers();
    const newsFetcher = new FakeNewsFetcher([
      { keyword: 'k', title: 'T', url: '', summary: '', published: null },
    ]);
    const uc = buildUseCase({ newsFetcher });

    const promise = uc.execute({ ...BASE_INPUT, skipNews: true });
    await vi.runAllTimersAsync();
    await promise;

    expect(newsFetcher.calls).toHaveLength(0);
    vi.useRealTimers();
  });

  it('dryRun=true: researchStore.save が呼ばれない', async () => {
    vi.useFakeTimers();
    const store = new FakeResearchStore();
    const uc = buildUseCase({ store });

    const promise = uc.execute({ ...BASE_INPUT, dryRun: true });
    await vi.runAllTimersAsync();
    await promise;

    expect(store.saves).toHaveLength(0);
    vi.useRealTimers();
  });

  it('dryRun=false: researchStore.save が outputPath で呼ばれる', async () => {
    vi.useFakeTimers();
    const store = new FakeResearchStore();
    const uc = buildUseCase({ store });

    const promise = uc.execute(BASE_INPUT);
    await vi.runAllTimersAsync();
    await promise;

    expect(store.saves).toHaveLength(1);
    expect(store.saves[0]!.path).toBe('/tmp/topic-research.json');
    vi.useRealTimers();
  });

  it('videoFetcher.isAvailable()=false: 動画取得をスキップ', async () => {
    vi.useFakeTimers();
    const videoFetcher = new FakeVideoFetcher([], false);
    const uc = buildUseCase({ videoFetcher });

    const promise = uc.execute(BASE_INPUT);
    await vi.runAllTimersAsync();
    const result = await promise;

    expect(result.competitorVideoCount).toBe(0);
    expect(videoFetcher.fetchCalls).toHaveLength(0);
    vi.useRealTimers();
  });

  it('newsFetcher.isAvailable()=false: ニュース検索をスキップ', async () => {
    vi.useFakeTimers();
    const newsFetcher = new FakeNewsFetcher([], false);
    const uc = buildUseCase({ newsFetcher });

    const promise = uc.execute(BASE_INPUT);
    await vi.runAllTimersAsync();
    const result = await promise;

    expect(result.newsItemCount).toBe(0);
    expect(newsFetcher.calls).toHaveLength(0);
    vi.useRealTimers();
  });

  it('promptPath が指定されている場合 topicPromptUpdater.update が呼ばれる', async () => {
    vi.useFakeTimers();
    const promptUpdater = new FakePromptUpdater();
    const uc = buildUseCase({ promptUpdater });

    const promise = uc.execute({ ...BASE_INPUT, promptPath: '/tmp/PROMPT.md' });
    await vi.runAllTimersAsync();
    await promise;

    expect(promptUpdater.calls).toHaveLength(1);
    expect(promptUpdater.calls[0]!.path).toBe('/tmp/PROMPT.md');
    vi.useRealTimers();
  });

  it('promptPath が未指定の場合 topicPromptUpdater.update が呼ばれない', async () => {
    vi.useFakeTimers();
    const promptUpdater = new FakePromptUpdater();
    const uc = buildUseCase({ promptUpdater });

    const promise = uc.execute(BASE_INPUT); // promptPath なし
    await vi.runAllTimersAsync();
    await promise;

    expect(promptUpdater.calls).toHaveLength(0);
    vi.useRealTimers();
  });

  it('config の max_videos_per_channel が videoFetcher.fetch に渡る', async () => {
    vi.useFakeTimers();
    const videoFetcher = new FakeVideoFetcher();
    const uc = buildUseCase({ videoFetcher });

    const promise = uc.execute(BASE_INPUT);
    await vi.runAllTimersAsync();
    await promise;

    // SAMPLE_CONFIG.settings.max_videos_per_channel = 5
    expect(videoFetcher.fetchCalls[0]!.maxVideos).toBe(5);
    vi.useRealTimers();
  });
});
