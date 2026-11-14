import { serverUrl } from './coach';

export type BasketKey = 'must' | 'surprise' | 'leak';
export type ReceiptItem = { name: string; nameEn: string; price: number; basket: BasketKey };
export type Receipt = {
  isReceipt: boolean;
  store: string;
  date: string; // YYYY-MM-DD or ''
  total: number;
  items: ReceiptItem[];
  sum: number; // items added up
  adds: boolean; // items match the printed total
};

export const BASKETS: { key: BasketKey; name: string }[] = [
  { key: 'must', name: 'Must-haves' },
  { key: 'surprise', name: 'Surprises' },
  { key: 'leak', name: 'Little leaks' },
];

export const eur2 = (n: number) => `€${n.toFixed(2)}`;

/** Send a photo (base64 JPEG) to the server. It reads the receipt with OpenAI vision. */
export async function scanReceipt(image: string, mime = 'image/jpeg'): Promise<Receipt> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 40000);
  try {
    const res = await fetch(serverUrl().replace(/\/chat$/, '/receipt'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ image, mime }),
      signal: controller.signal,
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error ?? 'Could not read the receipt');
    return json as Receipt;
  } finally {
    clearTimeout(timer);
  }
}

/** € per basket on one receipt. */
export const basketTotals = (r: Receipt) =>
  Object.fromEntries(BASKETS.map((b) => [b.key, r.items.filter((i) => i.basket === b.key).reduce((a, i) => a + i.price, 0)])) as Record<BasketKey, number>;

/** What the bot says about a receipt. Built from the data so the numbers are always right. */
export function receiptLine(r: Receipt) {
  const leaks = r.items.filter((i) => i.basket === 'leak').sort((a, b) => b.price - a.price);
  const surprise = r.items.find((i) => i.basket === 'surprise');
  if (surprise) return `${surprise.nameEn} (${eur2(surprise.price)}) was a surprise. Good thing it’s sorted!`;
  if (!leaks.length) return 'All must-haves. Not a single little leak on this one!';
  const big = leaks[0];
  const others = leaks.length - 1;
  return `${big.nameEn} (${eur2(big.price)}) is your little leak here${others ? `, plus ${others} more` : ''}. The rest is everyday stuff.`;
}

// The receipt being shown on the result screen (scan → result).
let pending: Receipt | null = null;
export const setPendingReceipt = (r: Receipt) => {
  pending = r;
};
export const getPendingReceipt = () => pending;
