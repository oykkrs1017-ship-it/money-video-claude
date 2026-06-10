/**
 * scripts/generate-proposals.ts
 *
 * topic-research.json からトピック提案を自動生成し knowledge/proposals/YYYY-MM-DD.md に保存する。
 * 週次スケジュール実行用（非インタラクティブ）。
 *
 * 使い方:
 *   npx ts-node --transpile-only scripts/generate-proposals.ts
 *   npx ts-node --transpile-only scripts/generate-proposals.ts --top 7
 *
 * research-topics.ts 実行後に呼ぶことを想定。
 * select-topic.ts と同じロジックだがユーザー選択ステップを省略し提案ファイルに保存する。
 */

import * as dotenv from 'dotenv';
import * as path from 'path';
import * as fs from 'fs';
dotenv.config({ path: path.join(__dirname, '..', '..', '.env') });
dotenv.config({ path: path.join(__dirname, '..', '.env'), override: true });

import { createLogger } from '@money-video/shared-ts';
import { AnthropicClient } from '@money-video/adapters/llm';
import { NewsScorer } from '@money-video/adapters/research';
import type { TopicResearch, CompetitorVideo } from '@money-video/adapters/research';

// ─── 型定義 ───────────────────────────────────────────────────────────────────

interface TopicProposal {
  number: number;
  title: string;
  theme: string;
  whyNow: string;
  valueForViewers: string;
  titleCandidates: string[];
  sourceUrls: string[];
}

// ─── argv パース ──────────────────────────────────────────────────────────────

const argv = process.argv.slice(2);
const topIdx = argv.indexOf('--top');
const TOP_N = topIdx >= 0 && argv[topIdx + 1] ? parseInt(argv[topIdx + 1]!, 10) : 5;

// ─── パス定義 ─────────────────────────────────────────────────────────────────

const packageRoot = path.resolve(__dirname, '..');
const rootDir = path.join(packageRoot, '..', '..');
const knowledgeDir = path.join(rootDir, 'knowledge');
const proposalsDir = path.join(knowledgeDir, 'proposals');
const researchPath = path.join(knowledgeDir, 'topic-research.json');
const configPath = path.join(knowledgeDir, 'competitor-channels.yaml');
const promptPath = path.join(packageRoot, 'input', 'TOPIC_PROPOSAL_PROMPT.md');

// ─── ユーティリティ ───────────────────────────────────────────────────────────

function parseProposalsFromJson(text: string): TopicProposal[] {
  const match = text.match(/```json\s*([\s\S]*?)```/);
  const jsonStr = match ? match[1]! : text;
  try {
    const parsed = JSON.parse(jsonStr.trim()) as unknown;
    if (Array.isArray(parsed)) return parsed as TopicProposal[];
    const obj = parsed as Record<string, unknown>;
    if (obj['proposals'] && Array.isArray(obj['proposals'])) {
      return obj['proposals'] as TopicProposal[];
    }
  } catch {
    // fall through
  }
  return [];
}

function renderMarkdown(
  proposals: TopicProposal[],
  research: TopicResearch,
  dateStr: string,
): string {
  const lines: string[] = [
    `# トピック提案 ${dateStr}`,
    '',
    '## リサーチ概要',
    `- 調査日時: ${research.researched_at}`,
    `- 取得動画数: ${research.competitor_videos.length}件`,
    `- 取得ニュース数: ${research.news_items.length}件`,
    '',
    '## トピック提案',
    '',
    '---',
    '',
  ];

  for (const p of proposals) {
    lines.push(`【${p.number}】${p.title}`);
    lines.push('');
    lines.push(`- テーマ: ${p.theme}`);
    lines.push(`- なぜ今ホットか: ${p.whyNow}`);
    lines.push(`- 視聴者へのバリュー: ${p.valueForViewers}`);
    lines.push(`- 想定タイトル案:`);
    for (let i = 0; i < p.titleCandidates.length; i++) {
      lines.push(`  ${i + 1}. ${p.titleCandidates[i]}`);
    }
    if (p.sourceUrls.length > 0) {
      lines.push(`- ソースURL: ${p.sourceUrls.join(' / ')}`);
    }
    lines.push('');
    lines.push('---');
    lines.push('');
  }

  lines.push('取り上げたいトピックの番号を返信してください。');
  lines.push('');
  return lines.join('\n');
}

