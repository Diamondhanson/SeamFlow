import { useEffect, useState, type ReactNode } from 'react';
import {
  ActivityIndicator,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Text, Avatar, IconButton } from '@seamflow/ui';
import { Screen } from '../../components/Screen';
import { SkeletonForm } from '../../components/Skeleton';
import { ScreenHeader } from '../../components/ScreenHeader';
import { Button } from '../../components/Button';
import { useFloatingScroll } from '../../lib/floating-scroll';
import { useAuth } from '../../lib/auth-context';
import { useGuides } from '../../lib/guides';
import {
  useMe,
  useNotificationPreferences,
  useUpdateNotificationPreferences,
  useUpsertMyTailor,
} from '../../lib/queries';
import { clearCache } from '../../lib/query-client';
import { ensurePushRegistered, sendPushTest } from '../../lib/notifications';
import { pickPhoto, uploadTailorLogo } from '../../lib/photo-upload';
import { alertIfOffline, alertIfPermissionDenied } from '../../lib/permissions';
import { useDialog } from '../../lib/dialog';
import { countryName, flagEmoji } from '../../lib/countries';
import { radii, spacing, useThemeColors } from '../../lib/theme';
import { useThemeMode } from '../../lib/theme-mode';
import { useTranslation, LANGUAGES, type LanguageCode } from '../../lib/i18n';
import { openLegal } from '../../lib/legal-links';

// Localized "Month YYYY" for the member-since line. Bundled month names keep
// this deterministic under Hermes (Intl month formatting is unreliable there).
const MONTHS: Record<LanguageCode, string[]> = {
  en: ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'],
  fr: ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'],
};
function formatMonthYear(iso: string | undefined, lang: LanguageCode): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return `${MONTHS[lang][d.getMonth()]} ${d.getFullYear()}`;
}

