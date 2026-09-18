import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, radius, spacing } from '../../lib/theme';
import { useAuthStore } from '../../lib/store/useAuthStore';
import { useMailStore } from '../../lib/store/useMailStore';
import { isSupabaseConfigured } from '../../lib/supabase';

export default function LoginScreen() {
  const insets = useSafeAreaInsets();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const signInWithPassword = useAuthStore((s) => s.signInWithPassword);
  const enterMockMode = useAuthStore((s) => s.enterMockMode);
  const enterMailMockMode = useMailStore((s) => s.enterMockMode);

  const handleLogin = async () => {
    setLoading(true);
    setError(null);
    const err = await signInWithPassword(email.trim(), password);
    setLoading(false);
    if (err) {
      setError(err);
      return;
    }
    router.replace('/');
  };

  const handleDemo = () => {
    enterMockMode();
    enterMailMockMode();
    router.replace('/(app)/swipe');
  };

  return (
    <KeyboardAvoidingView
      style={[styles.container, { paddingTop: insets.top + spacing.xl }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <Text style={styles.title}>MailSwipe</Text>
      <Text style={styles.subtitle}>Postfach aufräumen. Ein Wisch nach dem anderen.</Text>

      {isSupabaseConfigured ? (
        <View style={styles.form}>
          <TextInput
            style={styles.input}
            placeholder="E-Mail"
            placeholderTextColor={colors.textMuted}
            autoCapitalize="none"
            keyboardType="email-address"
            value={email}
            onChangeText={setEmail}
          />
          <TextInput
            style={styles.input}
            placeholder="Passwort"
            placeholderTextColor={colors.textMuted}
            secureTextEntry
            value={password}
            onChangeText={setPassword}
          />
          {error ? <Text style={styles.error}>{error}</Text> : null}
          <Pressable style={styles.primaryButton} onPress={handleLogin} disabled={loading}>
            <Text style={styles.primaryButtonText}>{loading ? 'Anmelden…' : 'Anmelden'}</Text>
          </Pressable>
          <Pressable onPress={() => router.push('/(auth)/signup')}>
            <Text style={styles.link}>Noch kein Konto? Registrieren</Text>
          </Pressable>
        </View>
      ) : (
        <Text style={styles.notice}>
          Supabase ist noch nicht konfiguriert (EXPO_PUBLIC_SUPABASE_URL / ANON_KEY fehlen). Du kannst die App trotzdem im
          Demo-Modus mit Beispiel-E-Mails ausprobieren.
        </Text>
      )}

      <Pressable style={styles.demoButton} onPress={handleDemo}>
        <Text style={styles.demoButtonText}>Demo-Modus starten (ohne Postfach)</Text>
      </Pressable>
    </KeyboardAvoidingView>
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
    fontSize: 34,
    fontWeight: '800',
    marginBottom: spacing.xs,
  },
  subtitle: {
    color: colors.textMuted,
    fontSize: 15,
    marginBottom: spacing.xl,
  },
  form: {
    marginBottom: spacing.lg,
  },
  input: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    color: colors.text,
    marginBottom: spacing.md,
    fontSize: 15,
  },
  error: {
    color: colors.delete,
    marginBottom: spacing.md,
  },
  primaryButton: {
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  primaryButtonText: {
    color: colors.text,
    fontWeight: '700',
    fontSize: 16,
  },
  link: {
    color: colors.archive,
    textAlign: 'center',
  },
  notice: {
    color: colors.textMuted,
    fontSize: 14,
    lineHeight: 20,
    marginBottom: spacing.lg,
  },
  demoButton: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    alignItems: 'center',
    marginTop: 'auto',
    marginBottom: spacing.xl,
  },
  demoButtonText: {
    color: colors.text,
    fontWeight: '600',
  },
});
