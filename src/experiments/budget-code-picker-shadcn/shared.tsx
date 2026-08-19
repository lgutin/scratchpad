import * as React from "react";
import { Check } from "lucide-react";

import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { cn } from "@/lib/utils";
import {
  SEGMENTS,
  assembledCode,
  globalItemsFor,
  projectItemsFor,
  type Composite,
  type SegmentItem,
  type SegmentKey,
} from "./data";

/** Small colored dot marking a segment type. */
export function SegmentDot({
  segment,
  className,
}: {
  segment: SegmentKey;
  className?: string;
}) {
  return (
    <span
      className={cn("inline-block size-2 shrink-0 rounded-full", className)}
      style={{ backgroundColor: SEGMENTS[segment].accent }}
    />
  );
}

/**
 * A single-segment picker built on cmdk. Project-scoped items are pinned to the
 * top ("On this project") — the core fix for JPM-13707 — with the global list
 * below. Long segments (cost-code) get a search field; short ones don't.
 */
export function SegmentList({
  segment,
  value,
  onSelect,
  autoFocus = true,
}: {
  segment: SegmentKey;
  value?: SegmentItem;
  onSelect: (item: SegmentItem) => void;
  autoFocus?: boolean;
}) {
  const meta = SEGMENTS[segment];
  const projectItems = projectItemsFor(segment);
  const globalItems = globalItemsFor(segment);

  const renderItem = (item: SegmentItem) => (
    <CommandItem
      key={item.id}
      value={`${item.label} ${item.description ?? ""} ${item.token}`}
      onSelect={() => onSelect(item)}
      className="gap-2"
    >
      <span className="font-medium">{item.label}</span>
      {item.description ? (
        <span className="text-muted-foreground truncate text-xs">
          {item.description}
        </span>
      ) : null}
      <span className="text-muted-foreground/70 ml-auto font-mono text-[11px]">
        {item.token}
      </span>
      {value?.id === item.id ? <Check className="size-4" /> : null}
    </CommandItem>
  );

  return (
    <Command
      // Let cmdk filter across label + description + token.
      className="w-full"
      loop
    >
      {/* Always render the input so every segment — even short ones — is fully
          keyboard-navigable (cmdk needs it to focus/highlight items). */}
      <CommandInput autoFocus={autoFocus} placeholder={`Search ${meta.noun}…`} />
      <CommandList className="max-h-[280px]">
        <CommandEmpty>No {meta.noun} found.</CommandEmpty>
        {projectItems.length > 0 ? (
          <CommandGroup heading="On this project">
            {projectItems.map(renderItem)}
          </CommandGroup>
        ) : null}
        {globalItems.length > 0 ? (
          <CommandGroup heading={`All ${meta.label.toLowerCase()}s`}>
            {globalItems.map(renderItem)}
          </CommandGroup>
        ) : null}
      </CommandList>
    </Command>
  );
}

/** The assembled code as period-joined tokens with segment coloring. */
export function CodeTokens({
  composite,
  structure,
  className,
}: {
  composite: Composite;
  structure: SegmentKey[];
  className?: string;
}) {
  const chosen = structure.filter((k) => composite[k]);
  if (chosen.length === 0) {
    return (
      <span className={cn("text-muted-foreground", className)}>
        No code assembled yet
      </span>
    );
  }
  return (
    <span className={cn("font-mono", className)}>
      {structure.map((key, i) => {
        const item = composite[key];
        if (!item) return null;
        const isFirst = structure.slice(0, i).every((k) => !composite[k]);
        return (
          <React.Fragment key={key}>
            {!isFirst ? <span className="text-muted-foreground/50">.</span> : null}
            <span style={{ color: SEGMENTS[key].accent }}>{item.token}</span>
          </React.Fragment>
        );
      })}
    </span>
  );
}

/** Full readout: big code + per-segment breakdown. */
export function AssembledReadout({
  composite,
  structure,
  onEdit,
}: {
  composite: Composite;
  structure: SegmentKey[];
  onEdit?: (segment: SegmentKey) => void;
}) {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-baseline gap-2">
        <span className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
          Assembled
        </span>
        <CodeTokens
          composite={composite}
          structure={structure}
          className="text-lg"
        />
      </div>
      <div className="flex flex-col gap-1.5">
        {structure.map((key) => {
          const item = composite[key];
          const content = (
            <div className="flex items-center gap-2 text-sm">
              <SegmentDot segment={key} />
              <span className="text-muted-foreground w-24 shrink-0">
                {SEGMENTS[key].label}
              </span>
              <span className={cn(!item && "text-muted-foreground/60")}>
                {item ? (
                  <>
                    {item.label}
                    {item.description ? (
                      <span className="text-muted-foreground">
                        {" · "}
                        {item.description}
                      </span>
                    ) : null}
                  </>
                ) : (
                  "Not set"
                )}
              </span>
            </div>
          );
          return onEdit ? (
            <button
              key={key}
              type="button"
              onClick={() => onEdit(key)}
              className="hover:bg-accent -mx-2 rounded-md px-2 py-1 text-left transition-colors"
            >
              {content}
            </button>
          ) : (
            <div key={key} className="-mx-2 px-2 py-1">
              {content}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export const codeString = assembledCode;
