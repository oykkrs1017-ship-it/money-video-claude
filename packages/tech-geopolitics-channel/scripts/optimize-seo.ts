/**
 * optimize-seo.ts
 *
 * エピソード YAML の title / description / tags を Claude API でSEO最適化する。
 *
 * 使い方:
 *   npx ts-node --transpile-only scripts/optimize-seo.ts input/ep015.yaml
 *   npx ts-node --transpile-only scripts/optimize-seo.ts input/ep015.yaml --apply
 *
 * --apply なし: diff 表示のみ（YAML 変更なし）
 * --apply あり: 確認後に YAML を上書き（元ファイルは .yaml.seo-bak にバックアップ）
 * --auto  あり: 確認なしで自動適用（パイプライン組み込み用）
 */

import * as fs from 'fs';
import * as path from 'path';
import * as readline from 'readline';
import * as yaml from 'js-yaml';
import * as dotenv from 'dotenv';
import Anthropic from '@anthropic-ai/sdk';

dotenv.config({ path: path.join(__dirname, '..', '..', '..', '.env') });
dotenv.config({ path: path.join(__dirname, '..', '.env'), override: true });

interface SeoResult {
  title: string;
  description: string;
  tags: string[];
  reasoning: {
    titleChange: string;
    descriptionChange: string;
    tagsAdded: string[];
    tagsRemoved: string[];
  };
}

function extractChapterSummaries(doc: Record<string, unknown>): string {
  const chapters = Array.isArray(doc['chapters']) ? (doc['chapters'] as unknown[]) : [];
  return chapters
    .map((ch) => {
      const chapter = ch as Record<string, unknown>;
      const type = typeof chapter['type'] === 'string' ? chapter['type'] : '?';
      const topic = typeof chapter['topic'] === 'string' ? chapter['topic'] : '';
      const lines = Array.isArray(chapter['lines']) ? (chapter['lines'] as Record<string, string>[]) : [];
      const firstLine = lines[0] ?? {};
      const firstText = Object.values(firstLine)
        .find((v) => typeof v === 'string' && v.length > 10) ?? '';
      return `[${type}] ${topic}: ${(firstText as string).slice(0, 80)}`;
    })
    .join('\n');
}

