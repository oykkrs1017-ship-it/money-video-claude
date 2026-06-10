import * as fs from 'fs';
import * as path from 'path';

// ScriptInput の型定義をインライン（インポートパス解決の問題を避けるため）
interface ScriptLine {
  speaker: string;
  text: string;
  emotion: string;
  audioFile?: string;
  audioDuration?: number;
  frameCount?: number;
}

interface ImageData {
  src: string;
  alt?: string;
  caption?: string;
  position?: string;
  width?: number;
  duration?: number;
  animation?: string;
}

interface Visual {
  type: string;
  chartType?: string;
  data?: string;
  text?: string;
  imageData?: ImageData;
  statData?: unknown;
  at: number;
}

interface Chapter {
  type: string;
  duration?: number;
  lines: ScriptLine[];
  visuals?: Visual[];
  topic?: string;
}

interface ScriptInput {
  videoId: string;
  seed: string;
  title: string;
  description: string;
  tags: string[];
  chapters: Chapter[];
  chartData: Record<string, unknown[]>;
  bgm?: string;
  bgmVolume?: number;
  bgmMap?: Record<string, string>;
}

export interface ValidationResult {
  errors: string[];
  warnings: string[];
}

export async function validateScriptInput(
  scriptInput: ScriptInput,
  publicDir: string
): Promise<ValidationResult> {
  const errors: string[] = [];
  const warnings: string[] = [];

  // ERROR 5: videoId が空文字
  if (!scriptInput.videoId || scriptInput.videoId.trim() === '') {
    errors.push('videoId が空文字です');
  }

  // 音声ファイルディレクトリの存在確認（WARNING 4 用）
  const voicesDir = path.resolve(publicDir, '..', 'public', 'voices');
  const hasAnyVoiceForVideoId = fs.existsSync(voicesDir) &&
    fs.readdirSync(voicesDir).length > 0;

  if (!hasAnyVoiceForVideoId) {
    warnings.push(
      `videoId "${scriptInput.videoId}" の音声ファイルが public/voices/ に存在しません（generate-voices 未実行の可能性）`
    );
  }

  scriptInput.chapters.forEach((chapter, chapterIdx) => {
    const chapterLabel = `chapter[${chapterIdx}](type=${chapter.type})`;

    // WARNING 3: visuals が空またはなし
    if (!chapter.visuals || chapter.visuals.length === 0) {
      warnings.push(`${chapterLabel}: visuals が空またはありません（ビジュアルなしチャプター）`);
    }

    chapter.lines.forEach((line, lineIdx) => {
      const lineLabel = `${chapterLabel}.lines[${lineIdx}]`;

      // ERROR 1: speaker が maro/ponchan 以外
      if (line.speaker !== 'maro' && line.speaker !== 'ponchan') {
        errors.push(
          `${lineLabel}: speaker が不正な値 "${line.speaker}" です（"maro" または "ponchan" のみ有効）`
        );
      }

      // WARNING 1: audioFile が未設定
      if (!line.audioFile) {
        warnings.push(`${lineLabel}: audioFile が未設定です（generate-voices 未実行の状態では正常）`);
      } else {
        // ERROR 2: audioFile が設定されているのにファイルが存在しない
        const audioPath = path.resolve(publicDir, line.audioFile);
        if (!fs.existsSync(audioPath)) {
          errors.push(
            `${lineLabel}: audioFile "${line.audioFile}" が存在しません（パス: ${audioPath}）`
          );
        }
      }
    });

    if (chapter.visuals) {
      chapter.visuals.forEach((visual, visualIdx) => {
        const visualLabel = `${chapterLabel}.visuals[${visualIdx}](type=${visual.type})`;

        // ERROR 3: visual.type === 'image' で imageData.src が存在しない
        if (visual.type === 'image') {
          if (visual.imageData?.src) {
            const imgPath = path.resolve(publicDir, visual.imageData.src);
            if (!fs.existsSync(imgPath)) {
              errors.push(
                `${visualLabel}: imageData.src "${visual.imageData.src}" が public/ 以下に存在しません（パス: ${imgPath}）`
              );
            }
          }
        }

        // ERROR 4: visual.type === 'chart' で visual.data キーが chartData に存在しない
        if (visual.type === 'chart') {
          if (visual.data) {
            if (!(visual.data in scriptInput.chartData)) {
              errors.push(
                `${visualLabel}: chart の data キー "${visual.data}" が chartData に存在しません`
              );
            }
          } else {
            errors.push(`${visualLabel}: chart visual に data キーが設定されていません`);
          }
        }

        // WARNING 2: visual.at がチャプターの duration を超えている
        if (chapter.duration !== undefined && visual.at > chapter.duration) {
          warnings.push(
            `${visualLabel}: visual.at (${visual.at}秒) がチャプターの duration (${chapter.duration}秒) を超えています（ビジュアルが表示されない可能性）`
          );
        }
      });
    }
  });

  return { errors, warnings };
}

// CLI として実行可能にする
if (require.main === module) {
  const inputPath = process.argv[2] ?? './input/script-input.json';
  const input = JSON.parse(fs.readFileSync(inputPath, 'utf-8'));
  const publicDir = path.resolve(__dirname, '../public');

  validateScriptInput(input, publicDir).then((result) => {
    if (result.errors.length > 0) {
      console.error('❌ Validation ERRORS:');
      result.errors.forEach(e => console.error(`  - ${e}`));
    }
    if (result.warnings.length > 0) {
      console.warn('⚠️  Validation WARNINGS:');
      result.warnings.forEach(w => console.warn(`  - ${w}`));
    }
    if (result.errors.length === 0 && result.warnings.length === 0) {
      console.log('✅ Validation passed');
    }
    process.exit(result.errors.length > 0 ? 1 : 0);
  });
}
