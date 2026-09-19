import { NextResponse } from 'next/server';

export const runtime = 'edge';

const OPENROUTER_API_KEY = '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';

async function testModel(model: string) {
  try {
    const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        messages: [{ role: 'user', content: 'test' }],
      })
    });
    return { model, status: res.status, body: await res.text() };
  } catch (e: any) {
    return { model, error: e.message };
  }
}

export async function GET() {
  const results = await Promise.all([
    testModel('meta-llama/llama-3.3-70b-instruct:free'),
    testModel('google/gemma-2-9b-it:free'),
    testModel('openrouter/free'),
  ]);
  return NextResponse.json(results);
}
