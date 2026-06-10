/**
 * prompt.ts のユニットテスト
 */

import { describe, expect, it } from 'vitest';
import {
  SYSTEM_PROMPT,
  buildDirectiveInstructions,
  buildUserPrompt,
  buildWinningPatternsSection,
  estimateCostUsd,
} from './prompt';
import type { Directive, WinningPatterns } from './ports';

describe('SYSTEM_PROMPT', () => {
  it('キャラクター定義を含む', () => {
    expect(SYSTEM_PROMPT).toContain('ponchan');
    expect(SYSTEM_PROMPT).toContain('maro');
  });

  it('図解系ビジュアルを最優先とする指示を含む', () => {
    expect(SYSTEM_PROMPT).toContain('rich-panel');
    expect(SYSTEM_PROMPT).toContain('図解・ダイアグラム系ビジュアルを最優先で使うこと');
  });

  it('YAML のみ出力する指示を含む', () => {
    expect(SYSTEM_PROMPT).toContain('YAMLのみ出力');
  });

  it('独自性ルール（Inauthentic Content Policy 対策）を含む', () => {
    expect(SYSTEM_PROMPT).toContain('独自性ルール');
    expect(SYSTEM_PROMPT).toContain('独自視点');
    expect(SYSTEM_PROMPT).toContain('独自試算');
    expect(SYSTEM_PROMPT).toContain('想定反論への応答');
  });
});

describe('buildDirectiveInstructions', () => {
  it('directive が null なら空文字を返す', () => {
    expect(buildDirectiveInstructions(null)).toBe('');
    expect(buildDirectiveInstructions(undefined)).toBe('');
  });

  it('tech_geopolitics がない場合も空文字', () => {
    expect(buildDirectiveInstructions({} as Directive)).toBe('');
  });

  it('focus_theme / tone / hook_style を箇条書きで出力する', () => {
    const d: Directive = {
      tech_geopolitics: {
        focus_theme: '半導体',
        tone: '冷静',
        hook_style: '問いかけ',
        target_duration_min: 10,
      },
    };
    const result = buildDirectiveInstructions(d);
    expect(result).toContain('重点テーマ: 半導体');
    expect(result).toContain('トーン: 冷静');
    expect(result).toContain('hookスタイル: 問いかけ');
    expect(result).toContain('目標尺: 約10分');
  });

  it('avoid 配列を 「、」 区切りで結合する', () => {
    const d: Directive = {
      tech_geopolitics: { avoid: ['扇情的表現', '陰謀論'] },
    };
    expect(buildDirectiveInstructions(d)).toContain('避けるべき要素: 扇情的表現、陰謀論');
  });

  it('current_hypothesis があれば仮説セクションを出力する', () => {
    const d: Directive = {
      tech_geopolitics: {
        current_hypothesis: {
          id: 'H-042',
          description: '冒頭に数字を入れると CTR が上がる',
          param: 'hook_number=1',
        },
      },
    };
    const result = buildDirectiveInstructions(d);
    expect(result).toContain('仮説ID: H-042');
    expect(result).toContain('冒頭に数字を入れると CTR が上がる');
    expect(result).toContain('パラメータ: hook_number=1');
  });

  it('active_lessons を教訓セクションに出力する', () => {
    const d: Directive = {
      tech_geopolitics: {
        active_lessons: ['台湾海峡の扱いは慎重に', '数字の単位を明示する'],
      },
    };
    const result = buildDirectiveInstructions(d);
    expect(result).toContain('過去の教訓');
    expect(result).toContain('台湾海峡の扱いは慎重に');
    expect(result).toContain('数字の単位を明示する');
  });

  it('script_rules があれば尺・ビジュアル・Hook・タイトルの数値を出力する', () => {
    const d: Directive = {
      tech_geopolitics: {
        script_rules: {
          length: { duration_min: 9, lines_min: 55, lines_max: 65 },
          title: {
            patterns: ['損回避・警告型: {KW}、{警告}'],
            keyword_list: ['新NISA', 'S&P500'],
          },
          hook: { total_sec: 30, layers: ['H-05 逆説層', 'H-01 結論層'] },
          visual: {
            rich_panel_policy: 'fallback_only',
            diagram_first: true,
            min_diagram_ratio: 0.6,
            allowed_diagram_types: ['comparison-table', 'chart'],
          },
        },
      },
    };
    const result = buildDirectiveInstructions(d);
    expect(result).toContain('directive.yaml が SoT');
    expect(result).toContain('約9分・55〜65セリフ');
    expect(result).toContain('図解系を全showの60%以上');
    expect(result).toContain('fallback_only');
    expect(result).toContain('comparison-table / chart');
    expect(result).toContain('Hook（計30秒）');
    expect(result).toContain('H-05 逆説層');
    expect(result).toContain('損回避・警告型');
    expect(result).toContain('新NISA / S&P500');
  });

  it('script_rules.originality があれば独自性ルールを出力する', () => {
    const d: Directive = {
      tech_geopolitics: {
        script_rules: {
          length: { duration_min: 9, lines_min: 55, lines_max: 65 },
          title: { patterns: ['損回避型'], keyword_list: ['新NISA'] },
          hook: { total_sec: 30, layers: ['H-05'] },
          visual: {
            rich_panel_policy: 'fallback_only',
            diagram_first: true,
            min_diagram_ratio: 0.6,
            allowed_diagram_types: ['chart'],
          },
          originality: {
            unique_viewpoint_min: 1,
            worked_example_min: 1,
            require_counterargument: true,
            avoid_template_phrasing: true,
          },
        },
      },
    } as Directive;
    const result = buildDirectiveInstructions(d);
    expect(result).toContain('独自性');
    expect(result).toContain('独自視点を analysis に最低1つ');
    expect(result).toContain('独自試算を最低1つ');
    expect(result).toContain('想定反論への応答');
    expect(result).toContain('テンプレ脱却');
  });
});

