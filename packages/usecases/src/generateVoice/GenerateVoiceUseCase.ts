/**
 * GenerateVoiceUseCase
 *
 * script-input の全セリフを TTS で合成し、audioFile / audioDuration / frameCount を
 * in-place で付与して保存する。ネットワーク・ファイルシステムへの依存は全て
 * Port (`GenerateVoiceDeps`) 経由で注入される。
 *
 * 原典: scripts/generate-voices.ts の main() 関数。
 */

import { lineContentHash } from '@money-video/domain';
import { getErrorMessage } from '@money-video/shared-ts';
import type {
  GenerateVoiceDeps,
  GenerateVoiceInput,
  GenerateVoiceResult,
} from './ports';

/** フォールバック時に使用する想定秒数 */
const FALLBACK_DURATION_SEC = 3.0;
/** 既定の末尾バッファフレーム数 */
const DEFAULT_BUFFER_FRAMES = 5;

export class GenerateVoiceUseCase {
  constructor(private readonly deps: GenerateVoiceDeps) {}

  async execute(input: GenerateVoiceInput): Promise<GenerateVoiceResult> {
    const { tts, storage, scriptStore, resolveSpeakerId, logger, voiceCache } = this.deps;
    const { inputPath, voicesDirRelative, fps } = input;
    const bufferFrames = input.bufferFrames ?? DEFAULT_BUFFER_FRAMES;

    const scriptInput = await scriptStore.load(inputPath);
    await storage.ensureDirectory(voicesDirRelative);

    const totalLines = scriptInput.chapters.reduce((acc, ch) => acc + ch.lines.length, 0);
    logger.info({ inputPath, totalLines }, 'generateVoice: started');

    let successCount = 0;
    let failureCount = 0;
    let totalDurationSec = 0;
    let cacheHits = 0;
    let lineIndex = 0;

    for (const chapter of scriptInput.chapters) {
      for (const line of chapter.lines) {
        lineIndex += 1;
        const speakerId = resolveSpeakerId(line.speaker);
        const fileName = `${String(lineIndex).padStart(4, '0')}_${line.speaker}.wav`;
        const relativePath = `${voicesDirRelative}/${fileName}`;

        try {
          // content hash で音声キャッシュを照合。ヒットすれば TTS を呼ばずに復元する。
          // これにより yaml-to-json 再実行後でも frameCount を冪等に再付与できる。
          const cacheKey = lineContentHash(speakerId, line.text);
          const cached = voiceCache ? await voiceCache.get(cacheKey) : null;

          let wav: Buffer;
          let durationSec: number;
          if (cached) {
            wav = cached.wav;
            durationSec = cached.durationSec;
            cacheHits += 1;
          } else {
            const synth = await tts.synthesize({ text: line.text, speakerId });
            wav = synth.wav;
            durationSec = synth.durationSec;
            if (voiceCache) await voiceCache.set(cacheKey, { wav, durationSec });
          }

          await storage.saveWav(relativePath, wav);

          const frameCount = Math.floor(durationSec * fps) + bufferFrames;
          // 注: ScriptInput 型は domain 側で固定。frameCount / audioDuration は ScriptLine 上の
          // optional プロパティとして定義済み（packages/domain/src/episode/ScriptLine.ts）
          line.audioFile = relativePath;
          line.audioDuration = Math.round(durationSec * 1000) / 1000;
          line.frameCount = frameCount;

          totalDurationSec += durationSec;
          successCount += 1;

          logger.debug(
            {
              lineIndex,
              speaker: line.speaker,
              durationSec: line.audioDuration,
              frameCount,
              cached: cached !== null,
            },
            'generateVoice: synthesized',
          );
        } catch (err) {
          failureCount += 1;
          // フォールバック: durationSec=3.0 で frameCount を埋めて処理を継続する
          const fallbackFrames = Math.floor(FALLBACK_DURATION_SEC * fps) + bufferFrames;
          line.audioFile = relativePath;
          line.audioDuration = FALLBACK_DURATION_SEC;
          line.frameCount = fallbackFrames;
          totalDurationSec += FALLBACK_DURATION_SEC;

          logger.warn(
            {
              lineIndex,
              speaker: line.speaker,
              err: getErrorMessage(err),
              fallbackDuration: FALLBACK_DURATION_SEC,
            },
            'generateVoice: synthesis failed, using fallback',
          );
        }
      }
    }

    await scriptStore.save(inputPath, scriptInput);

    logger.info(
      {
        successCount,
        failureCount,
        cacheHits,
        totalDurationSec: Number(totalDurationSec.toFixed(2)),
      },
      'generateVoice: completed',
    );

    return {
      successCount,
      failureCount,
      totalDurationSec,
      cacheHits,
    };
  }
}
