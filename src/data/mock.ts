// Made-up user for the visual prototype. Category names match the S-Bank dataset
// (tx_junction_transactions.csv) so real data can replace this later.

export const user = { firstName: 'Aino', age: 24, city: 'Helsinki' };

export const week = {
  safeToSpend: 142,
  budget: 200,
  daysLeft: 4,
};

/** Spending per day last week (Mon–Sun). Sums to €200. */
export const lastWeek = { days: ['M', 'T', 'W', 'T', 'F', 'S', 'S'], amounts: [12, 34, 8, 22, 61, 48, 15] };

export type Basket = {
  id: 1 | 2 | 3;
  name: string;
  hint: string;
  examples: string;
  amount: number;
  categories: { name: string; amount: number }[];
};

export const month = 'October';
export const income = 2350;

export const baskets: Basket[] = [
  {
    id: 1,
    name: 'Must-haves',
    hint: 'Same every month',
    examples: 'Rent, bills, groceries',
    amount: 1183,
    categories: [
      { name: 'Housing', amount: 780 },
      { name: 'Groceries', amount: 310 },
      { name: 'Utilities', amount: 93 },
    ],
  },
  {
    id: 2,
    name: 'Surprises',
    hint: 'Needed, but unplanned',
    examples: 'Dentist, broken phone',
    amount: 214,
    categories: [
      { name: 'Health', amount: 85 },
      { name: 'Home & Tech', amount: 129 },
    ],
  },
  {
    id: 3,
    name: 'Little leaks',
    hint: 'Small stuff that adds up',
    examples: 'Coffee, takeaway, fun',
    amount: 398,
    categories: [
      { name: 'Restaurants', amount: 238 },
      { name: 'Lifestyle', amount: 96 },
      { name: 'Entertainment', amount: 64 },
    ],
  },
];

// Scripted replies until a real AI backend is connected.
export const suggestions = [
  'How much did I spend on coffee?',
  'Can I afford a €60 concert?',
  'What kind of spender am I?',
  'How could I save more?',
];

export function cannedReply(question: string): string {
  const q = question.toLowerCase();
  if (q.includes('must-have') || q.includes('must have'))
    return 'Must-haves are the bills you pay every month no matter what: rent, utilities, groceries. Yours were €1,183 in October, about half your income. That’s healthy.';
  if (q.includes('surprise'))
    return 'Surprises are things you need but can’t plan, like the dentist or a broken phone. You had €214 of them in October. Setting aside ~€100 a month keeps them from hurting.';
  if (q.includes('leak'))
    return 'Little leaks are small, optional buys that add up: coffee, takeaway, fun. Yours were €398 in October, mostly eating out (€238).';
  if (q.includes('coffee') || q.includes('kahvi'))
    return 'You spent €46 on coffee in October. That’s about 11 cups, mostly on weekday mornings.';
  if (q.includes('taxi') || q.includes('uber') || q.includes('bolt'))
    return 'Taxis cost you €38 last month, over 3 rides.';
  if (q.includes('spender') || q.includes('kind'))
    return 'You’re a weekend spender: 61% of your little leaks happen Friday to Sunday. Weekdays you’re pretty careful!';
  if (q.includes('save') || q.includes('säästä'))
    return 'Easiest win: cut eating out by 20%. That’s about €48 a month, or €571 a year. Want to try it in “What if”?';
  if (q.includes('afford') || q.includes('spend') || q.includes('concert'))
    return 'You have €142 safe to spend until Sunday, so a €60 concert fits. You’d still have €82 for the rest of the week.';
  return 'Good question! I’ll be able to answer that for real once I’m connected to your data.';
}

// ---------- What if ----------
export const leakCategories = [
  { key: 'all', label: 'All leaks', monthly: 398 },
  { key: 'Restaurants', label: 'Eating out', monthly: 238 },
  { key: 'Lifestyle', label: 'Shopping', monthly: 96 },
  { key: 'Entertainment', label: 'Fun', monthly: 64 },
] as const;

const EQUIVALENTS: [number, string][] = [
  [1200, 'a new laptop'],
  [800, 'a trip to Lisbon'],
  [450, 'a week of Interrail'],
  [250, 'a weekend in Tallinn'],
  [120, 'a festival ticket'],
  [50, 'a concert ticket'],
  [12, 'a cinema ticket'],
];

export function equivalentFor(yearly: number): string | null {
  const hit = EQUIVALENTS.find(([cost]) => yearly >= cost);
  return hit ? hit[1] : null;
}

// ---------- Sort it ----------
export type SortCard = {
  merchant: string;
  category: string;
  icon: string; // Ionicons name
  amount: number;
  date: string;
  basket: 1 | 2 | 3;
  why: string;
};

export const sortCards: SortCard[] = [
  { merchant: 'Rent · Kotikatu 5', category: 'Housing', icon: 'home-outline', amount: 780, date: '1 Oct', basket: 1, why: 'Same amount every month. A classic must-have.' },
  { merchant: 'Wolt', category: 'Restaurants', icon: 'bicycle-outline', amount: 18.9, date: '3 Oct', basket: 3, why: 'Food delivery is nice, but optional. Little leak.' },
  { merchant: 'Dentist', category: 'Health', icon: 'medkit-outline', amount: 85, date: '6 Oct', basket: 2, why: 'Needed, but you couldn’t plan the day. Surprise!' },
  { merchant: 'Prisma', category: 'Groceries', icon: 'cart-outline', amount: 42.3, date: '7 Oct', basket: 1, why: 'Food is a must-have, even when the amount changes.' },
  { merchant: 'Kahvila Kulma', category: 'Restaurants', icon: 'cafe-outline', amount: 4.8, date: '9 Oct', basket: 3, why: 'One coffee is tiny. Twenty a month isn’t.' },
  { merchant: 'Phone screen repair', category: 'Home & Tech', icon: 'phone-portrait-outline', amount: 129, date: '14 Oct', basket: 2, why: 'You didn’t plan to drop it. Surprise basket.' },
  { merchant: 'Phone bill', category: 'Utilities', icon: 'call-outline', amount: 19.9, date: '15 Oct', basket: 1, why: 'Same bill every month. Must-have.' },
  { merchant: 'Cinema', category: 'Entertainment', icon: 'film-outline', amount: 13.5, date: '18 Oct', basket: 3, why: 'Fun money. A little leak, and that’s okay.' },
];
