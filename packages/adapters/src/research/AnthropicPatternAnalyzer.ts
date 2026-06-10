/**
 * AnthropicPatternAnalyzer
 *
 * Anthropic Claude API を使って競合コーパスのパターンを分析する。
 */

import * as fs from 'fs';
import * as path from 'path';
import Anthropic from '@anthropic-ai/sdk';
import { AdapterError, createLogger } from '@money-video/shared-ts';
import type { VideoMetaForAnalysis } from './types';

const logger = createLogger({ name: 'AnthropicPatternAnalyzer', level: 'info' });

/** PatternAnalyzer port との shape 互換を保つ */
export interface PatternAnalyzer {
  analyzeTitles(videos: VideoMetaForAnalysis[], dryRun: boolean): Promise<string>;
  analyzeHooks(videos: VideoMetaForAnalysis[], corpusDir: string, dryRun: boolean): Promise<string>;
  analyzeThumbnails(videos: VideoMetaForAnalysis[], corpusDir: string, dryRun: boolean): Promise<string>;
  synthesizeInsights(
    titleAnalysis: string,
    hookAnalysis: string,
    thumbnailAnalysis: string,
    topVideos: VideoMetaForAnalysis[],
    dryRun: boolean,
  ): Promise<{ structureInsights: string[]; recommendedHooks: string[]; avoidPatterns: string[] }>;
}
import { extractOpeningText } from './vttParser';

const HAIKU_MODEL = 'claude-haiku-4-5-20251001';
const SONNET_MODEL = 'claude-sonnet-4-6';

export class AnthropicPatternAnalyzer implements PatternAnalyzer {
  private readonly client: Anthropic;

  constructor(apiKey?: string) {
    const key = apiKey ?? process.env['ANTHROPIC_API_KEY'];
    if (!key) {
      throw new AdapterError('ANTHROPIC_API_KEY が設定されていません', 'research');
    }
    this.client = new Anthropic({ apiKey: key });
  }

  async analyzeTitles(videos: VideoMetaForAnalysis[], dryRun: boolean): Promise<string> {
    if (dryRun) return '[DRY-RUN] タイトル分析をスキップ';

    const titleList = videos
      .map(
        (v, i) =>
          `${i + 1}. [${v.channel}] ${v.title} (${v.views ? Math.round(v.views / 10000) + '万再生' : '不明'})`,
      )
      .join('\n');

    const response = await this.client.messages.create({
      model: HAIKU_MODEL,
      max_tokens: 2000,
      system: `あなたはYouTube動画のタイトルパターンを分析する専門家です。
与えられたタイトルリストから、再生数との相関を踏まえて「勝ちパターン」を日本語で分析してください。

分析項目:
1. タイトル構造の型（疑問形、数字、否定形、固有名詞、緊急性など）とその再生数との相関
2. 最も再生数が多い動画に共通するタイトル要素
3. 避けるべきタイトルパターン
4. 推奨するタイトル構造テンプレート（3〜5個）

JSON形式で出力してください:
{
  "titleTypes": [{"type": "型名", "description": "説明", "examples": ["例1", "例2"], "avgViewsEstimate": "高/中/低", "frequency": 件数}],
  "topPatternInsights": ["インサイト1", "インサイト2", ...],
  "avoidPatterns": ["避けるべきパターン1", ...],
  "recommendedTemplates": ["テンプレート1: {{数字}}が{{動詞}}する理由", ...]
}`,
      messages: [
        {
          role: 'user',
          content: `以下の競合チャンネル動画タイトルリスト（再生数順）を分析してください:\n\n${titleList}`,
        },
      ],
    });

    return response.content[0]?.type === 'text' ? response.content[0].text : '';
  }

  async analyzeHooks(
    videos: VideoMetaForAnalysis[],
    corpusDir: string,
    dryRun: boolean,
  ): Promise<string> {
    if (dryRun) return '[DRY-RUN] フック分析をスキップ';

    const hooks: Array<{ title: string; opening: string; views: number | null }> = [];

    for (const video of videos.slice(0, 20)) {
      const handleSafe = video.channelHandle.replace(/[@/]/g, '_').replace(/^_+/, '');
      const vttPath = path.join(corpusDir, handleSafe, video.id, 'subs.ja.vtt');
      if (!fs.existsSync(vttPath)) continue;
      const vttContent = fs.readFileSync(vttPath, 'utf8');
      const opening = extractOpeningText(vttContent, 15);
      if (opening) {
        hooks.push({ title: video.title, opening, views: video.views });
      }
    }

    if (hooks.length === 0) {
      return '字幕データが取得できなかったため、タイトルのみの分析になっています。';
    }

    const hookList = hooks
      .map(
        (h, i) =>
          `${i + 1}. タイトル: ${h.title}\n   冒頭15秒: ${h.opening}\n   再生数: ${h.views ? Math.round(h.views / 10000) + '万' : '不明'}`,
      )
      .join('\n\n');

    const response = await this.client.messages.create({
      model: HAIKU_MODEL,
      max_tokens: 2000,
      system: `YouTubeの動画冒頭フックパターンを分析する専門家です。
与えられた動画の冒頭15秒のテキストから「視聴者を引き込むフックパターン」を分析してください。

JSON形式で出力:
{
  "hookTypes": [{"type": "型名", "description": "説明", "examples": ["例文"], "effectiveness": "高/中/低"}],
  "keyInsights": ["インサイト1", ...],
  "recommendedHookTemplates": ["テンプレート1", "テンプレート2", ...]
}`,
      messages: [
        {
          role: 'user',
          content: `以下の動画冒頭フックを分析してください:\n\n${hookList}`,
        },
      ],
    });

    return response.content[0]?.type === 'text' ? response.content[0].text : '';
  }

