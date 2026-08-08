import { useState } from 'react';
import { Platform } from 'react-native';

/**
 * Focus handling for a raw <TextInput> that isn't the Atelier <Input>.
 *
 * Exists because of a web-only problem: react-native-web renders TextInput as a
 * real <input>, so the browser draws its own focus ring INSIDE the field — a
 * second, differently-shaped box around the text that native never shows.
 *
 * You cannot simply delete that ring. It is the only focus indicator a keyboard
 * user gets, so removing it without a replacement is an accessibility
 * regression. This hook makes doing it correctly the path of least resistance:
 * it hands you the replacement (`focused`) and the suppression (`webReset`)
 * together, so you can't take one without the other.
 *
 * Usage — mirror what <Input> does, i.e. move the indicator out to the
 * container that visually reads as the field:
 *
 *   const { focused, focusProps, webReset } = useFieldFocus();
 *   <View style={{ borderColor: focused ? colors.primary : colors.hairline }}>
 *     <TextInput {...focusProps} style={[styles.input, webReset]} />
 *   </View>
 *
 * If a site has no container to highlight, give it one before reaching for
 * `webReset` — an invisible focus state is worse than an ugly one.
 */
export function useFieldFocus(handlers?: {
  onFocus?: () => void;
  onBlur?: () => void;
}) {
  const [focused, setFocused] = useState(false);
  return {
    focused,
    focusProps: {
      onFocus: () => {
        setFocused(true);
        handlers?.onFocus?.();
      },
      onBlur: () => {
        setFocused(false);
        handlers?.onBlur?.();
      },
    },
    /**
     * Spread into the TextInput's style array. `null` on native, where there is
     * no browser ring to suppress and the property does not exist.
     */
    webReset: (Platform.OS === 'web' ? { outlineStyle: 'none' } : null) as object | null,
  };
}
