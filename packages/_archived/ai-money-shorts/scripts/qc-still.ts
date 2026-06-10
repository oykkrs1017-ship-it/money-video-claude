/**
 * qc-still.ts
 * Remotion renderStill を使って重要フレームのスクリーンショットを撮り、
 * 視覚的な重なりや配置バグを事前にチェックする QC スクリプト。
 *
 * 使い方:
 *   npx ts-node --transpile-only scripts/qc-still.ts --episode <episodeId>
 *
 * オプション:
 *   --episode <id>   対象エピソード（必須）
 *   --frames <n,n>   確認フレームをカンマ区切りで指定（省略時: 自動計算）
 *   --open           生成後に OS のビューアで開く
 *
 * 出力:
 *   output/qc/<episodeId>/frame_XXXX.png
 *   output/qc/<episodeId>/report.json   ← チェック結果
 */

import * as path from 'path';
import * as fs from 'fs';
import * as dotenv from 'dotenv';
import { bundle } from '@remotion/bundler';
import { renderStill, selectComposition } from '@remotion/renderer';
import { Episode } from '../src/types/episode';
import { getCompositionId } from '../src/utils/templateSelector';

dotenv.config({ path: path.resolve(__dirname, '../../../.env'), override: true });

// ─── CLI 引数パース ────────────────────────────────────────────────────────

function parseArgs(): { episodeId: string; customFrames: number[] | null; open: boolean } {
  const args = process.argv.slice(2);
  let episodeId = '';
  let customFrames: number[] | null = null;
  let open = false;

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--episode' && args[i + 1]) { episodeId = args[i + 1]; i++; }
    if (args[i] === '--frames' && args[i + 1]) {
      customFrames = args[i + 1].split(',').map((s) => parseInt(s.trim(), 10));
      i++;
    }
    if (args[i] === '--open') open = true;
  }

  if (!episodeId) {
    console.error('使い方: ts-node scripts/qc-still.ts --episode <episodeId>');
    process.exit(1);
  }
  return { episodeId, customFrames, open };
}

// ─── チェックフレーム計算 ─────────────────────────────────────────────────────

/**
 * 各セクションの開始直後 (+30F) と、イントロ・アウトロを含む
 * 重要フレームを自動計算する。
 */
function calcCheckFrames(episode: Episode, totalFrames: number): number[] {
  const frames: number[] = [];
  const fps = 30;

  // イントロ（タイトルヒーロー表示中: フレーム 5, 30）
  frames.push(5, 30);

  // 各セクション開始 +30F（テロップが表示され始めた直後）
  let cursor = 0;
  for (const section of episode.sections) {
    // 各ライン の durationFrames を合算してセクション尺を計算
    const linesTotal = section.lines.reduce((acc, l) => acc + (l.durationFrames ?? 30), 0);
    const sectionFrames = linesTotal > 0 ? linesTotal : 90; // デフォルト 3秒

    const checkFrame = cursor + 30;
    if (checkFrame < totalFrames) frames.push(checkFrame);
    cursor += sectionFrames;
  }

  // 最後のセクション終盤（CTA / エンドカード）
  const nearEnd = totalFrames - 30;
  if (nearEnd > 0) frames.push(nearEnd);

  // 重複排除・ソート・範囲チェック
  return [...new Set(frames)]
    .filter((f) => f >= 0 && f < totalFrames)
    .sort((a, b) => a - b);
}

// ─── レポート ─────────────────────────────────────────────────────────────────

interface QCReport {
  episodeId: string;
  compositionId: string;
  totalFrames: number;
  checkedFrames: number[];
  pngPaths: string[];
  generatedAt: string;
  warnings: string[];
}

// ─── メイン ───────────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  const { episodeId, customFrames, open } = parseArgs();

  const episodePath = path.join(__dirname, '../src/data/episodes', `${episodeId}.json`);
  if (!fs.existsSync(episodePath)) {
    console.error(`❌ エピソードファイルが見つかりません: ${episodePath}`);
    process.exit(1);
  }

  const episode: Episode = JSON.parse(fs.readFileSync(episodePath, 'utf-8'));
  const compositionId = getCompositionId(episode.compositionType);

  // 出力ディレクトリ
  const qcDir = path.join(__dirname, '../out/qc', episodeId);
  fs.mkdirSync(qcDir, { recursive: true });

  console.log(`🔍 QCスティル確認: ${episodeId} (${compositionId})`);

  // バンドル
  console.log('📦 バンドル中...');
  const entryPoint = path.join(__dirname, '../src/index.ts');
  const bundled = await bundle({
    entryPoint,
    webpackOverride: (config) => config,
  });

  // コンポジション選択
  const composition = await selectComposition({
    serveUrl: bundled,
    id: compositionId,
    inputProps: { episode },
  });

  const { durationInFrames } = composition;
  console.log(`⏱️  動画長: ${durationInFrames}フレーム (${(durationInFrames / 30).toFixed(1)}秒)`);

  // チェックフレーム決定
  const frames = customFrames ?? calcCheckFrames(episode, durationInFrames);
  console.log(`📸 チェックフレーム (${frames.length}件): ${frames.join(', ')}`);

  const pngPaths: string[] = [];
  const warnings: string[] = [];

  // 各フレームを renderStill で撮影
  for (const frame of frames) {
    const outputPath = path.join(qcDir, `frame_${String(frame).padStart(4, '0')}.png`);
    process.stdout.write(`  フレーム ${String(frame).padStart(4, ' ')} を撮影中...`);

    try {
      await renderStill({
        composition,
        serveUrl: bundled,
        output: outputPath,
        inputProps: { episode },
        frame,
        imageFormat: 'png',
      });
      pngPaths.push(outputPath);
      console.log(' ✓');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      console.log(` ✗ ${msg}`);
      warnings.push(`frame ${frame}: ${msg}`);
    }
  }

  // レポート保存
  const report: QCReport = {
    episodeId,
    compositionId,
    totalFrames: durationInFrames,
    checkedFrames: frames,
    pngPaths,
    generatedAt: new Date().toISOString(),
    warnings,
  };

  const reportPath = path.join(qcDir, 'report.json');
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2), 'utf-8');

  console.log(`\n✅ QC完了: ${pngPaths.length}/${frames.length} 枚生成`);
  console.log(`📁 出力先: ${qcDir}`);
  if (warnings.length > 0) {
    console.log(`\n⚠️  警告 (${warnings.length}件):`);
    warnings.forEach((w) => console.log(`  - ${w}`));
  }

  // OS ビューアで開く
  if (open && pngPaths.length > 0) {
    const { spawn } = await import('child_process');
    const isWin = process.platform === 'win32';
    const isMac = process.platform === 'darwin';
    try {
      if (isWin) {
        spawn('cmd', ['/c', 'start', '', pngPaths[0]], { detached: true, stdio: 'ignore' }).unref();
      } else if (isMac) {
        spawn('open', [qcDir], { detached: true, stdio: 'ignore' }).unref();
      } else {
        spawn('xdg-open', [qcDir], { detached: true, stdio: 'ignore' }).unref();
      }
    } catch {
      // open に失敗しても QC 自体は成功
    }
  }
}

main().catch((err: unknown) => {
  console.error('✗ エラー:', err instanceof Error ? err.message : err);
  process.exit(1);
});