describe('buildWinningPatternsSection', () => {
  it('null なら空文字', () => {
    expect(buildWinningPatternsSection(null)).toBe('');
    expect(buildWinningPatternsSection(undefined)).toBe('');
  });

  it('推奨フック・構成インサイト・避けパターンを列挙する', () => {
    const p: WinningPatterns = {
      analyzedAt: '2026-04-23T00:00:00Z',
      totalVideosAnalyzed: 42,
      structureInsights: ['冒頭3秒に数字', '中盤に事例'],
      recommendedHooks: ['数字型', '疑問型'],
      avoidPatterns: ['ダラダラ前置き'],
      titlePatterns: [
        { type: 'number', label: '数字型', examples: ['3分で分かる', '10倍の理由', '5つの戦略'] },
      ],
      hookPatterns: [],
      thumbnailPatterns: { colorScheme: 'blue', commonElements: [] },
    };
    const result = buildWinningPatternsSection(p);
    expect(result).toContain('効果的なフック構造');
    expect(result).toContain('- 数字型');
    expect(result).toContain('- 疑問型');
    expect(result).toContain('構成インサイト');
    expect(result).toContain('冒頭3秒に数字');
    expect(result).toContain('避けるべきパターン');
    expect(result).toContain('ダラダラ前置き');
    expect(result).toContain('高再生数タイトルの型');
    expect(result).toContain('- 例: 3分で分かる');
  });

  it('高再生数タイトルは先頭 5 件まで', () => {
    const p: WinningPatterns = {
      analyzedAt: '2026-04-23',
      totalVideosAnalyzed: 10,
      structureInsights: [],
      recommendedHooks: [],
      avoidPatterns: [],
      titlePatterns: [
        {
          type: 'mixed',
          label: 'mixed',
          examples: ['A', 'B', 'C', 'D', 'E', 'F', 'G'],
        },
      ],
      hookPatterns: [],
      thumbnailPatterns: { colorScheme: '', commonElements: [] },
    };
    const result = buildWinningPatternsSection(p);
    // A..E は含まれ、F と G は含まれない
    expect(result).toContain('- 例: A');
    expect(result).toContain('- 例: E');
    expect(result).not.toContain('- 例: F');
    expect(result).not.toContain('- 例: G');
  });

  it('analyzedAt は先頭 10 文字（日付部）だけ使う', () => {
    const p: WinningPatterns = {
      analyzedAt: '2026-04-23T12:34:56Z',
      totalVideosAnalyzed: 1,
      structureInsights: [],
      recommendedHooks: [],
      avoidPatterns: [],
      titlePatterns: [],
      hookPatterns: [],
      thumbnailPatterns: { colorScheme: '', commonElements: [] },
    };
    expect(buildWinningPatternsSection(p)).toContain('2026-04-23');
    expect(buildWinningPatternsSection(p)).not.toContain('12:34:56');
  });
});

describe('buildUserPrompt', () => {
  it('topic / epId / desc を本文に含める', () => {
    const result = buildUserPrompt({
      topic: '台湾有事',
      epId: 'ep010',
      desc: '短期影響',
      directiveInstructions: '',
    });
    expect(result).toContain('エピソードID: ep010');
    expect(result).toContain('トピック: 台湾有事');
    expect(result).toContain('補足情報: 短期影響');
  });

  it('desc が空ならその行を出力しない', () => {
    const result = buildUserPrompt({
      topic: 'X',
      epId: 'ep001',
      directiveInstructions: '',
    });
    expect(result).not.toContain('補足情報:');
  });

  it('researchContext があれば NotebookLM セクションを差し込む', () => {
    const result = buildUserPrompt({
      topic: 'X',
      epId: 'ep001',
      directiveInstructions: '',
      researchContext: 'リサーチ本文',
    });
    expect(result).toContain('NotebookLM リサーチ結果');
    expect(result).toContain('リサーチ本文');
  });

  it('researchContext が空ならセクションは挿入されない', () => {
    const result = buildUserPrompt({
      topic: 'X',
      epId: 'ep001',
      directiveInstructions: '',
    });
    expect(result).not.toContain('NotebookLM');
  });

  it('必須ルールを常に含める', () => {
    const result = buildUserPrompt({
      topic: 'X',
      epId: 'ep001',
      directiveInstructions: '',
    });
    expect(result).toContain('図解系ビジュアルを主力にすること');
    expect(result).toContain('60%以上を図解系');
    expect(result).toContain('セリフ数は55〜65セリフ必須');
    expect(result).toContain('60文字未満は品質NG');
  });
});

describe('estimateCostUsd', () => {
  it('input $0.000003/token, output $0.000015/token (Sonnet 4.6) で計算する', () => {
    // 1000 input + 500 output = 0.003 + 0.0075 = 0.0105
    expect(estimateCostUsd(1000, 500)).toBeCloseTo(0.0105, 4);
  });

  it('0 トークンは 0 ドル', () => {
    expect(estimateCostUsd(0, 0)).toBe(0);
  });

  it('小数第 4 位で丸める', () => {
    // 10 input = 0.00003, 10 output = 0.00015, 合計 0.00018 → 0.0002
    expect(estimateCostUsd(10, 10)).toBe(0.0002);
  });
});
