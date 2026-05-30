import { useState } from 'react';
import { Alert, ScrollView, StyleSheet, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Text } from '@seamflow/ui';
import { Screen } from '../../../components/Screen';
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

export default function GroupDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const groupQ = useGroupOrder(id);
  const clientsQ = useClients();
  const addMember = useAddGroupMember(id);
  const updateGroup = useUpdateGroupOrder(id);
  const deleteGroup = useDeleteGroupOrder(id);
  const colors = useThemeColors();

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
          Alert.alert('Error', err instanceof Error ? err.message : String(err)),
      },
    );
  };

  const onDeleteGroup = () =>
    Alert.alert(
      'Delete group order?',
      `${group?.name} and all its members will be deleted.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () =>
            deleteGroup.mutate(undefined, {
              onSuccess: () => router.back(),
              onError: (err) =>
                Alert.alert('Error', err instanceof Error ? err.message : String(err)),
            }),
        },
      ],
    );

  if (groupQ.isLoading || !group) {
    return (
      <Screen>
        <Text variant="bodySm" tone="textMuted">Loading…</Text>
      </Screen>
    );
  }

  const ownerMember = group.members.find((m) => m.id === group.ownerMemberId) ?? null;

  const setOwner = () => {
    if (group.members.length === 0) {
      Alert.alert('No members', 'Add a member first, then pick an owner.');
      return;
    }
    const options = group.members.slice(0, 8).map((m) => ({
      text: m.fullName,
      onPress: () => updateGroup.mutate({ ownerMemberId: m.id }),
    }));
    Alert.alert('Pick the owner', 'Who is this group for (bride, groom, etc.)?', [
      {
        text: 'Clear owner',
        onPress: () => updateGroup.mutate({ ownerMemberId: null }),
      },
      ...options,
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  return (
    <Screen>
      <ScrollView contentContainerStyle={{ paddingBottom: spacing.xl }}>
        <Text variant="h1">{group.name}</Text>
        {group.description ? (
          <Text variant="bodySm" tone="textMuted">{group.description}</Text>
        ) : null}
        {group.eventDate ? (
          <Text variant="bodySm" tone="textMuted">
            Event: {new Date(group.eventDate).toLocaleDateString()}
          </Text>
        ) : null}
        <Text variant="bodySm" tone="textMuted">Status: {group.status}</Text>

        <View style={[styles.divider, { backgroundColor: colors.border }]} />

        <View style={styles.row}>
          <View style={{ flex: 1 }}>
            <Text variant="h3">Owner</Text>
            <Text variant="bodySm" tone="textMuted">
              {ownerMember ? ownerMember.fullName : 'Not set'}
            </Text>
          </View>
          <Button
            label={ownerMember ? 'Change' : 'Set owner'}
            variant="secondary"
            onPress={setOwner}
          />
        </View>

        {group.sharedDesignNotes ? (
          <>
            <Text variant="h3" style={{ marginTop: spacing.lg }}>Design notes</Text>
            <Text variant="bodySm" tone="textMuted">{group.sharedDesignNotes}</Text>
          </>
        ) : null}

        <View style={[styles.divider, { backgroundColor: colors.border }]} />

        <View style={styles.row}>
          <Text variant="h3">Members ({group.members.length})</Text>
          {!showForm ? (
            <Button
              label="+ Add"
              variant="secondary"
              onPress={() => setShowForm(true)}
            />
          ) : null}
        </View>

        {group.members.length === 0 && !showForm ? (
          <Text variant="bodySm" tone="textMuted">No members yet.</Text>
        ) : null}

        {group.members.map((m) => (
          <MemberCard key={m.id} memberId={m.id} groupId={id} member={m} />
        ))}

        {showForm ? (
          <Card>
            <Input
              label="Member name *"
              value={memberName}
              onChangeText={setMemberName}
              placeholder="Sarah Bridesmaid"
            />
            <Input
              label="Role label"
              value={memberRole}
              onChangeText={setMemberRole}
              placeholder="Maid of Honor"
            />
            <Text variant="caption" tone="textMuted" style={{ marginBottom: 4 }}>
              Link to existing client (optional)
            </Text>
            <View style={{ marginBottom: spacing.md }}>
              <Button
                label={
                  memberClientId
                    ? `Linked: ${clients.find((c) => c.id === memberClientId)?.fullName ?? memberClientId}`
                    : 'None — ad-hoc by name'
                }
                variant="secondary"
                onPress={() => {
                  if (clients.length === 0) {
                    Alert.alert('No clients', 'Create a client first to link.');
                    return;
                  }
                  const options = clients.slice(0, 8).map((c) => ({
                    text: c.fullName,
                    onPress: () => {
                      setMemberClientId(c.id);
                      if (!memberName) setMemberName(c.fullName);
                    },
                  }));
                  Alert.alert('Pick a client', undefined, [
                    { text: 'None', onPress: () => setMemberClientId(null) },
                    ...options,
                    { text: 'Cancel', style: 'cancel' },
                  ]);
                }}
              />
            </View>
            <Button
              label="Add member"
              onPress={onAddMember}
              loading={addMember.isPending}
              disabled={!memberName}
            />
            <View style={{ height: spacing.sm }} />
            <Button
              label="Cancel"
              variant="secondary"
              onPress={() => {
                setShowForm(false);
                setMemberClientId(null);
              }}
            />
          </Card>
        ) : null}

        <View style={[styles.divider, { backgroundColor: colors.border }]} />
        <Button label="Delete group order" variant="danger" onPress={onDeleteGroup} />
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
  const promote = usePromoteMember(memberId, groupId);
  const copyMeasurements = useCopyMemberMeasurements(memberId, groupId);
  const remove = useDeleteGroupMember(memberId, groupId);

  const onPromote = () =>
    Alert.prompt(
      `Promote ${member.fullName} to client`,
      'Enter a phone number for the new client:',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Promote',
          onPress: (phone?: string) => {
            if (!phone) return;
            promote.mutate(
              { phone },
              {
                onError: (err) =>
                  Alert.alert('Error', err instanceof Error ? err.message : String(err)),
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
        Alert.alert('Copied', 'Measurements pulled from the linked client.'),
      onError: (err) =>
        Alert.alert('Error', err instanceof Error ? err.message : String(err)),
    });

  const onRemove = () =>
    Alert.alert('Remove member?', `Remove ${member.fullName} from this group?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: () =>
          remove.mutate(undefined, {
            onError: (err) =>
              Alert.alert('Error', err instanceof Error ? err.message : String(err)),
          }),
      },
    ]);

  return (
    <Card>
      <CardTitle>{member.fullName}</CardTitle>
      {member.roleLabel ? <CardLine>{member.roleLabel}</CardLine> : null}
      {member.clientId ? (
        <CardLine>Linked to client</CardLine>
      ) : (
        <CardLine>Ad-hoc member</CardLine>
      )}
      {Object.keys(member.measurements).length > 0 ? (
        <View style={{ marginTop: spacing.sm }}>
          {Object.entries(member.measurements).map(([k, v]) => (
            <CardLine key={k}>
              {k}: {String(v)} cm
            </CardLine>
          ))}
        </View>
      ) : (
        <CardLine>No measurements yet</CardLine>
      )}
      <View style={{ height: spacing.sm }} />
      {member.clientId ? (
        <Button
          label="Copy measurements from client"
          variant="secondary"
          onPress={onCopy}
          loading={copyMeasurements.isPending}
        />
      ) : (
        <Button
          label="Promote to client"
          variant="secondary"
          onPress={onPromote}
          loading={promote.isPending}
        />
      )}
      <View style={{ height: spacing.sm }} />
      <Button
        label="Remove"
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
