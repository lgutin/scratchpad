# Budget Code Picker — Problem Brief (Creative Exploration)

> A design/interaction exploration for a new **Budget Code Picker** in ServiceTitan.
> Tickets: **JPM-14945** (build the new picker), **JPM-13707** (project-scoping / discoverability bug).
>
> **You are not tied to any design system.** Assume **React + shadcn/ui + Tailwind**. The goal is to
> find genuinely good, possibly unconventional interaction ideas — not to reskin the existing UI.
> Prior art in this repo was built in ServiceTitan's Anvil2 design system; treat it as background,
> not a constraint.

---

## 1. The problem in one paragraph

On many ServiceTitan forms (timesheets, invoices, bills, estimates, etc.), a user must tag a line
with a **budget code**. A budget code is not a single value — it is the **combination of one item
from each configured segment** (Cost Code + Cost Type + Phase, and optionally more). Today this is
entered through **separate flat dropdowns, one per segment**, which is slow, easy to get wrong, and
hides the items that actually belong to the current project. We want a **fast, legible way to
assemble a full budget code** that scales from 3 to N segments, works inline in a dense table row
and on mobile, and makes the resulting code obvious. **We are looking for creative options** — bring
several distinct directions.

---

## 2. Domain glossary

- **Budget code** — the umbrella concept. The full code is a composite of one token per segment,
  written with periods, e.g. **`01-100.L.Phase 1`**.
- **Segment (a.k.a. segment type)** — one dimension of the code (Cost Code, Cost Type, Phase, …).
  Each segment contributes exactly one item.
- **Segment item** — a selectable value within a segment (e.g. `01-100 · HVAC Installation` is a
  Cost Code item; `Labor` is a Cost Type item).
- **Structure** — the tenant-configured, **ordered** list of segments that make up a budget code,
  e.g. `Cost Code · Cost Type · Department · Phase · Building`. Order matters and is reorderable.
- **Project-scoped items** — each project uses only a subset of the global segment items. These
  should be surfaced prominently (see the JPM-13707 bug below).

---

## 3. Segment taxonomy (from the Budget Codes settings screens)

The tenant configures segments in Settings → Budget Codes. Observed real data:

| Segment     | Items | Created by          | Status   | Notes                          |
| ----------- | ----: | ------------------- | -------- | ------------------------------ |
| Cost Code   |   138 | ServiceTitan System | Active   | System segment, cannot disable |
| Cost Type   |   100 | ServiceTitan System | Active   | System segment, cannot disable |
| Department  |    10 | John Smith (tenant) | Active   | Tenant-created                 |
| Phase       |     8 | John Smith (tenant) | Active   | Tenant-created                 |
| Building    |     3 | John Smith (tenant) | Inactive | Tenant-created, disabled       |

Rules derived from the settings UI:

- **System vs tenant segments.** Cost Code and Cost Type are system-managed (locked on, cannot be
  disabled). Department, Phase, Building are tenant-created and can be toggled/reordered.
- **Active vs Inactive.** Inactive segments (e.g. Building) should not appear in the picker.
- **Default structure for exploration** = **`Cost Code · Cost Type · Phase`** (three segments), but
  the design must scale to 5+ segments in an arbitrary configured order.

### Token format for the assembled code

Each segment contributes a short **token**; tokens are joined with **periods**:

- Cost Code token = the code, e.g. `01-100`
- Cost Type token = an abbreviation, e.g. `Labor → L`, `Material → M`, `Equipment → E`
- Phase token = `Phase N`, e.g. `Phase 1`
- Assembled example: **`01-100.L.Phase 1`**

Full item labels read as `01-100 · HVAC Installation` in lists; the period-joined tokens are the
compact assembled code shown once a segment is chosen.

---

## 4. What's wrong today (pain to solve)

The current UI is one flat dropdown per segment. Observed problems:

1. **Raw enum values as labels** — a selected value rendered as `MISC_CHARGE_FEE` (ALL_CAPS_SNAKE)
   instead of a human-readable name.
2. **Placeholder shown next to a value** — the segment placeholder stayed visible while the value
   sat on the right, prefixed by a stray `▪` glyph.
3. **Inconsistent code formats** — `CC-A2`, `PL-2209`, `30-8`, `26-08` (no consistent pattern).
4. **Junk descriptions** — e.g. `CC-A2: adescr` (placeholder test text in real data).
5. **Awkward wrapping** — long options wrapped across two lines.
6. **Discoverability bug (JPM-13707)** — the picker shows the **global** item list instead of the
   **project's** items, so users can't easily find the codes relevant to their project.
7. **Slow & fragmented** — assembling a code means operating several disconnected fields with no
   sense of the whole; nothing shows the final composite until you've filled every field.

---

## 5. Prior art in this repo (background, not a target)

`src/experiments/budget-code-picker/index.tsx` currently holds an Anvil2 prototype that:

- stacks three dropdowns (Cost Code / Cost Type / Phase) under one "Budget code" label,
- pins an "On this project" section atop each list, and
- shows a live assembled-code readout (`01-100.L.Phase 1`) with a per-segment breakdown.

Earlier iterations also tried a single chip-per-segment trigger opening a modal with the three
sub-pickers — rejected as too heavy. **These are incremental; we now want more imaginative takes.**

---

## 6. Surfaces (must work everywhere)

In rough order of frequency:

1. Timesheet entry form (most common; desktop **and** mobile)
2. Payroll adjustment form
3. Invoice line items
4. Bill / PO creation
5. Estimate line items
6. Project plan task rows

Implications: works **inline in a dense table cell**, in a **full form**, and on a **phone**.
High-frequency data entry → **keyboard speed and low click-count matter a lot**.

---

