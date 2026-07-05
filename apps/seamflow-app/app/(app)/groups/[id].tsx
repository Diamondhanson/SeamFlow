import { useState } from 'react';
import { Alert, ScrollView, StyleSheet, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Text, AvatarStack } from '@seamflow/ui';
import { Screen } from '../../../components/Screen';
import { ScreenHeader } from '../../../components/ScreenHeader';
import { Card, CardLine, CardTitle } from '../../../components/Card';
import { Button } from '../../../components/Button';
import { Input } from '../../../components/Input';
import {
  useAddGroupMember,
  useClients,
  useCopyMemberMeasurements,
  useDeleteGroupMember,
  useDeleteGroupOrder,
  useGroupOrder,
  usePromoteMember,
  useUpdateGroupOrder,
} from '../../../lib/queries';
import { spacing, useThemeColors } from '../../../lib/theme';
import { useFloatingScroll } from '../../../lib/floating-scroll';
import { useTranslation } from '../../../lib/i18n';

export default function GroupDetail() {
  const { t } = useTranslation();
  const { id } = useLocalSearchParams<{ id: string }>();
  const groupQ = useGroupOrder(id);
  const clientsQ = useClients();
  const addMember = useAddGroupMember(id);
  const updateGroup = useUpdateGroupOrder(id);
  const deleteGroup = useDeleteGroupOrder(id);
  const colors = useThemeColors();
  const scroll = useFloatingScroll();

  const [showForm, setShowForm] = useState(false);
  const [memberName, setMemberName] = useState('');
  const [memberRole, setMemberRole] = useState('');
  const [memberClientId, setMemberClientId] = useState<string | null>(null);

  const group = groupQ.data ?? null;
  const clients = clientsQ.data?.items ?? [];

  const onAddMember = () => {
    addMember.mutate(
      {
        fullName: memberName,
        clientId: memberClientId,
        roleLabel: memberRole || null,
        position: group?.members.length ?? 0,
      },
      {
        onSuccess: () => {
          setShowForm(false);
          setMemberName('');
          setMemberRole('');
          setMemberClientId(null);
        },
        onError: (err) =>
          Alert.alert(t('common.error'), err instanceof Error ? err.message : String(err)),
      },
    );
  };

  const onDeleteGroup = () =>
    Alert.alert(
      t('groups.deleteGroupTitle'),
      t('groups.deleteGroupMessage', { name: group?.name ?? '' }),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('common.delete'),
          style: 'destructive',
          onPress: () =>
            deleteGroup.mutate(undefined, {
              onSuccess: () => router.back(),
              onError: (err) =>
                Alert.alert(t('common.error'), err instanceof Error ? err.message : String(err)),
            }),
        },
      ],
    );

  if (groupQ.isLoading || !group) {
    return (
      <Screen>
        <ScreenHeader title={t('groups.groupFallbackTitle')} />
        <Text variant="bodySm" tone="textMuted">{t('common.loading')}</Text>
      </Screen>
    );
  }

  const ownerMember = group.members.find((m) => m.id === group.ownerMemberId) ?? null;

  const setOwner = () => {
    if (group.members.length === 0) {
      Alert.alert(t('groups.noMembersOwnerTitle'), t('groups.noMembersOwnerMessage'));
      return;
    }
    const options = group.members.slice(0, 8).map((m) => ({
      text: m.fullName,
      onPress: () => updateGroup.mutate({ ownerMemberId: m.id }),
    }));
    Alert.alert(t('groups.pickOwnerTitle'), t('groups.pickOwnerMessage'), [
      {
        text: t('groups.clearOwner'),
        onPress: () => updateGroup.mutate({ ownerMemberId: null }),
      },
      ...options,
      { text: t('common.cancel'), style: 'cancel' },
    ]);
  };

  return (
    <Screen>
      <ScreenHeader title={group.name} />
      <ScrollView
        {...scroll}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 96 }}
      >
        {group.members.length > 0 ? (
          <View style={{ marginBottom: spacing.md }}>
            <AvatarStack names={group.members.map((m) => m.fullName)} max={6} />
          </View>
        ) : null}
        {group.description ? (
          <Text variant="bodySm" tone="textMuted">{group.description}</Text>
        ) : null}
        {group.eventDate ? (
          <Text variant="bodySm" tone="textMuted">
            {t('groups.eventLabel', { date: new Date(group.eventDate).toLocaleDateString() })}
          </Text>
        ) : null}
        <Text variant="bodySm" tone="textMuted">{t('groups.statusLabel', { status: group.status })}</Text>

        <View style={[styles.divider, { backgroundColor: colors.hairline }]} />

        <View style={styles.row}>
          <View style={{ flex: 1 }}>
            <Text variant="h3">{t('groups.ownerHeading')}</Text>
            <Text variant="bodySm" tone="textMuted">
              {ownerMember ? ownerMember.fullName : t('groups.ownerNotSet')}
            </Text>
          </View>
          <Button
            label={ownerMember ? t('groups.changeOwner') : t('groups.setOwner')}
            variant="secondary"
            onPress={setOwner}
          />
        </View>

        {group.sharedDesignNotes ? (
          <>
            <Text variant="h3" style={{ marginTop: spacing.lg }}>{t('groups.designNotesHeading')}</Text>
            <Text variant="bodySm" tone="textMuted">{group.sharedDesignNotes}</Text>
          </>
        ) : null}

        <View style={[styles.divider, { backgroundColor: colors.hairline }]} />

        <View style={styles.row}>
          <Text variant="h3">{t('groups.membersCount', { count: group.members.length })}</Text>
          {!showForm ? (
            <Button
              label={t('groups.addShort')}
              variant="secondary"
              onPress={() => setShowForm(true)}
            />
          ) : null}
        </View>

        {group.members.length === 0 && !showForm ? (
          <Text variant="bodySm" tone="textMuted">{t('groups.noMembersYet')}</Text>
        ) : null}

        {group.members.map((m) => (
          <MemberCard key={m.id} memberId={m.id} groupId={id} member={m} />
        ))}

        {showForm ? (
          <Card>
            <Input
              label={t('groups.memberNameRequiredLabel')}
              value={memberName}
              onChangeText={setMemberName}
              placeholder={t('groups.memberNameRequiredPlaceholder')}
            />
            <Input
              label={t('groups.roleLabelLabel')}
              value={memberRole}
              onChangeText={setMemberRole}
              placeholder={t('groups.roleLabelPlaceholder')}
            />
            <Text variant="caption" tone="textMuted" style={{ marginBottom: 4 }}>
              {t('groups.linkExistingClient')}
            </Text>
            <View style={{ marginBottom: spacing.md }}>
              <Button
                label={
                  memberClientId
                    ? t('groups.linkedTo', { name: clients.find((c) => c.id === memberClientId)?.fullName ?? memberClientId })
                    : t('groups.adHocByName')
                }
                variant="secondary"
                onPress={() => {
                  if (clients.length === 0) {
                    Alert.alert(t('groups.noClientsTitle'), t('groups.noClientsMessage'));
                    return;
                  }
                  const options = clients.slice(0, 8).map((c) => ({
                    text: c.fullName,
                    onPress: () => {
                      setMemberClientId(c.id);
                      if (!memberName) setMemberName(c.fullName);
                    },
                  }));
                  Alert.alert(t('groups.pickClientTitle'), undefined, [
                    { text: t('groups.noneOption'), onPress: () => setMemberClientId(null) },
                    ...options,
                    { text: t('common.cancel'), style: 'cancel' },
                  ]);
                }}
              />
            </View>
            <Button
              label={t('groups.addMember')}
              onPress={onAddMember}
              loading={addMember.isPending}
              disabled={!memberName}
            />
            <View style={{ height: spacing.sm }} />
            <Button
              label={t('common.cancel')}
              variant="secondary"
              onPress={() => {
                setShowForm(false);
                setMemberClientId(null);
              }}
            />
          </Card>
        ) : null}

        <View style={[styles.divider, { backgroundColor: colors.hairline }]} />
        <Button label={t('groups.deleteGroupOrder')} variant="danger" onPress={onDeleteGroup} />
      </ScrollView>
    </Screen>
  );
}

