import { useSyncExternalStore } from 'react';
import { user } from '../data/mock';

// The chat history, shared by the Chat tab and the voice call so a call shows up in the chat afterwards.
export type Msg = { id: number; from: 'bot' | 'me'; text: string; via?: 'voice' };

let id = 1;
export const nextMsgId = () => id++;

let log: Msg[] = [{ id: 0, from: 'bot', text: `Hi ${user.firstName}! Ask me anything about your money.` }];
const listeners = new Set<() => void>();

export const getChatLog = () => log;

export function setChatLog(next: Msg[]) {
  log = next;
  listeners.forEach((l) => l());
}

export const addToChat = (msg: Omit<Msg, 'id'>) => setChatLog([...log, { ...msg, id: nextMsgId() }]);

export function useChatLog() {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    getChatLog,
    getChatLog,
  );
}
