import { forwardRef, useImperativeHandle, useMemo } from 'react';
import { Dimensions, StyleSheet, Text, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  Extrapolation,
  interpolate,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import MailCardView from './MailCardView';
import { colors, radius, spacing } from '../lib/theme';
import type { MailCard, SwipeAction } from '../lib/types';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const SWIPE_OUT_DISTANCE = SCREEN_WIDTH * 1.5;
const HORIZONTAL_THRESHOLD = SCREEN_WIDTH * 0.28;
const VERTICAL_THRESHOLD = SCREEN_HEIGHT * 0.16;

export interface SwipeDeckHandle {
  swipeTop: (action: SwipeAction) => void;
}

interface Props {
  cards: MailCard[];
  onSwipe: (card: MailCard, action: SwipeAction) => void;
  visibleCount?: number;
}

const actionForOffset = (dx: number, dy: number): SwipeAction | null => {
  if (Math.abs(dx) > HORIZONTAL_THRESHOLD && Math.abs(dx) > Math.abs(dy)) {
    return dx > 0 ? 'keep' : 'delete';
  }
  if (Math.abs(dy) > VERTICAL_THRESHOLD) {
    return dy < 0 ? 'archive' : 'spam';
  }
  return null;
};

const targetForAction = (action: SwipeAction) => {
  switch (action) {
    case 'keep':
      return { x: SWIPE_OUT_DISTANCE, y: 0 };
    case 'delete':
      return { x: -SWIPE_OUT_DISTANCE, y: 0 };
    case 'archive':
      return { x: 0, y: -SWIPE_OUT_DISTANCE };
    case 'spam':
      return { x: 0, y: SWIPE_OUT_DISTANCE };
  }
};

function TopCard({
  card,
  onDecided,
  registerSwipeFn,
}: {
  card: MailCard;
  onDecided: (action: SwipeAction) => void;
  registerSwipeFn: (fn: (action: SwipeAction) => void) => void;
}) {
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);

  const fireDecision = (action: SwipeAction) => {
    onDecided(action);
  };

  const animateOut = (action: SwipeAction) => {
    const target = targetForAction(action);
    translateX.value = withTiming(target.x, { duration: 260 });
    translateY.value = withTiming(target.y, { duration: 260 }, (finished) => {
      if (finished) runOnJS(fireDecision)(action);
    });
  };

  registerSwipeFn(animateOut);

  const pan = Gesture.Pan()
    .onUpdate((e) => {
      translateX.value = e.translationX;
      translateY.value = e.translationY;
    })
    .onEnd((e) => {
      const action = actionForOffset(e.translationX, e.translationY);
      if (action) {
        runOnJS(Haptics.impactAsync)(Haptics.ImpactFeedbackStyle.Medium);
        const target = targetForAction(action);
        translateX.value = withTiming(target.x, { duration: 220 });
        translateY.value = withTiming(target.y, { duration: 220 }, (finished) => {
          if (finished) runOnJS(fireDecision)(action);
        });
      } else {
        translateX.value = withSpring(0);
        translateY.value = withSpring(0);
      }
    });

  const cardStyle = useAnimatedStyle(() => {
    const rotate = interpolate(
      translateX.value,
      [-SCREEN_WIDTH / 2, SCREEN_WIDTH / 2],
      [-12, 12],
      Extrapolation.CLAMP
    );
    return {
      transform: [
        { translateX: translateX.value },
        { translateY: translateY.value },
        { rotate: `${rotate}deg` },
      ],
    };
  });

  const stampStyle = (kind: SwipeAction) =>
    useAnimatedStyle(() => {
      let opacity = 0;
      if (kind === 'keep') opacity = interpolate(translateX.value, [0, HORIZONTAL_THRESHOLD], [0, 1], Extrapolation.CLAMP);
      if (kind === 'delete') opacity = interpolate(translateX.value, [0, -HORIZONTAL_THRESHOLD], [0, 1], Extrapolation.CLAMP);
      if (kind === 'archive') opacity = interpolate(translateY.value, [0, -VERTICAL_THRESHOLD], [0, 1], Extrapolation.CLAMP);
      if (kind === 'spam') opacity = interpolate(translateY.value, [0, VERTICAL_THRESHOLD], [0, 1], Extrapolation.CLAMP);
      return { opacity };
    });

  const keepStyle = stampStyle('keep');
  const deleteStyle = stampStyle('delete');
  const archiveStyle = stampStyle('archive');
  const spamStyle = stampStyle('spam');

  return (
    <GestureDetector gesture={pan}>
      <Animated.View style={[styles.cardWrapper, cardStyle]}>
        <MailCardView card={card} />
        <Animated.View style={[styles.stamp, styles.stampKeep, keepStyle]}>
          <Text style={styles.stampText}>BEHALTEN</Text>
        </Animated.View>
        <Animated.View style={[styles.stamp, styles.stampDelete, deleteStyle]}>
          <Text style={styles.stampText}>LÖSCHEN</Text>
        </Animated.View>
        <Animated.View style={[styles.stamp, styles.stampArchive, archiveStyle]}>
          <Text style={styles.stampText}>ARCHIV</Text>
        </Animated.View>
        <Animated.View style={[styles.stamp, styles.stampSpam, spamStyle]}>
          <Text style={styles.stampText}>SPAM</Text>
        </Animated.View>
      </Animated.View>
    </GestureDetector>
  );
}

