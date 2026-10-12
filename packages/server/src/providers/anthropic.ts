import { z } from 'zod';
import { planningMessages } from './prompts';
import { readBoundedBody, type ModelProvider } from './provider';
const messageSchema = z.object({
  content: z.array(z.object({ type: z.string(), text: z.string().optional() })),
});
export function createAnthropicProvider(options: {
  apiKey: string;
  model: string;
  maxTokens?: number;
  fetch?: typeof fetch;
}): ModelProvider {
  if (!options.apiKey || !options.model)
    throw new Error('Server-side provider credentials and model are required');
  return {
    async generate(input, signal) {
      const messages = planningMessages(input);
      const response = await (options.fetch ?? fetch)(
        'https://api.anthropic.com/v1/messages',
        {
          method: 'POST',
          signal,
          headers: {
            'x-api-key': options.apiKey,
            'anthropic-version': '2023-06-01',
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: options.model,
            max_tokens: Math.min(options.maxTokens ?? 4096, 8192),
            system: messages[0]?.content,
            messages: messages.slice(1),
          }),
        },
      );
      if (!response.ok) {
        await response.body?.cancel();
        throw new Error('AI provider unavailable');
      }
      const result = messageSchema.parse(
        JSON.parse(await readBoundedBody(response, 128_000)),
      );
      const text = result.content
        .filter((block) => block.type === 'text')
        .map((block) => block.text ?? '')
        .join('');
      return JSON.parse(text) as unknown;
    },
  };
}
