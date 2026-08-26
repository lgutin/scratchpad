import {
  Fragment,
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent,
  type ReactNode,
} from "react";
import {
  Button,
  Card,
  FieldLabel,
  Flex,
  SegmentedControl,
  SelectMenuSync,
  Text,
  type SelectMenuOption,
} from "@servicetitan/anvil2";
import CloseIcon from "@servicetitan/anvil2/assets/icons/material/round/close.svg";
import "./budget-code-select-menu.css";

export const meta = {
  title: "Budget Code · SelectMenu",
  path: "/budget-code-select-menu",
  date: "2026-08-25",
  description:
    "Adam's idea: SelectMenu buttons inside a field shell (JPM-14945)",
};

// ---------------------------------------------------------------------------
// Segment taxonomy (same mock data as /budget-code-picker)
// ---------------------------------------------------------------------------

type SegmentKey = "cost-code" | "cost-type" | "phase";

const SEGMENTS: Record<SegmentKey, { label: string }> = {
  "cost-code": { label: "Cost Code" },
  "cost-type": { label: "Cost Type" },
  phase: { label: "Phase" },
};

const SEGMENT_ORDER: SegmentKey[] = ["cost-code", "cost-type", "phase"];

type FieldSize = "small" | "medium";

type BudgetOption = SelectMenuOption & {
  group: SegmentKey;
  token: string;
  extra: { description?: string; onProject?: boolean };
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
    extra: { description, onProject },
  };
}

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
  extra: { onProject },
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
  extra: { description: name, onProject: i < 3 },
}));

const secondaryOf = (o: BudgetOption) =>
  o.group === "cost-type" ? o.label : (o.extra.description ?? "");

// Menu rows: token as title, description beside it. The trigger button shows
// only the token (or the segment name while empty).
const toMenuOption = (o: BudgetOption): BudgetOption => {
  const desc = secondaryOf(o);
  return {
    ...o,
    label: o.token,
    searchText: `${o.token} ${desc}`,
    content: { title: o.token, description: desc },
  };
};

const MENU_ITEMS: Record<SegmentKey, BudgetOption[]> = {
  "cost-code": COST_CODES.map(toMenuOption),
  "cost-type": COST_TYPES.map(toMenuOption),
  phase: PHASES.map(toMenuOption),
};

const projectItemsFor = (segment: SegmentKey) =>
  MENU_ITEMS[segment].filter((item) => item.extra.onProject);

const moreItemsFor = (segment: SegmentKey) =>
  MENU_ITEMS[segment].filter((item) => !item.extra.onProject);

// ---------------------------------------------------------------------------

type Composite = Record<SegmentKey, BudgetOption | null>;

const EMPTY_COMPOSITE: Composite = {
  "cost-code": null,
  "cost-type": null,
  phase: null,
};

const SEP = " . ";

const SECTION_DIVIDER: CSSProperties = {
  borderTop: "1px solid var(--a2-border-color-subdued, #dfe0e1)",
  paddingTop: "var(--a2-size-4, 16px)",
};

function AssembledReadout({ value }: { value: string }) {
  return (
    <Flex direction="column" gap="2" style={SECTION_DIVIDER}>
      <Text variant="eyebrow" size="small">
        Assembled budget code
      </Text>
      <Text variant="headline" size="small" el="h3">
        {value || "\u2014"}
      </Text>
    </Flex>
  );
}

function Customizations({
  lead,
  children,
}: {
  lead: ReactNode;
  children: ReactNode;
}) {
  return (
    <Flex direction="column" gap="2" style={SECTION_DIVIDER}>
      <Text variant="eyebrow" size="small">
        Customizations
      </Text>
      <Text variant="body" size="small" subdued>
        {lead}
      </Text>
      <ul className="bcsm-notes">{children}</ul>
    </Flex>
  );
}

// ===========================================================================
// Adam's idea — N buttons + SelectMenuSync, wrapped in a field shell
// ===========================================================================

