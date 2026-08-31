import type {
  GroupOrderWithMembers,
  MeasurementTemplate,
  MeasurementValues,
} from '@seamflow/schemas';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useQueryClient } from '@tanstack/react-query';
import { Text, AvatarStack, useAtelierTheme, withAlpha } from '@seamflow/ui';
import { Screen } from '../../../components/Screen';
import { FormScroll } from '../../../components/FormScroll';
import { SkeletonDetail } from '../../../components/Skeleton';
import { ScreenHeader } from '../../../components/ScreenHeader';
import { InfoDot } from '../../../components/InfoDot';
import { Card, CardLine, CardTitle } from '../../../components/Card';
import { Button } from '../../../components/Button';
import { Input } from '../../../components/Input';
import { FabricField } from '../../../components/FabricField';
import { MeasurementSheet } from '../../../components/MeasurementSheet';
import {
  LibraryPickerSheet,
  type LibrarySelection,
} from '../../../components/LibraryPickerSheet';
import {
  NO_PENDING,
  numericMeasurements,
  type PendingMeasurement,
} from '../../../components/MeasurementsEditor';
import {
  qk,
  useAddGroupMember,
  useClients,
  useCopyMemberMeasurements,
  useDeleteGroupMember,
  useDeleteGroupOrder,
  useDeleteGroupPhoto,
  useGroupOrder,
  useGroupPhotos,
  usePromoteMember,
  useSaveMemberMeasurementsToClient,
  useTemplates,
  useUpdateGroupMember,
  useUpdateGroupOrder,
} from '../../../lib/queries';
import { api } from '../../../lib/api';
import { pickPhoto, uploadAndRegisterGroupPhoto } from '../../../lib/photo-upload';
import { alertIfOffline, alertIfPermissionDenied } from '../../../lib/permissions';
import { radii, spacing, useThemeColors } from '../../../lib/theme';
import { useResponsiveValue } from '../../../lib/use-breakpoint';
import { useTranslation } from '../../../lib/i18n';
import { useDialog } from '../../../lib/dialog';
import { draftKey, useDraft } from '../../../lib/drafts';

