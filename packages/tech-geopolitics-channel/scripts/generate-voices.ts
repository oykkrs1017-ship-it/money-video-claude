/**
 * scripts/generate-voices.ts  (thin CLI shim)
 *
 * 旧 CLI 互換:
 *   npx ts-node scripts/generate-voices.ts --input ./input/script-input.json
 *
 * ロジック本体は packages/adapters と packages/usecases に移設済み。
 * このファイルは argv パース → DI wiring → ユースケース呼び出しに専念する。
 *
 * 挙動保証:
 *   - FPS=30, BUFFER_FRAMES=5, SPEED_SCALE=1.15（旧スクリプトと同値）
 *   - 保存先: ./public/voices/ 配下、ファイル名は "NNNN_<speaker>.wav"
 *   - script-input.json の各 line に audioFile / audioDuration / frameCount を付与
 *   - VOICEVOX テキスト正規化は VoicevoxClient が内部適用
 *   - 合成失敗時は 3.0s フォールバックで続行（旧スクリプトと同挙動）
 */
import * as path from 'path';
import { createLogger } from '@money-video/shared-ts';
import { VoicevoxClient, DEFAULT_VOICEVOX_CONFIG } from '@money-video/adapters/tts';
import {
  FileSystemVoiceStorage,
  FileSystemScriptStore,
  FileSystemVoiceCache,
} from '@money-video/adapters/storage';
import { resolveSpeakerId } from '@money-video/adapters/tts';
import { GenerateVoiceUseCase } from '@money-video/usecases/generateVoice';

/** 旧スクリプトと同値の既定値 */
const FPS = 30;
const BUFFER_FRAMES = 5;
const VOICES_DIR_RELATIVE = 'voices'; // script-input.json 側の参照 "voices/0001_maro.wav"

function parseArgs(argv: string[]): { inputPath: string } {
  const idx = argv.indexOf('--input');
  const inputPath = idx >= 0 && argv[idx + 1] ? argv[idx + 1]! : './input/script-input.json';
  return { inputPath: path.resolve(inputPath) };
}

async function main(): Promise<void> {
  const { inputPath } = parseArgs(process.argv.slice(2));

  // ベースディレクトリは public/ 直下。ユースケースに voicesDirRelative="voices" を渡すことで
  // 旧スクリプトが書き込んでいた public/voices/xxxx.wav と同じパスに保存される。
  const publicDir = path.resolve('./public');

  const logger = createLogger({ name: 'generate-voices', level: 'info' });

  const tts = new VoicevoxClient({
    ...DEFAULT_VOICEVOX_CONFIG,
    // VOICEVOX_URL 環境変数があれば優先（shared-ts/env を直接は読まず最小限の上書き）
    baseUrl: process.env.VOICEVOX_URL ?? DEFAULT_VOICEVOX_CONFIG.baseUrl,
  });
  const storage = new FileSystemVoiceStorage(publicDir);
  const scriptStore = new FileSystemScriptStore();
  // content hash キャッシュ。cache/voices/ にヒットすれば VOICEVOX を呼ばず frameCount を復元する。
  const voiceCache = new FileSystemVoiceCache(path.resolve('./cache/voices'));

  const useCase = new GenerateVoiceUseCase({
    tts,
    storage,
    scriptStore,
    resolveSpeakerId,
    logger,
    voiceCache,
  });

  const result = await useCase.execute({
    inputPath,
    voicesDirRelative: VOICES_DIR_RELATIVE,
    fps: FPS,
    bufferFrames: BUFFER_FRAMES,
  });

  logger.info(
    {
      inputPath,
      successCount: result.successCount,
      failureCount: result.failureCount,
      cacheHits: result.cacheHits,
      totalDurationSec: Number(result.totalDurationSec.toFixed(2)),
    },
    'generate-voices: done',
  );
}

main().catch((err: unknown) => {
  const logger = createLogger({ name: 'generate-voices', level: 'error' });
  const message = err instanceof Error ? err.message : String(err);
  logger.fatal({ err: message }, 'generate-voices: fatal');
  process.exit(1);
});