function isTypeaheadKey(e: KeyboardEvent) {
  return (
    e.key.length === 1 &&
    e.key !== " " &&
    e.key !== "." &&
    !e.ctrlKey &&
    !e.metaKey &&
    !e.altKey
  );
}

function seedMenuSearch(char: string) {
  const active = document.activeElement;
  const input =
    active instanceof HTMLInputElement && active.type === "search"
      ? active
      : document.querySelector<HTMLInputElement>(
          'input[type="search"]:focus, [data-anv-part="popover"] input[type="search"], [data-anv-part="dialog"] input[type="search"]',
        );
  if (!input) return false;
  const setter = Object.getOwnPropertyDescriptor(
    HTMLInputElement.prototype,
    "value",
  )?.set;
  setter?.call(input, char);
  input.dispatchEvent(new Event("input", { bubbles: true }));
  return input.value === char;
}

function clickActiveMenuOption() {
  const input =
    (document.activeElement instanceof HTMLElement &&
    document.activeElement.matches('input[type="search"]')
      ? document.activeElement
      : document.querySelector<HTMLElement>('input[type="search"]:focus')) ??
    document.querySelector<HTMLElement>(
      '[data-anv-part="popover"] input[type="search"]',
    );
  const activeId = input?.getAttribute("aria-activedescendant");
  const option =
    (activeId ? document.getElementById(activeId) : null) ??
    document.querySelector<HTMLElement>('[data-anv-part="option"]');
  option?.click();
  return Boolean(option);
}

