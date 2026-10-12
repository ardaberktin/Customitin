import { z } from 'zod';
import { planningMessages } from './prompts';
import { readBoundedBody, type ModelProvider } from './provider';
const completionSchema = z.object({
  choices: z
    .array(z.object({ message: z.object({ content: z.string().nullable() }) }))
    .min(1),
});
/** Server-only adapter using the OpenAI REST protocol. No provider dependency reaches mobile. */
export function createOpenAIProvider(options: {
  apiKey: string;
  model: string;
  maxTokens?: number;
  fetch?: typeof fetch;
}): ModelProvider {
  if (!options.apiKey || !options.model)
    throw new Error('Server-side provider credentials and model are required');
  return {
    async generate(input, signal) {
      const response = await (options.fetch ?? fetch)(
        'https://api.openai.com/v1/chat/completions',
        {
          method: 'POST',
          signal,
          headers: {
            Authorization: `Bearer ${options.apiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: options.model,
            messages: planningMessages(input),
            response_format: { type: 'json_object' },
            max_completion_tokens: Math.min(options.maxTokens ?? 4096, 8192),
          }),
        },
      );
      if (!response.ok) {
        await response.body?.cancel();
        throw new Error('AI provider unavailable');
      }
      const result = completionSchema.parse(
        JSON.parse(await readBoundedBody(response, 128_000)),
      );
      const text = result.choices[0]?.message.content;
      if (!text) throw new Error('AI provider declined the request');
      return JSON.parse(text) as unknown;
    },
  };
}
