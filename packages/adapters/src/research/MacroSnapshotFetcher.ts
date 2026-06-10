/**
 * MacroSnapshotFetcher
 *
 * Frankfurter API（ECB 参照レート・APIキー不要）で為替の1次スナップショットを取得する。
 * USD/JPY・EUR/JPY を取得し、トピック提案の「独自試算」素地として使う
 * （Inauthentic Content Policy 対策の独自性に整合）。
 * 取得失敗時は null を返し、リサーチ全体は継続する。
 *
 * 注: api.frankfurter.app は api.frankfurter.dev へ 301 されるため .dev を直接叩く。
 */

import { createLogger } from '@money-video/shared-ts';
import { httpGetJson, type FetchJson } from './httpGetJson';
import type { MacroSnapshot } from './types';

const logger = createLogger({ name: 'MacroSnapshotFetcher', level: 'info' });

const FRANKFURTER_ENDPOINT = 'https://api.frankfurter.dev/v1/latest';

/** MacroFetcher port との shape 互換を保つ */
export interface MacroFetcher {
  fetchSnapshot(): Promise<MacroSnapshot | null>;
}

interface FrankfurterResponse {
  amount?: number;
  base?: string;
  date?: string;
  rates?: Record<string, number>;
}

export class MacroSnapshotFetcher implements MacroFetcher {
  private readonly fetchJson: FetchJson;

  constructor(fetchJson: FetchJson = (url) => httpGetJson(url)) {
    this.fetchJson = fetchJson;
  }

  async fetchSnapshot(): Promise<MacroSnapshot | null> {
    try {
      const [usdRaw, eurRaw] = await Promise.all([
        this.fetchJson(`${FRANKFURTER_ENDPOINT}?base=USD&symbols=JPY`),
        this.fetchJson(`${FRANKFURTER_ENDPOINT}?base=EUR&symbols=JPY`),
      ]);
      const usd = usdRaw as FrankfurterResponse;
      const eur = eurRaw as FrankfurterResponse;

      const snapshot: MacroSnapshot = {
        fetched_at: new Date().toISOString(),
        source: 'ECB (Frankfurter)',
        as_of: usd.date ?? eur.date ?? null,
        fx: {
          usd_jpy: usd.rates?.['JPY'] ?? null,
          eur_jpy: eur.rates?.['JPY'] ?? null,
        },
      };
      logger.info(
        { usd_jpy: snapshot.fx.usd_jpy, eur_jpy: snapshot.fx.eur_jpy, as_of: snapshot.as_of },
        'マクロスナップショット取得完了',
      );
      return snapshot;
    } catch (err) {
      logger.warn(
        { err: err instanceof Error ? err.message : String(err) },
        'マクロスナップショット取得失敗 — スキップ',
      );
      return null;
    }
  }
}
