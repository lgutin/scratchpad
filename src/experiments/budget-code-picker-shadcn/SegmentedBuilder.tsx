import * as React from "react";
import { ChevronDown } from "lucide-react";

import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { SegmentList, SegmentDot } from "./shared";
import {
  SEGMENTS,
  firstEmptySegment,
  type Composite,
  type SegmentItem,
  type SegmentKey,
} from "./data";

/**
 * Direction A — Segmented builder / breadcrumb.
 * A single control split into slots ([Cost Code] . [Cost Type] . [Phase]).
 * Each slot is a lightweight popover; picking one auto-advances to the next
 * empty slot so the whole code assembles in one continuous flow.
 */
export function SegmentedBuilder({
  structure,
  value,
  onChange,
  size = "default",
  autoAdvance = true,
}: {
  structure: SegmentKey[];
  value: Composite;
  onChange: (next: Composite) => void;
  size?: "default" | "sm";
  autoAdvance?: boolean;
}) {
  const [open, setOpen] = React.useState<SegmentKey | null>(null);

  const pick = (segment: SegmentKey, item: SegmentItem) => {
    const next = { ...value, [segment]: item };
    onChange(next);
    if (autoAdvance) {
      const nextEmpty = firstEmptySegment(next, structure);
      // Defer so the current popover fully closes (and its outside-click /
      // focus-return settles) before the next one opens, otherwise Radix
      // dismisses the freshly-opened popover.
      setOpen(null);
      if (nextEmpty && nextEmpty !== segment) {
        window.setTimeout(() => setOpen(nextEmpty), 120);
      }
    } else {
      setOpen(null);
    }
  };

  const slotPad = size === "sm" ? "px-2 py-1 text-xs" : "px-2.5 py-1.5 text-sm";

  return (
    <div
      className={cn(
        "focus-within:border-ring focus-within:ring-ring/40 inline-flex items-center rounded-md border bg-background transition-shadow focus-within:ring-[3px]",
        size === "sm" ? "gap-0.5 p-0.5" : "gap-1 p-1"
      )}
    >
      {structure.map((key, i) => {
        const item = value[key];
        const meta = SEGMENTS[key];
        return (
          <React.Fragment key={key}>
            {i > 0 ? (
              <span className="text-muted-foreground/40 select-none">.</span>
            ) : null}
            <Popover
              open={open === key}
              onOpenChange={(o) => setOpen(o ? key : null)}
            >
              <PopoverTrigger asChild>
                <button
                  type="button"
                  data-filled={item ? "true" : undefined}
                  className={cn(
                    "hover:bg-accent data-[state=open]:bg-accent flex items-center gap-1.5 rounded font-medium transition-colors outline-none",
                    slotPad,
                    !item && "text-muted-foreground font-normal"
                  )}
                >
                  <SegmentDot segment={key} />
                  {item ? (
                    <span style={{ color: meta.accent }} className="font-mono">
                      {item.token}
                    </span>
                  ) : (
                    <span>{meta.label}</span>
                  )}
                  <ChevronDown className="size-3 opacity-40" />
                </button>
              </PopoverTrigger>
              <PopoverContent
                align="start"
                sideOffset={6}
                className="w-[320px] p-0"
              >
                <SegmentList
                  segment={key}
                  value={item}
                  onSelect={(picked) => pick(key, picked)}
                />
              </PopoverContent>
            </Popover>
          </React.Fragment>
        );
      })}
    </div>
  );
}
