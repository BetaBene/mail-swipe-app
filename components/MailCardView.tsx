import { StyleSheet, Text, View } from 'react-native';
import { colors, radius, spacing } from '../lib/theme';
import type { MailCard } from '../lib/types';

function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  const letters = parts.slice(0, 2).map((p) => p[0]?.toUpperCase() ?? '');
  return letters.join('') || '?';
}

function formatRelativeDate(iso: string): string {
  const date = new Date(iso);
  const diffMs = Date.now() - date.getTime();
  const days = Math.floor(diffMs / 86_400_000);
  if (days <= 0) return 'Heute';
  if (days === 1) return 'Gestern';
  if (days < 30) return `vor ${days} Tagen`;
  const months = Math.floor(days / 30);
  return `vor ${months} Monat${months > 1 ? 'en' : ''}`;
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function MailCardView({ card }: { card: MailCard }) {
  return (
    <View style={styles.card}>
      <View style={styles.headerRow}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{initials(card.fromName)}</Text>
        </View>
        <View style={styles.headerText}>
          <Text style={styles.fromName} numberOfLines={1}>
            {card.fromName}
          </Text>
          <Text style={styles.fromAddress} numberOfLines={1}>
            {card.fromAddress}
          </Text>
        </View>
        {card.isUnread ? <View style={styles.unreadDot} /> : null}
      </View>

      <Text style={styles.subject} numberOfLines={2}>
        {card.subject}
      </Text>
      <Text style={styles.snippet} numberOfLines={5}>
        {card.snippet}
      </Text>

      <View style={styles.footerRow}>
        <Text style={styles.metaText}>{formatRelativeDate(card.receivedAt)}</Text>
        <Text style={styles.metaText}>{formatSize(card.sizeBytes)}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  avatarText: {
    color: colors.primary,
    fontWeight: '700',
    fontSize: 16,
  },
  headerText: {
    flex: 1,
  },
  fromName: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '700',
  },
  fromAddress: {
    color: colors.textMuted,
    fontSize: 13,
    marginTop: 2,
  },
  unreadDot: {
    width: 10,
    height: 10,
    borderRadius: radius.pill,
    backgroundColor: colors.archive,
  },
  subject: {
    color: colors.text,
    fontSize: 20,
    fontWeight: '700',
    marginBottom: spacing.sm,
  },
  snippet: {
    color: colors.textMuted,
    fontSize: 15,
    lineHeight: 22,
    flex: 1,
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    marginTop: spacing.md,
  },
  metaText: {
    color: colors.textMuted,
    fontSize: 12,
  },
});
