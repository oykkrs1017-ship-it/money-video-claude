import React from 'react';
import type { Episode } from '../types/episode';
import type { CompositionType } from '../schemas/episodeSchema';

// ── プラグイン型定義 ────────────────────────────────────────────────

export interface CompositionPlugin {
  /** スキーマと一致するID */
  id: CompositionType;
  /** Remotion Studio 表示名 */
  name: string;
  /** Remotionコンポーネント */
  component: React.ComponentType<{ episode: Episode }>;
  /** 推奨尺（フレーム数、30fps基準） */
  durationRange: { min: number; max: number };
  /** 推奨セリフ行数 */
  lineRange: { min: number; max: number };
  /** コンポジション説明 */
  description: string;
}

// ── 各コンポジションのインポート ─────────────────────────────────────

import { TypeAMystery } from './TypeA-Mystery';
import { TypeBRanking } from './TypeB-Ranking';
import { TypeCVersus } from './TypeC-Versus';
import { TypeDQuiz } from './TypeD-Quiz';
import { TypeEStory } from './TypeE-Story';
import { TypeFNewsFlash } from './TypeF-NewsFlash';
import { TypeGMythBuster } from './TypeG-MythBuster';

// ── レジストリ定義 ───────────────────────────────────────────────────

const PLUGINS: CompositionPlugin[] = [
  {
    id: 'TypeA-Mystery',
    name: '謎解き型',
    component: TypeAMystery,
    durationRange: { min: 1350, max: 1650 }, // 45–55秒
    lineRange: { min: 8, max: 14 },
    description: 'フック→疑問→解説→まとめ の構成。知的好奇心を刺激する謎かけから入る。',
  },
  {
    id: 'TypeB-Ranking',
    name: 'ランキング型',
    component: TypeBRanking,
    durationRange: { min: 1500, max: 1800 }, // 50–60秒
    lineRange: { min: 10, max: 15 },
    description: 'フック→3位→2位→1位→CTA の構成。ランキング形式で段階的に情報を開示する。',
  },
  {
    id: 'TypeC-Versus',
    name: 'VS対決型',
    component: TypeCVersus,
    durationRange: { min: 1350, max: 1650 }, // 45–55秒
    lineRange: { min: 8, max: 13 },
    description: 'フック→A主張→B主張→データ決着 の構成。対比で違いを際立たせる。',
  },
  {
    id: 'TypeD-Quiz',
    name: 'クイズ型',
    component: TypeDQuiz,
    durationRange: { min: 1200, max: 1500 }, // 40–50秒
    lineRange: { min: 8, max: 12 },
    description: '出題→選択肢→シンキングタイム→正解 の構成。視聴者参加型でエンゲージメントを高める。',
  },
  {
    id: 'TypeE-Story',
    name: 'ストーリー型',
    component: TypeEStory,
    durationRange: { min: 1500, max: 1800 }, // 50–60秒
    lineRange: { min: 10, max: 15 },
    description: '仮定→展開→転→教訓 の構成。具体的なシナリオで感情移入させる。',
  },
  {
    id: 'TypeF-NewsFlash',
    name: '速報型',
    component: TypeFNewsFlash,
    durationRange: { min: 900, max: 1200 }, // 30–40秒
    lineRange: { min: 6, max: 10 },
    description: '速報→背景→影響→アクション の構成。ニュース速報スタイルで緊急性を演出。',
  },
  {
    id: 'TypeG-MythBuster',
    name: '誤解解消型',
    component: TypeGMythBuster,
    durationRange: { min: 1200, max: 1500 }, // 40–50秒
    lineRange: { min: 8, max: 13 },
    description: '通説→反証→正解→実践 の構成。「実はこれ間違い」から入って正しい知識を提供。',
  },
];

// ── レジストリ Map ───────────────────────────────────────────────────

export const REGISTRY = new Map<CompositionType, CompositionPlugin>(
  PLUGINS.map((p) => [p.id, p])
);

// ── ヘルパー関数 ─────────────────────────────────────────────────────

/** 全プラグインをリストで返す */
export function getAllPlugins(): CompositionPlugin[] {
  return PLUGINS;
}

/** IDでプラグインを取得。見つからなければ undefined */
export function getPlugin(id: CompositionType): CompositionPlugin | undefined {
  return REGISTRY.get(id);
}

/** IDでコンポーネントを取得。見つからなければ null */
export function getComponent(id: CompositionType): React.ComponentType<{ episode: Episode }> | null {
  return REGISTRY.get(id)?.component ?? null;
}

/** 尺（フレーム数）がプラグインの推奨範囲内か検証 */
export function isValidDuration(id: CompositionType, frames: number): boolean {
  const plugin = REGISTRY.get(id);
  if (!plugin) return false;
  return frames >= plugin.durationRange.min && frames <= plugin.durationRange.max;
}

/** セリフ行数がプラグインの推奨範囲内か検証 */
export function isValidLineCount(id: CompositionType, lineCount: number): boolean {
  const plugin = REGISTRY.get(id);
  if (!plugin) return false;
  return lineCount >= plugin.lineRange.min && lineCount <= plugin.lineRange.max;
}
