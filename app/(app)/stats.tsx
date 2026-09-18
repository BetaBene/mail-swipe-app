import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, radius, spacing } from '../../lib/theme';
import { useMailStore } from '../../lib/store/useMailStore';

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

function StatCard({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <View style={styles.card}>
      <Text style={[styles.cardValue, { color }]}>{value}</Text>
      <Text style={styles.cardLabel}>{label}</Text>
    </View>
  );
}

export default function StatsScreen() {
  const insets = useSafeAreaInsets();
  const stats = useMailStore((s) => s.stats);

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={{ paddingTop: insets.top + spacing.lg, paddingBottom: spacing.xl }}
    >
      <Text style={styles.title}>Deine Statistik</Text>

      <View style={styles.streakBanner}>
        <Text style={styles.streakEmoji}>🔥</Text>
        <View>
          <Text style={styles.streakValue}>{stats.currentStreak} Tage Streak</Text>
          <Text style={styles.streakSub}>Rekord: {stats.longestStreak} Tage</Text>
        </View>
      </View>

      <View style={styles.grid}>
        <StatCard label="Insgesamt gewischt" value={String(stats.totalSwiped)} color={colors.primary} />
        <StatCard label="Gelöscht" value={String(stats.totalDeleted)} color={colors.delete} />
        <StatCard label="Archiviert" value={String(stats.totalArchived)} color={colors.archive} />
        <StatCard label="Behalten" value={String(stats.totalKept)} color={colors.keep} />
        <StatCard label="Als Spam markiert" value={String(stats.totalSpam)} color={colors.spam} />
        <StatCard label="Speicher befreit" value={formatBytes(stats.bytesFreed)} color={colors.primary} />
      </View>

      <View style={styles.goalCard}>
        <Text style={styles.goalTitle}>Heutiges Ziel</Text>
        <Text style={styles.goalProgress}>
          {stats.swipedToday} / {stats.dailyGoal} E-Mails
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    paddingHorizontal: spacing.lg,
  },
  title: {
    color: colors.text,
    fontSize: 26,
    fontWeight: '800',
    marginBottom: spacing.lg,
  },
  streakBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    marginBottom: spacing.lg,
  },
  streakEmoji: {
    fontSize: 36,
  },
  streakValue: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '700',
  },
  streakSub: {
    color: colors.textMuted,
    fontSize: 13,
    marginTop: 2,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  card: {
    width: '47%',
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
  },
  cardValue: {
    fontSize: 22,
    fontWeight: '800',
    marginBottom: 4,
  },
  cardLabel: {
    color: colors.textMuted,
    fontSize: 12,
  },
  goalCard: {
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.md,
    padding: spacing.lg,
  },
  goalTitle: {
    color: colors.textMuted,
    fontSize: 13,
    marginBottom: spacing.xs,
  },
  goalProgress: {
    color: colors.text,
    fontSize: 20,
    fontWeight: '700',
  },
});
