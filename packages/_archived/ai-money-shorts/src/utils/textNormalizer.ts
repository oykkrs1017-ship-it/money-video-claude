/**
 * textNormalizer.ts
 * VOICEVOXに渡すテキストの発音を正規化する。
 * ローマ字・略語・英字混じり語をカタカナ読みに変換することで
 * 誤読（「NISA→エヌアイエスエー」等）を防ぐ。
 *
 * 追加ルール: REPLACEMENT_RULES の末尾に追記する。
 * 大文字・小文字どちらにもマッチするよう i フラグを付与している。
 */

interface ReplacementRule {
  pattern: RegExp;
  replacement: string;
  description: string;
}

/**
 * 置換ルール一覧（上から順に適用される。順序に注意）
 *
 * ポリシー:
 * - 単語境界 \b が効かないケースはルック アヘッド/バック で対処
 * - 数字付き略語（S&P500等）は先に処理する
 * - 一般的な読み方が複数ある語は最頻用を採用
 */
const REPLACEMENT_RULES: ReplacementRule[] = [
  // ─── 金融・投資用語 ───
  { pattern: /NISA/gi,          replacement: 'ニーサ',            description: '少額投資非課税制度' },
  { pattern: /iDeCo/gi,         replacement: 'イデコ',            description: '個人型確定拠出年金' },
  { pattern: /ETF/gi,           replacement: 'イーティーエフ',    description: '上場投資信託' },
  { pattern: /S&P\s*500/gi,     replacement: 'エスアンドピー500', description: 'S&P500指数' },
  { pattern: /S&P/gi,           replacement: 'エスアンドピー',    description: 'S&P指数' },
  { pattern: /REIT/gi,          replacement: 'リート',            description: '不動産投資信託' },
  { pattern: /FX/gi,            replacement: 'エフエックス',      description: '外国為替証拠金取引' },
  { pattern: /IPO/gi,           replacement: 'アイピーオー',      description: '新規株式公開' },
  { pattern: /PER/gi,           replacement: 'ピーイーアール',    description: '株価収益率' },
  { pattern: /PBR/gi,           replacement: 'ピービーアール',    description: '株価純資産倍率' },
  { pattern: /ROE/gi,           replacement: 'アールオーイー',    description: '自己資本利益率' },
  { pattern: /ROA/gi,           replacement: 'アールオーエー',    description: '総資産利益率' },
  { pattern: /GDP/gi,           replacement: 'ジーディーピー',    description: '国内総生産' },
  { pattern: /CPI/gi,           replacement: 'シーピーアイ',      description: '消費者物価指数' },
  { pattern: /BOJ/gi,           replacement: 'ビーオージェイ',    description: '日本銀行' },
  { pattern: /FRB/gi,           replacement: 'エフアールビー',    description: '米連邦準備制度理事会' },
  { pattern: /ECB/gi,           replacement: 'イーシービー',      description: '欧州中央銀行' },
  { pattern: /BPS/gi,           replacement: 'ビーピーエス',      description: '1株純資産' },
  { pattern: /EPS/gi,           replacement: 'イーピーエス',      description: '1株当たり利益' },
  { pattern: /TOPIX/gi,         replacement: 'トピックス',        description: '東証株価指数' },

  // ─── テクノロジー用語 ───
  { pattern: /\bAI\b/g,         replacement: 'エーアイ',          description: '人工知能' },
  { pattern: /ChatGPT/gi,       replacement: 'チャットジーピーティー', description: 'OpenAIのLLM' },
  { pattern: /GPT/gi,           replacement: 'ジーピーティー',    description: '大規模言語モデル' },
  { pattern: /LLM/gi,           replacement: 'エルエルエム',      description: '大規模言語モデル' },
  { pattern: /API/gi,           replacement: 'エーピーアイ',      description: 'アプリケーションプログラミングインタフェース' },
  { pattern: /SNS/gi,           replacement: 'エスエヌエス',      description: 'ソーシャルネットワークサービス' },
  { pattern: /YouTube/gi,       replacement: 'ユーチューブ',      description: '動画プラットフォーム' },
  { pattern: /SBI/gi,           replacement: 'エスビーアイ',      description: 'SBI証券' },
  { pattern: /eMAXIS/gi,        replacement: 'イーマクシス',      description: '三菱UFJのインデックスシリーズ' },

  // ─── 単位・記号 ───
  { pattern: /(\d+)\s*%/g,      replacement: '$1パーセント',      description: 'パーセント記号' },
  { pattern: /(\d+)\s*億/g,     replacement: '$1億',              description: '億（そのまま）' },
  { pattern: /(\d+)\s*兆/g,     replacement: '$1兆',              description: '兆（そのまま）' },

  // ─── 汎用英字（上記ルールにマッチしなかった大文字2〜6文字の略語） ───
  // ※ これはフォールバック。既知の語は上で個別定義する
  // （現時点では無効化。誤変換リスクがあるため必要な都度個別追加）
];

/**
 * テキストをVOICEVOX向けに正規化する
 * @param text 元のセリフテキスト
 * @returns 発音しやすいカタカナ読みに変換したテキスト
 */
export function normalizeForVoicevox(text: string): string {
  let normalized = text;
  for (const rule of REPLACEMENT_RULES) {
    normalized = normalized.replace(rule.pattern, rule.replacement);
  }
  return normalized;
}

/**
 * デバッグ用: どのルールが何回適用されたか返す
 */
export function debugNormalize(text: string): { original: string; normalized: string; applied: string[] } {
  let normalized = text;
  const applied: string[] = [];
  for (const rule of REPLACEMENT_RULES) {
    const before = normalized;
    normalized = normalized.replace(rule.pattern, rule.replacement);
    if (normalized !== before) {
      applied.push(`${rule.description}: "${before}" → "${normalized}"`);
    }
  }
  return { original: text, normalized, applied };
}
