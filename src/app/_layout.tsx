import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useColorScheme } from 'react-native';

import { useTheme } from '../lib/theme';
import { AppStateProvider } from '../state/AppState';

export default function RootLayout() {
  const theme = useTheme();
  const scheme = useColorScheme();
  return (
    <AppStateProvider>
      <StatusBar style={scheme === 'dark' ? 'light' : 'dark'} />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: theme.background },
          headerTintColor: theme.accent,
          headerTitleStyle: { color: theme.text },
          headerShadowVisible: false,
          contentStyle: { backgroundColor: theme.background },
        }}
      >
        <Stack.Screen name="index" options={{ title: 'Renewly', headerLargeTitle: true }} />
        <Stack.Screen name="edit" options={{ presentation: 'modal', title: 'Subscription' }} />
        <Stack.Screen name="paywall" options={{ presentation: 'modal', title: 'Renewly Pro' }} />
        <Stack.Screen name="settings" options={{ title: 'Settings' }} />
      </Stack>
    </AppStateProvider>
  );
}
