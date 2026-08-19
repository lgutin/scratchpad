import * as React from "react";
import { X } from "lucide-react";

import { cn } from "@/lib/utils";
import { SegmentDot } from "./shared";
import {
  SEGMENTS,
  ITEMS_BY_SEGMENT,
  type Composite,
  type SegmentItem,
  type SegmentKey,
} from "./data";

interface Suggestion {
  segment: SegmentKey;
  item: SegmentItem;
}

function matches(item: SegmentItem, q: string): boolean {
  if (!q) return true;
  const hay = `${item.label} ${item.description ?? ""} ${item.token}`.toLowerCase();
  return hay.includes(q.toLowerCase());
}

/**
 * Direction C — Single smart input.
 * One forgiving text field. Typing fuzzy-matches across every UNFILLED segment
 * at once (project items first) and assembles tokens as chips inline. Backspace
 * on an empty query pops the last token. Fully keyboard-first.
 */
export function SmartInput({
  structure,
  value,
  onChange,
}: {
  structure: SegmentKey[];
  value: Composite;
  onChange: (next: Composite) => void;
}) {
  const [query, setQuery] = React.useState("");
  const [open, setOpen] = React.useState(false);
  const [active, setActive] = React.useState(0);
  const inputRef = React.useRef<HTMLInputElement>(null);

  const unfilled = structure.filter((k) => !value[k]);

  // Build a flat, ranked suggestion list: for each unfilled segment, project
  // items first, then global — capped so the menu stays scannable.
  const suggestions: Suggestion[] = React.useMemo(() => {
    const out: Suggestion[] = [];
    for (const seg of unfilled) {
      const items = ITEMS_BY_SEGMENT[seg]
        .filter((i) => matches(i, query))
        .sort((a, b) => Number(!!b.onProject) - Number(!!a.onProject))
        .slice(0, 6);
      for (const item of items) out.push({ segment: seg, item });
    }
    return out;
  }, [unfilled, query]);

  React.useEffect(() => setActive(0), [query]);

  const fill = (s: Suggestion) => {
    onChange({ ...value, [s.segment]: s.item });
    setQuery("");
    setActive(0);
    inputRef.current?.focus();
  };

  const popLast = () => {
    const filled = structure.filter((k) => value[k]);
    const last = filled[filled.length - 1];
    if (last) {
      const next = { ...value };
      delete next[last];
      onChange(next);
    }
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Backspace" && query === "") {
      popLast();
      return;
    }
    if (!open && (e.key === "ArrowDown" || e.key === "ArrowUp")) setOpen(true);
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((a) => Math.min(a + 1, suggestions.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((a) => Math.max(a - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (suggestions[active]) fill(suggestions[active]);
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  };

  // Group suggestions by segment for display while keeping a flat index for nav.
  let flatIndex = -1;

  return (
    <div className="relative">
      <div
        className={cn(
          "focus-within:border-ring focus-within:ring-ring/40 flex min-h-9 flex-wrap items-center gap-1.5 rounded-md border bg-background px-2 py-1.5 transition-shadow focus-within:ring-[3px]"
        )}
        onClick={() => inputRef.current?.focus()}
      >
        {structure
          .filter((k) => value[k])
          .map((k) => {
            const item = value[k]!;
            return (
              <span
                key={k}
                className="bg-muted flex items-center gap-1 rounded px-1.5 py-0.5 text-xs font-medium"
              >
                <SegmentDot segment={k} />
                <span style={{ color: SEGMENTS[k].accent }} className="font-mono">
                  {item.token}
                </span>
                <button
                  type="button"
                  className="text-muted-foreground hover:text-foreground"
                  onClick={(e) => {
                    e.stopPropagation();
                    const next = { ...value };
                    delete next[k];
                    onChange(next);
                  }}
                >
                  <X className="size-3" />
                </button>
              </span>
            );
          })}
        <input
          ref={inputRef}
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 120)}
          onKeyDown={onKeyDown}
          placeholder={
            unfilled.length
              ? `Type a ${SEGMENTS[unfilled[0]].noun}, code, or name…`
              : "All segments set"
          }
          className="placeholder:text-muted-foreground min-w-[12rem] flex-1 bg-transparent text-sm outline-none"
        />
      </div>

      {open && suggestions.length > 0 ? (
        <div className="bg-popover text-popover-foreground absolute top-full right-0 left-0 z-50 mt-1 overflow-hidden rounded-md border shadow-md">
          <div className="max-h-[300px] overflow-y-auto p-1">
            {unfilled.map((seg) => {
              const segSuggestions = suggestions.filter((s) => s.segment === seg);
              if (segSuggestions.length === 0) return null;
              return (
                <div key={seg} className="pb-1">
                  <div className="text-muted-foreground px-2 py-1 text-xs font-medium">
                    {SEGMENTS[seg].label}
                  </div>
                  {segSuggestions.map((s) => {
                    flatIndex += 1;
                    const idx = flatIndex;
                    return (
                      <button
                        key={s.item.id}
                        type="button"
                        // onMouseDown (not click) so it fires before input blur.
                        onMouseDown={(e) => {
                          e.preventDefault();
                          fill(s);
                        }}
                        onMouseEnter={() => setActive(idx)}
                        className={cn(
                          "flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-left text-sm",
                          active === idx && "bg-accent text-accent-foreground"
                        )}
                      >
                        <SegmentDot segment={seg} />
                        <span className="font-medium">{s.item.label}</span>
                        {s.item.description ? (
                          <span className="text-muted-foreground truncate text-xs">
                            {s.item.description}
                          </span>
                        ) : null}
                        {s.item.onProject ? (
                          <span className="ml-auto rounded bg-emerald-100 px-1.5 py-0.5 text-[10px] font-medium text-emerald-700">
                            project
                          </span>
                        ) : (
                          <span className="text-muted-foreground/60 ml-auto font-mono text-[11px]">
                            {s.item.token}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>
      ) : null}
    </div>
  );
}
