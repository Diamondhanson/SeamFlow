// ============================================================================
// Back-compat wrapper around the Atelier <Input> primitive.
//
// Forwards everything to `@seamflow/ui`'s Input — floating label, hairline
// border, focus ring, Inter font — so every form across the app upgrades
// at once. New screens should import directly from `@seamflow/ui` and
// skip this shim.
// ============================================================================

import { Input as AtelierInput, type InputProps } from '@seamflow/ui';

export type { InputProps };

export function Input(props: InputProps) {
  return <AtelierInput {...props} />;
}
