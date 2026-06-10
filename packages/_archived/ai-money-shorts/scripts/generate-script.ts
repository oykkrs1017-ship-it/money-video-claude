import Anthropic from '@anthropic-ai/sdk';
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';
import { format } from 'date-fns';
import { validateEpisode } from '../src/schemas/episodeSchema';
import { CompositionType } from '../src/types/episode';
import { selectRandomType, getAllTypes } from '../src/utils/templateSelector';

dotenv.config({ path: path.resolve(__dirname, '../../../.env'), override: true });

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

/**
 * コマンドライン引数を解析
 */
function parseArgs(): { topic: string; type: CompositionType | 'random' } {
  const args = process.argv.slice(2);
  let topic = 'auto';
  let type: CompositionType | 'random' = 'random';

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--topic' && args[i + 1]) {
      topic = args[i + 1];
    }
    if (args[i] === '--type' && args[i + 1]) {
      type = args[i + 1] as CompositionType | 'random';
    }
  }
  return { topic, type };
}

/**
 * Claude API でトレンドトピックを5つ提案させ、最初の1つを返す
 */
async function suggestTrendingTopic(): Promise<string> {
  console.log('🔍 トレンドトピックを自動選定中...');
  const response = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 512,
    messages: [
      {
        role: 'user',
        content: `2026年3月現在の金融・テクノロジー・投資に関するYouTube Shortsに適したトレンドトピックを5つ提案してください。
各トピックは20〜40文字の日本語で、具体的な数字や問いかけを含むものにしてください。
形式:
1. トピック1
2. トピック2
...のように番号付きリストで出力してください。`,
      },
    ],
  });

  const text = response.content[0].type === 'text' ? response.content[0].text : '';
  const lines = text.split('\n').filter((l) => /^\d+\./.test(l));
  if (lines.length === 0) throw new Error('トピック提案に失敗しました');
  const firstTopic = lines[0].replace(/^\d+\.\s*/, '').trim();
  console.log(`✅ 選定トピック: ${firstTopic}`);
  return firstTopic;
}

/**
 * システムプロンプトを読み込む
 */
function loadSystemPrompt(): string {
  const promptPath = path.join(__dirname, '../prompts/script-system-prompt.md');
  return fs.readFileSync(promptPath, 'utf-8');
}

/**
 * レスポンスからJSONを抽出（```json ... ``` ブロックを除去）
 */
function extractJson(text: string): string {
  // コードブロックを除去
  const codeBlockMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (codeBlockMatch) return codeBlockMatch[1].trim();
  // JSONオブジェクトを直接抽出
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (jsonMatch) return jsonMatch[0];
  return text.trim();
}

/**
 * 台本JSONを生成（最大3回リトライ）
 */
async function generateScript(topic: string, compositionType: CompositionType): Promise<object> {
  const systemPrompt = loadSystemPrompt();
  const today = format(new Date(), 'yyyyMMdd');
  const episodeId = `ep-${today}-${String(Math.floor(Math.random() * 900) + 100)}`;

  const userPrompt = `以下のトピックと構成タイプで台本JSONを生成してください。

トピック: ${topic}
構成タイプ: ${compositionType}
エピソードID: ${episodeId}
作成日時: ${new Date().toISOString()}`;

  for (let attempt = 1; attempt <= 3; attempt++) {
    console.log(`📝 台本生成中... (試行 ${attempt}/3)`);
    try {
      const response = await client.messages.create({
        model: 'claude-sonnet-4-6',
        max_tokens: 4096,
        temperature: 0.9,
        system: systemPrompt,
        messages: [{ role: 'user', content: userPrompt }],
      });

      const rawText = response.content[0].type === 'text' ? response.content[0].text : '';
      const jsonStr = extractJson(rawText);
      const parsed = JSON.parse(jsonStr);

      const validation = validateEpisode(parsed);
      if (validation.success) {
        console.log('✅ バリデーション成功');
        return validation.data;
      } else {
        console.error(`❌ バリデーションエラー (試行 ${attempt}/3):`);
        validation.errors.forEach((e) => console.error(`  - ${e}`));
        if (attempt === 3) throw new Error('バリデーション失敗: 3回試行しましたが成功しませんでした');
      }
    } catch (err) {
      if (err instanceof SyntaxError) {
        console.error(`❌ JSON解析エラー (試行 ${attempt}/3): ${err.message}`);
        if (attempt === 3) throw err;
      } else {
        throw err;
      }
    }
  }
  throw new Error('台本生成に失敗しました');
}

/**
 * エピソードJSONを保存
 */
function saveEpisode(episode: object): string {
  const ep = episode as { id: string };
  const outputDir = path.join(__dirname, '../src/data/episodes');
  fs.mkdirSync(outputDir, { recursive: true });
  const outputPath = path.join(outputDir, `${ep.id}.json`);
  fs.writeFileSync(outputPath, JSON.stringify(episode, null, 2), 'utf-8');
  return outputPath;
}

async function main() {
  const { topic: rawTopic, type: rawType } = parseArgs();

  // トピック自動選定
  const topic = rawTopic === 'auto' ? await suggestTrendingTopic() : rawTopic;

  // 構成タイプ選択
  const compositionType: CompositionType =
    rawType === 'random' ? selectRandomType() : (rawType as CompositionType);

  console.log(`🎬 構成タイプ: ${compositionType}`);
  console.log(`📌 トピック: ${topic}`);

  const episode = await generateScript(topic, compositionType);
  const outputPath = saveEpisode(episode);

  console.log(`\n✅ 台本生成完了!`);
  console.log(`📁 保存先: ${outputPath}`);
  console.log(`🆔 エピソードID: ${(episode as { id: string }).id}`);
}

main().catch((err) => {
  console.error('❌ エラー:', err.message);
  process.exit(1);
});
