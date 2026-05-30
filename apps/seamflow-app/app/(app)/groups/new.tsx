import { useMemo, useState } from 'react';
import {
  Alert,
  FlatList,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { router } from 'expo-router';
import type { GroupOrderWithMembersCreateInput } from '@seamflow/schemas';
import { Text } from '@seamflow/ui';
import { Screen } from '../../../components/Screen';
import { Input } from '../../../components/Input';
import { DateField } from '../../../components/DateField';
import { Button } from '../../../components/Button';
import { Card, CardTitle } from '../../../components/Card';
import {
  useClients,
  useCreateGroupOrderWithMembers,
} from '../../../lib/queries';
import { radii, spacing, useThemeColors } from '../../../lib/theme';

// ============================================================================
// New group order — atomic create flow.
//
// One form captures everything: title, owner (either picked from the client
// list or entered inline), and any number of inline members. On submit we
// hit POST /group-orders/with-members which runs the whole tree in a single
// server-side transaction. Editing members or changing the owner later goes
// through the group detail screen.
// ============================================================================

type OwnerMode = 'existing' | 'new';

interface DraftMember {
  // local-only id for the list key; the server assigns the real UUID on insert.
  localId: string;
  fullName: string;
  roleLabel: string;
}

function newLocalId(): string {
  return `m_${Math.random().toString(36).slice(2, 10)}`;
}

export default function NewGroup() {
  const colors = useThemeColors();
  // ----- form state -----
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [sharedDesignNotes, setSharedDesignNotes] = useState('');
  const [eventDate, setEventDate] = useState<Date | null>(null);
  const [dateDelivery, setDateDelivery] = useState<Date | null>(null);

  // ----- owner state -----
  const [ownerMode, setOwnerMode] = useState<OwnerMode>('new');
  const [ownerFullName, setOwnerFullName] = useState('');
  const [ownerPhone, setOwnerPhone] = useState('');
  const [ownerAddress, setOwnerAddress] = useState('');
  const [pickedClientId, setPickedClientId] = useState<string | null>(null);
  const [clientSearch, setClientSearch] = useState('');

  // ----- members state -----
  const [members, setMembers] = useState<DraftMember[]>([]);
  const [memberDraftName, setMemberDraftName] = useState('');
  const [memberDraftRole, setMemberDraftRole] = useState('');

  // ----- data + mutation -----
  const clientsQ = useClients(clientSearch);
  const create = useCreateGroupOrderWithMembers();

  // Validation: title required + a valid owner shape.
  const ownerValid =
    ownerMode === 'existing'
      ? !!pickedClientId
      : !!ownerFullName.trim() && !!ownerPhone.trim() && !!ownerAddress.trim();
  const canSubmit = !!name.trim() && ownerValid && !create.isPending;

  const pickedClient = useMemo(
    () => clientsQ.data?.items.find((c) => c.id === pickedClientId) ?? null,
    [clientsQ.data, pickedClientId],
  );

  // ----- members helpers -----
  const addMember = () => {
    const trimmed = memberDraftName.trim();
    if (!trimmed) return;
    setMembers((m) => [
      ...m,
      {
        localId: newLocalId(),
        fullName: trimmed,
        roleLabel: memberDraftRole.trim(),
      },
    ]);
    setMemberDraftName('');
    setMemberDraftRole('');
  };

  const removeMember = (localId: string) =>
    setMembers((m) => m.filter((x) => x.localId !== localId));

  // ----- submit -----
  const submit = () => {
    if (!canSubmit) return;

    const payload: GroupOrderWithMembersCreateInput = {
      name: name.trim(),
      description: description.trim() || null,
      sharedDesignNotes: sharedDesignNotes.trim() || null,
      eventDate: eventDate ? eventDate.toISOString() : null,
      dateDelivery: dateDelivery ? dateDelivery.toISOString() : null,
      owner:
        ownerMode === 'existing'
          ? { existingClientId: pickedClientId! }
          : {
              newContact: {
                fullName: ownerFullName.trim(),
                phone: ownerPhone.trim(),
                address: ownerAddress.trim(),
              },
            },
      members: members.map((m) => ({
        fullName: m.fullName,
        roleLabel: m.roleLabel || null,
      })),
    };

    create.mutate(payload, {
      onSuccess: (g) => {
        router.dismiss();
        router.push(`/(app)/groups/${g.id}`);
      },
      onError: (err) =>
        Alert.alert('Error', err instanceof Error ? err.message : String(err)),
    });
  };

  return (
    <Screen>
      <ScrollView contentContainerStyle={{ paddingBottom: spacing.xl }}>
        {/* ---------- 1. Title ---------- */}
        <Text variant="h3" tone="text" style={styles.section}>1. Title</Text>
        <Input
          label="Group title *"
          value={name}
          onChangeText={setName}
          placeholder="e.g. Adekunle Wedding"
        />

        <View style={[styles.divider, { backgroundColor: colors.border }]} />

        {/* ---------- 2. Owner ---------- */}
        <Text variant="h3" tone="text" style={styles.section}>2. Owner</Text>
        <View style={[styles.tabs, { borderBottomColor: colors.border }]}>
          <Pressable
            style={[
              styles.tab,
              ownerMode === 'new' && { borderBottomColor: colors.accent },
            ]}
            onPress={() => setOwnerMode('new')}
          >
            <Text
              variant="bodySm"
              tone={ownerMode === 'new' ? 'text' : 'textMuted'}
              style={styles.tabText}
            >
              New contact
            </Text>
          </Pressable>
          <Pressable
            style={[
              styles.tab,
              ownerMode === 'existing' && { borderBottomColor: colors.accent },
            ]}
            onPress={() => setOwnerMode('existing')}
          >
            <Text
              variant="bodySm"
              tone={ownerMode === 'existing' ? 'text' : 'textMuted'}
              style={styles.tabText}
            >
              Pick from clients
            </Text>
          </Pressable>
        </View>

        {ownerMode === 'new' ? (
          <>
            <Input
              label="Owner name *"
              value={ownerFullName}
              onChangeText={setOwnerFullName}
              placeholder="Tunde Adekunle"
            />
            <Input
              label="Owner phone *"
              value={ownerPhone}
              onChangeText={setOwnerPhone}
              placeholder="+237 6XX XX XX XX"
              keyboardType="phone-pad"
              autoCapitalize="none"
            />
            <Input
              label="Owner address *"
              value={ownerAddress}
              onChangeText={setOwnerAddress}
              placeholder="Bonanjo, Douala"
              multiline
            />
            <Text variant="caption" tone="textMuted" style={styles.hint}>
              We'll create a client record so you can find them again.
            </Text>
          </>
        ) : (
          <>
            <Input
              label="Search clients"
              value={clientSearch}
              onChangeText={setClientSearch}
              placeholder="Name or phone"
              autoCapitalize="none"
            />
            {pickedClient ? (
              <Card>
                <CardTitle>Selected: {pickedClient.fullName}</CardTitle>
                <Text variant="bodySm" tone="textMuted">{pickedClient.phone}</Text>
                {pickedClient.address ? (
                  <Text variant="bodySm" tone="textMuted">{pickedClient.address}</Text>
                ) : null}
                <Pressable onPress={() => setPickedClientId(null)}>
                  <Text variant="bodySm" tone="danger" style={styles.linkDanger}>Clear selection</Text>
                </Pressable>
              </Card>
            ) : (
              <FlatList
                // We render the picker inline rather than as a separate
                // screen so the form state survives without route params.
                // Cap at the 50 most recent (already the API default).
                data={clientsQ.data?.items ?? []}
                keyExtractor={(c) => c.id}
                renderItem={({ item }) => (
                  <Pressable
                    style={[styles.clientRow, { backgroundColor: colors.card }]}
                    onPress={() => setPickedClientId(item.id)}
                  >
                    <Text variant="bodySm" tone="text" style={styles.clientName}>{item.fullName}</Text>
                    <Text variant="bodySm" tone="textMuted">{item.phone}</Text>
                  </Pressable>
                )}
                ListEmptyComponent={
                  <Text variant="bodySm" tone="textMuted">
                    {clientsQ.isLoading ? 'Loading clients…' : 'No clients yet.'}
                  </Text>
                }
                scrollEnabled={false}
              />
            )}
          </>
        )}

        <View style={[styles.divider, { backgroundColor: colors.border }]} />

        {/* ---------- 3. Members ---------- */}
        <Text variant="h3" tone="text" style={styles.section}>3. Members ({members.length})</Text>
        {members.length === 0 ? (
          <Text variant="bodySm" tone="textMuted">No members yet. Add them below.</Text>
        ) : (
          members.map((m) => (
            <View key={m.localId} style={[styles.memberRow, { backgroundColor: colors.card }]}>
              <View style={{ flex: 1 }}>
                <Text variant="bodySm" tone="text" style={styles.memberName}>{m.fullName}</Text>
                {m.roleLabel ? (
                  <Text variant="bodySm" tone="textMuted">{m.roleLabel}</Text>
                ) : null}
              </View>
              <Pressable onPress={() => removeMember(m.localId)}>
                <Text variant="bodySm" tone="danger" style={styles.linkDanger}>Remove</Text>
              </Pressable>
            </View>
          ))
        )}

        <View style={[styles.memberDraft, { backgroundColor: colors.card }]}>
          <Input
            label="Member name"
            value={memberDraftName}
            onChangeText={setMemberDraftName}
            placeholder="e.g. Bridesmaid 1"
          />
          <Input
            label="Role (optional)"
            value={memberDraftRole}
            onChangeText={setMemberDraftRole}
            placeholder="e.g. Maid of honour"
          />
          <Button
            label="Add member"
            variant="secondary"
            onPress={addMember}
            disabled={!memberDraftName.trim()}
          />
        </View>

        <View style={[styles.divider, { backgroundColor: colors.border }]} />

        {/* ---------- 4. Optional details ---------- */}
        <Text variant="h3" tone="text" style={styles.section}>4. Details (optional)</Text>
        <Input
          label="Description / other style specs"
          value={description}
          onChangeText={setDescription}
          placeholder="optional"
          multiline
        />
        <Input
          label="Shared design / pattern notes"
          value={sharedDesignNotes}
          onChangeText={setSharedDesignNotes}
          placeholder="The pattern everyone follows"
          multiline
        />
        <DateField label="Event date" value={eventDate} onChange={setEventDate} />
        <DateField
          label="Delivery date"
          value={dateDelivery}
          onChange={setDateDelivery}
        />

        <View style={{ height: spacing.lg }} />
        <Button
          label="Create group order"
          onPress={submit}
          loading={create.isPending}
          disabled={!canSubmit}
        />
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  section: {
    marginBottom: spacing.sm,
  },
  divider: {
    height: 1,
    marginVertical: spacing.lg,
  },
  tabs: {
    flexDirection: 'row',
    marginBottom: spacing.md,
    borderBottomWidth: 1,
  },
  tab: {
    flex: 1,
    paddingVertical: spacing.sm,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
    marginBottom: -1,
  },
  tabText: { fontWeight: '600' },
  hint: { marginTop: -spacing.sm },
  linkDanger: { fontWeight: '600' },
  clientRow: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radii.md,
    marginBottom: spacing.xs,
  },
  clientName: { fontWeight: '600' },
  memberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radii.md,
    marginBottom: spacing.xs,
  },
  memberName: { fontWeight: '600' },
  memberDraft: {
    marginTop: spacing.md,
    padding: spacing.md,
    borderRadius: radii.md,
  },
});