function PickerSelectMenu({
  size,
  fieldWidth,
  keys,
}: {
  size: FieldSize;
  fieldWidth: number;
  keys: SegmentKey[];
}) {
  const [composite, setComposite] = useState<Composite>(EMPTY_COMPOSITE);
  const [live, setLive] = useState("");
  // One tab stop for the whole shell; ←/→ (and typeahead) move this index.
  const [tabStop, setTabStop] = useState(0);
  const shellRef = useRef<HTMLDivElement>(null);
  const compositeRef = useRef(composite);
  compositeRef.current = composite;
  // After a selection, open the next empty segment once this menu has closed.
  const pendingAdvance = useRef<number | null>(null);
  const labelId = `${useId()}-label`;

  useEffect(() => {
    setTabStop((t) => Math.min(t, Math.max(keys.length - 1, 0)));
  }, [keys.length]);

  const setSegment = (key: SegmentKey, option: SelectMenuOption | null) => {
    setComposite((prev) => ({
      ...prev,
      [key]: option as BudgetOption | null,
    }));
  };

  const firstEmptyIndex = (comp: Composite) => {
    for (let i = 0; i < keys.length; i++) {
      if (!comp[keys[i]]) return i;
    }
    return -1;
  };

  const tokenButtons = () =>
    shellRef.current?.querySelectorAll<HTMLButtonElement>(".bcsm-token");

  const focusSegment = useCallback((index: number) => {
    setTabStop(index);
    tokenButtons()?.[index]?.focus();
  }, []);

  const openSegment = useCallback((index: number) => {
    setTabStop(index);
    const btn = tokenButtons()?.[index];
    btn?.focus();
    btn?.click();
  }, []);

  const clearAll = () => {
    pendingAdvance.current = null;
    setComposite(EMPTY_COMPOSITE);
    setLive("Budget code cleared");
    openSegment(0);
  };

  const anyCommitted = keys.some((k) => composite[k]);
  const allCommitted = keys.every((k) => composite[k]);
  const assembled = allCommitted
    ? keys.map((k) => composite[k]!.token).join(SEP)
    : "";

  return (
    <Card padding="large" style={{ width: "100%" }}>
      <Flex direction="column" gap="4">
        <Flex direction="column" gap="1">
          <Text variant="eyebrow" size="small">
            SelectMenu · Buttons in a field shell
          </Text>
          <Text variant="body" size="small" subdued>
            Adam&apos;s SelectMenu buttons, tuned for keyboard speed: the shell
            is one tab stop; type to open and search; Enter / Tab / "." commit
            and auto-advance; ← / → move between segments. Click still works.
          </Text>
        </Flex>

        <Flex direction="column" gap="1">
          <FieldLabel id={labelId}>Budget Code</FieldLabel>
          <div style={{ width: fieldWidth, maxWidth: "100%" }}>
            <div
              ref={shellRef}
              role="group"
              aria-labelledby={labelId}
              className={`bcsm-shell${size === "small" ? " bcsm-shell--small" : ""}`}
              onClick={(e) => {
                if (e.target !== e.currentTarget) return;
                const next = firstEmptyIndex(composite);
                openSegment(next === -1 ? 0 : next);
              }}
            >
              {keys.map((key, i) => {
                const value = composite[key];
                const label = SEGMENTS[key].label;
                const plural = `${label}s`;
                const projectItems = projectItemsFor(key);

                return (
                  <Fragment key={key}>
                    {i > 0 && (
                      <span className="bcsm-sep" aria-hidden="true">
                        .
                      </span>
                    )}
                    <SelectMenuSync
                      label={label}
                      searchPlaceholder={`Search ${label.toLowerCase()}s\u2026`}
                      displayMenuAs="popover"
                      popoverWidth={Math.max(fieldWidth, 300)}
                      options={moreItemsFor(key)}
                      groupToString={() => `More ${plural}`}
                      pinned={
                        projectItems.length > 0
                          ? {
                              label: `${plural} \u00b7 This project`,
                              options: (searchValue: string) =>
                                projectItems.filter((o) =>
                                  (o.searchText ?? o.label)
                                    .toLowerCase()
                                    .includes(
                                      (searchValue ?? "").trim().toLowerCase(),
                                    ),
                                ),
                            }
                          : undefined
                      }
                      value={value}
                      onSelectedOptionChange={(option) => {
                        setSegment(key, option);
                        if (option) {
                          const next = {
                            ...compositeRef.current,
                            [key]: option as BudgetOption,
                          };
                          const empty = firstEmptyIndex(next);
                          pendingAdvance.current = empty >= 0 ? empty : null;
                          setLive(
                            empty >= 0
                              ? `${label} set to ${(option as BudgetOption).token}`
                              : `Budget code complete: ${keys
                                  .map((k) => next[k]!.token)
                                  .join(SEP)}`,
                          );
                        } else {
                          pendingAdvance.current = null;
                          setLive(`${label} cleared`);
                        }
                      }}
                      onMenuKeyDown={(e) => {
                        if (e.key === "." || (e.key === "Tab" && !e.shiftKey)) {
                          e.preventDefault();
                          clickActiveMenuOption();
                        }
                      }}
                      onExplicitClose={() => {
                        const next = pendingAdvance.current;
                        pendingAdvance.current = null;
                        if (next == null) return;
                        window.setTimeout(() => openSegment(next), 0);
                      }}
                      onImplicitClose={() => {
                        pendingAdvance.current = null;
                      }}
                      addItemLabel={`Add ${label.toLowerCase()}`}
                      onAddNewItem={() => {
                        /* stub: wire to real create-new-code flow */
                      }}
                      clear={
                        value
                          ? {
                              onClick: () => {
                                pendingAdvance.current = null;
                                setSegment(key, null);
                                setLive(`${label} cleared`);
                              },
                            }
                          : undefined
                      }
                      trigger={(props) => (
                        <Button
                          {...props}
                          appearance="ghost"
                          size={size}
                          tabIndex={
                            i === Math.min(tabStop, keys.length - 1) ? 0 : -1
                          }
                          className={`bcsm-token${value ? " bcsm-token--filled" : ""}`}
                          aria-label={
                            value ? `${label}, ${value.token}` : label
                          }
                          onClick={() => {
                            setTabStop(i);
                            props.onClick();
                          }}
                          onKeyDown={(e: KeyboardEvent<HTMLButtonElement>) => {
                            if (props["aria-expanded"]) {
                              props.onKeyDown(e);
                              return;
                            }

                            const frontier = firstEmptyIndex(compositeRef.current);
                            const maxIdx =
                              frontier === -1 ? keys.length - 1 : frontier;

                            if (e.key === "ArrowLeft") {
                              e.preventDefault();
                              focusSegment(Math.max(i - 1, 0));
                              return;
                            }
                            if (e.key === "ArrowRight") {
                              e.preventDefault();
                              focusSegment(Math.min(i + 1, maxIdx));
                              return;
                            }
                            if (e.key === "Tab" && !e.shiftKey) {
                              const empty = firstEmptyIndex(compositeRef.current);
                              if (empty >= 0) {
                                e.preventDefault();
                                openSegment(empty);
                              }
                              return;
                            }
                            if (e.key === "Tab" && e.shiftKey && i > 0) {
                              e.preventDefault();
                              focusSegment(i - 1);
                              return;
                            }
                            if (
                              (e.key === "Backspace" || e.key === "Delete") &&
                              value
                            ) {
                              e.preventDefault();
                              setSegment(key, null);
                              setLive(`${label} cleared`);
                              return;
                            }
                            if (e.key === ".") {
                              e.preventDefault();
                              if (value) {
                                const empty = firstEmptyIndex(compositeRef.current);
                                if (empty >= 0) openSegment(empty);
                                else focusSegment(Math.min(i + 1, keys.length - 1));
                              } else {
                                props.onClick();
                              }
                              return;
                            }
                            if (isTypeaheadKey(e)) {
                              e.preventDefault();
                              setTabStop(i);
                              props.onClick();
                              const char = e.key;
                              const trySeed = (attempt: number) => {
                                if (seedMenuSearch(char)) return;
                                if (attempt < 10) {
                                  requestAnimationFrame(() =>
                                    trySeed(attempt + 1),
                                  );
                                }
                              };
                              requestAnimationFrame(() => trySeed(0));
                              return;
                            }

                            props.onKeyDown(e);
                          }}
                        >
                          {value ? value.token : label}
                        </Button>
                      )}
                    />
                  </Fragment>
                );
              })}
              {anyCommitted && (
                <span className="bcsm-clear">
                  <Button
                    appearance="ghost"
                    size="small"
                    icon={CloseIcon}
                    tabIndex={-1}
                    aria-label="Clear budget code"
                    onClick={(e) => {
                      e.stopPropagation();
                      clearAll();
                    }}
                  />
                </span>
              )}
            </div>
          </div>
        </Flex>

        <div className="bcsm-sr-only" role="status" aria-live="polite">
          {live}
        </div>

        <AssembledReadout value={assembled} />

        <Customizations
          lead={
            <>
              Same primitive as Adam suggested, with keyboard-speed extras so we
              can vet whether SelectMenu buttons can keep up with timesheet
              entry — or whether type-in-the-field (v1) is still required.
            </>
          }
        >
          <li>
            <strong>Stock primitive.</strong> Each segment is still an Anvil{" "}
            <code>Button</code> + <code>SelectMenuSync</code>. Search, listbox
            a11y, pinned &quot;This project&quot;, grouped &quot;More \u2026&quot;,
            and add-new stay on the public API.
          </li>
          <li>
            <strong>Type to open.</strong> A letter/digit on a closed segment
            opens its menu and types that character into SelectMenu&apos;s
            search (Anvil does not honor a controlled <code>searchValue</code>
            on SelectMenu). After auto-advance, the next search field is
            focused so you can keep typing.
          </li>
          <li>
            <strong>One tab stop.</strong> Roving <code>tabIndex</code> so the
            shell is one stop in a table row (Clear is mouse-only). Tab on an
            incomplete code opens the first empty segment; Tab in an open menu
            commits the highlight; Tab on a complete code leaves the field.
          </li>
          <li>
            <strong>Commit keys match v1.</strong> Enter (stock), Tab, and "."
            all accept the highlighted row and auto-advance. ← / → move between
            segments while the menu is closed. Backspace on a filled closed
            button clears that segment.
          </li>
          <li>
            <strong>Still not in-field typing.</strong> The caret is in the menu
            search, not in the token. You cannot type the assembled code as one
            string. That remaining gap is the thing to feel in a timesheet row.
          </li>
          <li>
            <strong>A11y (Adam&apos;s bar) held.</strong> Distinct per-segment
            names; SelectMenu owns combobox / listbox ARIA. Keyboard extras
            wrap <code>onKeyDown</code> / <code>onMenuKeyDown</code> rather
            than replacing the menu.
          </li>
          <li>
            <strong>Override (brittle — internals):</strong> option title +
            description flipped to a row — same class-targeting issue as v0.
          </li>
        </Customizations>
      </Flex>
    </Card>
  );
}

