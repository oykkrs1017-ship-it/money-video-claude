/**
 * YouTube スケジュール投稿の公開予定時刻を算出する（純粋関数）
 *
 * 原典: scripts/upload-youtube.ts:nextScheduleTime
 * ルール: 次の「木曜 19:00 JST」(JST = UTC+9) を ISO 8601 UTC 文字列で返す。
 *         同じ曜日・同じ時刻に投稿することでアルゴリズムに予測可能なリズムを与え、
 *         通知・常連視聴者による初動ブーストを狙う。
 *
 *         - 木曜 19:00 JST 前なら当週の木曜
 *         - 木曜 19:00 JST ちょうど〜過ぎていれば翌週の木曜
 */

/** JST オフセット ms（UTC+9） */
const JST_OFFSET_MS = 9 * 60 * 60 * 1000;
/** スケジュール投稿の時刻（JST 時） */
export const SCHEDULE_HOUR_JST = 19;
/** スケジュール投稿の曜日（JS Date の getUTCDay: 0=日, 1=月, ..., 4=木, ..., 6=土） */
export const SCHEDULE_DOW_JST = 4; // 木曜

/**
 * 基準時刻（`now`）から見た「次の木曜 19:00 JST」を UTC ISO 文字列で返す。
 * テスト時に `now` を差し込めるように引数化している。
 *
 * @param now - 現在時刻（省略時は Date.now()）
 */
export function nextScheduleTime(now: number = Date.now()): string {
  const jstNow = new Date(now + JST_OFFSET_MS);

  // 当日の 19:00 JST を UTC-base Date として構築
  const target = new Date(jstNow);
  target.setUTCHours(SCHEDULE_HOUR_JST, 0, 0, 0);

  // 今日〜6日先で、かつ jstNow より未来の最も近い木曜 19:00 JST を探す
  const currentDow = target.getUTCDay();
  let daysAhead = (SCHEDULE_DOW_JST - currentDow + 7) % 7;
  if (daysAhead === 0 && jstNow >= target) {
    // 今日が木曜で、すでに 19:00 を過ぎている → 翌週木曜
    daysAhead = 7;
  }
  target.setUTCDate(target.getUTCDate() + daysAhead);

  // target は JST 相対で作ったので UTC に戻す
  return new Date(target.getTime() - JST_OFFSET_MS).toISOString();
}
