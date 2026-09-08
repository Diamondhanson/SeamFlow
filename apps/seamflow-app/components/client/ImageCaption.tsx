// ============================================================================
// The name-and-price bar laid over the bottom of a design's photo.
//
// The native counterpart of the web catalogue's caption, and it has to read as
// the same object — a client may see the shop in a browser first and in the
// app afterwards.
//
// The web version uses several `backdrop-filter` layers masked by a gradient,
// which React Native has no equivalent for: `BlurView` blurs uniformly and
// there is no mask-image. The ramp is built instead from a few bottom-anchored
// BlurViews of increasing intensity, each taller than the last, so reading
// down the bar you pass through progressively more blur. Stepped rather than
// continuous, but at this size the steps are not visible.
//
// As on the web, legibility does NOT come from the blur. Blurring leaves
// brightness alone, so white text over a blurred white dress is still white on
// white — and a tailor's catalogue is full of white dresses. The stepped dark
// scrim is what guarantees contrast.
// ============================================================================

import { StyleSheet, View } from 'react-native';
import { BlurView } from 'expo-blur';
import { Text } from '@seamflow/ui';

export interface ImageCaptionProps {
  title?: string | null;
  price?: string | null;
}

/** Bottom-anchored bands: taller band = weaker blur, so the ramp builds downward. */
const BLUR_BANDS = [
  { height: '100%' as const, intensity: 8 },
  { height: '72%' as const, intensity: 14 },
  { height: '46%' as const, intensity: 22 },
  { height: '24%' as const, intensity: 32 },
];

/** Stepped scrim, transparent at the top to ~72% at the bottom. */
const SCRIM_BANDS = [
  { height: '100%' as const, opacity: 0.1 },
  { height: '74%' as const, opacity: 0.16 },
  { height: '50%' as const, opacity: 0.2 },
  { height: '28%' as const, opacity: 0.26 },
];

export function ImageCaption({ title, price }: ImageCaptionProps) {
  if (!title && !price) return null;

  return (
    <View style={styles.wrap} pointerEvents="none">
      {BLUR_BANDS.map((b) => (
        <BlurView
          key={`b${b.intensity}`}
          intensity={b.intensity}
          tint="dark"
          style={[styles.band, { height: b.height }]}
        />
      ))}
      {SCRIM_BANDS.map((b, i) => (
        <View
          key={`s${i}`}
          style={[styles.band, { height: b.height, backgroundColor: `rgba(12,10,9,${b.opacity})` }]}
        />
      ))}

      <View style={styles.content}>
        {title ? (
          <Text variant="bodySm" style={styles.title} numberOfLines={2}>
            {title}
          </Text>
        ) : null}
        {price ? (
          <Text variant="caption" style={styles.price} numberOfLines={1}>
            {price}
          </Text>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { position: 'absolute', left: 0, right: 0, bottom: 0 },
  band: { position: 'absolute', left: 0, right: 0, bottom: 0 },
  content: { paddingHorizontal: 10, paddingBottom: 8, paddingTop: 26 },
  title: {
    color: '#fff',
    fontWeight: '600',
    // A tight shadow rather than a soft glow: the scrim already supplies the
    // broad contrast, this only sharpens strokes against a bright detail.
    textShadowColor: 'rgba(12,10,9,0.55)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  price: {
    color: 'rgba(255,255,255,0.9)',
    marginTop: 2,
    fontWeight: '600',
    letterSpacing: 0.7,
    textShadowColor: 'rgba(12,10,9,0.55)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
});
