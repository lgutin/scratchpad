import * as React from "react";
import { Check, Minus } from "lucide-react";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

import "../../shadcn.css";

import { AssembledReadout } from "./shared";
import { SegmentedBuilder } from "./SegmentedBuilder";
import { CommandPalette } from "./CommandPalette";
import { SmartInput } from "./SmartInput";
import { RecentsFirst } from "./RecentsFirst";
import { InlineCell } from "./InlineCell";
import {
  DEFAULT_STRUCTURE,
  SEGMENTS,
  type Composite,
  type SegmentKey,
} from "./data";

export const meta = {
  title: "Budget Code Picker (shadcn)",
  path: "/budget-code-picker-shadcn",
  date: "2026-08-18T15:30",
  description:
    "Five creative shadcn/ui directions for assembling a budget code (JPM-14945). Anvil2 rule waived.",
};

// ---------------------------------------------------------------------------

interface Note {
  model: string;
  pros: string[];
  cons: string[];
}

function NotesPanel({ note }: { note: Note }) {
  return (
    <div className="flex flex-col gap-3 text-sm">
      <div>
        <div className="text-muted-foreground mb-1 text-xs font-medium tracking-wide uppercase">
          Interaction model
        </div>
        <p className="text-muted-foreground leading-relaxed">{note.model}</p>
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div>
          <div className="mb-1 flex items-center gap-1.5 text-xs font-medium text-emerald-700">
            <Check className="size-3.5" /> Strengths
          </div>
          <ul className="text-muted-foreground flex flex-col gap-1">
            {note.pros.map((p) => (
              <li key={p} className="leading-snug">
                {p}
              </li>
            ))}
          </ul>
        </div>
        <div>
          <div className="mb-1 flex items-center gap-1.5 text-xs font-medium text-amber-700">
            <Minus className="size-3.5" /> Trade-offs
          </div>
          <ul className="text-muted-foreground flex flex-col gap-1">
            {note.cons.map((c) => (
              <li key={c} className="leading-snug">
                {c}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}

/** Frame that mimics a form field wrapping the demo + a live readout + notes. */
function DirectionPanel({
  heading,
  blurb,
  children,
  readout,
  note,
}: {
  heading: string;
  blurb: string;
  children: React.ReactNode;
  readout?: React.ReactNode;
  note: Note;
}) {
  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
      <div className="lg:col-span-3">
        <div className="mb-4">
          <h3 className="text-lg font-semibold">{heading}</h3>
          <p className="text-muted-foreground text-sm">{blurb}</p>
        </div>
        <div className="bg-card rounded-xl border p-5 shadow-sm">
          <div className="flex flex-col gap-1.5">
            <Label className="text-muted-foreground text-xs">Budget code</Label>
            {children}
          </div>
          {readout ? (
            <>
              <div className="my-4 border-t" />
              {readout}
            </>
          ) : null}
        </div>
      </div>
      <div className="lg:col-span-2">
        <div className="bg-muted/40 h-full rounded-xl border p-5">
          <NotesPanel note={note} />
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------

const NOTES: Record<string, Note> = {
  segmented: {
    model:
      "One control split into labeled slots ([Cost Code] . [Cost Type] . [Phase]). Each slot is a lightweight popover with project items pinned on top; picking one auto-advances to the next empty slot, so a full code assembles in a single left-to-right flow. The running composite is always visible in the trigger.",
    pros: [
      "The whole code is visible at all times — no hidden state.",
      "Editing one segment later is a single click on that slot.",
      "Scales cleanly to N segments; slots just wrap.",
      "Collapses to a dense table cell (see Inline-in-cell).",
    ],
    cons: [
      "Multiple popovers = a little more chrome than a single field.",
      "Auto-advance needs a clear focus ring so users don't lose place.",
    ],
  },
  palette: {
    model:
      "A ⌘K launcher opens a spotlight that walks each segment as a searchable step. A breadcrumb of chosen tokens sits above the list; Enter selects, Backspace on an empty query steps back, and the last pick collapses to the assembled code.",
    pros: [
      "Fastest for keyboard power users doing many lines.",
      "Familiar ⌘K muscle memory; one focus target throughout.",
      "Search is front-and-center for the long Cost Code list.",
    ],
    cons: [
      "Modal overlay is heavy for a single inline table cell.",
      "Steppy: the full code isn't editable at a glance mid-flow.",
      "Discoverability relies on knowing the shortcut exists.",
    ],
  },
  smart: {
    model:
      "A single tag-style field. Typing fuzzy-matches across every unfilled segment at once (project items first) — `23-8` surfaces the cost code, `lab` the cost type, `phase 2` the phase. Each pick becomes an inline token chip; Backspace pops the last one.",
    pros: [
      "Lowest-chrome, fastest for users who know their codes.",
      "Forgiving, format-agnostic entry; great on mobile with autocomplete.",
      "Naturally handles any segment order.",
    ],
    cons: [
      "Ambiguity: one query can match several segments — needs good ranking.",
      "Less discoverable for new users who don't know what to type.",
      "Harder to guarantee exactly one item per segment.",
    ],
  },
  recents: {
    model:
      "Leads with one-click Recently used + Saved templates (most codes repeat per project/user), with search across both. Full assembly (the segmented builder) is the fallback behind 'Build a new code'.",
    pros: [
      "Optimizes the 80% case — repeated codes — to a single click.",
      "Strongest project-scoping story; recents are inherently project data.",
      "Great on mobile: tap a recent instead of assembling.",
    ],
    cons: [
      "Cold start (new project, no history) falls back to full assembly.",
      "Needs real recents/templates data + a save affordance to shine.",
    ],
  },
  inline: {
    model:
      "The segmented builder shrunk into a dense, spreadsheet-like cell. Each row's code assembles in place; a fill-down handle copies a completed code to the rows below — the gesture high-volume entry depends on.",
    pros: [
      "Proves the primary pattern survives the hardest surface (the grid).",
      "Fill-down slashes clicks when many lines share a code.",
      "Keeps the whole code legible even at row density.",
    ],
    cons: [
      "Tight space — tokens (not full labels) must carry the meaning.",
      "Fill-down needs undo + a clear visual confirmation.",
    ],
  },
};

// ---------------------------------------------------------------------------

export default function BudgetCodePickerShadcn() {
  const [includeDept, setIncludeDept] = React.useState(false);
  const structure: SegmentKey[] = includeDept
    ? [...DEFAULT_STRUCTURE, "department"]
    : DEFAULT_STRUCTURE;

  // Each direction keeps its own composite so switching tabs is non-destructive.
  const [codes, setCodes] = React.useState<Record<string, Composite>>({});
  const codeFor = (id: string): Composite => codes[id] ?? {};
  const setCode = (id: string) => (next: Composite) =>
    setCodes((c) => ({ ...c, [id]: next }));

  return (
    <TooltipProvider delayDuration={200}>
      <div className="pg-shadcn bg-background text-foreground min-h-screen">
        <div className="mx-auto max-w-5xl px-6 py-12">
          <header className="mb-6">
            <h1 className="text-3xl font-bold tracking-tight">
              Budget Code Picker
            </h1>
            <p className="text-muted-foreground mt-2 max-w-2xl text-sm leading-relaxed">
              Five distinct shadcn/ui directions for assembling a budget code —
              the composite of one item per segment (
              {structure.map((k) => SEGMENTS[k].label).join(" · ")}). Each is
              keyboard-navigable, works on mobile, and surfaces project items
              first (the JPM-13707 fix).
            </p>
            <div className="mt-4 flex items-center gap-2">
              <span className="text-muted-foreground text-xs font-medium">
                Structure:
              </span>
              <span className="font-mono text-xs">
                {structure.map((k) => SEGMENTS[k].label).join(" · ")}
              </span>
              <Button
                variant={includeDept ? "secondary" : "outline"}
                size="sm"
                className="ml-2"
                onClick={() => setIncludeDept((v) => !v)}
              >
                {includeDept ? "Remove Department" : "+ Add Department (scale to 4)"}
              </Button>
            </div>
          </header>

          <Tabs defaultValue="overview">
            <TabsList className="mb-6 flex-wrap">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="segmented">A · Segmented</TabsTrigger>
              <TabsTrigger value="palette">B · ⌘K Palette</TabsTrigger>
              <TabsTrigger value="smart">C · Smart input</TabsTrigger>
              <TabsTrigger value="recents">D · Recents-first</TabsTrigger>
              <TabsTrigger value="inline">E · Inline cell</TabsTrigger>
            </TabsList>

            <TabsContent value="overview">
              <Overview />
            </TabsContent>

            <TabsContent value="segmented">
              <DirectionPanel
                heading="A — Segmented builder / breadcrumb"
                blurb="One control, one slot per segment, auto-advancing. Recommended primary."
                note={NOTES.segmented}
                readout={
                  <AssembledReadout
                    composite={codeFor("segmented")}
                    structure={structure}
                  />
                }
              >
                <div>
                  <SegmentedBuilder
                    structure={structure}
                    value={codeFor("segmented")}
                    onChange={setCode("segmented")}
                  />
                </div>
              </DirectionPanel>
            </TabsContent>

            <TabsContent value="palette">
              <DirectionPanel
                heading="B — Command palette (⌘K) stepper"
                blurb="A spotlight that walks the segments. Try ⌘K anywhere on this tab."
                note={NOTES.palette}
                readout={
                  <AssembledReadout
                    composite={codeFor("palette")}
                    structure={structure}
                  />
                }
              >
                <CommandPalette
                  structure={structure}
                  value={codeFor("palette")}
                  onChange={setCode("palette")}
                />
              </DirectionPanel>
            </TabsContent>

            <TabsContent value="smart">
              <DirectionPanel
                heading="C — Single smart input"
                blurb="Type codes or names; fuzzy matches across all segments at once."
                note={NOTES.smart}
                readout={
                  <AssembledReadout
                    composite={codeFor("smart")}
                    structure={structure}
                  />
                }
              >
                <SmartInput
                  structure={structure}
                  value={codeFor("smart")}
                  onChange={setCode("smart")}
                />
              </DirectionPanel>
            </TabsContent>

            <TabsContent value="recents">
              <DirectionPanel
                heading="D — Recents / templates first"
                blurb="One-click the codes you already use; assemble only when you must."
                note={NOTES.recents}
                readout={
                  <AssembledReadout
                    composite={codeFor("recents")}
                    structure={structure}
                  />
                }
              >
                <RecentsFirst
                  structure={structure}
                  value={codeFor("recents")}
                  onChange={setCode("recents")}
                />
              </DirectionPanel>
            </TabsContent>

            <TabsContent value="inline">
              <DirectionPanel
                heading="E — Inline-in-cell (table fill-down)"
                blurb="The primary pattern collapsed into a dense grid, with fill-down."
                note={NOTES.inline}
              >
                <InlineCell structure={structure} />
              </DirectionPanel>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </TooltipProvider>
  );
}

// ---------------------------------------------------------------------------

const CRITERIA = [
  "Speed to assemble",
  "Project discoverability",
  "Edit one segment later",
  "Density / mobile",
  "Error-proofing",
  "Scales to N segments",
] as const;

type Score = "best" | "good" | "ok";
const SCORES: Record<string, Record<(typeof CRITERIA)[number], Score>> = {
  "A · Segmented": {
    "Speed to assemble": "good",
    "Project discoverability": "best",
    "Edit one segment later": "best",
    "Density / mobile": "best",
    "Error-proofing": "best",
    "Scales to N segments": "best",
  },
  "B · ⌘K Palette": {
    "Speed to assemble": "best",
    "Project discoverability": "good",
    "Edit one segment later": "ok",
    "Density / mobile": "ok",
    "Error-proofing": "good",
    "Scales to N segments": "best",
  },
  "C · Smart input": {
    "Speed to assemble": "best",
    "Project discoverability": "good",
    "Edit one segment later": "good",
    "Density / mobile": "good",
    "Error-proofing": "ok",
    "Scales to N segments": "good",
  },
  "D · Recents-first": {
    "Speed to assemble": "best",
    "Project discoverability": "best",
    "Edit one segment later": "good",
    "Density / mobile": "best",
    "Error-proofing": "good",
    "Scales to N segments": "good",
  },
  "E · Inline cell": {
    "Speed to assemble": "good",
    "Project discoverability": "good",
    "Edit one segment later": "best",
    "Density / mobile": "best",
    "Error-proofing": "good",
    "Scales to N segments": "good",
  },
};

function ScoreDot({ score }: { score: Score }) {
  const map: Record<Score, string> = {
    best: "bg-emerald-500",
    good: "bg-amber-400",
    ok: "bg-neutral-300",
  };
  const label: Record<Score, string> = {
    best: "Strong",
    good: "Good",
    ok: "OK",
  };
  return (
    <span className="flex items-center gap-1.5">
      <span className={cn("size-2.5 rounded-full", map[score])} />
      <span className="text-muted-foreground text-xs">{label[score]}</span>
    </span>
  );
}

function Overview() {
  return (
    <div className="flex flex-col gap-6">
      <div className="bg-card rounded-xl border p-6 shadow-sm">
        <h3 className="text-lg font-semibold">Recommendation</h3>
        <div className="text-muted-foreground mt-2 flex flex-col gap-3 text-sm leading-relaxed">
          <p>
            <strong className="text-foreground">
              Ship the Segmented builder (A) as the primary control
            </strong>{" "}
            on every surface. It keeps the whole composite visible, makes editing
            a single segment trivial, scales to any structure, and — critically —
            collapses into the dense table cell (E) that the high-frequency
            surfaces (timesheets, invoices, estimate lines) demand. Pinning
            project items to the top of each slot's popover directly resolves the
            JPM-13707 discoverability bug.
          </p>
          <p>
            <strong className="text-foreground">
              Layer Recents-first (D) on top
            </strong>{" "}
            wherever there's room (full forms, mobile). Most codes repeat per
            project, so a one-click recent/template beats any assembly flow for
            the common case; the segmented builder is the natural fallback.
          </p>
          <p>
            <strong className="text-foreground">
              Add the ⌘K palette (B) as a power-user accelerator
            </strong>
            , not the default — it's the fastest keyboard path for someone
            entering dozens of lines, but too heavy as the only entry point.
          </p>
          <p>
            The <strong className="text-foreground">Smart input (C)</strong> is
            the most exciting long-term bet but the riskiest: single-field
            parsing across segments needs strong ranking and disambiguation
            before it can be a default. Worth prototyping further with real
            usage data.
          </p>
        </div>
      </div>

      <div className="bg-card overflow-hidden rounded-xl border shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="bg-muted/50 text-left">
                <th className="px-4 py-3 font-medium">Direction</th>
                {CRITERIA.map((c) => (
                  <th key={c} className="px-4 py-3 font-medium">
                    {c}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {Object.entries(SCORES).map(([name, scores]) => (
                <tr key={name} className="border-t">
                  <td className="px-4 py-3 font-medium whitespace-nowrap">
                    {name}
                  </td>
                  {CRITERIA.map((c) => (
                    <td key={c} className="px-4 py-3">
                      <ScoreDot score={scores[c]} />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <p className="text-muted-foreground text-xs">
        Open each tab to try the direction. Toggle “Add Department” in the header
        to see every direction scale to a 4-segment structure.
      </p>
    </div>
  );
}
