import * as React from "react";
import { Check, CornerDownLeft } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { CodeTokens, SegmentDot } from "./shared";
import {
  SEGMENTS,
  firstEmptySegment,
  globalItemsFor,
  projectItemsFor,
  type Composite,
  type SegmentItem,
  type SegmentKey,
} from "./data";

/**
 * Direction B — Command-palette / spotlight stepper.
 * One ⌘K launcher walks the segments as a single searchable, keyboard-driven
 * flow. A breadcrumb of chosen tokens sits above the list; Backspace on an empty
 * query steps back. Collapses to the assembled code when the last segment lands.
 */
export function CommandPalette({
  structure,
  value,
  onChange,
}: {
  structure: SegmentKey[];
  value: Composite;
  onChange: (next: Composite) => void;
}) {
  const [open, setOpen] = React.useState(false);
  const [stepIndex, setStepIndex] = React.useState(0);
  const [query, setQuery] = React.useState("");

  const segment = structure[stepIndex];

  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((o) => !o);
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  React.useEffect(() => {
    if (open) {
      const empty = firstEmptySegment(value, structure);
      setStepIndex(empty ? structure.indexOf(empty) : 0);
      setQuery("");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const pick = (item: SegmentItem) => {
    const next = { ...value, [segment]: item };
    onChange(next);
    setQuery("");
    if (stepIndex < structure.length - 1) {
      setStepIndex(stepIndex + 1);
    } else {
      setOpen(false);
    }
  };

  const back = () => {
    if (stepIndex > 0) {
      setStepIndex(stepIndex - 1);
      setQuery("");
    }
  };

  const meta = SEGMENTS[segment];
  const projectItems = projectItemsFor(segment);
  const globalItems = globalItemsFor(segment);

  const renderItem = (item: SegmentItem) => (
    <CommandItem
      key={item.id}
      value={`${item.label} ${item.description ?? ""} ${item.token}`}
      onSelect={() => pick(item)}
      className="gap-2"
    >
      <SegmentDot segment={segment} />
      <span className="font-medium">{item.label}</span>
      {item.description ? (
        <span className="text-muted-foreground truncate text-xs">
          {item.description}
        </span>
      ) : null}
      <span className="text-muted-foreground/70 ml-auto font-mono text-[11px]">
        {item.token}
      </span>
      {value[segment]?.id === item.id ? <Check className="size-4" /> : null}
    </CommandItem>
  );

  return (
    <>
      <Button variant="outline" onClick={() => setOpen(true)} className="gap-2">
        Assemble budget code
        <kbd className="bg-muted text-muted-foreground pointer-events-none ml-1 inline-flex h-5 items-center gap-0.5 rounded border px-1.5 font-mono text-[10px]">
          ⌘K
        </kbd>
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent
          showCloseButton={false}
          className="overflow-hidden p-0"
          aria-describedby={undefined}
        >
          {/* Breadcrumb of chosen tokens + current step. */}
          <div className="flex items-center gap-2 border-b px-4 py-2.5 text-sm">
            <CodeTokens
              composite={value}
              structure={structure}
              className="text-sm"
            />
            <span className="text-muted-foreground/60 select-none">›</span>
            <span className="flex items-center gap-1.5 font-medium">
              <SegmentDot segment={segment} />
              {meta.label}
            </span>
            <span className="text-muted-foreground ml-auto text-xs">
              Step {stepIndex + 1} of {structure.length}
            </span>
          </div>

          <Command
            loop
            onKeyDown={(e) => {
              if (e.key === "Backspace" && query === "") {
                e.preventDefault();
                back();
              }
            }}
          >
            <CommandInput
              autoFocus
              value={query}
              onValueChange={setQuery}
              placeholder={`Search ${meta.noun}…`}
            />
            <CommandList className="max-h-[320px]">
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

          <div className="text-muted-foreground flex items-center gap-3 border-t px-4 py-2 text-[11px]">
            <span className="flex items-center gap-1">
              <CornerDownLeft className="size-3" /> select
            </span>
            <span>↑↓ navigate</span>
            <span>Backspace back a step</span>
            <span>Esc close</span>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
