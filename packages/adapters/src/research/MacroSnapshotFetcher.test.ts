/**
 * MacroSnapshotFetcher のユニットテスト（ネットワーク非依存・FetchJson 注入）
 */

import { describe, expect, it } from 'vitest';
import { MacroSnapshotFetcher } from './MacroSnapshotFetcher';

describe('MacroSnapshotFetcher', () => {
  it('Frankfurter レスポンスから USD/JPY・EUR/JPY をマップする', async () => {
    const fetcher = new MacroSnapshotFetcher(async (url) =>
      url.includes('base=USD')
        ? { amount: 1, base: 'USD', date: '2026-06-03', rates: { JPY: 159.86 } }
        : { amount: 1, base: 'EUR', date: '2026-06-03', rates: { JPY: 172.5 } },
    );

    const snapshot = await fetcher.fetchSnapshot();
    expect(snapshot).not.toBeNull();
    expect(snapshot?.fx.usd_jpy).toBe(159.86);
    expect(snapshot?.fx.eur_jpy).toBe(172.5);
    expect(snapshot?.as_of).toBe('2026-06-03');
    expect(snapshot?.source).toBe('ECB (Frankfurter)');
    expect(snapshot?.fetched_at).toBeTypeOf('string');
  });

  it('rates 欠落時は該当通貨を null にする', async () => {
    const fetcher = new MacroSnapshotFetcher(async (url) =>
      url.includes('base=USD')
        ? { date: '2026-06-03', rates: { JPY: 159.86 } }
        : { date: '2026-06-03' },
    );
    const snapshot = await fetcher.fetchSnapshot();
    expect(snapshot?.fx.usd_jpy).toBe(159.86);
    expect(snapshot?.fx.eur_jpy).toBeNull();
  });

  it('取得失敗時は null を返してリサーチを継続させる', async () => {
    const fetcher = new MacroSnapshotFetcher(async () => {
      throw new Error('HTTP 503');
    });
    expect(await fetcher.fetchSnapshot()).toBeNull();
  });
});
