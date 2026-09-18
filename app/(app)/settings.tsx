import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, radius, spacing } from '../../lib/theme';
import { useAuthStore } from '../../lib/store/useAuthStore';
import { useMailStore } from '../../lib/store/useMailStore';

export default function SettingsScreen() {
  const insets = useSafeAreaInsets();
  const accountEmail = useMailStore((s) => s.accountEmail);
  const mockMode = useMailStore((s) => s.mockMode);
  const resetMail = useMailStore((s) => s.reset);
  const signOut = useAuthStore((s) => s.signOut);

  const handleSignOut = async () => {
    resetMail();
    await signOut();
    router.replace('/(auth)/login');
  };

  const handleReconnect = () => {
    resetMail();
    router.replace('/onboarding/connect-account');
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={{ paddingTop: insets.top + spacing.lg, paddingBottom: spacing.xl }}
    >
      <Text style={styles.title}>Einstellungen</Text>

      <View style={styles.card}>
        <Text style={styles.cardLabel}>Verbundenes Postfach</Text>
        <Text style={styles.cardValue}>{accountEmail ?? '–'}</Text>
        {mockMode ? <Text style={styles.mockBadge}>Demo-Modus</Text> : null}
      </View>

      <Pressable style={styles.actionButton} onPress={handleReconnect}>
        <Text style={styles.actionText}>Anderes Postfach verbinden</Text>
      </Pressable>

      <Pressable style={[styles.actionButton, styles.dangerButton]} onPress={handleSignOut}>
        <Text style={[styles.actionText, styles.dangerText]}>Abmelden</Text>
      </Pressable>

      <Text style={styles.footer}>MailSwipe · Wische dein Postfach sauber</Text>
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
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    marginBottom: spacing.lg,
  },
  cardLabel: {
    color: colors.textMuted,
    fontSize: 12,
    marginBottom: spacing.xs,
  },
  cardValue: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '600',
  },
  mockBadge: {
    marginTop: spacing.sm,
    alignSelf: 'flex-start',
    backgroundColor: colors.surfaceAlt,
    color: colors.primary,
    fontSize: 11,
    fontWeight: '700',
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radius.pill,
  },
  actionButton: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  actionText: {
    color: colors.text,
    fontWeight: '600',
  },
  dangerButton: {
    borderColor: colors.delete,
  },
  dangerText: {
    color: colors.delete,
  },
  footer: {
    color: colors.textMuted,
    fontSize: 12,
    textAlign: 'center',
    marginTop: spacing.xl,
  },
});
