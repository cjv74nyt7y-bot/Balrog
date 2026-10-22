import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { PACKAGE_TYPE, type PurchasesPackage } from 'react-native-purchases';

import { Button, Card } from '../components/ui';
import { LEGAL_LINKS } from '../lib/config';
import { fetchPackages, purchase, purchasesAvailable, restore } from '../lib/purchases';
import { useTheme } from '../lib/theme';
import { FREE_LIMIT } from '../lib/types';
import { useAppState } from '../state/AppState';

const FEATURES = [
  { emoji: '♾️', title: 'Unlimited subscriptions', body: `Free plan tracks up to ${FREE_LIMIT}.` },
  { emoji: '📊', title: 'Spending insights', body: 'See which categories cost you the most.' },
  { emoji: '🔔', title: 'Reminders for every renewal', body: 'Never get surprised by a charge again.' },
  { emoji: '❤️', title: 'Support an indie developer', body: 'No ads, no tracking, data stays on your phone.' },
];

function packageLabel(pkg: PurchasesPackage): string {
  switch (pkg.packageType) {
    case PACKAGE_TYPE.LIFETIME:
      return 'Lifetime · pay once';
    case PACKAGE_TYPE.ANNUAL:
      return 'Yearly';
    case PACKAGE_TYPE.MONTHLY:
      return 'Monthly';
    default:
      return pkg.product.title;
  }
}

export default function PaywallScreen() {
  const theme = useTheme();
  const { isPro, setIsPro } = useAppState();
  const [packages, setPackages] = useState<PurchasesPackage[] | null>(purchasesAvailable ? null : []);
  const [selected, setSelected] = useState<PurchasesPackage | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!purchasesAvailable) return;
    fetchPackages()
      .then((pkgs) => {
        setPackages(pkgs);
        setSelected(pkgs.find((p) => p.packageType === PACKAGE_TYPE.LIFETIME) ?? pkgs[0] ?? null);
      })
      .catch((error) => {
        console.warn('Failed to load offerings', error);
        setPackages([]);
      });
  }, []);

  const onPurchase = async () => {
    if (!selected) return;
    setBusy(true);
    try {
      const result = await purchase(selected);
      if (result) {
        setIsPro(true);
        router.back();
      }
    } catch (error: any) {
      Alert.alert('Purchase failed', error?.message ?? 'Please try again.');
    } finally {
      setBusy(false);
    }
  };

  const onRestore = async () => {
    setBusy(true);
    try {
      const restored = await restore();
      setIsPro(restored);
      Alert.alert(restored ? 'Pro restored' : 'Nothing to restore', restored ? 'Thanks for your support!' : 'No previous Pro purchase was found for this Apple ID.');
      if (restored) router.back();
    } catch (error: any) {
      Alert.alert('Restore failed', error?.message ?? 'Please try again.');
    } finally {
      setBusy(false);
    }
  };

  if (isPro) {
    return (
      <View style={[styles.center, { backgroundColor: theme.background }]}>
        <Text style={{ fontSize: 48 }}>🎉</Text>
        <Text style={[styles.title, { color: theme.text }]}>You&apos;re on Pro</Text>
        <Text style={{ color: theme.textMuted }}>Thanks for supporting Renewly.</Text>
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 48 }}>
      <Text style={[styles.title, { color: theme.text }]}>Take control of every renewal</Text>
      <Text style={[styles.subtitle, { color: theme.textMuted }]}>
        One small purchase that pays for itself the first time it stops a charge you forgot about.
      </Text>

      <Card style={{ marginTop: 24, padding: 6 }}>
        {FEATURES.map((f) => (
          <View key={f.title} style={styles.feature}>
            <Text style={styles.featureEmoji}>{f.emoji}</Text>
            <View style={{ flex: 1 }}>
              <Text style={[styles.featureTitle, { color: theme.text }]}>{f.title}</Text>
              <Text style={{ color: theme.textMuted, fontSize: 14 }}>{f.body}</Text>
            </View>
          </View>
        ))}
      </Card>

      <View style={{ marginTop: 24, gap: 10 }}>
        {packages === null ? (
          <ActivityIndicator color={theme.accent} />
        ) : packages.length === 0 ? (
          <Text style={{ color: theme.textMuted, textAlign: 'center' }}>
            {purchasesAvailable
              ? 'Purchases are unavailable right now. Please try again later.'
              : 'In-app purchases are not configured in this build.'}
          </Text>
        ) : (
          packages.map((pkg) => {
            const active = selected?.identifier === pkg.identifier;
            return (
              <Pressable
                key={pkg.identifier}
                onPress={() => setSelected(pkg)}
                style={[
                  styles.package,
                  { borderColor: active ? theme.accent : theme.border, backgroundColor: theme.card },
                ]}
              >
                <Text style={[styles.packageTitle, { color: theme.text }]}>{packageLabel(pkg)}</Text>
                <Text style={[styles.packagePrice, { color: theme.text }]}>{pkg.product.priceString}</Text>
              </Pressable>
            );
          })
        )}
      </View>

      <View style={{ marginTop: 20, gap: 12 }}>
        <Button label={busy ? 'Please wait…' : 'Continue'} onPress={onPurchase} disabled={busy || !selected} />
        {purchasesAvailable ? <Button label="Restore purchases" variant="secondary" onPress={onRestore} disabled={busy} /> : null}
        {__DEV__ && !purchasesAvailable ? (
          <Button
            label="Unlock Pro (development only)"
            variant="secondary"
            onPress={() => {
              setIsPro(true);
              router.back();
            }}
          />
        ) : null}
      </View>

      <View style={styles.legal}>
        <Text style={[styles.link, { color: theme.textMuted }]} onPress={() => Linking.openURL(LEGAL_LINKS.terms)}>
          Terms of Use
        </Text>
        <Text style={{ color: theme.textMuted }}>·</Text>
        <Text style={[styles.link, { color: theme.textMuted }]} onPress={() => Linking.openURL(LEGAL_LINKS.privacy)}>
          Privacy Policy
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 8 },
  title: { fontSize: 28, fontWeight: '800', marginTop: 4 },
  subtitle: { fontSize: 16, marginTop: 8, lineHeight: 22 },
  feature: { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 12 },
  featureEmoji: { fontSize: 24, width: 32, textAlign: 'center' },
  featureTitle: { fontSize: 16, fontWeight: '600' },
  package: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 2,
    borderRadius: 14,
    padding: 16,
  },
  packageTitle: { fontSize: 16, fontWeight: '600' },
  packagePrice: { fontSize: 17, fontWeight: '700' },
  legal: { flexDirection: 'row', justifyContent: 'center', gap: 8, marginTop: 24 },
  link: { textDecorationLine: 'underline', fontSize: 13 },
});
