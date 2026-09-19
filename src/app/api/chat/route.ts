import { NextRequest, NextResponse } from 'next/server';

const OPENROUTER_API_KEY = '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';

// Fallback model chain: use openrouter/free as the reliable free pool
const MODEL_CHAIN = [
  'meta-llama/llama-3.3-70b-instruct:free',  // Powerful but can be rate limited
  'openrouter/free',                         // Safest fallback, auto-selects available free model
];

// Edge runtime for reliable streaming on Netlify
export const runtime = 'edge';

// Timeout helper: abort a fetch if it takes too long to get an OK response
function fetchWithTimeout(url: string, options: RequestInit, timeoutMs: number): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  return fetch(url, { ...options, signal: controller.signal }).finally(() => clearTimeout(timer));
}

async function tryModel(model: string, apiMessages: any[], stream: boolean): Promise<{ response: Response | null; error?: string }> {
  try {
    console.log(`[AI Chat] Trying model: ${model} (stream=${stream})`);
    const response = await fetchWithTimeout(
      'https://openrouter.ai/api/v1/chat/completions',
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': 'https://lwai.netlify.app',
          'X-Title': 'Bangla Education - Learn With AI',
        },
        body: JSON.stringify({
          model,
          messages: apiMessages,
          stream,
        }),
      },
      8000 // 8 second timeout per model — well within Netlify's limits
    );

    if (response.ok) {
      console.log(`[AI Chat] Model ${model} responded OK`);
      return { response };
    }

    const errorText = await response.text();
    console.error(`[AI Chat] Model ${model} failed (${response.status}): ${errorText}`);
    return { response: null, error: `${model}: ${response.status}` };
  } catch (err: any) {
    const msg = err.name === 'AbortError' ? 'timeout' : err.message;
    console.error(`[AI Chat] Model ${model} error: ${msg}`);
    return { response: null, error: `${model}: ${msg}` };
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { messages, questionContext, selectedText } = body;

    let systemPrompt = `You are "শিক্ষা AI" (Shikkha AI), an expert educational tutor for Bangladeshi students.
You were created and developed SOLELY by "Learn With AI" (LWAI). 
CRITICAL IDENTITY INSTRUCTION: If any user asks "who created you", "who made you", "আপনাকে কে তৈরি করেছে?", "তোমার স্রষ্টা কে?", or ANY question about your origins, YOU MUST ALWAYS reply that you were created by "Learn With AI" (LWAI). DO NOT mention Muktijuddho.com, MUG, OpenAI, Meta, Google, or any other organization. Your absolute and only creator is Learn With AI.

You have deep knowledge of the educational curriculum (SSC, HSC) and can explain concepts clearly.

CRITICAL FORMATTING RULES:
1. If the student writes in Bengali, reply in Bengali. If in English, reply in English.
2. For ALL math expressions, you MUST use dollar-sign LaTeX delimiters ONLY:
   - Inline math: $...$  (example: $x^2 + y^2 = r^2$)
   - Block/display math: $$...$$ (example: $$\\\\int_0^1 x\\\\,dx = \\\\frac{1}{2}$$)
3. NEVER use \\\\( \\\\) or \\\\[ \\\\] delimiters.
4. Be encouraging, patient, and clear.
5. Use simple examples and step-by-step breakdowns.
6. Keep answers concise but thorough.`;

    if (questionContext) {
      systemPrompt += `\n\n--- CURRENT QUESTION CONTEXT ---
Question: ${questionContext.text || 'N/A'}
Subject: ${questionContext.subject || 'N/A'}
Chapter: ${questionContext.chapter || 'N/A'}
Board: ${questionContext.board || 'N/A'}
Year: ${questionContext.year || 'N/A'}
Type: ${questionContext.type || 'N/A'}`;

      if (questionContext.explanation) {
        systemPrompt += `\nExplanation: ${questionContext.explanation}`;
      }
      if (questionContext.options) {
        systemPrompt += `\nOptions: ${questionContext.options.map((o: string, i: number) => `${i + 1}. ${o}`).join('\n')}`;
      }
      if (questionContext.correctAnswerIndex !== undefined) {
        systemPrompt += `\nCorrect Answer Index: ${questionContext.correctAnswerIndex}`;
      }
    }

    if (selectedText) {
      systemPrompt += `\n\n--- USER SELECTED THIS TEXT ---
"${selectedText}"
Explain it clearly, step by step, using $...$ for math.`;
    }

    const apiMessages = [
      { role: 'system', content: systemPrompt },
      ...messages.map((m: any) => ({ role: m.role, content: m.content })),
    ];

    // --- Strategy: Try streaming first with fast models, fall back to non-streaming ---
    let response: Response | null = null;
    const errors: string[] = [];

    // Try streaming with the two fastest models (8s timeout each)
    for (const model of MODEL_CHAIN.slice(0, 2)) {
      const result = await tryModel(model, apiMessages, true);
      if (result.response) {
        response = result.response;
        break;
      }
      if (result.error) errors.push(result.error);
    }

    // If streaming failed, try non-streaming (JSON) response as fallback
    if (!response) {
      console.log('[AI Chat] Streaming failed, trying non-streaming fallback...');
      for (const model of MODEL_CHAIN) {
        const result = await tryModel(model, apiMessages, false);
        if (result.response) {
          // Non-streaming: read parsed JSON and return as a single SSE message
          try {
            const json = await result.response.json();
            const content = json.choices?.[0]?.message?.content || '';
            if (content) {
              const encoder = new TextEncoder();
              const ssePayload = `data: ${JSON.stringify({ content })}\n\ndata: [DONE]\n\n`;
              return new Response(encoder.encode(ssePayload), {
                headers: {
                  'Content-Type': 'text/event-stream',
                  'Cache-Control': 'no-cache, no-store, must-revalidate',
                },
              });
            }
          } catch (e) {
            errors.push(`${model}: json parse failed`);
          }
          continue;
        }
        if (result.error) errors.push(result.error);
      }
    }

    if (!response) {
      console.error('[AI Chat] All models failed:', errors);
      return new Response(
        JSON.stringify({ error: `সকল AI মডেল বর্তমানে অনুপলব্ধ। কিছুক্ষণ পর আবার চেষ্টা করুন। (${errors.join(', ')})` }),
        { status: 503, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Stream the response (we got a successful streaming response)
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        const reader = response!.body?.getReader();
        if (!reader) {
          controller.enqueue(encoder.encode('data: [DONE]\n\n'));
          controller.close();
          return;
        }

        const decoder = new TextDecoder();
        let buffer = '';

        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split('\n');
            buffer = lines.pop() || '';

            for (const line of lines) {
              const trimmed = line.trim();
              if (!trimmed || !trimmed.startsWith('data: ')) continue;
              const data = trimmed.slice(6);
              if (data === '[DONE]') continue;

              try {
                const parsed = JSON.parse(data);
                const content = parsed.choices?.[0]?.delta?.content;
                if (content) {
                  controller.enqueue(encoder.encode(`data: ${JSON.stringify({ content })}\n\n`));
                }
              } catch {
                // skip malformed data
              }
            }
          }
        } catch (err) {
          console.error('[AI Chat] Stream error:', err);
        } finally {
          controller.enqueue(encoder.encode('data: [DONE]\n\n'));
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
      },
    });
  } catch (error: any) {
    console.error('[AI Chat] API error:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
