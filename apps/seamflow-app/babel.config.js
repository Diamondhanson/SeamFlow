module.exports = {
  presets: ['babel-preset-expo'],
  plugins: [
    // Must run before the preset so it sees raw `import()` calls. Neutralizes
    // non-literal dynamic imports from deps (e.g. supabase-js's optional
    // `import(OTEL_PKG)`) that Hermes can't compile in release builds.
    './babel-plugins/neutralize-nonliteral-dynamic-import.js',
    'react-native-worklets/plugin',
  ],
};
