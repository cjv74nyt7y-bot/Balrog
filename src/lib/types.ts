export type BillingCycle = 'weekly' | 'monthly' | 'quarterly' | 'yearly';

export type Category =
  | 'entertainment'
  | 'music'
  | 'productivity'
  | 'utilities'
  | 'health'
  | 'news'
  | 'gaming'
  | 'other';

export interface Subscription {
  id: string;
  name: string;
  /** Price charged once per billing cycle. */
  price: number;
  cycle: BillingCycle;
  /** First billing date as a local calendar date, `YYYY-MM-DD`. Later renewals are derived from it. */
  startDate: string;
  category: Category;
  color: string;
  /** Days before a renewal to send a reminder, or `null` for no reminder. */
  reminderDays: number | null;
  notes?: string;
  createdAt: number;
}

export interface Settings {
  currency: string;
  /** Hour of day (0-23) reminders are delivered. */
  reminderHour: number;
}

export const DEFAULT_SETTINGS: Settings = {
  currency: 'USD',
  reminderHour: 9,
};

export const CYCLES: { value: BillingCycle; label: string; short: string }[] = [
  { value: 'weekly', label: 'Weekly', short: 'wk' },
  { value: 'monthly', label: 'Monthly', short: 'mo' },
  { value: 'quarterly', label: 'Quarterly', short: 'qtr' },
  { value: 'yearly', label: 'Yearly', short: 'yr' },
];

export const CATEGORIES: { value: Category; label: string; emoji: string }[] = [
  { value: 'entertainment', label: 'Streaming', emoji: '🎬' },
  { value: 'music', label: 'Music', emoji: '🎵' },
  { value: 'productivity', label: 'Productivity', emoji: '💼' },
  { value: 'utilities', label: 'Utilities', emoji: '💡' },
  { value: 'health', label: 'Health', emoji: '💪' },
  { value: 'news', label: 'News', emoji: '📰' },
  { value: 'gaming', label: 'Gaming', emoji: '🎮' },
  { value: 'other', label: 'Other', emoji: '📦' },
];

export const COLORS = [
  '#E5484D',
  '#F76B15',
  '#FFC53D',
  '#30A46C',
  '#12A594',
  '#0090FF',
  '#6E56CF',
  '#D6409F',
  '#8D8D86',
];

export const REMINDER_OPTIONS: { value: number | null; label: string }[] = [
  { value: null, label: 'None' },
  { value: 0, label: 'Same day' },
  { value: 1, label: '1 day before' },
  { value: 3, label: '3 days before' },
  { value: 7, label: '1 week before' },
];

export const CURRENCIES = ['USD', 'EUR', 'GBP', 'CAD', 'AUD', 'JPY', 'INR', 'BRL', 'MXN', 'CHF', 'SEK', 'NZD'];

/** Number of subscriptions the free tier can track. */
export const FREE_LIMIT = 5;