## 7. Directions worth exploring (provocations, not a menu)

Use these to spark ideas; invent your own. Bring **several distinct directions**, not variations of one.

- **Single smart input** — one text field where typing parses into tokens; typeahead recognizes
  `01-100` → Cost Code, ` L` → Cost Type, etc., assembling the code as you type. Fuzzy, forgiving,
  keyboard-first.
- **Command-palette / spotlight** — one launcher that walks you through segments as a fast,
  searchable, keyboard-driven flow (à la ⌘K), collapsing to the assembled code.
- **Segmented builder / breadcrumb** — a single control visually split into segment slots
  (`[Cost Code] . [Cost Type] . [Phase]`) you tab through, each slot a lightweight popover.
- **Recents / templates first** — most codes repeat per project/user; lead with "recently used" and
  saved combinations, make full assembly the fallback.
- **Progressive disclosure in one popover** — open once, pick one per section, trigger shows the
  running composite; close when done — without a modal.
- **Guided vs expert modes** — a guided stepper for new users, a compact expert entry for power
  users doing dozens of lines.
- **Inline-in-cell** — how does the winning idea collapse into a single spreadsheet-like table cell
  with keyboard fill-down?

For each direction, consider: **speed to assemble**, **discoverability of project items**, **edit a
single segment later**, **density / mobile**, **error-proofing**, and **scaling to N segments**.

---

## 8. Open design questions

- One field or many? Does a unified control feel natural, or do users expect per-segment fields?
- Can all segments be chosen in a **single gesture/flow** while keeping the result obvious?
- **Short vs long lists**: Cost Type (~10) and Phase (~8) are short; Cost Code (100+) needs search.
  Should short segments be inline toggles/radios and only Cost Code be searchable?
- **Project scoping (JPM-13707)**: is a pinned "on this project" section enough, or hide global
  items entirely behind an explicit "show all"?
- **Add-new**: when (if ever) can users create a new segment item inline? Likely only tenant
  segments (Phase), never system ones (Cost Code / Cost Type, managed in Settings).
- **Editing**: how to change one segment of an already-assembled code without redoing all of it?
- **Variable structure**: gracefully handle 3 → 5+ segments in an arbitrary configured order.

---

## 9. Constraints & assumptions

- **Stack**: React + **shadcn/ui** + Tailwind. Not tied to any existing design system; free to
  compose primitives (Command, Popover, Combobox, Dialog, Input, Badge, etc.) or invent new UI.
- Keep mock data **realistic**: construction cost codes (`NN-NNN · Description`), real cost types and
  phases — no placeholder junk. Suggested scale: ~5–15 project items per segment, ~50–200 global
  items per system segment.
- Every option must be reachable/legible via **keyboard** and usable on **mobile**.
- Show the **assembled code** (`01-100.L.Phase 1`) clearly once segments are chosen.

---

## 10. Deliverable

Prototype **multiple distinct, creative interaction options** (each its own component/story) for
assembling a budget code. Favor divergent thinking over polish. For each option, include a short
note on the interaction model and its trade-offs against the criteria in §7. Recommend which
direction(s) are most promising and why.

---

## 11. Prior production implementation (reference, not a target)

ServiceTitan already ships a budget-code editor in the `anvil-uikit-contrib` repo:
`packages/line-item-editor/src/budget-code/`. It's built in Anvil2, so treat it as a **reference
for the data model and hard-won behaviors**, not a design to copy. Its shape:

- **`BudgetCodeEditor`** — renders N segments as **one bordered field** (~32px tall) with a
  delimiter between each (default `·`, but callers pass `.`). Lazy-loads each segment's items on
  click, **auto-saves** on change, has a single clear (×) button, and opens an add-item dialog.
- **`BudgetCodeSegmentPicker`** — one searchable combobox per segment (fuzzy match on
  `code`/`description`), options shown as `**path**: description`, disabled when inactive, with a
  "+ Add Item" link. Custom popover positioning makes each segment's menu span the whole field.
- **`AddSegmentItemDialog`** — minimal `code` + `description` creation dialog (host-overridable).
- **`createBudgetCodeAdapter`** — builds the data adapter from a pre-loaded, cached state.

### Ideas worth stealing (independent of design system)

- **Adapter pattern.** All data ops go through a `BudgetCodeAdapter` interface — `getSegmentItems`,
  `getOrCreateBudgetCode`, `getBudgetCodeById`, `getSegmentItemById`, optional `createSegmentItem`.
  Cleanly decouples UI from API; easy to back with mock data.
- **A budget code is a server-resolved ID.** You don't store the string — you send the component
  items to `getOrCreateBudgetCode(components)` and get back `{ id, isPartial }`. **`isPartial`**
  models an incomplete combination (not all required segments chosen yet).
- **Project scoping is a data concern.** Items are fetched via `listSegmentItems(segmentId,
  projectId)` — directly relevant to JPM-13707. Consider surfacing project items first.
- **Lazy per-segment loading + caching**, so a 100+ item segment isn't loaded until opened.
- **Hierarchical segments** are anticipated (`SegmentItem.parentId` / `level`), even though the
  current picker renders a flat list.

Data types (paraphrased):

```ts
interface Segment { id: number; name: string; delimiter?: string; isRequired?: boolean; isHierarchical?: boolean }
interface SegmentItem { id: number; segmentId: number; code?: string; description?: string; path?: string; active: boolean; parentId?: number; level?: number }
interface BudgetCodeResult { id: number; isPartial: boolean; segmentMap?: Record<string, number[]> }
```

The creative shadcn options in §7 should go **beyond** this baseline (e.g. smart-parse input,
command-palette flow, recents/templates), while borrowing the adapter/`isPartial`/project-scoping
concepts where useful.
