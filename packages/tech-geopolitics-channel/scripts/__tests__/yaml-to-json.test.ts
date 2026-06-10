/**
 * yaml-to-json.ts スモークテスト
 * subprocess 経由で CLI を実行し、変換・バリデーションの正常系・異常系を検証する。
 */

import { describe, it, expect, afterEach } from 'vitest';
import { spawnSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

const SCRIPT = path.resolve(__dirname, '..', 'yaml-to-json.ts');
const FIXTURE_VALID = path.resolve(__dirname, 'fixtures', 'valid-episode.yaml');
const ROOT = path.resolve(__dirname, '..', '..', '..', '..');

function runScript(args: string[]): { stdout: string; stderr: string; status: number } {
  const result = spawnSync(
    'npx',
    ['ts-node', '--transpile-only', SCRIPT, ...args],
    {
      cwd: path.resolve(__dirname, '..', '..'),
      encoding: 'utf8',
      timeout: 30_000,
      shell: true,
    },
  );
  return {
    stdout: result.stdout ?? '',
    stderr: result.stderr ?? '',
    status: result.status ?? 1,
  };
}

describe('yaml-to-json CLI', () => {
  const tempFiles: string[] = [];

  afterEach(() => {
    for (const f of tempFiles) {
      if (fs.existsSync(f)) fs.unlinkSync(f);
    }
    tempFiles.length = 0;
  });

  it('正常系: 有効なYAMLをJSONに変換できる', () => {
    const outPath = path.join(os.tmpdir(), `yaml-to-json-test-${Date.now()}.json`);
    tempFiles.push(outPath);

    const { status, stderr } = runScript([FIXTURE_VALID, '-o', outPath]);

    expect(status, `stderr: ${stderr}`).toBe(0);
    expect(fs.existsSync(outPath)).toBe(true);

    const output = JSON.parse(fs.readFileSync(outPath, 'utf-8'));
    expect(output.videoId).toBe('ep-test-001');
    expect(output.chapters).toHaveLength(2);
    expect(output.chapters[0].type).toBe('hook');
    expect(output.chapters[0].lines[0].speaker).toBe('maro');
    expect(output.chapters[1].lines[0].visual?.type).toBe('chart');
  });

  it('正常系: show フィールドが Visual に正しく変換される', () => {
    const outPath = path.join(os.tmpdir(), `yaml-to-json-test-${Date.now()}.json`);
    tempFiles.push(outPath);

    runScript([FIXTURE_VALID, '-o', outPath]);

    const output = JSON.parse(fs.readFileSync(outPath, 'utf-8'));
    const hookLine = output.chapters[0].lines[1];
    expect(hookLine.visual).toMatchObject({
      type: 'stat',
      value: '60%',
      label: '世界シェア',
    });
  });

  it('異常系: 存在しないファイルを指定するとエラーで終了する', () => {
    const { status, stderr } = runScript(['/nonexistent/path.yaml']);
    expect(status).not.toBe(0);
    expect(stderr + (runScript(['/nonexistent/path.yaml']).stdout)).toMatch(/見つかりません|エラー|not found/i);
  });

  it('異常系: --help フラグで正常終了する', () => {
    const { status, stdout } = runScript(['--help']);
    expect(status).toBe(0);
    expect(stdout).toMatch(/使い方/);
  });
});
