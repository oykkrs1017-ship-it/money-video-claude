/**
 * vttParser
 *
 * VTT (WebVTT) 字幕ファイルから冒頭テキストを抽出する純粋関数。
 * YouTube 自動生成字幕の VTT 形式に対応。
 */

/**
 * VTT コンテンツの冒頭 `seconds` 秒分のテキストを抽出する。
 * HTML タグを除去し、重複行を排除して結合する。
 *
 * @param vttContent - VTT ファイルの文字列全体
 * @param seconds    - 冒頭から何秒分を抽出するか（デフォルト 15 秒）
 * @returns 300 文字以内のテキスト
 */
export function extractOpeningText(vttContent: string, seconds = 15): string {
  const lines = vttContent.split('\n');
  const texts: string[] = [];
  let capturing = false;
  let currentTime = 0;

  for (const line of lines) {
    // タイムスタンプ行: 00:00:00.000 --> 00:00:05.000
    const timeMatch = line.match(/^(\d{2}):(\d{2}):(\d{2})\.\d+ -->/);
    if (timeMatch) {
      const h = parseInt(timeMatch[1]!, 10);
      const m = parseInt(timeMatch[2]!, 10);
      const s = parseInt(timeMatch[3]!, 10);
      currentTime = h * 3600 + m * 60 + s;
      capturing = currentTime <= seconds;
      continue;
    }

    // テキスト行（WEBVTT ヘッダーと純数字インデックス行を除く）
    if (capturing && line.trim() && !line.startsWith('WEBVTT') && !/^\d+$/.test(line)) {
      // HTML タグ除去
      const clean = line.replace(/<[^>]+>/g, '').trim();
      if (clean) texts.push(clean);
    }
  }

  // 重複行除去して結合
  return [...new Set(texts)].join(' ').slice(0, 300);
}
