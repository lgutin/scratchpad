import {
  Fragment,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
} from "react";
import {
  Button,
  Card,
  Chip,
  FieldLabel,
  Flex,
  Icon,
  Popover,
  SelectFieldSync,
  Text,
  type SelectFieldOption,
} from "@servicetitan/anvil2";
import CheckIcon from "@servicetitan/anvil2/assets/icons/material/round/check.svg";
import CloseIcon from "@servicetitan/anvil2/assets/icons/material/round/close.svg";
import AddIcon from "@servicetitan/anvil2/assets/icons/material/round/add.svg";
import "./budget-code-v1.css";

export const meta = {
  title: "Budget Code Picker",
  path: "/budget-code-picker",
  date: "2026-08-18",
  description: "SelectField exploration for budget codes (JPM-14945)",
};

// ---------------------------------------------------------------------------
// Segment taxonomy (mirrors the Budget Codes settings screens)
// ---------------------------------------------------------------------------

type SegmentKey = "cost-code" | "cost-type" | "phase";

interface SegmentMeta {
  label: string;
  system: boolean; // ServiceTitan System vs tenant-created
  color: string; // chip / accent color for the segment type
}

const SEGMENTS: Record<SegmentKey, SegmentMeta> = {
  "cost-code": { label: "Cost Code", system: true, color: "#2f80ed" },
  "cost-type": { label: "Cost Type", system: true, color: "#00875a" },
  phase: { label: "Phase", system: false, color: "#8b5cf6" },
};

// A budget code is the composite of one item per segment, in this order.
const SEGMENT_ORDER: SegmentKey[] = ["cost-code", "cost-type", "phase"];

type BudgetOption = SelectFieldOption & {
  group: SegmentKey;
  token: string; // short form used in the assembled code, e.g. "01-100", "L", "Phase 1"
  extra: { system: boolean; description?: string; onProject?: boolean };
};

function costCode(
  id: number,
  code: string,
  description: string,
  onProject = false,
): BudgetOption {
  return {
    id: `cc-${id}`,
    label: `${code} \u00b7 ${description}`,
    group: "cost-code",
    token: code,
    extra: { system: true, description, onProject },
  };
}

// ~40 realistic construction cost codes, consistent NN-NNN format.
const COST_CODES: BudgetOption[] = [
  costCode(1, "01-100", "General Requirements"),
  costCode(2, "01-200", "Project Management", true),
  costCode(3, "01-500", "Temporary Facilities"),
  costCode(4, "02-100", "Site Demolition"),
  costCode(5, "02-200", "Site Preparation"),
  costCode(6, "02-300", "Earthwork & Grading", true),
  costCode(7, "03-100", "Concrete Formwork"),
  costCode(8, "03-200", "Concrete Reinforcement"),
  costCode(9, "03-300", "Cast-in-Place Concrete", true),
  costCode(10, "04-100", "Masonry Mortar"),
  costCode(11, "04-200", "Unit Masonry"),
  costCode(12, "05-100", "Structural Steel"),
  costCode(13, "05-500", "Metal Fabrications"),
  costCode(14, "06-100", "Rough Carpentry", true),
  costCode(15, "06-200", "Finish Carpentry"),
  costCode(16, "07-100", "Waterproofing"),
  costCode(17, "07-200", "Building Insulation"),
  costCode(18, "07-500", "Membrane Roofing"),
  costCode(19, "08-100", "Metal Doors & Frames"),
  costCode(20, "08-500", "Windows"),
  costCode(21, "09-200", "Plaster & Gypsum Board"),
  costCode(22, "09-300", "Tiling"),
  costCode(23, "09-500", "Acoustic Ceilings"),
  costCode(24, "09-650", "Resilient Flooring"),
  costCode(25, "09-900", "Painting & Coating"),
  costCode(26, "10-100", "Signage"),
  costCode(27, "11-400", "Food Service Equipment"),
  costCode(28, "12-300", "Casework"),
  costCode(29, "21-100", "Fire Suppression"),
  costCode(30, "22-100", "Plumbing Piping", true),
  costCode(31, "22-400", "Plumbing Fixtures"),
  costCode(32, "23-100", "HVAC Ductwork", true),
  costCode(33, "23-500", "Heating Equipment"),
  costCode(34, "23-700", "Air Handling Units"),
  costCode(35, "23-800", "HVAC Installation", true),
  costCode(36, "26-100", "Electrical Service"),
  costCode(37, "26-500", "Lighting"),
  costCode(38, "27-100", "Data Cabling"),
  costCode(39, "28-100", "Fire Alarm"),
  costCode(40, "31-200", "Earth Moving"),
  costCode(41, "32-100", "Paving"),
  costCode(42, "33-100", "Site Utilities"),
];

