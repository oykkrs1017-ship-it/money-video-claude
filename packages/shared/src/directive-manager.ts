/**
 * packages/shared/src/directive-manager.ts
 * directive.yaml の読み書きと仮説の前進（advance）を管理するクラス
 *
 * 使い方:
 *   const dm = new DirectiveManager(rootDir);
 *   const directive = dm.load();
 *   dm.advanceHypothesis('ep005', 'KEEP');
 */

import * as fs from 'fs';
import * as path from 'path';
import * as yaml from 'js-yaml';

export interface Hypothesis {
  id: string | null;
  description: string | null;
  param: string | null;
  seed: number;
}

export interface TechGeopoliticsDirective {
  focus_theme: string;
  avoid: string[];
  tone: string;
  target_duration_min: number;
  hook_style: string;
  current_hypothesis: Hypothesis;
  active_lessons: string[];
}

export interface DirectiveConfig {
  version: number;
  updated: string;
  tech_geopolitics: TechGeopoliticsDirective;
  ai_money_shorts: Record<string, unknown>;
  global: {
    max_api_cost_usd_per_day: number;
    require_review_before_upload: boolean;
    auto_loop_enabled: boolean;
    max_episodes_per_loop: number;
  };
}

export class DirectiveManager {
  private directivePath: string;

  constructor(rootDir: string) {
    this.directivePath = path.join(rootDir, 'knowledge', 'directive.yaml');
  }

  /** directive.yaml を読み込む */
  load(): DirectiveConfig {
    if (!fs.existsSync(this.directivePath)) {
      throw new Error(`directive.yaml が見つかりません: ${this.directivePath}`);
    }
    return yaml.load(fs.readFileSync(this.directivePath, 'utf8')) as DirectiveConfig;
  }

  /** directive.yaml を書き込む */
  save(config: DirectiveConfig): void {
    config.updated = new Date().toISOString().slice(0, 10);
    const content = yaml.dump(config, { indent: 2, lineWidth: 120, noRefs: true });
    fs.mkdirSync(path.dirname(this.directivePath), { recursive: true });
    fs.writeFileSync(this.directivePath, content, 'utf8');
  }

  /** 現在の仮説を返す（null なら仮説なし=ベースライン計測） */
  getCurrentHypothesis(): Hypothesis | null {
    try {
      const config = this.load();
      const hyp = config.tech_geopolitics?.current_hypothesis;
      return hyp?.id ? hyp : null;
    } catch {
      return null;
    }
  }

  /**
   * エピソードの verdict に基づいて仮説を前進させる。
   * KEEP    → 仮説をクリアして次の実験準備
   * DISCARD → 仮説をクリア（失敗記録）
   * TENTATIVE → シードのみ変えて再試行
   */
  advanceHypothesis(episodeId: string, verdict: 'KEEP' | 'DISCARD' | 'TENTATIVE'): void {
    let config: DirectiveConfig;
    try {
      config = this.load();
    } catch {
      console.warn('directive.yaml が存在しないため仮説前進をスキップ');
      return;
    }

    const ch = config.tech_geopolitics;
    const hyp = ch.current_hypothesis;

    if (verdict === 'KEEP' || verdict === 'DISCARD') {
      const status = verdict === 'KEEP' ? '✅ KEEP' : '❌ DISCARD';
      console.log(`${status}: 仮説 ${hyp.id ?? 'none'} → 仮説クリア（次回はベースライン計測）`);
      ch.current_hypothesis = {
        id: null,
        description: null,
        param: null,
        seed: ch.current_hypothesis.seed,
      };
    } else if (verdict === 'TENTATIVE') {
      // シードを変えて同じ仮説で再試行
      const newSeed = (ch.current_hypothesis.seed + 7) % 100;
      console.log(`🔄 TENTATIVE: 仮説 ${hyp.id} を seed=${newSeed} で再試行`);
      ch.current_hypothesis.seed = newSeed;
    }

    this.save(config);
  }

  /**
   * 新しい仮説を設定する（自律ループから呼ばれる）
   */
  setHypothesis(hypothesis: Hypothesis): void {
    let config: DirectiveConfig;
    try {
      config = this.load();
    } catch {
      console.warn('directive.yaml が存在しないため仮説設定をスキップ');
      return;
    }
    config.tech_geopolitics.current_hypothesis = hypothesis;
    this.save(config);
    console.log(`🧪 新仮説設定: ${hypothesis.id} — ${hypothesis.description}`);
  }

  /**
   * 教訓を active_lessons に追加する
   */
  addLesson(lesson: string): void {
    let config: DirectiveConfig;
    try {
      config = this.load();
    } catch {
      return;
    }
    if (!config.tech_geopolitics.active_lessons.includes(lesson)) {
      config.tech_geopolitics.active_lessons.push(lesson);
      this.save(config);
      console.log(`📚 教訓追加: ${lesson}`);
    }
  }

  /** 自律ループが有効かどうか */
  isAutoLoopEnabled(): boolean {
    try {
      return this.load().global.auto_loop_enabled === true;
    } catch {
      return false;
    }
  }

  /** 日次費用上限 (USD) */
  getMaxDailyCostUsd(): number {
    try {
      return this.load().global.max_api_cost_usd_per_day ?? 5.0;
    } catch {
      return 5.0;
    }
  }

  /** 1ループあたりの最大エピソード数 */
  getMaxEpisodesPerLoop(): number {
    try {
      return this.load().global.max_episodes_per_loop ?? 3;
    } catch {
      return 3;
    }
  }
}
