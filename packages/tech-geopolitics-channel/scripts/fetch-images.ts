/**
 * fetch-images.ts
 * Automatically downloads images referenced in script-input.json from free APIs.
 * Also outputs thumbnail metadata as a markdown file.
 *
 * Usage:
 *   npx ts-node scripts/fetch-images.ts [--input ./input/script-input.json]
 *
 * Environment variables:
 *   MAPBOX_TOKEN  - Required for map_* images
 *   UNSPLASH_KEY  - Required for img_* images
 */

import * as fs from 'fs';
import * as path from 'path';
import * as https from 'https';
import * as http from 'http';
import * as crypto from 'crypto';
import { URL } from 'url';
import { parse as parseYaml } from 'yaml';

// ---------------------------------------------------------------------------
// Lookup tables（config/assets.yaml からロード）
// ---------------------------------------------------------------------------

interface AssetsConfig {
  mapCoords: Record<string, { lon: number; lat: number; zoom: number; width: number; height: number }>;
  logoDomains: Record<string, string>;
  flagCodes: Record<string, string>;
  imgSearchTerms: Record<string, string>;
}

function loadAssetsConfig(): AssetsConfig {
  const configPath = path.resolve(__dirname, '..', 'config', 'assets.yaml');
  if (!fs.existsSync(configPath)) {
    throw new Error(`assets.yaml が見つかりません: ${configPath}`);
  }
  return parseYaml(fs.readFileSync(configPath, 'utf-8')) as AssetsConfig;
}

const ASSETS = loadAssetsConfig();
const MAP_COORDS = ASSETS.mapCoords;
const LOGO_DOMAINS = ASSETS.logoDomains;
const FLAG_CODES = ASSETS.flagCodes;
const IMG_SEARCH_TERMS = ASSETS.imgSearchTerms;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ImageData {
  src: string;
  /** 外部画像URL（指定時は fetch-images が自動ダウンロードして src に保存） */
  url?: string;
  caption?: string;
  position?: string;
  width?: number;
  duration?: number;
  animation?: string;
}

interface Visual {
  type: string;
  at?: number;
  imageData?: ImageData;
  chartType?: string;
  data?: string;
  text?: string;
}

interface LineVisual {
  type: string;
  src?: string;
}

interface Line {
  speaker: string;
  text: string;
  emotion?: string;
  audioFile?: string;
  audioDuration?: number;
  frameCount?: number;
  visual?: LineVisual;
}

interface Chapter {
  type: string;
  duration: number;
  lines?: Line[];
  visuals?: Visual[];
}

interface ScriptInput {
  videoId: string;
  seed?: string;
  title: string;
  description?: string;
  tags?: string[];
  chapters: Chapter[];
}

// ---------------------------------------------------------------------------
// HTTP download helper
// ---------------------------------------------------------------------------

function downloadFile(url: string, destPath: string): Promise<void> {
  return new Promise((resolve, reject) => {
    let redirectCount = 0;

    function doRequest(requestUrl: string): void {
      if (redirectCount > 5) {
        reject(new Error(`Too many redirects for ${requestUrl}`));
        return;
      }

      const parsedUrl = new URL(requestUrl);
      const transport = parsedUrl.protocol === 'https:' ? https : http;

      const options = {
        hostname: parsedUrl.hostname,
        port: parsedUrl.port || (parsedUrl.protocol === 'https:' ? 443 : 80),
        path: parsedUrl.pathname + parsedUrl.search,
        method: 'GET',
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; video-pipeline/1.0)',
        },
      };

      const req = transport.request(options, (res) => {
        const statusCode = res.statusCode ?? 0;

        // Follow redirects
        if ((statusCode === 301 || statusCode === 302 || statusCode === 307 || statusCode === 308) && res.headers.location) {
          redirectCount++;
          const redirectUrl = res.headers.location.startsWith('http')
            ? res.headers.location
            : `${parsedUrl.protocol}//${parsedUrl.host}${res.headers.location}`;
          res.resume(); // consume response body to free memory
          doRequest(redirectUrl);
          return;
        }

        if (statusCode < 200 || statusCode >= 300) {
          res.resume();
          reject(new Error(`HTTP ${statusCode} for ${requestUrl}`));
          return;
        }

        const fileStream = fs.createWriteStream(destPath);
        res.pipe(fileStream);

        fileStream.on('finish', () => {
          fileStream.close();
          resolve();
        });

        fileStream.on('error', (err) => {
          fs.unlink(destPath, () => {}); // clean up partial file
          reject(err);
        });

        res.on('error', (err) => {
          fs.unlink(destPath, () => {});
          reject(err);
        });
      });

      req.on('error', (err) => {
        reject(err);
      });

      req.end();
    }

    doRequest(url);
  });
}

