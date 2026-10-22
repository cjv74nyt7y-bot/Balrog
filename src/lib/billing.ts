import type { BillingCycle, Subscription } from './types';

/** Parses `YYYY-MM-DD` as a local calendar date at midnight. */
export function parseDate(value: string): Date {
  const [y, m, d] = value.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function formatISODate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function isValidISODate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  return formatISODate(parseDate(value)) === value;
}

export function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function addMonthsClamped(anchor: Date, months: number): Date {
  const total = anchor.getMonth() + months;
  const year = anchor.getFullYear() + Math.floor(total / 12);
  const month = ((total % 12) + 12) % 12;
  const lastDay = new Date(year, month + 1, 0).getDate();
  return new Date(year, month, Math.min(anchor.getDate(), lastDay));
}

/**
 * The `n`th billing date after `anchor` (n = 0 is the anchor itself).
 * Month-based cycles keep the anchor's day of month, clamped to shorter months,
 * so a plan started on Jan 31 renews Feb 28, then Mar 31.
 */
export function occurrence(anchor: Date, cycle: BillingCycle, n: number): Date {
  switch (cycle) {
    case 'weekly':
      return new Date(anchor.getFullYear(), anchor.getMonth(), anchor.getDate() + 7 * n);
    case 'monthly':
      return addMonthsClamped(anchor, n);
    case 'quarterly':
      return addMonthsClamped(anchor, 3 * n);
    case 'yearly':
      return addMonthsClamped(anchor, 12 * n);
  }
}

/** Billing dates on or after `from`, earliest first. */
export function upcomingRenewals(sub: Pick<Subscription, 'startDate' | 'cycle'>, from: Date, count: number): Date[] {
  const anchor = parseDate(sub.startDate);
  const target = startOfDay(from);
  let n = 0;
  if (anchor < target) {
    // Jump close to the target, then step forward; avoids iterating years of weekly renewals.
    const days = (target.getTime() - anchor.getTime()) / 86_400_000;
    const approx = { weekly: days / 7, monthly: days / 31, quarterly: days / 92, yearly: days / 366 }[sub.cycle];
    n = Math.max(0, Math.floor(approx) - 1);
    while (occurrence(anchor, sub.cycle, n) < target) n++;
  }
  const dates: Date[] = [];
  for (let i = 0; i < count; i++) dates.push(occurrence(anchor, sub.cycle, n + i));
  return dates;
}

export function nextRenewal(sub: Pick<Subscription, 'startDate' | 'cycle'>, from: Date = new Date()): Date {
  return upcomingRenewals(sub, from, 1)[0];
}

export function daysUntil(date: Date, from: Date = new Date()): number {
  return Math.round((startOfDay(date).getTime() - startOfDay(from).getTime()) / 86_400_000);
}

const CYCLES_PER_YEAR: Record<BillingCycle, number> = {
  weekly: 52,
  monthly: 12,
  quarterly: 4,
  yearly: 1,
};

export function yearlyCost(sub: Pick<Subscription, 'price' | 'cycle'>): number {
  return sub.price * CYCLES_PER_YEAR[sub.cycle];
}

export function monthlyCost(sub: Pick<Subscription, 'price' | 'cycle'>): number {
  return yearlyCost(sub) / 12;
}

export function describeDue(date: Date, from: Date = new Date()): string {
  const days = daysUntil(date, from);
  if (days === 0) return 'Today';
  if (days === 1) return 'Tomorrow';
  if (days < 7) return `In ${days} days`;
  return date.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: date.getFullYear() === from.getFullYear() ? undefined : 'numeric',
  });
}
