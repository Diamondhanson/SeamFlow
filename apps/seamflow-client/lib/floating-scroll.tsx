// ============================================================================
// Floating-scroll context — bridges each screen's scroll state to the
// persistent floating logo (rendered once, above the navigator).
//
// The logo lives outside the screens, so it can't read their scroll offsets
// directly. Instead we keep a single reanimated `activity` value (0 = idle,
// 1 = scrolling) in context. Screens spread `useFloatingScroll()` onto their
// ScrollView / FlatList; those handlers drive `activity`, and the logo reads
// it to fade out while the finger (or momentum) is moving and fade back in
// when the list settles.
//
// Handlers fire on the JS thread (plain RN scroll events, no Animated.* needed
// at the call site) and assign `withTiming(...)` to the shared value, which
// reanimated applies on the UI thread — smooth without per-frame JS work.
// ============================================================================

import { createContext, useContext, useMemo, type ReactNode } from 'react';
import {
  useSharedValue,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';

interface FloatingScrollValue {
  activity: SharedValue<number>;
}

const FloatingScrollContext = createContext<FloatingScrollValue | null>(null);

export function FloatingScrollProvider({ children }: { children: ReactNode }) {
  const activity = useSharedValue(0);
  const value = useMemo(() => ({ activity }), [activity]);
  return (
    <FloatingScrollContext.Provider value={value}>
      {children}
    </FloatingScrollContext.Provider>
  );
}

/** The shared scroll-activity value. Safe to call outside the provider (returns
 *  a local, inert value) so screens don't crash in isolation / tests. */
export function useFloatingActivity(): SharedValue<number> {
  const ctx = useContext(FloatingScrollContext);
  const fallback = useSharedValue(0);
  return ctx?.activity ?? fallback;
}

/**
 * Scroll props to spread onto a screen's ScrollView / FlatList so the floating
 * logo reacts to scrolling:
 *
 *   const scroll = useFloatingScroll();
 *   <FlatList {...scroll} ... />
 *   <ScrollView {...scroll} ... />
 */
export function useFloatingScroll() {
  const activity = useFloatingActivity();
  return useMemo(() => {
    const show = () => {
      activity.value = withTiming(1, { duration: 140 });
    };
    const hide = () => {
      // Slower fade-in of the logo once scrolling stops — feels like it
      // settles back rather than snapping.
      activity.value = withTiming(0, { duration: 420 });
    };
    return {
      scrollEventThrottle: 16,
      // App-wide keyboard avoidance for every screen that spreads this onto its
      // ScrollView/FlatList: the focused input scrolls to sit just above the
      // keyboard — but only when it would otherwise be covered (iOS content
      // insets; Android window `adjustResize`). `handled` also lets taps pass
      // through while the keyboard is open instead of being swallowed by a
      // first dismiss tap.
      keyboardShouldPersistTaps: 'handled' as const,
      automaticallyAdjustKeyboardInsets: true,
      onScrollBeginDrag: show,
      onScrollEndDrag: hide,
      onMomentumScrollBegin: show,
      onMomentumScrollEnd: hide,
    };
  }, [activity]);
}
