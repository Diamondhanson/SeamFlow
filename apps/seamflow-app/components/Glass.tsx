// ============================================================================
// Liquid Glass, where the platform has it.
//
// iOS 26 draws chrome on a material that refracts and reflects whatever is
// behind it. It is the shape of the current platform, and an app that ignores
// it reads as a visitor. Apple exposes it as UIGlassEffect; expo-glass-effect
// wraps that, and on anything else its GlassView is a plain <View>.
//
// HOW THIS IS USED, AND WHY IT IS A LAYER RATHER THAN A WRAPPER
//
// <GlassLayer> paints the material behind an existing surface, absolutely
// filling it, instead of wrapping the surface in a new component. That keeps
// every layout, gesture responder and animation exactly as it is — the only
// thing that changes is what the background is made of. A wrapper would have
// meant re-parenting sheets and nav bars, which is how you break a keyboard
// responder or a pan gesture without noticing until someone else does.
//
// So each surface does two things:
//
//   backgroundColor: glassOr(colors.overlay)   // transparent when glass paints it
//   <GlassLayer radius={radii.lg} />           // first child, so content sits above
//
// Everywhere without Liquid Glass — Android, the web, iOS 25 and older — both
// of those are no-ops and the surface keeps the solid colour it has today.
// Nothing here is a fallback in the apologetic sense: the solid surface is the
// design, and this is the same design in the local material.
// ============================================================================

import { StyleSheet, type ViewStyle } from 'react-native';
import { GlassView, isLiquidGlassAvailable } from 'expo-glass-effect';
import { useAtelierTheme } from '@seamflow/ui';

/**
 * Does this device draw Liquid Glass?
 *
 * False on Android, on the web and on iOS before 26 — so a build that runs on
 * an older iPhone is not a broken one, it is the previous design. Evaluated
 * once: the answer cannot change while the app is running.
 */
export const GLASS: boolean = isLiquidGlassAvailable();

/**
 * The background colour a surface should use.
 *
 * Transparent when the glass layer is painting it, the given colour otherwise.
 * Always call this rather than branching on GLASS at each call site, so the
 * two can never drift apart and leave an opaque surface with glass behind it.
 */
export function glassOr(color: string): string {
  return GLASS ? 'transparent' : color;
}

export interface GlassLayerProps {
  /** Match the surface's own borderRadius, or the material will square it off. */
  radius?: number;
  /**
   * 'regular' is the everyday material and what chrome should use. 'clear' is
   * thinner and lets more through; it suits a layer over imagery, where the
   * picture matters more than the legibility of what sits on it.
   */
  variant?: 'regular' | 'clear';
  /** A wash of colour in the material. Keep it faint; glass is not paint. */
  tint?: string;
  style?: ViewStyle;
}

/**
 * The material itself. Renders nothing at all without Liquid Glass, so it is
 * free to leave in place on every platform.
 *
 * Pass it as the FIRST child of the surface it belongs to: it fills the parent
 * absolutely, and later children then paint above it in the normal order.
 */
export function GlassLayer({ radius, variant = 'regular', tint, style }: GlassLayerProps) {
  const { mode } = useAtelierTheme();
  if (!GLASS) return null;
  return (
    <GlassView
      pointerEvents="none"
      glassEffectStyle={variant}
      tintColor={tint}
      // The app has its own theme switch, so the material must follow OUR
      // mode rather than the system's. Someone reading in Linen inside a dark
      // OS should not get dark chrome under light content.
      colorScheme={mode === 'midnight' ? 'dark' : 'light'}
      style={[StyleSheet.absoluteFill, radius != null ? { borderRadius: radius } : null, style]}
    />
  );
}
