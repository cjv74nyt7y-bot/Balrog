import { useColorScheme } from 'react-native';

const light = {
  background: '#F4F4F6',
  card: '#FFFFFF',
  text: '#15151A',
  textMuted: '#6B6B76',
  border: '#E3E3E8',
  accent: '#5B4BDB',
  accentText: '#FFFFFF',
  hero: '#5B4BDB',
  heroText: '#FFFFFF',
  heroMuted: 'rgba(255,255,255,0.75)',
  danger: '#D93036',
  warning: '#C2410C',
  chip: '#ECECF1',
};

const dark: typeof light = {
  background: '#0E0E12',
  card: '#1A1A21',
  text: '#F2F2F5',
  textMuted: '#9A9AA6',
  border: '#2A2A33',
  accent: '#8B7DFF',
  accentText: '#0E0E12',
  hero: '#2B2466',
  heroText: '#FFFFFF',
  heroMuted: 'rgba(255,255,255,0.7)',
  danger: '#FF6369',
  warning: '#FB923C',
  chip: '#24242D',
};

export type Theme = typeof light;

export function useTheme(): Theme {
  return useColorScheme() === 'dark' ? dark : light;
}
