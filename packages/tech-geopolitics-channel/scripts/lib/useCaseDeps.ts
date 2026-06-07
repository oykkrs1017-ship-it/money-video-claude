/**
 * scripts/lib/useCaseDeps.ts
 *
 * GenerateScriptUseCase / GenerateVoiceUseCase の DI ファクトリ。
 * execSync 経由ではなくプロセス内で直接 usecase を呼ぶ際にここで deps を組み立てる。
 *
 * 使用箇所:
 *   - scripts/new-episode.ts (generate-script 直呼び)
 *   - scripts/pipeline/steps.ts (generate-voices 直呼び)
 */

import * as path from 'path';
import { createLogger } from '@money-video/shared-ts';
import { AnthropicClient } from '@money-video/adapters/llm';
import {
  FileSystemKnowledgeRepo,
  FileSystemInfographicResolver,
  FileSystemScriptYamlWriter,
  FileSystemPastEpisodesResolver,
} from '@money-video/adapters/knowledge';
import {
  VoicevoxClient,
  DEFAULT_VOICEVOX_CONFIG,
  resolveSpeakerId,
} from '@money-video/adapters/tts';
import {
  FileSystemVoiceStorage,
  FileSystemScriptStore,
  FileSystemVoiceCache,
} from '@money-video/adapters/storage';
import type { GenerateScriptDeps } from '@money-video/usecases/generateScript';
import type { GenerateVoiceDeps } from '@money-video/usecases/generateVoice';

/** tech-geopolitics-channel パッケージのルート（scripts/lib/ の 2 階層上） */
const PACKAGE_ROOT = path.resolve(__dirname, '..', '..');

/**
 * GenerateScriptUseCase の deps を組み立てる。
 * 環境変数 ANTHROPIC_API_KEY が未設定の場合は例外を投げる。
 */
export function makeScriptDeps(): GenerateScriptDeps {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error('ANTHROPIC_API_KEY が未設定です');

  const inputDir = path.join(PACKAGE_ROOT, 'input');
  const contentDir = path.join(PACKAGE_ROOT, 'public', 'content');

  return {
    llm: new AnthropicClient({ apiKey }),
    knowledge: new FileSystemKnowledgeRepo({ packageRoot: PACKAGE_ROOT }),
    infographics: new FileSystemInfographicResolver({ contentDir }),
    writer: new FileSystemScriptYamlWriter(),
    logger: createLogger({ name: 'generate-script', level: 'info' }),
    pastEpisodes: new FileSystemPastEpisodesResolver({ inputDir }),
  };
}

/**
 * GenerateVoiceUseCase の deps を組み立てる。
 * VOICEVOX_URL 環境変数でベース URL を上書きできる。
 */
export function makeVoiceDeps(): GenerateVoiceDeps {
  const publicDir = path.join(PACKAGE_ROOT, 'public');

  return {
    tts: new VoicevoxClient({
      ...DEFAULT_VOICEVOX_CONFIG,
      baseUrl: process.env.VOICEVOX_URL ?? DEFAULT_VOICEVOX_CONFIG.baseUrl,
    }),
    storage: new FileSystemVoiceStorage(publicDir),
    scriptStore: new FileSystemScriptStore(),
    resolveSpeakerId,
    logger: createLogger({ name: 'generate-voices', level: 'info' }),
    voiceCache: new FileSystemVoiceCache(path.join(PACKAGE_ROOT, 'cache', 'voices')),
  };
}