  async analyzeThumbnails(
    videos: VideoMetaForAnalysis[],
    corpusDir: string,
    dryRun: boolean,
  ): Promise<string> {
    if (dryRun) return '[DRY-RUN] サムネイル分析をスキップ';

    const thumbData: Array<{ video: VideoMetaForAnalysis; base64: string }> = [];

    for (const video of videos.slice(0, 10)) {
      const handleSafe = video.channelHandle.replace(/[@/]/g, '_').replace(/^_+/, '');
      const thumbPath = path.join(corpusDir, handleSafe, video.id, 'thumbnail.jpg');
      if (!fs.existsSync(thumbPath)) continue;
      const base64 = fs.readFileSync(thumbPath).toString('base64');
      thumbData.push({ video, base64 });
    }

    if (thumbData.length === 0) {
      return 'サムネイル画像が取得できなかったため、分析をスキップしました。';
    }

    const imageContents = thumbData.flatMap(({ video, base64 }, i) => [
      {
        type: 'text' as const,
        text: `--- サムネイル ${i + 1}: ${video.title} (${video.views ? Math.round(video.views / 10000) + '万再生' : '不明'}) ---`,
      },
      {
        type: 'image' as const,
        source: {
          type: 'base64' as const,
          media_type: 'image/jpeg' as const,
          data: base64,
        },
      },
    ]);

    const response = await this.client.messages.create({
      model: SONNET_MODEL,
      max_tokens: 2500,
      system: `あなたはYouTubeサムネイルのCTR最大化を専門とするデザインアナリストです。
JSON形式で出力:
{
  "colorScheme": "説明",
  "textDensity": "高/中/低",
  "composition": "説明",
  "facesPresent": true/false,
  "numberHighlight": true/false,
  "commonElements": ["要素1", ...],
  "avoidElements": ["要素1", ...]
}`,
      messages: [
        {
          role: 'user',
          content: [
            { type: 'text', text: '以下の競合チャンネルサムネイル画像を分析してください。' },
            ...imageContents,
          ],
        },
      ],
    });

    return response.content[0]?.type === 'text' ? response.content[0].text : '';
  }

  async synthesizeInsights(
    titleAnalysis: string,
    hookAnalysis: string,
    thumbnailAnalysis: string,
    topVideos: VideoMetaForAnalysis[],
    dryRun: boolean,
  ): Promise<{
    structureInsights: string[];
    recommendedHooks: string[];
    avoidPatterns: string[];
  }> {
    if (dryRun) {
      return {
        structureInsights: ['[DRY-RUN] 統合分析スキップ'],
        recommendedHooks: [],
        avoidPatterns: [],
      };
    }

    const topTitles = topVideos.slice(0, 10).map((v) => v.title).join('\n');

    const response = await this.client.messages.create({
      model: HAIKU_MODEL,
      max_tokens: 1500,
      system: `テクノロジー投資×地政学系YouTubeチャンネルの動画制作アドバイザーです。
JSON形式で出力:
{
  "structureInsights": ["インサイト1", ...5件],
  "recommendedHooks": ["推奨フックテンプレート1", ...3件],
  "avoidPatterns": ["避けるべきパターン1", ...3件]
}`,
      messages: [
        {
          role: 'user',
          content: `## タイトル分析\n${titleAnalysis}\n\n## フック分析\n${hookAnalysis}\n\n## サムネイル分析\n${thumbnailAnalysis}\n\n## Top10タイトル\n${topTitles}`,
        },
      ],
    });

    const text = response.content[0]?.type === 'text' ? response.content[0].text : '{}';

    try {
      const match = text.match(/\{[\s\S]*\}/);
      if (match) {
        return JSON.parse(match[0]) as {
          structureInsights: string[];
          recommendedHooks: string[];
          avoidPatterns: string[];
        };
      }
    } catch (err) {
      logger.warn(
        { err: (err as Error).message, preview: text.slice(0, 100) },
        'synthesizeInsights: LLM 応答の JSON パースに失敗しました。空のインサイトを使用します',
      );
    }

    return { structureInsights: [], recommendedHooks: [], avoidPatterns: [] };
  }
}
