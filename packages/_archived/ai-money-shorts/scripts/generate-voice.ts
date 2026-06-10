import axios from 'axios';
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';
import { Episode, DialogueLine, EmotionType } from '../src/types/episode';
import { CHARACTER_CONFIGS } from '../src/types/character';
import { msToFrames } from '../src/utils/frameCalculator';
import { normalizeForVoicevox } from '../src/utils/textNormalizer';

dotenv.config({ path: path.resolve(__dirname, '../../../.env'), override: true });

const VOICEVOX_BASE_URL = process.env.VOICEVOX_BASE_URL ?? 'http://localhost:50021';
const SPEAKER_PON = process.env.VOICEVOX_SPEAKER_PON
  ? parseInt(process.env.VOICEVOX_SPEAKER_PON)
  : CHARACTER_CONFIGS.pon.voicevoxSpeakerId;
const SPEAKER_MARO = process.env.VOICEVOX_SPEAKER_MARO
  ? parseInt(process.env.VOICEVOX_SPEAKER_MARO)
  : CHARACTER_CONFIGS.maro.voicevoxSpeakerId;

function getSpeakerId(characterId: 'pon' | 'maro'): number {
  return characterId === 'pon' ? SPEAKER_PON : SPEAKER_MARO;
}

/**
 * 感情に応じた音声パラメータの微調整
 */
function getEmotionAdjustment(emotion: EmotionType): { speedDelta: number; pitchDelta: number } {
  switch (emotion) {
    case 'excited': return { speedDelta: 0.05, pitchDelta: 0.02 };
    case 'calm': return { speedDelta: -0.05, pitchDelta: 0.0 };
    case 'serious': return { speedDelta: 0.0, pitchDelta: -0.03 };
    case 'playful': return { speedDelta: 0.03, pitchDelta: 0.03 };
    default: return { speedDelta: 0.0, pitchDelta: 0.0 };
  }
}

/**
 * WAVファイルの長さをヘッダーから計算（ミリ秒）
 */
function getWavDurationMs(buffer: Buffer): number {
  // WAVヘッダー解析
  // bytes 24-27: サンプルレート (little-endian uint32)
  // bytes 28-31: バイトレート (little-endian uint32)
  // bytes 40-43: データチャンクサイズ (little-endian uint32) ※"data"チャンク
  // bytes 34-35: ビット深度 (little-endian uint16)
  // bytes 22-23: チャンネル数 (little-endian uint16)

  // RIFF チャンクを確認
  const riff = buffer.toString('ascii', 0, 4);
  if (riff !== 'RIFF') throw new Error('WAVフォーマットが不正です（RIFFヘッダーがありません）');

  const sampleRate = buffer.readUInt32LE(24);
  const numChannels = buffer.readUInt16LE(22);
  const bitsPerSample = buffer.readUInt16LE(34);
  const bytesPerSample = (bitsPerSample / 8) * numChannels;

  // "data" チャンクを探す
  let dataOffset = 36;
  while (dataOffset < buffer.length - 8) {
    const chunkId = buffer.toString('ascii', dataOffset, dataOffset + 4);
    const chunkSize = buffer.readUInt32LE(dataOffset + 4);
    if (chunkId === 'data') {
      const numSamples = chunkSize / bytesPerSample;
      return Math.round((numSamples / sampleRate) * 1000);
    }
    dataOffset += 8 + chunkSize;
  }
  throw new Error('WAVファイルのdataチャンクが見つかりません');
}

/**
 * 100msのディレイ
 */
function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * VOICEVOX で1行分の音声を生成
 */
