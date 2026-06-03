// ============================================================================
// Responsive breakpoints — the spine of tablet support.
//
// We adapt layout to the *available width*, not to "is this a tablet". A phone
// in landscape, a foldable, a small iPad and a 13" iPad Pro are just different
// widths. Thresholds mirror Material's window-size classes / Apple size classes
// so we stay aligned with both platforms.
//
//   compact   < 600 dp   phones (portrait)
//   medium    600–839 dp  small tablets, phones landscape, foldables
//   expanded  >= 840 dp   iPads, large Android tablets
// ============================================================================

import { useWindowDimensions } from 'react-native';

export type Breakpoint = 'compact' | 'medium' | 'expanded';

export const BREAKPOINTS = { medium: 600, expanded: 840 } as const;

/**
 * Max width content is constrained to on large screens. Keeps forms, lists and
 * reading-width content from stretching edge-to-edge on a wide tablet. Screens
 * wrapped in <Screen> inherit this automatically.
 */
export const CONTENT_MAX_WIDTH = 760;

export interface BreakpointInfo {
  width: number;
  height: number;
  breakpoint: Breakpoint;
  isCompact: boolean;
  isMedium: boolean;
  isExpanded: boolean;
  isLandscape: boolean;
}

export function useBreakpoint(): BreakpointInfo {
  const { width, height } = useWindowDimensions();
  const breakpoint: Breakpoint =
    width >= BREAKPOINTS.expanded
      ? 'expanded'
      : width >= BREAKPOINTS.medium
        ? 'medium'
        : 'compact';
  return {
    width,
    height,
    breakpoint,
    isCompact: breakpoint === 'compact',
    isMedium: breakpoint === 'medium',
    isExpanded: breakpoint === 'expanded',
    isLandscape: width > height,
  };
}

/** Column count for tile / card grids, keyed off the active breakpoint. */
export function useGridColumns(): number {
  const { breakpoint } = useBreakpoint();
  return breakpoint === 'expanded' ? 4 : breakpoint === 'medium' ? 3 : 2;
}
