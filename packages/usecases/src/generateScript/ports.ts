/**
 * GenerateScriptUseCase の Port 定義
 *
 * LLM / 知識ベース / インフォグラフィック解決 / YAML 書き出しを
 * 全て interface 経由で注入する。具象実装は adapters 側で提供。
 */

import type { Logger } from '@money-video/shared-ts';
import type { schema } from '@money-video/domain';

/** LLM テキスト補完クライアント（AnthropicClient が実装する） */
export interface LlmClient {
  complete(input: {
    system: string;
    user: string;
    model: string;
    maxTokens: number;
  }): Promise<LlmCompletion>;
}

export interface LlmCompletion {
  /** モデルが返したテキスト（YAML を期待） */
  text: string;
  /** 入力トークン数 */
  inputTokens: number;
  /** 出力トークン数 */
  outputTokens: number;
  /** キャッシュ読み取りトークン数（0 = キャッシュミス） */
  cacheReadTokens?: number;
  /** キャッシュ書き込みトークン数 */
  cacheWriteTokens?: number;
}

// ────────────────────────────────────────────────────────────
// knowledge/directive.yaml の最小スキーマ
// directive.yaml は人間が書き換える運用データなので、Zod 厳密型ではなく
// partial な shape のみ定義して、欠損があれば UseCase 側でフォールバック。
// ────────────────────────────────────────────────────────────

export interface DirectiveHypothesis {
  id?: string;
  description?: string;
  param?: string;
}

export interface DirectiveTechGeopolitics {
  focus_theme?: string;
  tone?: string;
  hook_style?: string;
  target_duration_min?: number;
  avoid?: string[];
  current_hypothesis?: DirectiveHypothesis;
  active_lessons?: string[];
  /** 台本の機械可読ルール（高頻度調整値の SoT）。Zod 検証を通過したものだけが入る */
  script_rules?: schema.ScriptRules;
}

export interface Directive {
  tech_geopolitics?: DirectiveTechGeopolitics;
}

/** knowledge/winning-patterns.json のスキーマ */
export interface WinningPatterns {
  analyzedAt: string;
  totalVideosAnalyzed: number;
  structureInsights: string[];
  recommendedHooks: string[];
  avoidPatterns: string[];
  titlePatterns: Array<{ type: string; label: string; examples: string[] }>;
  hookPatterns: Array<{ type: string; description: string; examples: string[] }>;
  thumbnailPatterns: {
    colorScheme: string;
    commonElements: string[];
  };
}

/**
 * knowledge/ ディレクトリから directive / winning-patterns / research ファイルを読む。
 * 読めない場合は null を返し、UseCase 側でフォールバックする。
 *
 * 戻り値が raw な Record なのは、adapter 層に Directive / WinningPatterns 型依存を
 * 持たせないため（UseCase 内で narrowDirective / narrowWinningPatterns で型解釈する）。
 */
/** knowledge/topic-research.json の最小スキーマ */
export interface TopicResearchVideo {
  channel: string;
  title: string;
  views: number | null;
  published: string | null;
}

export interface TopicResearchNews {
  keyword: string;
  title: string;
  summary: string;
  published: string | null;
}

export interface TopicResearch {
  researched_at: string;
  competitor_videos: TopicResearchVideo[];
  news_items: TopicResearchNews[];
}

export interface KnowledgeRepository {
  loadDirective(): Promise<Record<string, unknown> | null>;
  loadWinningPatterns(): Promise<Record<string, unknown> | null>;
  /** 相対パス（tech-geopolitics-channel からの）指定で research テキストを読む */
  loadResearchFile(relativePath: string): Promise<string | null>;
  /** knowledge/topic-research.json を読む。ファイル不在時は null を返す */
  loadTopicResearch(): Promise<Record<string, unknown> | null>;
}

/**
 * public/content/infographic_{epId}_N.png の一覧を返す。
 * UseCase 側で chapters に章レベル visuals として分配する。
 */
export interface InfographicResolver {
  listForEpisode(epId: string): Promise<string[]>;
}

/** 過去エピソードの最小サマリ（重複回避プロンプト注入用） */
export interface PastEpisodeSummary {
  epId: string;
  title: string;
  topic?: string;
}

/**
 * input/*.yaml を走査し、過去エピソードのタイトルとトピックを返す。
 * 同じホルムズ海峡／台湾有事を何度も取り上げる重複を防ぐため、LLM に
 * 「これらと被らないテーマで書け」と指示する材料になる。
 */
export interface PastEpisodesResolver {
  /** 現在生成中の epId を除外しつつ、直近 N 件を新しい順で返す */
  listRecent(excludeEpId: string, limit: number): Promise<PastEpisodeSummary[]>;
}

/** 生成済み YAML を保存する（input/{epId}.yaml 相当） */
export interface ScriptYamlWriter {
  write(absolutePath: string, yamlText: string): Promise<void>;
}

/** GenerateScript の依存バンドル */
export interface GenerateScriptDeps {
  llm: LlmClient;
  knowledge: KnowledgeRepository;
  infographics: InfographicResolver;
  writer: ScriptYamlWriter;
  logger: Logger;
  /** 省略可。過去エピソード重複回避のため、指定されていれば LLM プロンプトへ注入される */
  pastEpisodes?: PastEpisodesResolver;
}

/** 実行入力 */
export interface GenerateScriptInput {
  /** トピック文（必須） */
  topic: string;
  /** エピソード ID（例: "ep007"） */
  epId: string;
  /** 補足説明 */
  desc?: string;
  /** リサーチファイルの tech-geopolitics-channel 相対パス */
  researchFile?: string;
  /** LLM モデル名（既定: claude-opus-4-6） */
  model?: string;
  /** max_tokens（既定: 12000） */
  maxTokens?: number;
  /** 出力先の絶対パス（例: .../input/ep007.yaml） */
  outputPath: string;
}

export interface GenerateScriptResult {
  outputPath: string;
  title: string;
  chapterCount: number;
  totalLines: number;
  inputTokens: number;
  outputTokens: number;
  /** 推定コスト（USD） */
  costUsd: number;
  elapsedMs: number;
  /** 注入したインフォグラフィック数 */
  infographicsInjected: number;
}
