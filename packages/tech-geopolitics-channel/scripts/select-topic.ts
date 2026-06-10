/**
 * scripts/select-topic.ts
 *
 * 過去1週間のニュースをスコアリングし、Claude がトピック提案 → ユーザーが選択する。
 *
 * 使い方:
 *   npx ts-node --transpile-only scripts/select-topic.ts
 *   npx ts-node --transpile-only scripts/select-topic.ts --fresh            # ニュース再取得（無料: GDELT のみ）
 *   npx ts-node --transpile-only scripts/select-topic.ts --fresh --with-exa # Exa も併用（課金あり）
 *   npx ts-node --transpile-only scripts/select-topic.ts --top 7            # 提案件数
 *
 * 課金ポリシー: --fresh のニュース取得は既定で GDELT（キー不要・無料）のみ。
 *   Exa（従量課金）は --with-exa を明示したときだけ併用する。為替1次データ(Frankfurter)は無料で常時取得。
 */

import * as dotenv from 'dotenv';
import * as path from 'path';
import * as fs from 'fs';
import * as readline from 'readline';
// packages/.env（共通キー）→ tech-geopolitics-channel/.env（上書き）の順で読む
dotenv.config({ path: path.join(__dirname, '..', '..', '.env') });
dotenv.config({ path: path.join(__dirname, '..', '.env'), override: true });

import { createLogger } from '@money-video/shared-ts';
import { AnthropicClient } from '@money-video/adapters/llm';
import { NewsScorer } from '@money-video/adapters/research';
import {
  CompetitorChannelConfigReader,
  YtDlpCompetitorVideoFetcher,
  ExaNewsFetcher,
  GdeltNewsFetcher,
  JinaEnrichedGdeltFetcher,
  CompositeNewsFetcher,
  MacroSnapshotFetcher,
  RssFeedFetcher,
  FileSystemResearchStore,
  TopicPromptFileUpdater,
} from '@money-video/adapters/research';
import { ResearchTopicUseCase } from '@money-video/usecases/researchTopic';
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

interface SelectedTopic extends TopicProposal {
  selectedAt: string;
  sourceNews: Array<{ title: string; url: string; score: number }>;
}

// ─── argv パース ──────────────────────────────────────────────────────────────

const argv = process.argv.slice(2);
const FRESH = argv.includes('--fresh');
/** Exa（従量課金）を併用するか。既定 false＝無料ソースのみ */
const WITH_EXA = argv.includes('--with-exa');
const topIdx = argv.indexOf('--top');
const TOP_N = topIdx >= 0 && argv[topIdx + 1] ? parseInt(argv[topIdx + 1]!, 10) : 5;

// ─── パス定義 ─────────────────────────────────────────────────────────────────

const packageRoot = path.resolve(__dirname, '..');
const rootDir = path.join(packageRoot, '..', '..');
const knowledgeDir = path.join(rootDir, 'knowledge');
const researchPath = path.join(knowledgeDir, 'topic-research.json');
const configPath = path.join(knowledgeDir, 'competitor-channels.yaml');
const promptPath = path.join(packageRoot, 'input', 'TOPIC_PROPOSAL_PROMPT.md');
const outputPath = path.join(packageRoot, 'input', 'next-topic.json');

// ─── ユーティリティ ───────────────────────────────────────────────────────────

function ask(question: string): Promise<string> {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer.trim());
    });
  });
}

function parseProposalsFromJson(text: string): TopicProposal[] {
  const match = text.match(/```json\s*([\s\S]*?)```/);
  const jsonStr = match ? match[1]! : text;
  try {
    const parsed = JSON.parse(jsonStr.trim()) as unknown;
    if (Array.isArray(parsed)) {
      return parsed as TopicProposal[];
    }
    const obj = parsed as Record<string, unknown>;
    if (obj['proposals'] && Array.isArray(obj['proposals'])) {
      return obj['proposals'] as TopicProposal[];
    }
  } catch {
    // fall through to line-based fallback
  }
  return [];
}

