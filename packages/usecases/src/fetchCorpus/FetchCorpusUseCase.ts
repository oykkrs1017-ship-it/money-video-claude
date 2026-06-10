/**
 * FetchCorpusUseCase
 *
 * 競合チャンネルから YouTube 動画コーパス（メタデータ・サムネ・字幕）を収集する。
 *
 * フロー:
 *   1. competitor-channels.yaml を読み込む
 *   2. チャンネルフィルタ適用
 *   3. yt-dlp で動画 ID 一覧を取得
 *   4. 未収集の動画をダウンロード（既存はスキップ）
 *   5. コーパスインデックスを保存
 */

import * as fs from 'fs';
import * as path from 'path';
import type {
  CompetitorChannel,
  CorpusVideoMeta,
  FetchCorpusDeps,
  FetchCorpusInput,
  FetchCorpusResult,
} from './ports';

const DEFAULT_TOP_N = 15;
const RATE_LIMIT_BETWEEN_VIDEOS_MS = 1500;
const RATE_LIMIT_BETWEEN_CHANNELS_MS = 3000;

export class FetchCorpusUseCase {
  private readonly deps: FetchCorpusDeps;

  constructor(deps: FetchCorpusDeps) {
    this.deps = deps;
  }

  async execute(input: FetchCorpusInput): Promise<FetchCorpusResult> {
    const {
      configPath,
      corpusDir,
      topN = DEFAULT_TOP_N,
      filterChannel,
      dryRun = false,
    } = input;

    const { channelConfigReader, corpusVideoFetcher, corpusIndexWriter } = this.deps;

    // ─── yt-dlp 存在チェック ───────────────────────────────────────────────────
    if (!corpusVideoFetcher.isAvailable()) {
      throw new Error('yt-dlp が見つかりません。pip install yt-dlp でインストールしてください。');
    }

    // ─── 設定読み込み ─────────────────────────────────────────────────────────
    const config = await channelConfigReader.read(configPath);
    let channels: CompetitorChannel[] = config.channels ?? [];

    if (filterChannel) {
      channels = channels.filter((c) => c.handle === filterChannel);
      if (channels.length === 0) {
        throw new Error(`チャンネル "${filterChannel}" が見つかりません`);
      }
    }

    // ─── コーパスディレクトリ作成 ─────────────────────────────────────────────
    if (!fs.existsSync(corpusDir)) {
      fs.mkdirSync(corpusDir, { recursive: true });
    }

    const allMetadata: CorpusVideoMeta[] = [];
    let totalNew = 0;
    let totalSkipped = 0;

    // ─── チャンネルループ ─────────────────────────────────────────────────────
    for (const channel of channels) {
      const handleSafe = channel.handle.replace(/[@/]/g, '_').replace(/^_+/, '');
      const channelDir = path.join(corpusDir, handleSafe);

      if (!fs.existsSync(channelDir)) {
        fs.mkdirSync(channelDir, { recursive: true });
      }

      const videoIds = corpusVideoFetcher.listVideoIds(channel, topN, dryRun);

      for (const videoId of videoIds) {
        const videoDir = path.join(channelDir, videoId);
        const metaPath = path.join(videoDir, 'metadata.json');

        // 既に収集済みならスキップ
        if (fs.existsSync(metaPath)) {
          try {
            const existing = JSON.parse(fs.readFileSync(metaPath, 'utf8')) as CorpusVideoMeta;
            allMetadata.push(existing);
            totalSkipped++;
            continue;
          } catch {
            // パースエラーは再取得
          }
        }

        if (!fs.existsSync(videoDir)) {
          fs.mkdirSync(videoDir, { recursive: true });
        }

        const meta = corpusVideoFetcher.fetchVideoCorpus(videoId, channel, videoDir, dryRun);

        if (meta) {
          allMetadata.push(meta);
          totalNew++;
        }

        // レートリミット対策（dryRun 時はスキップ）
        if (!dryRun) {
          await delay(RATE_LIMIT_BETWEEN_VIDEOS_MS);
        }
      }

      // チャンネル間のレートリミット
      if (!dryRun) {
        await delay(RATE_LIMIT_BETWEEN_CHANNELS_MS);
      }
    }

    // ─── コーパスインデックス保存 ─────────────────────────────────────────────
    corpusIndexWriter.write(corpusDir, channels, allMetadata, totalNew, dryRun);

    return {
      totalVideos: allMetadata.length,
      newVideos: totalNew,
      skippedVideos: totalSkipped,
    };
  }
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
