import AsyncStorage from '@react-native-async-storage/async-storage';

import { DEFAULT_SETTINGS, type Settings, type Subscription } from './types';

const SUBSCRIPTIONS_KEY = 'renewly.subscriptions.v1';
const SETTINGS_KEY = 'renewly.settings.v1';

async function readJSON<T>(key: string, fallback: T): Promise<T> {
  try {
    const raw = await AsyncStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch (error) {
    console.warn(`Failed to read ${key}`, error);
    return fallback;
  }
}

export function loadSubscriptions(): Promise<Subscription[]> {
  return readJSON<Subscription[]>(SUBSCRIPTIONS_KEY, []);
}

export function saveSubscriptions(subscriptions: Subscription[]): Promise<void> {
  return AsyncStorage.setItem(SUBSCRIPTIONS_KEY, JSON.stringify(subscriptions));
}

export async function loadSettings(): Promise<Settings> {
  return { ...DEFAULT_SETTINGS, ...(await readJSON<Partial<Settings>>(SETTINGS_KEY, {})) };
}

export function saveSettings(settings: Settings): Promise<void> {
  return AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
}
