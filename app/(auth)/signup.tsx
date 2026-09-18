import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, radius, spacing } from '../../lib/theme';
import { useAuthStore } from '../../lib/store/useAuthStore';

export default function SignupScreen() {
  const insets = useSafeAreaInsets();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const signUpWithPassword = useAuthStore((s) => s.signUpWithPassword);

  const handleSignup = async () => {
    setLoading(true);
    setError(null);
    const err = await signUpWithPassword(email.trim(), password);
    setLoading(false);
    if (err) {
      setError(err);
      return;
    }
    setSuccess(true);
  };

  return (
    <KeyboardAvoidingView
      style={[styles.container, { paddingTop: insets.top + spacing.xl }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <Text style={styles.title}>Konto erstellen</Text>
      <Text style={styles.subtitle}>Für Sync über mehrere Geräte und deinen Fortschritt.</Text>

      {success ? (
        <View>
          <Text style={styles.notice}>
            Fast geschafft! Bitte bestätige deine E-Mail-Adresse über den Link, den wir dir gesendet haben, und melde
            dich anschließend an.
          </Text>
          <Pressable style={styles.primaryButton} onPress={() => router.replace('/(auth)/login')}>
            <Text style={styles.primaryButtonText}>Zur Anmeldung</Text>
          </Pressable>
        </View>
      ) : (
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
            placeholder="Passwort (mind. 8 Zeichen)"
            placeholderTextColor={colors.textMuted}
            secureTextEntry
            value={password}
            onChangeText={setPassword}
          />
          {error ? <Text style={styles.error}>{error}</Text> : null}
          <Pressable style={styles.primaryButton} onPress={handleSignup} disabled={loading}>
            <Text style={styles.primaryButtonText}>{loading ? 'Wird erstellt…' : 'Registrieren'}</Text>
          </Pressable>
          <Pressable onPress={() => router.back()}>
            <Text style={styles.link}>Zurück zur Anmeldung</Text>
          </Pressable>
        </View>
      )}
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
    fontSize: 28,
    fontWeight: '800',
    marginBottom: spacing.xs,
  },
  subtitle: {
    color: colors.textMuted,
    fontSize: 15,
    marginBottom: spacing.xl,
  },
  form: {},
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
  notice: {
    color: colors.textMuted,
    fontSize: 15,
    lineHeight: 22,
    marginBottom: spacing.xl,
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
});
