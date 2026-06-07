/**
 * VOICEVOX 向けテキスト正規化（純粋関数）
 *
 * VOICEVOX は英数字の単位記号をそのまま読み上げると誤読することが多いため、
 * ナレーション原稿に対して安全側の置換を行う。
 *
 * 規約:
 *   - 誤読パターンを見つけたらこのファイルと script 生成プロンプトの両方に追記する
 *   - 長い単位（km/nm）を短い単位（m）より先に処理する
 *   - 数字付き略語（S&P500等）は他のルールより先に処理する
 *   - 半角/全角の揺れは正規表現側で吸収する
 */

export interface NormalizerRule {
  /** ルール名（デバッグ・テスト用） */
  name: string;
  pattern: RegExp;
  replacement: string;
}

/** デフォルトの置換ルール（順序依存） */
export const DEFAULT_RULES: ReadonlyArray<NormalizerRule> = [
  // ─── 数字付き略語（先に処理） ───
  { name: 's_and_p_500', pattern: /S&P\s*500/gi, replacement: 'エスアンドピー500' },
  { name: 's_and_p',     pattern: /S&P/gi,       replacement: 'エスアンドピー' },

  // ─── 金融・投資用語 ───
  { name: 'nisa',   pattern: /NISA/gi,   replacement: 'ニーサ' },
  { name: 'ideco',  pattern: /iDeCo/gi,  replacement: 'イデコ' },
  { name: 'etf',    pattern: /ETF/gi,    replacement: 'イーティーエフ' },
  { name: 'reit',   pattern: /REIT/gi,   replacement: 'リート' },
  { name: 'fx',     pattern: /\bFX\b/gi, replacement: 'エフエックス' },
  { name: 'ipo',    pattern: /\bIPO\b/gi, replacement: 'アイピーオー' },
  { name: 'per',    pattern: /\bPER\b/gi, replacement: 'ピーイーアール' },
  { name: 'pbr',    pattern: /\bPBR\b/gi, replacement: 'ピービーアール' },
  { name: 'roe',    pattern: /\bROE\b/gi, replacement: 'アールオーイー' },
  { name: 'roa',    pattern: /\bROA\b/gi, replacement: 'アールオーエー' },
  { name: 'gdp',    pattern: /\bGDP\b/gi, replacement: 'ジーディーピー' },
  { name: 'cpi',    pattern: /\bCPI\b/gi, replacement: 'シーピーアイ' },
  { name: 'boj',    pattern: /\bBOJ\b/gi, replacement: 'ビーオージェイ' },
  { name: 'frb',    pattern: /\bFRB\b/gi, replacement: 'エフアールビー' },
  { name: 'ecb',    pattern: /\bECB\b/gi, replacement: 'イーシービー' },
  { name: 'bps',    pattern: /\bBPS\b/gi, replacement: 'ビーピーエス' },
  { name: 'eps',    pattern: /\bEPS\b/gi, replacement: 'イーピーエス' },
  { name: 'topix',  pattern: /TOPIX/gi,   replacement: 'トピックス' },
  { name: 'emaxis', pattern: /eMAXIS/gi,  replacement: 'イーマクシス' },
  { name: 'sbi',    pattern: /\bSBI\b/gi, replacement: 'エスビーアイ' },

  // ─── テクノロジー用語 ───
  { name: 'ai',       pattern: /\bAI\b/g,      replacement: 'エーアイ' },
  { name: 'chatgpt',  pattern: /ChatGPT/gi,     replacement: 'チャットジーピーティー' },
  { name: 'gpt',      pattern: /\bGPT\b/gi,     replacement: 'ジーピーティー' },
  { name: 'llm',      pattern: /\bLLM\b/gi,     replacement: 'エルエルエム' },
  { name: 'api',      pattern: /\bAPI\b/gi,     replacement: 'エーピーアイ' },
  { name: 'sns',      pattern: /\bSNS\b/gi,     replacement: 'エスエヌエス' },
  { name: 'youtube',  pattern: /YouTube/gi,     replacement: 'ユーチューブ' },

  // ─── 単位・記号（順序依存: km/nm → m → % → $B → $T） ───
  { name: 'km',          pattern: /(\d+(?:\.\d+)?)km/g,            replacement: '$1キロメートル' },
  { name: 'nm',          pattern: /(\d+(?:\.\d+)?)nm/g,            replacement: '$1ナノメートル' },
  // m は km/nm 処理後に実行。直後が英字・ひらがなの場合は対象外（例: 'home' の 'm' を守る）
  { name: 'm',           pattern: /(\d+(?:\.\d+)?)m(?![a-zA-Zぁ-ん])/g, replacement: '$1メートル' },
  { name: 'pct',         pattern: /(\d+(?:\.\d+)?)\s*%/g,          replacement: '$1パーセント' },
  { name: 'usd_billion', pattern: /\$(\d+(?:\.\d+)?)[Bb]/g,        replacement: '$1億ドル' },
  { name: 'usd_trillion',pattern: /\$(\d+(?:\.\d+)?)[Tt]/g,        replacement: '$1兆ドル' },
];

/**
 * ナレーションテキストを VOICEVOX が正しく読める形に正規化する。
 *
 * @param text - 元テキスト
 * @param rules - 適用するルール（省略時はデフォルト）
 */
export function normalizeForVoicevox(
  text: string,
  rules: ReadonlyArray<NormalizerRule> = DEFAULT_RULES,
): string {
  let result = text;
  for (const rule of rules) {
    result = result.replace(rule.pattern, rule.replacement);
  }
  return result;
}