// ---------------------------------------------------------------------------
// Fetch helpers per prefix
// ---------------------------------------------------------------------------

async function fetchMapImage(key: string, destPath: string): Promise<void> {
  const token = process.env['MAPBOX_TOKEN'];
  if (!token) {
    throw new Error('MAPBOX_TOKEN not set — skipping map image');
  }

  const coords = MAP_COORDS[key];
  if (!coords) {
    throw new Error(`No coordinate entry for key "${key}"`);
  }

  const { lon, lat, zoom, width, height } = coords;
  const url = `https://api.mapbox.com/styles/v1/mapbox/satellite-streets-v12/static/${lon},${lat},${zoom}/${width}x${height}@2x?access_token=${token}`;
  await downloadFile(url, destPath);
}

async function fetchLogoImage(key: string, destPath: string): Promise<void> {
  const domain = LOGO_DOMAINS[key];
  if (!domain) {
    throw new Error(`No domain entry for key "${key}"`);
  }

  const url = `https://logo.clearbit.com/${domain}?size=256`;
  await downloadFile(url, destPath);
}

async function fetchFlagImage(key: string, destPath: string): Promise<void> {
  const code = FLAG_CODES[key];
  if (!code) {
    throw new Error(`No country code entry for key "${key}"`);
  }

  const url = `https://flagsapi.com/${code}/flat/256.png`;
  await downloadFile(url, destPath);
}

async function fetchImgImage(key: string, destPath: string): Promise<void> {
  const unsplashKey = process.env['UNSPLASH_KEY'];
  if (!unsplashKey) {
    throw new Error('UNSPLASH_KEY not set — skipping img image');
  }

  const searchTerm = IMG_SEARCH_TERMS[key] ?? key.replace(/^img_/, '').replace(/_/g, ' ');
  const apiUrl = `https://api.unsplash.com/photos/random?query=${encodeURIComponent(searchTerm)}&orientation=landscape&client_id=${unsplashKey}`;

  // Fetch the JSON response to get the image URL
  const imageUrl = await new Promise<string>((resolve, reject) => {
    const parsedUrl = new URL(apiUrl);
    const options = {
      hostname: parsedUrl.hostname,
      path: parsedUrl.pathname + parsedUrl.search,
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; video-pipeline/1.0)',
        'Accept': 'application/json',
      },
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk: Buffer) => { data += chunk.toString(); });
      res.on('end', () => {
        if ((res.statusCode ?? 0) < 200 || (res.statusCode ?? 0) >= 300) {
          reject(new Error(`Unsplash API returned HTTP ${res.statusCode}`));
          return;
        }
        try {
          const json = JSON.parse(data) as { urls?: { regular?: string } };
          const url = json?.urls?.regular;
          if (!url) {
            reject(new Error('No urls.regular in Unsplash response'));
          } else {
            resolve(url);
          }
        } catch (e) {
          reject(new Error(`Failed to parse Unsplash response: ${String(e)}`));
        }
      });
      res.on('error', reject);
    });
    req.on('error', reject);
    req.end();
  });

  await downloadFile(imageUrl, destPath);
}

// ---------------------------------------------------------------------------
// Direct URL image download
// ---------------------------------------------------------------------------

/**
 * 任意のURL から画像をダウンロードして public/content/ に保存する。
 * 既に存在する場合はスキップ。
 * @returns "content/<fileName>" 形式の src パス
 */
