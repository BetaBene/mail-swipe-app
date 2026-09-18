import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Switch, Text, TextInput, View } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, radius, spacing } from '../../lib/theme';
import { useMailStore } from '../../lib/store/useMailStore';

const PRESETS: { label: string; host: string; port: number }[] = [
  { label: 'GMX', host: 'imap.gmx.net', port: 993 },
  { label: 'Web.de', host: 'imap.web.de', port: 993 },
  { label: 'Gmail', host: 'imap.gmail.com', port: 993 },
  { label: 'Outlook', host: 'outlook.office365.com', port: 993 },
];

export default function ConnectAccountScreen() {
  const insets = useSafeAreaInsets();
  const [email, setEmail] = useState('');
  const [host, setHost] = useState('');
  const [port, setPort] = useState('993');
  const [useTls, setUseTls] = useState(true);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const connectAccount = useMailStore((s) => s.connectAccount);
  const error = useMailStore((s) => s.error);

  const applyPreset = (preset: (typeof PRESETS)[number]) => {
    setHost(preset.host);
    setPort(String(preset.port));
  };

  const handleConnect = async () => {
    setLoading(true);
    const ok = await connectAccount({
      emailAddress: email.trim(),
      imapHost: host.trim(),
      imapPort: Number(port) || 993,
      useTls,
      username: username.trim() || email.trim(),
      password,
    });
    setLoading(false);
    if (ok) {
      router.replace('/(app)/swipe');
    }
  };

  const canSubmit = email && host && port && password && !loading;

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={{ paddingTop: insets.top + spacing.lg, paddingBottom: spacing.xl }}
      >
        <Text style={styles.title}>Postfach verbinden</Text>
        <Text style={styles.subtitle}>
          Wir empfehlen ein App-Passwort statt deines normalen Kontopassworts, falls dein Anbieter das anbietet.
        </Text>

        <View style={styles.presetRow}>
          {PRESETS.map((preset) => (
            <Pressable key={preset.label} style={styles.presetChip} onPress={() => applyPreset(preset)}>
              <Text style={styles.presetChipText}>{preset.label}</Text>
            </Pressable>
          ))}
        </View>

        <TextInput
          style={styles.input}
          placeholder="E-Mail-Adresse"
          placeholderTextColor={colors.textMuted}
          autoCapitalize="none"
          keyboardType="email-address"
          value={email}
          onChangeText={setEmail}
        />
        <TextInput
          style={styles.input}
          placeholder="IMAP-Server (z.B. imap.gmx.net)"
          placeholderTextColor={colors.textMuted}
          autoCapitalize="none"
          value={host}
          onChangeText={setHost}
        />
        <View style={styles.row}>
          <TextInput
            style={[styles.input, styles.rowInput]}
            placeholder="Port"
            placeholderTextColor={colors.textMuted}
            keyboardType="number-pad"
            value={port}
            onChangeText={setPort}
          />
          <View style={styles.tlsRow}>
            <Text style={styles.tlsLabel}>TLS</Text>
            <Switch value={useTls} onValueChange={setUseTls} />
          </View>
        </View>
        <TextInput
          style={styles.input}
          placeholder="Benutzername (falls abweichend von E-Mail)"
          placeholderTextColor={colors.textMuted}
          autoCapitalize="none"
          value={username}
          onChangeText={setUsername}
        />
        <TextInput
          style={styles.input}
          placeholder="Passwort / App-Passwort"
          placeholderTextColor={colors.textMuted}
          secureTextEntry
          value={password}
          onChangeText={setPassword}
        />

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <Pressable
          style={[styles.primaryButton, !canSubmit && styles.primaryButtonDisabled]}
          onPress={handleConnect}
          disabled={!canSubmit}
        >
          <Text style={styles.primaryButtonText}>{loading ? 'Verbinde…' : 'Verbinden & loslegen'}</Text>
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.background },
  container: {
    flex: 1,
    paddingHorizontal: spacing.lg,
  },
  title: {
    color: colors.text,
    fontSize: 26,
    fontWeight: '800',
    marginBottom: spacing.xs,
  },
  subtitle: {
    color: colors.textMuted,
    fontSize: 14,
    lineHeight: 20,
    marginBottom: spacing.lg,
  },
  presetRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  presetChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
  },
  presetChipText: {
    color: colors.text,
    fontSize: 13,
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
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  rowInput: {
    flex: 1,
  },
  tlsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  tlsLabel: {
    color: colors.textMuted,
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
    marginTop: spacing.sm,
  },
  primaryButtonDisabled: {
    opacity: 0.5,
  },
  primaryButtonText: {
    color: colors.text,
    fontWeight: '700',
    fontSize: 16,
  },
});
