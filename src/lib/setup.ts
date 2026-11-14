import { useSyncExternalStore } from 'react';
import { PICKABLE, type BotId } from '../bots/bots';
import { week } from '../data/mock';

// What the user tells Penni about themselves in the "Start here" tasks.
// Kept in memory for the prototype; the app and the AI coach both read it.
export type Setup = {
  bot?: BotId; // picked in onboarding
  budget?: number; // € per week
  goal?: { name: string; amount: number }; // € per month
  leaks?: number; // € per month limit for little leaks
  lessonDoneOn?: string; // date (YYYY-MM-DD) of the last finished daily lesson
  redeemed?: string[]; // ids of S-Bonus rewards the user has claimed
  receipts?: { store: string; total: number; leaks: number }[]; // scanned receipts added to this week
};

let state: Setup = {};
const listeners = new Set<() => void>();

export function saveSetup(patch: Partial<Setup>) {
  state = { ...state, ...patch };
  listeners.forEach((l) => l());
}

export const getSetup = () => state;

/** Undo the "Start here" tasks and today's lesson (keeps the chosen bot). For demos. */
export const resetSetup = () => {
  state = { bot: state.bot };
  listeners.forEach((l) => l());
};

export const todayKey = () => new Date().toISOString().slice(0, 10);

export function useSetup() {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    getSetup,
    getSetup,
  );
}

/** The user's money buddy. */
export const useBotId = (): BotId => useSetup().bot ?? PICKABLE[0];

/** This week's numbers, using the user's own budget once they have set one. */
export function weekFor({ budget = week.budget, receipts = [] }: Setup) {
  const scanned = receipts.reduce((a, r) => a + r.total, 0);
  const spent = Math.round(week.budget - week.safeToSpend + scanned);
  return { budget, spent, safeToSpend: Math.max(0, budget - spent), daysLeft: week.daysLeft };
}

export const useWeek = () => weekFor(useSetup());

/** One line for the AI coach, so its answers use the user's own plan. */
export function setupContext() {
  const s = state;
  const parts = [
    s.budget && `weekly budget €${s.budget}`,
    s.goal && `saving €${s.goal.amount}/month for "${s.goal.name}"`,
    s.leaks && `little leaks limit €${s.leaks}/month`,
    ...(s.receipts ?? []).map((r) => `just scanned a receipt: ${r.store} €${r.total.toFixed(2)} (little leaks €${r.leaks.toFixed(2)}), already counted in this week`),
  ].filter(Boolean);
  return parts.length ? `The user's own plan (they set this in the app): ${parts.join('; ')}.` : 'The user has not set a budget or goal yet.';
}
