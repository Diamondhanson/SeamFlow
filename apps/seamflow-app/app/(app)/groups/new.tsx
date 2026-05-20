import { useMemo, useState } from 'react';
import {
  Alert,
  FlatList,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { router } from 'expo-router';
import type { GroupOrderWithMembersCreateInput } from '@seamflow/schemas';
import { Screen } from '../../../components/Screen';
import { Input } from '../../../components/Input';
import { DateField } from '../../../components/DateField';
import { Button } from '../../../components/Button';
import { Card, CardTitle } from '../../../components/Card';
import {
  useClients,
  useCreateGroupOrderWithMembers,
} from '../../../lib/queries';
import { colors, radii, spacing } from '../../../lib/theme';

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
        <Text style={styles.section}>1. Title</Text>
        <Input
          label="Group title *"
          value={name}
          onChangeText={setName}
          placeholder="e.g. Adekunle Wedding"
        />

        <View style={styles.divider} />

        {/* ---------- 2. Owner ---------- */}
        <Text style={styles.section}>2. Owner</Text>
        <View style={styles.tabs}>
          <Pressable
            style={[styles.tab, ownerMode === 'new' && styles.tabActive]}
            onPress={() => setOwnerMode('new')}
          >
            <Text
              style={[styles.tabText, ownerMode === 'new' && styles.tabTextActive]}
            >
              New contact
            </Text>
          </Pressable>
          <Pressable
            style={[styles.tab, ownerMode === 'existing' && styles.tabActive]}
            onPress={() => setOwnerMode('existing')}
          >
            <Text
              style={[
                styles.tabText,
                ownerMode === 'existing' && styles.tabTextActive,
              ]}
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
            <Text style={styles.hint}>
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
                <Text style={styles.muted}>{pickedClient.phone}</Text>
                {pickedClient.address ? (
                  <Text style={styles.muted}>{pickedClient.address}</Text>
                ) : null}
                <Pressable onPress={() => setPickedClientId(null)}>
                  <Text style={styles.linkDanger}>Clear selection</Text>
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
                    style={styles.clientRow}
                    onPress={() => setPickedClientId(item.id)}
                  >
                    <Text style={styles.clientName}>{item.fullName}</Text>
                    <Text style={styles.muted}>{item.phone}</Text>
                  </Pressable>
                )}
                ListEmptyComponent={
                  <Text style={styles.muted}>
                    {clientsQ.isLoading ? 'Loading clients…' : 'No clients yet.'}
                  </Text>
                }
                scrollEnabled={false}
              />
            )}
          </>
        )}

        <View style={styles.divider} />

        {/* ---------- 3. Members ---------- */}
        <Text style={styles.section}>3. Members ({members.length})</Text>
        {members.length === 0 ? (
          <Text style={styles.muted}>No members yet. Add them below.</Text>
        ) : (
          members.map((m) => (
            <View key={m.localId} style={styles.memberRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.memberName}>{m.fullName}</Text>
                {m.roleLabel ? (
                  <Text style={styles.muted}>{m.roleLabel}</Text>
                ) : null}
              </View>
              <Pressable onPress={() => removeMember(m.localId)}>
                <Text style={styles.linkDanger}>Remove</Text>
              </Pressable>
            </View>
          ))
        )}

        <View style={styles.memberDraft}>
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

        <View style={styles.divider} />

        {/* ---------- 4. Optional details ---------- */}
        <Text style={styles.section}>4. Details (optional)</Text>
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
    color: colors.text,
    fontSize: 16,
    fontWeight: '700',
    marginBottom: spacing.sm,
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: spacing.lg,
  },
  tabs: {
    flexDirection: 'row',
    marginBottom: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  tab: {
    flex: 1,
    paddingVertical: spacing.sm,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
    marginBottom: -1,
  },
  tabActive: { borderBottomColor: colors.accent },
  tabText: { color: colors.textMuted, fontSize: 13, fontWeight: '600' },
  tabTextActive: { color: colors.text },
  hint: { color: colors.textMuted, fontSize: 12, marginTop: -spacing.sm },
  muted: { color: colors.textMuted, fontSize: 13 },
  linkDanger: { color: colors.danger, fontSize: 13, fontWeight: '600' },
  clientRow: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radii.md,
    backgroundColor: colors.card,
    marginBottom: spacing.xs,
  },
  clientName: { color: colors.text, fontSize: 14, fontWeight: '600' },
  memberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radii.md,
    backgroundColor: colors.card,
    marginBottom: spacing.xs,
  },
  memberName: { color: colors.text, fontSize: 14, fontWeight: '600' },
  memberDraft: {
    marginTop: spacing.md,
    padding: spacing.md,
    borderRadius: radii.md,
    backgroundColor: colors.card,
  },
});