const COST_TYPES: BudgetOption[] = (
  [
    ["Labor", "L", true],
    ["Material", "M", true],
    ["Equipment", "E", false],
    ["Subcontract", "S", false],
    ["Overhead", "OH", false],
    ["Permits", "P", false],
    ["Rentals", "R", false],
    ["Freight", "F", false],
    ["Warranty", "W", false],
    ["Other", "O", false],
  ] as const
).map(([label, token, onProject], i) => ({
  id: `ct-${i + 1}`,
  label,
  group: "cost-type" as const,
  token,
  extra: { system: true, onProject },
}));

const PHASES: BudgetOption[] = [
  "Foundation",
  "Framing",
  "Rough-In",
  "Insulation & Drywall",
  "Interior Finishes",
  "Mechanical & Electrical",
  "Exterior & Sitework",
  "Closeout",
].map((name, i) => ({
  id: `ph-${i + 1}`,
  label: `Phase ${i + 1} \u00b7 ${name}`,
  group: "phase",
  token: `Phase ${i + 1}`,
  extra: { system: false, description: name, onProject: i < 3 },
}));

const ITEMS_BY_SEGMENT: Record<SegmentKey, BudgetOption[]> = {
  "cost-code": COST_CODES,
  "cost-type": COST_TYPES,
  phase: PHASES,
};

// Row display per spec: primary bold token, subdued secondary.
const primaryOf = (o: BudgetOption) => o.token;
const secondaryOf = (o: BudgetOption) =>
  o.group === "cost-type" ? o.label : (o.extra.description ?? "");

// v0 SelectField shows only the code in the field: label = token. The dropdown
// row still shows code + description via `content`, and `searchText` keeps the
// description searchable. (Computed from the original item before relabeling.)
const toV0Option = (o: BudgetOption): BudgetOption => {
  const desc = secondaryOf(o);
  return {
    ...o,
    label: o.token,
    searchText: `${o.token} ${desc}`,
    content: { title: o.token, description: desc },
  };
};

const V0_ITEMS_BY_SEGMENT: Record<SegmentKey, BudgetOption[]> = {
  "cost-code": COST_CODES.map(toV0Option),
  "cost-type": COST_TYPES.map(toV0Option),
  phase: PHASES.map(toV0Option),
};

const v0ProjectItemsFor = (segment: SegmentKey) =>
  V0_ITEMS_BY_SEGMENT[segment].filter((item) => item.extra.onProject);

const v0DescriptionOf = (o: BudgetOption) =>
  typeof o.content?.description === "string" ? o.content.description : "";

// ---------------------------------------------------------------------------
// Composite state helpers
// ---------------------------------------------------------------------------

type Composite = Record<SegmentKey, BudgetOption | null>;

const EMPTY_COMPOSITE: Composite = {
  "cost-code": null,
  "cost-type": null,
  phase: null,
};

// ===========================================================================
// v1 — segmented type-ahead field (per Anvil2 spec)
// ===========================================================================

const V1_SEP = " . ";

function segmentList(key: SegmentKey, text: string): BudgetOption[] {
  // Pinned (this-project) items first, then the rest; ordering holds while filtering.
  const pinnedFirst = [...ITEMS_BY_SEGMENT[key]].sort(
    (a, b) => Number(!!b.extra.onProject) - Number(!!a.extra.onProject),
  );
  const q = text.trim().toLowerCase();
  if (!q) return pinnedFirst;
  return pinnedFirst.filter((o) =>
    `${primaryOf(o)} ${secondaryOf(o)} ${o.label}`.toLowerCase().includes(q),
  );
}

