export type SwipeAction = 'keep' | 'archive' | 'delete' | 'spam';

export interface ImapAccountInput {
  emailAddress: string;
  imapHost: string;
  imapPort: number;
  useTls: boolean;
  username: string;
  password: string;
}

export interface ImapAccount {
  id: string;
  emailAddress: string;
  imapHost: string;
  imapPort: number;
  useTls: boolean;
  createdAt: string;
}

export interface MailCard {
  id: string;
  accountId: string;
  uid: number;
  folder: string;
  fromName: string;
  fromAddress: string;
  subject: string;
  snippet: string;
  receivedAt: string;
  sizeBytes: number;
  isUnread: boolean;
}

export interface UserStats {
  totalSwiped: number;
  totalDeleted: number;
  totalArchived: number;
  totalKept: number;
  totalSpam: number;
  bytesFreed: number;
  currentStreak: number;
  longestStreak: number;
  lastSwipeDate: string | null;
  dailyGoal: number;
  swipedToday: number;
}