async function optimizeSeo(yamlPath: string, apply: boolean, auto: boolean): Promise<void> {
  const apiKey = process.env['ANTHROPIC_API_KEY'];
  if (!apiKey) {
    console.error('❌ ANTHROPIC_API_KEY が未設定です');
    process.exit(1);
  }

  const rawYaml = fs.readFileSync(yamlPath, 'utf8');
  const doc = yaml.load(rawYaml) as Record<string, unknown>;

  const currentTitle = typeof doc['title'] === 'string' ? doc['title'] : '';
  const currentDescription = typeof doc['description'] === 'string' ? doc['description'] : '';
  const currentTags = Array.isArray(doc['tags']) ? (doc['tags'] as string[]) : [];

  const chapterSummaries = extractChapterSummaries(doc);

  const client = new Anthropic({ apiKey });

  const systemPrompt = `あなたは日本語YouTubeのSEO専門家です。
対象チャンネル: テクノロジー×地政学×投資（視聴者: 30〜40代個人投資家）
目標: 検索流入とCTRを最大化しながら、AI生成感を排除したナチュラルな日本語で最適化する。

## タイトル最適化ルール
- 60字以内（YouTube検索結果での表示上限）
- 主要キーワードを先頭30字以内に含める
- 数字（%、円、倍率）を使って具体性を出す
- 「やばい」「衝撃」「必見」などの誇張表現は避ける
- 疑問形より断言形の方が高CTR

## description 最適化ルール
- 最初の150字（折りたたみ前）に最重要キーワードを自然に含める
- 200〜400字が理想
- 動画で学べることを箇条書き1〜3点でまとめる
- ハッシュタグは付けない（別途自動付加される）

## tags 最適化ルール
- 検索ボリュームの高いキーワードを先頭に配置
- 1語タグと複合タグを混在させる
- 関連する人名・企業名・指数名を追加
- 30個以内・合計500字以内

## 出力形式
以下のJSONのみを出力してください（前後の説明文は不要）:
{
  "title": "最適化タイトル",
  "description": "最適化説明文",
  "tags": ["タグ1", "タグ2"],
  "reasoning": {
    "titleChange": "変更理由",
    "descriptionChange": "変更理由",
    "tagsAdded": ["追加タグ"],
    "tagsRemoved": ["削除タグ"]
  }
}`;

  const userPrompt = `## 現在のメタデータ

タイトル: ${currentTitle}

説明文:
${currentDescription}

タグ: ${currentTags.join(', ')}

## 動画チャプター概要
${chapterSummaries}

上記をYouTube SEO観点で最適化してください。`;

  console.log('🤖 Claude API でSEO最適化中...');

  const message = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 1024,
    system: systemPrompt,
    messages: [{ role: 'user', content: userPrompt }],
  });

  const responseText =
    message.content[0] && message.content[0].type === 'text' ? message.content[0].text : '';

  const jsonMatch = responseText.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    console.error('❌ Claude のレスポンスからJSONを抽出できませんでした:');
    console.error(responseText);
    process.exit(1);
  }

  const result = JSON.parse(jsonMatch[0]) as SeoResult;

  console.log('\n' + '='.repeat(60));
  console.log('📊 SEO最適化結果');
  console.log('='.repeat(60));

  console.log('\n【タイトル】');
  console.log(`  変更前: ${currentTitle}`);
  console.log(`  変更後: ${result.title}`);
  console.log(`  理由  : ${result.reasoning.titleChange}`);

  console.log('\n【説明文】');
  console.log('  変更前:');
  currentDescription.split('\n').forEach((l) => console.log(`    ${l}`));
  console.log('  変更後:');
  result.description.split('\n').forEach((l) => console.log(`    ${l}`));
  console.log(`  理由  : ${result.reasoning.descriptionChange}`);

  console.log('\n【タグ】');
  if (result.reasoning.tagsAdded.length > 0) {
    console.log(`  追加: ${result.reasoning.tagsAdded.join(', ')}`);
  }
  if (result.reasoning.tagsRemoved.length > 0) {
    console.log(`  削除: ${result.reasoning.tagsRemoved.join(', ')}`);
  }
  console.log(`  最終タグ数: ${result.tags.length}個`);

  if (!apply && !auto) {
    console.log('\n💡 --apply を付けて実行するとYAMLに書き込みます');
    return;
  }

  if (!auto) {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    const confirmed = await new Promise<boolean>((resolve) => {
      rl.question('\nYAMLに適用しますか？ (y/N): ', (ans) => {
        rl.close();
        resolve(ans.trim().toLowerCase() === 'y');
      });
    });
    if (!confirmed) {
      console.log('キャンセルしました。');
      return;
    }
  }

  const backupPath = yamlPath.replace('.yaml', '.yaml.seo-bak');
  fs.copyFileSync(yamlPath, backupPath);
  console.log(`📦 バックアップ: ${backupPath}`);

  // title / description / tags のみ差し替え、他フィールドは保持
  const updatedDoc = { ...doc, title: result.title, description: result.description, tags: result.tags };
  const updatedYaml = yaml.dump(updatedDoc, { lineWidth: 120, noRefs: true });
  fs.writeFileSync(yamlPath, updatedYaml, 'utf8');
  console.log(`✅ YAMLを更新しました: ${yamlPath}`);
}

const args = process.argv.slice(2);
const yamlArg = args.find((a) => !a.startsWith('--'));
const applyFlag = args.includes('--apply');
const autoFlag = args.includes('--auto');

if (!yamlArg) {
  console.error(
    '使い方: npx ts-node --transpile-only scripts/optimize-seo.ts input/ep015.yaml [--apply|--auto]',
  );
  process.exit(1);
}

const resolvedPath = path.isAbsolute(yamlArg)
  ? yamlArg
  : path.resolve(__dirname, '..', yamlArg);

if (!fs.existsSync(resolvedPath)) {
  console.error(`❌ ファイルが見つかりません: ${resolvedPath}`);
  process.exit(1);
}

optimizeSeo(resolvedPath, applyFlag, autoFlag).catch((err: unknown) => {
  console.error('❌ エラー:', (err as Error).message ?? err);
  process.exit(1);
});