function PickerV1() {
  const [committed, setCommitted] = useState<Composite>(EMPTY_COMPOSITE);
  const [active, setActive] = useState<number>(0); // 0..2 editing, 3 resting
  const [text, setText] = useState("");
  const [hi, setHi] = useState(0);
  const [menuOpen, setMenuOpen] = useState(false);
  const [shellWidth, setShellWidth] = useState<number>(460);

  const wrapRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const blurTimer = useRef<ReturnType<typeof setTimeout>>(undefined);

  const firstEmpty = useCallback((comp: Composite) => {
    for (let i = 0; i < SEGMENT_ORDER.length; i++) {
      if (!comp[SEGMENT_ORDER[i]]) return i;
    }
    return 3;
  }, []);

  const navMax = Math.min(firstEmpty(committed), 2);
  const activeKey = active < 3 ? SEGMENT_ORDER[active] : null;
  const list = useMemo(
    () => (activeKey ? segmentList(activeKey, text) : []),
    [activeKey, text],
  );
  const open = menuOpen && active < 3;

  // Keep the active input focused while editing.
  useEffect(() => {
    if (active < 3) inputRef.current?.focus();
  }, [active]);

  // Match the popover width to the field.
  useLayoutEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const update = () => setShellWidth(el.getBoundingClientRect().width);
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const commitAndAdvance = useCallback(
    (item: BudgetOption) => {
      if (active >= 3) return;
      const next = { ...committed, [SEGMENT_ORDER[active]]: item };
      setCommitted(next);
      setText("");
      setHi(0);
      const allSet = SEGMENT_ORDER.every((k) => next[k]);
      const na = allSet ? 3 : firstEmpty(next);
      setActive(na);
      if (na === 3) setMenuOpen(false);
    },
    [active, committed, firstEmpty],
  );

  const advanceKeep = useCallback(() => {
    const allSet = SEGMENT_ORDER.every((k) => committed[k]);
    const na = allSet ? 3 : firstEmpty(committed);
    setText("");
    setHi(0);
    setActive(na);
    if (na === 3) setMenuOpen(false);
  }, [committed, firstEmpty]);

  const editSegment = useCallback((i: number) => {
    setActive(i);
    setText("");
    setHi(0);
    setMenuOpen(true);
  }, []);

  const clearSegment = useCallback((i: number) => {
    setCommitted((prev) => ({ ...prev, [SEGMENT_ORDER[i]]: null }));
  }, []);

  const clearAll = useCallback(() => {
    setCommitted(EMPTY_COMPOSITE);
    setActive(0);
    setText("");
    setHi(0);
    setMenuOpen(true);
    inputRef.current?.focus();
  }, []);

  const onInputKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (active >= 3) return;
    const key = SEGMENT_ORDER[active];
    // Commit the highlighted row (or keep an existing value) and advance —
    // shared by Enter, Tab, and Arrow Right.
    const confirmSelection = () => {
      if (text.trim() && list.length) {
        commitAndAdvance(list[hi] ?? list[0]);
      } else if (!text.trim() && committed[key]) {
        advanceKeep();
      } else if (!text.trim() && list.length) {
        commitAndAdvance(list[hi] ?? list[0]);
      }
    };
    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setHi((h) => Math.min(h + 1, Math.max(list.length - 1, 0)));
        break;
      case "ArrowUp":
        e.preventDefault();
        setHi((h) => Math.max(h - 1, 0));
        break;
      case "Enter":
      case "Tab": {
        e.preventDefault();
        confirmSelection();
        break;
      }
      case "ArrowLeft":
        // Only navigate back when the caret is at the start of the text.
        if (e.currentTarget.selectionStart === 0 && text === "") {
          e.preventDefault();
          setActive((a) => Math.min(Math.max(a - 1, 0), navMax));
          setText("");
        }
        break;
      case "ArrowRight": {
        // Right = select the highlighted row and advance, but only when the
        // caret is at the end (so mid-text caret movement still works).
        const el = e.currentTarget;
        const atEnd = el.selectionStart === el.value.length;
        if (!atEnd) break;
        e.preventDefault();
        confirmSelection();
        break;
      }
      case "Backspace":
        if (text === "") {
          e.preventDefault();
          if (committed[key]) clearSegment(active);
          else if (active > 0) setActive(active - 1);
        }
        break;
      case "Escape":
        e.preventDefault();
        setText("");
        break;
    }
  };

  const onInputBlur = () => {
    clearTimeout(blurTimer.current);
    blurTimer.current = setTimeout(() => {
      if (!wrapRef.current?.contains(document.activeElement)) setMenuOpen(false);
    }, 120);
  };

  const anyCommitted = SEGMENT_ORDER.some((k) => committed[k]);
  const allCommitted = SEGMENT_ORDER.every((k) => committed[k]);

  // Re-editing a set segment keeps its current token as the placeholder so the
  // field never visually empties; otherwise the segment's name.
  const placeholderFor = (i: number) => {
    const key = SEGMENT_ORDER[i];
    return committed[key] ? committed[key]!.token : SEGMENTS[key].label;
  };

  // Build the inline field content. All three segments always render (so the
  // remaining placeholders stay visible when partially filled), each an <input>
  // that sizes to its own content (CSS `field-sizing: content`) — the blue
  // highlight hugs the text with symmetric padding and switching the active
  // segment (same content) never changes width — no jumping.
  const fieldParts: React.ReactNode[] = [];
  SEGMENT_ORDER.forEach((key, i) => {
    const committedItem = committed[key];
    const isActive = i === active && active < 3;

    const display = isActive ? text : (committedItem?.token ?? "");
    const ph = isActive
      ? placeholderFor(i)
      : committedItem
        ? ""
        : SEGMENTS[key].label;
    // Clicking an empty segment beyond the frontier snaps to the frontier.
    const clickTarget = committedItem ? i : Math.min(i, navMax);

    const node = (
      <input
        key={`seg-${key}`}
        ref={isActive ? inputRef : undefined}
        readOnly={!isActive}
        tabIndex={isActive ? 0 : -1}
        className={`bcv1-input${!isActive ? " bcv1-input--token" : ""}${
          isActive && committedItem ? " bcv1-input--highlight" : ""
        }`}
        value={display}
        placeholder={ph}
        aria-label={SEGMENTS[key].label}
        size={1}
        onChange={
          isActive
            ? (e) => {
                setText(e.target.value);
                setHi(0);
                setMenuOpen(true);
              }
            : undefined
        }
        onFocus={isActive ? () => setMenuOpen(true) : undefined}
        onBlur={isActive ? onInputBlur : undefined}
        onKeyDown={isActive ? onInputKeyDown : undefined}
        onClick={!isActive ? () => editSegment(clickTarget) : undefined}
      />
    );

    if (fieldParts.length > 0) {
      fieldParts.push(
        <span key={`sep-${key}`} className="bcv1-sep" aria-hidden="true">
          .
        </span>,
      );
    }
    fieldParts.push(node);
  });

  const helper = allCommitted
    ? "Budget code complete. Click a segment to change it."
    : anyCommitted || active > 0
      ? "Type to search, Tab or Enter to confirm. Use \u2190 \u2192 to move between segments."
      : "Type to search, Tab or Enter to confirm.";

  const assembled = allCommitted
    ? SEGMENT_ORDER.map((k) => committed[k]!.token).join(V1_SEP)
    : "";

  const menu = activeKey ? (
    <div className="bcv1-menu" style={{ width: shellWidth }}>
      <div className="bcv1-menu-header">{SEGMENTS[activeKey].label}</div>
      <ul className="bcv1-list">
        {list.map((item, idx) => {
          const isCurrent = committed[activeKey]?.id === item.id;
          return (
            <li
              key={item.id}
              className={`bcv1-row${idx === hi ? " bcv1-row--hi" : ""}${
                isCurrent ? " bcv1-row--current" : ""
              }`}
              onMouseEnter={() => setHi(idx)}
              // Keep focus in the input so blur-close doesn't fire before click.
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => commitAndAdvance(item)}
            >
              <span className="bcv1-row-code">{primaryOf(item)}</span>
              <span className="bcv1-row-desc">{secondaryOf(item)}</span>
              {item.extra.onProject && (
                <span className="bcv1-pill">This project</span>
              )}
              {/* Always reserve the trailing check slot so pills align vertically
                  whether or not a row shows a check. */}
              <span className="bcv1-check" aria-hidden={!isCurrent}>
                {isCurrent && (
                  <Icon
                    svg={CheckIcon}
                    size="small"
                    color="var(--a2-foreground-color-primary, #0265dc)"
                  />
                )}
              </span>
            </li>
          );
        })}
      </ul>
      <div className="bcv1-footer">
        <Button
          appearance="secondary"
          size="small"
          icon={{ before: AddIcon }}
          // Anvil's AddNewItemButton sets width:100% inline (beats the button's
          // own fit-content width); mirror that here.
          style={{ width: "100%" }}
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => {
            /* stub: wire to real create-new-code flow */
          }}
        >
          Add {SEGMENTS[activeKey].label.toLowerCase()}
        </Button>
      </div>
    </div>
  ) : null;

  return (
    <Card padding="large" style={{ width: "100%", height: "100%" }}>
      <Flex direction="column" gap="4">
        <Flex direction="column" gap="1">
          <Text variant="eyebrow" size="small">
            v1 · One field, type-ahead segments
          </Text>
          <Text variant="body" size="small" subdued>
            Type to search each segment; press Enter, Tab, or → to confirm and
            advance. Click a code to re-edit it; ← / → move between segments.
          </Text>
        </Flex>

        <Flex direction="column" gap="1">
          <FieldLabel>Budget Code</FieldLabel>
          <div ref={wrapRef}>
            <Popover
              open={open}
              modal={false}
              disableCaret
              noPadding
              placement="bottom-start"
              onClickOutside={() => setMenuOpen(false)}
            >
              <Popover.Trigger>
                {(triggerProps: Record<string, unknown>) => (
                  <div
                    {...triggerProps}
                    className="bcv1-shell"
                    onClick={() => {
                      if (active >= 3) return;
                      setMenuOpen(true);
                      inputRef.current?.focus();
                    }}
                  >
                    {fieldParts}
                    {anyCommitted && (
                      <span className="bcv1-clear">
                        <Button
                          appearance="ghost"
                          size="small"
                          icon={CloseIcon}
                          aria-label="Clear budget code"
                          onMouseDown={(e) => e.preventDefault()}
                          onClick={(e) => {
                            e.stopPropagation();
                            clearAll();
                          }}
                        />
                      </span>
                    )}
                  </div>
                )}
              </Popover.Trigger>
              <Popover.Content>{menu}</Popover.Content>
            </Popover>
          </div>
          <Text variant="body" className="bcv1-helper">
            {helper}
          </Text>
        </Flex>

        {/* Assembled output */}
        <Flex
          direction="column"
          gap="2"
          style={{
            borderTop: "1px solid var(--a2-border-color-subdued, #dfe0e1)",
            paddingTop: "var(--a2-size-4, 16px)",
          }}
        >
          <Text variant="eyebrow" size="small">
            Assembled budget code
          </Text>
          <Text variant="headline" size="small" el="h3">
            {assembled || "\u2014"}
          </Text>
        </Flex>

        {/* Anvil deviations note */}
        <Flex
          direction="column"
          gap="1"
          style={{
            borderTop: "1px solid var(--a2-border-color-subdued, #dfe0e1)",
            paddingTop: "var(--a2-size-4, 16px)",
          }}
        >
          <Text variant="eyebrow" size="small">
            Anvil deviations
          </Text>
          <Text variant="body" size="small" subdued>
            Anvil2 has no segmented multi-input field, so the field shell is
            custom: each segment is a native <code>&lt;input&gt;</code> (read-only
            when not active) sharing one width formula so switching segments never
            shifts. "This project" is a custom success-token pill (Anvil
            <code> Badge</code> is only a notification dot). The menu
            (<code>Popover</code>), option rows, check <code>Icon</code>, and the
            add-item <code>Button</code> are Anvil components, and all colors,
            spacing, and type use <code>--a2-</code> tokens.
          </Text>
        </Flex>
      </Flex>
    </Card>
  );
}

