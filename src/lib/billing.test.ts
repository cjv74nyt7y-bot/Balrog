import assert from 'node:assert/strict';
import { test } from 'node:test';

import { daysUntil, formatISODate, isValidISODate, monthlyCost, nextRenewal, upcomingRenewals, yearlyCost } from './billing.ts';

const sub = (startDate: string, cycle: 'weekly' | 'monthly' | 'quarterly' | 'yearly') => ({ startDate, cycle });
const iso = (dates: Date[]) => dates.map(formatISODate);

test('monthly renewals keep the anchor day, clamped to short months', () => {
  assert.deepEqual(iso(upcomingRenewals(sub('2025-01-31', 'monthly'), new Date(2025, 0, 1), 4)), [
    '2025-01-31',
    '2025-02-28',
    '2025-03-31',
    '2025-04-30',
  ]);
  assert.equal(formatISODate(nextRenewal(sub('2024-01-31', 'monthly'), new Date(2024, 1, 1))), '2024-02-29');
});

test('next renewal is today when billing today, otherwise the next future date', () => {
  assert.equal(formatISODate(nextRenewal(sub('2025-03-15', 'monthly'), new Date(2026, 9, 15, 18))), '2026-10-15');
  assert.equal(formatISODate(nextRenewal(sub('2025-03-15', 'monthly'), new Date(2026, 9, 16))), '2026-11-15');
});

test('start dates in the future are the next renewal', () => {
  assert.equal(formatISODate(nextRenewal(sub('2027-06-01', 'yearly'), new Date(2026, 9, 22))), '2027-06-01');
});

test('weekly renewals from years ago land on the right weekday', () => {
  const next = nextRenewal(sub('2020-01-06', 'weekly'), new Date(2026, 9, 22)); // 2020-01-06 is a Monday
  assert.equal(formatISODate(next), '2026-10-26');
  assert.equal(next.getDay(), 1);
});

test('quarterly and yearly cycles', () => {
  assert.deepEqual(iso(upcomingRenewals(sub('2025-11-30', 'quarterly'), new Date(2026, 0, 1), 3)), [
    '2026-02-28',
    '2026-05-30',
    '2026-08-30',
  ]);
  assert.equal(formatISODate(nextRenewal(sub('2024-02-29', 'yearly'), new Date(2025, 0, 1))), '2025-02-28');
});

test('cost normalisation', () => {
  assert.equal(yearlyCost({ price: 10, cycle: 'monthly' }), 120);
  assert.equal(yearlyCost({ price: 5, cycle: 'weekly' }), 260);
  assert.equal(monthlyCost({ price: 120, cycle: 'yearly' }), 10);
  assert.equal(monthlyCost({ price: 30, cycle: 'quarterly' }), 10);
});

test('date helpers', () => {
  assert.equal(daysUntil(new Date(2026, 9, 25), new Date(2026, 9, 22, 23, 59)), 3);
  assert.ok(isValidISODate('2026-02-28'));
  assert.ok(!isValidISODate('2026-02-30'));
  assert.ok(!isValidISODate('2026-2-3'));
});
