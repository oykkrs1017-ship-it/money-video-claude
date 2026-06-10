/**
 * fetch-images.ts
 * セクションに対応する画像を Pexels API で検索・取得し、
 * エピソード JSON の visuals に image エントリを追加する。
 *
 * 使い方:
 *   npx ts-node --transpile-only scripts/fetch-images.ts --input input/ep001.json
 *
 * 必要な環境変数 (.env):
 *   PEXELS_API_KEY=...     Pexels API キー（無料: https://www.pexels.com/api/）
 *   ANTHROPIC_API_KEY=...  Claude API キー（検索クエリ最適化に使用）
 */

import * as fs from 'fs';
import * as path from 'path';
import axios from 'axios';
import * as dotenv from 'dotenv';
import Anthropic from '@anthropic-ai/sdk';
import { Episode, Section, VisualElement } from '../src/types/episode';

dotenv.config();

// ── 設定 ─────────────────────────────────────────────────────────────
const PEXELS_API_KEY = process.env.PEXELS_API_KEY ?? '';
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY ?? '';

if (!PEXELS_API_KEY) {
  console.error('❌ PEXELS_API_KEY が未設定です。.env に追加してください。');
  process.exit(1);
}

// ── CLI 引数パース ────────────────────────────────────────────────────
const args = process.argv.slice(2);
const inputArg = args.find((a) => a.startsWith('--input='))?.slice(8)
  ?? args[args.indexOf('--input') + 1];

if (!inputArg) {
  console.error('使い方: npx ts-node --transpile-only scripts/fetch-images.ts --input input/ep001.json');
  process.exit(1);
}

const inputPath = path.resolve(inputArg);
const episode: Episode = JSON.parse(fs.readFileSync(inputPath, 'utf-8'));

// ── 画像保存先 ────────────────────────────────────────────────────────
const PUBLIC_DIR = path.resolve(__dirname, '../public');
const IMAGE_DIR = path.join(PUBLIC_DIR, 'images', episode.id);
fs.mkdirSync(IMAGE_DIR, { recursive: true });

// ── Claude でセクション名 → 英語検索クエリに変換 ─────────────────────
async function generateSearchQuery(
  sectionName: string,
  episodeTopic: string,
): Promise<string> {
  if (!ANTHROPIC_API_KEY) {
    // フォールバック: セクション名をローマ字変換（簡易）
    return `${episodeTopic} investment finance Japan`;
  }

  const client = new Anthropic({ apiKey: ANTHROPIC_API_KEY });
  const msg = await client.messages.create({
    model: 'claude-haiku-4-5',
    max_tokens: 60,
    messages: [
      {
        role: 'user',
        content: `以下のYouTube動画のセクション名に最適なPexels画像検索クエリを英語で1行だけ返してください。
金融・投資・日本経済をテーマにしたチャンネルです。
具体的・視覚的な名詞フレーズ（2〜4語）で。説明文や記号は不要。

動画トピック: ${episodeTopic}
セクション名: ${sectionName}`,
      },
    ],
  });

  const text = msg.content[0].type === 'text' ? msg.content[0].text.trim() : '';
  return text || `${episodeTopic} finance`;
}

// ── Pexels で画像検索 ─────────────────────────────────────────────────
interface PexelsPhoto {
  id: number;
  src: { large2x: string; large: string };
  photographer: string;
  url: string;
}

async function searchPexels(query: string): Promise<PexelsPhoto | null> {
  try {
    const res = await axios.get('https://api.pexels.com/v1/search', {
      headers: { Authorization: PEXELS_API_KEY },
      params: { query, per_page: 3, orientation: 'portrait' },
    });
    const photos: PexelsPhoto[] = res.data.photos;
    return photos[0] ?? null;
  } catch (err: unknown) {
    console.warn(`  Pexels検索失敗 (${query}):`, err instanceof Error ? err.message : err);
    return null;
  }
}

// ── 画像ダウンロード ───────────────────────────────────────────────────
async function downloadImage(url: string, destPath: string): Promise<void> {
  const res = await axios.get(url, { responseType: 'arraybuffer' });
  fs.writeFileSync(destPath, Buffer.from(res.data));
}

// ── セクションに画像 visual を追加する ────────────────────────────────
function sectionNeedsImage(section: Section): boolean {
  const hasGraph = section.visuals.some((v) => v.type === 'graph');
  const hasImage = section.visuals.some((v) => v.type === 'image');
  // graphがあれば画像不要、既に画像があればスキップ
  return !hasGraph && !hasImage;
}

// ── メイン ────────────────────────────────────────────────────────────
async function main() {
  console.log(`\n📸 画像取得開始: ${episode.id} (${episode.title})`);
  console.log(`   セクション数: ${episode.sections.length}`);

  let addedCount = 0;

  for (let i = 0; i < episode.sections.length; i++) {
    const section = episode.sections[i];

    if (!sectionNeedsImage(section)) {
      console.log(`  [${i + 1}/${episode.sections.length}] ${section.name} → スキップ（graph/image既存）`);
      continue;
    }

    console.log(`\n  [${i + 1}/${episode.sections.length}] ${section.name}`);

    // 1) 検索クエリ生成（Claude）
    const query = await generateSearchQuery(section.name, episode.topic);
    console.log(`    🔍 検索クエリ: "${query}"`);

    // 2) Pexels 検索
    const photo = await searchPexels(query);
    if (!photo) {
      console.log(`    ⚠️  画像が見つかりませんでした`);
      continue;
    }
    console.log(`    ✅ "${photo.photographer}" (Pexels ID: ${photo.id})`);

    // 3) ダウンロード
    const filename = `${i}.jpg`;
    const destPath = path.join(IMAGE_DIR, filename);
    const imageUrl = photo.src.large2x || photo.src.large;
    await downloadImage(imageUrl, destPath);
    console.log(`    💾 保存: public/images/${episode.id}/${filename}`);

    // 4) episode.json に image visual を追加
    const imageVisual: VisualElement = {
      type: 'image',
      imagePath: `images/${episode.id}/${filename}`,
      imageSearchQuery: query,
      imageCredit: photo.url,
    };

    episode.sections[i].visuals.unshift(imageVisual); // 先頭に追加
    addedCount++;

    // API レート制限対策
    await new Promise((r) => setTimeout(r, 400));
  }

  // 5) JSON 上書き保存
  fs.writeFileSync(inputPath, JSON.stringify(episode, null, 2), 'utf-8');
  console.log(`\n✅ 完了: ${addedCount}件の画像を追加しました → ${inputPath}`);
}

main().catch((err) => {
  console.error('❌ エラー:', err);
  process.exit(1);
});
