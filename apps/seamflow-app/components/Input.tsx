// ============================================================================
// Back-compat wrapper around the Atelier <Input> primitive.
//
// Forwards everything to `@seamflow/ui`'s Input — floating label, hairline
// border, focus ring, Inter font — so every form across the app upgrades
// at once. New screens should import directly from `@seamflow/ui` and
// skip this shim.
// ============================================================================

import { forwardRef } from 'react';
import type { TextInput } from 'react-native';
import { Input as AtelierInput, type InputProps } from '@seamflow/ui';

export type { InputProps };

/**
 * Ref-forwarding, like the primitive it wraps. Without it a `ref` passed to
 * this shim silently lands nowhere, so `.focus()` does nothing — which is how
 * a form loses its ability to move focus between fields.
 */
export const Input = forwardRef<TextInput, InputProps>(function Input(props, ref) {
  return <AtelierInput ref={ref} {...props} />;
});
