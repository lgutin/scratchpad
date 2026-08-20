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
  FieldLabel,
  Flex,
  Icon,
  Popover,
  SegmentedControl,
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

type FieldSize = "small" | "medium";

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

// Non-project items keep their segment `group`, shown under a "More …" header.
const v0MoreItemsFor = (segment: SegmentKey) =>
  V0_ITEMS_BY_SEGMENT[segment].filter((item) => !item.extra.onProject);

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

function PickerV1({ size }: { size: FieldSize }) {
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

  const assembled = allCommitted
    ? SEGMENT_ORDER.map((k) => committed[k]!.token).join(V1_SEP)
    : "";

  const menu = activeKey
    ? (() => {
        const label = SEGMENTS[activeKey].label;
        const plural = `${label}s`;
        // `list` is pinned-first, so project rows come before the rest.
        const projectRows = list.filter((o) => o.extra.onProject);
        const restRows = list.filter((o) => !o.extra.onProject);
        const currentId = committed[activeKey]?.id;

        const renderRow = (item: BudgetOption, idx: number) => {
          const isCurrent = currentId === item.id;
          return (
            <div
              key={item.id}
              role="option"
              aria-selected={isCurrent}
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
              <span className="bcv1-check" aria-hidden={!isCurrent}>
                {isCurrent && (
                  <Icon
                    svg={CheckIcon}
                    size="small"
                    color="var(--a2-foreground-color-primary, #0265dc)"
                  />
                )}
              </span>
            </div>
          );
        };

        return (
          <div className="bcv1-menu" style={{ width: shellWidth }}>
            <div className="bcv1-list" role="listbox" aria-label={label}>
              {projectRows.length > 0 && (
                <div className="bcv1-menu-header">{plural} · This project</div>
              )}
              {projectRows.map((item, i) => renderRow(item, i))}
              {projectRows.length > 0 && restRows.length > 0 && (
                <div className="bcv1-menu-hr" role="separator" />
              )}
              {restRows.length > 0 && (
                <div className="bcv1-menu-header">
                  {projectRows.length > 0 ? `More ${plural}` : plural}
                </div>
              )}
              {restRows.map((item, i) => renderRow(item, projectRows.length + i))}
            </div>
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
                Add {label.toLowerCase()}
              </Button>
            </div>
          </div>
        );
      })()
    : null;

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
                    className={`bcv1-shell${size === "small" ? " bcv1-shell--small" : ""}`}
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

        {/* Notes — deviations & overrides */}
        <Flex
          direction="column"
          gap="1"
          style={{
            borderTop: "1px solid var(--a2-border-color-subdued, #dfe0e1)",
            paddingTop: "var(--a2-size-4, 16px)",
          }}
        >
          <Text variant="eyebrow" size="small">
            Notes
          </Text>
          <ul className="bc-notes">
            <li>
              Fully custom control: Anvil2 has no segmented multi-input field, so
              the field shell, menu, and interactions are all hand-built.
            </li>
            <li>
              Each segment is a native <code>&lt;input&gt;</code> (read-only when
              not the active one), styled as a token.
            </li>
            <li>
              Inputs use CSS <code>field-sizing: content</code> to size to their
              text — symmetric highlight-chip padding and no width jump when moving
              between segments.
            </li>
            <li>
              The dropdown is a custom Anvil <code>Popover</code> with hand-written
              rows (<code>.bcv1-*</code>), not Anvil's <code>SelectField</code>{" "}
              menu.
            </li>
            <li>
              Two custom sections ("… · This project" / "More …") with headers —
              no per-row "This project" chip.
            </li>
            <li>
              Selected row (blue background, blue code + description, check) is
              custom CSS.
            </li>
            <li>
              Hovering a committed token shows a gray background (matching the menu
              row hover), not blue text.
            </li>
            <li>
              Reused Anvil components: <code>Popover</code>, <code>Icon</code>{" "}
              (check + add), <code>Button</code> (full-width secondary add-item),
              <code> FieldLabel</code>.
            </li>
            <li>
              Custom keyboard model: type-ahead per segment; Enter / Tab / → to
              confirm + advance; ← / → to move; Backspace to clear/step back;
              Escape to clear the query.
            </li>
            <li>
              The Small / Medium control (top right) drives a shell modifier that
              shortens the field and text.
            </li>
            <li>
              "." separators use the default (Nunito Sans) type — intentionally not
              the heavier Sofia face used in v0.
            </li>
            <li>
              All colors, spacing, and type use <code>--a2-</code> tokens (with
              concrete fallbacks).
            </li>
          </ul>
        </Flex>
      </Flex>
    </Card>
  );
}

// ===========================================================================
// v0 — three SelectFieldSync fields under one label
// ===========================================================================