async function downloadUrlImage(url: string, destDir: string): Promise<string> {
  const urlHash = crypto.createHash('md5').update(url).digest('hex').slice(0, 8);
  const extMatch = url.match(/\.(jpg|jpeg|png|webp|gif|svg)(\?.*)?$/i);
  const ext = extMatch?.[1] ?? 'jpg';
  const fileName = `web_${urlHash}.${ext}`;
  const destPath = path.join(destDir, fileName);

  if (fs.existsSync(destPath)) {
    console.log(`  [SKIP] Already exists: ${fileName}`);
    return `content/${fileName}`;
  }

  await downloadFile(url, destPath);
  console.log(`  [OK] Downloaded: ${fileName}`);
  return `content/${fileName}`;
}

// ---------------------------------------------------------------------------
// Route image download by prefix
// ---------------------------------------------------------------------------

async function downloadImage(key: string, destPath: string): Promise<void> {
  if (key.startsWith('map_')) {
    await fetchMapImage(key, destPath);
  } else if (key.startsWith('logo_')) {
    await fetchLogoImage(key, destPath);
  } else if (key.startsWith('flag_')) {
    await fetchFlagImage(key, destPath);
  } else if (key.startsWith('img_')) {
    await fetchImgImage(key, destPath);
  } else {
    throw new Error(`Unknown image prefix for key "${key}" — cannot route to any API`);
  }
}

// ---------------------------------------------------------------------------
// Thumbnail metadata generator
// ---------------------------------------------------------------------------

function generateThumbnailMetadata(script: ScriptInput, imageSrcs: string[]): string {
  const titleParts = script.title.split('｜');
  const mainText = titleParts[0]?.trim() ?? script.title;
  const subText = titleParts[1]?.trim() ?? '';

  // Find hook chapter and its first line text
  const hookChapter = script.chapters.find((ch) => ch.type === 'hook');
  const hookFirstLine = hookChapter?.lines?.[0]?.text ?? '';

  // Find a recommended background image (prefer map_ images)
  const mapImage = imageSrcs.find((src) => {
    const basename = path.basename(src, path.extname(src));
    return basename.startsWith('map_');
  });
  const recommendedBg = mapImage ?? imageSrcs[0] ?? 'なし';

  // Format background image description
  const bgDescription = mapImage
    ? `${mapImage}（${getMapDescription(path.basename(mapImage, path.extname(mapImage)))}）`
    : recommendedBg;

  // Format tags
  const tags = script.tags ?? [];
  const keywords = tags.join(', ');
  const hashTags = tags.map((t) => `#${t}`).join(' ');

  return `# サムネイル生成メタデータ
**エピソード**: ${script.videoId}
**タイトル**: ${script.title}

## メインテキスト（大見出し）
${mainText}

## サブテキスト（小見出し）
${subText}

## 推奨キーワード（タグ）
${keywords}

## 推奨背景画像
${bgDescription}

## カラー
- アクセント: #4a9eff（テーマカラー）
- 背景: #0d1b2a（ダークネイビー）

## フック文（サムネイルに入れる煽り文句）
${hookFirstLine}

## タグ（YouTube）
${hashTags}
`;
}

function getMapDescription(key: string): string {
  const descriptions: Record<string, string> = {
    'map_taiwan':   '台湾地図',
    'map_usachina': '米中対立マップ',
    'map_japan':    '日本地図',
    'map_china':    '中国地図',
    'map_asia':     'アジア地図',
    'map_world':    '世界地図',
  };
  return descriptions[key] ?? key;
}

// ---------------------------------------------------------------------------
// Argument parsing
// ---------------------------------------------------------------------------

