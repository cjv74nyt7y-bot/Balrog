import Constants from 'expo-constants';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Alert, Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Card, Chip, ChipRow, Section } from '../components/ui';
import { LEGAL_LINKS } from '../lib/config';
import { getNotificationPermission, requestNotificationPermission } from '../lib/notifications';
import { purchasesAvailable, restore } from '../lib/purchases';
import { useTheme } from '../lib/theme';
import { CURRENCIES } from '../lib/types';
import { useAppState } from '../state/AppState';

const REMINDER_HOURS = [8, 9, 12, 18, 20];

function hourLabel(hour: number): string {
  return new Date(2000, 0, 1, hour).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
}

function Row({ label, value, onPress, last }: { label: string; value?: string; onPress?: () => void; last?: boolean }) {
  const theme = useTheme();
  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      style={({ pressed }) => [
        styles.row,
        !last && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: theme.border },
        pressed && { opacity: 0.6 },
      ]}
    >
      <Text style={{ color: onPress && !value ? theme.accent : theme.text, fontSize: 16 }}>{label}</Text>
      {value ? <Text style={{ color: theme.textMuted, fontSize: 16 }}>{value}</Text> : null}
    </Pressable>
  );
}

export default function SettingsScreen() {
  const theme = useTheme();
  const { settings, updateSettings, isPro, setIsPro, refreshReminders } = useAppState();
  const [permission, setPermission] = useState<'granted' | 'denied' | 'undetermined'>('undetermined');

  useFocusEffect(
    useCallback(() => {
      getNotificationPermission().then(setPermission);
    }, []),
  );

  const enableNotifications = async () => {
    if (permission === 'denied') {
      Linking.openSettings();
      return;
    }
    const granted = await requestNotificationPermission();
    setPermission(granted ? 'granted' : 'denied');
    if (granted) refreshReminders();
  };

  const onRestore = async () => {
    try {
      const restored = await restore();
      setIsPro(restored);
      Alert.alert(restored ? 'Pro restored' : 'Nothing to restore');
    } catch (error: any) {
      Alert.alert('Restore failed', error?.message ?? 'Please try again.');
    }
  };

  return (
    <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 48 }}>
      <Section title="Plan" style={{ marginTop: 0 }}>
        <Card>
          <Row label="Renewly Pro" value={isPro ? 'Active' : 'Not active'} last={isPro || !purchasesAvailable} />
          {!isPro ? <Row label="Upgrade to Pro" onPress={() => router.push('/paywall')} last={!purchasesAvailable} /> : null}
          {!isPro && purchasesAvailable ? <Row label="Restore purchases" onPress={onRestore} last /> : null}
        </Card>
      </Section>

      <Section title="Reminders">
        <Card>
          <Row
            label="Notifications"
            value={permission === 'granted' ? 'On' : permission === 'denied' ? 'Off' : undefined}
            onPress={permission === 'granted' ? undefined : enableNotifications}
            last
          />
        </Card>
        {permission === 'denied' ? (
          <Text style={[styles.hint, { color: theme.textMuted }]}>Notifications are off. Tap to open Settings and allow them.</Text>
        ) : permission === 'undetermined' ? (
          <Text style={[styles.hint, { color: theme.accent }]} onPress={enableNotifications}>
            Turn on notifications to get renewal reminders.
          </Text>
        ) : null}
        <Text style={[styles.subheading, { color: theme.textMuted }]}>Deliver reminders at</Text>
        <ChipRow>
          {REMINDER_HOURS.map((hour) => (
            <Chip
              key={hour}
              label={hourLabel(hour)}
              selected={settings.reminderHour === hour}
              onPress={() => updateSettings({ reminderHour: hour })}
            />
          ))}
        </ChipRow>
      </Section>

      <Section title="Currency">
        <ChipRow>
          {CURRENCIES.map((code) => (
            <Chip key={code} label={code} selected={settings.currency === code} onPress={() => updateSettings({ currency: code })} />
          ))}
        </ChipRow>
      </Section>

      <Section title="About">
        <Card>
          <Row label="Privacy Policy" onPress={() => Linking.openURL(LEGAL_LINKS.privacy)} />
          <Row label="Terms of Use" onPress={() => Linking.openURL(LEGAL_LINKS.terms)} />
          <Row label="Contact support" onPress={() => Linking.openURL(LEGAL_LINKS.support)} />
          <Row label="Version" value={Constants.expoConfig?.version ?? '1.0.0'} last />
        </Card>
        <Text style={[styles.hint, { color: theme.textMuted }]}>
          Your subscriptions are stored only on this device. Renewly has no account, no ads and no tracking.
        </Text>
      </Section>
      <View style={{ height: 24 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 14,
    minHeight: 50,
  },
  hint: { marginTop: 8, marginHorizontal: 4, fontSize: 13, lineHeight: 18 },
  subheading: { marginTop: 16, marginBottom: 8, marginLeft: 4, fontSize: 14 },
});
