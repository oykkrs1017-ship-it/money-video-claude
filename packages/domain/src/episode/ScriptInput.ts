import type { Chapter } from './Chapter';
import type { ChartDataPoint, ChartDataSet } from './Visual';
import type { InfographicSpec } from './InfographicSpec';

export interface BgmMap {
  hook?: string;
  explanation?: string;
  analysis?: string;
  summary?: string;
  cta?: string;
}

export interface ScriptInput {
  videoId: string;
  seed: string;
  title: string;
  description: string;
  tags: string[];
  chapters: Chapter[];
  chartData: Record<string, ChartDataSet | ChartDataPoint[]>;
  bgm?: string;
  bgmVolume?: number;
  bgmMap?: BgmMap;
  seVolume?: number;
  infographics?: InfographicSpec[];
  hideTitleCard?: boolean;
}
