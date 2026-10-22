import DateTimePicker, { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import { useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, TextInput } from 'react-native';

import { formatISODate, isValidISODate, parseDate } from '../lib/billing';
import { useTheme } from '../lib/theme';

/** A calendar date input that reads and writes `YYYY-MM-DD`. */
export function DateField({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  const theme = useTheme();
  const [draft, setDraft] = useState(value);
  const [synced, setSynced] = useState(value);
  if (value !== synced) {
    setSynced(value);
    setDraft(value);
  }

  if (Platform.OS === 'ios') {
    return (
      <DateTimePicker
        value={parseDate(value)}
        mode="date"
        display="compact"
        accentColor={theme.accent}
        onChange={(_, date) => date && onChange(formatISODate(date))}
      />
    );
  }

  if (Platform.OS === 'android') {
    const open = () =>
      DateTimePickerAndroid.open({
        value: parseDate(value),
        mode: 'date',
        onChange: (event, date) => {
          if (event.type === 'set' && date) onChange(formatISODate(date));
        },
      });
    return (
      <Pressable onPress={open} style={[styles.box, { backgroundColor: theme.chip }]}>
        <Text style={{ color: theme.text, fontSize: 16 }}>
          {parseDate(value).toLocaleDateString(undefined, { dateStyle: 'medium' })}
        </Text>
      </Pressable>
    );
  }

  // Web (used for previews): plain text input.
  return (
    <TextInput
      value={draft}
      onChangeText={(text) => {
        setDraft(text);
        if (isValidISODate(text)) onChange(text);
      }}
      placeholder="YYYY-MM-DD"
      placeholderTextColor={theme.textMuted}
      style={[styles.box, { backgroundColor: theme.chip, color: theme.text }]}
    />
  );
}

const styles = StyleSheet.create({
  box: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, minWidth: 130, fontSize: 16 },
});
