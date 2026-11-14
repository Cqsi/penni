import Constants from 'expo-constants';
import { File } from 'expo-file-system';
import { NativeModules, Platform } from 'react-native';
import type { Bot } from '../bots/bots';
import { baskets, cannedReply, income, lastWeek, month, user } from '../data/mock';
import { getSetup, setupContext, weekFor } from './setup';

export type ChatMsg = { from: 'bot' | 'me'; text: string };

/** Pull the host out of a URL like http://172.20.10.4:8082/index.bundle or exp://172.20.10.4:8082 */
const hostOf = (url?: string | null) => url?.match(/^[a-z]+:\/\/([^/:?]+)/i)?.[1];

/**
 * Where the local chat server runs: the same laptop that serves the app bundle, port 8787.
 * Override with EXPO_PUBLIC_CHAT_URL if needed.
 */
export function serverUrl() {
  if (process.env.EXPO_PUBLIC_CHAT_URL) return process.env.EXPO_PUBLIC_CHAT_URL;
  if (Platform.OS === 'web' && typeof window !== 'undefined') return `http://${window.location.hostname}:8787/chat`;
  const sc = NativeModules.SourceCode;
  const host =
    hostOf(sc?.getConstants?.().scriptURL ?? sc?.scriptURL) ??
    Constants.expoConfig?.hostUri?.split(':')[0] ??
    hostOf(Constants.experienceUrl) ??
    hostOf(Constants.linkingUri) ??
    'localhost';
  return `http://${host}:8787/chat`;
}

/** The user's money facts, summarised for the AI. Same numbers the app shows. */
function context() {
  const wk = weekFor(getSetup());
  const b = baskets
    .map((x) => `- ${x.name} (${x.hint.toLowerCase()}): €${x.amount} — ${x.categories.map((c) => `${c.name} €${c.amount}`).join(', ')}`)
    .join('\n');
  const days = lastWeek.days.map((d, i) => `${d} €${lastWeek.amounts[i]}`).join(', ');
  return [
    `Name: ${user.firstName}, ${user.age}, lives in ${user.city}.`,
    `Monthly net income: €${income}.`,
    `${month} spending by basket:`,
    b,
    `Safe to spend this week: €${wk.safeToSpend} of a €${wk.budget} weekly budget, ${wk.daysLeft} days left (€${wk.spent} spent so far).`,
    `Last week per day (Mon–Sun): ${days}. Biggest day Friday.`,
    'Other facts: coffee €46 in October (about 11 cups, mostly weekday mornings). Taxis €38 over 3 rides.',
    '61% of little leaks happen Friday–Sunday.',
    setupContext(),
  ].join('\n');
}

/** Ask the AI coach. Falls back to the scripted answer if the server can't be reached. */
export async function askCoach(bot: Bot, history: ChatMsg[]): Promise<{ text: string; live: boolean; error?: string }> {
  const question = history.filter((m) => m.from === 'me').at(-1)?.text ?? '';
  const url = serverUrl();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 15000);
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ botName: bot.name, botRole: bot.role, context: context(), messages: history }),
      signal: controller.signal,
    });
    const json = await res.json();
    if (!res.ok || !json.reply) throw new Error(json.error ?? 'No reply');
    return { text: json.reply, live: true };
  } catch (e) {
    const error = `${(e as Error).message} (${url})`;
    console.warn('Coach server unavailable, using scripted reply:', error);
    return { text: cannedReply(question), live: false, error };
  } finally {
    clearTimeout(timer);
  }
}

/** Send a voice recording to the server and get the text back. */
export async function transcribe(uri: string): Promise<string> {
  const audio = await new File(uri).base64();
  const res = await fetch(serverUrl().replace(/\/chat$/, '/transcribe'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ audio, mime: 'audio/m4a', name: 'voice.m4a' }),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error ?? 'Transcription failed');
  return json.text as string;
}
