/**
 * CompetitorChannelConfigReader
 *
 * competitor-channels.yaml を読み込んで CompetitorChannelsConfig を返す。
 * js-yaml で YAML をパース。
 */

import * as fs from 'fs';
import * as yaml from 'js-yaml';
import { AdapterError } from '@money-video/shared-ts';
import type { CompetitorChannelsConfig } from './types';

/** ChannelConfigReader port との shape 互換を保つ */
export interface ChannelConfigReader {
  read(configPath: string): Promise<CompetitorChannelsConfig>;
}

export class CompetitorChannelConfigReader implements ChannelConfigReader {
  async read(configPath: string): Promise<CompetitorChannelsConfig> {
    if (!fs.existsSync(configPath)) {
      throw new AdapterError(
        `competitor-channels.yaml が見つかりません: ${configPath}`,
        'research',
      );
    }

    const content = fs.readFileSync(configPath, 'utf8');

    try {
      const parsed = yaml.load(content) as CompetitorChannelsConfig;
      return {
        channels: parsed.channels ?? [],
        keywords_for_news: parsed.keywords_for_news ?? [],
        settings: {
          max_videos_per_channel: parsed.settings?.max_videos_per_channel ?? 10,
          news_lookback_days: parsed.settings?.news_lookback_days ?? 7,
          max_news_per_keyword: parsed.settings?.max_news_per_keyword ?? 5,
        },
      };
    } catch (err) {
      throw new AdapterError(
        `competitor-channels.yaml のパースに失敗しました: ${(err as Error).message}`,
        'research',
        err,
      );
    }
  }
}
