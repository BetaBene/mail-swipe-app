import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { Redirect } from 'expo-router';
import { colors } from '../lib/theme';
import { useAuthStore, useIsAuthenticated } from '../lib/store/useAuthStore';
import { useMailStore } from '../lib/store/useMailStore';

export default function Index() {
  const initializing = useAuthStore((s) => s.initializing);
  const isAuthenticated = useIsAuthenticated();
  const accountId = useMailStore((s) => s.accountId);

  if (initializing) {
    return (
      <View style={styles.container}>
        <ActivityIndicator color={colors.primary} size="large" />
      </View>
    );
  }

  if (!isAuthenticated) {
    return <Redirect href="/(auth)/login" />;
  }

  if (!accountId) {
    return <Redirect href="/onboarding/connect-account" />;
  }

  return <Redirect href="/(app)/swipe" />;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
  },
});
