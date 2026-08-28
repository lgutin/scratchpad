# Budget Code Picker — v2 Engineering Handoff

> The chosen direction is **v2** (`PickerV2` in `index.tsx`, the green-outlined card).
> This doc maps the v2 prototype onto the **current shipping component** so eng can
> productionize it. It is a diff, not a from-scratch spec.
>
> - **Prototype:** `src/experiments/budget-code-picker/index.tsx` → `PickerV2`
> - **Production reference:** `anvil-uikit-contrib` →
>   `packages/line-item-editor/src/budget-code/` (`BudgetCodeEditor`,
>   `BudgetCodeSegmentPicker`, `createBudgetCodeAdapter`, `AddSegmentItemDialog`, `types.ts`)
> - **Tickets:** JPM-14945 (new picker), JPM-13707 (project scoping / discoverability)

---

## TL;DR

v2 is a sound **interaction model** but a self-contained **mock**: it hardcodes three
segments, holds all items in memory, assembles a token string locally, and never talks
to an adapter. The handoff-critical work is:

1. **Re-base on the real data model** — `Segment` / `SegmentItem` / `BudgetCodeAdapter`
   instead of the prototype's `BudgetOption`.
2. **Make it async** — lazy per-segment loading, auto-save, `isPartial`, loading
   skeleton, `disabled`.
3. **Decide how "on this project" maps onto the data layer** (JPM-13707). v2's
   project-item pinning is its best feature but has no home in the current model.
4. **Flag the bespoke a11y / focus code** as the review hotspot — that's where v2
   intentionally diverges from stock Anvil `Combobox`.

Two things worth **preserving** from v2 (they're the reason it was chosen):

- The **fused single-field look with native Tab** between segments (each segment a real
  `<input role="combobox">`, one shared wide menu).
- **Project items pinned** ("This project" / "More" groups) — the direct answer to
  JPM-13707, which the current shipping picker does not do.

---

## 1. Data model — the biggest rewrite

The prototype invents `BudgetOption` (`token` + `extra.description` + `extra.onProject`,
string ids). Production is fully data-driven over `Segment[]` + `SegmentItem` through a
`BudgetCodeAdapter`. Mapping:

| v2 prototype | Production (`types.ts`) | Action |
|---|---|---|
| `SegmentKey` union `"cost-code" \| "cost-type" \| "phase"` | `Segment` `{ id, name, delimiter?, isRequired?, isHierarchical? }` | **Delete the union.** v2 special-cases segments everywhere (`primaryOf`/`secondaryOf` branch on `group`; cost-type abbreviations; phase label formatting). Production is N-segment and generic. |
| `option.token` | `SegmentItem.path` (or `code`) | Token = `path`. Compact display value shown in the field. |
| `option.label` / `option.extra.description` | `SegmentItem.description` | Menu row is `**path**: description` (see `BudgetCodeSegmentPicker`). |
| `option.extra.onProject` (boolean) | *(not in the model)* | **JPM-13707 decision — must be resolved.** See §3. |
| string ids (`"cc-2"`, `"ph-1"`) | numeric `id` | Ids are numbers. |
| *(none)* | `SegmentItem.active` | v2 has no active/inactive concept. Production disables `!item.active` rows (`disabled={!item.active}`). Port this. |
| *(none)* | `parentId` / `level` / `isHierarchical` | Anticipated hierarchy (`segmentMap` is `Record<segmentId, number[]>`). v2 renders flat — fine, but don't design hierarchy out. The Create-Cost-Code "parent / CSI division" picker in the prototype is **demo chrome**, not this hierarchy. |

**A budget code is a server-resolved ID, not a string.** Production never stores the
assembled text — it sends the component items to `adapter.getOrCreateBudgetCode(components)`
and gets back `{ id, isPartial }`. v2's "Assembled budget code" readout is illustrative
only and should be treated as a debug/preview affordance, not state.

---

## 2. Behaviors to port (currently faked or missing in v2)

All present in `BudgetCodeEditor` / `BudgetCodeSegmentPicker`, all absent in `PickerV2`:

- **Resolve on commit + `isPartial`.** On each segment change, call
  `getOrCreateBudgetCode(components)` and fire `onBudgetCodeChange(id)`. Surface
  **`isPartial`** — production explicitly models incomplete combinations. v2 only shows
  its readout when *every* segment is set (`allCommitted`); that hides the partial state.
- **Lazy loading + caching.** v2 builds the menu synchronously from in-memory arrays
  (`segmentList`). Production lazy-loads per segment on click (`onFetchItems` →
  `getSegmentItems(segmentId)`) and caches in a `Map`. v2's shared menu must fetch on
  segment focus and show a loading state.
- **Auto-save + `manualSave` opt-out.** Production auto-saves on change and exposes
  `manualSave` for callers that own persistence. v2 doesn't persist.
- **Initialize from `budgetCodeId` with a `Skeleton`.** v2 seeds from `DEFAULT_SELECTION`
  ids synchronously. Production resolves an existing `budgetCodeId` → items async and
  renders `Skeleton.Text` per segment while loading.
- **`disabled`** — editor-level and per-inactive-item. Absent in v2.
- **Delimiter is per-`Segment`** (`Segment.delimiter`, defaults to `·`, callers pass `.`).
  v2 hardcodes `.` in the field and `" . "` (`V1_SEP`) in the readout. Read from config.
- **`isRequired`** drives completeness / `isPartial`. v2 assumes all segments required.
- **Debounced clear** (production clears on a 300ms timer to avoid firing auto-save
  mid-interaction). v2 clears synchronously. Minor, but keep the reasoning.
- **Callbacks to expose:** `onBudgetCodeChange`, `onSegmentChange`, `onAddSegmentItem`,
  plus `manualSave` / `disabled` / `delimiter` props — match `BudgetCodeEditorProps`.

---

## 3. Project scoping (JPM-13707) — the decision that unblocks the win

v2's "This project" / "More" grouping (`segmentList` sorts `extra.onProject` first;
the menu renders two `role="group"` sections) is the direct fix for JPM-13707 and the
main reason v2 was chosen. **But the production model has no `onProject` flag** — items
are fetched via `listSegmentItems(segmentId, projectId)` and project scoping lives in the
data layer.

