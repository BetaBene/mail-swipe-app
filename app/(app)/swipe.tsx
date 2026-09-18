import { useEffect, useRef } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import SwipeDeck, { SwipeDeckHandle } from '../../components/SwipeDeck';
import SwipeButtons from '../../components/SwipeButtons';
import ProgressHeader from '../../components/ProgressHeader';
import { colors, spacing } from '../../lib/theme';
import { useMailStore } from '../../lib/store/useMailStore';

export default function SwipeScreen() {
  const insets = useSafeAreaInsets();
  const deckRef = useRef<SwipeDeckHandle>(null);
  const cards = useMailStore((s) => s.cards);
  const stats = useMailStore((s) => s.stats);
  const accountEmail = useMailStore((s) => s.accountEmail);
  const loadInitialDeck = useMailStore((s) => s.loadInitialDeck);
  const swipe = useMailStore((s) => s.swipe);

  useEffect(() => {
    if (cards.length === 0) {
      loadInitialDeck();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <View style={[styles.container, { paddingTop: insets.top + spacing.sm }]}>
      <View style={styles.headerRow}>
        <Text style={styles.accountLabel} numberOfLines={1}>
          {accountEmail}
        </Text>
      </View>
      <ProgressHeader stats={stats} />
      <View style={styles.deckArea}>
        <SwipeDeck ref={deckRef} cards={cards} onSwipe={(card, action) => swipe(card.id, action)} />
      </View>
      <SwipeButtons onPress={(action) => deckRef.current?.swipeTop(action)} disabled={cards.length === 0} />
      <Text style={styles.hint}>← löschen · ↑ archivieren · ↓ spam · → behalten</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    paddingHorizontal: spacing.lg,
  },
  headerRow: {
    marginBottom: spacing.xs,
  },
  accountLabel: {
    color: colors.textMuted,
    fontSize: 13,
  },
  deckArea: {
    flex: 1,
    marginBottom: spacing.sm,
  },
  hint: {
    color: colors.textMuted,
    fontSize: 12,
    textAlign: 'center',
    marginBottom: spacing.md,
  },
});
