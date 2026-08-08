import { Platform, Switch, type SwitchProps } from 'react-native';
import { useAtelierTheme } from '../theme/ThemeProvider';

/**
 * A theme-coloured Switch.
 *
 * Exists because of one web-only trap: react-native-web's Switch treats
 * `thumbColor` as the OFF-state thumb only. The ON thumb comes from a separate
 * `activeThumbColor` prop that React Native itself does not have — so passing
 * only `thumbColor` (the correct thing to do on native) leaves the checked
 * thumb on RNW's own default, Material teal `#009688`.
 *
 * The result was a purple track with a teal thumb everywhere a switch appeared
 * in the browser and the PWA, while Android looked perfectly fine — which is
 * exactly why it went unnoticed.
 *
 * `activeThumbColor` / `activeTrackColor` are web-only, so they are spread
 * conditionally: passing unknown props to the native Switch is a warning at
 * best and a redbox at worst.
 */
export interface ToggleProps extends Omit<SwitchProps, 'trackColor' | 'thumbColor'> {
  value: boolean;
  onValueChange: (v: boolean) => void;
}

export function Toggle({ value, onValueChange, ...rest }: ToggleProps) {
  const { colors, mode } = useAtelierTheme();

  /**
   * Knob colour.
   *
   * Light mode uses `surface` — already a light shade of the page behind it.
   *
   * Dark mode cannot: `surface` (#1A1A26) sits a hair off the #10101A
   * background, so the knob reads as a hole punched in the track rather than a
   * control sitting on it. `border` is the midnight palette's lightened neutral
   * (clay, #2F2F40) — the same family as the background, a clear step up in
   * lightness. Deliberately not `text`: a near-white knob is an iOS idiom that
   * fights the muted Atelier palette.
   */
  const isDark = mode === 'midnight';
  const knob = isDark ? colors.border : colors.surface;

  /**
   * Off-track must not equal the knob.
   *
   * The default off-track is `border`, which in dark mode is the very colour we
   * just gave the knob — an OFF switch would render as one solid blob with no
   * visible knob at all. Dropping the track to `surface` puts the knob a step
   * lighter than the track it sits in, which is the whole point of the control.
   */
  const offTrack = isDark ? colors.surface : colors.border;

  const webOnly = Platform.OS === 'web'
    ? ({ activeThumbColor: knob, activeTrackColor: colors.primary } as object)
    : null;

  return (
    <Switch
      value={value}
      onValueChange={onValueChange}
      trackColor={{ true: colors.primary, false: offTrack }}
      thumbColor={knob}
      {...webOnly}
      {...rest}
    />
  );
}