function PickerV0({ size }: { size: FieldSize }) {
  const [composite, setComposite] = useState<Composite>(EMPTY_COMPOSITE);
  const fieldsRef = useRef<HTMLDivElement>(null);

  const setSegment = (segment: SegmentKey, option: SelectFieldOption | null) =>
    setComposite((prev) => ({ ...prev, [segment]: option as BudgetOption | null }));

  // On selecting a value, auto-advance to the next field (focus + open it).
  const selectAndAdvance = (index: number, option: SelectFieldOption | null) => {
    setSegment(SEGMENT_ORDER[index], option);
    if (option && index < SEGMENT_ORDER.length - 1) {
      setTimeout(() => {
        const inputs =
          fieldsRef.current?.querySelectorAll<HTMLInputElement>(
            ".bcv0-field input",
          );
        const next = inputs?.[index + 1];
        next?.focus();
        next?.click();
      }, 0);
    }
  };

  // Like v1: only expose the assembled code once all segments are set.
  const v0Assembled = SEGMENT_ORDER.every((key) => composite[key])
    ? SEGMENT_ORDER.map((key) => composite[key]!.token).join(V1_SEP)
    : "";

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
          <div ref={fieldsRef} className="bcv0-fields">
            {SEGMENT_ORDER.map((key, i) => {
              const projectItems = v0ProjectItemsFor(key);
              const plural = `${SEGMENTS[key].label}s`;
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
                      size={size}
                      placeholder={SEGMENTS[key].label}
                      // "This project" items are pinned under their own section
                      // label; the rest sit under a "More …" group header (no
                      // per-row chip).
                      options={v0MoreItemsFor(key)}
                      groupToString={() => `More ${plural}`}
                      pinned={
                        projectItems.length > 0
                          ? {
                              label: `${plural} · This project`,
                              // Filter pinned items by the query too (a static
                              // array would always show); hides non-matches.
                              options: (searchValue: string) =>
                                projectItems.filter((o) =>
                                  (o.searchText ?? o.label)
                                    .toLowerCase()
                                    .includes((searchValue ?? "").trim().toLowerCase()),
                                ),
                            }
                          : undefined
                      }
                      value={composite[key]}
                      onSelectedOptionChange={(option) => selectAndAdvance(i, option)}
                      // Stock Anvil "add new item" footer button (like v1).
                      addItemLabel={`Add ${SEGMENTS[key].label.toLowerCase()}`}
                      onAddNewItem={() => {
                        /* stub: wire to real create-new-code flow */
                      }}
                    />
                  </div>
                </Fragment>
              );
            })}
          </div>
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
          <Text variant="headline" size="small" el="h3">
            {v0Assembled || "\u2014"}
          </Text>
        </Flex>

        {/* Notes — deviations & overrides */}
        <Flex
          direction="column"
          gap="1"
          style={{
            borderTop: "1px solid var(--a2-border-color-subdued, #dfe0e1)",
            paddingTop: "var(--a2-size-4, 16px)",
          }}
        >
          <Text variant="eyebrow" size="small">
            Notes
          </Text>
          <ul className="bc-notes">
            <li>
              Built from three stock Anvil <code>SelectFieldSync</code> fields —
              native menu, selected states, add-new, and search all come from
              Anvil; the <code>size</code> prop (Small / Medium) is passed through.
            </li>
            <li>
              One shared "Budget Code" <code>FieldLabel</code>; each field uses{" "}
              <code>hideLabel</code> and the three sit in a CSS grid joined by "."
              separators.
            </li>
            <li>
              Fields use a grid (<code>1fr auto 1fr auto 1fr</code>) so they stay
              equal width and don't grow when the clear × appears.
            </li>
            <li>
              Each option's <code>label</code> is the code so the field shows the
              code only; <code>content</code> renders code + description in the row;
              <code> searchText</code> keeps the description searchable.
            </li>
            <li>
              Sections via Anvil's <code>pinned</code> ("… · This project", as a
              search-reactive function so pinned items filter) and{" "}
              <code>groupToString</code> ("More …") — no per-row chip.
            </li>
            <li>
              Stock add-new button via <code>onAddNewItem</code> /{" "}
              <code>addItemLabel</code>.
            </li>
            <li>
              CSS override: hide the dropdown chevron (
              <code>[aria-label="toggle menu"]</code>).
            </li>
            <li>
              CSS override: fix all menus to the same width (
              <code>width: 300px</code>) instead of Anvil's per-field
              trigger/content sizing.
            </li>
            <li>
              CSS override: force Anvil's stacked option content (title over
              description) inline with <code>!important</code> (Anvil sets{" "}
              <code>flex-direction</code> inline) + 1-line clamp.
            </li>
            <li>
              CSS override: blue the selected row's description too (Anvil only
              blues the code).
            </li>
            <li>
              CSS override: full-width footer hairline with the add button inset
              (Anvil's gray footer surface kept); scroller capped to 300px so ~6
              options show (matches v1).
            </li>
            <li>
              Custom (not an Anvil feature): auto-advance focus + open the next
              field after a selection; clear × restored.
            </li>
            <li>
              "." separators use the heavier Anvil display face (Sofia Pro Bold,
              <code> --a2-font-family-display</code>) per Figma.
            </li>
          </ul>
        </Flex>
      </Flex>
    </Card>
  );
}

// ===========================================================================

export default function BudgetCodePicker() {
  const [size, setSize] = useState<FieldSize>("medium");

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
        <Flex justifyContent="space-between" alignItems="center" gap="4">
          <Text variant="headline" el="h1" size="medium">
            Budget Code Picker
          </Text>
          <SegmentedControl
            selected={size}
            onChange={(value) => setSize(value as FieldSize)}
          >
            <SegmentedControl.Segment value="small">Small</SegmentedControl.Segment>
            <SegmentedControl.Segment value="medium">
              Medium
            </SegmentedControl.Segment>
          </SegmentedControl>
        </Flex>

        {/* v1 on the left, v0 on the right */}
        <Flex gap="4" alignItems="flex-start" wrap="wrap">
          <div style={{ flex: 1, minWidth: 420 }}>
            <PickerV1 size={size} />
          </div>
          <div style={{ flex: 1, minWidth: 420 }}>
            <PickerV0 size={size} />
          </div>
        </Flex>
      </Flex>
    </Flex>
  );
}
