/**
 * PublishVideoUseCase のユニットテスト
 */

import { describe, expect, it } from 'vitest';
import type { Logger } from '@money-video/shared-ts';
import { PublishVideoUseCase } from './PublishVideoUseCase';
import type {
  EpisodeMeta,
  EpisodeMetaReader,
  MetaReadOptions,
  PrivacyStatus,
  UploadInput,
  UploadResult,
  UploadResultWriter,
  VideoUploader,
} from './ports';

// ---------- Fakes ----------

class FakeUploader implements VideoUploader {
  readonly calls: UploadInput[] = [];
  constructor(private readonly result: UploadResult) {}
  async upload(input: UploadInput): Promise<UploadResult> {
    this.calls.push(input);
    return this.result;
  }
}

class FakeMetaReader implements EpisodeMetaReader {
  readonly calls: MetaReadOptions[] = [];
  constructor(private readonly meta: EpisodeMeta) {}
  async read(options: MetaReadOptions): Promise<EpisodeMeta> {
    this.calls.push(options);
    return this.meta;
  }
}

class FakeWriter implements UploadResultWriter {
  readonly writes: Array<{ videoFilePath: string; result: UploadResult }> = [];
  async write(videoFilePath: string, result: UploadResult): Promise<void> {
    this.writes.push({ videoFilePath, result });
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

const UPLOAD_RESULT: UploadResult = {
  videoId: 'abc123',
  videoUrl: 'https://youtu.be/abc123',
  privacyStatus: 'private',
  publishAt: '2026-04-24T10:00:00.000Z',
};

const EPISODE_META: EpisodeMeta = {
  title: 'テスト動画',
  description: '説明文',
  tags: ['タグA', 'タグB'],
};

describe('PublishVideoUseCase', () => {
  it('正常系: アップロード完了して result を返す', async () => {
    const uploader = new FakeUploader(UPLOAD_RESULT);
    const writer = new FakeWriter();
    const uc = new PublishVideoUseCase({
      uploader,
      metaReader: new FakeMetaReader(EPISODE_META),
      resultWriter: writer,
      logger: createNoopLogger(),
    });

    const result = await uc.execute({
      videoFilePath: '/tmp/ep001.mp4',
    });

    expect(result.videoId).toBe('abc123');
    expect(result.videoUrl).toBe('https://youtu.be/abc123');
    expect(result.title).toBe('テスト動画');
    expect(result.tagCount).toBe(2);
  });

  it('publishNow=false: privacyStatus が private でスケジュール時刻が設定される', async () => {
    const uploader = new FakeUploader(UPLOAD_RESULT);
    const uc = new PublishVideoUseCase({
      uploader,
      metaReader: new FakeMetaReader(EPISODE_META),
      resultWriter: new FakeWriter(),
      logger: createNoopLogger(),
    });

    const result = await uc.execute({
      videoFilePath: '/tmp/ep001.mp4',
      publishNow: false,
    });

    expect(result.privacyStatus).toBe('private');
    expect(result.publishAt).toBeDefined();
    expect(result.publishAt).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:00:00\.000Z$/);
    expect(uploader.calls[0]!.privacyStatus).toBe('private');
    expect(uploader.calls[0]!.publishAt).toBeDefined();
  });

  it('publishNow=true: privacyStatus が public で publishAt が undefined', async () => {
    const uploader = new FakeUploader({
      ...UPLOAD_RESULT,
      privacyStatus: 'public',
      publishAt: undefined,
    });
    const uc = new PublishVideoUseCase({
      uploader,
      metaReader: new FakeMetaReader(EPISODE_META),
      resultWriter: new FakeWriter(),
      logger: createNoopLogger(),
    });

    const result = await uc.execute({
      videoFilePath: '/tmp/ep001.mp4',
      publishNow: true,
    });

    expect(result.privacyStatus).toBe('public');
    expect(result.publishAt).toBeUndefined();
    expect(uploader.calls[0]!.publishAt).toBeUndefined();
  });

  it('タグは sanitize されて uploader に渡る（特殊文字除去）', async () => {
    const uploader = new FakeUploader(UPLOAD_RESULT);
    const uc = new PublishVideoUseCase({
      uploader,
      metaReader: new FakeMetaReader({
        title: 'T',
        description: '',
        tags: ['AI&半導体', '<NVIDIA>', 'ok'],
      }),
      resultWriter: new FakeWriter(),
      logger: createNoopLogger(),
    });

    await uc.execute({ videoFilePath: '/tmp/ep001.mp4' });
    expect(uploader.calls[0]!.meta.tags).toEqual(['AI半導体', 'NVIDIA', 'ok']);
  });

  it('metaReader に videoFilePath / propsFilePath / inputYamlPath が渡る', async () => {
    const metaReader = new FakeMetaReader(EPISODE_META);
    const uc = new PublishVideoUseCase({
      uploader: new FakeUploader(UPLOAD_RESULT),
      metaReader,
      resultWriter: new FakeWriter(),
      logger: createNoopLogger(),
    });

    await uc.execute({
      videoFilePath: '/tmp/ep001.mp4',
      inputYamlPath: '/tmp/ep001.yaml',
      propsFilePath: '/tmp/ep001_props.json',
      titleOverride: '上書きタイトル',
    });

    expect(metaReader.calls[0]!.videoFilePath).toBe('/tmp/ep001.mp4');
    expect(metaReader.calls[0]!.inputYamlPath).toBe('/tmp/ep001.yaml');
    expect(metaReader.calls[0]!.propsFilePath).toBe('/tmp/ep001_props.json');
    expect(metaReader.calls[0]!.titleOverride).toBe('上書きタイトル');
  });

  it('resultWriter が正しいパスとアップロード結果で呼ばれる', async () => {
    const writer = new FakeWriter();
    const uc = new PublishVideoUseCase({
      uploader: new FakeUploader(UPLOAD_RESULT),
      metaReader: new FakeMetaReader(EPISODE_META),
      resultWriter: writer,
      logger: createNoopLogger(),
    });

    await uc.execute({ videoFilePath: '/output/ep001.mp4' });

    expect(writer.writes).toHaveLength(1);
    expect(writer.writes[0]!.videoFilePath).toBe('/output/ep001.mp4');
    expect(writer.writes[0]!.result.videoId).toBe('abc123');
  });

  it('アップローダーが例外を投げたら usecase から再 throw される', async () => {
    const uploader: VideoUploader = {
      upload: async () => {
        throw new Error('Network error');
      },
    };
    const uc = new PublishVideoUseCase({
      uploader,
      metaReader: new FakeMetaReader(EPISODE_META),
      resultWriter: new FakeWriter(),
      logger: createNoopLogger(),
    });

    await expect(uc.execute({ videoFilePath: '/tmp/ep001.mp4' })).rejects.toThrow('Network error');
  });

  it('result.tagCount は sanitize 後の件数', async () => {
    const uc = new PublishVideoUseCase({
      uploader: new FakeUploader(UPLOAD_RESULT),
      metaReader: new FakeMetaReader({
        title: 'T',
        description: '',
        tags: ['a', 'b', 'c'],
      }),
      resultWriter: new FakeWriter(),
      logger: createNoopLogger(),
    });

    const result = await uc.execute({ videoFilePath: '/tmp/ep001.mp4' });
    expect(result.tagCount).toBe(3);
  });
});
