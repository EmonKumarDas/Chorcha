
'use server';
/**
 * @fileOverview AI flow to format math equations using OpenRouter models.
 *
 * - getOpenRouterModels - Fetches available models from OpenRouter.
 * - formatWithOpenRouter - Converts text to LaTeX/Markdown using a selected model.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY || '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';

export type OpenRouterModel = {
  id: string;
  name: string;
};

/**
 * Fetches the list of available models from OpenRouter.
 */
export async function getOpenRouterModels(): Promise<OpenRouterModel[]> {
  try {
    const response = await fetch('https://openrouter.ai/api/v1/models', {
      headers: {
        'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
        'HTTP-Referer': 'https://firebasestudio.app',
        'X-Title': 'Bangla Education Hub',
      },
      next: { revalidate: 3600 } // Cache for 1 hour
    });

    if (!response.ok) throw new Error('Failed to fetch OpenRouter models');

    const data = await response.json();
    return data.data.map((m: any) => ({
      id: m.id,
      name: m.name || m.id,
    }));
  } catch (error) {
    console.error('Error fetching OpenRouter models:', error);
    return [];
  }
}

const OpenRouterFormatInputSchema = z.object({
  text: z.string().describe('The raw text to format.'),
  modelId: z.string().describe('The OpenRouter model ID to use.'),
});

const OpenRouterFormatOutputSchema = z.object({
  formattedText: z.string(),
});

/**
 * Server Action wrapper for formatting text.
 * Ensures a plain serializable object is returned to the client.
 */
export async function formatWithOpenRouter(input: z.infer<typeof OpenRouterFormatInputSchema>) {
  try {
    const result = await openRouterFormatFlow(input);
    return { formattedText: result.formattedText };
  } catch (error: any) {
    console.error('formatWithOpenRouter Action Error:', error);
    throw new Error(error.message || 'Formatting failed');
  }
}

/**
 * Genkit flow to perform formatting via OpenRouter API.
 */
const openRouterFormatFlow = ai.defineFlow(
  {
    name: 'openRouterFormatFlow',
    inputSchema: OpenRouterFormatInputSchema,
    outputSchema: OpenRouterFormatOutputSchema,
  },
  async (input) => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 90000); // 90 second timeout for complex formatting

    try {
      const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': 'https://firebasestudio.app',
          'X-Title': 'Bangla Education Hub',
        },
        body: JSON.stringify({
          model: input.modelId,
          messages: [
            {
              role: 'system',
              content: `You are an expert in formatting educational content with LaTeX and Markdown.
              
              RULES:
              1. Remove duplicated text (e.g., if a formula appears twice in different encodings).
              2. Convert all math to LaTeX: use $...$ for inline and $$...$$ for blocks.
              3. Keep non-math text (like Bengali) exactly as it is.
              4. Use Markdown for structure (bold, lists).
              5. RETURN ONLY THE CLEANED CONTENT. NO CHAT OR EXPLANATIONS.`,
            },
            {
              role: 'user',
              content: input.text,
            },
          ],
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        let errorMessage = 'OpenRouter API error';
        try {
          const errData = await response.json();
          errorMessage = errData.error?.message || errorMessage;
        } catch (e) {
          const text = await response.text();
          errorMessage = text || errorMessage;
        }
        
        if (errorMessage.toLowerCase().includes('provider returned error')) {
          throw new Error('The AI provider is temporarily busy. Please wait a few seconds and try again.');
        }
        
        throw new Error(errorMessage);
      }

      const data = await response.json();
      const content = data.choices?.[0]?.message?.content;

      if (!content) throw new Error('No content returned from OpenRouter');

      return { formattedText: content.trim() };
    } catch (error: any) {
      if (error.name === 'AbortError') {
        throw new Error('The AI took too long to respond. Please try again with a shorter text or a faster model.');
      }
      throw error;
    }
  }
);
