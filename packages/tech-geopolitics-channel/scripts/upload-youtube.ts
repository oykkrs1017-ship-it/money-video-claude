/**
 * scripts/upload-youtube.ts  (thin CLI shim)
 *
 * 旧 CLI 互換:
 *   npx ts-node --transpile-only scripts/upload-youtube.ts output/ep003.mp4 \
 *     [--input input/ep003.yaml] \
 *     [--props output/ep003_props.json] \
 *     [--title "タイトル上書き"] \
 *     [--public]        即時公開（省略時: 次の 19:00 JST にスケジュール）
 *
 * ロジック本体は packages/adapters と packages/usecases に移設済み。
 * このファイルは argv パース → DI wiring → ユースケース呼び出しに専念する。
 * スコアカード記録は引き続きここで行う（Phase 3 で分離予定）。
 *
 * 初回のみ: ブラウザが開いて Google ログインが必要です。
 * 認証情報は .credentials/youtube-token.json に保存されます（再利用）。
 */

import * as path from 'path';
import * as fs from 'fs';
import * as crypto from 'crypto';
import { createLogger } from '@money-video/shared-ts';
import {
  YouTubeAuth,
  YouTubeUploader,
  EpisodeMetaReader,
  UploadResultWriter,
} from '@money-video/adapters/youtube';
import { PublishVideoUseCase } from '@money-video/usecases/publishVideo';

// scorecard module は optional（Phase 3で分離予定）
let EpisodeScorecard: any = null;
let saveScorecard: any = null;
try {
  const scorecardModule = require('@money-video/shared/scorecard') as any;
  EpisodeScorecard = scorecardModule.EpisodeScorecard;
  saveScorecard = scorecardModule.saveScorecard;
} catch {
  // scorecard module not available - skip scoring
  console.warn('⚠ scorecard module not available - skipping scorecard recording');
}

interface Args {
  videoFilePath: string;
  inputYamlPath?: string;
  propsFilePath?: string;
  titleOverride?: string;
  publishNow: boolean;
  thumbnailPath?: string;
  playlistId?: string;
  isShorts: boolean;
}

function parseArgs(argv: string[]): Args {
  const videoFile = argv[0];
  if (!videoFile) {
    // eslint-disable-next-line no-console
    console.error(
      '使い方: npx ts-node --transpile-only scripts/upload-youtube.ts <videoFile> [--input yaml] [--props props.json] [--title "..."] [--thumbnail image.png] [--public]',
    );
    process.exit(1);
  }

  const get = (flag: string): string | undefined => {
    const i = argv.indexOf(flag);
    return i >= 0 && argv[i + 1] ? argv[i + 1] : undefined;
  };

  return {
    videoFilePath: path.resolve(videoFile!),
    inputYamlPath: get('--input') ? path.resolve(get('--input')!) : undefined,
    propsFilePath: get('--props') ? path.resolve(get('--props')!) : undefined,
    titleOverride: get('--title'),
    publishNow: argv.includes('--public'),
    thumbnailPath: get('--thumbnail') ? path.resolve(get('--thumbnail')!) : undefined,
    playlistId: get('--playlist'),
    isShorts: argv.includes('--shorts'),
  };
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));

  if (!fs.existsSync(args.videoFilePath)) {
    // eslint-disable-next-line no-console
    console.error(`❌ 動画ファイルが見つかりません: ${args.videoFilePath}`);
    process.exit(1);
  }

  const packageRoot = path.resolve(__dirname, '..');
  const credentialsDir = path.join(packageRoot, '.credentials');
  const inputDir = path.join(packageRoot, 'input');

  const logger = createLogger({ name: 'upload-youtube', level: 'info' });

  // ベースタグ読み込み（config/base-tags.json が存在する場合のみ）
  const baseTagsPath = path.join(packageRoot, 'config', 'base-tags.json');
  const baseTags: string[] = fs.existsSync(baseTagsPath)
    ? (JSON.parse(fs.readFileSync(baseTagsPath, 'utf-8')) as string[])
    : [];

  // DI wiring
  const ytAuth = new YouTubeAuth({ credentialsDir });
  const auth = await ytAuth.authorize();
  const uploader = new YouTubeUploader({ auth });
  const metaReader = new EpisodeMetaReader(baseTags);
  const resultWriter = new UploadResultWriter();

  const useCase = new PublishVideoUseCase({
    uploader,
    metaReader,
    resultWriter,
    logger,
  });

  const result = await useCase.execute({
    videoFilePath: args.videoFilePath,
    inputYamlPath: args.inputYamlPath,
    propsFilePath: args.propsFilePath,
    titleOverride: args.titleOverride,
    publishNow: args.publishNow,
    inputDir,
    thumbnailPath: args.thumbnailPath,
    playlistId: args.playlistId,
    isShorts: args.isShorts,
  });

  logger.info(
    {
      videoId: result.videoId,
      videoUrl: result.videoUrl,
      title: result.title,
      privacyStatus: result.privacyStatus,
      publishAt: result.publishAt,
      tagCount: result.tagCount,
    },
    'upload-youtube: done',
  );

  // ─── スコアカード記録（Phase 3 で PublishVideoUseCase か別 UseCase に移設予定） ───
  if (saveScorecard) {
    const epId = path.basename(args.videoFilePath, '.mp4');
    const rootDir = path.join(packageRoot, '..', '..');

    const directivePath = path.join(rootDir, 'knowledge', 'directive.yaml');
    const directiveHash = fs.existsSync(directivePath)
      ? crypto.createHash('sha256').update(fs.readFileSync(directivePath)).digest('hex').slice(0, 12)
      : 'none';

    const scorecard: any = {
      episodeId: epId,
      channel: 'tech-geopolitics',
      recordedAt: new Date().toISOString(),
      videoId: result.videoId,
      directiveHash,
      hypothesisId: null,
      production: {
        scriptReviewLoops: 0,
        reviewIssueCount: 0,
        voiceSynthSuccessRate: 1,
        renderDurationSec: 0,
        costUsdEstimate: 0,
      },
      verdict: 'PENDING',
      lessonIds: [],
    };

    const existingPath = path.join(rootDir, 'brain', 'scorecards', `${epId}.json`);
    if (fs.existsSync(existingPath)) {
      const existing = JSON.parse(fs.readFileSync(existingPath, 'utf8')) as any;
      scorecard.production = existing.production;
      scorecard.hypothesisId = existing.hypothesisId ?? null;
    }

    saveScorecard(rootDir, scorecard);

    const tsvPath = path.join(rootDir, 'brain', 'results.tsv');
    const tsvLine = [
      epId,
      new Date().toISOString().slice(0, 10),
      'tech-geopolitics',
      scorecard.hypothesisId ?? 'null',
      scorecard.seed ?? 'null',
      '-',
      scorecard.production.scriptReviewLoops,
      scorecard.production.costUsdEstimate.toFixed(2),
      'PENDING', 'PENDING', 'PENDING', 'PENDING',
    ].join('\t');
    fs.appendFileSync(tsvPath, tsvLine + '\n', 'utf8');
  }
}

main().catch((err: unknown) => {
  const logger = createLogger({ name: 'upload-youtube', level: 'error' });
  const message = err instanceof Error ? err.message : String(err);
  logger.fatal({ err: message }, 'upload-youtube: fatal');
  process.exit(1);
});
