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

const VOICE_RULES = [
  'You are on a live voice call. Talk like a friend on the phone: 1–2 short sentences, under 35 words.',
  'No lists, symbols, emojis or markdown. Say amounts naturally, like "about 140 euros". End with a short question now and then to keep the chat going.',
].join('\n');

function systemPrompt({ botName, botRole, context, voice }) {
  return [
    ...(voice ? [VOICE_RULES] : []),
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
    body: JSON.stringify({ model: MODEL, messages, max_tokens: body.voice ? 120 : 220, temperature: 0.6 }),
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

const RECEIPT_MODEL = process.env.OPENAI_RECEIPT_MODEL || MODEL;

const RECEIPT_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['isReceipt', 'store', 'date', 'total', 'items'],
  properties: {
    isReceipt: { type: 'boolean', description: 'false if the photo is not a readable shop receipt' },
    store: { type: 'string', description: 'Shop name as printed, nicely capitalised, e.g. "S-Market Lauttasaari"' },
    date: { type: 'string', description: 'Purchase date as YYYY-MM-DD, or "" if not visible' },
    total: { type: 'number', description: 'The final total paid, in euros (e.g. YHTEENSÄ / TOTAL)' },
    items: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['name', 'nameEn', 'price', 'basket'],
        properties: {
          name: { type: 'string', description: 'Item name as printed on the receipt' },
          nameEn: { type: 'string', description: 'Short, plain English name, 1–3 words, e.g. "Oat drink", "Eggs", "Vanilla custard"' },
          price: { type: 'number', description: 'Final line price in euros after quantity and discounts' },
          basket: { type: 'string', enum: ['must', 'surprise', 'leak'] },
        },
      },
    },
  },
};

const RECEIPT_PROMPT = [
  'You read photos of shop receipts (often Finnish) for a young person’s money app.',
  'Extract every purchased line item with its final price: the amount at the right end of the item’s line.',
  'Lines like "2 KPL 0,95 €/KPL" or "0,705 KG 3,29 €/KG" are only details of the item above (unit price × quantity). They are NOT items: never list them, and never use the unit price as a price.',
  'The item prices must add up to the printed total (YHTEENSÄ). Check this before answering.',
  'Discounts or deposits (ALENNUS, PANTTI) adjust the item they belong to. Ignore payment, card, VAT (ALV) and footer lines. Never output card numbers or codes.',
  'Sort each item into a basket:',
  '- must: everyday needs such as regular food and groceries, hygiene, cleaning, medicine you always buy, transport tickets.',
  '- surprise: needed but unplanned, such as pharmacy for an illness, a repair, a replacement charger.',
  '- leak: optional treats that add up, such as sweets, snacks, cookies, soft and energy drinks, alcohol, takeaway, plastic bags, impulse buys.',
  'Prices use a decimal comma on Finnish receipts: 2,55 means 2.55. Expand Finnish abbreviations when translating (VAN.VALMISTE = vanilla custard).',
].join('\n');

/** Receipt photo → items sorted into the three baskets. Retries once if the items don't add up to the total. */
async function readReceipt({ image, mime = 'image/jpeg' }) {
  const messages = [
    { role: 'system', content: RECEIPT_PROMPT },
    {
      role: 'user',
      content: [
        { type: 'text', text: 'Read this receipt.' },
        { type: 'image_url', image_url: { url: `data:${mime};base64,${image}`, detail: 'high' } },
      ],
    },
  ];
  let best;
  for (let attempt = 0; attempt < 2; attempt++) {
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${KEY}` },
      body: JSON.stringify({
        model: RECEIPT_MODEL,
        temperature: 0,
        response_format: { type: 'json_schema', json_schema: { name: 'receipt', strict: true, schema: RECEIPT_SCHEMA } },
        messages,
      }),
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json?.error?.message ?? `OpenAI error ${res.status}`);
    const content = json.choices[0].message.content;
    const r = JSON.parse(content);
    const sum = Math.round(r.items.reduce((a, i) => a + i.price, 0) * 100) / 100;
    const result = { ...r, sum, adds: Math.abs(sum - r.total) < 0.02 };
    if (!best || Math.abs(result.sum - result.total) < Math.abs(best.sum - best.total)) best = result;
    if (result.adds || !r.isReceipt) break;
    messages.push(
      { role: 'assistant', content },
      { role: 'user', content: `Your items add up to €${sum.toFixed(2)}, but the receipt total is €${r.total.toFixed(2)}. Look at every line again (quantity/weight detail lines are not items) and fix it.` },
    );
  }
  return best;
}

// Voice replies: each bot speaks with its own ElevenLabs voice.
const ELEVEN_KEY = process.env.ELEVENLABS_API_KEY;
const VOICES = {
  pyra: 'FGY2WhTYpPnrIDTdsKH5', // Laura: quick, quirky
  cubo: 'bIHbv24MWmeRgasZH58o', // Will: relaxed, steady
  pera: 'cgSgspJ2msm6clMCkdW9', // Jessica: playful, warm
};
const DEFAULT_VOICE = VOICES.pera;

/** Text → speech, streamed straight through to the phone so playback starts right away. */
async function speak(res, { text, bot }) {
  const voice = VOICES[bot] ?? DEFAULT_VOICE;
  const r = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voice}/stream?output_format=mp3_44100_64`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'xi-api-key': ELEVEN_KEY },
    body: JSON.stringify({ text: text.slice(0, 600), model_id: 'eleven_flash_v2_5' }),
  });
  if (!r.ok) throw new Error(`ElevenLabs ${r.status}: ${(await r.text()).slice(0, 200)}`);
  res.writeHead(200, { ...cors, 'Content-Type': 'audio/mpeg', 'Cache-Control': 'no-store' });
  for await (const chunk of r.body) res.write(chunk);
  res.end();
}

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

createServer(async (req, res) => {
  if (req.method === 'OPTIONS') return res.writeHead(204, cors).end();

  // GET /speak?bot=pyra&text=... returns an mp3 the app can play directly from the URL.
  if (req.method === 'GET' && req.url.startsWith('/speak')) {
    const q = new URL(req.url, 'http://x').searchParams;
    if (!ELEVEN_KEY) return res.writeHead(503, cors).end('No ELEVENLABS_API_KEY');
    try {
      const started = Date.now();
      await speak(res, { text: q.get('text') ?? '', bot: q.get('bot') });
      console.log(`[elevenlabs] ${Date.now() - started}ms  ${q.get('bot')}: "${(q.get('text') ?? '').slice(0, 60)}"`);
    } catch (err) {
      console.error('Speak failed:', err.message);
      if (!res.headersSent) res.writeHead(502, cors);
      res.end();
    }
    return;
  }
  if (req.method !== 'POST' || !['/chat', '/transcribe', '/receipt'].includes(req.url)) return res.writeHead(404, cors).end();

  let raw = '';
  for await (const chunk of req) raw += chunk;
  const json = (status, data) => res.writeHead(status, { ...cors, 'Content-Type': 'application/json' }).end(JSON.stringify(data));

  if (req.url === '/receipt') {
    try {
      const started = Date.now();
      const r = await readReceipt(JSON.parse(raw));
      console.log(`[${RECEIPT_MODEL}] ${Date.now() - started}ms  receipt ${r.store} €${r.total} (${r.items.length} items, adds up: ${r.adds})`);
      return json(200, r);
    } catch (err) {
      console.error('Receipt failed:', err.message);
      return json(502, { error: err.message });
    }
  }

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