function parseArgs(): { inputPath: string } {
  const args = process.argv.slice(2);
  let inputPath = './input/script-input.json';

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--input' && args[i + 1]) {
      inputPath = args[i + 1]!;
      i++;
    }
  }

  return { inputPath };
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main(): Promise<void> {
  const { inputPath } = parseArgs();

  // Read and parse script-input.json
  const absoluteInputPath = path.resolve(inputPath);
  if (!fs.existsSync(absoluteInputPath)) {
    console.error(`Error: Input file not found: ${absoluteInputPath}`);
    process.exit(1);
  }

  const scriptContent = fs.readFileSync(absoluteInputPath, 'utf-8');
  const script = JSON.parse(scriptContent) as ScriptInput;

  // Ensure public/content directory exists (needed early for URL downloads)
  const publicContentDir = path.resolve('./public/content');
  if (!fs.existsSync(publicContentDir)) {
    fs.mkdirSync(publicContentDir, { recursive: true });
    console.log(`Created directory: ${publicContentDir}`);
  }

  // --- Step 1: Process imageData.url fields (download and update src) ---
  let urlDownloadCount = 0;
  let scriptModified = false;

  for (const chapter of script.chapters) {
    for (const visual of chapter.visuals ?? []) {
      if (visual.type === 'image' && visual.imageData?.url) {
        const imgData = visual.imageData;
        const imgUrl = imgData.url as string;
        process.stdout.write(`[URL] ${imgUrl.slice(0, 60)}... `);
        try {
          const newSrc = await downloadUrlImage(imgUrl, publicContentDir);
          imgData.src = newSrc;
          urlDownloadCount++;
          scriptModified = true;
        } catch (err) {
          const message = err instanceof Error ? err.message : String(err);
          console.log(`\n  [ERROR] ${message}`);
        }
      }
    }
  }

  if (scriptModified) {
    fs.writeFileSync(absoluteInputPath, JSON.stringify(script, null, 2), 'utf-8');
    console.log(`\nUpdated ${urlDownloadCount} URL image(s) and saved: ${absoluteInputPath}`);
  }

  // --- Step 2: Collect all unique image src values from visuals ---
  const seenSrcs = new Set<string>();
  for (const chapter of script.chapters) {
    for (const line of chapter.lines ?? []) {
      if (line.visual?.type === 'image' && line.visual.src) {
        seenSrcs.add(line.visual.src);
      }
    }
  }

  const imageSrcs = Array.from(seenSrcs);
  console.log(`\nFound ${imageSrcs.length} unique image(s) in ${absoluteInputPath}\n`);

  // Ensure output directory exists
  const outputDir = path.resolve('./output');
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
    console.log(`Created directory: ${outputDir}`);
  }

  let succeeded = 0;
  let failed = 0;
  let skipped = 0;

  for (let i = 0; i < imageSrcs.length; i++) {
    const src = imageSrcs[i]!;
    const index = `[${i + 1}/${imageSrcs.length}]`;

    // Build destination path under ./public/
    const destPath = path.resolve('./public', src);

    // Ensure parent directory of destPath exists
    const destDir = path.dirname(destPath);
    if (!fs.existsSync(destDir)) {
      fs.mkdirSync(destDir, { recursive: true });
    }

    // Extract key: strip leading directory and extension
    // e.g. "content/map_taiwan.png" -> "map_taiwan"
    const basename = path.basename(src);
    const key = path.basename(src, path.extname(src));

    // Check if file already exists
    if (fs.existsSync(destPath)) {
      console.log(`${index} ${basename} → already exists ⏭`);
      skipped++;
      continue;
    }

    // Determine API label for logging
    let apiLabel = 'unknown';
    if (key.startsWith('map_'))  apiLabel = 'Mapbox';
    else if (key.startsWith('logo_')) apiLabel = 'Clearbit';
    else if (key.startsWith('flag_')) apiLabel = 'flagsapi.com';
    else if (key.startsWith('img_'))  apiLabel = 'Unsplash';

    process.stdout.write(`${index} ${basename} → ${apiLabel}... `);

    try {
      await downloadImage(key, destPath);
      console.log('✅');
      succeeded++;
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.log(`❌ ${message}`);
      // Clean up any partial file
      if (fs.existsSync(destPath)) {
        fs.unlinkSync(destPath);
      }
      failed++;
    }
  }

  // Generate and save thumbnail metadata
  const thumbnailMd = generateThumbnailMetadata(script, imageSrcs);
  const thumbnailPath = path.resolve('./output/thumbnail-metadata.md');
  fs.writeFileSync(thumbnailPath, thumbnailMd, 'utf-8');
  console.log(`\nSaved thumbnail metadata → ${thumbnailPath}`);

  // Print summary
  console.log('\n─────────────────────────────');
  console.log(`Summary: ${succeeded} succeeded, ${failed} failed, ${skipped} skipped`);
  console.log('─────────────────────────────\n');

  if (failed > 0) {
    process.exit(1);
  }
}

main().catch((err) => {
  console.error('Unexpected error:', err);
  process.exit(1);
});
