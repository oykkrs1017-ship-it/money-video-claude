/**
 * enhance-infographics.ts
 * Adobe MCP 後処理のヘルパースクリプト。Claude が Adobe MCP ツールを呼ぶ際に補助する。
 *
 * 使い方:
 *   # インフォグラフィックのパス・サイズ一覧を JSON 出力
 *   npx ts-node --transpile-only scripts/enhance-infographics.ts --list [--input ./input/script-input.json]
 *
 *   # presigned URL からファイルをダウンロードしてローカルに保存
 *   npx ts-node --transpile-only scripts/enhance-infographics.ts --download <url> <dest>
 */

import * as fs from 'fs';
import * as path from 'path';

const PUBLIC_DIR = path.resolve(__dirname, '..', 'public');

// ─── --list ─────────────────────────────────────────────────────────────────

interface InfographicEntry {
  outputPath: string;
}

interface ScriptInput {
  infographics?: InfographicEntry[];
}

function listMode(inputPath: string): void {
  const raw = fs.readFileSync(inputPath, 'utf-8');
  const data = JSON.parse(raw) as ScriptInput;
  const infographics = data.infographics ?? [];

  const result = infographics
    .map((spec) => {
      const absPath = path.join(PUBLIC_DIR, spec.outputPath);
      if (!fs.existsSync(absPath)) {
        process.stderr.write(`[warn] not found: ${absPath}\n`);
        return null;
      }
      const { size } = fs.statSync(absPath);
      return { path: absPath, outputPath: spec.outputPath, size };
    })
    .filter(Boolean);

  process.stdout.write(JSON.stringify(result, null, 2) + '\n');
}

// ─── --download ─────────────────────────────────────────────────────────────

async function downloadMode(url: string, dest: string): Promise<void> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`fetch failed: ${res.status} ${res.statusText}`);
  const buf = Buffer.from(await res.arrayBuffer());
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.writeFileSync(dest, buf);
  process.stderr.write(`saved: ${dest} (${buf.length} bytes)\n`);
}

// ─── エントリポイント ─────────────────────────────────────────────────────

(async () => {
  const args = process.argv.slice(2);
  const mode = args[0];

  if (mode === '--list') {
    let inputPath = './input/script-input.json';
    const inputIdx = args.indexOf('--input');
    if (inputIdx !== -1 && args[inputIdx + 1]) {
      inputPath = args[inputIdx + 1];
    }
    listMode(inputPath);
    return;
  }

  if (mode === '--download') {
    const url = args[1];
    const dest = args[2];
    if (!url || !dest) {
      process.stderr.write('Usage: --download <url> <dest>\n');
      process.exit(1);
    }
    await downloadMode(url, dest);
    return;
  }

  process.stderr.write(
    'Usage:\n' +
    '  enhance-infographics.ts --list [--input <path>]\n' +
    '  enhance-infographics.ts --download <url> <dest>\n'
  );
  process.exit(1);
})();
