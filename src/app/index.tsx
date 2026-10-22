import { Stack, router } from 'expo-router';
import { useMemo } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Card, Section } from '../components/ui';
import { describeDue, daysUntil, monthlyCost, nextRenewal, yearlyCost } from '../lib/billing';
import { formatMoney } from '../lib/format';
import { useTheme } from '../lib/theme';
import { CATEGORIES, CYCLES, FREE_LIMIT, type Category } from '../lib/types';
import { useAppState } from '../state/AppState';

export default function HomeScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { ready, subscriptions, settings, isPro, canAdd } = useAppState();
  const currency = settings.currency;

  const sorted = useMemo(() => {
    const now = new Date();
    return subscriptions
      .map((sub) => ({ sub, due: nextRenewal(sub, now) }))
      .sort((a, b) => a.due.getTime() - b.due.getTime());
  }, [subscriptions]);

  const monthly = subscriptions.reduce((sum, s) => sum + monthlyCost(s), 0);
  const yearly = subscriptions.reduce((sum, s) => sum + yearlyCost(s), 0);
  const dueThisWeek = sorted.filter(({ due }) => daysUntil(due) <= 7);
  const dueThisWeekTotal = dueThisWeek.reduce((sum, { sub }) => sum + sub.price, 0);

  const byCategory = useMemo(() => {
    const totals = new Map<Category, number>();
    for (const s of subscriptions) totals.set(s.category, (totals.get(s.category) ?? 0) + monthlyCost(s));
    return [...totals.entries()].sort((a, b) => b[1] - a[1]);
  }, [subscriptions]);

  const onAdd = () => router.push(canAdd ? '/edit' : '/paywall');

  if (!ready) {
    return (
      <View style={[styles.center, { backgroundColor: theme.background }]}>
        <ActivityIndicator color={theme.accent} />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: theme.background }}>
      <Stack.Screen
        options={{
          headerRight: () => (
            <Pressable onPress={() => router.push('/settings')} hitSlop={12} accessibilityLabel="Settings">
              <Text style={{ color: theme.accent, fontSize: 17 }}>Settings</Text>
            </Pressable>
          ),
        }}
      />
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={{ padding: 16, paddingBottom: 120 + insets.bottom }}
      >
        <View style={[styles.hero, { backgroundColor: theme.hero }]}>
          <Text style={[styles.heroLabel, { color: theme.heroMuted }]}>You spend per month</Text>
          <Text style={[styles.heroAmount, { color: theme.heroText }]} adjustsFontSizeToFit numberOfLines={1}>
            {formatMoney(monthly, currency)}
          </Text>
          <Text style={[styles.heroSub, { color: theme.heroMuted }]}>
            {formatMoney(yearly, currency)} per year · {subscriptions.length}{' '}
            {subscriptions.length === 1 ? 'subscription' : 'subscriptions'}
          </Text>
          {dueThisWeek.length > 0 ? (
            <View style={styles.heroPill}>
              <Text style={[styles.heroPillText, { color: theme.heroText }]}>
                {formatMoney(dueThisWeekTotal, currency)} due in the next 7 days
              </Text>
            </View>
          ) : null}
        </View>

        {!isPro && subscriptions.length >= FREE_LIMIT - 1 ? (
          <Pressable onPress={() => router.push('/paywall')}>
            <Card style={[styles.banner, { borderColor: theme.accent }]}>
              <Text style={[styles.bannerTitle, { color: theme.text }]}>
                {canAdd ? `${FREE_LIMIT - subscriptions.length} free slot left` : `You've used all ${FREE_LIMIT} free slots`}
              </Text>
              <Text style={{ color: theme.textMuted }}>Go Pro for unlimited subscriptions and spending insights.</Text>
            </Card>
          </Pressable>
        ) : null}

        {subscriptions.length === 0 ? (
          <Section>
            <Card style={styles.empty}>
              <Text style={styles.emptyEmoji}>🧾</Text>
              <Text style={[styles.emptyTitle, { color: theme.text }]}>Track what you pay for</Text>
              <Text style={[styles.emptyBody, { color: theme.textMuted }]}>
                Add your subscriptions to see your real monthly cost and get a reminder before each renewal.
              </Text>
            </Card>
          </Section>
        ) : (
          <Section title="Upcoming renewals">
            <Card>
              {sorted.map(({ sub, due }, index) => {
                const days = daysUntil(due);
                const category = CATEGORIES.find((c) => c.value === sub.category);
                const cycle = CYCLES.find((c) => c.value === sub.cycle);
                return (
                  <Pressable
                    key={sub.id}
                    onPress={() => router.push({ pathname: '/edit', params: { id: sub.id } })}
                    style={({ pressed }) => [
                      styles.row,
                      index > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: theme.border },
                      pressed && { opacity: 0.6 },
                    ]}
                  >
                    <View style={[styles.avatar, { backgroundColor: sub.color }]}>
                      <Text style={styles.avatarText}>{category?.emoji ?? '📦'}</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.rowTitle, { color: theme.text }]} numberOfLines={1}>
                        {sub.name}
                      </Text>
                      <Text style={{ color: days <= 3 ? theme.warning : theme.textMuted, fontSize: 14 }}>
                        {describeDue(due)}
                      </Text>
                    </View>
                    <Text style={[styles.rowPrice, { color: theme.text }]}>
                      {formatMoney(sub.price, currency)}
                      <Text style={{ color: theme.textMuted, fontSize: 13, fontWeight: '400' }}>/{cycle?.short}</Text>
                    </Text>
                  </Pressable>
                );
              })}
            </Card>
          </Section>
        )}

        {subscriptions.length > 0 ? (
          <Section title="Spending by category">
            {isPro ? (
              <Card style={{ padding: 16, gap: 14 }}>
                {byCategory.map(([category, amount]) => {
                  const meta = CATEGORIES.find((c) => c.value === category)!;
                  const share = monthly > 0 ? amount / monthly : 0;
                  return (
                    <View key={category} style={{ gap: 6 }}>
                      <View style={styles.barLabel}>
                        <Text style={{ color: theme.text, fontSize: 15 }}>
                          {meta.emoji} {meta.label}
                        </Text>
                        <Text style={{ color: theme.textMuted, fontSize: 15 }}>
                          {formatMoney(amount, currency)}/mo · {Math.round(share * 100)}%
                        </Text>
                      </View>
                      <View style={[styles.barTrack, { backgroundColor: theme.chip }]}>
                        <View style={[styles.barFill, { backgroundColor: theme.accent, width: `${share * 100}%` }]} />
                      </View>
                    </View>
                  );
                })}
              </Card>
            ) : (
              <Pressable onPress={() => router.push('/paywall')}>
                <Card style={styles.locked}>
                  <Text style={{ fontSize: 22 }}>🔒</Text>
                  <Text style={[styles.bannerTitle, { color: theme.text }]}>See where your money goes</Text>
                  <Text style={{ color: theme.textMuted, textAlign: 'center' }}>
                    Unlock category insights with Renewly Pro.
                  </Text>
                </Card>
              </Pressable>
            )}
          </Section>
        ) : null}
      </ScrollView>

      <View style={[styles.fabWrap, { bottom: 16 + insets.bottom }]} pointerEvents="box-none">
        <Pressable
          onPress={onAdd}
          accessibilityRole="button"
          style={({ pressed }) => [styles.fab, { backgroundColor: theme.accent, opacity: pressed ? 0.85 : 1 }]}
        >
          <Text style={[styles.fabText, { color: theme.accentText }]}>+ Add subscription</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  hero: { borderRadius: 24, padding: 22 },
  heroLabel: { fontSize: 15, fontWeight: '500' },
  heroAmount: { fontSize: 44, fontWeight: '700', marginTop: 4, fontVariant: ['tabular-nums'] },
  heroSub: { fontSize: 15, marginTop: 4 },
  heroPill: {
    alignSelf: 'flex-start',
    marginTop: 14,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.18)',
  },
  heroPillText: { fontSize: 14, fontWeight: '600' },
  banner: { marginTop: 16, padding: 16, gap: 4, borderWidth: 1 },
  bannerTitle: { fontSize: 16, fontWeight: '600' },
  empty: { padding: 28, alignItems: 'center', gap: 8 },
  emptyEmoji: { fontSize: 40 },
  emptyTitle: { fontSize: 19, fontWeight: '700' },
  emptyBody: { fontSize: 15, textAlign: 'center', lineHeight: 21 },
  row: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 12, gap: 12 },
  avatar: { width: 42, height: 42, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 20 },
  rowTitle: { fontSize: 17, fontWeight: '600' },
  rowPrice: { fontSize: 17, fontWeight: '600', fontVariant: ['tabular-nums'] },
  barLabel: { flexDirection: 'row', justifyContent: 'space-between', gap: 8 },
  barTrack: { height: 8, borderRadius: 4, overflow: 'hidden' },
  barFill: { height: 8, borderRadius: 4 },
  locked: { padding: 20, alignItems: 'center', gap: 6 },
  fabWrap: { position: 'absolute', left: 16, right: 16, alignItems: 'center' },
  fab: {
    width: '100%',
    maxWidth: 480,
    borderRadius: 16,
    paddingVertical: 17,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.18,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  fabText: { fontSize: 17, fontWeight: '700' },
});
