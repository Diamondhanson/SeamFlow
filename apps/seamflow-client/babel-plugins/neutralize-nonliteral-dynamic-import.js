// Metro/Hermes can only handle dynamic `import()` when the specifier is a
// static string literal (Metro rewrites those into async requires). A dynamic
// import with a *variable/expression* specifier is left as raw `import()`,
// which Hermes then refuses to compile ("Invalid expression encountered"),
// failing release bundles.
//
// The real-world offender is @supabase/supabase-js, which optionally lazy-loads
// OpenTelemetry via `import(OTEL_PKG)` (OTEL_PKG being a variable). That package
// isn't installed and the call already falls back to null, so replacing such
// non-literal dynamic imports with `Promise.resolve(null)` is behaviour-safe.
//
// Static string `import('foo')` calls are deliberately left untouched so real
// code-splitting keeps working.
module.exports = function neutralizeNonLiteralDynamicImport({ types: t }) {
  return {
    name: 'neutralize-nonliteral-dynamic-import',
    visitor: {
      CallExpression(path) {
        if (path.node.callee.type !== 'Import') return;
        const arg = path.node.arguments[0];
        if (arg && t.isStringLiteral(arg)) return; // keep static imports
        path.replaceWith(
          t.callExpression(
            t.memberExpression(t.identifier('Promise'), t.identifier('resolve')),
            [t.nullLiteral()],
          ),
        );
      },
    },
  };
};
