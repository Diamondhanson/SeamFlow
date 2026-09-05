import { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Text, useAtelierTheme } from '@seamflow/ui';
import { Screen } from '../../components/Screen';
import { FormScroll } from '../../components/FormScroll';
import { ScreenHeader } from '../../components/ScreenHeader';
import { Input } from '../../components/Input';
import { Button } from '../../components/Button';
import { CountryPickerModal } from '../../components/CountryPickerModal';
import { useMe, useUpsertMyTailor } from '../../lib/queries';
import { countryName, flagEmoji } from '../../lib/countries';
import { currencyForCountry } from '@seamflow/utils';
import { spacing } from '../../lib/theme';
import { useTranslation } from '../../lib/i18n';
import { useDialog } from '../../lib/dialog';
import { useProfileGateControls } from '../../lib/profile-gate';

export default function ProfileEdit() {
  const { data: me } = useMe();
  const upsert = useUpsertMyTailor();
  const { t } = useTranslation();
  const dialog = useDialog();
  const gate = useProfileGateControls();

  // `?onboarding=1` — brand-new user ushered here after signup: show a "Skip for
  // now" escape and return them to the dashboard on save.
  // `?returnTo=1` — sent here by a gated action (share/publish): on save, return
  // and resume what they were doing (lib/profile-gate).
  const params = useLocalSearchParams<{ onboarding?: string; returnTo?: string }>();
  const isOnboarding = params.onboarding === '1';
  const isReturnTo = params.returnTo === '1';

  const [businessName, setBusinessName] = useState('');
  const [countryCode, setCountryCode] = useState('CM');
  const [location, setLocation] = useState('');
  const [currency, setCurrency] = useState('XAF');
  const [pickerOpen, setPickerOpen] = useState(false);
  const savedRef = useRef(false);

  // If we were opened by a gated action but the user leaves without saving,
  // drop the pending action so it can't fire on some later, unrelated save.
  useEffect(() => {
    return () => {
      if (isReturnTo && !savedRef.current) gate.clearPending();
    };
  }, [isReturnTo, gate]);

  // Picking a new country defaults the currency to that country's currency
  // (the tailor can still edit it below).
  const onSelectCountry = (code: string) => {
    setCountryCode(code);
    setCurrency(currencyForCountry(code));
  };

  // Hydrate from the loaded tailor.
  useEffect(() => {
    if (me?.tailor) {
      setBusinessName(me.tailor.businessName);
      setCountryCode(me.tailor.countryCode);
      setLocation(me.tailor.location ?? '');
      setCurrency(me.tailor.currency);
    }
  }, [me?.tailor]);

  const save = () => {
    upsert.mutate(
      {
        businessName: businessName.trim(),
        countryCode: countryCode.toUpperCase(),
        currency: currency.toUpperCase(),
        location: location.trim() || null,
      },
      {
        onSuccess: async () => {
          savedRef.current = true;
          // Came from a gated action: slip back and resume it, no interstitial.
          if (isReturnTo) {
            gate.resolvePending();
            router.back();
            return;
          }
          // First-run setup: straight to the dashboard.
          if (isOnboarding) {
            router.replace('/(app)');
            return;
          }
          await dialog.alert({
            title: t('settings.saved'),
            message: t('settings.savedBody'),
            tone: 'success',
          });
          router.back();
        },
        onError: (err) => void dialog.error(err, { title: t('settings.error') }),
      },
    );
  };

  return (
    <Screen>
      <ScreenHeader title={t('settings.editProfile')} />
      <FormScroll
        contentContainerStyle={{ paddingBottom: 96 }}
        showsVerticalScrollIndicator={false}
      >
        <Input
          label={t('settings.businessName')}
          value={businessName}
          onChangeText={setBusinessName}
          placeholder={t('settings.businessNamePlaceholder')}
        />

        <CountrySelectField
          label={t('settings.country')}
          countryCode={countryCode}
          onPress={() => setPickerOpen(true)}
        />

        <Input
          label={t('settings.currency')}
          value={currency}
          onChangeText={setCurrency}
          autoCapitalize="characters"
          maxLength={3}
        />

        <Input
          label={t('settings.location')}
          value={location}
          onChangeText={setLocation}
          placeholder={t('settings.locationPlaceholder')}
        />

        <View style={{ height: spacing.sm }} />
        <Button
          label={t('settings.save')}
          onPress={save}
          loading={upsert.isPending}
          disabled={!businessName.trim() || countryCode.length !== 2 || currency.trim().length !== 3}
        />

        {isOnboarding ? (
          <>
            <View style={{ height: spacing.sm }} />
            <Button
              label={t('settings.skipForNow')}
              variant="ghost"
              onPress={() => router.replace('/(app)')}
            />
          </>
        ) : null}
      </FormScroll>

      <CountryPickerModal
        visible={pickerOpen}
        selected={countryCode}
        onSelect={onSelectCountry}
        onClose={() => setPickerOpen(false)}
        title={t('settings.selectCountry')}
        searchPlaceholder={t('settings.searchCountry')}
      />
    </Screen>
  );
}

// A tappable field styled to match the Atelier <Input> resting state: hairline
// box, small floated label, value inside, chevron on the right. Opens the
// country picker instead of a keyboard.
function CountrySelectField({
  label,
  countryCode,
  onPress,
}: {
  label: string;
  countryCode: string;
  onPress: () => void;
}) {
  const { colors, radii, borderWidths } = useAtelierTheme();
  return (
    <Pressable onPress={onPress} accessibilityRole="button" style={styles.fieldWrap}>
      <View
        style={[
          styles.field,
          {
            borderColor: colors.hairline,
            borderWidth: borderWidths.hairline,
            borderRadius: radii.m,
            backgroundColor: colors.surface,
          },
        ]}
      >
        <Text variant="caption" tone="textMuted" style={styles.fieldLabel}>
          {label}
        </Text>
        <Text variant="body" style={styles.fieldFlag}>
          {flagEmoji(countryCode)}
        </Text>
        <Text variant="body" tone="text" style={styles.fieldValue} numberOfLines={1}>
          {countryName(countryCode)}
        </Text>
        <Ionicons name="chevron-down" size={18} color={colors.textMuted} />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  fieldWrap: { marginBottom: 12 },
  field: {
    minHeight: 56,
    paddingHorizontal: 16,
    paddingTop: 22,
    paddingBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    position: 'relative',
  },
  fieldLabel: { position: 'absolute', left: 16, top: 8 },
  fieldFlag: { width: 24 },
  fieldValue: { flex: 1 },
});
