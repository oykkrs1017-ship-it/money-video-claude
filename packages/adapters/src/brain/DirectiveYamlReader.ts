/**
 * DirectiveYamlReader
 *
 * knowledge/directive.yaml を読み取り、AutonomousLoopUseCase の
 * DirectiveReader ポートを実装する。
 */

import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import * as yaml from 'js-yaml';
import { AdapterError } from '@money-video/shared-ts';

// DirectiveReader port と shape 互換を保つローカル定義
export interface DirectiveConfig {
  isAutoLoopEnabled: boolean;
  maxDailyCostUsd: number;
  maxEpisodesPerLoop: number;
  currentHypothesisId: string | null;
  currentHypothesisSeed?: string | null;
}

export interface DirectiveReader {
  read(): DirectiveConfig;
  getDirectiveHash(): string;
}

interface RawDirective {
  global?: {
    auto_loop_enabled?: boolean;
    max_api_cost_usd_per_day?: number;
    max_episodes_per_loop?: number;
  };
  tech_geopolitics?: {
    current_hypothesis?: {
      id?: string | null;
      seed?: number | null;
    };
  };
}

export class DirectiveYamlReader implements DirectiveReader {
  private readonly directivePath: string;

  constructor(rootDir: string) {
    this.directivePath = path.join(rootDir, 'knowledge', 'directive.yaml');
  }

  read(): DirectiveConfig {
    if (!fs.existsSync(this.directivePath)) {
      throw new AdapterError(
        `directive.yaml が見つかりません: ${this.directivePath}`,
        'brain',
      );
    }

    const raw = yaml.load(
      fs.readFileSync(this.directivePath, 'utf8'),
    ) as RawDirective;

    const global = raw?.global ?? {};
    const hyp = raw?.tech_geopolitics?.current_hypothesis;

    return {
      isAutoLoopEnabled: global.auto_loop_enabled === true,
      maxDailyCostUsd: global.max_api_cost_usd_per_day ?? 5.0,
      maxEpisodesPerLoop: global.max_episodes_per_loop ?? 3,
      currentHypothesisId: hyp?.id ?? null,
      currentHypothesisSeed: hyp?.seed != null ? String(hyp.seed) : null,
    };
  }

  getDirectiveHash(): string {
    if (!fs.existsSync(this.directivePath)) return '000000000000';
    const content = fs.readFileSync(this.directivePath);
    return crypto.createHash('sha256').update(content).digest('hex').slice(0, 12);
  }
}
