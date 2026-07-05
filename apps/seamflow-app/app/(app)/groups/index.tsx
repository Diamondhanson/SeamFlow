import { useEffect } from 'react';
import { Alert, FlatList, Pressable, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import type { GroupOrder, GroupOrderStatus } from '@seamflow/schemas';
import {
  Text,
  Chip,
  IconButton,
  useAtelierTheme,
  press as motionPress,
  type ChipTone,
} from '@seamflow/ui';
import { Screen } from '../../../components/Screen';
import { ScreenHeader } from '../../../components/ScreenHeader';
import { useGroupOrders } from '../../../lib/queries';
import { ApiError } from '../../../lib/api';
import { spacing } from '../../../lib/theme';
import { useFloatingScroll } from '../../../lib/floating-scroll';
import { useTranslation } from '../../../lib/i18n';

const GROUP_STATUS_LABEL_KEY: Record<GroupOrderStatus, string> = {
  planning: 'groups.statusPlanning',
  in_progress: 'groups.statusInProgress',
  completed: 'groups.statusCompleted',
  cancelled: 'groups.statusCancelled',
};

const GROUP_STATUS_TONE: Record<GroupOrderStatus, ChipTone> = {
  planning: 'statusRegistered',
  in_progress: 'statusInProgress',
  completed: 'statusDelivered',
  cancelled: 'danger',
};

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

function GroupCard({ group, onPress }: { group: GroupOrder; onPress: () => void }) {
  const { colors, radii } = useAtelierTheme();
  const { t } = useTranslation();
  const accent = colors[GROUP_STATUS_TONE[group.status]];
  const scale = useSharedValue(1);
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));
  const meta = [
    t(GROUP_STATUS_LABEL_KEY[group.status]),
    group.eventDate
      ? new Date(group.eventDate).toLocaleDateString(undefined, {
          month: 'short',
          day: 'numeric',
        })
      : null,
  ]
    .filter(Boolean)
    .join(' · ');

  return (
    <Animated.View style={animatedStyle}>
      <AnimatedPressable
        onPress={onPress}
        onPressIn={() => {
          scale.value = withSpring(motionPress.scaleTo, motionPress.spring);
        }}
        onPressOut={() => {
          scale.value = withSpring(1, motionPress.spring);
        }}
        accessibilityRole="button"
        style={[
          styles.card,
          {
            backgroundColor: colors.surface,
            borderColor: colors.hairline,
            borderRadius: radii.l,
          },
        ]}
      >
        <View style={[styles.topBar, { backgroundColor: accent }]} />
        <View style={styles.cardInner}>
          <View style={styles.cardHead}>
            <Text variant="h2" numberOfLines={1} style={styles.cardName}>
              {group.name}
            </Text>
            <Chip
              variant="status"
              label={t(GROUP_STATUS_LABEL_KEY[group.status])}
              tone={GROUP_STATUS_TONE[group.status]}
            />
          </View>
          <Text variant="bodySm" tone="textMuted" style={{ marginTop: 4 }}>
            {meta}
          </Text>
        </View>
      </AnimatedPressable>
    </Animated.View>
  );
}

export default function GroupsList() {
  const { data, isLoading, error } = useGroupOrders();
  const { colors } = useAtelierTheme();
  const { t } = useTranslation();
  const scroll = useFloatingScroll();

  useEffect(() => {
    if (error instanceof ApiError && error.isNotFound()) {
      Alert.alert(
        t('groups.profileRequiredTitle'),
        t('groups.profileRequiredMessage'),
        [
          { text: t('common.cancel'), style: 'cancel' },
          { text: t('groups.goToProfile'), onPress: () => router.push('/(app)/me') },
        ],
      );
    }
  }, [error, t]);

  const items = data?.items ?? [];

  return (
    <Screen padded={false}>
      <View style={styles.padded}>
        <ScreenHeader
          title={t('groups.listTitle')}
          subtitle={t('groups.listSubtitle')}
          right={
            <IconButton
              variant="primary"
              onPress={() => router.push('/(app)/groups/new')}
              accessibilityLabel={t('groups.newGroupOrder')}
            >
              <Ionicons name="add" size={24} color={colors.textOnPrimary} />
            </IconButton>
          }
        />
      </View>

      {isLoading && items.length === 0 ? (
        <Text variant="bodySm" tone="textMuted" style={styles.muted}>
          {t('common.loading')}
        </Text>
      ) : items.length === 0 ? (
        <Text variant="bodySm" tone="textMuted" style={styles.muted}>
          {t('groups.noGroupsYet')}
        </Text>
      ) : (
        <FlatList
          {...scroll}
          data={items}
          keyExtractor={(g) => g.id}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          ItemSeparatorComponent={() => <View style={{ height: spacing.md }} />}
          renderItem={({ item }) => (
            <GroupCard
              group={item}
              onPress={() => router.push(`/(app)/groups/${item.id}`)}
            />
          )}
        />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  padded: { paddingHorizontal: spacing.lg, paddingTop: spacing.sm },
  list: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: 96,
  },
  card: { borderWidth: 1, overflow: 'hidden' },
  topBar: { height: 3, width: '100%' },
  cardInner: { padding: spacing.lg },
  cardHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  cardName: { flex: 1 },
  muted: { textAlign: 'center', marginTop: spacing.xl },
});
