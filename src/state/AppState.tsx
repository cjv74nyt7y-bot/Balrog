import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';

import { rescheduleReminders } from '../lib/notifications';
import { configurePurchases, fetchIsPro, purchasesAvailable } from '../lib/purchases';
import { loadSettings, loadSubscriptions, saveSettings, saveSubscriptions } from '../lib/storage';
import { DEFAULT_SETTINGS, FREE_LIMIT, type Settings, type Subscription } from '../lib/types';

interface AppState {
  ready: boolean;
  subscriptions: Subscription[];
  settings: Settings;
  isPro: boolean;
  /** Whether another subscription can be added on the current plan. */
  canAdd: boolean;
  /** Adds or replaces a subscription; `createdAt` is set automatically for new ones. */
  upsert: (sub: Omit<Subscription, 'createdAt'>) => void;
  remove: (id: string) => void;
  updateSettings: (patch: Partial<Settings>) => void;
  setIsPro: (isPro: boolean) => void;
  /** Re-syncs scheduled reminders, e.g. after notification permission is granted. */
  refreshReminders: () => void;
}

const AppStateContext = createContext<AppState | null>(null);

export function AppStateProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [isPro, setIsPro] = useState(false);
  const [reminderVersion, setReminderVersion] = useState(0);
  const loaded = useRef(false);

  useEffect(() => {
    Promise.all([loadSubscriptions(), loadSettings()]).then(([subs, stored]) => {
      setSubscriptions(subs);
      setSettings(stored);
      loaded.current = true;
      setReady(true);
    });
    if (purchasesAvailable) {
      configurePurchases(setIsPro);
      fetchIsPro().then(setIsPro).catch((error) => console.warn('Failed to load purchases', error));
    }
  }, []);

  useEffect(() => {
    if (!loaded.current) return;
    saveSubscriptions(subscriptions).catch((error) => console.warn('Failed to save subscriptions', error));
  }, [subscriptions]);

  useEffect(() => {
    if (!loaded.current) return;
    saveSettings(settings).catch((error) => console.warn('Failed to save settings', error));
  }, [settings]);

  useEffect(() => {
    if (!loaded.current) return;
    rescheduleReminders(subscriptions, settings).catch((error) => console.warn('Failed to schedule reminders', error));
  }, [subscriptions, settings, reminderVersion]);

  const upsert = useCallback((sub: Omit<Subscription, 'createdAt'>) => {
    setSubscriptions((current) => {
      const index = current.findIndex((s) => s.id === sub.id);
      if (index === -1) return [...current, { ...sub, createdAt: Date.now() }];
      const next = [...current];
      next[index] = { ...sub, createdAt: current[index].createdAt };
      return next;
    });
  }, []);

  const remove = useCallback((id: string) => {
    setSubscriptions((current) => current.filter((s) => s.id !== id));
  }, []);

  const updateSettings = useCallback((patch: Partial<Settings>) => {
    setSettings((current) => ({ ...current, ...patch }));
  }, []);

  const refreshReminders = useCallback(() => setReminderVersion((v) => v + 1), []);

  const value = useMemo<AppState>(
    () => ({
      ready,
      subscriptions,
      settings,
      isPro,
      canAdd: isPro || subscriptions.length < FREE_LIMIT,
      upsert,
      remove,
      updateSettings,
      setIsPro,
      refreshReminders,
    }),
    [ready, subscriptions, settings, isPro, upsert, remove, updateSettings, refreshReminders],
  );

  return <AppStateContext.Provider value={value}>{children}</AppStateContext.Provider>;
}

export function useAppState(): AppState {
  const value = useContext(AppStateContext);
  if (!value) throw new Error('useAppState must be used inside AppStateProvider');
  return value;
}
