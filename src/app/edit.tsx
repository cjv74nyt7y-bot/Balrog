import * as Haptics from 'expo-haptics';
import { Stack, router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { DateField } from '../components/DateField';
import { Button, Card, Chip, ChipRow, Section } from '../components/ui';
import { describeDue, formatISODate, monthlyCost, nextRenewal } from '../lib/billing';
import { createId, formatMoney, parsePrice } from '../lib/format';
import { requestNotificationPermission } from '../lib/notifications';
import { useTheme } from '../lib/theme';
import {
  CATEGORIES,
  COLORS,
  CYCLES,
  REMINDER_OPTIONS,
  type BillingCycle,
  type Category,
  type Subscription,
} from '../lib/types';
import { useAppState } from '../state/AppState';

const PRESETS: { name: string; category: Category; color: string }[] = [
  { name: 'Netflix', category: 'entertainment', color: '#E5484D' },
  { name: 'Spotify', category: 'music', color: '#30A46C' },
  { name: 'YouTube Premium', category: 'entertainment', color: '#E5484D' },
  { name: 'Disney+', category: 'entertainment', color: '#0090FF' },
  { name: 'iCloud+', category: 'utilities', color: '#0090FF' },
  { name: 'Amazon Prime', category: 'entertainment', color: '#12A594' },
  { name: 'ChatGPT', category: 'productivity', color: '#12A594' },
  { name: 'Gym', category: 'health', color: '#F76B15' },
  { name: 'Xbox Game Pass', category: 'gaming', color: '#30A46C' },
  { name: 'Phone plan', category: 'utilities', color: '#6E56CF' },
];

export default function EditScreen() {
  const theme = useTheme();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const { subscriptions, settings, upsert, remove, refreshReminders } = useAppState();
  const existing = subscriptions.find((s) => s.id === id);

  const [name, setName] = useState(existing?.name ?? '');
  const [price, setPrice] = useState(existing ? String(existing.price) : '');
  const [cycle, setCycle] = useState<BillingCycle>(existing?.cycle ?? 'monthly');
  const [startDate, setStartDate] = useState(existing?.startDate ?? formatISODate(new Date()));
  const [category, setCategory] = useState<Category>(existing?.category ?? 'entertainment');
  const [color, setColor] = useState(existing?.color ?? COLORS[5]);
  const [reminderDays, setReminderDays] = useState<number | null>(existing ? existing.reminderDays : 1);
  const [notes, setNotes] = useState(existing?.notes ?? '');

  const parsedPrice = parsePrice(price);
  const valid = name.trim().length > 0 && parsedPrice !== null && parsedPrice > 0;
  const preview: Pick<Subscription, 'price' | 'cycle' | 'startDate'> = { price: parsedPrice ?? 0, cycle, startDate };

  const save = async () => {
    if (!valid) return;
    upsert({
      id: existing?.id ?? createId(),
      name: name.trim(),
      price: parsedPrice!,
      cycle,
      startDate,
      category,
      color,
      reminderDays,
      notes: notes.trim() || undefined,
    });
    if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    router.back();
    if (reminderDays !== null && (await requestNotificationPermission())) refreshReminders();
  };

  const confirmDelete = () => {
    if (!existing) return;
    const doDelete = () => {
      remove(existing.id);
      router.back();
    };
    if (Platform.OS === 'web') {
      doDelete();
      return;
    }
    Alert.alert(`Delete ${existing.name}?`, 'Its reminders will be cancelled too.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: doDelete },
    ]);
  };

  const inputStyle = [styles.input, { color: theme.text }];

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Stack.Screen
        options={{
          title: existing ? 'Edit subscription' : 'New subscription',
          headerLeft: () => (
            <Pressable onPress={() => router.back()} hitSlop={12}>
              <Text style={{ color: theme.accent, fontSize: 17 }}>Cancel</Text>
            </Pressable>
          ),
          headerRight: () => (
            <Pressable onPress={save} disabled={!valid} hitSlop={12}>
              <Text style={{ color: valid ? theme.accent : theme.textMuted, fontSize: 17, fontWeight: '600' }}>Save</Text>
            </Pressable>
          ),
        }}
      />
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 48 }} keyboardShouldPersistTaps="handled">
        {!existing && !name ? (
          <Section title="Popular" style={{ marginTop: 0 }}>
            <ChipRow>
              {PRESETS.map((preset) => (
                <Chip
                  key={preset.name}
                  label={preset.name}
                  selected={false}
                  onPress={() => {
                    setName(preset.name);
                    setCategory(preset.category);
                    setColor(preset.color);
                  }}
                />
              ))}
            </ChipRow>
          </Section>
        ) : null}

        <Section title="Details" style={!existing && !name ? undefined : { marginTop: 0 }}>
          <Card>
            <View style={styles.fieldRow}>
              <Text style={[styles.label, { color: theme.text }]}>Name</Text>
              <TextInput
                value={name}
                onChangeText={setName}
                placeholder="e.g. Netflix"
                placeholderTextColor={theme.textMuted}
                style={inputStyle}
                autoFocus={!existing}
                returnKeyType="next"
              />
            </View>
            <View style={[styles.fieldRow, styles.divider, { borderTopColor: theme.border }]}>
              <Text style={[styles.label, { color: theme.text }]}>Price ({settings.currency})</Text>
              <TextInput
                value={price}
                onChangeText={setPrice}
                placeholder="0.00"
                placeholderTextColor={theme.textMuted}
                keyboardType="decimal-pad"
                style={inputStyle}
              />
            </View>
            <View style={[styles.fieldRow, styles.divider, { borderTopColor: theme.border }]}>
              <Text style={[styles.label, { color: theme.text }]}>First payment</Text>
              <DateField value={startDate} onChange={setStartDate} />
            </View>
          </Card>
        </Section>

        <Section title="Billed">
          <ChipRow>
            {CYCLES.map((c) => (
              <Chip key={c.value} label={c.label} selected={cycle === c.value} onPress={() => setCycle(c.value)} />
            ))}
          </ChipRow>
          {parsedPrice ? (
            <Text style={[styles.hint, { color: theme.textMuted }]}>
              Next charge: {describeDue(nextRenewal(preview))} · about{' '}
              {formatMoney(monthlyCost(preview), settings.currency)} per month
            </Text>
          ) : null}
        </Section>

        <Section title="Remind me">
          <ChipRow>
            {REMINDER_OPTIONS.map((option) => (
              <Chip
                key={option.label}
                label={option.label}
                selected={reminderDays === option.value}
                onPress={() => setReminderDays(option.value)}
              />
            ))}
          </ChipRow>
        </Section>

        <Section title="Category">
          <ChipRow>
            {CATEGORIES.map((c) => (
              <Chip
                key={c.value}
                label={`${c.emoji} ${c.label}`}
                selected={category === c.value}
                onPress={() => setCategory(c.value)}
              />
            ))}
          </ChipRow>
        </Section>

        <Section title="Color">
          <View style={styles.colors}>
            {COLORS.map((c) => (
              <Pressable
                key={c}
                onPress={() => setColor(c)}
                accessibilityLabel={`Color ${c}`}
                accessibilityState={{ selected: color === c }}
                style={[styles.swatch, { backgroundColor: c }, color === c && { borderColor: theme.text, borderWidth: 3 }]}
              />
            ))}
          </View>
        </Section>

        <Section title="Notes">
          <Card>
            <TextInput
              value={notes}
              onChangeText={setNotes}
              placeholder="Account email, family plan, how to cancel…"
              placeholderTextColor={theme.textMuted}
              multiline
              style={[styles.notes, { color: theme.text }]}
            />
          </Card>
        </Section>

        <View style={{ marginTop: 32, gap: 12 }}>
          <Button label={existing ? 'Save changes' : 'Add subscription'} onPress={save} disabled={!valid} />
          {existing ? <Button label="Delete subscription" variant="danger" onPress={confirmDelete} /> : null}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  fieldRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    minHeight: 52,
    gap: 12,
  },
  divider: { borderTopWidth: StyleSheet.hairlineWidth },
  label: { fontSize: 16, flexShrink: 0 },
  input: { flex: 1, flexBasis: 0, minWidth: 0, fontSize: 16, textAlign: 'right', paddingVertical: 14 },
  hint: { marginTop: 10, marginLeft: 4, fontSize: 14 },
  colors: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  swatch: { width: 36, height: 36, borderRadius: 18, borderColor: 'transparent', borderWidth: 3 },
  notes: { minHeight: 80, padding: 14, fontSize: 16, textAlignVertical: 'top' },
});
