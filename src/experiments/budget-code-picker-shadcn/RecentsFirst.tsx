import * as React from "react";
import { Check, Clock, Plus, Star } from "lucide-react";

import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { CodeTokens } from "./shared";
import { SegmentedBuilder } from "./SegmentedBuilder";
import {
  RECENTS,
  TEMPLATES,
  compositeFromIds,
  assembledCode,
  type Composite,
  type SavedCode,
  type SegmentKey,
} from "./data";

/**
 * Direction D — Recents / templates first.
 * Most codes repeat per project, so lead with one-click recents + saved
 * templates and make full assembly the fallback. Search filters both lists.
 */
export function RecentsFirst({
  structure,
  value,
  onChange,
}: {
  structure: SegmentKey[];
  value: Composite;
  onChange: (next: Composite) => void;
}) {
  const [query, setQuery] = React.useState("");
  const [building, setBuilding] = React.useState(false);

  const currentCode = assembledCode(value, structure);

  const filter = (list: SavedCode[]) =>
    list.filter((s) => {
      if (!query) return true;
      const code = assembledCode(compositeFromIds(s.ids), structure);
      return (
        s.name.toLowerCase().includes(query.toLowerCase()) ||
        code.toLowerCase().includes(query.toLowerCase())
      );
    });

  const row = (s: SavedCode, meta?: React.ReactNode) => {
    const composite = compositeFromIds(s.ids);
    const code = assembledCode(composite, structure);
    const isActive = code === currentCode && currentCode !== "";
    return (
      <button
        key={s.id}
        type="button"
        onClick={() => onChange(composite)}
        className={cn(
          "hover:bg-accent flex w-full items-center gap-3 rounded-md px-3 py-2 text-left transition-colors",
          isActive && "bg-accent"
        )}
      >
        <div className="flex min-w-0 flex-1 flex-col">
          <span className="truncate text-sm font-medium">{s.name}</span>
          <span className="text-xs">
            <CodeTokens
              composite={composite}
              structure={structure}
              className="text-xs"
            />
          </span>
        </div>
        {meta ? (
          <span className="text-muted-foreground shrink-0 text-xs">{meta}</span>
        ) : null}
        {isActive ? <Check className="size-4 shrink-0" /> : null}
      </button>
    );
  };

  const recents = filter(RECENTS);
  const templates = filter(TEMPLATES);

  return (
    <div className="flex flex-col gap-3">
      <Input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search recent codes and templates…"
      />

      <div className="flex flex-col">
        <div className="text-muted-foreground flex items-center gap-1.5 px-1 py-1.5 text-xs font-medium">
          <Clock className="size-3.5" /> Recently used
        </div>
        {recents.length ? (
          recents.map((s) => row(s, s.usedBy))
        ) : (
          <p className="text-muted-foreground px-3 py-2 text-sm">No matches.</p>
        )}
      </div>

      <div className="flex flex-col">
        <div className="text-muted-foreground flex items-center gap-1.5 px-1 py-1.5 text-xs font-medium">
          <Star className="size-3.5" /> Saved templates
        </div>
        {templates.length ? (
          templates.map((s) => row(s))
        ) : (
          <p className="text-muted-foreground px-3 py-2 text-sm">No matches.</p>
        )}
      </div>

      <Separator />

      {building ? (
        <div className="flex flex-col gap-2">
          <span className="text-muted-foreground text-xs font-medium">
            Build from scratch
          </span>
          <SegmentedBuilder
            structure={structure}
            value={value}
            onChange={onChange}
          />
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setBuilding(true)}
          className="text-muted-foreground hover:text-foreground flex items-center gap-2 px-1 text-sm"
        >
          <Plus className="size-4" /> Build a new code
        </button>
      )}
    </div>
  );
}