// ─── main ─────────────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  const logger = createLogger({ name: 'select-topic', level: 'info' });

  // ANTHROPIC_API_KEY チェック
  const apiKey = process.env['ANTHROPIC_API_KEY'];
  if (!apiKey) {
    logger.fatal('ANTHROPIC_API_KEY が未設定');
    process.exit(1);
  }

  // ─── Step 1: リサーチデータ取得 ───────────────────────────────────────────

  if (FRESH) {
    logger.info({ withExa: WITH_EXA }, '--fresh: ニュース・競合動画を再取得します...');
    // 既定は GDELT（無料）のみ。--with-exa 指定時のみ Exa（課金）を併用。
    const exaFetchers = WITH_EXA ? [new ExaNewsFetcher()] : [];
    // Jina Reader で GDELT 記事の本文を取得（APIキー不要・無料・常時有効）
    const gdeltFetcher = new JinaEnrichedGdeltFetcher();
    const useCase = new ResearchTopicUseCase({
      channelConfigReader: new CompetitorChannelConfigReader(),
      videoFetcher: new YtDlpCompetitorVideoFetcher(),
      newsFetcher: new CompositeNewsFetcher([...exaFetchers, gdeltFetcher]),
      researchStore: new FileSystemResearchStore(),
      topicPromptUpdater: new TopicPromptFileUpdater(),
      // 為替の1次データ（ECB/Frankfurter・キー不要・無料）
      macroFetcher: new MacroSnapshotFetcher(),
      // 政府・中銀の1次プレス（日銀/Fed/金融庁/経産省・キー不要・無料）
      feedFetcher: new RssFeedFetcher(),
    });
    await useCase.execute({
      configPath,
      outputPath: researchPath,
      promptPath,
      skipYoutube: false,
      skipNews: false,
      dryRun: false,
    });
    logger.info('再取得完了');
  }

  if (!fs.existsSync(researchPath)) {
    logger.fatal({ researchPath }, 'topic-research.json が見つかりません。--fresh を付けて実行してください');
    process.exit(1);
  }

  const research = JSON.parse(fs.readFileSync(researchPath, 'utf-8')) as TopicResearch;
  logger.info(
    {
      competitorVideos: research.competitor_videos.length,
      newsItems: research.news_items.length,
      researchedAt: research.researched_at,
    },
    'リサーチデータ読み込み完了',
  );

  if (research.news_items.length === 0) {
    logger.warn('ニュースが0件です。EXA_API_KEY を確認するか --fresh で再取得してください');
  }

  // ─── Step 2: スコアリング ─────────────────────────────────────────────────

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

  logger.info({ topNewsCount: topNews.length }, 'スコアリング完了');

  // ─── Step 3: Claude でトピック提案生成 ───────────────────────────────────

  const promptTemplate = fs.existsSync(promptPath)
    ? fs.readFileSync(promptPath, 'utf-8')
    : '';

  const competitorTitles = research.competitor_videos
    .slice(0, 20)
    .map((v: CompetitorVideo) => `- 【${v.channel}】${v.title}（${v.views ? Math.round(v.views / 1000) + '千回' : '?'}視聴）`)
    .join('\n');

  const newsSummary = topNews.length > 0
    ? topNews
        .map(
          (n, i) =>
            `${i + 1}. [スコア${n.totalScore.toFixed(1)}] ${n.title}\n   キーワード: ${n.keyword} | 日付: ${n.published ?? '不明'} | URL: ${n.url}`,
        )
        .join('\n\n')
    : '（ニュースなし — 手動でトピックを指定してください）';

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

上記のデータをもとに、競合と被らず、かつ今週のトレンドに乗った${TOP_N}件のトピックを提案してください。
ニュースがある場合はそれを根拠として活用してください。`;

  logger.info('Claude にトピック提案を依頼中...');

  const llm = new AnthropicClient({ apiKey });
  const response = await llm.complete({
    system: systemPrompt,
    user: userPrompt,
    model: 'claude-sonnet-4-6',
    maxTokens: 4096,
  });

  // ─── Step 4: 提案を表示してユーザーが選択 ────────────────────────────────

  const proposals = parseProposalsFromJson(response.text);

  if (proposals.length === 0) {
    logger.error('Claude の出力を JSON にパースできませんでした');
    // eslint-disable-next-line no-console
    console.log('\n--- Claude の生出力 ---\n');
    // eslint-disable-next-line no-console
    console.log(response.text);
    process.exit(1);
  }

  // eslint-disable-next-line no-console
  console.log('\n' + '═'.repeat(60));
  // eslint-disable-next-line no-console
  console.log('📺 今週のトピック提案');
  // eslint-disable-next-line no-console
  console.log('═'.repeat(60) + '\n');

  for (const p of proposals) {
    // eslint-disable-next-line no-console
    console.log(`【${p.number}】${p.title}`);
    // eslint-disable-next-line no-console
    console.log(`  テーマ: ${p.theme}`);
    // eslint-disable-next-line no-console
    console.log(`  なぜ今: ${p.whyNow}`);
    // eslint-disable-next-line no-console
    console.log(`  価値: ${p.valueForViewers}`);
    // eslint-disable-next-line no-console
    console.log(`  タイトル案:`);
    for (const t of p.titleCandidates) {
      // eslint-disable-next-line no-console
      console.log(`    - ${t}`);
    }
    // eslint-disable-next-line no-console
    console.log('');
  }

  // eslint-disable-next-line no-console
  console.log('═'.repeat(60));

  const answer = await ask(`\n番号を入力してください（1〜${proposals.length}）: `);
  const selected = proposals.find((p) => p.number === parseInt(answer, 10));

  if (!selected) {
    logger.error({ answer }, '無効な番号です');
    process.exit(1);
  }

  // ─── Step 5: 選択結果を保存 ───────────────────────────────────────────────

  const sourceNews = topNews
    .filter((n) => selected.sourceUrls.includes(n.url))
    .map((n) => ({ title: n.title, url: n.url, score: parseFloat(n.totalScore.toFixed(2)) }));

  const result: SelectedTopic = {
    ...selected,
    selectedAt: new Date().toISOString(),
    sourceNews,
  };

  fs.writeFileSync(outputPath, JSON.stringify(result, null, 2), 'utf-8');

  logger.info({ outputPath, title: result.title }, '選択完了');
  // eslint-disable-next-line no-console
  console.log(`\n✅ 保存完了: ${outputPath}`);
  // eslint-disable-next-line no-console
  console.log(`   次のステップ: npx ts-node --transpile-only scripts/generate-script.ts --topic "${result.title}" --ep epXXX --with-exa`);
}

main().catch((err: unknown) => {
  const logger = createLogger({ name: 'select-topic', level: 'error' });
  logger.fatal({ err: err instanceof Error ? err.message : String(err) }, 'select-topic: fatal');
  process.exit(1);
});
