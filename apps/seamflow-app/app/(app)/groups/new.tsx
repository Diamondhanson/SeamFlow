import { useMemo, useState } from 'react';
import {
  FlatList,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { router } from 'expo-router';
import type { CountryCode } from 'libphonenumber-js';
import type { GroupOrderWithMembersCreateInput } from '@seamflow/schemas';
import { Text } from '@seamflow/ui';
import { Screen } from '../../../components/Screen';
import { ScreenHeader } from '../../../components/ScreenHeader';
import { Input } from '../../../components/Input';
import { PhoneInput } from '../../../components/PhoneInput';
import { DateField } from '../../../components/DateField';
import { Button } from '../../../components/Button';
import { Card, CardTitle } from '../../../components/Card';
import { ContactPickerModal } from '../../../components/ContactPickerModal';
import {
  useClients,
  useCreateGroupOrderWithMembers,
  useMe,
} from '../../../lib/queries';
import { radii, spacing, useThemeColors } from '../../../lib/theme';
import { useTranslation } from '../../../lib/i18n';
import { useDialog } from '../../../lib/dialog';

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
  const { t } = useTranslation();
  const dialog = useDialog();
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
  const [contactsOpen, setContactsOpen] = useState(false);

  const { data: me } = useMe();
  const defaultCountry = ((me?.tailor?.countryCode as CountryCode) || 'NG');

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
      onError: (err) => void dialog.error(err),
    });
  };

  return (
    <Screen>
      <ScreenHeader title={t('groups.newGroupOrder')} />
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: spacing.xl }}
      >
        {/* ---------- 1. Title ---------- */}
        <Text variant="h3" tone="text" style={styles.section}>{t('groups.sectionTitle')}</Text>
        <Input
          label={t('groups.groupTitleLabel')}
          value={name}
          onChangeText={setName}
          placeholder={t('groups.groupTitlePlaceholder')}
        />

        <View style={[styles.divider, { backgroundColor: colors.border }]} />

        {/* ---------- 2. Owner ---------- */}
        <Text variant="h3" tone="text" style={styles.section}>{t('groups.sectionOwner')}</Text>
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
              {t('groups.ownerModeNew')}
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
              {t('groups.ownerModeExisting')}
            </Text>
          </Pressable>
        </View>

        {ownerMode === 'new' ? (
          <>
            <Button
              label={t('groups.selectFromContacts')}
              variant="secondary"
              onPress={() => setContactsOpen(true)}
            />
            <View style={{ height: spacing.sm }} />
            <Input
              label={t('groups.ownerNameLabel')}
              value={ownerFullName}
              onChangeText={setOwnerFullName}
              placeholder={t('groups.ownerNamePlaceholder')}
            />
            <PhoneInput
              label={t('groups.ownerPhoneLabel')}
              value={ownerPhone}
              onChangeText={setOwnerPhone}
            />
            <Input
              label={t('groups.ownerAddressLabel')}
              value={ownerAddress}
              onChangeText={setOwnerAddress}
              placeholder={t('groups.ownerAddressPlaceholder')}
              multiline
            />
            <Text variant="caption" tone="textMuted" style={styles.hint}>
              {t('groups.ownerHint')}
            </Text>
          </>
        ) : (
          <>
            <Input
              label={t('groups.searchClients')}
              value={clientSearch}
              onChangeText={setClientSearch}
              placeholder={t('groups.searchClientsPlaceholder')}
              autoCapitalize="none"
            />
            {pickedClient ? (
              <Card>
                <CardTitle>{t('groups.selectedClient', { name: pickedClient.fullName })}</CardTitle>
                <Text variant="bodySm" tone="textMuted">{pickedClient.phone}</Text>
                {pickedClient.address ? (
                  <Text variant="bodySm" tone="textMuted">{pickedClient.address}</Text>
                ) : null}
                <Pressable onPress={() => setPickedClientId(null)}>
                  <Text variant="bodySm" tone="danger" style={styles.linkDanger}>{t('groups.clearSelection')}</Text>
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
                    {clientsQ.isLoading ? t('groups.loadingClients') : t('groups.noClientsYet')}
                  </Text>
                }
                scrollEnabled={false}
              />
            )}
          </>
        )}

        <View style={[styles.divider, { backgroundColor: colors.border }]} />

        {/* ---------- 3. Members ---------- */}
        <Text variant="h3" tone="text" style={styles.section}>{t('groups.sectionMembers', { count: members.length })}</Text>
        {members.length === 0 ? (
          <Text variant="bodySm" tone="textMuted">{t('groups.noMembersYetAdd')}</Text>
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
                <Text variant="bodySm" tone="danger" style={styles.linkDanger}>{t('common.remove')}</Text>
              </Pressable>
            </View>
          ))
        )}

        <View style={[styles.memberDraft, { backgroundColor: colors.card }]}>
          <Input
            label={t('groups.memberNameLabel')}
            value={memberDraftName}
            onChangeText={setMemberDraftName}
            placeholder={t('groups.memberNamePlaceholder')}
          />
          <Input
            label={t('groups.memberRoleLabel')}
            value={memberDraftRole}
            onChangeText={setMemberDraftRole}
            placeholder={t('groups.memberRolePlaceholder')}
          />
          <Button
            label={t('groups.addMember')}
            variant="secondary"
            onPress={addMember}
            disabled={!memberDraftName.trim()}
          />
        </View>

        <View style={[styles.divider, { backgroundColor: colors.border }]} />

        {/* ---------- 4. Optional details ---------- */}
        <Text variant="h3" tone="text" style={styles.section}>{t('groups.sectionDetails')}</Text>
        <Input
          label={t('groups.descriptionLabel')}
          value={description}
          onChangeText={setDescription}
          placeholder={t('common.optional')}
          multiline
        />
        <Input
          label={t('groups.sharedNotesLabel')}
          value={sharedDesignNotes}
          onChangeText={setSharedDesignNotes}
          placeholder={t('groups.sharedNotesPlaceholder')}
          multiline
        />
        <DateField label={t('groups.eventDateLabel')} value={eventDate} onChange={setEventDate} />
        <DateField
          label={t('groups.deliveryDateLabel')}
          value={dateDelivery}
          onChange={setDateDelivery}
        />

        <View style={{ height: spacing.lg }} />
        <Button
          label={t('groups.createGroupOrder')}
          onPress={submit}
          loading={create.isPending}
          disabled={!canSubmit}
        />
      </ScrollView>

      <ContactPickerModal
        visible={contactsOpen}
        onClose={() => setContactsOpen(false)}
        onSelect={(contact) => {
          // Fill the owner form; address stays manual (owner requires one).
          setOwnerFullName(contact.name);
          setOwnerPhone(contact.phone);
          setContactsOpen(false);
        }}
        defaultCountry={defaultCountry}
      />
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
