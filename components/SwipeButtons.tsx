import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, radius, spacing } from '../lib/theme';
import type { SwipeAction } from '../lib/types';

interface Props {
  onPress: (action: SwipeAction) => void;
  disabled?: boolean;
}

const buttons: { action: SwipeAction; label: string; color: string }[] = [
  { action: 'delete', label: '✕', color: colors.delete },
  { action: 'spam', label: '⚠', color: colors.spam },
  { action: 'archive', label: '⬆', color: colors.archive },
  { action: 'keep', label: '♥', color: colors.keep },
];

export default function SwipeButtons({ onPress, disabled }: Props) {
  return (
    <View style={styles.row}>
      {buttons.map((b) => (
        <Pressable
          key={b.action}
          disabled={disabled}
          onPress={() => onPress(b.action)}
          style={({ pressed }) => [
            styles.button,
            { borderColor: b.color, opacity: disabled ? 0.4 : pressed ? 0.7 : 1 },
          ]}
        >
          <Text style={[styles.buttonLabel, { color: b.color }]}>{b.label}</Text>
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    justifyContent: 'space-evenly',
    alignItems: 'center',
    paddingVertical: spacing.md,
  },
  button: {
    width: 56,
    height: 56,
    borderRadius: radius.pill,
    borderWidth: 2,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonLabel: {
    fontSize: 24,
    fontWeight: '700',
  },
});
