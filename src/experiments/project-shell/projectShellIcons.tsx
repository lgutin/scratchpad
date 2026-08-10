import type { CSSProperties } from "react";

/* Material Design Icons (Round) — the same glyphs Anvil2 exposes at
   @servicetitan/anvil2/assets/icons/material/round/{edit,settings,expand_more}.svg —
   inlined here with fill rewritten to currentColor so they inherit `color`. */

const edit = `<svg width="100%" height="100%" style="display:block" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg"><path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04a.996.996 0 0 0 0-1.41l-2.34-2.34a.996.996 0 0 0-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/></svg>`;

const settings = `<svg width="100%" height="100%" style="display:block" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg"><path d="M19.14 12.94c.04-.3.06-.61.06-.94 0-.32-.02-.64-.07-.94l2.03-1.58a.49.49 0 0 0 .12-.61l-1.92-3.32a.488.488 0 0 0-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54a.484.484 0 0 0-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.05.3-.09.63-.09.94s.02.64.07.94l-2.03 1.58a.49.49 0 0 0-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z"/></svg>`;

const expandMore = `<svg width="100%" height="100%" style="display:block" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg"><path d="M15.88 9.29 12 13.17 8.12 9.29a.996.996 0 1 0-1.41 1.41l4.59 4.59c.39.39 1.02.39 1.41 0l4.59-4.59a.996.996 0 0 0 0-1.41c-.39-.38-1.03-.39-1.42 0z"/></svg>`;

/** Renders a raw SVG string at an exact square size, inheriting `color`. */
function Glyph({ svg, size, style }: { svg: string; size: number; style?: CSSProperties }) {
  return (
    <span
      aria-hidden
      style={{ display: "block", width: size, height: size, ...style }}
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  );
}

export const IconEdit = ({ size = 20 }: { size?: number }) => <Glyph svg={edit} size={size} />;
export const IconSettings = ({ size = 20 }: { size?: number }) => <Glyph svg={settings} size={size} />;
export const IconExpandMore = ({ size = 20 }: { size?: number }) => <Glyph svg={expandMore} size={size} />;
