/**
 * scripts/fetch-x-post.ts
 *
 * X (Twitter) のポスト URL を受け取り、内容を knowledge/x-posts/ に保存する。
 *
 * 使い方:
 *   npx ts-node --transpile-only scripts/fetch-x-post.ts --url "https://x.com/user/status/123"
 *   npx ts-node --transpile-only scripts/fetch-x-post.ts --url "https://x.com/..." --tags "投資,NISA"
 *
 * フェッチ戦略:
 *   defuddle CLI が内部で FxTwitter API を呼び出し X ポストを取得する。
 *   X API キー・ログイン不要。
 */

import * as path from 'path';
import * as fs from 'fs';
import { spawnSync } from 'child_process';
import * as dotenv from 'dotenv';

dotenv.config({ path: path.join(__dirname, '..', '..', '.env') });
dotenv.config({ path: path.join(__dirname, '..', '.env'), override: true });

// ─── パス定義 ────────────────────────────────────────────────────────────────

const packageRoot = path.resolve(__dirname, '..');
const rootDir = path.join(packageRoot, '..', '..');
const xPostsDir = path.join(rootDir, 'knowledge', 'x-posts');
const indexPath = path.join(xPostsDir, 'index.json');
// npm workspace でルートに hoisting されるため rootDir から参照
const defuddleCliJs = path.join(rootDir, 'node_modules', 'defuddle', 'dist', 'cli.js');

// ─── 型定義 ──────────────────────────────────────────────────────────────────

interface XPostRecord {
  id: string;
  author: string;
  title: string;
  text: string;
  created_at: string;
  url: string;
  tags: string[];
  fetched_at: string;
}

interface XPostsIndex {
  schemaVersion: '1.0';
  updatedAt: string;
  posts: XPostRecord[];
}

interface DefuddleOutput {
  content?: string;
  author?: string;
  title?: string;
  published?: string;
  description?: string;
  wordCount?: number;
}

// ─── argv パース ─────────────────────────────────────────────────────────────

const argv = process.argv.slice(2);

function getArg(flag: string): string | undefined {
  const idx = argv.indexOf(flag);
  return idx !== -1 ? argv[idx + 1] : undefined;
}

const rawUrl = getArg('--url');
const tagsArg = getArg('--tags') ?? '';

if (!rawUrl) {
  console.error('エラー: --url が必要です');
  console.error('例: npx ts-node --transpile-only scripts/fetch-x-post.ts --url "https://x.com/..."');
  process.exit(1);
}

// ─── URL 正規化・ID 抽出 ──────────────────────────────────────────────────────

function extractPostId(url: string): string | null {
  const match = url.match(/\/status(?:es)?\/(\d+)/);
  return match ? match[1] : null;
}

function normalizeXUrl(url: string): string {
  return url.replace('twitter.com', 'x.com');
}

const normalizedUrl = normalizeXUrl(rawUrl);
const postId = extractPostId(normalizedUrl);

if (!postId) {
  console.error('エラー: URL から post ID を抽出できません:', normalizedUrl);
  process.exit(1);
}

const tags = tagsArg ? tagsArg.split(',').map((t) => t.trim()).filter(Boolean) : [];

// ─── defuddle フェッチ ────────────────────────────────────────────────────────

function fetchViaDefuddle(url: string): DefuddleOutput | null {
  console.log('[defuddle] フェッチ中（FxTwitter API 経由）...');

  const result = spawnSync(
    'node',
    [defuddleCliJs, 'parse', url, '--json', '--markdown'],
    { encoding: 'utf-8', timeout: 30000, maxBuffer: 1024 * 1024 * 5 },
  );

  if (result.status !== 0 || !result.stdout?.trim()) {
    console.warn('[defuddle] 失敗:', result.stderr?.slice(0, 300) ?? '(出力なし)');
    return null;
  }

  try {
    return JSON.parse(result.stdout) as DefuddleOutput;
  } catch {
    console.warn('[defuddle] JSON パース失敗');
    return null;
  }
}

// ─── ストレージ操作 ───────────────────────────────────────────────────────────

function loadIndex(): XPostsIndex {
  if (!fs.existsSync(indexPath)) {
    return { schemaVersion: '1.0', updatedAt: new Date().toISOString(), posts: [] };
  }
  try {
    return JSON.parse(fs.readFileSync(indexPath, 'utf-8')) as XPostsIndex;
  } catch {
    return { schemaVersion: '1.0', updatedAt: new Date().toISOString(), posts: [] };
  }
}

function savePost(record: XPostRecord): void {
  fs.mkdirSync(xPostsDir, { recursive: true });

  const postDir = path.join(xPostsDir, record.id);
  fs.mkdirSync(postDir, { recursive: true });
  fs.writeFileSync(path.join(postDir, 'metadata.json'), JSON.stringify(record, null, 2), 'utf-8');

  const index = loadIndex();
  const existing = index.posts.findIndex((p) => p.id === record.id);
  if (existing !== -1) {
    index.posts[existing] = record;
  } else {
    index.posts.push(record);
  }
  index.updatedAt = new Date().toISOString();
  fs.writeFileSync(indexPath, JSON.stringify(index, null, 2), 'utf-8');
}

// ─── main ─────────────────────────────────────────────────────────────────────

function main(): void {
  console.log('X ポスト取得:', normalizedUrl);

  const fetched = fetchViaDefuddle(normalizedUrl);

  if (!fetched?.content) {
    console.error('エラー: ポスト内容を取得できませんでした。');
    console.error('  - ポストが非公開または削除されている可能性があります');
    process.exit(1);
  }

  const record: XPostRecord = {
    id: postId!,
    author: fetched.author ?? '',
    title: fetched.title ?? '',
    text: fetched.content,
    created_at: fetched.published?.slice(0, 10) ?? new Date().toISOString().slice(0, 10),
    url: normalizedUrl,
    tags,
    fetched_at: new Date().toISOString(),
  };

  savePost(record);

  console.log('\n✓ 保存完了');
  console.log('  ID      :', record.id);
  console.log('  Author  :', record.author || '(不明)');
  console.log('  Date    :', record.created_at);
  console.log('  Tags    :', record.tags.join(', ') || '(なし)');
  console.log('  Preview :', record.text.slice(0, 120).replace(/\n/g, ' ') + '...');
  console.log('  保存先  :', path.relative(process.cwd(), indexPath));
}

main();
