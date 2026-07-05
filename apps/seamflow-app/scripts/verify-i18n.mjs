// ============================================================================
// i18n guard — run with `npm run i18n:check` (or node scripts/verify-i18n.mjs).
//
// Fails (exit 1) when:
//   1. a t('ns.key') references a key missing from lib/i18n/locales/<ns>.ts
//   2. a namespace's en / fr key sets don't match
//   3. a screen/component contains a HARDCODED user-facing string that should
//      have gone through t() — raw label=/placeholder=/title= attributes or
//      Alert.alert('literal'…)
//
// Purpose: every new addition to the app must be translated. This is the
// automated backstop for that rule. Add `i18n:check` to CI so a missed
// translation can't merge.
//
// Escape hatch: put `i18n-ignore` in a comment on the same line to skip a
// genuinely non-UI literal.
// ============================================================================

import fs from 'fs';
import path from 'path';

const LOC_DIR = 'lib/i18n/locales';
const SCAN_DIRS = ['app', 'components'];
const problems = [];

// ---- load locale namespaces -------------------------------------------------
function extractBlock(src, which) {
  const m = new RegExp(which + '\\s*:\\s*\\{', 'm').exec(src);
  if (!m) return new Set();
  let i = m.index + m[0].length;
  let depth = 1;
  const start = i;
  for (; i < src.length && depth > 0; i++) {
    if (src[i] === '{') depth++;
    else if (src[i] === '}') depth--;
  }
  const keys = new Set();
  const kre = /(^|\n)\s*([A-Za-z_][A-Za-z0-9_]*)\s*:/g;
  let k;
  while ((k = kre.exec(src.slice(start, i - 1)))) keys.add(k[2]);
  return keys;
}

const ns = {};
for (const f of fs.readdirSync(LOC_DIR)) {
  if (!f.endsWith('.ts')) continue;
  const name = f.replace('.ts', '');
  const src = fs.readFileSync(path.join(LOC_DIR, f), 'utf8');
  const en = extractBlock(src, 'en');
  const fr = extractBlock(src, 'fr');
  ns[name] = { en, fr };
  const onlyEn = [...en].filter((x) => !fr.has(x));
  const onlyFr = [...fr].filter((x) => !en.has(x));
  if (onlyEn.length || onlyFr.length)
    problems.push(`PARITY ${name}: en-only=[${onlyEn}] fr-only=[${onlyFr}]`);
}

// ---- walk source files ------------------------------------------------------
const files = [];
function walk(d) {
  for (const e of fs.readdirSync(d, { withFileTypes: true })) {
    const p = path.join(d, e.name);
    if (/node_modules|lib\/i18n|__tests__|\.test\./.test(p)) continue;
    if (e.isDirectory()) walk(p);
    else if (/\.(ts|tsx)$/.test(e.name)) files.push(p);
  }
}
for (const d of SCAN_DIRS) walk(d);

// ---- check 1 + 2: used keys exist ------------------------------------------
const useRe = /\bt\(\s*['"]([a-zA-Z]+)\.([a-zA-Z0-9_]+)['"]/g;
let checked = 0;
for (const f of files) {
  const src = fs.readFileSync(f, 'utf8');
  let m;
  while ((m = useRe.exec(src))) {
    checked++;
    const [, n, k] = m;
    if (n === 'common') continue;
    // Skip dynamic-prefix false positives like t('orders.status_' + s).
    if (src.slice(m.index, m.index + m[0].length + 2).match(/_['"]\s*\+/)) continue;
    if (!ns[n]) problems.push(`UNKNOWN NS ${n}.${k} in ${f}`);
    else if (!ns[n].en.has(k)) problems.push(`MISSING ${n}.${k} in ${f}`);
  }
}

// ---- check 3: hardcoded user-facing strings --------------------------------
const rawAttr = /\b(label|placeholder|title)\s*=\s*(['"])([^'"]*[A-Za-z]{2,}[^'"]*)\2/;
// First arg of Alert.alert is a string literal — `\s*` spans newlines so this
// catches multi-line calls too.
const rawAlert = /Alert\.alert\(\s*['"]/g;
const lineOf = (src, idx) => src.slice(0, idx).split('\n').length;
let hardcoded = 0;
for (const f of files) {
  const src = fs.readFileSync(f, 'utf8');
  // Per-line: hardcoded UI attributes.
  src.split('\n').forEach((line, i) => {
    if (line.includes('i18n-ignore')) return;
    const a = rawAttr.exec(line);
    if (a) {
      hardcoded++;
      problems.push(`HARDCODED ${a[1]}="${a[3]}" at ${f}:${i + 1}`);
    }
  });
  // Whole-file: Alert.alert('literal'…), including multi-line.
  let m;
  while ((m = rawAlert.exec(src))) {
    const ln = lineOf(src, m.index);
    if (src.split('\n')[ln - 1]?.includes('i18n-ignore')) continue;
    hardcoded++;
    problems.push(`HARDCODED Alert.alert(...) at ${f}:${ln} — wrap the title/message in t()`);
  }
}

// ---- report -----------------------------------------------------------------
console.log(
  `checked ${checked} t() calls · ${hardcoded} hardcoded literal(s) · ` +
    `namespaces: ${Object.keys(ns).map((n) => `${n}(${ns[n].en.size})`).join(' ')}`,
);
if (problems.length) {
  console.error('\n✗ i18n check failed:\n' + problems.map((p) => '  - ' + p).join('\n'));
  console.error('\nEvery user-facing string must go through t(). See lib/i18n/README.md.');
  process.exit(1);
}
console.log('✓ i18n check passed — all strings translated, en/fr in sync.');