export default function GroupDetail() {
  const { t } = useTranslation();
  const { id } = useLocalSearchParams<{ id: string }>();
  const groupQ = useGroupOrder(id);
  const clientsQ = useClients();
  const templatesQ = useTemplates();
  const photosQ = useGroupPhotos(id);
  const addMember = useAddGroupMember(id);
  const updateGroup = useUpdateGroupOrder(id);
  const deleteGroup = useDeleteGroupOrder(id);
  const deletePhotoM = useDeleteGroupPhoto(id);
  const qc = useQueryClient();
  const colors = useThemeColors();
  const theme = useAtelierTheme();
  const dialog = useDialog();
  const thumbSize = useResponsiveValue({ compact: 120, medium: 140, expanded: 160 });

  const [showForm, setShowForm] = useState(false);
  const [memberName, setMemberName] = useState('');
  const [memberRole, setMemberRole] = useState('');
  const [memberClientId, setMemberClientId] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [libraryOpen, setLibraryOpen] = useState(false);
  const [attaching, setAttaching] = useState(false);

  // The garment name is a free-text field on a screen that saves by PATCH, so
  // it is committed on blur rather than per keystroke — one request when they
  // move on, not one per letter. Everything else here is a picker and commits
  // immediately.
  const [garmentDraft, setGarmentDraft] = useState('');

  const group = groupQ.data ?? null;
  const clients = clientsQ.data?.items ?? [];
  const templates = templatesQ.data?.items ?? [];
  const groupTemplate = templates.find((tpl) => tpl.id === group?.templateId) ?? null;

  // Seed the text box once the group has loaded, and follow it if the value
  // changes underneath (another device, a refetch) while the box is untouched.
  useEffect(() => {
    setGarmentDraft(group?.garmentType ?? '');
  }, [group?.garmentType]);

  const saveGarmentType = () => {
    const next = garmentDraft.trim() || null;
    if (next === (group?.garmentType ?? null)) return;
    updateGroup.mutate({ garmentType: next }, { onError: (err) => void dialog.error(err) });
  };
  const photos = photosQ.data?.items ?? [];

  const addPhoto = async (source: 'camera' | 'library') => {
    if (!group) return;
    setUploading(true);
    try {
      const asset = await pickPhoto(source);
      if (!asset) return; // user cancelled
      await uploadAndRegisterGroupPhoto({
        tailorId: group.tailorId,
        groupOrderId: group.id,
        asset,
      });
      qc.invalidateQueries({ queryKey: qk.groupPhotos(id) });
    } catch (err) {
      if (
        !(await alertIfOffline(err, dialog, t)) &&
        !(await alertIfPermissionDenied(err, dialog, t))
      ) {
        await dialog.error(err);
      }
    } finally {
      setUploading(false);
    }
  };

  /** Where should this shared reference image come from? */
  const chooseSource = async () => {
    const pick = await dialog.choose<'camera' | 'library' | 'designs' | 'works'>({
      title: t('orders.addPhotoTitle'),
      message: t('orders.addPhotoBody'),
      actions: [
        { label: t('orders.addFromCamera'), value: 'camera' },
        { label: t('orders.addFromGallery'), value: 'library' },
        { label: t('orders.addFromDesigns'), value: 'designs' },
        { label: t('orders.addFromWorks'), value: 'works' },
      ],
    });
    if (pick === 'camera' || pick === 'library') return addPhoto(pick);
    if (pick) setLibraryOpen(true);
  };

  /** Copied server-side inside Storage — the phone sends ids, not megabytes. */
  const attachFromLibrary = async (selection: LibrarySelection) => {
    setAttaching(true);
    try {
      const added = await api.groupOrderPhotos.attachFromLibrary(id, selection);
      qc.invalidateQueries({ queryKey: qk.groupPhotos(id) });
      setLibraryOpen(false);
      await dialog.alert({
        title: t('orders.attachedTitle'),
        message: t('orders.attachedBody', { count: added.length }),
        tone: 'success',
      });
    } catch (err) {
      if (!(await alertIfOffline(err, dialog, t))) await dialog.error(err);
    } finally {
      setAttaching(false);
    }
  };

  const deletePhoto = async (photoId: string) => {
    const ok = await dialog.confirm({
      title: t('groups.deletePhotoTitle'),
      message: t('groups.deletePhotoMessage'),
      confirmLabel: t('common.delete'),
      destructive: true,
    });
    if (!ok) return;
    deletePhotoM.mutate(photoId, { onError: (err) => void dialog.error(err) });
  };

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
        onError: (err) => void dialog.error(err),
      },
    );
  };

  const onDeleteGroup = async () => {
    const ok = await dialog.confirm({
      title: t('groups.deleteGroupTitle'),
      message: t('groups.deleteGroupMessage', { name: group?.name ?? '' }),
      confirmLabel: t('common.delete'),
      destructive: true,
    });
    if (!ok) return;
    deleteGroup.mutate(undefined, {
      onSuccess: () => router.back(),
      onError: (err) => void dialog.error(err),
    });
  };

  if (groupQ.isLoading || !group) {
    return (
      <Screen>
        <ScreenHeader title={t('groups.groupFallbackTitle')} />
        <SkeletonDetail />
      </Screen>
    );
  }

  const ownerMember = group.members.find((m) => m.id === group.ownerMemberId) ?? null;

  const setOwner = async () => {
    if (group.members.length === 0) {
      await dialog.alert({
        title: t('groups.noMembersOwnerTitle'),
        message: t('groups.noMembersOwnerMessage'),
        tone: 'info',
      });
      return;
    }
    const key = await dialog.pick({
      title: t('groups.pickOwnerTitle'),
      selectedKey: group.ownerMemberId ?? '',
      options: [
        { key: '__clear__', label: t('groups.clearOwner') },
        ...group.members.map((m) => ({ key: m.id, label: m.fullName })),
      ],
    });
    if (!key) return;
    updateGroup.mutate({ ownerMemberId: key === '__clear__' ? null : key });
  };

  return (
    <Screen>
      <ScreenHeader title={group.name} />
      <FormScroll
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
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Text variant="h3">{t('groups.ownerHeading')}</Text>
              <InfoDot
                title={t('guides.infoOwnerTitle')}
                message={t('guides.infoOwnerBody')}
              />
            </View>
            <Text variant="bodySm" tone="textMuted">
              {ownerMember ? ownerMember.fullName : t('groups.ownerNotSet')}
            </Text>
          </View>
          <Button
            label={ownerMember ? t('groups.changeOwner') : t('groups.setOwner')}
            variant="secondary"
            fullWidth={false}
            onPress={setOwner}
          />
        </View>

        {group.sharedDesignNotes ? (
          <>
            <Text variant="h3" style={{ marginTop: spacing.lg }}>{t('groups.designNotesHeading')}</Text>
            <Text variant="bodySm" tone="textMuted">{group.sharedDesignNotes}</Text>
          </>
        ) : null}

        <View style={{ marginTop: spacing.lg }}>
          <FabricField
            label={t('fabrics.sharedFabricLabel')}
            value={group.sharedFabricId}
            onChange={(fabricId) =>
              updateGroup.mutate(
                { sharedFabricId: fabricId },
                { onError: (err) => void dialog.error(err) },
              )
            }
          />
        </View>

        <View style={[styles.divider, { backgroundColor: colors.hairline }]} />

        {/* The garment, set once for the whole group. Everyone inherits it;
            a member card can override it for the odd one out. Without this the
            copy-from-client feature had nothing to match against and simply
            took each client's newest measurement set. */}
        <Text variant="h3">{t('groups.garmentHeading')}</Text>
        <Text variant="bodySm" tone="textMuted" style={{ marginBottom: spacing.sm }}>
          {t('groups.garmentSubtitle')}
        </Text>
        <Input
          label={t('groups.garmentTypeLabel')}
          value={garmentDraft}
          onChangeText={setGarmentDraft}
          onBlur={saveGarmentType}
          placeholder={t('groups.garmentTypePlaceholder')}
        />
        <Text variant="caption" tone="textMuted" style={{ marginBottom: 4 }}>
          {t('groups.templateLabel')}
        </Text>
        <Button
          label={groupTemplate ? groupTemplate.name : t('groups.templateNone')}
          variant="secondary"
          onPress={async () => {
            const key = await dialog.pick({
              title: t('groups.pickTemplateTitle'),
              selectedKey: group.templateId ?? '__none__',
              options: [
                { key: '__none__', label: t('groups.templateNone') },
                ...templates.map((tpl) => ({ key: tpl.id, label: tpl.name })),
              ],
            });
            if (!key) return;
            updateGroup.mutate(
              { templateId: key === '__none__' ? null : key },
              { onError: (err) => void dialog.error(err) },
            );
          }}
        />

        <View style={[styles.divider, { backgroundColor: colors.hairline }]} />

        <View style={styles.row}>
          <View style={{ flex: 1 }}>
            <Text variant="h3">{t('groups.photosHeading')}</Text>
            <Text variant="bodySm" tone="textMuted">{t('groups.photosSubtitle')}</Text>
          </View>
          {uploading ? <ActivityIndicator color={colors.accent} /> : null}
        </View>
        {/* Same one-button chooser as the order screen. A bridal party is
            exactly where a tailor reaches for an inspiration photo they
            already saved into Design Studio. */}
        <Button
          label={t('orders.addPhotoAction')}
          variant="secondary"
          iconStart={<Ionicons name="add" size={18} color={colors.text} />}
          onPress={chooseSource}
          disabled={uploading}
        />
        {photos.length === 0 ? (
          <View
            style={[
              styles.photoEmpty,
              { backgroundColor: withAlpha(theme.colors.textMuted, 0.06) },
            ]}
          >
            <Ionicons name="images-outline" size={22} color={colors.textMuted} />
            <Text variant="bodySm" tone="textMuted">{t('groups.noPhotosYet')}</Text>
          </View>
        ) : (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.photoStrip}
          >
            {photos.map((p) => {
              const previewUrl = p.thumbnailUrl ?? p.signedUrl;
              return (
                <Pressable
                  key={p.id}
                  onLongPress={() => deletePhoto(p.id)}
                  style={[styles.photoThumbWrap, { width: thumbSize }]}
                >
                  {previewUrl ? (
                    <Image
                      source={{ uri: previewUrl }}
                      style={[
                        styles.photoThumb,
                        { width: thumbSize, height: thumbSize, backgroundColor: colors.card },
                      ]}
                    />
                  ) : (
                    <View
                      style={[
                        styles.photoThumbPlaceholder,
                        { width: thumbSize, height: thumbSize, backgroundColor: colors.card },
                      ]}
                    >
                      <ActivityIndicator color={colors.textMuted} />
                    </View>
                  )}
                </Pressable>
              );
            })}
          </ScrollView>
        )}
        {photos.length > 0 ? (
          <Text variant="caption" tone="textMuted" style={styles.photoHint}>
            {t('orders.longPressToDelete')}
          </Text>
        ) : null}

        <View style={[styles.divider, { backgroundColor: colors.hairline }]} />

        <View style={styles.row}>
          <Text variant="h3">{t('groups.membersCount', { count: group.members.length })}</Text>
          {!showForm ? (
            <Button
              label={t('groups.addShort')}
              variant="secondary"
              fullWidth={false}
              onPress={() => setShowForm(true)}
            />
          ) : null}
        </View>

        {group.members.length === 0 && !showForm ? (
          <Text variant="bodySm" tone="textMuted">{t('groups.noMembersYet')}</Text>
        ) : null}

        {group.members.map((m) => (
          <MemberCard
            key={m.id}
            memberId={m.id}
            groupId={id}
            member={m}
            group={group}
            templates={templates}
          />
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
                onPress={async () => {
                  if (clients.length === 0) {
                    await dialog.alert({
                      title: t('groups.noClientsTitle'),
                      message: t('groups.noClientsMessage'),
                      tone: 'info',
                    });
                    return;
                  }
                  const key = await dialog.pick({
                    title: t('groups.pickClientTitle'),
                    selectedKey: memberClientId ?? '',
                    options: [
                      { key: '__none__', label: t('groups.noneOption') },
                      ...clients.map((c) => ({ key: c.id, label: c.fullName })),
                    ],
                  });
                  if (!key) return;
                  if (key === '__none__') {
                    setMemberClientId(null);
                    return;
                  }
                  setMemberClientId(key);
                  const picked = clients.find((c) => c.id === key);
                  if (picked && !memberName) setMemberName(picked.fullName);
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
      </FormScroll>
    
      <LibraryPickerSheet
        visible={libraryOpen}
        onClose={() => setLibraryOpen(false)}
        onConfirm={attachFromLibrary}
        busy={attaching}
      />
    </Screen>
  );
}

/**
 * One member of the group: who they are, what they are being made, and their
 * measurements.
 *
 * Three things this card could not do before, all of which a real wedding
 * party needs:
 *
 *   · MEASURE A NON-CLIENT. A bridesmaid who is not in the address book had no
 *     way to be measured at all — the only button was "copy from client", and
 *     she had no client to copy from. The data model always allowed it; the
 *     screen just never offered it.
 *   · WEAR A DIFFERENT GARMENT. Bridesmaids in one style, groomsmen in
 *     another, inside one wedding party.
 *   · COPY HONESTLY. See onCopy below.
 */
function MemberCard({
  memberId,
  groupId,
  member,
  group,
  templates,
}: {
  memberId: string;
  groupId: string;
  member: {
    id: string;
    fullName: string;
    clientId: string | null;
    roleLabel: string | null;
    garmentType: string | null;
    templateId: string | null;
    measurements: MeasurementValues;
  };
  group: GroupOrderWithMembers;
  templates: MeasurementTemplate[];
}) {
  const { t } = useTranslation();
  const dialog = useDialog();
  const promote = usePromoteMember(memberId, groupId);
  const copyMeasurements = useCopyMemberMeasurements(memberId, groupId);
  const saveToClient = useSaveMemberMeasurementsToClient(memberId, groupId);
  const updateMember = useUpdateGroupMember(memberId, groupId);
  const remove = useDeleteGroupMember(memberId, groupId);

  // Inheritance, resolved in one place. NULL on the member means "whatever the
  // group says", which is the case for almost every member almost every time.
  const overrides = member.templateId != null || member.garmentType != null;
  const templateId = member.templateId ?? group.templateId;
  const template = templates.find((tpl) => tpl.id === templateId) ?? null;
  const garment = member.garmentType ?? group.garmentType ?? null;

  const [editing, setEditing] = useState(false);
  const [values, setValues] = useState<Record<string, string>>({});
  const [pending, setPending] = useState<PendingMeasurement>(NO_PENDING);

  const saved = Object.fromEntries(
    Object.entries(member.measurements ?? {}).map(([k, v]) => [k, String(v ?? '')]),
  );

  const openEditor = () => {
    setValues(saved);
    setPending(NO_PENDING);
    setEditing(true);
  };

  // Measurements typed here are kept on the device as they are typed, exactly
  // like every other measurement surface — a tailor measuring a wedding party
  // in someone's front room is the likeliest person in the app to be
  // interrupted. See lib/drafts.ts.
  const { clear: clearDraft } = useDraft({
    key: editing ? draftKey('group-member', memberId) : null,
    value: { values, pending },
    hasContent: (d) =>
      JSON.stringify(d.values) !== JSON.stringify(saved) ||
      !!d.pending?.name.trim() ||
      !!d.pending?.value.trim(),
    describe: () => member.fullName,
    onRestore: (d) => {
      setValues(d.values);
      setPending(d.pending ?? NO_PENDING);
    },
  });

  const saveMeasurements = () => {
    // Fold in the row still sitting in the draft inputs — pressing Save is
    // intent enough, and dropping it silently is how measurements get lost.
    const name = pending.name.trim();
    const merged = name ? { ...values, [name]: pending.value.trim() } : values;
    updateMember.mutate(
      { measurements: numericMeasurements(merged) },
      {
        onSuccess: () => {
          clearDraft();
          setEditing(false);
        },
        onError: (err) => void dialog.error(err),
      },
    );
  };

  const onPromote = async () => {
    const phone = await dialog.prompt({
      title: t('groups.promoteTitle', { name: member.fullName }),
      message: t('groups.promoteMessage'),
      confirmLabel: t('groups.promote'),
      keyboardType: 'phone-pad',
    });
    if (!phone) return;
    promote.mutate({ phone }, { onError: (err) => void dialog.error(err) });
  };

  /**
   * Copy the client's saved measurements — and say what actually happened.
   *
   * The old version called the endpoint and showed a green "Copied!" no matter
   * what. The endpoint took the client's NEWEST measurement set with no regard
   * for the garment, so a client last measured for trousers would have those
   * numbers loaded into a gown order and the app would congratulate itself.
   *
   * Now the server reports which set it used and how well it fit, and each
   * outcome gets its own honest message — including "check these" when the fit
   * was partial, and a warning tone when there was nothing to match against.
   */
  const onCopy = (setId?: string) =>
    copyMeasurements.mutate(
      { setId: setId ?? null },
      {
        onSuccess: (res) => {
          const label = res.sourceSetLabel ?? '';
          if (res.match === 'none') {
            void dialog.alert({
              title: t('groups.copiedNothingTitle'),
              message: t('groups.copiedNothingMessage'),
              tone: 'warning',
            });
            return;
          }
          if (res.match === 'template') {
            void dialog.alert({
              title: t('groups.copiedTemplateTitle'),
              message: t('groups.copiedTemplateMessage', { label }),
              tone: 'success',
            });
            return;
          }
          if (res.match === 'untargeted') {
            void dialog.alert({
              title: t('groups.copiedUntargetedTitle'),
              message: t('groups.copiedUntargetedMessage', { label }),
              tone: 'warning',
            });
            return;
          }
          void dialog.alert({
            title: t('groups.copiedOverlapTitle'),
            message: t('groups.copiedOverlapMessage', {
              label,
              matched: res.matchedFields,
              total: res.targetFields,
            }),
            tone: 'warning',
          });
        },
        onError: (err) => void dialog.error(err),
      },
    );

  /** Let the tailor overrule the server's pick with a specific saved set. */
  const onChooseSet = async () => {
    if (!member.clientId) return;
    try {
      const res = await api.measurementSets.listForClient(member.clientId);
      if (!res.items.length) {
        await dialog.alert({
          title: t('groups.copiedNothingTitle'),
          message: t('groups.copiedNothingMessage'),
          tone: 'warning',
        });
        return;
      }
      const key = await dialog.pick({
        title: t('groups.pickSetTitle'),
        // The date goes IN the label: SheetOption has no subtitle field, and an
        // extra key would be silently dropped rather than rejected — the sort
        // of thing that type-checks and then quietly renders nothing.
        options: res.items.map((set) => ({
          key: set.id,
          label: `${set.label} · ${t('groups.pickSetSubtitle', {
            date: new Date(set.updatedAt).toLocaleDateString(),
          })}`,
        })),
      });
      if (key) onCopy(key);
    } catch (err) {
      void dialog.error(err);
    }
  };

  const onSaveToClient = async () => {
    if (!Object.keys(member.measurements ?? {}).length) {
      await dialog.alert({ title: t('groups.nothingToSave'), tone: 'info' });
      return;
    }
    const ok = await dialog.confirm({
      title: t('groups.saveToClientConfirmTitle', { name: member.fullName }),
      message: t('groups.saveToClientConfirmBody'),
      confirmLabel: t('common.save'),
    });
    if (!ok) return;
    const label = garment ?? group.name;
    saveToClient.mutate(
      { label },
      {
        onSuccess: () =>
          void dialog.alert({
            title: t('groups.savedToClientTitle'),
            message: t('groups.savedToClientMessage', { name: member.fullName, label }),
            tone: 'success',
          }),
        onError: (err) => void dialog.error(err),
      },
    );
  };

  const onChangeGarment = async () => {
    const key = await dialog.pick({
      title: t('groups.memberGarmentTitle', { name: member.fullName }),
      selectedKey: member.templateId ?? '__inherit__',
      options: [
        { key: '__inherit__', label: t('groups.backToGroupGarment') },
        { key: '__none__', label: t('groups.templateNone') },
        ...templates.map((tpl) => ({ key: tpl.id, label: tpl.name })),
      ],
    });
    if (!key) return;
    // '__inherit__' clears BOTH fields — going back to the group's garment
    // means dropping the override entirely, not just the template.
    const patch =
      key === '__inherit__'
        ? { templateId: null, garmentType: null }
        : {
            templateId: key === '__none__' ? null : key,
            garmentType:
              key === '__none__'
                ? (member.garmentType ?? group.garmentType ?? t('groups.garmentNotSet'))
                : (templates.find((tpl) => tpl.id === key)?.name ?? null),
          };
    updateMember.mutate(patch, { onError: (err) => void dialog.error(err) });
  };

  const onRemove = async () => {
    const ok = await dialog.confirm({
      title: t('groups.removeMemberTitle'),
      message: t('groups.removeMemberMessage', { name: member.fullName }),
      confirmLabel: t('common.remove'),
      destructive: true,
    });
    if (!ok) return;
    remove.mutate(undefined, { onError: (err) => void dialog.error(err) });
  };

  const measurementEntries = Object.entries(member.measurements ?? {});

  return (
    <Card>
      <CardTitle>{member.fullName}</CardTitle>
      {member.roleLabel ? <CardLine>{member.roleLabel}</CardLine> : null}
      <CardLine>
        {member.clientId ? t('groups.linkedToClient') : t('groups.adHocMember')}
      </CardLine>

      {/* What this person is being made, and whether that came from the group
          or from an override on them specifically. */}
      <CardLine>
        {garment
          ? overrides
            ? t('groups.ownGarment', { garment })
            : t('groups.inheritsGarment', { garment })
          : t('groups.garmentNotSet')}
      </CardLine>

      {editing ? (
        <>
          {!template ? (
            <Text variant="caption" tone="textMuted" style={{ marginTop: spacing.sm }}>
              {t('groups.noTemplateHint')}
            </Text>
          ) : null}
          <MeasurementSheet
            template={template}
            values={values}
            setValues={(cb) => setValues((cur) => cb(cur))}
            pending={pending}
            setPending={setPending}
          />
          <View style={{ height: spacing.sm }} />
          <Button
            label={t('common.save')}
            onPress={saveMeasurements}
            loading={updateMember.isPending}
          />
          <View style={{ height: spacing.sm }} />
          <Button
            label={t('common.cancel')}
            variant="secondary"
            onPress={() => {
              clearDraft();
              setEditing(false);
            }}
          />
        </>
      ) : (
        <>
          {measurementEntries.length > 0 ? (
            <View style={{ marginTop: spacing.sm }}>
              {measurementEntries.map(([k, v]) => (
                <CardLine key={k}>
                  {t('groups.measurementLine', { key: k, value: String(v) })}
                </CardLine>
              ))}
            </View>
          ) : (
            <CardLine>{t('groups.noMeasurementsYet')}</CardLine>
          )}

          <View style={{ height: spacing.sm }} />

          {/* Available to EVERY member, client or not. This is the button whose
              absence meant a non-client could never be measured. */}
          <Button label={t('groups.editMeasurements')} onPress={openEditor} />

          <View style={{ height: spacing.sm }} />
          <Button
            label={t('groups.changeGarmentForMember')}
            variant="ghost"
            size="sm"
            onPress={onChangeGarment}
          />

          {member.clientId ? (
            <>
              <View style={{ height: spacing.sm }} />
              <Button
                label={t('groups.copyFromClient')}
                variant="secondary"
                onPress={() => onCopy()}
                loading={copyMeasurements.isPending}
              />
              <View style={{ height: spacing.sm }} />
              <Button
                label={t('groups.chooseAnotherSet')}
                variant="ghost"
                size="sm"
                onPress={onChooseSet}
              />
              {measurementEntries.length > 0 ? (
                <>
                  <View style={{ height: spacing.sm }} />
                  <Button
                    label={t('groups.saveToClient')}
                    variant="ghost"
                    size="sm"
                    onPress={onSaveToClient}
                    loading={saveToClient.isPending}
                  />
                </>
              ) : null}
            </>
          ) : (
            <>
              <View style={{ height: spacing.sm }} />
              <Button
                label={t('groups.promote')}
                variant="secondary"
                onPress={onPromote}
                loading={promote.isPending}
              />
            </>
          )}

          <View style={{ height: spacing.sm }} />
          <Button label={t('common.remove')} variant="danger" onPress={onRemove} />
        </>
      )}
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
  divider: { height: 1, marginVertical: spacing.md },
  photoActions: {
    flexDirection: 'row',
    marginBottom: spacing.md,
  },
  photoEmpty: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.xl,
    borderRadius: radii.md,
  },
  photoStrip: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  photoThumbWrap: {
    width: 120,
    marginEnd: spacing.sm,
  },
  photoThumb: {
    width: 120,
    height: 120,
    borderRadius: radii.md,
  },
  photoThumbPlaceholder: {
    width: 120,
    height: 120,
    borderRadius: radii.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  photoHint: {
    marginTop: spacing.xs,
    fontStyle: 'italic',
  },
});
