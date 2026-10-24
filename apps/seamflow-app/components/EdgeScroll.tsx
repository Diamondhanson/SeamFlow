// ============================================================================
// ScrollView / FlatList that run to the bottom edge of a <Screen bleed>.
//
// Drop-in replacements for the react-native ones: import them from here and
// nothing else about the call site changes. Inside a bleed screen they add the
// bottom inset (see lib/screen-bleed.ts) to the end of their own content;
// everywhere else, and for any horizontal list, they render the stock
// component untouched.
// ============================================================================

import {
  forwardRef,
  type ForwardedRef,
  type ReactElement,
  type Ref,
} from 'react';
import {
  FlatList as RNFlatList,
  ScrollView as RNScrollView,
  StyleSheet,
  type FlatListProps,
  type ScrollViewProps,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { useScreenBleed } from '../lib/screen-bleed';

/**
 * `style` with `bleed` px added to its bottom padding. Reads the effective
 * bottom padding first (`paddingBottom`, else `paddingVertical`, else
 * `padding`) so a caller's own spacing is added to, never replaced.
 */
export function withBottomBleed(
  style: StyleProp<ViewStyle>,
  bleed: number,
): StyleProp<ViewStyle> {
  if (bleed <= 0) return style;
  const flat = StyleSheet.flatten(style) ?? {};
  const base = flat.paddingBottom ?? flat.paddingVertical ?? flat.padding ?? 0;
  return [flat, { paddingBottom: (typeof base === 'number' ? base : 0) + bleed }];
}

export const ScrollView = forwardRef<RNScrollView, ScrollViewProps>(function EdgeScrollView(
  props,
  ref,
) {
  const bleed = useScreenBleed();
  if (props.horizontal || bleed <= 0) return <RNScrollView ref={ref} {...props} />;
  return (
    <RNScrollView
      ref={ref}
      {...props}
      contentContainerStyle={withBottomBleed(props.contentContainerStyle, bleed)}
    />
  );
});
// A type with the same name, so `useRef<ScrollView>()` keeps working after the
// import is swapped. Value and type live in separate namespaces, so this is legal.
// eslint-disable-next-line @typescript-eslint/no-redeclare
export type ScrollView = RNScrollView;

function EdgeFlatListInner<T>(props: FlatListProps<T>, ref: ForwardedRef<RNFlatList<T>>) {
  const bleed = useScreenBleed();
  if (props.horizontal || bleed <= 0) return <RNFlatList ref={ref} {...props} />;
  return (
    <RNFlatList
      ref={ref}
      {...props}
      contentContainerStyle={withBottomBleed(props.contentContainerStyle, bleed)}
    />
  );
}
export const FlatList = forwardRef(EdgeFlatListInner) as <T>(
  props: FlatListProps<T> & { ref?: Ref<RNFlatList<T>> },
) => ReactElement;
// eslint-disable-next-line @typescript-eslint/no-redeclare
export type FlatList<T = any> = RNFlatList<T>;
