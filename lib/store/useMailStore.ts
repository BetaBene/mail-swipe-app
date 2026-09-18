import { create } from 'zustand';
import { generateMockMail } from '../mockMail';
import { connectImapAccount, submitSwipeAction, syncMailbox } from '../api/mail';
import type { ImapAccountInput, MailCard, SwipeAction, UserStats } from '../types';

const DAILY_GOAL_DEFAULT = 30;
const REFILL_THRESHOLD = 5;
const REFILL_BATCH = 20;

function emptyStats(): UserStats {
  return {
    totalSwiped: 0,
    totalDeleted: 0,
    totalArchived: 0,
    totalKept: 0,
    totalSpam: 0,
    bytesFreed: 0,
    currentStreak: 0,
    longestStreak: 0,
    lastSwipeDate: null,
    dailyGoal: DAILY_GOAL_DEFAULT,
    swipedToday: 0,
  };
}

function todayKey(): string {
  return new Date().toISOString().slice(0, 10);
}

function applySwipeToStats(stats: UserStats, action: SwipeAction, sizeBytes: number): UserStats {
  const today = todayKey();
  const isNewDay = stats.lastSwipeDate !== today;
  const wasYesterday = (() => {
    if (!stats.lastSwipeDate) return false;
    const prev = new Date(stats.lastSwipeDate);
    const diffDays = Math.round((new Date(today).getTime() - prev.getTime()) / 86_400_000);
    return diffDays === 1;
  })();

  const currentStreak = isNewDay ? (wasYesterday ? stats.currentStreak + 1 : 1) : stats.currentStreak;

  return {
    ...stats,
    totalSwiped: stats.totalSwiped + 1,
    totalDeleted: stats.totalDeleted + (action === 'delete' ? 1 : 0),
    totalArchived: stats.totalArchived + (action === 'archive' ? 1 : 0),
    totalKept: stats.totalKept + (action === 'keep' ? 1 : 0),
    totalSpam: stats.totalSpam + (action === 'spam' ? 1 : 0),
    bytesFreed: stats.bytesFreed + (action === 'delete' || action === 'spam' ? sizeBytes : 0),
    currentStreak,
    longestStreak: Math.max(stats.longestStreak, currentStreak),
    lastSwipeDate: today,
    swipedToday: isNewDay ? 1 : stats.swipedToday + 1,
  };
}

interface MailState {
  mockMode: boolean;
  accountId: string | null;
  accountEmail: string | null;
  cards: MailCard[];
  stats: UserStats;
  loading: boolean;
  error: string | null;
  lastAction: { card: MailCard; action: SwipeAction } | null;

  enterMockMode: () => void;
  connectAccount: (input: ImapAccountInput) => Promise<boolean>;
  loadInitialDeck: () => Promise<void>;
  refillIfLow: () => Promise<void>;
  swipe: (cardId: string, action: SwipeAction) => Promise<void>;
  undoLast: () => void;
  reset: () => void;
}

export const useMailStore = create<MailState>((set, get) => ({
  mockMode: false,
  accountId: null,
  accountEmail: null,
  cards: [],
  stats: emptyStats(),
  loading: false,
  error: null,
  lastAction: null,

  enterMockMode: () => {
    set({
      mockMode: true,
      accountId: 'mock-account',
      accountEmail: 'demo@postfach.example',
      cards: generateMockMail(REFILL_BATCH),
    });
  },

  connectAccount: async (input) => {
    set({ loading: true, error: null });
    const result = await connectImapAccount(input);
    if ('error' in result) {
      set({ loading: false, error: result.error });
      return false;
    }
    set({ accountId: result.accountId, accountEmail: input.emailAddress, loading: false });
    await get().loadInitialDeck();
    return true;
  },

  loadInitialDeck: async () => {
    const { accountId, mockMode } = get();
    if (!accountId) return;
    if (mockMode) {
      set({ cards: generateMockMail(REFILL_BATCH, accountId) });
      return;
    }
    set({ loading: true, error: null });
    const result = await syncMailbox(accountId, 'INBOX', REFILL_BATCH);
    if ('error' in result) {
      set({ loading: false, error: result.error });
      return;
    }
    set({ cards: result.cards, loading: false });
  },

  refillIfLow: async () => {
    const { accountId, mockMode, cards, loading } = get();
    if (!accountId || loading || cards.length > REFILL_THRESHOLD) return;
    if (mockMode) {
      set({ cards: [...cards, ...generateMockMail(REFILL_BATCH, accountId)] });
      return;
    }
    set({ loading: true });
    const result = await syncMailbox(accountId, 'INBOX', REFILL_BATCH);
    set({ loading: false });
    if ('cards' in result) {
      const existingIds = new Set(cards.map((c) => c.id));
      const fresh = result.cards.filter((c) => !existingIds.has(c.id));
      set({ cards: [...cards, ...fresh] });
    }
  },

  swipe: async (cardId, action) => {
    const { cards, mockMode, stats } = get();
    const card = cards.find((c) => c.id === cardId);
    if (!card) return;

    set({
      cards: cards.filter((c) => c.id !== cardId),
      stats: applySwipeToStats(stats, action, card.sizeBytes),
      lastAction: { card, action },
    });

    get().refillIfLow();

    if (!mockMode) {
      const result = await submitSwipeAction(cardId, action);
      if ('error' in result) {
        set((s) => ({ error: result.error }));
      }
    }
  },

  undoLast: () => {
    const { lastAction, cards, stats } = get();
    if (!lastAction) return;
    set({
      cards: [lastAction.card, ...cards],
      lastAction: null,
      stats: {
        ...stats,
        totalSwiped: Math.max(0, stats.totalSwiped - 1),
        swipedToday: Math.max(0, stats.swipedToday - 1),
      },
    });
  },

  reset: () =>
    set({
      mockMode: false,
      accountId: null,
      accountEmail: null,
      cards: [],
      stats: emptyStats(),
      loading: false,
      error: null,
      lastAction: null,
    }),
}));