const SwipeDeck = forwardRef<SwipeDeckHandle, Props>(({ cards, onSwipe, visibleCount = 3 }, ref) => {
  const visibleCards = useMemo(() => cards.slice(0, visibleCount), [cards, visibleCount]);
  let topCardSwipeFn: ((action: SwipeAction) => void) | null = null;

  useImperativeHandle(ref, () => ({
    swipeTop: (action) => {
      topCardSwipeFn?.(action);
    },
  }));

  if (visibleCards.length === 0) {
    return (
      <View style={styles.empty}>
        <Text style={styles.emptyTitle}>Postfach aufgeräumt! 🎉</Text>
        <Text style={styles.emptySubtitle}>Neue E-Mails werden automatisch nachgeladen.</Text>
      </View>
    );
  }

  return (
    <View style={styles.deck}>
      {visibleCards
        .map((card, index) => ({ card, index }))
        .reverse()
        .map(({ card, index }) => {
          const isTop = index === 0;
          const scale = 1 - index * 0.04;
          const translateY = index * 10;
          if (isTop) {
            return (
              <TopCard
                key={card.id}
                card={card}
                onDecided={(action) => onSwipe(card, action)}
                registerSwipeFn={(fn) => {
                  topCardSwipeFn = fn;
                }}
              />
            );
          }
          return (
            <View
              key={card.id}
              style={[
                styles.cardWrapper,
                { transform: [{ scale }, { translateY }], opacity: 1 - index * 0.25 },
              ]}
              pointerEvents="none"
            >
              <MailCardView card={card} />
            </View>
          );
        })}
    </View>
  );
});

SwipeDeck.displayName = 'SwipeDeck';
export default SwipeDeck;

const styles = StyleSheet.create({
  deck: {
    flex: 1,
    position: 'relative',
  },
  cardWrapper: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  stamp: {
    position: 'absolute',
    borderWidth: 3,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  stampKeep: {
    top: spacing.lg,
    left: spacing.lg,
    borderColor: colors.keep,
    transform: [{ rotate: '-12deg' }],
  },
  stampDelete: {
    top: spacing.lg,
    right: spacing.lg,
    borderColor: colors.delete,
    transform: [{ rotate: '12deg' }],
  },
  stampArchive: {
    bottom: spacing.lg,
    alignSelf: 'center',
    borderColor: colors.archive,
  },
  stampSpam: {
    top: '50%',
    alignSelf: 'center',
    borderColor: colors.spam,
  },
  stampText: {
    fontWeight: '800',
    fontSize: 18,
    letterSpacing: 1,
    color: colors.text,
  },
  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
  },
  emptyTitle: {
    color: colors.text,
    fontSize: 22,
    fontWeight: '700',
    marginBottom: spacing.sm,
  },
  emptySubtitle: {
    color: colors.textMuted,
    fontSize: 15,
    textAlign: 'center',
  },
});
