# iOS Simulator Keyboard

## Typing in Text Inputs

With the default setup, your **Mac keyboard is connected** to the simulator. You do not need the on-screen software keyboard to type:

1. Tap the email or password field to focus it
2. Type directly on your **Mac keyboard**
3. The text should appear in the input

## Showing the Software Keyboard

If you want to see the on-screen keyboard:

1. In the Simulator menu bar: **I/O** → **Keyboard** → **Connect Hardware Keyboard** (uncheck it)
2. Or press **⌘ Shift K** (Cmd+Shift+K)
3. When unchecked, tapping an input will show the software keyboard

## If Typing Still Doesn't Work

- Restart the app: Stop the Metro bundler and run `npx expo start --clear`
- Try on a physical device – simulator keyboard/input behavior can differ
- Ensure the simulator window has focus when you type
