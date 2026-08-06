// ============================================================================
// Web-only interaction polish.
//
// A React Native app dropped into a browser feels "off" for reasons that have
// nothing to do with layout: no cursor change over tappable things, no hover
// feedback, no focus ring for keyboard users, and text you can't select.
//
// react-native-web renders every <Pressable> as an element with
// role="button" and every <Text> as a <div>/<span>, so ONE stylesheet fixes
// all of it app-wide — no per-component edits, and it automatically covers
// screens written later.
//
// Injected once from the root layout; a no-op on native.
// ============================================================================

import { isWeb } from './platform-capabilities';

const STYLE_ID = 'seamflow-web-polish';

/** Brand purple — matches colors.primary; kept literal because this runs
 *  before/outside the React tree. */
const FOCUS_RING = '#7B30E8';

const CSS = `
/* Tappable things should say so. */
[role="button"], [role="link"], a, [data-focusable="true"] {
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;
}
[role="button"][aria-disabled="true"] { cursor: not-allowed; }

/* Hover feedback — subtle, works on both light and dark surfaces. */
@media (hover: hover) {
  [role="button"]:hover, [role="link"]:hover {
    filter: brightness(1.08);
    transition: filter 120ms ease;
  }
}

/* Keyboard focus ring (only for keyboard users, never on mouse click). */
:focus { outline: none; }
:focus-visible {
  outline: 2px solid ${FOCUS_RING};
  outline-offset: 2px;
  border-radius: 6px;
}

/* Let people select and copy real content — phone numbers, measurements,
   invoice figures. RNW disables selection by default. Interactive chrome
   stays unselectable so drag-select doesn't fight buttons. */
body { -webkit-user-select: text; user-select: text; }
[role="button"], [role="link"], [role="tab"], [role="menuitem"] {
  -webkit-user-select: none;
  user-select: none;
}

/* Inputs get the caret and native text behaviour. */
input, textarea { -webkit-user-select: text; user-select: text; cursor: text; }

/* Slimmer scrollbars so desktop lists don't look like a 1998 web page. */
* { scrollbar-width: thin; }
::-webkit-scrollbar { width: 10px; height: 10px; }
::-webkit-scrollbar-thumb {
  background: rgba(128,128,140,0.45);
  border-radius: 8px;
  border: 2px solid transparent;
  background-clip: content-box;
}
::-webkit-scrollbar-thumb:hover { background: rgba(128,128,140,0.7); background-clip: content-box; }
::-webkit-scrollbar-track { background: transparent; }

/* Stop the whole page rubber-banding sideways on trackpads. */
html, body { overscroll-behavior-x: none; }
`;

/** Inject the web polish stylesheet once. No-op on native. */
export function installWebStyles(): void {
  if (!isWeb) return;
  try {
    const doc = globalThis.document;
    if (!doc || doc.getElementById(STYLE_ID)) return;
    const el = doc.createElement('style');
    el.id = STYLE_ID;
    el.textContent = CSS;
    doc.head.appendChild(el);
  } catch {
    // Non-DOM environment (SSR/test) — nothing to do.
  }
}
