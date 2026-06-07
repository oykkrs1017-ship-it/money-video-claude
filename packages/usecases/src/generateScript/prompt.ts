/**
 * Claude 台本生成用プロンプト組み立て（純粋関数）
 *
 * SYSTEM_PROMPT は templates/ に分割管理している。
 * 各テンプレートファイルを編集することでプロンプトの各セクションを独立して更新できる。
 *
 * I/O は一切行わない。knowledge/ からのロードは呼び出し側（KnowledgeRepository）が担う。
 */

import type { Directive, PastEpisodeSummary, TopicResearch, WinningPatterns } from './ports';
import { BASE_RULES } from './templates/base';
import { HOOK_RULES } from './templates/hook-rules';
import { STRATEGY_RULES } from './templates/strategy-rules';
import { VISUAL_TYPES } from './templates/visual-types';
import { OUTPUT_SPEC } from './templates/output-spec';

/**
 * Claude へのシステムプロンプト（キャラ設定・YAML 出力仕様）
 * セクション別テンプレートから組み立てる。変更は各 templates/*.ts ファイルを編集すること。
 */
export const SYSTEM_PROMPT = [BASE_RULES, HOOK_RULES, STRATEGY_RULES, VISUAL_TYPES, OUTPUT_SPEC].join('');

/** directive.yaml から台本生成への追加指示文を生成する（純粋関数） */
export function buildDirectiveInstructions(directive: Directive | null | undefined): string {
  const ch = directive?.tech_geopolitics;
  if (!ch) return '';

  const lines: string[] = ['## 今回の制作方針（directive.yaml より）'];

  if (ch.focus_theme) lines.push(`- 重点テーマ: ${ch.focus_theme}`);
  if (ch.tone) lines.push(`- トーン: ${ch.tone}`);
  if (ch.hook_style) lines.push(`- hookスタイル: ${ch.hook_style}`);
  if (ch.target_duration_min) lines.push(`- 目標尺: 約${ch.target_duration_min}分`);

  if (ch.avoid?.length) {
    lines.push(`- 避けるべき要素: ${ch.avoid.join('、')}`);
  }

  const criteria = (ch as Record<string, unknown>).topic_selection_criteria as
    | { life_relevance_checklist?: string[]; thumbnail_self_relevance_test?: string }
    | undefined;
  if (criteria) {
    lines.push('\n## テーマ選定チェック（このトピックが通過しているか確認すること）');
    lines.push('**フィルター①: 生活直結テスト** — 以下いずれか1つ以上に当てはまること:');
    criteria.life_relevance_checklist?.forEach((item) => lines.push(`  - ${item}`));
    if (criteria.thumbnail_self_relevance_test) {
      lines.push(`**フィルター②: サムネ自分ごとテスト** — ${criteria.thumbnail_self_relevance_test}`);
    }
    lines.push('両フィルターを通過しないテーマは、どれだけ話題でも採用しないこと。');
  }

  if (ch.current_hypothesis?.description) {
    lines.push('\n## 今回試す仮説（実験パラメータ）');
    if (ch.current_hypothesis.id) lines.push(`- 仮説ID: ${ch.current_hypothesis.id}`);
    lines.push(`- 内容: ${ch.current_hypothesis.description}`);
    if (ch.current_hypothesis.param) {
      lines.push(`- パラメータ: ${ch.current_hypothesis.param}`);
    }
  }

  if (ch.active_lessons?.length) {
    lines.push('\n## 過去の教訓（必ず守ること）');
    ch.active_lessons.forEach((l) => lines.push(`- ${l}`));
  }

  const sr = ch.script_rules;
  if (sr) {
    lines.push('\n## 台本ルール（directive.yaml が SoT・以下の数値を厳守すること）');
    lines.push(
      `- 尺/セリフ数: 約${sr.length.duration_min}分・${sr.length.lines_min}〜${sr.length.lines_max}セリフ`,
    );
    lines.push(
      `- ビジュアル: 図解系を全showの${Math.round(sr.visual.min_diagram_ratio * 100)}%以上に。rich-panel は最終手段（${sr.visual.rich_panel_policy}）`,
    );
    lines.push(`  使える図解型: ${sr.visual.allowed_diagram_types.join(' / ')}`);
    lines.push(`- Hook（計${sr.hook.total_sec}秒）の段構成:`);
    sr.hook.layers.forEach((l) => lines.push(`  - ${l}`));
    lines.push('- タイトルの型（3案中1案以上に王道KWを含めること）:');
    sr.title.patterns.forEach((p) => lines.push(`  - ${p}`));
    lines.push(`  王道KW: ${sr.title.keyword_list.join(' / ')}`);

    const orig = (sr as Record<string, unknown>).originality as
      | {
          unique_viewpoint_min?: number;
          worked_example_min?: number;
          require_counterargument?: boolean;
          avoid_template_phrasing?: boolean;
        }
      | undefined;
    if (orig) {
      lines.push(
        '- 独自性（Inauthentic Content Policy 対策・「AI量産」判定を避けるため厳守）:',
      );
      if (orig.unique_viewpoint_min) {
        lines.push(
          `  - 独自視点を analysis に最低${orig.unique_viewpoint_min}つ: ニュース要約から自動導出できない解釈（無関係な2事実の接続・通説への反論など）を入れる`,
        );
      }
      if (orig.worked_example_min) {
        lines.push(
          `  - 独自試算を最低${orig.worked_example_min}つ: 一次データに基づく自前の計算を算出過程ごと見せる（例「NISA枠でX買ったら年Y円」。コピーでなく根拠を示す）`,
        );
      }
      if (orig.require_counterargument) {
        lines.push(
          '  - 想定反論への応答: 一方的解説で終わらせず、反対意見を1つ提示し maro/ponchan が応答する構造にする',
        );
      }
      if (orig.avoid_template_phrasing) {
        lines.push(
          '  - テンプレ脱却: 過去エピソードと同一の言い回し・同一の数字提示フォーマットを避ける（hook の H-05 パターンも毎回変える）',
        );
      }
    }
  }

  return lines.join('\n');
}

