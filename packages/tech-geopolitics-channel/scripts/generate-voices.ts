/**
 * scripts/generate-voices.ts
 * script-input.json の全セリフを VOICEVOX で音声合成し、
 * 各セリフの audioDuration / frameCount を自動付与して保存する。
 *
 * 使い方: npx ts-node scripts/generate-voices.ts --input ./input/script-input.json
 */
import * as fs from 'fs';
import * as path from 'path';
import * as http from 'http';

const VOICEVOX_HOST = 'http://localhost:50021';
const FPS = 30;
const BUFFER_FRAMES = 5; // 各セリフの末尾に追加するバッファフレーム
const SPEED_SCALE = 1.15;

const SPEAKER_IDS: Record<string, number> = {
  zundamon: 3,
  metan: 2,
};

// ---------- HTTP ヘルパー ----------

function httpGet(url: string): Promise<string> {
  return new Promise((resolve, reject) => {
    http.get(url, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => resolve(data));
      res.on('error', reject);
    }).on('error', reject);
  });
}

function httpPost(url: string, body: string, contentType = 'application/json'): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const options = {
      hostname: urlObj.hostname,
      port: Number(urlObj.port) || 80,
      path: urlObj.pathname + urlObj.search,
      method: 'POST',
      headers: {
        'Content-Type': contentType,
        'Content-Length': Buffer.byteLength(body),
      },
    };
    const req = http.request(options, (res) => {
      const chunks: Buffer[] = [];
      res.on('data', (c) => chunks.push(c));
      res.on('end', () => resolve(Buffer.concat(chunks)));
      res.on('error', reject);
    });
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

// ---------- WAV ヘッダーから再生時間を取得 ----------

function getWavDuration(wavBuffer: Buffer): number {
  // WAV ヘッダー: bytes 24-27 = SampleRate, bytes 28-31 = ByteRate
  // DataSize は bytes 40-43（標準44バイトヘッダーの場合）
  const sampleRate = wavBuffer.readUInt32LE(24);
  const byteRate = wavBuffer.readUInt32LE(28);
  const dataSize = wavBuffer.readUInt32LE(40);
  return dataSize / byteRate;
}

// ---------- VOICEVOX 音声合成 ----------

async function synthesize(text: string, speakerId: number): Promise<Buffer> {
  // 1. audio_query（POSTが必要）
  const queryUrl = `${VOICEVOX_HOST}/audio_query?text=${encodeURIComponent(text)}&speaker=${speakerId}`;
  const queryBuffer = await httpPost(queryUrl, '', 'application/json');
  const queryJson = queryBuffer.toString('utf-8');
  const query = JSON.parse(queryJson);

  // speedScale を適用
  query.speedScale = SPEED_SCALE;

  // 2. synthesis
  const wavBuffer = await httpPost(
    `${VOICEVOX_HOST}/synthesis?speaker=${speakerId}`,
    JSON.stringify(query),
    'application/json'
  );
  return wavBuffer;
}

// ---------- メイン ----------

async function main() {
  const args = process.argv.slice(2);
  const inputIdx = args.indexOf('--input');
  const inputPath = inputIdx >= 0 ? args[inputIdx + 1] : './input/script-input.json';

  if (!fs.existsSync(inputPath)) {
    console.error(`❌ ファイルが見つかりません: ${inputPath}`);
    process.exit(1);
  }

  const scriptInput = JSON.parse(fs.readFileSync(inputPath, 'utf-8'));
  const voicesDir = path.resolve('./public/voices');
  if (!fs.existsSync(voicesDir)) fs.mkdirSync(voicesDir, { recursive: true });

  let lineIndex = 0;
  let totalLines = 0;
  scriptInput.chapters.forEach((ch: any) => totalLines += ch.lines.length);

  console.log(`🎙️  ${totalLines} セリフを音声合成します...`);

  for (const chapter of scriptInput.chapters) {
    for (const line of chapter.lines) {
      lineIndex++;
      const speakerId = SPEAKER_IDS[line.speaker] ?? 3;
      const fileName = `${String(lineIndex).padStart(4, '0')}_${line.speaker}.wav`;
      const filePath = path.join(voicesDir, fileName);

      process.stdout.write(`  [${lineIndex}/${totalLines}] ${line.speaker}: ${line.text.slice(0, 20)}... `);

      try {
        const wavBuffer = await synthesize(line.text, speakerId);
        fs.writeFileSync(filePath, wavBuffer);

        const duration = getWavDuration(wavBuffer);
        const frameCount = Math.floor(duration * FPS) + BUFFER_FRAMES;

        line.audioFile = `voices/${fileName}`;
        line.audioDuration = Math.round(duration * 1000) / 1000;
        line.frameCount = frameCount;

        console.log(`✅ ${duration.toFixed(2)}s (${frameCount}f)`);
      } catch (err) {
        console.error(`❌ 失敗: ${(err as Error).message}`);
        // フォールバック: 3秒想定
        line.audioFile = `voices/${fileName}`;
        line.audioDuration = 3.0;
        line.frameCount = Math.floor(3.0 * FPS) + BUFFER_FRAMES;
      }
    }
  }

  // 更新した JSON を書き戻す
  fs.writeFileSync(inputPath, JSON.stringify(scriptInput, null, 2), 'utf-8');
  console.log(`\n✅ 完了！${inputPath} に audioFile / audioDuration / frameCount を保存しました。`);
}

main().catch((err) => {
  console.error('Fatal:', err);
  process.exit(1);
});
