import * as Notifications from 'expo-notifications';
import { AndroidImportance } from 'expo-notifications';
import { Platform } from 'react-native';

import { formatMoney } from './format';
import { upcomingRenewals } from './billing';
import type { Settings, Subscription } from './types';

// iOS keeps at most 64 pending local notifications; stay under it.
const MAX_SCHEDULED = 60;
const ANDROID_CHANNEL = 'renewals';
const supported = Platform.OS !== 'web';

if (supported) {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });
}

export async function getNotificationPermission(): Promise<'granted' | 'denied' | 'undetermined'> {
  if (!supported) return 'denied';
  const { granted, canAskAgain } = await Notifications.getPermissionsAsync();
  if (granted) return 'granted';
  return canAskAgain ? 'undetermined' : 'denied';
}

export async function requestNotificationPermission(): Promise<boolean> {
  if (!supported) return false;
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync(ANDROID_CHANNEL, {
      name: 'Renewal reminders',
      importance: AndroidImportance.DEFAULT,
    });
  }
  const current = await Notifications.getPermissionsAsync();
  if (current.granted) return true;
  if (!current.canAskAgain) return false;
  const { granted } = await Notifications.requestPermissionsAsync();
  return granted;
}

function reminderBody(sub: Subscription, renewal: Date, days: number, currency: string): string {
  const amount = formatMoney(sub.price, currency);
  if (days === 0) return `${sub.name} renews today for ${amount}.`;
  const when = days === 1 ? 'tomorrow' : `in ${days} days`;
  const date = renewal.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  return `${sub.name} renews ${when} (${date}) for ${amount}. Cancel now if you don't need it.`;
}

/**
 * Replaces every scheduled reminder with a fresh set built from the current subscriptions.
 * Called after any change, so reminders never drift from the data.
 */
export async function rescheduleReminders(subscriptions: Subscription[], settings: Settings): Promise<void> {
  if (!supported) return;
  const { granted } = await Notifications.getPermissionsAsync();
  await Notifications.cancelAllScheduledNotificationsAsync();
  if (!granted) return;

  const now = new Date();
  const pending: { date: Date; sub: Subscription; renewal: Date; days: number }[] = [];
  for (const sub of subscriptions) {
    if (sub.reminderDays == null) continue;
    for (const renewal of upcomingRenewals(sub, now, 3)) {
      const date = new Date(renewal);
      date.setDate(date.getDate() - sub.reminderDays);
      date.setHours(settings.reminderHour, 0, 0, 0);
      if (date > now) pending.push({ date, sub, renewal, days: sub.reminderDays });
    }
  }
  pending.sort((a, b) => a.date.getTime() - b.date.getTime());

  for (const { date, sub, renewal, days } of pending.slice(0, MAX_SCHEDULED)) {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: days === 0 ? 'Renewing today' : 'Upcoming renewal',
        body: reminderBody(sub, renewal, days, settings.currency),
        data: { subscriptionId: sub.id },
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date,
        channelId: Platform.OS === 'android' ? ANDROID_CHANNEL : undefined,
      },
    });
  }
}