/** winning-patterns.json からプロンプト用セクションを組み立てる（純粋関数） */
export function buildWinningPatternsSection(patterns: WinningPatterns | null | undefined): string {
  if (!patterns) return '';

  const lines: string[] = ['\n## 競合分析から導いた勝ちパターン（必ず参考にすること）'];

  if (patterns.recommendedHooks.length > 0) {
    lines.push('\n### 効果的なフック構造（冒頭3秒）');
    patterns.recommendedHooks.forEach((h) => lines.push(`- ${h}`));
  }

  if (patterns.structureInsights.length > 0) {
    lines.push('\n### 構成インサイト');
    patterns.structureInsights.forEach((s) => lines.push(`- ${s}`));
  }

  if (patterns.avoidPatterns.length > 0) {
    lines.push('\n### 避けるべきパターン');
    patterns.avoidPatterns.forEach((a) => lines.push(`- ${a}`));
  }

  const topTitleExamples = patterns.titlePatterns.flatMap((t) => t.examples).slice(0, 5);
  if (topTitleExamples.length > 0) {
    lines.push('\n### 高再生数タイトルの型（参考）');
    topTitleExamples.forEach((e) => lines.push(`- 例: ${e}`));
  }

  const tp = patterns.thumbnailPatterns;
  if (tp) {
    lines.push('\n### サムネイル視覚パターン（競合実績より・画像生成・infographics 設計に活かすこと）');
    if (tp.colorScheme) lines.push(`- 色構成: ${tp.colorScheme}`);
    if ((tp as Record<string, unknown>).textDensity) lines.push(`- テキスト密度: ${(tp as Record<string, unknown>).textDensity}`);
    if ((tp as Record<string, unknown>).composition) lines.push(`- 構成スタイル: ${(tp as Record<string, unknown>).composition}`);
    if (tp.commonElements.length > 0) lines.push(`- 有効な要素: ${tp.commonElements.join('、')}`);
    if ((tp as Record<string, unknown>).avoidElements && Array.isArray((tp as Record<string, unknown>).avoidElements)) {
      lines.push(`- 避けるべき要素: ${((tp as Record<string, unknown>).avoidElements as string[]).join('、')}`);
    }
  }

  lines.push(
    `\n（分析対象: ${patterns.totalVideosAnalyzed}件, 更新: ${patterns.analyzedAt.slice(0, 10)}）`,
  );

  return lines.join('\n');
}

