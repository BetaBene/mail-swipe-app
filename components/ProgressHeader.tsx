import { StyleSheet, Text, View } from 'react-native';
import { colors, radius, spacing } from '../lib/theme';
import type { UserStats } from '../lib/types';

export default function ProgressHeader({ stats }: { stats: UserStats }) {
  const progress = Math.min(1, stats.swipedToday / Math.max(1, stats.dailyGoal));

  return (
    <View style={styles.container}>
      <View style={styles.topRow}>
        <Text style={styles.streak}>🔥 {stats.currentStreak} Tage Streak</Text>
        <Text style={styles.goalText}>
          {stats.swipedToday}/{stats.dailyGoal} heute
        </Text>
      </View>
      <View style={styles.track}>
        <View style={[styles.fill, { width: `${progress * 100}%` }]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.md,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  streak: {
    color: colors.text,
    fontWeight: '700',
    fontSize: 14,
  },
  goalText: {
    color: colors.textMuted,
    fontSize: 13,
  },
  track: {
    height: 8,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceAlt,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    backgroundColor: colors.primary,
    borderRadius: radius.pill,
  },
});