export default function Me() {
  const { signOut } = useAuth();
  const { previewWelcome } = useGuides();
  const { data: me, isLoading } = useMe();
  const { t, language, setLanguage } = useTranslation();
  const { preference } = useThemeMode();
  const scroll = useFloatingScroll();
  const colors = useThemeColors();
  const dialog = useDialog();
  const upsert = useUpsertMyTailor();
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  // Right-hand value shown on the Appearance / Language rows.
  const appearanceLabel = t(`settings.${preference}`);
  const currentLanguageLabel =
    LANGUAGES.find((l) => l.code === language)?.label ?? language;

  // Language is a centered dialog (choose), not a bottom sheet. The active
  // language gets a ✓ so the current choice is obvious.
  const onChooseLanguage = async () => {
    const picked = await dialog.choose<LanguageCode>({
      title: t('settings.language'),
      actions: LANGUAGES.map((l) => ({
        label: l.code === language ? `${l.label}  ✓` : l.label,
        value: l.code,
      })),
    });
    if (picked && picked !== language) setLanguage(picked);
  };

  // Change / remove the profile photo. Upload lands in the public `avatars`
  // bucket; the returned URL is persisted on the tailor via the profile upsert
  // (which requires the other fields, so we pass the current values through).
  const savePhoto = async (photoUrl: string | null) => {
    if (!me?.tailor) return;
    await upsert.mutateAsync({
      businessName: me.tailor.businessName,
      countryCode: me.tailor.countryCode,
      currency: me.tailor.currency,
      location: me.tailor.location,
      photoUrl,
    });
  };

  const changePhoto = async (source: 'camera' | 'library') => {
    if (!me?.tailor) return;
    setUploadingPhoto(true);
    try {
      const asset = await pickPhoto(source);
      if (!asset) return;
      const photoUrl = await uploadTailorLogo({ tailorId: me.tailor.id, asset });
      await savePhoto(photoUrl);
    } catch (err) {
      if (
        !(await alertIfOffline(err, dialog, t)) &&
        !(await alertIfPermissionDenied(err, dialog, t))
      ) {
        await dialog.error(err);
      }
    } finally {
      setUploadingPhoto(false);
    }
  };

  const removePhoto = async () => {
    setUploadingPhoto(true);
    try {
      await savePhoto(null);
    } catch (err) {
      await dialog.error(err);
    } finally {
      setUploadingPhoto(false);
    }
  };

  const promptPhoto = async () => {
    const action = await dialog.choose<'camera' | 'library' | 'remove'>({
      title: t('settings.changePhoto'),
      actions: [
        { label: t('settings.takePhoto'), value: 'camera' },
        { label: t('settings.chooseFromGallery'), value: 'library' },
        ...(me?.tailor?.photoUrl
          ? [{ label: t('settings.removePhoto'), value: 'remove' as const, destructive: true }]
          : []),
      ],
    });
    if (action === 'camera') changePhoto('camera');
    else if (action === 'library') changePhoto('library');
    else if (action === 'remove') removePhoto();
  };

  // Keep the server's copy of the UI language in sync so push copy is localized.
  const prefsQ = useNotificationPreferences();
  const updatePrefs = useUpdateNotificationPreferences();
  useEffect(() => {
    if (prefsQ.data && prefsQ.data.language !== language) {
      updatePrefs.mutate({ language });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [prefsQ.data?.language, language]);

  const onSignOut = async () => {
    // Clear the cached data for this user before the JWT goes away.
    await clearCache();
    await signOut();
  };

  const onTestNotification = async () => {
    try {
      // Make sure we have a token registered before firing — without this
      // the server has nothing to push to.
      const token = await ensurePushRegistered();
      if (!token) {
        await dialog.alert({
          title: t('settings.pushNotAvailableTitle'),
          message: t('settings.pushNotAvailableBody'),
          tone: 'warning',
        });
        return;
      }
      const count = await sendPushTest();
      await dialog.alert({
        title: t('settings.testSentTitle'),
        message:
          count === 0 ? t('settings.noDevices') : t('settings.sentToDevices', { count }),
        tone: 'success',
      });
    } catch (err) {
      await dialog.error(err);
    }
  };

  if (isLoading) {
    return (
      <Screen>
        <ScreenHeader title={t('settings.title')} />
        <SkeletonForm fields={5} />
      </Screen>
    );
  }

  return (
    <Screen>
      <ScreenHeader title={t('settings.title')} />
      <ScrollView
        {...scroll}
        contentContainerStyle={{ paddingBottom: 96 }}
        showsVerticalScrollIndicator={false}
      >
        <Text variant="h3" tone="text" style={{ marginBottom: spacing.md }}>
          {t('settings.businessProfile')}
        </Text>

        {/* Read-only identity card. Edit lives on its own screen (pencil). */}
        <View
          style={[
            styles.profileCard,
            { backgroundColor: colors.card, borderColor: colors.hairline },
          ]}
        >
          <View style={styles.profileHead}>
            <Pressable
              onPress={promptPhoto}
              disabled={uploadingPhoto}
              style={styles.logoWrap}
              accessibilityRole="button"
              accessibilityLabel={t('settings.changePhoto')}
            >
              {me?.tailor?.photoUrl ? (
                <Image source={{ uri: me.tailor.photoUrl }} style={styles.logo} />
              ) : (
                <Avatar name={me?.tailor?.businessName ?? '—'} size="lg" />
              )}
              {uploadingPhoto ? (
                <View style={styles.logoOverlay}>
                  <ActivityIndicator color="#fff" size="small" />
                </View>
              ) : (
                <View
                  style={[
                    styles.cameraBadge,
                    { backgroundColor: colors.accent, borderColor: colors.card },
                  ]}
                >
                  <Ionicons name="camera" size={12} color={colors.accentText} />
                </View>
              )}
            </Pressable>
            <View style={styles.profileHeadText}>
              <Text variant="h3" numberOfLines={1}>
                {me?.tailor?.businessName ?? '—'}
              </Text>
              {me?.email ? (
                <Text variant="bodySm" tone="textMuted" numberOfLines={1} style={{ marginTop: 2 }}>
                  {me.email}
                </Text>
              ) : null}
            </View>
            <IconButton
              variant="surface"
              size="md"
              onPress={() => router.push('/(app)/profile-edit')}
              accessibilityLabel={t('settings.editProfile')}
            >
              <Ionicons name="pencil" size={18} color={colors.text} />
            </IconButton>
          </View>

          <InfoRow
            label={t('settings.country')}
            value={
              me?.tailor?.countryCode
                ? `${flagEmoji(me.tailor.countryCode)}  ${countryName(me.tailor.countryCode)}`
                : '—'
            }
          />
          {me?.tailor?.location ? (
            <InfoRow label={t('settings.locationLabel')} value={me.tailor.location} />
          ) : null}
          <InfoRow
            label={t('settings.memberSince')}
            value={formatMonthYear(me?.tailor?.createdAt, language)}
          />
        </View>

        {/* Preferences */}
        <SectionTitle>{t('settings.preferences')}</SectionTitle>
        <SettingsCard>
          <SettingsRow
            first
            icon="color-palette-outline"
            label={t('settings.appearance')}
            value={appearanceLabel}
            onPress={() => router.push('/(app)/appearance')}
          />
          <SettingsRow
            icon="language-outline"
            label={t('settings.language')}
            value={currentLanguageLabel}
            onPress={onChooseLanguage}
          />
          <SettingsRow
            icon="notifications-outline"
            label={t('settings.notificationPreferences')}
            onPress={() => router.push('/(app)/notification-preferences')}
          />
          <SettingsRow
            icon="lock-closed-outline"
            label={t('settings.pinLock')}
            onPress={() => router.push('/(app)/pin')}
          />
        </SettingsCard>

        {/* Legal */}
        <SectionTitle>{t('settings.legal')}</SectionTitle>
        <SettingsCard>
          <SettingsRow
            first
            icon="shield-checkmark-outline"
            label={t('settings.privacyPolicy')}
            onPress={() => openLegal('privacy', language)}
          />
          <SettingsRow
            icon="document-text-outline"
            label={t('settings.termsOfService')}
            onPress={() => openLegal('terms', language)}
          />
        </SettingsCard>

        <View style={{ height: spacing.xl }} />
        {/* Dev-only helper — never shown in production builds. */}
        {__DEV__ ? (
          <>
            <Button
              label={t('settings.sendTestNotification')}
              variant="secondary"
              iconLeft={<Ionicons name="paper-plane-outline" size={18} color={colors.text} />}
              onPress={onTestNotification}
            />
            <View style={{ height: spacing.md }} />
            <Button
              label={t('settings.previewWelcome')}
              variant="secondary"
              iconLeft={<Ionicons name="sparkles-outline" size={18} color={colors.text} />}
              onPress={() => {
                previewWelcome();
                router.back();
              }}
            />
            <View style={{ height: spacing.md }} />
          </>
        ) : null}
        <Button
          label={t('settings.signOut')}
          variant="danger"
          iconLeft={<Ionicons name="log-out-outline" size={18} color={colors.accentText} />}
          onPress={onSignOut}
        />
      </ScrollView>
    </Screen>
  );
}

// ----- read-only info row (label left, value right) -----

function InfoRow({ label, value }: { label: string; value: string }) {
  const colors = useThemeColors();
  return (
    <View style={[styles.infoRow, { borderTopColor: colors.hairline }]}>
      <Text variant="bodySm" tone="textMuted">
        {label}
      </Text>
      <Text
        variant="body"
        tone="text"
        numberOfLines={1}
        style={styles.infoValue}
      >
        {value}
      </Text>
    </View>
  );
}

// ----- grouped settings section (card + hairline-separated rows) -----

function SectionTitle({ children }: { children: string }) {
  return (
    <Text
      variant="h3"
      tone="text"
      style={{ marginTop: spacing.xl, marginBottom: spacing.sm }}
    >
      {children}
    </Text>
  );
}

function SettingsCard({ children }: { children: ReactNode }) {
  const colors = useThemeColors();
  return (
    <View
      style={[styles.settingsCard, { backgroundColor: colors.card, borderColor: colors.hairline }]}
    >
      {children}
    </View>
  );
}

function SettingsRow({
  icon,
  label,
  value,
  onPress,
  first,
  showChevron = true,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value?: string;
  onPress: () => void;
  first?: boolean;
  showChevron?: boolean;
}) {
  const colors = useThemeColors();
  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.settingsRow,
        !first && { borderTopWidth: 1, borderTopColor: colors.hairline },
      ]}
    >
      <Ionicons name={icon} size={20} color={colors.text} style={styles.settingsRowIcon} />
      <Text variant="body" tone="text" style={styles.settingsRowLabel} numberOfLines={1}>
        {label}
      </Text>
      {value ? (
        <Text variant="bodySm" tone="textMuted" numberOfLines={1} style={styles.settingsRowValue}>
          {value}
        </Text>
      ) : null}
      {showChevron ? (
        <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  profileCard: {
    borderWidth: 1,
    borderRadius: radii.lg,
    padding: spacing.lg,
  },
  profileHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  profileHeadText: { flex: 1 },
  logoWrap: { width: 56, height: 56 },
  logo: { width: 56, height: 56, borderRadius: 28 },
  cameraBadge: {
    position: 'absolute',
    right: -2,
    bottom: -2,
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
    paddingVertical: spacing.md,
    borderTopWidth: 1,
  },
  infoValue: { flexShrink: 1, textAlign: 'right' },
  settingsCard: {
    borderWidth: 1,
    borderRadius: radii.lg,
    paddingHorizontal: spacing.lg,
  },
  settingsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.md,
  },
  settingsRowIcon: { width: 22, textAlign: 'center' },
  settingsRowLabel: { flex: 1 },
  settingsRowValue: { flexShrink: 1, textAlign: 'right', maxWidth: '45%' },
});
