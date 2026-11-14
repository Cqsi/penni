import type { Ionicons } from '@expo/vector-icons';
import type { ComponentProps } from 'react';
import { baskets, lastWeek } from '../data/mock';
import type { Setup } from './setup';

type Icon = ComponentProps<typeof Ionicons>['name'];
export type TaskId = 'budget' | 'goal' | 'leaks';

export const GOALS: { name: string; icon: Icon }[] = [
  { name: 'Trip', icon: 'airplane-outline' },
  { name: 'Rainy day fund', icon: 'umbrella-outline' },
  { name: 'New phone', icon: 'phone-portrait-outline' },
  { name: 'Something else', icon: 'star-outline' },
];

const lastWeekTotal = lastWeek.amounts.reduce((a, b) => a + b, 0);
const leaksLastMonth = baskets[2].amount;
const eur = (n: number) => `€${n.toLocaleString('en-US')}`;

/** The three "Start here" tasks on home. Tips use the user's real numbers. */
export const TASKS: {
  id: TaskId;
  title: string;
  hint: string;
  question: string;
  unit: string;
  start: number;
  presets: number[];
  done: (s: Setup) => string | undefined;
  tip: (v: number, goal?: string) => string;
}[] = [
  {
    id: 'budget',
    title: 'Set your weekly budget',
    hint: 'How much you can spend in a week',
    question: 'What’s your weekly budget?',
    unit: 'a week',
    start: 180,
    presets: [150, 180, 220],
    done: (s) => (s.budget ? `${eur(s.budget)} a week` : undefined),
    tip: (v) =>
      v < lastWeekTotal
        ? `Last week you spent ${eur(lastWeekTotal)}. At ${eur(v)} you keep about ${eur((lastWeekTotal - v) * 4)} a month.`
        : `Last week you spent ${eur(lastWeekTotal)}, so ${eur(v)} feels easy.`,
  },
  {
    id: 'goal',
    title: 'Pick a savings goal',
    hint: 'Something to save up for',
    question: 'What are you saving for?',
    unit: 'a month',
    start: 100,
    presets: [50, 100, 200],
    done: (s) => s.goal && `${s.goal.name}, ${eur(s.goal.amount)} a month`,
    tip: (v, goal) => `${eur(v)} a month is ${eur(v * 12)} in a year${goal && goal !== 'Something else' ? ` for your ${goal.toLowerCase()}` : ''}.`,
  },
  {
    id: 'leaks',
    title: 'Set a limit for little leaks',
    hint: 'Coffee, takeaway and fun',
    question: 'How much for little leaks?',
    unit: 'a month',
    start: 300,
    presets: [250, 300, 350],
    done: (s) => (s.leaks ? `${eur(s.leaks)} a month` : undefined),
    tip: (v) =>
      v < leaksLastMonth
        ? `Little leaks were ${eur(leaksLastMonth)} in October. ${eur(v)} frees up ${eur(leaksLastMonth - v)} a month.`
        : `Little leaks were ${eur(leaksLastMonth)} in October. Try a bit lower?`,
  },
];
