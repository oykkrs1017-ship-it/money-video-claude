/**
 * ExaTopicResearcher
 *
 * 台本生成用のトピックリサーチを Exa API で行う。
 * 日本語クエリ + 英語クエリを並列実行し、全文テキストを含むマークダウンを返す。
 *
 * EXA_API_KEY 環境変数 or コンストラクタで API キーを渡す。
 */

import * as https from 'https';

export interface TopicResearchResult {
  markdown: string;
  sourceCount: number;
}

interface ExaTextContent {
  text?: string;
}

interface ExaSearchResult {
  title?: string;
  url?: string;
  publishedDate?: string;
  author?: string;
  text?: string;
}

interface ExaSearchResponse {
  results?: ExaSearchResult[];
}

interface ExaSearchRequest {
  query: string;
  num_results: number;
  type: string;
  use_autoprompt: boolean;
  contents: {
    text: ExaTextContent;
  };
}

export class ExaTopicResearcher {
  private readonly apiKey: string;

  constructor(apiKey?: string) {
    const key = apiKey ?? process.env['EXA_API_KEY'] ?? '';
    if (!key) throw new Error('EXA_API_KEY が設定されていません');
    this.apiKey = key;
  }

  async research(topic: string, epId: string): Promise<TopicResearchResult> {
    const [jpResults, enResults] = await Promise.all([
      this.searchWithContents(topic, 3),
      this.searchWithContents(`${topic} technology geopolitics investment analysis`, 3),
    ]);

    // URLで重複除去
    const seen = new Set<string>();
    const allResults: ExaSearchResult[] = [];
    for (const r of [...jpResults, ...enResults]) {
      if (r.url && !seen.has(r.url)) {
        seen.add(r.url);
        allResults.push(r);
      }
    }

    const markdown = this.buildMarkdown(topic, epId, allResults);
    return { markdown, sourceCount: allResults.length };
  }

  private searchWithContents(query: string, numResults: number): Promise<ExaSearchResult[]> {
    const body: ExaSearchRequest = {
      query,
      num_results: numResults,
      type: 'neural',
      use_autoprompt: true,
      contents: {
        text: { maxCharacters: 2000 } as ExaTextContent,
      },
    };

    return new Promise((resolve) => {
      const bodyStr = JSON.stringify(body);
      const req = https.request(
        {
          hostname: 'api.exa.ai',
          path: '/search',
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': this.apiKey,
            'Content-Length': Buffer.byteLength(bodyStr),
          },
        },
        (res) => {
          let data = '';
          res.on('data', (chunk: Buffer) => (data += chunk.toString()));
          res.on('end', () => {
            try {
              const json = JSON.parse(data) as ExaSearchResponse;
              resolve(json.results ?? []);
            } catch {
              resolve([]);
            }
          });
        },
      );
      req.on('error', () => resolve([]));
      req.write(bodyStr);
      req.end();
    });
  }

  private buildMarkdown(topic: string, epId: string, results: ExaSearchResult[]): string {
    const lines: string[] = [
      `# Exa リサーチ: ${topic} (${epId})`,
      `生成日時: ${new Date().toISOString()}`,
      `ソース数: ${results.length}`,
      '',
    ];

    for (const r of results) {
      lines.push(`## ${r.title ?? r.url ?? '（タイトルなし）'}`);
      if (r.url) lines.push(`URL: ${r.url}`);
      if (r.publishedDate) lines.push(`公開日: ${r.publishedDate.slice(0, 10)}`);
      if (r.author) lines.push(`著者: ${r.author}`);
      lines.push('');
      lines.push(r.text?.trim() ?? '（本文取得不可）');
      lines.push('');
      lines.push('---');
      lines.push('');
    }

    return lines.join('\n');
  }
}