function MemberCard({
  memberId,
  groupId,
  member,
}: {
  memberId: string;
  groupId: string;
  member: {
    id: string;
    fullName: string;
    clientId: string | null;
    roleLabel: string | null;
    measurements: Record<string, number>;
  };
}) {
  const { t } = useTranslation();
  const promote = usePromoteMember(memberId, groupId);
  const copyMeasurements = useCopyMemberMeasurements(memberId, groupId);
  const remove = useDeleteGroupMember(memberId, groupId);

  const onPromote = () =>
    Alert.prompt(
      t('groups.promoteTitle', { name: member.fullName }),
      t('groups.promoteMessage'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('groups.promote'),
          onPress: (phone?: string) => {
            if (!phone) return;
            promote.mutate(
              { phone },
              {
                onError: (err) =>
                  Alert.alert(t('common.error'), err instanceof Error ? err.message : String(err)),
              },
            );
          },
        },
      ],
      'plain-text',
    );

  const onCopy = () =>
    copyMeasurements.mutate(undefined, {
      onSuccess: () =>
        Alert.alert(t('groups.copiedTitle'), t('groups.copiedMessage')),
      onError: (err) =>
        Alert.alert(t('common.error'), err instanceof Error ? err.message : String(err)),
    });

  const onRemove = () =>
    Alert.alert(t('groups.removeMemberTitle'), t('groups.removeMemberMessage', { name: member.fullName }), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('common.remove'),
        style: 'destructive',
        onPress: () =>
          remove.mutate(undefined, {
            onError: (err) =>
              Alert.alert(t('common.error'), err instanceof Error ? err.message : String(err)),
          }),
      },
    ]);

  return (
    <Card>
      <CardTitle>{member.fullName}</CardTitle>
      {member.roleLabel ? <CardLine>{member.roleLabel}</CardLine> : null}
      {member.clientId ? (
        <CardLine>{t('groups.linkedToClient')}</CardLine>
      ) : (
        <CardLine>{t('groups.adHocMember')}</CardLine>
      )}
      {Object.keys(member.measurements).length > 0 ? (
        <View style={{ marginTop: spacing.sm }}>
          {Object.entries(member.measurements).map(([k, v]) => (
            <CardLine key={k}>
              {t('groups.measurementLine', { key: k, value: String(v) })}
            </CardLine>
          ))}
        </View>
      ) : (
        <CardLine>{t('groups.noMeasurementsYet')}</CardLine>
      )}
      <View style={{ height: spacing.sm }} />
      {member.clientId ? (
        <Button
          label={t('groups.copyMeasurements')}
          variant="secondary"
          onPress={onCopy}
          loading={copyMeasurements.isPending}
        />
      ) : (
        <Button
          label={t('groups.promoteToClient')}
          variant="secondary"
          onPress={onPromote}
          loading={promote.isPending}
        />
      )}
      <View style={{ height: spacing.sm }} />
      <Button
        label={t('common.remove')}
        variant="danger"
        onPress={onRemove}
        loading={remove.isPending}
      />
    </Card>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  divider: { height: 1, marginVertical: spacing.lg },
});
