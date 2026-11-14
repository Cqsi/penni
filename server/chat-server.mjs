// Tiny local server that keeps the OpenAI key off the phone.
// Run with: npm run server   (reads OPENAI_API_KEY and OPENAI_MODEL from .env)
import { createServer } from 'node:http';

const PORT = Number(process.env.PORT ?? 8787);
const MODEL = process.env.OPENAI_MODEL || 'gpt-4.1-mini';
const KEY = process.env.OPENAI_API_KEY;

if (!KEY) {
  console.error('Missing OPENAI_API_KEY. Copy .env.example to .env and add your key.');
  process.exit(1);
}

function systemPrompt({ botName, botRole, context }) {
  return [
    `You are ${botName}, a friendly money coach inside S-Bank's mobile app. Your style: ${botRole}`,
    'You help young adults understand their own spending. Explain things in plain, warm language, no jargon.',
    'Use the "three baskets": Must-haves (regular bills: rent, utilities, groceries), Surprises (needed but unplanned: dentist, broken phone), Little leaks (small optional buys that add up: coffee, takeaway, fun).',
    'Answer in 1–3 short sentences, like a chat message. Use the user’s real numbers from the data below. Use € and round to whole euros.',
    'If the data does not contain the answer, say so briefly and suggest what you can tell them instead. Never invent transactions.',
    'You are not a licensed financial advisor: do not recommend specific investments or products.',
    '',
    'USER DATA:',
    context,
  ].join('\n');
}

async function askOpenAI(body) {
  const messages = [
    { role: 'system', content: systemPrompt(body) },
    ...body.messages.slice(-12).map((m) => ({ role: m.from === 'me' ? 'user' : 'assistant', content: m.text })),
  ];
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${KEY}` },
    body: JSON.stringify({ model: MODEL, messages, max_tokens: 220, temperature: 0.6 }),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json?.error?.message ?? `OpenAI error ${res.status}`);
  return json.choices?.[0]?.message?.content?.trim() ?? '';
}

const TRANSCRIBE_MODEL = process.env.OPENAI_TRANSCRIBE_MODEL || 'gpt-4o-mini-transcribe';

/** Voice → text. The app sends the recording as base64; we forward it to OpenAI as a file. */
async function transcribe({ audio, mime = 'audio/m4a', name = 'voice.m4a' }) {
  const form = new FormData();
  form.append('file', new Blob([Buffer.from(audio, 'base64')], { type: mime }), name);
  form.append('model', TRANSCRIBE_MODEL);
  form.append('prompt', 'A young person asking their bank app about money: spending, saving, budget, euros, baskets.');
  const res = await fetch('https://api.openai.com/v1/audio/transcriptions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${KEY}` },
    body: form,
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json?.error?.message ?? `OpenAI error ${res.status}`);
  return (json.text ?? '').trim();
}

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

createServer(async (req, res) => {
  if (req.method === 'OPTIONS') return res.writeHead(204, cors).end();
  if (req.method !== 'POST' || (req.url !== '/chat' && req.url !== '/transcribe')) return res.writeHead(404, cors).end();

  let raw = '';
  for await (const chunk of req) raw += chunk;
  const json = (status, data) => res.writeHead(status, { ...cors, 'Content-Type': 'application/json' }).end(JSON.stringify(data));

  if (req.url === '/transcribe') {
    try {
      const started = Date.now();
      const text = await transcribe(JSON.parse(raw));
      console.log(`[${TRANSCRIBE_MODEL}] ${Date.now() - started}ms  "${text}"`);
      return json(200, { text });
    } catch (err) {
      console.error('Transcribe failed:', err.message);
      return json(502, { error: err.message });
    }
  }

  try {
    const body = JSON.parse(raw);
    const started = Date.now();
    const reply = await askOpenAI(body);
    console.log(`[${MODEL}] ${Date.now() - started}ms  Q: ${body.messages.at(-1)?.text}`);
    res.writeHead(200, { ...cors, 'Content-Type': 'application/json' }).end(JSON.stringify({ reply }));
  } catch (err) {
    console.error('Chat failed:', err.message);
    res.writeHead(502, { ...cors, 'Content-Type': 'application/json' }).end(JSON.stringify({ error: err.message }));
  }
}).listen(PORT, '0.0.0.0', () => {
  console.log(`Coach server on http://0.0.0.0:${PORT}/chat using ${MODEL}`);
});