/** knowledge/topic-research.json の競合動画・ニュースをプロンプト用 markdown に変換する（純粋関数） */
export function buildResearchContext(research: TopicResearch | null): string {
  if (!research) return '';

  const videos = research.competitor_videos ?? [];
  const news = research.news_items ?? [];

  if (videos.length === 0 && news.length === 0) return '';

  const date = research.researched_at.slice(0, 10);
  const lines: string[] = [
    `## 直近の競合動画・ニューストレンド（${date} 取得）`,
    '',
    '**このデータを踏まえ、今この瞬間に視聴者が気になっている話題と接続させること。**',
  ];

  if (videos.length > 0) {
    const topVideos = [...videos]
      .sort((a, b) => (b.views ?? 0) - (a.views ?? 0))
      .slice(0, 8);
    lines.push('', `### 競合チャンネル動画（上位${topVideos.length}本・再生数順）`);
    topVideos.forEach((v, i) => {
      const views = v.views != null ? `${Math.round(v.views / 10000)}万再生` : '再生数不明';
      const pub = v.published ? `・${v.published.slice(0, 10)}` : '';
      lines.push(`${i + 1}. 「${v.title}」 — ${v.channel}（${views}${pub}）`);
    });
  }

  if (news.length > 0) {
    const recentNews = news.slice(0, 12);
    lines.push('', `### 直近のトレンドニュース（${recentNews.length}件）`);
    recentNews.forEach((n) => {
      const pub = n.published ? ` (${n.published.slice(0, 10)})` : '';
      lines.push(`- 【${n.keyword}】${n.title}${pub}`);
      if (n.summary) lines.push(`  → ${n.summary.slice(0, 120)}`);
    });
  }

  return lines.join('\n');
}

/** 過去エピソードリストをプロンプト用テキストに整形する（純粋関数） */
export function buildPastEpisodesSection(
  episodes: ReadonlyArray<PastEpisodeSummary> | undefined,
): string {
  if (!episodes || episodes.length === 0) return '';
  const lines: string[] = [
    '',
    '## 🚫 過去エピソード一覧（これらとテーマ・切り口が被らないように書くこと）',
    '',
  ];
  for (const ep of episodes) {
    const topicPart = ep.topic ? ` / topic: ${ep.topic}` : '';
    lines.push(`- ${ep.epId}: 「${ep.title}」${topicPart}`);
  }
  lines.push('');
  lines.push(
    '**同じテーマ（例: ホルムズ海峡、台湾有事、TSMC 依存）を扱う場合は、別の切り口（歴史的類似事例／逆張り／勝者分析／時間軸の再定義）で書くこと。**',
  );
  lines.push('');
  return lines.join('\n');
}

/** ユーザープロンプトを組み立てる（純粋関数） */
export interface BuildUserPromptInput {
  topic: string;
  desc?: string;
  epId: string;
  directiveInstructions: string;
  researchContext?: string;
  /** topic-research.json から自動生成した競合動画・ニュースコンテキスト */
  topicResearchContext?: string;
  winningPatternsSection?: string;
  /** 過去エピソード（新しい順、重複回避用） */
  pastEpisodes?: ReadonlyArray<PastEpisodeSummary>;
  /**
   * 図解系ビジュアルの最低比率（%）。directive.yaml の min_diagram_ratio から計算して渡す。
   * 省略時は 60 を使用（SoT: directive.yaml tech_geopolitics.script_rules.visual.min_diagram_ratio）
   */
  minDiagramRatioPct?: number;
}