async function synthesizeLine(
  line: DialogueLine,
  episodeId: string,
  voicesDir: string
): Promise<{ audioFile: string; audioDurationMs: number; durationFrames: number }> {
  const speakerId = getSpeakerId(line.character);
  const config = CHARACTER_CONFIGS[line.character];
  const emotionAdj = getEmotionAdjustment(line.emotion);

  const speedScale = Math.min(2.0, Math.max(0.5,
    (line.voiceSpeedScale ?? config.defaultSpeedScale) + emotionAdj.speedDelta
  ));
  const pitchScale = Math.min(0.15, Math.max(-0.15,
    (line.voicePitchScale ?? config.defaultPitchScale) + emotionAdj.pitchDelta
  ));

  // テキスト正規化（NISA→ニーサ 等の誤読を防ぐ）
  const normalizedText = normalizeForVoicevox(line.text);

  // Step 1: audio_query
  const queryRes = await axios.post(
    `${VOICEVOX_BASE_URL}/audio_query`,
    null,
    {
      params: { text: normalizedText, speaker: speakerId },
      timeout: 10000,
    }
  );

  const audioQuery = {
    ...queryRes.data,
    speedScale,
    pitchScale,
    volumeScale: 1.0,
    prePhonemeLength: 0.1,
    postPhonemeLength: 0.3,
  };

  await delay(100);

  // Step 2: synthesis
  const synthRes = await axios.post(
    `${VOICEVOX_BASE_URL}/synthesis`,
    audioQuery,
    {
      params: { speaker: speakerId },
      responseType: 'arraybuffer',
      timeout: 30000,
    }
  );

  const wavBuffer = Buffer.from(synthRes.data);
  const audioFile = `voices/${episodeId}/${line.id}.wav`;
  const absolutePath = path.join(__dirname, '../public', audioFile);
  fs.mkdirSync(path.dirname(absolutePath), { recursive: true });
  fs.writeFileSync(absolutePath, wavBuffer);

  const audioDurationMs = getWavDurationMs(wavBuffer);
  const durationFrames = msToFrames(audioDurationMs);

  await delay(100);

  return { audioFile, audioDurationMs, durationFrames };
}

/**
 * コマンドライン引数解析
 */
function parseArgs(): { episodeId: string } {
  const args = process.argv.slice(2);
  let episodeId = '';
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--episode' && args[i + 1]) {
      episodeId = args[i + 1];
    }
  }
  if (!episodeId) {
    console.error('使い方: ts-node scripts/generate-voice.ts --episode <episodeId>');
    process.exit(1);
  }
  return { episodeId };
}

async function main() {
  const { episodeId } = parseArgs();

  // VOICEVOX 起動確認
  try {
    await axios.get(`${VOICEVOX_BASE_URL}/version`, { timeout: 3000 });
  } catch {
    console.error('❌ VOICEVOXが起動していません。先にVOICEVOXを起動してください。');
    console.error(`   接続先: ${VOICEVOX_BASE_URL}`);
    process.exit(1);
  }

  // エピソード読み込み
  const episodePath = path.join(__dirname, '../src/data/episodes', `${episodeId}.json`);
  if (!fs.existsSync(episodePath)) {
    console.error(`❌ エピソードファイルが見つかりません: ${episodePath}`);
    process.exit(1);
  }

  const episode: Episode = JSON.parse(fs.readFileSync(episodePath, 'utf-8'));

  // 全セリフをフラット展開
  const allLines: { sectionIndex: number; lineIndex: number; line: DialogueLine }[] = [];
  episode.sections.forEach((section, si) => {
    section.lines.forEach((line, li) => {
      allLines.push({ sectionIndex: si, lineIndex: li, line });
    });
  });

  console.log(`🎙️ 音声生成開始: ${allLines.length} 行`);
  const failedLines: string[] = [];

  for (const { sectionIndex, lineIndex, line } of allLines) {
    process.stdout.write(`  [${line.id}] ${line.character}: ${line.text.slice(0, 20)}... `);
    try {
      const result = await synthesizeLine(line, episodeId, path.join(__dirname, '../public/voices'));
      episode.sections[sectionIndex].lines[lineIndex] = {
        ...line,
        ...result,
      };
      console.log(`✅ ${result.audioDurationMs}ms`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.log(`❌ ${msg}`);
      failedLines.push(`${line.id}: ${msg}`);
    }
  }

  // 更新したエピソードを保存
  fs.writeFileSync(episodePath, JSON.stringify(episode, null, 2), 'utf-8');
  console.log(`\n📁 episode.json 更新完了: ${episodePath}`);

  if (failedLines.length > 0) {
    console.warn(`\n⚠️ 以下の ${failedLines.length} 行で失敗しました:`);
    failedLines.forEach((l) => console.warn(`  - ${l}`));
  } else {
    console.log('✅ 全行の音声生成が完了しました！');
  }
}

main().catch((err) => {
  console.error('❌ エラー:', err.message);
  process.exit(1);
});
