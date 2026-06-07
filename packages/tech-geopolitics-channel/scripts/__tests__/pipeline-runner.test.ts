/**
 * pipeline/runner.ts 冪等ロジックのユニットテスト。
 * 実スクリプトを呼ばず Fake step の run 呼び出し回数でスキップ判定を検証する。
 * Phase 2 の核心（入力未変更ならスキップ・変更すれば再実行）を保証する。
 */

import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { runPipeline, type PipelineStep } from '../pipeline/runner';

let tmpDir: string;
let manifestPath: string;

beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'pipeline-test-'));
  manifestPath = path.join(tmpDir, 'cache', 'build-manifest.test.json');
});

afterEach(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

function writeFile(name: string, content: string): string {
  const p = path.join(tmpDir, name);
  fs.writeFileSync(p, content, 'utf-8');
  return p;
}

describe('runPipeline 冪等性', () => {
  it('1回目は実行し、2回目（入力未変更）はスキップする', async () => {
    const input = writeFile('in.txt', 'hello');
    const output = path.join(tmpDir, 'out.txt');
    let runCount = 0;

    const makeStep = (): PipelineStep[] => [
      {
        name: 'step1',
        title: 'Step 1',
        inputs: [input],
        outputs: [output],
        run: () => {
          runCount++;
          fs.writeFileSync(output, 'generated', 'utf-8');
        },
      },
    ];

    await runPipeline(makeStep(), manifestPath);
    expect(runCount).toBe(1);
    expect(fs.existsSync(manifestPath)).toBe(true);

    await runPipeline(makeStep(), manifestPath);
    expect(runCount).toBe(1); // スキップされ増えない
  });

  it('入力が変わると再実行する', async () => {
    const input = writeFile('in.txt', 'v1');
    const output = path.join(tmpDir, 'out.txt');
    let runCount = 0;

    const makeStep = (): PipelineStep[] => [
      {
        name: 'step1',
        title: 'Step 1',
        inputs: [input],
        outputs: [output],
        run: () => {
          runCount++;
          fs.writeFileSync(output, 'generated', 'utf-8');
        },
      },
    ];

    await runPipeline(makeStep(), manifestPath);
    expect(runCount).toBe(1);

    fs.writeFileSync(input, 'v2', 'utf-8'); // 入力変更
    await runPipeline(makeStep(), manifestPath);
    expect(runCount).toBe(2); // 再実行される
  });

  it('出力ファイルが消えると再実行する', async () => {
    const input = writeFile('in.txt', 'hello');
    const output = path.join(tmpDir, 'out.txt');
    let runCount = 0;

    const makeStep = (): PipelineStep[] => [
      {
        name: 'step1',
        title: 'Step 1',
        inputs: [input],
        outputs: [output],
        run: () => {
          runCount++;
          fs.writeFileSync(output, 'generated', 'utf-8');
        },
      },
    ];

    await runPipeline(makeStep(), manifestPath);
    expect(runCount).toBe(1);

    fs.rmSync(output); // 出力消失
    await runPipeline(makeStep(), manifestPath);
    expect(runCount).toBe(2); // 出力欠落で再実行
  });

  it('force:true のステップは入力未変更でも常に実行する', async () => {
    const input = writeFile('in.txt', 'hello');
    let runCount = 0;

    const makeStep = (): PipelineStep[] => [
      {
        name: 'render',
        title: 'Render',
        inputs: [input],
        outputs: [],
        force: true,
        run: () => {
          runCount++;
        },
      },
    ];

    await runPipeline(makeStep(), manifestPath);
    await runPipeline(makeStep(), manifestPath);
    expect(runCount).toBe(2);
  });

  it('outputs 空（動的出力）でも入力ハッシュ一致でスキップする', async () => {
    const input = writeFile('in.txt', 'hello');
    let runCount = 0;

    const makeStep = (): PipelineStep[] => [
      {
        name: 'voices',
        title: 'Voices',
        inputs: [input],
        outputs: [],
        run: () => {
          runCount++;
        },
      },
    ];

    await runPipeline(makeStep(), manifestPath);
    await runPipeline(makeStep(), manifestPath);
    expect(runCount).toBe(1);
  });

  it('in-place 書き換えステップ: run 後の入力状態で記録し2回目はスキップする', async () => {
    // voices のように入力ファイル自身を run 内で書き換えるケース
    const input = writeFile('data.json', '{"frameCount":null}');
    let runCount = 0;

    const makeStep = (): PipelineStep[] => [
      {
        name: 'enrich',
        title: 'Enrich',
        inputs: [input],
        outputs: [],
        run: () => {
          runCount++;
          fs.writeFileSync(input, '{"frameCount":65}', 'utf-8'); // in-place 書き換え
        },
      },
    ];

    await runPipeline(makeStep(), manifestPath);
    expect(runCount).toBe(1);

    // 入力は run 後の状態（frameCount:65）のまま。2回目はスキップされるべき
    await runPipeline(makeStep(), manifestPath);
    expect(runCount).toBe(1);
  });

  it('前段ステップのみ変更時、後段は依存入力が変わらなければスキップ', async () => {
    const yaml = writeFile('ep.yaml', 'title: A');
    const json = path.join(tmpDir, 'ep.json');
    const props = path.join(tmpDir, 'props.json');
    let yamlToJson = 0;
    let propsCopy = 0;

    const makeSteps = (): PipelineStep[] => [
      {
        name: 'yaml-to-json',
        title: 'yaml→json',
        inputs: [yaml],
        outputs: [json],
        run: () => {
          yamlToJson++;
          // yaml 内容を json に反映（決定論的）
          fs.writeFileSync(json, fs.readFileSync(yaml, 'utf-8'), 'utf-8');
        },
      },
      {
        name: 'props-copy',
        title: 'props',
        inputs: [json],
        outputs: [props],
        run: () => {
          propsCopy++;
          fs.copyFileSync(json, props);
        },
      },
    ];

    await runPipeline(makeSteps(), manifestPath);
    expect([yamlToJson, propsCopy]).toEqual([1, 1]);

    // 何も変えず再実行 → 両方スキップ
    await runPipeline(makeSteps(), manifestPath);
    expect([yamlToJson, propsCopy]).toEqual([1, 1]);

    // yaml 変更 → json 内容が変わり props も再実行
    fs.writeFileSync(yaml, 'title: B', 'utf-8');
    await runPipeline(makeSteps(), manifestPath);
    expect([yamlToJson, propsCopy]).toEqual([2, 2]);
  });
});