export function buildUserPrompt(input: BuildUserPromptInput): string {
  const {
    topic,
    desc = '',
    epId,
    directiveInstructions,
    researchContext = '',
    topicResearchContext = '',
    winningPatternsSection = '',
    pastEpisodes,
    minDiagramRatioPct = 60,
  } = input;

  const pastSection = buildPastEpisodesSection(pastEpisodes);

  const today = new Date().toLocaleDateString('ja-JP', { year: 'numeric', month: 'long', day: 'numeric' });

  return `以下のトピックで台本を生成してください。

今日の日付: ${today}（台本内の「今」「現在」「今年」はこの日付を基準にすること）
エピソードID: ${epId}
トピック: ${topic}
${desc ? `補足情報: ${desc}` : ''}

${directiveInstructions}
${pastSection}
${topicResearchContext ? `\n${topicResearchContext}\n` : ''}
${researchContext ? `\n## NotebookLM リサーチ結果（必ず活用すること）\n${researchContext}\n` : ''}
${winningPatternsSection}

## 必須ルール（違反禁止）
1. **図解系ビジュアルを主力にすること** — 全showの${minDiagramRatioPct}%以上を図解系（comparison-table / flow-chart / traffic-light / cycle-loop / scale-balance / isometric-stack / chart / timeline / pyramid / venn / map）にすること
   - explanation・analysis チャプターでは原則すべてのセリフに図解系ビジュアルを付ける
   - rich-panel は「どの図解型にも当てはまらない補足説明」にのみ使う（最終手段・1チャプターに1個以下）
   - rich-panel を使う場合は bodyを2〜4文の詳細説明にし、pointsは2〜4項目をオブジェクト形式で書くこと（情報密度が上がる）:
     - \`value\`/\`unit\`: 印象的な統計数字がある場合は必ず入れる（例: "88%"/"原油輸入量の割合"）
     - \`body\`: タイトルの補足説明1〜2文。「なぜその数字が重要か」を書く
     - \`source\`: 実在する資料・機関名＋年（架空の出典は禁止）
2. 数字・統計は実在する信憑性のある数値を使うこと（架空の数字は禁止）
3. チャートは3〜5個作成してchartDataに定義すること
4. タグは20〜30個に絞る（SEO重み分散を避けるためコアテーマに集約）
5. YAML形式のみ出力すること（説明文・コードブロック禁止）
6. **セリフ数は55〜65セリフ必須**（8〜11分のテンポ重視。90セリフ超の長尺は離脱増の主因のため禁止）
7. **1セリフは必ず60文字以上**（60文字未満は品質NG・作り直し）
   - 短い反応セリフ（「そうなのか！」「やばいぞ！」）は禁止
   - 必ず具体的な情報・感想・補足を加えて60文字以上にすること
   - 目安: 「、」や「。」が2〜3個入る程度の長さ
8. **hook 冒頭は「H-00 ガーコ式定型挨拶（こんにちは、ぽんちゃんです。＋緊急性/問いかけ＋テーマ提示＋損失回避KW）」→「数字ドーン」の順**（SYSTEM_PROMPT の hook 設計ルール H-00/H-01 参照）
9. **多角的構図を最低2種類組み合わせる**（SYSTEM_PROMPT の多角的構図ルール参照）
10. **タイトルは損回避・断定型を基本に、先頭20字へ王道KW（新NISA/iDeCo/S&P500/オルカン等）または銘柄名を配置。3案中1案以上に王道KWを含める**（SYSTEM_PROMPT のタイトル生成ルール参照）
11. **独自性必須（AI量産判定の回避・最重要）**: ①独自視点（"私はこう読む"）を最低1つ、②一次データに基づく独自試算を最低1つ（算出過程ごと提示）、③想定反論への応答を1箇所、を必ず含める。ニュース要約の焼き直し台本は禁止（SYSTEM_PROMPT の独自性ルール参照）`;
}

/** Claude Sonnet 4.x の概算コスト（USD）を算出する（純粋関数） */
export function estimateCostUsd(
  inputTokens: number,
  outputTokens: number,
  cacheReadTokens = 0,
  cacheWriteTokens = 0,
): number {
  // Sonnet 4.6 単価: input $3/MTok, output $15/MTok
  // cache write $3.75/MTok (1.25x), cache read $0.30/MTok (0.10x)
  const cost =
    inputTokens * 0.000003 +
    outputTokens * 0.000015 +
    cacheWriteTokens * 0.000003_75 +
    cacheReadTokens * 0.000000_3;
  return Math.round(cost * 10_000) / 10_000;
}
