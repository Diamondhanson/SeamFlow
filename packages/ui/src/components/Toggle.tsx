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
  const { colors } = useAtelierTheme();

  const webOnly = Platform.OS === 'web'
    ? ({ activeThumbColor: colors.surface, activeTrackColor: colors.primary } as object)
    : null;

  return (
    <Switch
      value={value}
      onValueChange={onValueChange}
      trackColor={{ true: colors.primary, false: colors.border }}
      thumbColor={colors.surface}
      {...webOnly}
      {...rest}
    />
  );
}
