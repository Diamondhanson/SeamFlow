const path = require('path');

module.exports = {
  presets: ['babel-preset-expo'],
  plugins: [
    // Must run before the preset so it sees raw `import()` calls. Neutralizes
    // non-literal dynamic imports from deps (e.g. supabase-js's optional
    // `import(OTEL_PKG)`) that Hermes can't compile in release builds.
    // Absolute path via __dirname: a relative path resolves against the CWD,
    // which is the monorepo root under EAS (not the app dir), so babel there
    // couldn't find the plugin and the fix silently didn't apply.
    path.resolve(__dirname, 'babel-plugins/neutralize-nonliteral-dynamic-import.js'),
    'react-native-worklets/plugin',
  ],
};
