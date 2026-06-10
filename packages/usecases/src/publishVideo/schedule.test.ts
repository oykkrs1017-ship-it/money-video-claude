/**
 * nextScheduleTime のユニットテスト
 *
 * 基準: 次の「木曜 19:00 JST」(UTC+9) を ISO 8601 UTC で返す。
 * メモ: 2026-04-23 は木曜、2026-04-20 は月曜、2026-04-26 は日曜。
 */

import { describe, expect, it } from 'vitest';
import { SCHEDULE_DOW_JST, SCHEDULE_HOUR_JST, nextScheduleTime } from './schedule';

/** 日付文字列（yyyy-MM-dd）と JST 時を UTC ISO に変換するヘルパー */
function jstToUtcIso(dateStr: string, hourJst: number): string {
  const utcHour = hourJst - 9;
  const [year, month, day] = dateStr.split('-').map(Number);
  const d = new Date(Date.UTC(year!, month! - 1, day!, utcHour));
  return d.toISOString();
}

/** JST 時刻文字列 "yyyy-MM-dd HH:MM JST" → UTC ミリ秒 */
function jstMs(dateStr: string, hour: number, minute = 0): number {
  const [year, month, day] = dateStr.split('-').map(Number);
  return Date.UTC(year!, month! - 1, day!, hour - 9, minute);
}

describe('nextScheduleTime (毎週木曜 19:00 JST 固定)', () => {
  it('SCHEDULE_HOUR_JST は 19', () => {
    expect(SCHEDULE_HOUR_JST).toBe(19);
  });

  it('SCHEDULE_DOW_JST は 4（木曜）', () => {
    expect(SCHEDULE_DOW_JST).toBe(4);
  });

  it('月曜 10:00 JST の場合、同週の木曜 19:00 JST を返す', () => {
    const now = jstMs('2026-04-20', 10, 0); // 月曜
    const result = nextScheduleTime(now);
    expect(result).toBe(jstToUtcIso('2026-04-23', 19));
  });

  it('木曜 18:59 JST の場合、当日（木曜）19:00 JST を返す', () => {
    const now = jstMs('2026-04-23', 18, 59); // 木曜
    const result = nextScheduleTime(now);
    expect(result).toBe(jstToUtcIso('2026-04-23', 19));
  });

  it('木曜 19:00 JST ちょうどは「すでに過ぎた」扱いで翌週木曜を返す', () => {
    const now = jstMs('2026-04-23', 19, 0); // 木曜
    const result = nextScheduleTime(now);
    expect(result).toBe(jstToUtcIso('2026-04-30', 19));
  });

  it('木曜 19:01 JST の場合、翌週木曜 19:00 JST を返す', () => {
    const now = jstMs('2026-04-23', 19, 1); // 木曜
    const result = nextScheduleTime(now);
    expect(result).toBe(jstToUtcIso('2026-04-30', 19));
  });

  it('金曜 0:00 JST の場合、翌週木曜 19:00 JST を返す', () => {
    const now = jstMs('2026-04-24', 0, 0); // 金曜
    const result = nextScheduleTime(now);
    expect(result).toBe(jstToUtcIso('2026-04-30', 19));
  });

  it('日曜 10:00 JST の場合、次の木曜 19:00 JST を返す', () => {
    const now = jstMs('2026-04-26', 10, 0); // 日曜
    const result = nextScheduleTime(now);
    expect(result).toBe(jstToUtcIso('2026-04-30', 19));
  });

  it('返値は ISO 8601 形式（Z 末尾）', () => {
    const result = nextScheduleTime(jstMs('2026-04-20', 10, 0));
    expect(result).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
  });

  it('秒・ミリ秒は 00.000 にリセットされる', () => {
    const result = nextScheduleTime(jstMs('2026-04-20', 10, 30));
    expect(result).toMatch(/T\d{2}:00:00\.000Z$/);
  });
});
