// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require("eslint-config-expo/flat");

module.exports = defineConfig([
  expoConfig,
  {
    ignores: ["dist/*"],
  },
  {
    // Native alerts are banned app-wide — use the centered dialog system
    // (`useDialog()` from `lib/dialog`) for every error / info / confirm /
    // prompt / action menu. See lib/dialog.tsx.
    rules: {
      "no-restricted-imports": [
        "error",
        {
          paths: [
            {
              name: "react-native",
              importNames: ["Alert"],
              message:
                "Don't use Alert. Use useDialog() from lib/dialog (dialog.error/alert/confirm/prompt/choose/pick).",
            },
          ],
        },
      ],
      "no-restricted-syntax": [
        "error",
        {
          selector: "CallExpression[callee.object.name='Alert']",
          message:
            "Don't use Alert.*. Use useDialog() from lib/dialog (dialog.error/alert/confirm/prompt/choose/pick).",
        },
      ],
    },
  },
]);