Eng needs a contract. Options to pick from:

- **(a)** Add an `inProject` / `onProject` boolean to `SegmentItem`, populated by the
  adapter — least UI change, mirrors the prototype directly.
- **(b)** Have the adapter return two lists (project vs. global) and let the picker
  render the two groups from that shape.
- **(c)** Keep a single list but pass a `projectItemIds: Set<number>` alongside so the
  picker can partition + pin.

Recommend **(a)** for the smallest delta from v2, but this is a data-contract call that
touches `getSegmentItems` and should be agreed with the API owners.

---

## 4. "Create new" — resolve scope before building

Sharpest divergence. v2 ships **three rich bespoke dialogs**
(`CreateCostCodeDialog` with a parent/CSI-division picker, `CreateCostTypeDialog` with
categories, `CreatePhaseDialog`), gated behind a demo `allowCreateNew` toggle and offered
on **all three** segments. Production has **one minimal, host-overridable**
`AddSegmentItemDialog` (code + description), and `createSegmentItem` is **optional** on
the adapter.

Annotate the intended production behavior:

- **Gate the affordance** on `adapter.createSegmentItem` being present **and** the segment
  being tenant-editable. Per `PROBLEM.md`, only tenant segments (e.g. Phase) allow inline
  create; Cost Code / Cost Type are system-managed. v2 currently allows all three.
- **Decide dialog richness:** are the rich dialogs in scope, or does v2 delegate to the
  host's `onAddSegmentItem` (falling back to the minimal `AddSegmentItemDialog`)? The
  CSI-division parent picker is prototype chrome, not the production hierarchy.

---

## 5. a11y / focus — validate before shipping (the review hotspot)

v2 deliberately drops production's stock per-segment `Combobox` (separate popovers) to get
the fused single-field look with native Tab. That's the intended design — and where the
risk is. Call these out explicitly:

- **Bespoke combobox model:** each segment is its own `<input role="combobox">` sharing
  **one** listbox via `aria-controls` / `aria-activedescendant`. Needs AT validation
  (VoiceOver / NVDA / JAWS) across browsers — this is non-standard and not what Anvil
  `Combobox` does.
- **Focus choreography:** programmatic focus on commit, the `restAfterCreate` bounce, and
  the **double-`requestAnimationFrame`** used to win the race against Anvil `Dialog`'s
  focus-restore on close. Timing-dependent and browser-sensitive — top regression-test
  target.
- **`field-sizing: content`** reliance for stable segment widths (newer CSS — check
  support matrix / fallback).
- **Custom popover width** via `ResizeObserver` (cleaner than production's imperative
  `translateX` + `!important` `positionDropdown`, but still bespoke).

---

## 6. Demo scaffolding to strip

Not part of the component: the v0 / v1 / v2 side-by-side cards; the field-count / width /
size / create toggles; the Pros / Cons / Customizations sections; the green outline; the
mock arrays (`COST_CODES`, `COST_TYPES`, `PHASES`, `DIVISION_NAMES`); and the three rich
create dialogs (unless §4 keeps them).

---

## Handoff checklist

- [ ] Replace `BudgetOption` / `SegmentKey` with `Segment` + `SegmentItem` + `BudgetCodeAdapter`.
- [ ] Make segment loading async (lazy + cache) with a menu loading state.
- [ ] Resolve on commit via `getOrCreateBudgetCode`; expose + surface `isPartial`.
- [ ] Add auto-save (`onBudgetCodeChange`) + `manualSave`; add `disabled`; read per-segment `delimiter`; honor `isRequired`.
- [ ] Initialize from `budgetCodeId` with a `Skeleton` loading state.
- [ ] Render inactive (`!active`) items disabled.
- [ ] Agree the JPM-13707 project-scoping contract (§3) and keep the "This project" pinning.
- [ ] Gate "Create new" on `createSegmentItem` + segment editability; decide dialog richness (§4).
- [ ] a11y review of the shared-listbox combobox model + focus choreography (§5).
- [ ] Strip demo scaffolding (§6).
