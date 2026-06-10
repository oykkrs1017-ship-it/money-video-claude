/**
 * generate-ai-infographics.ts
 * ep*.json 内の { type: "ai-infographic" } ビジュアルに対して
 * Claude API で HTML インフォグラフィックを生成し Puppeteer で PNG に変換する。
 *
 * 使い方:
 *   npx ts-node --transpile-only scripts/generate-ai-infographics.ts --input input/epXXX.json
 *
 * 出力先: public/images/{key}.png（key 例: "ep007/01-hormuz-map"）
 */

import * as fs from 'fs';
import * as path from 'path';
import Anthropic from '@anthropic-ai/sdk';
import puppeteer from 'puppeteer';
import type { ScriptInput } from '../src/utils/types';

// ─── 定数 ───────────────────────────────────────────────────────────────────

const CANVAS_W = 1200;
const CANVAS_H = 700;

const SYSTEM_PROMPT = `あなたはHTMLインフォグラフィック専門家です。
ユーザーの指示に従い、完全なHTML文書を1つ生成してください。

制約:
- 出力は <html> タグで始まり </html> で終わる完全なHTML文書のみ（コードブロックや説明文は不要）
- 外部フォント・外部画像・外部CSSは一切使用しない（インラインCSSのみ）
- キャンバスサイズ: 幅${CANVAS_W}px × 高さ${CANVAS_H}px（body/html の width/height を固定すること）
- フォント: "Yu Gothic", "Hiragino Kaku Gothic ProN", "Meiryo", sans-serif
- 背景色: #0d1b2a（紺）
- アクセントカラー: #4a9eff（青）
- テキストカラー: #e8f4fd（明るいグレー）
- 日本語テキスト対応・情報密度高め・視覚的にリッチに
- SVG・CSS アニメーションは使用可（JavaScript は禁止）
- margin: 0; padding: 0; overflow: hidden; を body に適用`;

// ─── CLI 引数パース ──────────────────────────────────────────────────────────

function parseArgs(): { inputPath: string } {
  const args = process.argv.slice(2);
  const inputIdx = args.indexOf('--input');
  if (inputIdx === -1 || !args[inputIdx + 1]) {
    console.error('使い方: npx ts-node --transpile-only scripts/generate-ai-infographics.ts --input input/epXXX.json');
    process.exit(1);
  }
  return { inputPath: args[inputIdx + 1] };
}

// ─── ai-infographic エントリ収集 ─────────────────────────────────────────────

interface AIInfographicEntry {
  key: string;
  prompt: string;
}

function collectEntries(scriptInput: ScriptInput): AIInfographicEntry[] {
  const seen = new Set<string>();
  const entries: AIInfographicEntry[] = [];

  for (const chapter of scriptInput.chapters ?? []) {
    for (const line of chapter.lines ?? []) {
      const v = line.visual as { type?: string; key?: string; prompt?: string } | undefined;
      if (v?.type === 'ai-infographic' && v.key && v.prompt) {
        if (!seen.has(v.key)) {
          seen.add(v.key);
          entries.push({ key: v.key, prompt: v.prompt });
        }
      }
    }
  }

  return entries;
}

// ─── Claude API で HTML 生成 ─────────────────────────────────────────────────

async function generateHtml(client: Anthropic, prompt: string): Promise<string> {
  const message = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 8192,
    system: SYSTEM_PROMPT,
    messages: [{ role: 'user', content: prompt }],
  });

  const text = message.content
    .filter((b) => b.type === 'text')
    .map((b) => (b as { type: 'text'; text: string }).text)
    .join('');

  // <html>...</html> を抽出
  const match = text.match(/<html[\s\S]*<\/html>/i);
  if (!match) {
    throw new Error('Claude のレスポンスに <html> ブロックが見つかりませんでした');
  }
  return match[0];
}

// ─── Puppeteer で PNG 変換 ───────────────────────────────────────────────────

async function htmlToPng(html: string, outputPath: string): Promise<void> {
  const browser = await puppeteer.launch({ headless: true });
  try {
    const page = await browser.newPage();
    await page.setViewport({ width: CANVAS_W, height: CANVAS_H, deviceScaleFactor: 1 });
    await page.setContent(html, { waitUntil: 'networkidle0', timeout: 15000 });
    await page.screenshot({ path: outputPath, type: 'png' });
  } finally {
    await browser.close();
  }
}

// ─── メイン ─────────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  const { inputPath } = parseArgs();

  const absInput = path.resolve(process.cwd(), inputPath);
  if (!fs.existsSync(absInput)) {
    console.error(`ファイルが見つかりません: ${absInput}`);
    process.exit(1);
  }

  const scriptInput: ScriptInput = JSON.parse(fs.readFileSync(absInput, 'utf-8'));
  const entries = collectEntries(scriptInput);

  if (entries.length === 0) {
    console.log('ai-infographic ビジュアルが見つかりませんでした（スキップ）');
    return;
  }

  console.log(`${entries.length} 件の ai-infographic を生成します`);

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    console.error('ANTHROPIC_API_KEY が設定されていません');
    process.exit(1);
  }
  const client = new Anthropic({ apiKey });

  const publicDir = path.join(path.dirname(absInput), '..', 'public', 'images');

  let generated = 0;
  let skipped = 0;

  for (const entry of entries) {
    const outputPath = path.join(publicDir, `${entry.key}.png`);

    if (fs.existsSync(outputPath)) {
      console.log(`  スキップ（既存）: ${entry.key}`);
      skipped++;
      continue;
    }

    // 出力ディレクトリを作成
    fs.mkdirSync(path.dirname(outputPath), { recursive: true });

    console.log(`  生成中: ${entry.key}`);
    try {
      const html = await generateHtml(client, entry.prompt);
      await htmlToPng(html, outputPath);
      console.log(`  ✓ ${entry.key}.png`);
      generated++;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`  ✗ ${entry.key}: ${msg}`);
    }
  }

  console.log(`\n完了: 生成 ${generated} 件 / スキップ ${skipped} 件`);
}

main().catch((err) => {
  console.error('Fatal:', err instanceof Error ? err.message : err);
  process.exit(1);
});