// ─── main ─────────────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  const logger = createLogger({ name: 'generate-proposals', level: 'info' });

  const apiKey = process.env['ANTHROPIC_API_KEY'];
  if (!apiKey) {
    logger.fatal('ANTHROPIC_API_KEY が未設定');
    process.exit(1);
  }

  if (!fs.existsSync(researchPath)) {
    logger.fatal({ researchPath }, 'topic-research.json が見つかりません。research-topics.ts を先に実行してください');
    process.exit(1);
  }

  const research = JSON.parse(fs.readFileSync(researchPath, 'utf-8')) as TopicResearch;
  logger.info(
    { competitorVideos: research.competitor_videos.length, newsItems: research.news_items.length },
    'リサーチデータ読み込み完了',
  );

  // ─── スコアリング ─────────────────────────────────────────────────────────

  const configRaw = fs.readFileSync(configPath, 'utf-8');
  const keywordMatch = configRaw.match(/keywords_for_news:\s*\n([\s\S]*?)(?:\n\w|\n$|$)/);
  const keywords: string[] = keywordMatch
    ? keywordMatch[1]!
        .split('\n')
        .map((l) => l.replace(/^\s*-\s*["']?/, '').replace(/["']?\s*$/, '').trim())
        .filter(Boolean)
    : [];

  const scorer = new NewsScorer();
  const scored = scorer.score(research.news_items, keywords, research.competitor_videos);
  const topNews = scorer.deduplicateAndSort(scored).slice(0, 15);

  // ─── Claude でトピック提案生成 ────────────────────────────────────────────

  const promptTemplate = fs.existsSync(promptPath) ? fs.readFileSync(promptPath, 'utf-8') : '';

  const competitorTitles = research.competitor_videos
    .slice(0, 20)
    .map(
      (v: CompetitorVideo) =>
        `- 【${v.channel}】${v.title}（${v.views ? Math.round(v.views / 1000) + '千回' : '?'}視聴）`,
    )
    .join('\n');

  const newsSummary =
    topNews.length > 0
      ? topNews
          .map(
            (n, i) =>
              `${i + 1}. [スコア${n.totalScore.toFixed(1)}] ${n.title}\n   キーワード: ${n.keyword} | 日付: ${n.published ?? '不明'} | URL: ${n.url}`,
          )
          .join('\n\n')
      : '（ニュースなし）';

  const systemPrompt = `あなたはテクノロジー投資×地政学YouTubeチャンネルのトピック選定エキスパートです。
過去1週間のトレンドニュースと競合チャンネルのデータをもとに、最も視聴率が取れるトピックを提案してください。

以下のJSONフォーマットで正確に${TOP_N}件を返してください：

\`\`\`json
[
  {
    "number": 1,
    "title": "提案トピックの簡潔なタイトル（30字以内）",
    "theme": "テーマの核心を1〜2行で",
    "whyNow": "なぜ今週このトピックがホットか（直近ニュースとの関連）",
    "valueForViewers": "投資家・ビジネスパーソンにとっての価値",
    "titleCandidates": ["YouTubeタイトル案1", "YouTubeタイトル案2", "YouTubeタイトル案3"],
    "sourceUrls": ["参考にしたニュースURL"]
  }
]
\`\`\`

JSON以外のテキストは不要です。`;

  const userPrompt = `## チャンネルコンセプト・ターゲット
${promptTemplate.split('## 扱うテーマ領域')[0] ?? promptTemplate}

## 競合チャンネルの直近動画（被り回避用）
${competitorTitles}

## 今週のトレンドニュース（スコア降順）
${newsSummary}

上記のデータをもとに、競合と被らず、かつ今週のトレンドに乗った${TOP_N}件のトピックを提案してください。`;

  logger.info('Claude にトピック提案を依頼中...');

  const llm = new AnthropicClient({ apiKey });
  const response = await llm.complete({
    system: systemPrompt,
    user: userPrompt,
    model: 'claude-sonnet-4-6',
    maxTokens: 4096,
  });

  const proposals = parseProposalsFromJson(response.text);

  if (proposals.length === 0) {
    logger.error('Claude の出力を JSON にパースできませんでした');
    logger.error({ rawOutput: response.text }, 'raw output');
    process.exit(1);
  }

  // ─── proposals/YYYY-MM-DD.md に保存 ──────────────────────────────────────

  if (!fs.existsSync(proposalsDir)) {
    fs.mkdirSync(proposalsDir, { recursive: true });
  }

  const dateStr = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
  const outputPath = path.join(proposalsDir, `${dateStr}.md`);
  const markdown = renderMarkdown(proposals, research, dateStr);

  fs.writeFileSync(outputPath, markdown, 'utf-8');

  logger.info({ outputPath, count: proposals.length }, '提案ファイル保存完了');
  logger.info(`次のステップ: npm run select-topic で番号を選んでください`);
}

main().catch((err: unknown) => {
  const logger = createLogger({ name: 'generate-proposals', level: 'error' });
  logger.fatal({ err: err instanceof Error ? err.message : String(err) }, 'generate-proposals: fatal');
  process.exit(1);
});