// ===========================================================================
// v0 — three stacked SelectFieldSync (original composite explore)
// ===========================================================================

const assembledCodeV0 = (composite: Composite) =>
  SEGMENT_ORDER.map((key) => composite[key]?.token)
    .filter(Boolean)
    .join(".");

function PickerV0() {
  const [composite, setComposite] = useState<Composite>(EMPTY_COMPOSITE);

  const setSegment = (segment: SegmentKey, option: SelectFieldOption | null) =>
    setComposite((prev) => ({ ...prev, [segment]: option as BudgetOption | null }));

  const hasAny = SEGMENT_ORDER.some((key) => composite[key] !== null);

  return (
    <Card padding="large" style={{ width: "100%", height: "100%" }}>
      <Flex direction="column" gap="4">
        <Flex direction="column" gap="1">
          <Text variant="eyebrow" size="small">
            v0 · Three SelectFields, one label
          </Text>
          <Text variant="body" size="small" subdued>
            One "Budget Code" label; three Anvil <code>SelectField</code>s separated
            by periods, each showing only the code and pinning this project's items.
          </Text>
        </Flex>

        {/* One "Budget Code" label; three fields separated by periods, no
            chevron (per Figma). Per-field labels are hidden; the field shows
            only the code and the dropdown row shows code + description. */}
        <Flex direction="column" gap="1">
          <FieldLabel>Budget Code</FieldLabel>
          <Flex className="bcv0-fields" gap="0" alignItems="center" wrap="nowrap">
            {SEGMENT_ORDER.map((key, i) => {
              const projectItems = v0ProjectItemsFor(key);
              return (
                <Fragment key={key}>
                  {i > 0 && (
                    <span className="bcv0-sep" aria-hidden="true">
                      .
                    </span>
                  )}
                  <div className="bcv0-field">
                    <SelectFieldSync
                      label={SEGMENTS[key].label}
                      hideLabel
                      placeholder={SEGMENTS[key].label}
                      disableClearButton
                      options={V0_ITEMS_BY_SEGMENT[key]}
                      pinned={
                        projectItems.length > 0
                          ? { label: "On this project", options: projectItems }
                          : undefined
                      }
                      value={composite[key]}
                      onSelectedOptionChange={(option) => setSegment(key, option)}
                    />
                  </div>
                </Fragment>
              );
            })}
          </Flex>
        </Flex>

        <Flex
          direction="column"
          gap="2"
          style={{
            borderTop: "1px solid var(--a2-border-color-subdued, #dfe0e1)",
            paddingTop: "var(--a2-size-4, 16px)",
          }}
        >
          <Text variant="eyebrow" size="small">
            Assembled budget code
          </Text>
          {hasAny ? (
            <>
              <Text variant="headline" size="small" el="h3">
                {assembledCodeV0(composite)}
              </Text>
              <Flex direction="column" gap="1">
                {SEGMENT_ORDER.map((key) => (
                  <Flex key={key} gap="2" alignItems="center">
                    <Chip
                      label={SEGMENTS[key].label}
                      color={SEGMENTS[key].color}
                      size="small"
                    />
                    <Text variant="body" size="small" subdued={!composite[key]}>
                      {composite[key]
                        ? `${composite[key]!.token} \u00b7 ${v0DescriptionOf(composite[key]!)}`
                        : "Not set"}
                    </Text>
                  </Flex>
                ))}
              </Flex>
            </>
          ) : (
            <Text variant="body" size="medium" subdued>
              Nothing selected
            </Text>
          )}
        </Flex>

        {/* Anvil deviations */}
        <Flex
          direction="column"
          gap="1"
          style={{
            borderTop: "1px solid var(--a2-border-color-subdued, #dfe0e1)",
            paddingTop: "var(--a2-size-4, 16px)",
          }}
        >
          <Text variant="eyebrow" size="small">
            Anvil deviations
          </Text>
          <Text variant="body" size="small" subdued>
            Stock Anvil <code>SelectField</code>s. CSS overrides hide the chevron
            and widen the option popover so it doesn't condense under the narrow
            fields; each field's <code>label</code> is set to the code so the
            trigger shows the code only while the row keeps code + description.
          </Text>
        </Flex>
      </Flex>
    </Card>
  );
}

// ===========================================================================

export default function BudgetCodePicker() {
  return (
    <Flex
      justifyContent="center"
      style={{
        padding: "var(--a2-size-8, 32px)",
        background: "var(--a2-background-color-secondary, #f5f6f7)",
        minHeight: "100vh",
        boxSizing: "border-box",
      }}
    >
      <Flex direction="column" gap="4" style={{ width: "100%", maxWidth: 1080 }}>
        <Text variant="headline" el="h1" size="medium">
          Budget Code Picker
        </Text>

        {/* v1 on the left, v0 on the right */}
        <Flex gap="4" alignItems="flex-start" wrap="wrap">
          <div style={{ flex: 1, minWidth: 420 }}>
            <PickerV1 />
          </div>
          <div style={{ flex: 1, minWidth: 420 }}>
            <PickerV0 />
          </div>
        </Flex>
      </Flex>
    </Flex>
  );
}
