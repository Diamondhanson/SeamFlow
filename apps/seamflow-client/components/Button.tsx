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

import { type ReactNode } from 'react';
import {
  Button as AtelierButton,
  type ButtonVariant as AtelierVariant,
  type ButtonSize,
} from '@seamflow/ui';

type LegacyVariant = 'primary' | 'secondary' | 'danger' | 'ghost';

interface Props {
  label: string;
  onPress: () => void;
  variant?: LegacyVariant;
  size?: ButtonSize;
  /** Stretch to fill parent width. Defaults to true (form buttons). Set false
   *  for inline actions (e.g. a "+ Add" beside a section header) so the button
   *  sizes to its label instead of spilling across the row. */
  fullWidth?: boolean;
  disabled?: boolean;
  loading?: boolean;
  /** Icon node rendered left of the label — Atelier way to replace the old
   *  emoji-in-label pattern. */
  iconLeft?: ReactNode;
  iconRight?: ReactNode;
}

const VARIANT_MAP: Record<LegacyVariant, AtelierVariant> = {
  primary: 'primary',
  secondary: 'secondary',
  danger: 'destructive',
  ghost: 'ghost',
};

export function Button({
  label,
  onPress,
  variant = 'primary',
  size,
  fullWidth,
  disabled,
  loading,
  iconLeft,
  iconRight,
}: Props) {
  return (
    <AtelierButton
      label={label}
      onPress={onPress}
      variant={VARIANT_MAP[variant]}
      size={size}
      fullWidth={fullWidth}
      disabled={disabled}
      loading={loading}
      iconLeft={iconLeft}
      iconRight={iconRight}
    />
  );
}