// ===========================================================================

const FIELD_WIDTH_MIN = 200;
const FIELD_WIDTH_MAX = 560;
const FIELD_WIDTH_DEFAULT = 460;
const FIELD_WIDTH_DEFAULT_PCT =
  (FIELD_WIDTH_DEFAULT - FIELD_WIDTH_MIN) / (FIELD_WIDTH_MAX - FIELD_WIDTH_MIN);

export default function BudgetCodeSelectMenu() {
  const [size, setSize] = useState<FieldSize>("medium");
  const [fieldWidth, setFieldWidth] = useState(FIELD_WIDTH_DEFAULT);
  const [fieldCount, setFieldCount] = useState(2);
  const keys = SEGMENT_ORDER.slice(0, fieldCount);

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
        <Flex justifyContent="space-between" alignItems="center" gap="4" wrap="wrap">
          <Text variant="headline" el="h1" size="medium">
            Budget Code · SelectMenu
          </Text>
          <div className="bcsm-controls">
            <div className="bcsm-control">
              <span className="bcsm-control-label">Field count</span>
              <SegmentedControl
                size="small"
                selected={String(fieldCount)}
                onChange={(value) => setFieldCount(Number(value))}
              >
                <SegmentedControl.Segment value="2">2</SegmentedControl.Segment>
                <SegmentedControl.Segment value="3">3</SegmentedControl.Segment>
              </SegmentedControl>
            </div>

            <label className="bcsm-control">
              <span className="bcsm-control-label">Field width</span>
              <span className="bcsm-width-track">
                <span className="bcsm-width-trackline" aria-hidden="true" />
                <span
                  className="bcsm-width-default"
                  style={{
                    left: `calc(8px + ${FIELD_WIDTH_DEFAULT_PCT} * (100% - 16px))`,
                  }}
                  aria-hidden="true"
                />
                <input
                  type="range"
                  className="bcsm-width-slider"
                  min={FIELD_WIDTH_MIN}
                  max={FIELD_WIDTH_MAX}
                  step={10}
                  value={fieldWidth}
                  onChange={(e) => setFieldWidth(Number(e.target.value))}
                  aria-label="Picker field width"
                />
              </span>
              <span className="bcsm-width-value">{fieldWidth}px</span>
            </label>

            <div className="bcsm-control">
              <span className="bcsm-control-label">Field size</span>
              <SegmentedControl
                size="small"
                selected={size}
                onChange={(value) => setSize(value as FieldSize)}
              >
                <SegmentedControl.Segment value="small">
                  Small
                </SegmentedControl.Segment>
                <SegmentedControl.Segment value="medium">
                  Medium
                </SegmentedControl.Segment>
              </SegmentedControl>
            </div>
          </div>
        </Flex>

        <PickerSelectMenu size={size} fieldWidth={fieldWidth} keys={keys} />
      </Flex>
    </Flex>
  );
}
