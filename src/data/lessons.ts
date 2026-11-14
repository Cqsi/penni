import type { Ionicons } from '@expo/vector-icons';
import type { ComponentProps } from 'react';
import { baskets, income, user } from './mock';

type Icon = ComponentProps<typeof Ionicons>['name'];

export type Step =
  | { kind: 'intro'; title: string; body: string }
  | { kind: 'text'; title: string; body: string; bars?: { label: string; value: number }[] }
  | { kind: 'quiz'; question: string; options: string[]; answer: number; explain: string };

export type Lesson = { id: string; title: string; icon: Icon; minutes: number; steps: Step[] };

const eur = (n: number) => `€${Math.round(n).toLocaleString('en-US')}`;
const [mustHaves, surprises, leaks] = baskets;

/** One short lesson a day, rotating. Numbers come from the user's own data where it helps. */
export const LESSONS: Lesson[] = [
  {
    id: 'pay-yourself-first',
    title: 'Pay yourself first',
    icon: 'wallet-outline',
    minutes: 2,
    steps: [
      { kind: 'intro', title: 'Pay yourself first', body: 'The easiest saving trick there is. It takes two minutes to set up and then runs by itself.' },
      {
        kind: 'text',
        title: 'Save first, spend the rest',
        body: 'Most people save what’s left at the end of the month. Usually that’s nothing. Flip it: move money to savings on payday, before you spend anything.',
      },
      {
        kind: 'text',
        title: `For you, ${user.firstName}`,
        body: `Your pay is ${eur(income)}. Moving 5% on payday is ${eur(income * 0.05)} a month. That’s ${eur(income * 0.05 * 12)} in a year without thinking about it.`,
        bars: [
          { label: '1 mo', value: Math.round(income * 0.05) },
          { label: '6 mo', value: Math.round(income * 0.05 * 6) },
          { label: '1 yr', value: Math.round(income * 0.05 * 12) },
        ],
      },
      {
        kind: 'quiz',
        question: 'When is the best moment to move money to savings?',
        options: ['At the end of the month', 'On payday', 'When I have some left over'],
        answer: 1,
        explain: 'Money you never see is money you don’t spend.',
      },
      {
        kind: 'quiz',
        question: `Your pay is ${eur(income)}. How much is 10% of it?`,
        options: [eur(income * 0.01), eur(income * 0.1), eur(income * 0.5)],
        answer: 1,
        explain: `${eur(income * 0.1)}. If that feels like a lot, 5% is a great start.`,
      },
    ],
  },
  {
    id: 'compound-interest',
    title: 'Money that makes money',
    icon: 'trending-up-outline',
    minutes: 2,
    steps: [
      { kind: 'intro', title: 'Money that makes money', body: 'Compound interest: your savings earn interest, and then that interest earns interest too.' },
      {
        kind: 'text',
        title: 'It snowballs',
        body: 'Saving €100 a month with 5% yearly growth:',
        bars: [
          { label: '5 yrs', value: 6801 },
          { label: '10 yrs', value: 15528 },
          { label: '20 yrs', value: 41103 },
          { label: '30 yrs', value: 83226 },
        ],
      },
      {
        kind: 'text',
        title: 'Time beats amount',
        body: 'After 30 years you’d have put in €36,000 but have about €83,000. Starting early matters more than starting big.',
      },
      {
        kind: 'quiz',
        question: 'Who has more by age 60?',
        options: ['Starts at 25, saves €50 a month', 'Starts at 45, saves €150 a month'],
        answer: 0,
        explain: 'The early starter: about €56,700 vs €40,100, even though they put in less money.',
      },
      {
        kind: 'quiz',
        question: 'What makes compound interest grow the most?',
        options: ['A big first deposit', 'Lots of time', 'Checking the balance often'],
        answer: 1,
        explain: 'Time. The longer it runs, the more your interest earns interest.',
      },
    ],
  },
  {
    id: 'little-leaks',
    title: 'Little leaks add up',
    icon: 'water-outline',
    minutes: 2,
    steps: [
      { kind: 'intro', title: 'Little leaks add up', body: 'A coffee here, a takeaway there. Small buys feel like nothing, but they add up fast.' },
      {
        kind: 'text',
        title: 'Your October',
        body: `Little leaks were ${eur(leaks.amount)} last month. Here’s where they went:`,
        bars: leaks.categories.map((c) => ({ label: c.name, value: c.amount })),
      },
      {
        kind: 'text',
        title: 'The yearly view',
        body: `${eur(leaks.amount)} a month is ${eur(leaks.amount * 12)} a year. Cutting just a quarter of it frees up ${eur(leaks.amount * 3)} a year. That’s a trip.`,
      },
      {
        kind: 'quiz',
        question: 'Your coffee costs €46 a month. What is that in a year?',
        options: ['About €150', 'About €550', 'About €1,000'],
        answer: 1,
        explain: '€46 × 12 = €552. Worth it if you love it, but good to know.',
      },
      {
        kind: 'quiz',
        question: 'Which one is a little leak?',
        options: ['Rent', 'A dentist visit', 'Friday takeaway'],
        answer: 2,
        explain: 'Takeaway is optional and adds up. Rent is a must-have and the dentist is a surprise.',
      },
    ],
  },
  {
    id: 'safety-cushion',
    title: 'Your safety cushion',
    icon: 'umbrella-outline',
    minutes: 2,
    steps: [
      { kind: 'intro', title: 'Your safety cushion', body: 'Phones break. Teeth ache. An emergency fund is money set aside only for surprises.' },
      {
        kind: 'text',
        title: 'How much?',
        body: `A good first goal is one month of must-haves. For you that’s about ${eur(mustHaves.amount)}.`,
      },
      {
        kind: 'text',
        title: 'Why it matters',
        body: `You had ${eur(surprises.amount)} of surprises in October. With a cushion they’re just annoying. Without one, they end up on a credit card.`,
      },
      {
        kind: 'quiz',
        question: 'Where should an emergency fund live?',
        options: ['In stocks', 'In a separate savings account', 'In my everyday account'],
        answer: 1,
        explain: 'Somewhere safe and easy to reach, but apart from your spending money.',
      },
      {
        kind: 'quiz',
        question: 'Which one is a real emergency?',
        options: ['A flash sale on sneakers', 'A broken phone you need for work', 'Concert tickets'],
        answer: 1,
        explain: 'Needed and unplanned: exactly what the cushion is for.',
      },
    ],
  },
  {
    id: 'needs-vs-wants',
    title: 'Need it or want it?',
    icon: 'basket-outline',
    minutes: 2,
    steps: [
      { kind: 'intro', title: 'Need it or want it?', body: 'Knowing the difference is the base of every budget. Penni uses three baskets to help.' },
      {
        kind: 'text',
        title: 'Three baskets',
        body: 'Must-haves: rent, bills, groceries. Surprises: needed, but unplanned. Little leaks: nice, but optional. Your October:',
        bars: baskets.map((b) => ({ label: b.name, value: b.amount })),
      },
      {
        kind: 'quiz',
        question: 'Your phone broke and you buy a new one. Which basket?',
        options: ['Must-have', 'Surprise', 'Little leak'],
        answer: 1,
        explain: 'You need it, but you couldn’t plan for it.',
      },
      {
        kind: 'quiz',
        question: 'And a concert ticket?',
        options: ['Must-have', 'Surprise', 'Little leak'],
        answer: 2,
        explain: 'Totally fine to buy. Just know it’s optional.',
      },
      {
        kind: 'quiz',
        question: 'And your weekly groceries?',
        options: ['Must-have', 'Surprise', 'Little leak'],
        answer: 0,
        explain: 'Food is a must-have. A fancy dinner out would be a little leak.',
      },
    ],
  },
];

const dayNumber = (offset = 0) => Math.floor(Date.now() / 86_400_000) + offset;
export const todayLesson = () => LESSONS[dayNumber() % LESSONS.length];
export const tomorrowLesson = () => LESSONS[dayNumber(1) % LESSONS.length];

// Prototype: pretend the user did the lesson on the two days before today.
const PRETEND_DONE_BEFORE = 2;

export const lessonStreak = (doneToday: boolean) => PRETEND_DONE_BEFORE + (doneToday ? 1 : 0);
