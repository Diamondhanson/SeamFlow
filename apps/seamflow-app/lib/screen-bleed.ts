// ============================================================================
// Bottom "bleed" — how a scrolling screen reaches the physical bottom edge.
//
// <Screen> normally pads its whole body by the bottom safe-area inset (the
// home-indicator strip on iPhone, the nav bar on Android). That is right for a
// screen with a pinned button, but wrong for one that scrolls: the viewport
// ends at the safe line, so a card scrolling up is chopped dead in the middle
// of the screen with a blank strip underneath.
//
// A <Screen bleed> drops that padding and publishes the amount here instead.
// Scroll containers (FormScroll and the wrappers in components/EdgeScroll)
// add it back as TRAILING padding of their own content, which is what native
// apps do: the content runs underneath the indicator while scrolling, and
// still comes to rest clear of it.
//
// Outside a bleed screen the value is 0, so every consumer is inert there.
// ============================================================================

import { createContext, useContext } from 'react';

export const ScreenBleedContext = createContext(0);

/** Trailing padding a scroll container must add, in px. 0 when not bleeding. */
export function useScreenBleed(): number {
  return useContext(ScreenBleedContext);
}
