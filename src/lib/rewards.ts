import type { Ionicons } from '@expo/vector-icons';
import type { ComponentProps } from 'react';
import { todayKey, type Setup } from './setup';
import { TASKS } from './tasks';

type Icon = ComponentProps<typeof Ionicons>['name'];

// Prototype numbers: the user starts at Level 3 with some XP and S-Bonus points already earned.
const START_LEVEL = 3;
const START_XP = 300;
const START_POINTS = 450;
export const LEVEL_SIZE = 400; // XP per level
export const POINTS_PER_LEVEL = 100;
export const XP = { lesson: 50, task: 30 };

const TITLES = ['Money Rookie', 'Budget Builder', 'Savings Star', 'Money Master'];

export const REWARDS: { id: string; title: string; where: string; cost: number; icon: Icon }[] = [
  { id: 'chicken', title: '-22% off chicken breast', where: 'S-market', cost: 150, icon: 'restaurant-outline' },
  { id: 'coffee', title: 'Free coffee', where: 'ABC', cost: 200, icon: 'cafe-outline' },
  { id: 'coffee-3for2', title: '3 coffee packages for 2', where: 'Prisma', cost: 600, icon: 'pricetags-outline' },
];

/** Level, XP and S-Bonus points, worked out from what the user has done in the app. */
export function progress(s: Setup) {
  const tasksDone = TASKS.filter((t) => t.done(s)).length;
  const lessonDone = s.lessonDoneOn === todayKey();
  const xp = START_XP + tasksDone * XP.task + (lessonDone ? XP.lesson : 0);
  const levelsGained = Math.floor(xp / LEVEL_SIZE);
  const spent = REWARDS.filter((r) => s.redeemed?.includes(r.id)).reduce((sum, r) => sum + r.cost, 0);
  const level = START_LEVEL + levelsGained;
  return {
    level,
    title: TITLES[Math.min(level - START_LEVEL, TITLES.length - 1)],
    xpInLevel: xp % LEVEL_SIZE,
    points: START_POINTS + levelsGained * POINTS_PER_LEVEL - spent,
    tasksDone,
    lessonDone,
  };
}
