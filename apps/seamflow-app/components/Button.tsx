// ============================================================================
// Back-compat wrapper around the Atelier <Button> primitive.
//
// Existing screens import `{ Button }` from this path with the legacy prop
// shape `{ label, onPress, variant?, disabled?, loading? }`. We keep that
// surface and forward everything to `@seamflow/ui`'s Button, which gives
// every screen the new font / pill radius / spring-on-press for free.
//
// The only prop translation: legacy `variant: 'danger'` → Atelier
// `variant: 'destructive'`. All other variant names are identical.
//
// New screens should import directly from `@seamflow/ui` and skip this
// shim — it exists to avoid touching 30+ existing call sites in one go.
// ============================================================================

import {
  Button as AtelierButton,
  type ButtonVariant as AtelierVariant,
} from '@seamflow/ui';

type LegacyVariant = 'primary' | 'secondary' | 'danger';

interface Props {
  label: string;
  onPress: () => void;
  variant?: LegacyVariant;
  disabled?: boolean;
  loading?: boolean;
}

const VARIANT_MAP: Record<LegacyVariant, AtelierVariant> = {
  primary: 'primary',
  secondary: 'secondary',
  danger: 'destructive',
};

export function Button({
  label,
  onPress,
  variant = 'primary',
  disabled,
  loading,
}: Props) {
  return (
    <AtelierButton
      label={label}
      onPress={onPress}
      variant={VARIANT_MAP[variant]}
      disabled={disabled}
      loading={loading}
    />
  );
}
