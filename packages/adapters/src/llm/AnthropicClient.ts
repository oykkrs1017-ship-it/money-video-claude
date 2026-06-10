/**
 * AnthropicClient: Anthropic Messages API を LlmClient port として wrap する
 *
 * usecases 側はこのクラスを直接 import せず、LlmClient interface（生成ユースケース側の
 * ports.ts で定義）を介して DI する。テストでは FakeLlmClient を使用。
 */

import Anthropic from '@anthropic-ai/sdk';
import { AdapterError } from '@money-video/shared-ts';

export interface AnthropicClientConfig {
  apiKey: string;
}

export interface LlmCompletionInput {
  system: string;
  user: string;
  model: string;
  maxTokens: number;
}

export interface LlmCompletionOutput {
  text: string;
  inputTokens: number;
  outputTokens: number;
  cacheReadTokens: number;
  cacheWriteTokens: number;
}

export class AnthropicClient {
  private readonly client: Anthropic;

  constructor(config: AnthropicClientConfig) {
    if (!config.apiKey) {
      throw new AdapterError('Anthropic API key is required', 'anthropic');
    }
    this.client = new Anthropic({ apiKey: config.apiKey });
  }

  /**
   * 単発の Messages API 呼び出し。
   * ツール使用・ストリーミングは必要になってから拡張する（現状 MVP）。
   */
  async complete(input: LlmCompletionInput): Promise<LlmCompletionOutput> {
    try {
      const stream = this.client.messages.stream({
        model: input.model,
        max_tokens: input.maxTokens,
        system: [{ type: 'text', text: input.system, cache_control: { type: 'ephemeral' } }],
        messages: [{ role: 'user', content: input.user }],
      });
      const message = await stream.finalMessage();

      const firstBlock = message.content[0];
      const text = firstBlock && firstBlock.type === 'text' ? firstBlock.text : '';

      return {
        text,
        inputTokens: message.usage.input_tokens,
        outputTokens: message.usage.output_tokens,
        cacheReadTokens: message.usage.cache_read_input_tokens ?? 0,
        cacheWriteTokens: message.usage.cache_creation_input_tokens ?? 0,
      };
    } catch (err) {
      if (err instanceof AdapterError) throw err;
      throw new AdapterError(
        `Anthropic messages.create failed: ${(err as Error).message}`,
        'anthropic',
        err,
      );
    }
  }
}
