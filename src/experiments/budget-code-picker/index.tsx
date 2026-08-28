import {
  Fragment,
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent,
  type ReactNode,
  type RefObject,
} from "react";
import {
  Button,
  Card,
  Checkbox,
  Dialog,
  FieldLabel,
  Flex,
  Icon,
  Popover,
  SegmentedControl,
  SelectFieldSync,
  Text,
  TextField,
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

const SEGMENTS: Record<SegmentKey, { label: string }> = {
  "cost-code": { label: "Cost Code" },
  "cost-type": { label: "Cost Type" },
  phase: { label: "Phase" },
};

// A budget code is the composite of one item per segment, in this order.
const SEGMENT_ORDER: SegmentKey[] = ["cost-code", "cost-type", "phase"];

// ---------------------------------------------------------------------------
// Config knobs — edit these before handing off to eng. They drive all three
// pickers (V0 / V1 / V2) from one place.
// ---------------------------------------------------------------------------

// Preselect segments on load. Reference a mock item id from COST_CODES /
// COST_TYPES / PHASES below (ids look like "cc-2", "ct-1", "ph-1"). Any subset
// is allowed — list only the segments you want prefilled and leave the rest
// out to start them empty. Set to {} to start with nothing selected.
const DEFAULT_SELECTION: Partial<Record<SegmentKey, string>> = {
  // Start with nothing selected. Add ids (e.g. "cost-code": "cc-2") to prefill
  // specific segments on load.
};

type FieldSize = "small" | "medium";

type BudgetOption = SelectFieldOption & {
  group: SegmentKey;
  token: string; // short form used in the assembled code, e.g. "01-100", "L", "Phase 1"
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

const ITEMS_BY_SEGMENT: Record<SegmentKey, BudgetOption[]> = {
  "cost-code": COST_CODES,
  "cost-type": COST_TYPES,
  phase: PHASES,
};

// CSI division names for the Parent field in Create New Cost Code.
const DIVISION_NAMES: Record<string, string> = {
  "01": "General Requirements",
  "02": "Sitework",
  "03": "Concrete",
  "04": "Masonry",
  "05": "Metals",
  "06": "Wood",
  "07": "Thermal & Moisture",
  "08": "Openings",
  "09": "Finishes",
  "10": "Specialties",
  "11": "Equipment",
  "12": "Furnishings",
  "21": "Fire Suppression",
  "22": "Plumbing",
  "23": "HVAC",
  "26": "Electrical",
  "27": "Communications",
  "28": "Electronic Safety",
  "31": "Earthwork",
  "32": "Exterior Improvements",
  "33": "Utilities",
};

// "None" (no parent) — the default Parent selection.
const NONE_PARENT: SelectFieldOption = { id: "__none__", label: "None" };

function parentOptionsFrom(codes: BudgetOption[]): SelectFieldOption[] {
  const seen = new Set<string>();
  const options: SelectFieldOption[] = [];
  for (const code of codes) {
    const id = code.token.match(/^(\d{2})/)?.[1];
    if (!id || seen.has(id)) continue;
    seen.add(id);
    const name = DIVISION_NAMES[id] ?? "Division";
    options.push({
      id,
      label: `${id} ${name}`,
      searchText: `${id} ${name}`,
      // Bold division number + subdued name, matching the picker's menu rows.
      content: { title: id, description: name },
    });
  }
  options.sort((a, b) => String(a.id).localeCompare(String(b.id)));
  return [NONE_PARENT, ...options];
}

function nextCostCodeId(existing: BudgetOption[]): number {
  let max = 0;
  for (const o of existing) {
    const n = Number(String(o.id).replace(/^cc-/, ""));
    if (Number.isFinite(n) && n > max) max = n;
  }
  return max + 1;
}

function assembleCostCode(parentId: string | null, suffix: string): string {
  const s = suffix.trim();
  if (!parentId) return s;
  const prefix = `${parentId}-`;
  if (s.toLowerCase().startsWith(prefix.toLowerCase())) return s;
  return `${prefix}${s}`;
}

function CreateCostCodeDialog({
  open,
  onClose,
  existingCodes,
  onCreated,
  onClosed,
  initialCode = "",
}: {
  open: boolean;
  onClose: () => void;
  existingCodes: BudgetOption[];
  onCreated: (option: BudgetOption) => void;
  onClosed?: () => void;
  // Seed the Cost Code field from what the user already typed in the picker.
  initialCode?: string;
}) {
  const parentOptions = parentOptionsFrom(existingCodes);
  const [parent, setParent] = useState<SelectFieldOption | null>(NONE_PARENT);
  const [code, setCode] = useState("");
  const [description, setDescription] = useState("");
  const [applyToProject, setApplyToProject] = useState(false);
  const [codeError, setCodeError] = useState("");
  // True when the dialog was opened with a code the user had already started in
  // the picker. Drives placeholder visibility + initial focus.
  const [seeded, setSeeded] = useState(false);

  const reset = () => {
    setParent(NONE_PARENT);
    setCode("");
    setDescription("");
    setApplyToProject(false);
    setCodeError("");
    setSeeded(false);
  };

  // When the dialog opens, seed from the picker's typed text. If it looks like
  // "NN-rest" and NN is a known division, preselect that Parent and drop the
  // prefix; otherwise put the whole thing in the Cost Code field.
  const wasOpen = useRef(false);
  useEffect(() => {
    if (open && !wasOpen.current) {
      const raw = initialCode.trim();
      setSeeded(raw.length > 0);
      const m = raw.match(/^(\d{2})-(.*)$/);
      const division = m
        ? parentOptions.find((o) => o.id === m[1])
        : undefined;
      if (m && division) {
        setParent(division);
        setCode(m[2]);
      } else {
        setParent(NONE_PARENT);
        setCode(raw);
      }
    }
    wasOpen.current = open;
    // parentOptions is derived from existingCodes each render; only re-seed on
    // an open transition or when the seed text changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, initialCode]);

  // When opened with a code already started, move focus to the next field that
  // needs input (Description) once Anvil's own open-focus has settled. (Anvil's
  // initialFocusResolver isn't honored in this version, so drive it directly.)
  useEffect(() => {
    if (!open || initialCode.trim().length === 0) return;
    const id = window.setTimeout(() => {
      const el = document.querySelector<HTMLInputElement>(
        'dialog[open] input[data-field="description"], [role="dialog"] input[data-field="description"]',
      );
      el?.focus();
    }, 80);
    return () => window.clearTimeout(id);
  }, [open, initialCode]);

  const parentId =
    parent && parent.id !== NONE_PARENT.id ? String(parent.id) : null;
  const prefix = parentId ? `${parentId}-` : undefined;
  // Once the user has started (seeded from the picker, or picked a Parent), drop
  // the "e.g." example placeholders — the prefix (e.g. "03-") still shows.
  const started = seeded || parentId != null;
  const canCreate = code.trim().length > 0 && description.trim().length > 0;

  const codeExists = (value: string) => {
    const full = assembleCostCode(parentId, value);
    if (!full) return false;
    return existingCodes.some(
      (o) => o.token.toLowerCase() === full.toLowerCase(),
    );
  };

  // On blur: flag a duplicate as soon as the user leaves the field.
  const validateCode = () => {
    setCodeError(codeExists(code) ? "Cost code already exists" : "");
  };

  const handleCreate = () => {
    const full = assembleCostCode(parentId, code);
    if (!full || !description.trim()) return;
    if (codeExists(code)) {
      setCodeError("Cost code already exists");
      return;
    }
    onCreated(
      costCode(
        nextCostCodeId(existingCodes),
        full,
        description.trim(),
        applyToProject,
      ),
    );
    onClose();
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      onCloseAnimationComplete={() => {
        reset();
        onClosed?.();
      }}
    >
      {open && (
        <>
          <Dialog.Header>Create New Cost Code</Dialog.Header>
          <Dialog.Content>
            <Flex direction="column" gap="6" alignItems="stretch" style={{ width: "100%" }}>
              <div className="bc-parent-field" style={{ width: "100%" }}>
                <SelectFieldSync
                  label="Parent"
                  placeholder="None"
                  options={parentOptions}
                  value={parent}
                  onSelectedOptionChange={(option) => {
                    setParent(option ?? NONE_PARENT);
                    setCodeError("");
                  }}
                  style={{ width: "100%" }}
                />
              </div>
              <div className="bc-costcode-field" style={{ width: "100%" }}>
                <TextField
                  label="Cost Code"
                  placeholder={started ? "" : "e.g. 03"}
                  prefix={prefix}
                  value={code}
                  error={codeError || false}
                  onChange={(e) => {
                    const v = e.target.value;
                    setCode(v);
                    // Per Anvil: once the field is errored, re-validate on each
                    // keystroke so it resolves the instant the value is valid.
                    if (codeError)
                      setCodeError(
                        codeExists(v) ? "Cost code already exists" : "",
                      );
                  }}
                  onBlur={validateCode}
                  style={{ width: "100%" }}
                />
              </div>
              <TextField
                label="Description"
                placeholder={started ? "" : "e.g. Concrete"}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                data-field="description"
                style={{ width: "100%" }}
              />
              <Checkbox
                label="Apply to this project only"
                checked={applyToProject}
                onChange={(e) => setApplyToProject(e.target.checked)}
              />
            </Flex>
          </Dialog.Content>
          <Dialog.Footer>
            <Flex gap="3" justifyContent="flex-end">
              <Dialog.CancelButton>Cancel</Dialog.CancelButton>
              <Button
                appearance="primary"
                disabled={!canCreate}
                onClick={handleCreate}
              >
                Create
              </Button>
            </Flex>
          </Dialog.Footer>
        </>
      )}
    </Dialog>
  );
}

// Predefined "Category" picklist for Create New Cost Type. Plain labels (no
// code/description), so in .bc-parent-field they render regular-weight. "None"
// leads and is the default, mirroring the Parent field.
const COST_TYPE_CATEGORIES: SelectFieldOption[] = [
  NONE_PARENT,
  { id: "labor", label: "Labor" },
  { id: "material", label: "Material" },
  { id: "equipment", label: "Equipment" },
  { id: "subcontractor", label: "Subcontractor" },
  { id: "overhead", label: "Overhead" },
  { id: "other", label: "Other" },
];

function nextCostTypeId(existing: BudgetOption[]): number {
  let max = 0;
  for (const o of existing) {
    const n = Number(String(o.id).replace(/^ct-/, ""));
    if (Number.isFinite(n) && n > max) max = n;
  }
  return max + 1;
}

// Mirrors CreateCostCodeDialog, but there's no parent (so no prefix) and the
// first field is a predefined "Category" picklist instead. The "Cost Type"
// field is the token shown in the assembled code; Description is its name.
function CreateCostTypeDialog({
  open,
  onClose,
  existingTypes,
  onCreated,
  onClosed,
  initialCode = "",
}: {
  open: boolean;
  onClose: () => void;
  existingTypes: BudgetOption[];
  onCreated: (option: BudgetOption) => void;
  onClosed?: () => void;
  // Seed the Cost Type field from what the user already typed in the picker.
  initialCode?: string;
}) {
  const [category, setCategory] = useState<SelectFieldOption | null>(
    NONE_PARENT,
  );
  const [code, setCode] = useState("");
  const [description, setDescription] = useState("");
  const [applyToProject, setApplyToProject] = useState(false);
  const [codeError, setCodeError] = useState("");
  const [seeded, setSeeded] = useState(false);

  const reset = () => {
    setCategory(NONE_PARENT);
    setCode("");
    setDescription("");
    setApplyToProject(false);
    setCodeError("");
    setSeeded(false);
  };

  const wasOpen = useRef(false);
  useEffect(() => {
    if (open && !wasOpen.current) {
      const raw = initialCode.trim();
      setSeeded(raw.length > 0);
      setCode(raw);
    }
    wasOpen.current = open;
  }, [open, initialCode]);

  // Seeded → move focus to the next field that needs input (Description) once
  // Anvil's open-focus settles.
  useEffect(() => {
    if (!open || initialCode.trim().length === 0) return;
    const id = window.setTimeout(() => {
      const el = document.querySelector<HTMLInputElement>(
        'dialog[open] input[data-field="description"], [role="dialog"] input[data-field="description"]',
      );
      el?.focus();
    }, 80);
    return () => window.clearTimeout(id);
  }, [open, initialCode]);

  // Drop the "e.g." example placeholders once the user has started (seeded from
  // the picker, or picked a Category other than None).
  const started =
    seeded || (category != null && category.id !== NONE_PARENT.id);
  const canCreate = code.trim().length > 0 && description.trim().length > 0;

  const typeExists = (value: string) => {
    const token = value.trim();
    if (!token) return false;
    return existingTypes.some(
      (o) => o.token.toLowerCase() === token.toLowerCase(),
    );
  };

  // On blur: flag a duplicate as soon as the user leaves the field.
  const validateCode = () => {
    setCodeError(typeExists(code) ? "Cost type already exists" : "");
  };

  const handleCreate = () => {
    const token = code.trim();
    if (!token || !description.trim()) return;
    if (typeExists(token)) {
      setCodeError("Cost type already exists");
      return;
    }
    onCreated({
      id: `ct-${nextCostTypeId(existingTypes)}`,
      label: description.trim(),
      group: "cost-type",
      token,
      extra: { onProject: applyToProject },
    });
    onClose();
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      onCloseAnimationComplete={() => {
        reset();
        onClosed?.();
      }}
    >
      {open && (
        <>
          <Dialog.Header>Create New Cost Type</Dialog.Header>
          <Dialog.Content>
            <Flex direction="column" gap="6" alignItems="stretch" style={{ width: "100%" }}>
              <div className="bc-parent-field" style={{ width: "100%" }}>
                <SelectFieldSync
                  label="Category"
                  placeholder="None"
                  options={COST_TYPE_CATEGORIES}
                  value={category}
                  onSelectedOptionChange={(option) =>
                    setCategory(option ?? NONE_PARENT)
                  }
                  style={{ width: "100%" }}
                />
              </div>
              <TextField
                label="Cost Type"
                placeholder={started ? "" : "e.g. Labor"}
                value={code}
                error={codeError || false}
                onChange={(e) => {
                  const v = e.target.value;
                  setCode(v);
                  // Per Anvil: once errored, re-validate on each keystroke.
                  if (codeError)
                    setCodeError(
                      typeExists(v) ? "Cost type already exists" : "",
                    );
                }}
                onBlur={validateCode}
                style={{ width: "100%" }}
              />
              <TextField
                label="Description"
                placeholder={started ? "" : "e.g. On-site labor"}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                data-field="description"
                style={{ width: "100%" }}
              />
              <Checkbox
                label="Apply to this project only"
                checked={applyToProject}
                onChange={(e) => setApplyToProject(e.target.checked)}
              />
            </Flex>
          </Dialog.Content>
          <Dialog.Footer>
            <Flex gap="3" justifyContent="flex-end">
              <Dialog.CancelButton>Cancel</Dialog.CancelButton>
              <Button
                appearance="primary"
                disabled={!canCreate}
                onClick={handleCreate}
              >
                Create
              </Button>
            </Flex>
          </Dialog.Footer>
        </>
      )}
    </Dialog>
  );
}

function nextPhaseId(existing: BudgetOption[]): number {
  let max = 0;
  for (const o of existing) {
    const n = Number(String(o.id).replace(/^ph-/, ""));
    if (Number.isFinite(n) && n > max) max = n;
  }
  return max + 1;
}

// Same conventions as the Cost Code / Cost Type dialogs, but a phase has just a
// Code + Description (no parent/category, no "apply to project").
function CreatePhaseDialog({
  open,
  onClose,
  existingPhases,
  onCreated,
  onClosed,
  initialCode = "",
}: {
  open: boolean;
  onClose: () => void;
  existingPhases: BudgetOption[];
  onCreated: (option: BudgetOption) => void;
  onClosed?: () => void;
  initialCode?: string;
}) {
  const [code, setCode] = useState("");
  const [description, setDescription] = useState("");
  const [applyToProject, setApplyToProject] = useState(false);
  const [codeError, setCodeError] = useState("");
  const [seeded, setSeeded] = useState(false);

  const reset = () => {
    setCode("");
    setDescription("");
    setApplyToProject(false);
    setCodeError("");
    setSeeded(false);
  };

  const wasOpen = useRef(false);
  useEffect(() => {
    if (open && !wasOpen.current) {
      const raw = initialCode.trim();
      setSeeded(raw.length > 0);
      setCode(raw);
    }
    wasOpen.current = open;
  }, [open, initialCode]);

  useEffect(() => {
    if (!open || initialCode.trim().length === 0) return;
    const id = window.setTimeout(() => {
      const el = document.querySelector<HTMLInputElement>(
        'dialog[open] input[data-field="description"], [role="dialog"] input[data-field="description"]',
      );
      el?.focus();
    }, 80);
    return () => window.clearTimeout(id);
  }, [open, initialCode]);

  const canCreate = code.trim().length > 0 && description.trim().length > 0;

  const phaseExists = (value: string) => {
    const token = value.trim();
    if (!token) return false;
    return existingPhases.some(
      (o) => o.token.toLowerCase() === token.toLowerCase(),
    );
  };

  const validateCode = () => {
    setCodeError(phaseExists(code) ? "Phase already exists" : "");
  };

  const handleCreate = () => {
    const token = code.trim();
    if (!token || !description.trim()) return;
    if (phaseExists(token)) {
      setCodeError("Phase already exists");
      return;
    }
    onCreated({
      id: `ph-${nextPhaseId(existingPhases)}`,
      label: `${token} \u00b7 ${description.trim()}`,
      group: "phase",
      token,
      extra: { description: description.trim(), onProject: applyToProject },
    });
    onClose();
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      onCloseAnimationComplete={() => {
        reset();
        onClosed?.();
      }}
    >
      {open && (
        <>
          <Dialog.Header>Create New Phase</Dialog.Header>
          <Dialog.Content>
            <Flex direction="column" gap="6" alignItems="stretch" style={{ width: "100%" }}>
              <TextField
                label="Phase"
                placeholder={seeded ? "" : "e.g. Phase 9"}
                value={code}
                error={codeError || false}
                onChange={(e) => {
                  const v = e.target.value;
                  setCode(v);
                  if (codeError)
                    setCodeError(phaseExists(v) ? "Phase already exists" : "");
                }}
                onBlur={validateCode}
                style={{ width: "100%" }}
              />
              <TextField
                label="Description"
                placeholder={seeded ? "" : "e.g. Closeout"}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                data-field="description"
                style={{ width: "100%" }}
              />
              <Checkbox
                label="Apply to this project only"
                checked={applyToProject}
                onChange={(e) => setApplyToProject(e.target.checked)}
              />
            </Flex>
          </Dialog.Content>
          <Dialog.Footer>
            <Flex gap="3" justifyContent="flex-end">
              <Dialog.CancelButton>Cancel</Dialog.CancelButton>
              <Button
                appearance="primary"
                disabled={!canCreate}
                onClick={handleCreate}
              >
                Create
              </Button>
            </Flex>
          </Dialog.Footer>
        </>
      )}
    </Dialog>
  );
}

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

// Resolve the configured ids against the option collection used by a picker.
// Returning a new object avoids sharing one state object across picker instances.
function createDefaultComposite(
  itemsBySegment: Record<SegmentKey, BudgetOption[]> = ITEMS_BY_SEGMENT,
): Composite {
  return SEGMENT_ORDER.reduce<Composite>((composite, key) => {
    const id = DEFAULT_SELECTION[key];
    composite[key] =
      itemsBySegment[key].find((item) => String(item.id) === id) ?? null;
    return composite;
  }, { ...EMPTY_COMPOSITE });
}

const SECTION_DIVIDER: CSSProperties = {
  borderTop: "1px solid var(--a2-border-color-subdued, #dfe0e1)",
  paddingTop: "var(--a2-size-4, 16px)",
};

function AssembledReadout({
  value,
  subtext,
}: {
  value: string;
  subtext?: string;
}) {
  return (
    <Flex direction="column" gap="1" style={SECTION_DIVIDER}>
      <Text variant="eyebrow" size="small">
        Assembled budget code
      </Text>
      <Text variant="headline" size="small" el="h3">
        {value || "\u2014"}
      </Text>
      {subtext && (
        <Text variant="body" size="small" subdued>
          {subtext}
        </Text>
      )}
    </Flex>
  );
}

// A titled bulleted section (Pros / Cons) with a blue Show/Hide eyebrow toggle,
// collapsed by default — same treatment as Customizations.
function EvalSection({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(true); // Pros/Cons shown by default
  return (
    <Flex direction="column" gap="1" style={SECTION_DIVIDER}>
      <Flex justifyContent="space-between" alignItems="center" gap="2">
        <Text variant="eyebrow" size="small">
          {title}
        </Text>
        <button
          type="button"
          className="bc-toggle"
          aria-expanded={open}
          onClick={() => setOpen((o) => !o)}
        >
          {open ? "Hide" : "Show"}
        </button>
      </Flex>
      {open && <ul className="bc-notes">{children}</ul>}
    </Flex>
  );
}

// Customizations, collapsed by default behind a small blue Show/Hide eyebrow
// toggle to the right of the section header. Written for an engineering audience
// (including Anvil authors weighing whether this level of customization is
// warranted). `lead` frames the posture; each <li> is one concrete change.
function Customizations({
  lead,
  children,
}: {
  lead: ReactNode;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  return (
    <Flex direction="column" gap="2" style={SECTION_DIVIDER}>
      <Flex justifyContent="space-between" alignItems="center" gap="2">
        <Text variant="eyebrow" size="small">
          Customizations
        </Text>
        <button
          type="button"
          className="bc-toggle"
          aria-expanded={open}
          onClick={() => setOpen((o) => !o)}
        >
          {open ? "Hide" : "Show"}
        </button>
      </Flex>
      {open && (
        <>
          <Text variant="body" size="small" subdued>
            {lead}
          </Text>
          <ul className="bc-notes">{children}</ul>
        </>
      )}
    </Flex>
  );
}

// ===========================================================================
// v1 — segmented type-ahead field (per Anvil2 spec)
// ===========================================================================

const V1_SEP = " . ";

// Space reserved (px) for the clear "×" button so it never squeezes the last
// segment's placeholder. Kept constant so the field's min-width is fill-stable.
const CLEAR_RESERVE_PX = 32;

// Shared <canvas> for text measurement (created lazily, reused across calls).
let measureCanvas: HTMLCanvasElement | null = null;
function measureTextWidth(text: string, font: string): number {
  if (!measureCanvas) measureCanvas = document.createElement("canvas");
  const ctx = measureCanvas.getContext("2d");
  if (!ctx) return 0;
  ctx.font = font;
  return ctx.measureText(text).width;
}

// Compute the width at which every segment's placeholder shows in full (no
// clipping), for use as the fused field's minimum width. Derived from the real
// labels + the input's computed font (not magic numbers), so it scales with the
// field count and adapts if labels or size change. It's a *constant* floor
// (independent of what's typed/committed), so segments still hug their tokens
// and the field never jumps as it fills or clears.
function usePlaceholderMinWidth(
  wrapRef: RefObject<HTMLDivElement | null>,
  labels: string[],
  size: FieldSize,
): number | undefined {
  const [minWidth, setMinWidth] = useState<number>();
  const labelsKey = labels.join("\u0000");
  useLayoutEffect(() => {
    const wrap = wrapRef.current;
    const input = wrap?.querySelector<HTMLInputElement>(".bcv1-input");
    const shell = wrap?.querySelector<HTMLElement>(".bcv1-shell");
    if (!wrap || !input || !shell) return;

    const measure = () => {
      const cs = getComputedStyle(input);
      const font = `${cs.fontStyle} ${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`;
      const padX =
        parseFloat(cs.paddingLeft || "0") + parseFloat(cs.paddingRight || "0");
      // Each segment: its placeholder text + the input's own padding (+1px slack
      // so the ellipsis never triggers at the exact pixel boundary).
      const segments = labels.reduce(
        (sum, label) =>
          sum + Math.ceil(measureTextWidth(label, font)) + padX + 1,
        0,
      );
      // Separators (" . ") between segments, measured from a live one.
      const sepEl = wrap.querySelector<HTMLElement>(".bcv1-sep");
      const sepW = sepEl ? sepEl.getBoundingClientRect().width : 10;
      const seps = sepW * Math.max(labels.length - 1, 0);
      const shellCs = getComputedStyle(shell);
      const shellPadX =
        parseFloat(shellCs.paddingLeft || "0") +
        parseFloat(shellCs.paddingRight || "0");
      const borders =
        parseFloat(shellCs.borderLeftWidth || "0") +
        parseFloat(shellCs.borderRightWidth || "0");
      setMinWidth(
        Math.ceil(segments + seps + CLEAR_RESERVE_PX + shellPadX + borders),
      );
    };

    measure();
    // Re-measure once web fonts finish loading — text metrics shift when the
    // real Nunito Sans replaces the fallback.
    document.fonts?.ready.then(measure).catch(() => {});
  }, [wrapRef, labelsKey, size]);

  return minWidth;
}

// Popover.Trigger spreads combobox-ish aria state (aria-expanded / -haspopup)
// onto the wrapper div, but in this custom control those belong on the active
// <input role="combobox">. Drop them so the role-less shell stays clean.
function stripAria(props: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(props).filter(([k]) => !k.startsWith("aria-")),
  );
}

function segmentList(
  key: SegmentKey,
  text: string,
  extras: BudgetOption[] = [],
): BudgetOption[] {
  // Pinned (this-project) items first, then the rest; ordering holds while filtering.
  // `extras` holds user-created items of any segment; include the ones for this key.
  const source = [
    ...ITEMS_BY_SEGMENT[key],
    ...extras.filter((e) => e.group === key),
  ];
  const pinnedFirst = [...source].sort(
    (a, b) => Number(!!b.extra.onProject) - Number(!!a.extra.onProject),
  );
  const q = text.trim().toLowerCase();
  if (!q) return pinnedFirst;
  return pinnedFirst.filter((o) =>
    `${primaryOf(o)} ${secondaryOf(o)} ${o.label}`.toLowerCase().includes(q),
  );
}

function PickerV1({
  size,
  fieldWidth,
  keys,
  allowCreateNew,
}: {
  size: FieldSize;
  fieldWidth: number;
  keys: SegmentKey[];
  allowCreateNew: boolean;
}) {
  // Only the first N segments are active (driven by the Field count control).
  // Shadows the module SEGMENT_ORDER so the rest of the component is unchanged.
  const SEGMENT_ORDER = keys;
  const RESTING = SEGMENT_ORDER.length; // `active` index meaning "done / resting"

  const [committed, setCommitted] = useState<Composite>(createDefaultComposite);
  const [active, setActive] = useState<number>(0); // 0..N-1 editing, N resting
  const [text, setText] = useState("");
  const [hi, setHi] = useState(0);
  const [menuOpen, setMenuOpen] = useState(false);
  const [shellWidth, setShellWidth] = useState<number>(460);
  // Polite status text announced to screen readers on commit / clear.
  const [live, setLive] = useState("");
  // True right after re-editing a committed segment: its token is in the input
  // (selected) but the menu should still show the full list, not filter to it.
  const [prefilled, setPrefilled] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [createTypeOpen, setCreateTypeOpen] = useState(false);
  const [createPhaseOpen, setCreatePhaseOpen] = useState(false);
  const [createInitialCode, setCreateInitialCode] = useState("");
  const [extraCodes, setExtraCodes] = useState<BudgetOption[]>([]);
  const [extraTypes, setExtraTypes] = useState<BudgetOption[]>([]);
  const [extraPhases, setExtraPhases] = useState<BudgetOption[]>([]);
  const createSegmentRef = useRef(0);
  const pendingCreatedRef = useRef<BudgetOption | null>(null);

  const wrapRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const blurTimer = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => () => clearTimeout(blurTimer.current), []);

  // Stable ids so the combobox input can point at the listbox + active option
  // (aria-controls / aria-activedescendant) and the group at its label.
  const uid = useId();
  const labelId = `${uid}-label`;
  const listboxId = `${uid}-listbox`;
  const optionId = (idx: number) => `${uid}-opt-${idx}`;

  const firstEmpty = (comp: Composite) => {
    for (let i = 0; i < SEGMENT_ORDER.length; i++) {
      if (!comp[SEGMENT_ORDER[i]]) return i;
    }
    return RESTING;
  };

  const navMax = Math.min(firstEmpty(committed), RESTING - 1);
  const activeKey = active < RESTING ? SEGMENT_ORDER[active] : null;
  const list = useMemo(
    // While prefilled (token selected on re-edit), show the full list so the
    // user can pick a different value; typing clears the flag and filters.
    () =>
      activeKey
        ? segmentList(activeKey, prefilled ? "" : text, [
            ...extraCodes,
            ...extraTypes,
            ...extraPhases,
          ])
        : [],
    [activeKey, text, prefilled, extraCodes, extraTypes, extraPhases],
  );
  const open = menuOpen && active < RESTING;

  // Keep the active input focused while editing, and select any prefilled text
  // (re-editing a committed segment) so typing replaces it — the "select all"
  // highlight, in place of a chip. No-op when advancing to an empty segment.
  // Skip the initial mount so the card doesn't grab focus / open on page load.
  const didAutoFocusRef = useRef(false);
  useEffect(() => {
    if (!didAutoFocusRef.current) {
      didAutoFocusRef.current = true;
      return;
    }
    if (active < RESTING) {
      const el = inputRef.current;
      el?.focus();
      el?.select();
    }
  }, [active, RESTING]);

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

  // Floor the field width at the point where every placeholder shows in full.
  const measuredMinWidth = usePlaceholderMinWidth(
    wrapRef,
    SEGMENT_ORDER.map((k) => SEGMENTS[k].label),
    size,
  );

  const editSegment = (i: number) => {
    const key = SEGMENT_ORDER[i];
    const item = committed[key];
    setActive(i);
    // Prefill the committed token so it's the input value and gets selected
    // (see the focus effect) — typing replaces it, like v0's select-all.
    setText(item?.token ?? "");
    setPrefilled(!!item);
    // Highlight the current value's row in the full list so Enter keeps it.
    const full = segmentList(key, "", [
      ...extraCodes,
      ...extraTypes,
      ...extraPhases,
    ]);
    const idx = item ? full.findIndex((o) => o.id === item.id) : 0;
    setHi(idx >= 0 ? idx : 0);
    setMenuOpen(true);
  };

  // Land on the resting (done) state once past the last segment.
  const rest = () => {
    setText("");
    setPrefilled(false);
    setHi(0);
    setActive(RESTING);
    setMenuOpen(false);
  };

  const commitAndAdvance = (item: BudgetOption) => {
    if (active >= RESTING) return;
    const key = SEGMENT_ORDER[active];
    const next = { ...committed, [key]: item };
    setCommitted(next);
    const na = active + 1;
    if (na >= RESTING) {
      rest();
      const allSet = SEGMENT_ORDER.every((k) => next[k]);
      setLive(
        allSet
          ? `Budget code complete: ${SEGMENT_ORDER.map((k) => next[k]!.token).join(V1_SEP)}`
          : `${SEGMENTS[key].label} set to ${item.token}`,
      );
    } else {
      // Always step to — and highlight — the next segment, including when the
      // code was already complete and you re-edited an earlier segment.
      setLive(`${SEGMENTS[key].label} set to ${item.token}`);
      editSegment(na);
    }
  };

  const advanceKeep = () => {
    const na = active + 1;
    if (na >= RESTING) rest();
    else editSegment(na);
  };

  const clearSegment = (i: number) => {
    setCommitted((prev) => ({ ...prev, [SEGMENT_ORDER[i]]: null }));
    setLive(`${SEGMENTS[SEGMENT_ORDER[i]].label} cleared`);
  };

  const clearAll = useCallback(() => {
    setCommitted(EMPTY_COMPOSITE);
    setActive(0);
    setText("");
    setHi(0);
    setMenuOpen(true);
    setLive("Budget code cleared");
    inputRef.current?.focus();
  }, []);

  const onInputKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (active >= RESTING) return;
    const key = SEGMENT_ORDER[active];
    // Commit the highlighted row (or keep an existing value) and advance —
    // shared by Enter, Tab, and Arrow Right.
    const confirmSelection = () => {
      if (!text.trim() && committed[key]) {
        advanceKeep();
      } else if (list.length) {
        commitAndAdvance(list[hi] ?? list[0]);
      }
    };
    switch (e.key) {
      case "ArrowDown":
        // APG combobox: if the popup is closed, ArrowDown opens it; otherwise
        // move the visual + activedescendant highlight down.
        e.preventDefault();
        if (!menuOpen) {
          setMenuOpen(true);
          break;
        }
        setHi((h) => Math.min(h + 1, Math.max(list.length - 1, 0)));
        break;
      case "ArrowUp":
        e.preventDefault();
        if (!menuOpen) {
          setMenuOpen(true);
          break;
        }
        setHi((h) => Math.max(h - 1, 0));
        break;
      case "Enter":
        e.preventDefault();
        confirmSelection();
        break;
      case ".":
        // Typing the delimiter commits + advances, like Enter / → (never typed
        // into the field since segment tokens don't contain ".").
        e.preventDefault();
        confirmSelection();
        break;
      case "Tab": {
        // Tab accepts the highlighted option and advances to the next segment
        // (like Enter / → / "."). Once the code is complete, Tab falls through
        // to its native behavior so focus can leave the field.
        if (e.shiftKey) break;
        const willCommit =
          (text.trim() && list.length) ||
          (!text.trim() && committed[key]) ||
          (!text.trim() && list.length);
        if (!willCommit) break;
        const advanced = { ...committed };
        if (text.trim() || !committed[key]) {
          advanced[key] = list[hi] ?? list[0];
        }
        const completesCode = SEGMENT_ORDER.every((k) => advanced[k]);
        if (!completesCode) e.preventDefault();
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
        // APG combobox: first Escape clears the query, then dismisses the popup.
        e.preventDefault();
        if (text) setText("");
        else setMenuOpen(false);
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

  // Build the inline field content. All three segments always render (so the
  // remaining placeholders stay visible when partially filled), each an <input>
  // that sizes to its own content (CSS `field-sizing: content`) — the blue
  // highlight hugs the text with symmetric padding and switching the active
  // segment (same content) never changes width — no jumping.
  const fieldParts: ReactNode[] = [];
  SEGMENT_ORDER.forEach((key, i) => {
    const committedItem = committed[key];
    const isActive = i === active && active < RESTING;

    const display = isActive ? text : (committedItem?.token ?? "");
    // The active segment always shows its real label (so clearing its text
    // reveals e.g. "Cost Type"); a committed, non-active segment shows its
    // token as the value (no placeholder).
    const ph = committedItem && !isActive ? "" : SEGMENTS[key].label;
    // Only committed (filled) segments are re-editable — hoverable + clickable.
    // Empty, non-active segments are just placeholders: not hoverable/clickable.
    const isToken = !isActive && !!committedItem;
    const isEmptyRest = !isActive && !committedItem;
    // Overlay the placeholder whenever the segment is empty so the "…"
    // truncation is identical whether or not the segment is focused.
    const showPlaceholder = display === "" && ph !== "";

    const node = (
      <span key={`seg-${key}`} className="bcv1-seg">
      <input
        ref={isActive ? inputRef : undefined}
        readOnly={!isActive}
        tabIndex={isActive ? 0 : -1}
        className={`bcv1-input${isToken ? " bcv1-input--token" : ""}${
          isEmptyRest ? " bcv1-input--empty" : ""
        }`}
        value={display}
        placeholder={ph}
        aria-label={SEGMENTS[key].label}
        // APG combobox (list autocomplete) semantics on the active segment.
        role={isActive ? "combobox" : undefined}
        aria-autocomplete={isActive ? "list" : undefined}
        aria-expanded={isActive ? open : undefined}
        aria-controls={isActive && open ? listboxId : undefined}
        aria-activedescendant={
          isActive && open && list.length ? optionId(hi) : undefined
        }
        size={1}
        onChange={
          isActive
            ? (e) => {
                const v = e.target.value;
                setText(v);
                setPrefilled(false); // real typing → filter by the query
                setHi(0);
                setMenuOpen(true);
                // Deleting all text in a committed segment unselects it, so the
                // real placeholder returns and it doesn't reappear on blur.
                if (v === "" && committed[key]) clearSegment(i);
              }
            : undefined
        }
        onFocus={isActive ? () => setMenuOpen(true) : undefined}
        onBlur={isActive ? onInputBlur : undefined}
        onKeyDown={isActive ? onInputKeyDown : undefined}
        onClick={isToken ? () => editSegment(i) : undefined}
      />
        {showPlaceholder && (
          <span className="bcv1-ph" aria-hidden="true">
            {ph}
          </span>
        )}
      </span>
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
  // Human-readable form: each segment's description instead of its token.
  const assembledReadable = allCommitted
    ? SEGMENT_ORDER.map((k) => secondaryOf(committed[k]!)).join(V1_SEP)
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
              id={optionId(idx)}
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

        const projHeaderId = `${uid}-grp-project`;
        const restHeaderId = `${uid}-grp-rest`;
        const restHeaderText =
          projectRows.length > 0 ? `More ${plural}` : plural;

        return (
          <div className="bcv1-menu" style={{ width: shellWidth }}>
            <div className="bcv1-body">
            <div
              className="bcv1-list"
              role="listbox"
              id={listboxId}
              aria-label={label}
            >
              {projectRows.length > 0 && (
                <div role="group" aria-labelledby={projHeaderId}>
                  <div id={projHeaderId} className="bcv1-menu-header">
                    {plural} · This project
                  </div>
                  {projectRows.map((item, i) => renderRow(item, i))}
                </div>
              )}
              {projectRows.length > 0 && restRows.length > 0 && (
                <div className="bcv1-menu-hr" role="separator" aria-hidden="true" />
              )}
              {restRows.length > 0 && (
                <div role="group" aria-labelledby={restHeaderId}>
                  <div id={restHeaderId} className="bcv1-menu-header">
                    {restHeaderText}
                  </div>
                  {restRows.map((item, i) =>
                    renderRow(item, projectRows.length + i),
                  )}
                </div>
              )}
              {list.length === 0 && (
                <div className="bcv1-empty" role="presentation">
                  No match found
                </div>
              )}
            </div>
            </div>
            {allowCreateNew && (
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
                    if (!activeKey) return;
                    createSegmentRef.current = active;
                    const typed = text.trim();
                    const existing =
                      activeKey === "cost-code"
                        ? [...COST_CODES, ...extraCodes]
                        : activeKey === "cost-type"
                          ? [...COST_TYPES, ...extraTypes]
                          : [...PHASES, ...extraPhases];
                    // Only carry the string into the dialog if it's genuinely new —
                    // not an already-selected value being re-edited (prefilled),
                    // nor an existing item.
                    const isNew =
                      typed !== "" &&
                      !prefilled &&
                      !existing.some(
                        (o) => o.token.toLowerCase() === typed.toLowerCase(),
                      );
                    setCreateInitialCode(isNew ? typed : "");
                    setMenuOpen(false);
                    if (activeKey === "cost-code") setCreateOpen(true);
                    else if (activeKey === "cost-type") setCreateTypeOpen(true);
                    else setCreatePhaseOpen(true);
                  }}
                >
                  Create new {label.toLowerCase()}
                </Button>
              </div>
            )}
          </div>
        );
      })()
    : null;

  return (
    <>
    <Card
      padding="large"
      style={{
        width: "100%",
        height: "100%",
        // Red ring marking v1 as a rejected direction.
        outline: "2px solid var(--a2-foreground-color-critical, #d92d20)",
        outlineOffset: "0px",
      }}
    >
      <Flex direction="column" gap="4">
        <Flex direction="column" gap="1">
          <Flex justifyContent="space-between" alignItems="center" gap="2">
            <Text variant="eyebrow" size="small">
              v1 · One field, type-ahead segments
            </Text>
            <button
              type="button"
              className="bcv2-pick"
              aria-label="Rejected direction"
              title="Rejected direction"
            >
              <Icon
                svg={CloseIcon}
                size="small"
                color="var(--a2-foreground-color-critical, #d92d20)"
              />
            </button>
          </Flex>
          <Text variant="body" size="small" subdued>
            Type to search each segment; press Enter, Tab, →, or "." to confirm
            and advance. Click a code to re-edit it; ← / → move between segments;
            Tab leaves the field once the code is complete.
          </Text>
        </Flex>

        <Flex direction="column" gap="1">
          <FieldLabel id={labelId}>Budget Code</FieldLabel>
          <div
            ref={wrapRef}
            style={{
              width: fieldWidth,
              minWidth: measuredMinWidth,
              maxWidth: "100%",
            }}
          >
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
                    {...stripAria(triggerProps)}
                    role="group"
                    aria-labelledby={labelId}
                    className={`bcv1-shell${size === "small" ? " bcv1-shell--small" : ""}`}
                    onClick={(e) => {
                      // Clicking the empty shell area to the right of the last
                      // segment re-edits that segment (select-all), like clicking
                      // the token itself.
                      if (e.target === e.currentTarget) {
                        const inputs =
                          e.currentTarget.querySelectorAll("input");
                        const lastInput = inputs[inputs.length - 1];
                        const lastIndex = SEGMENT_ORDER.length - 1;
                        if (
                          lastInput &&
                          e.clientX > lastInput.getBoundingClientRect().right &&
                          committed[SEGMENT_ORDER[lastIndex]]
                        ) {
                          editSegment(lastIndex);
                          return;
                        }
                      }
                      if (active >= RESTING) return;
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

        {/* Polite status: announces each commit + the completed code to AT. */}
        <div className="bcv1-sr-only" role="status" aria-live="polite">
          {live}
        </div>

        <AssembledReadout value={assembled} subtext={assembledReadable} />

        <EvalSection title="Pros">
          <li>
            <strong>One identifier, one field.</strong> Matches how people think
            of a budget code; a single clear × wipes the whole code, and one
            popover means no per-segment menus to size or align.
          </li>
          <li>
            <strong>Fast, keyboard-first entry.</strong> Type-ahead; Enter / Tab /
            → / "." advance; first row highlighted on open; select-all on re-edit;
            click right of the last segment to re-edit; committing steps to the
            next segment.
          </li>
          <li>
            <strong>Cleaner across screen sizes.</strong> Scales as one field
            with no layout jump (<code>field-sizing: content</code>) — tighter fit
            than N separate fields (esp. in dense tables).
          </li>
          <li>
            <strong>Meets the a11y bar.</strong> Built to WCAG 2.2 AA (APG
            combobox, live region) — addresses the earlier design-system
            keyboard/accessibility flag.
          </li>
        </EvalSection>

        <EvalSection title="Cons">
          <li>
            <strong>Superseded by v2.</strong> v2 keeps this exact fused look but
            gets per-segment focus, Tab order, and labeling from real inputs — the
            same UX with far less bespoke a11y to own. That's why this single-input
            build wasn't the pick.
          </li>
          <li>
            <strong>Actually the least conservative option.</strong> Anvil ships
            no segmented primitive, so the shell, menu, keyboard model, and a11y
            are all hand-built — the opposite of the "fewer overrides / DS
            precedent" reason some favored a combined field. (Holds only if
            "combined" is reimagined as a single parsed text field.)
          </li>
          <li>
            <strong>Re-implements Anvil.</strong> Listbox semantics, focus
            management, and selected states duplicate what <code>SelectField</code>{" "}
            already provides; larger code + maintenance surface.
          </li>
          <li>
            <strong>"." advance isn't obvious.</strong> In a single visual field
            it's not apparent that "." acts like Tab (mitigated by helper text).
          </li>
          <li>
            <strong>Newer-CSS reliance + review burden.</strong> Leans on{" "}
            <code>field-sizing</code> and <code>:has()</code>; the bespoke a11y
            still warrants a formal review before productizing.
          </li>
        </EvalSection>

        <Customizations
          lead={
            <>
              A ground-up build: Anvil ships no segmented / multi-token input, so
              almost everything is custom. Worth weighing whether segmented entry
              is common enough to warrant a shared component.
            </>
          }
        >
            <li>
              <strong>No suitable primitive.</strong> Field shell, dropdown, and
              interaction model are hand-built, not composed from{" "}
              <code>SelectField</code> — the root customization.
            </li>
            <li>
              <strong>Raw <code>&lt;input&gt;</code> segments</strong> (read-only
              unless active), sized with CSS <code>field-sizing: content</code> so
              switching segments never shifts layout. Leans on a newer CSS feature.
            </li>
            <li>
              <strong>Bespoke listbox:</strong> a bare <code>Popover</code> +
              hand-written rows, not <code>SelectField</code>'s menu —
              re-implements the listbox semantics and a11y Anvil already owns.
            </li>
            <li>
              <strong>Custom keyboard model:</strong> the first row is highlighted
              on open; Enter / Tab / → / "." commit + advance (Tab exits once the
              code is complete); ← / → move between segments; Backspace steps back;
              Escape clears then dismisses. Hand-built, no Anvil equivalent.
            </li>
            <li>
              <strong>Hand-wired ARIA:</strong> to hit WCAG 2.2 AA without a
              primitive, the active input carries the APG combobox roles (
              <code>role="combobox"</code>, <code>aria-expanded</code>,{" "}
              <code>aria-controls</code>, <code>aria-activedescendant</code>), the
              menu is a labelled <code>listbox</code> of <code>option</code>s in{" "}
              <code>role="group"</code> sections, the field is a{" "}
              <code>role="group"</code> tied to its label, and a polite{" "}
              <code>aria-live</code> region announces commits — all things Anvil's
              own components provide for free.
            </li>
            <li>
              <strong>Re-edit model:</strong> clicking a committed token (or the
              empty space right of the last segment) selects its text via native{" "}
              <code>::selection</code> (no chip); the menu shows the full list
              with the current value highlighted; committing steps to the next
              segment. Empty segments are non-interactive (
              <code>pointer-events: none</code>).
            </li>
            <li>
              <strong>Custom visuals:</strong> section headers (vs a per-row
              chip), selected row, and a committed-token hover clipped to the
              content box (<code>background-clip</code>) so it matches the
              selection — all hand-styled, diverging from Anvil's option states.
            </li>
            <li>
              <strong>"Create new" footer (optional):</strong> a toggle-gated{" "}
              <code>Button</code> below the list opens a dialog to add a code
              inline — hand-wired here, versus v0's stock{" "}
              <code>onAddNewItem</code>.
            </li>
            <li>
              <strong>Reused unchanged:</strong> <code>Popover</code>,{" "}
              <code>Icon</code>, <code>Button</code>, <code>FieldLabel</code>, and{" "}
              <code>--a2-</code> tokens throughout (with a{" "}
              <code>prefers-reduced-motion</code> guard on the shell transition);
              the menu borrows v0's 300px min-width.
            </li>
        </Customizations>
      </Flex>
    </Card>
    <CreateCostCodeDialog
      open={createOpen}
      onClose={() => setCreateOpen(false)}
      initialCode={createInitialCode}
      existingCodes={[...COST_CODES, ...extraCodes]}
      onCreated={(option) => {
        setExtraCodes((prev) => [...prev, option]);
        pendingCreatedRef.current = option;
      }}
      onClosed={() => {
        const option = pendingCreatedRef.current;
        pendingCreatedRef.current = null;
        if (!option) {
          rest(); // cancelled — discard the value kept underneath
          return;
        }
        commitAndAdvance(option);
        // Re-assert focus after the Dialog restores focus to its trigger, so
        // the segment advances (or the rightmost lands highlighted, no menu).
        const i = createSegmentRef.current;
        const na = i + 1;
        // Deterministic: run after Anvil's rAF-based focus restore (DrillDown
        // restoreFocus) via a double-rAF — no magic timeout.
        requestAnimationFrame(() =>
          requestAnimationFrame(() => {
            if (na < RESTING) {
              editSegment(na);
              inputRef.current?.focus();
            } else {
              editSegment(i);
              inputRef.current?.focus();
              inputRef.current?.select();
              setMenuOpen(false);
            }
          }),
        );
      }}
    />
    <CreateCostTypeDialog
      open={createTypeOpen}
      onClose={() => setCreateTypeOpen(false)}
      initialCode={createInitialCode}
      existingTypes={[...COST_TYPES, ...extraTypes]}
      onCreated={(option) => {
        setExtraTypes((prev) => [...prev, option]);
        pendingCreatedRef.current = option;
      }}
      onClosed={() => {
        const option = pendingCreatedRef.current;
        pendingCreatedRef.current = null;
        if (!option) {
          rest(); // cancelled — discard the value kept underneath
          return;
        }
        commitAndAdvance(option);
        // Re-assert focus after the Dialog restores focus to its trigger, so
        // the segment advances (or the rightmost lands highlighted, no menu).
        const i = createSegmentRef.current;
        const na = i + 1;
        // Deterministic: run after Anvil's rAF-based focus restore (DrillDown
        // restoreFocus) via a double-rAF — no magic timeout.
        requestAnimationFrame(() =>
          requestAnimationFrame(() => {
            if (na < RESTING) {
              editSegment(na);
              inputRef.current?.focus();
            } else {
              editSegment(i);
              inputRef.current?.focus();
              inputRef.current?.select();
              setMenuOpen(false);
            }
          }),
        );
      }}
    />
    <CreatePhaseDialog
      open={createPhaseOpen}
      onClose={() => setCreatePhaseOpen(false)}
      initialCode={createInitialCode}
      existingPhases={[...PHASES, ...extraPhases]}
      onCreated={(option) => {
        setExtraPhases((prev) => [...prev, option]);
        pendingCreatedRef.current = option;
      }}
      onClosed={() => {
        const option = pendingCreatedRef.current;
        pendingCreatedRef.current = null;
        if (!option) {
          rest(); // cancelled — discard the value kept underneath
          return;
        }
        commitAndAdvance(option);
        const i = createSegmentRef.current;
        const na = i + 1;
        // Deterministic: run after Anvil's rAF-based focus restore (DrillDown
        // restoreFocus) via a double-rAF — no magic timeout.
        requestAnimationFrame(() =>
          requestAnimationFrame(() => {
            if (na < RESTING) {
              editSegment(na);
              inputRef.current?.focus();
            } else {
              editSegment(i);
              inputRef.current?.focus();
              inputRef.current?.select();
              setMenuOpen(false);
            }
          }),
        );
      }}
    />
    </>
  );
}

// ===========================================================================
// v2 — same fused look as v1, but each segment is a GENUINE separate input
//      (type="time" model): every segment is its own natively-focusable
//      combobox, native Tab moves focus, one shared wide menu tracks focus.
// ===========================================================================

function PickerV2({
  size,
  fieldWidth,
  keys,
  allowCreateNew,
}: {
  size: FieldSize;
  fieldWidth: number;
  keys: SegmentKey[];
  allowCreateNew: boolean;
}) {
  // Only the first N segments render (driven by the Field count control).
  const SEGMENT_ORDER = keys;

  const [committed, setCommitted] = useState<Composite>(createDefaultComposite);
  // Which segment currently has focus (0..N-1), or -1 when the field is at rest.
  // Derived from real DOM focus events — not a hijacked counter.
  const [activeIndex, setActiveIndex] = useState<number>(-1);
  const [text, setText] = useState("");
  const [hi, setHi] = useState(0);
  const [menuOpen, setMenuOpen] = useState(false);
  const [shellWidth, setShellWidth] = useState<number>(460);
  const [live, setLive] = useState("");
  // True right after focusing a committed segment: its token is prefilled +
  // selected, but the menu still shows the full list (not filtered to it).
  const [prefilled, setPrefilled] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [createTypeOpen, setCreateTypeOpen] = useState(false);
  const [createPhaseOpen, setCreatePhaseOpen] = useState(false);
  const [createInitialCode, setCreateInitialCode] = useState("");
  const [extraCodes, setExtraCodes] = useState<BudgetOption[]>([]);
  const [extraTypes, setExtraTypes] = useState<BudgetOption[]>([]);
  const [extraPhases, setExtraPhases] = useState<BudgetOption[]>([]);
  const createSegmentRef = useRef(0);
  const pendingCreatedRef = useRef<BudgetOption | null>(null);

  const wrapRef = useRef<HTMLDivElement>(null);
  // One ref per segment input — the heart of the separate-input model.
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const blurTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  // Set true right after creating into the LAST segment. Anvil's Dialog restores
  // focus into that segment on close; onSegFocus consumes this flag to bounce the
  // field straight to rest (no menu, no caret, no "selected blue" flash).
  const restAfterCreateRef = useRef(false);
  // True while a Create dialog is open: keep the typed value in the segment
  // (visible underneath) instead of clearing it on blur; discarded on cancel.
  const createDialogActiveRef = useRef(false);

  useEffect(() => () => clearTimeout(blurTimer.current), []);

  const uid = useId();
  const labelId = `${uid}-label`;
  const listboxId = `${uid}-listbox`;
  const optionId = (idx: number) => `${uid}-opt-${idx}`;

  const activeKey = activeIndex >= 0 ? SEGMENT_ORDER[activeIndex] : null;
  const list = useMemo(
    () =>
      activeKey
        ? segmentList(activeKey, prefilled ? "" : text, [
            ...extraCodes,
            ...extraTypes,
            ...extraPhases,
          ])
        : [],
    [activeKey, text, prefilled, extraCodes, extraTypes, extraPhases],
  );
  const open = menuOpen && activeIndex >= 0;

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

  // Floor the field width at the point where every placeholder shows in full.
  const measuredMinWidth = usePlaceholderMinWidth(
    wrapRef,
    SEGMENT_ORDER.map((k) => SEGMENTS[k].label),
    size,
  );

  // After focusing a committed segment, select its prefilled token so typing
  // replaces it (the "select all" highlight, in place of a chip). Runs after
  // the controlled value is applied so the selection isn't collapsed.
  useEffect(() => {
    if (activeIndex >= 0 && prefilled) inputRefs.current[activeIndex]?.select();
  }, [activeIndex, prefilled]);

  // Move real DOM focus to segment `i`; its onFocus wires up the shared menu.
  // Past the last segment → blur to rest.
  const focusSegment = (i: number) => {
    if (i < 0) return;
    if (i >= SEGMENT_ORDER.length) {
      inputRefs.current[activeIndex]?.blur();
      return;
    }
    inputRefs.current[i]?.focus();
  };

  // Genuine focus handler: real focus (Tab, click, or programmatic) drives state.
  const onSegFocus = (i: number) => {
    // Just created into the last segment → Anvil restores focus here on close.
    // Bounce it straight to rest: close the menu now and blur back out, so there's
    // no open menu, no caret, and no text-selection "blue" moment.
    if (restAfterCreateRef.current) {
      restAfterCreateRef.current = false;
      setMenuOpen(false);
      const el = inputRefs.current[i];
      if (el) {
        // Collapse any auto-selection and drop focus SYNCHRONOUSLY (not in a rAF)
        // so the focused "selected blue" state never gets a frame to paint.
        try {
          el.setSelectionRange(el.value.length, el.value.length);
        } catch {
          /* non-text input */
        }
        el.blur();
      }
      return;
    }
    const key = SEGMENT_ORDER[i];
    const item = committed[key];
    setActiveIndex(i);
    setText(item?.token ?? "");
    setPrefilled(!!item);
    const full = segmentList(key, "", [
      ...extraCodes,
      ...extraTypes,
      ...extraPhases,
    ]);
    const idx = item ? full.findIndex((o) => o.id === item.id) : 0;
    setHi(idx >= 0 ? idx : 0);
    setMenuOpen(true);
  };

  // Close the menu + go to rest only when focus leaves ALL segment inputs
  // (including when it lands on the clear button inside the shell).
  const onSegBlur = () => {
    clearTimeout(blurTimer.current);
    blurTimer.current = setTimeout(() => {
      const ae = document.activeElement;
      const stillInSegment = inputRefs.current.some((el) => el && el === ae);
      if (!stillInSegment) {
        setMenuOpen(false);
        // Focus truly left the field — clear the one-shot rest flag as a safety net.
        restAfterCreateRef.current = false;
        // A Create dialog took focus: keep the typed value visible underneath.
        if (createDialogActiveRef.current) return;
        setActiveIndex(-1);
        setText("");
        setPrefilled(false);
      }
    }, 120);
  };

  const commitAndAdvance = (item: BudgetOption, i: number) => {
    const key = SEGMENT_ORDER[i];
    const next = { ...committed, [key]: item };
    setCommitted(next);
    const na = i + 1;
    if (na >= SEGMENT_ORDER.length) {
      const allSet = SEGMENT_ORDER.every((k) => next[k]);
      setLive(
        allSet
          ? `Budget code complete: ${SEGMENT_ORDER.map((k) => next[k]!.token).join(V1_SEP)}`
          : `${SEGMENTS[key].label} set to ${item.token}`,
      );
      // Drop to rest immediately (like v1's rest()): close the menu and clear the
      // active/selected state synchronously, so there's no ~120ms window where the
      // menu lingers and the token shows the "selected blue" state while the blur
      // debounce settles.
      setMenuOpen(false);
      setActiveIndex(-1);
      setText("");
      setPrefilled(false);
      inputRefs.current[i]?.blur(); // done → rest
    } else {
      setLive(`${SEGMENTS[key].label} set to ${item.token}`);
      focusSegment(na); // real focus move to the next segment
    }
  };

  const advanceKeep = (i: number) => focusSegment(i + 1);

  // Write a value into a segment WITHOUT moving focus. Called the instant an item
  // is created (before the dialog closes) so the value shows immediately as the
  // scrim fades — focus is advanced separately in onClosed, after the close.
  const commitValue = (item: BudgetOption, i: number) => {
    const key = SEGMENT_ORDER[i];
    const next = { ...committed, [key]: item };
    setCommitted(next);
    // The segment is still "active" while the dialog closes, so its input shows
    // the live query (empty if the value was typed in the dialog). Sync the live
    // text to the new token now so the field shows it immediately — otherwise it
    // lags the bold readout (which reads committed) until blur switches display.
    setText(item.token);
    setPrefilled(true);
    const allSet = SEGMENT_ORDER.every((k) => next[k]);
    setLive(
      allSet
        ? `Budget code complete: ${SEGMENT_ORDER.map((k) => next[k]!.token).join(V1_SEP)}`
        : `${SEGMENTS[key].label} set to ${item.token}`,
    );
  };

  const clearSegment = (i: number) => {
    setCommitted((prev) => ({ ...prev, [SEGMENT_ORDER[i]]: null }));
    setText("");
    setPrefilled(false);
    setHi(0);
    setLive(`${SEGMENTS[SEGMENT_ORDER[i]].label} cleared`);
  };

  const clearAll = () => {
    setCommitted(EMPTY_COMPOSITE);
    setLive("Budget code cleared");
    requestAnimationFrame(() => inputRefs.current[0]?.focus());
  };

  const onSegKeyDown = (e: KeyboardEvent<HTMLInputElement>, i: number) => {
    const key = SEGMENT_ORDER[i];
    // Commit the highlighted row (or keep an existing value) and advance focus.
    const confirmSelection = () => {
      if (!text.trim() && committed[key]) advanceKeep(i);
      else if (list.length) commitAndAdvance(list[hi] ?? list[0], i);
    };
    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        if (!menuOpen) {
          setMenuOpen(true);
          break;
        }
        setHi((h) => Math.min(h + 1, Math.max(list.length - 1, 0)));
        break;
      case "ArrowUp":
        e.preventDefault();
        if (!menuOpen) {
          setMenuOpen(true);
          break;
        }
        setHi((h) => Math.max(h - 1, 0));
        break;
      case "Enter":
        e.preventDefault();
        confirmSelection();
        break;
      case ".":
        // Typing the delimiter commits + advances, like Enter / →.
        e.preventDefault();
        confirmSelection();
        break;
      case "Tab": {
        // Native Tab moves focus between segments — we DON'T preventDefault.
        // As an enhancement, accept the highlighted row before the browser
        // moves focus, so Tab both commits and advances naturally.
        if (e.shiftKey) break;
        if (list.length && (text.trim() || !committed[key])) {
          const key2 = SEGMENT_ORDER[i];
          setCommitted((prev) => ({ ...prev, [key2]: list[hi] ?? list[0] }));
          setLive(`${SEGMENTS[key2].label} set to ${(list[hi] ?? list[0]).token}`);
        }
        break;
      }
      case "ArrowLeft":
        // At the very start of the text, move focus to the previous segment.
        if (
          e.currentTarget.selectionStart === 0 &&
          e.currentTarget.selectionEnd === 0
        ) {
          e.preventDefault();
          focusSegment(i - 1);
        }
        break;
      case "ArrowRight": {
        // At the end of the text, → commits the highlighted row and advances.
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
          if (committed[key]) clearSegment(i);
          else focusSegment(i - 1);
        }
        break;
      case "Escape":
        // APG combobox: first Escape clears the query, then dismisses the popup.
        e.preventDefault();
        if (text) setText("");
        else setMenuOpen(false);
        break;
    }
  };

  const anyCommitted = SEGMENT_ORDER.some((k) => committed[k]);
  const allCommitted = SEGMENT_ORDER.every((k) => committed[k]);

  // Each segment is an independent, natively-focusable <input role="combobox">.
  // The value shows the focused segment's live query or its committed token;
  // `field-sizing: content` keeps widths stable so switching never jumps.
  const fieldParts: ReactNode[] = [];
  SEGMENT_ORDER.forEach((key, i) => {
    const committedItem = committed[key];
    const isActive = i === activeIndex;
    const display = isActive ? text : (committedItem?.token ?? "");
    // Placeholder: the active segment always shows its real label (so clearing
    // its text reveals e.g. "Cost Type", not the old token). A committed,
    // non-active segment shows its token as the value (no placeholder).
    const ph = committedItem && !isActive ? "" : SEGMENTS[key].label;
    const isToken = !isActive && !!committedItem;
    // Show the overlay placeholder whenever the segment is empty (so the "…"
    // truncation is identical whether or not the segment is focused).
    const showPlaceholder = display === "" && ph !== "";

    fieldParts.push(
      <span key={`seg-${key}`} className="bcv1-seg">
      <input
        ref={(el) => {
          inputRefs.current[i] = el;
        }}
        tabIndex={0}
        className={`bcv1-input${isToken ? " bcv1-input--token" : ""}`}
        value={display}
        placeholder={ph}
        aria-label={SEGMENTS[key].label}
        // Every segment is its own APG combobox; only the focused one's popup
        // is expanded and controls the shared listbox.
        role="combobox"
        aria-autocomplete="list"
        aria-expanded={isActive ? open : false}
        aria-controls={isActive && open ? listboxId : undefined}
        aria-activedescendant={
          isActive && open && list.length ? optionId(hi) : undefined
        }
        size={1}
        onChange={(e) => {
          const v = e.target.value;
          setText(v);
          setPrefilled(false); // real typing → filter by the query
          setHi(0);
          setMenuOpen(true);
          // Deleting all text in a committed segment unselects it, so the real
          // placeholder returns and the old value doesn't reappear on blur.
          if (v === "" && committed[key]) {
            setCommitted((prev) => ({ ...prev, [key]: null }));
            setLive(`${SEGMENTS[key].label} cleared`);
          }
        }}
        onFocus={() => onSegFocus(i)}
        onBlur={onSegBlur}
        onKeyDown={(e) => onSegKeyDown(e, i)}
      />
        {showPlaceholder && (
          <span className="bcv1-ph" aria-hidden="true">
            {ph}
          </span>
        )}
      </span>,
    );

    if (i < SEGMENT_ORDER.length - 1) {
      fieldParts.push(
        <span key={`sep-${key}`} className="bcv1-sep" aria-hidden="true">
          .
        </span>,
      );
    }
  });

  const assembled = allCommitted
    ? SEGMENT_ORDER.map((k) => committed[k]!.token).join(V1_SEP)
    : "";
  // Human-readable form: each segment's description instead of its token.
  const assembledReadable = allCommitted
    ? SEGMENT_ORDER.map((k) => secondaryOf(committed[k]!)).join(V1_SEP)
    : "";

  const menu = activeKey
    ? (() => {
        const label = SEGMENTS[activeKey].label;
        const plural = `${label}s`;
        const projectRows = list.filter((o) => o.extra.onProject);
        const restRows = list.filter((o) => !o.extra.onProject);
        const currentId = committed[activeKey]?.id;

        const renderRow = (item: BudgetOption, idx: number) => {
          const isCurrent = currentId === item.id;
          return (
            <div
              key={item.id}
              id={optionId(idx)}
              role="option"
              aria-selected={isCurrent}
              className={`bcv1-row${idx === hi ? " bcv1-row--hi" : ""}${
                isCurrent ? " bcv1-row--current" : ""
              }`}
              onMouseEnter={() => setHi(idx)}
              // Keep focus in the input so blur-close doesn't fire before click.
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => commitAndAdvance(item, activeIndex)}
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

        const projHeaderId = `${uid}-grp-project`;
        const restHeaderId = `${uid}-grp-rest`;
        const restHeaderText =
          projectRows.length > 0 ? `More ${plural}` : plural;

        return (
          <div className="bcv1-menu" style={{ width: shellWidth }}>
            <div className="bcv1-body">
            <div
              className="bcv1-list"
              role="listbox"
              id={listboxId}
              aria-label={label}
            >
              {projectRows.length > 0 && (
                <div role="group" aria-labelledby={projHeaderId}>
                  <div id={projHeaderId} className="bcv1-menu-header">
                    {plural} · This project
                  </div>
                  {projectRows.map((item, i) => renderRow(item, i))}
                </div>
              )}
              {projectRows.length > 0 && restRows.length > 0 && (
                <div className="bcv1-menu-hr" role="separator" aria-hidden="true" />
              )}
              {restRows.length > 0 && (
                <div role="group" aria-labelledby={restHeaderId}>
                  <div id={restHeaderId} className="bcv1-menu-header">
                    {restHeaderText}
                  </div>
                  {restRows.map((item, i) =>
                    renderRow(item, projectRows.length + i),
                  )}
                </div>
              )}
              {list.length === 0 && (
                <div className="bcv1-empty" role="presentation">
                  No match found
                </div>
              )}
            </div>
            </div>
            {allowCreateNew && (
              <div className="bcv1-footer">
                <Button
                  appearance="secondary"
                  size="small"
                  icon={{ before: AddIcon }}
                  style={{ width: "100%" }}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => {
                    if (!activeKey) return;
                    createDialogActiveRef.current = true;
                    createSegmentRef.current = activeIndex;
                    const typed = text.trim();
                    const existing =
                      activeKey === "cost-code"
                        ? [...COST_CODES, ...extraCodes]
                        : activeKey === "cost-type"
                          ? [...COST_TYPES, ...extraTypes]
                          : [...PHASES, ...extraPhases];
                    // Only carry the string into the dialog if it's genuinely new —
                    // not an already-selected value being re-edited (prefilled),
                    // nor an existing item.
                    const isNew =
                      typed !== "" &&
                      !prefilled &&
                      !existing.some(
                        (o) => o.token.toLowerCase() === typed.toLowerCase(),
                      );
                    setCreateInitialCode(isNew ? typed : "");
                    setMenuOpen(false);
                    if (activeKey === "cost-code") setCreateOpen(true);
                    else if (activeKey === "cost-type") setCreateTypeOpen(true);
                    else setCreatePhaseOpen(true);
                  }}
                >
                  Create new {label.toLowerCase()}
                </Button>
              </div>
            )}
          </div>
        );
      })()
    : null;

  return (
    <>
    <Card
      padding="large"
      style={{
        width: "100%",
        height: "100%",
        // Green ring reinforcing v2 as the chosen direction.
        outline: "2px solid var(--a2-foreground-color-success, #1a8245)",
        outlineOffset: "0px",
      }}
    >
      <Flex direction="column" gap="4">
        <Flex direction="column" gap="1">
          <Flex justifyContent="space-between" alignItems="center" gap="2">
            <Text variant="eyebrow" size="small">
              v2 · One field, separate inputs
            </Text>
            <button
              type="button"
              className="bcv2-pick"
              aria-label="Selected direction"
              title="Selected direction"
            >
              <Icon
                svg={CheckIcon}
                size="small"
                color="var(--a2-foreground-color-success, #1a8245)"
              />
            </button>
          </Flex>
          <Text variant="body" size="small" subdued>
            Same fused field as v1, but each segment is its own real combobox.
            Tab / Shift+Tab move between segments natively; type to search;
            Enter, →, or "." confirm and advance. Each segment has its own label
            for screen readers.
          </Text>
        </Flex>

        <Flex direction="column" gap="1">
          <FieldLabel id={labelId}>Budget Code</FieldLabel>
          <div
            ref={wrapRef}
            style={{
              width: fieldWidth,
              minWidth: measuredMinWidth,
              maxWidth: "100%",
            }}
          >
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
                    {...stripAria(triggerProps)}
                    role="group"
                    aria-labelledby={labelId}
                    className={`bcv1-shell${size === "small" ? " bcv1-shell--small" : ""}`}
                    onClick={(e) => {
                      // Clicking the blank shell area focuses the first empty
                      // segment (or the last, if the code is complete). Clicks
                      // on the inputs themselves focus natively.
                      if (e.target !== e.currentTarget) return;
                      const firstEmpty = SEGMENT_ORDER.findIndex(
                        (k) => !committed[k],
                      );
                      const target =
                        firstEmpty === -1
                          ? SEGMENT_ORDER.length - 1
                          : firstEmpty;
                      inputRefs.current[target]?.focus();
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

        {/* Polite status: announces each commit + the completed code to AT. */}
        <div className="bcv1-sr-only" role="status" aria-live="polite">
          {live}
        </div>

        <AssembledReadout value={assembled} subtext={assembledReadable} />

        <EvalSection title="Pros">
          <li>
            <strong>Genuine separate inputs.</strong> Each segment is its own
            natively-focusable <code>&lt;input role="combobox"&gt;</code> with a
            distinct label — real Tab order, no hijacked focus. This is the
            design-team's recommended "three components on the page" route.
          </li>
          <li>
            <strong>Still one identifier.</strong> Reads and behaves as a single
            fused field with one clear × and one shared wide menu — same look as
            v1, matching the native <code>type="time"</code> pattern.
          </li>
          <li>
            <strong>Native focus &amp; keyboard.</strong> Tab / Shift+Tab move
            between segments for free; typing filters the focused segment;
            Enter / → / "." commit and move focus to the next.
          </li>
          <li>
            <strong>Lower a11y risk than v1.</strong> Screen readers announce
            each segment as its own labeled combobox — no single-focus +{" "}
            <code>aria-activedescendant</code> juggling spanning the whole field.
          </li>
        </EvalSection>

        <EvalSection title="Cons">
          <li>
            <strong>Still a custom container.</strong> The fused border, "."
            separators, and shared menu are hand-built CSS around real inputs —
            not a stock Anvil field.
          </li>
          <li>
            <strong>Shared menu is bespoke.</strong> The listbox rows, grouping,
            and selected states are still hand-rendered rather than{" "}
            <code>SelectField</code>'s own menu.
          </li>
          <li>
            <strong>Focus choreography.</strong> Programmatic focus moves on
            commit and select-all-on-re-edit need care to stay glitch-free
            across browsers.
          </li>
          <li>
            <strong>Newer-CSS reliance.</strong> Leans on{" "}
            <code>field-sizing: content</code> for stable widths, same as v1.
          </li>
        </EvalSection>

        <Customizations
          lead={
            <>
              The chosen direction. The safer take on the combined field: keep
              v1's visuals, but build on genuinely separate inputs so focus, Tab
              order, and per-segment labeling come from the platform rather than a
              custom state machine.
            </>
          }
        >
          <li>
            <strong>Separate-input model.</strong> N real{" "}
            <code>&lt;input&gt;</code>s, each <code>tabIndex=0</code> and its own{" "}
            <code>role="combobox"</code>; focus is tracked from actual DOM focus
            events, not an <code>active</code> index that hijacks Tab.
          </li>
          <li>
            <strong>Native focus movement.</strong> Tab / Shift+Tab traverse
            segments with the browser's own focus order; commit actions move
            focus programmatically via a per-input <code>ref</code>.
          </li>
          <li>
            <strong>One shared menu, bound to focus.</strong> A single{" "}
            <code>Popover</code> renders the focused segment's list;{" "}
            <code>aria-controls</code> / <code>aria-activedescendant</code> point
            from the focused input to the shared listbox.
          </li>
          <li>
            <strong>Re-edit &amp; clear.</strong> Focusing a committed segment
            prefills + selects its token (typing replaces it); a single × clears
            the whole code; Backspace on an empty segment clears or steps back.
          </li>
          <li>
            <strong>Optional "Create new".</strong> A toggle-gated footer opens a
            dialog to add a cost code / type / phase inline; it prefills from what
            you typed, drops the new value into the segment, then advances focus —
            or drops the field to rest cleanly when it was the last segment (no
            lingering menu or selected-blue flash).
          </li>
          <li>
            <strong>Reused unchanged:</strong> <code>Popover</code>,{" "}
            <code>Icon</code>, <code>Button</code>, <code>FieldLabel</code>, the
            shared <code>bcv1-*</code> styles, and <code>--a2-</code> tokens.
          </li>
        </Customizations>
      </Flex>
    </Card>
    <CreateCostCodeDialog
      open={createOpen}
      onClose={() => setCreateOpen(false)}
      initialCode={createInitialCode}
      existingCodes={[...COST_CODES, ...extraCodes]}
      onCreated={(option) => {
        setExtraCodes((prev) => [...prev, option]);
        pendingCreatedRef.current = option;
        const seg =
          createSegmentRef.current >= 0 ? createSegmentRef.current : 0;
        commitValue(option, seg);
        // Created into the LAST segment: mark it now (before the dialog closes)
        // so the focus-restore bounces straight to rest in onSegFocus — the
        // restore can fire before onClosed, so setting it there is too late.
        if (seg + 1 >= SEGMENT_ORDER.length) restAfterCreateRef.current = true;
      }}
      onClosed={() => {
        createDialogActiveRef.current = false;
        const option = pendingCreatedRef.current;
        pendingCreatedRef.current = null;
        if (!option) {
          // Cancelled — discard the value that was kept underneath.
          setActiveIndex(-1);
          setText("");
          setPrefilled(false);
          setMenuOpen(false);
          return;
        }
        // Value was already written on create (commitValue in onCreated) so it
        // shows instantly; here we only need to place focus after the close.
        const i = createSegmentRef.current >= 0 ? createSegmentRef.current : 0;
        // The Dialog restores focus to its trigger on close, which lands back on
        // the segment we came from — so re-assert focus afterwards.
        const na = i + 1;
        // Anvil restores focus to the trigger inside a rAF (DrillDown
        // restoreFocus) that runs after this onCloseAnimationComplete, so a
        // double-rAF is required to land after it (a single rAF loses the race).
        requestAnimationFrame(() =>
          requestAnimationFrame(() => {
            if (na < SEGMENT_ORDER.length) {
              focusSegment(na); // move on to the next adjacent segment
            } else {
              // Last segment: defensive fallback. The restore normally routes
              // through onSegFocus, which bounces to rest (no menu, no caret, no
              // "selected blue"); blur here too in case it doesn't.
              inputRefs.current[i]?.blur();
              setMenuOpen(false);
            }
          }),
        );
      }}
    />
    <CreateCostTypeDialog
      open={createTypeOpen}
      onClose={() => setCreateTypeOpen(false)}
      initialCode={createInitialCode}
      existingTypes={[...COST_TYPES, ...extraTypes]}
      onCreated={(option) => {
        setExtraTypes((prev) => [...prev, option]);
        pendingCreatedRef.current = option;
        const seg =
          createSegmentRef.current >= 0 ? createSegmentRef.current : 0;
        commitValue(option, seg);
        // Created into the LAST segment: mark it now (before the dialog closes)
        // so the focus-restore bounces straight to rest in onSegFocus — the
        // restore can fire before onClosed, so setting it there is too late.
        if (seg + 1 >= SEGMENT_ORDER.length) restAfterCreateRef.current = true;
      }}
      onClosed={() => {
        createDialogActiveRef.current = false;
        const option = pendingCreatedRef.current;
        pendingCreatedRef.current = null;
        if (!option) {
          // Cancelled — discard the value that was kept underneath.
          setActiveIndex(-1);
          setText("");
          setPrefilled(false);
          setMenuOpen(false);
          return;
        }
        // Value was already written on create (commitValue in onCreated) so it
        // shows instantly; here we only need to place focus after the close.
        const i = createSegmentRef.current >= 0 ? createSegmentRef.current : 0;
        // The Dialog restores focus to its trigger on close, which lands back on
        // the segment we came from — so re-assert focus afterwards.
        const na = i + 1;
        // Anvil restores focus to the trigger inside a rAF (DrillDown
        // restoreFocus) that runs after this onCloseAnimationComplete, so a
        // double-rAF is required to land after it (a single rAF loses the race).
        requestAnimationFrame(() =>
          requestAnimationFrame(() => {
            if (na < SEGMENT_ORDER.length) {
              focusSegment(na); // move on to the next adjacent segment
            } else {
              // Last segment: defensive fallback. The restore normally routes
              // through onSegFocus, which bounces to rest (no menu, no caret, no
              // "selected blue"); blur here too in case it doesn't.
              inputRefs.current[i]?.blur();
              setMenuOpen(false);
            }
          }),
        );
      }}
    />
    <CreatePhaseDialog
      open={createPhaseOpen}
      onClose={() => setCreatePhaseOpen(false)}
      initialCode={createInitialCode}
      existingPhases={[...PHASES, ...extraPhases]}
      onCreated={(option) => {
        setExtraPhases((prev) => [...prev, option]);
        pendingCreatedRef.current = option;
        const seg =
          createSegmentRef.current >= 0 ? createSegmentRef.current : 0;
        commitValue(option, seg);
        // Created into the LAST segment: mark it now (before the dialog closes)
        // so the focus-restore bounces straight to rest in onSegFocus — the
        // restore can fire before onClosed, so setting it there is too late.
        if (seg + 1 >= SEGMENT_ORDER.length) restAfterCreateRef.current = true;
      }}
      onClosed={() => {
        createDialogActiveRef.current = false;
        const option = pendingCreatedRef.current;
        pendingCreatedRef.current = null;
        if (!option) {
          // Cancelled — discard the value that was kept underneath.
          setActiveIndex(-1);
          setText("");
          setPrefilled(false);
          setMenuOpen(false);
          return;
        }
        // Value was already written on create (commitValue in onCreated) so it
        // shows instantly; here we only need to place focus after the close.
        const i = createSegmentRef.current >= 0 ? createSegmentRef.current : 0;
        const na = i + 1;
        // Double rAF: must land after Anvil's rAF-based focus restore (see above).
        requestAnimationFrame(() =>
          requestAnimationFrame(() => {
            if (na < SEGMENT_ORDER.length) {
              focusSegment(na);
            } else {
              // Last segment: defensive fallback. The restore normally routes
              // through onSegFocus, which bounces to rest (no menu, no caret, no
              // "selected blue"); blur here too in case it doesn't.
              inputRefs.current[i]?.blur();
              setMenuOpen(false);
            }
          }),
        );
      }}
    />
    </>
  );
}

// ===========================================================================
// v0 — three SelectFieldSync fields under one label
// ===========================================================================

// Minimum readable width per v0 segment. The field's min-width scales with the
// field count (2 → 240px, 3 → 360px, …) so segments never truncate.
const V0_MIN_PX_PER_FIELD = 120;

function PickerV0({
  size,
  fieldWidth,
  keys,
  allowCreateNew,
}: {
  size: FieldSize;
  fieldWidth: number;
  keys: SegmentKey[];
  allowCreateNew: boolean;
}) {
  // Only the first N segments render (driven by the Field count control);
  // shadows the module SEGMENT_ORDER so the rest of the component is unchanged.
  const SEGMENT_ORDER = keys;

  const [composite, setComposite] = useState<Composite>(() =>
    createDefaultComposite(V0_ITEMS_BY_SEGMENT),
  );
  const [createOpen, setCreateOpen] = useState(false);
  const [createTypeOpen, setCreateTypeOpen] = useState(false);
  const [createPhaseOpen, setCreatePhaseOpen] = useState(false);
  const [createInitialCode, setCreateInitialCode] = useState("");
  const [extraCodes, setExtraCodes] = useState<BudgetOption[]>([]);
  const [extraTypes, setExtraTypes] = useState<BudgetOption[]>([]);
  const [extraPhases, setExtraPhases] = useState<BudgetOption[]>([]);
  const createIndexRef = useRef(0);
  const pendingCreatedRef = useRef<BudgetOption | null>(null);
  const fieldsRef = useRef<HTMLDivElement>(null);
  const labelId = `${useId()}-label`;

  // Latest committed selection + the last value the user typed per field, read
  // by the blur listener below (which runs outside React's render cycle).
  const compositeRef = useRef(composite);
  compositeRef.current = composite;
  const lastTypedRef = useRef<Record<number, string>>({});
  // Current segment keys, read inside the [] -deps listener effect below so a
  // Field-count change doesn't leave it operating on stale keys.
  const keysRef = useRef(SEGMENT_ORDER);
  keysRef.current = SEGMENT_ORDER;

  const setSegment = (segment: SegmentKey, option: SelectFieldOption | null) =>
    setComposite((prev) => ({ ...prev, [segment]: option as BudgetOption | null }));

  // On selecting a value, auto-advance to the next field (focus + open it).
  const selectAndAdvance = (index: number, option: SelectFieldOption | null) => {
    setSegment(SEGMENT_ORDER[index], option);
    // A real selection supersedes any stale "typed empty" so blur won't clear it.
    delete lastTypedRef.current[index];
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

  // SelectFieldSync is controlled by `value` and reverts the input text to the
  // selected option on blur — so clearing a field's text via keyboard and
  // tabbing away would restore the old value. Track the user's last typed value
  // per field and, on blur, clear the segment when it was emptied.
  useEffect(() => {
    const root = fieldsRef.current;
    if (!root) return;
    const indexOf = (target: EventTarget | null) => {
      const inputs = Array.from(
        root.querySelectorAll<HTMLInputElement>(".bcv0-field input"),
      );
      return inputs.indexOf(target as HTMLInputElement);
    };
    const onInput = (e: Event) => {
      const i = indexOf(e.target);
      if (i >= 0) lastTypedRef.current[i] = (e.target as HTMLInputElement).value;
    };
    const onFocusOut = (e: Event) => {
      const i = indexOf(e.target);
      if (i < 0) return;
      const key = keysRef.current[i];
      if (key && lastTypedRef.current[i] === "" && compositeRef.current[key]) {
        setComposite((prev) => ({ ...prev, [key]: null }));
      }
      delete lastTypedRef.current[i];
    };
    // Opening an empty field highlights its first option (Anvil doesn't do this
    // on open). A synthetic ArrowDown drives downshift's highlight so the top
    // item ("01-200") is active and gets accepted on Tab / "." below.
    const highlightFirst = (input: HTMLInputElement, i: number) => {
      window.setTimeout(() => {
        if (document.activeElement !== input) return;
        if (input.getAttribute("aria-activedescendant")) return; // already highlighted
        if ((lastTypedRef.current[i] ?? "") !== "") return; // user typed → let match win
        input.dispatchEvent(
          new KeyboardEvent("keydown", {
            key: "ArrowDown",
            bubbles: true,
            cancelable: true,
          }),
        );
      }, 80);
    };
    const onFocusIn = (e: Event) => {
      const i = indexOf(e.target);
      if (i < 0) return;
      const input = e.target as HTMLInputElement;
      const key = keysRef.current[i];
      if (key && compositeRef.current[key]) {
        // Filled segment: select its code so typing immediately replaces it
        // (fast re-search). Deferred so Anvil's focus→open-menu doesn't clobber
        // the selection. Non-destructive — tab/click away keeps the value.
        window.setTimeout(() => {
          if (document.activeElement === input && input.value) input.select();
        }, 0);
        return;
      }
      highlightFirst(input, i);
    };

    // Typing "." or pressing Tab commits the highlighted option and advances.
    // "." also falls back to the top filtered option / focus move; Tab only
    // accepts when the segment has no committed value yet (so tabbing through a
    // set field doesn't overwrite it).
    const onKeyDown = (e: Event) => {
      const ke = e as unknown as globalThis.KeyboardEvent;
      const i = indexOf(e.target);
      if (i < 0) return;
      const key = keysRef.current[i];
      const input = e.target as HTMLInputElement;
      const activeId = input.getAttribute("aria-activedescendant");
      const activeOption = activeId ? document.getElementById(activeId) : null;

      if (ke.key === ".") {
        ke.preventDefault();
        let option: HTMLElement | null = activeOption;
        if (!option && (lastTypedRef.current[i] ?? "").trim()) {
          option = document.querySelector<HTMLElement>(
            '[class*="options-popover"] [role="option"]',
          );
        }
        if (option) {
          option.click(); // selects → selectAndAdvance moves focus
          return;
        }
        const inputs = Array.from(
          root.querySelectorAll<HTMLInputElement>(".bcv0-field input"),
        );
        const next = inputs[i + 1];
        next?.focus();
        next?.click();
        return;
      }

      if (ke.key === "Tab" && !ke.shiftKey && activeOption && !compositeRef.current[key]) {
        // Accept the highlighted option (Tab's own focus move is superseded by
        // selectAndAdvance focusing the next field).
        ke.preventDefault();
        activeOption.click();
      }
    };
    root.addEventListener("input", onInput, true);
    root.addEventListener("focusout", onFocusOut, true);
    root.addEventListener("focusin", onFocusIn, true);
    root.addEventListener("keydown", onKeyDown, true);
    return () => {
      root.removeEventListener("input", onInput, true);
      root.removeEventListener("focusout", onFocusOut, true);
      root.removeEventListener("focusin", onFocusIn, true);
      root.removeEventListener("keydown", onKeyDown, true);
    };
  }, []);

  // Like v1: only expose the assembled code once all segments are set.
  const v0Assembled = SEGMENT_ORDER.every((key) => composite[key])
    ? SEGMENT_ORDER.map((key) => composite[key]!.token).join(V1_SEP)
    : "";
  const v0AssembledReadable = SEGMENT_ORDER.every((key) => composite[key])
    ? SEGMENT_ORDER.map((key) => secondaryOf(composite[key]!)).join(V1_SEP)
    : "";

  return (
    <>
    <Card
      padding="large"
      style={{
        width: "100%",
        height: "100%",
        // Red ring marking v0 as a rejected direction.
        outline: "2px solid var(--a2-foreground-color-critical, #d92d20)",
        outlineOffset: "0px",
      }}
    >
      <Flex direction="column" gap="4">
        <Flex direction="column" gap="1">
          <Flex justifyContent="space-between" alignItems="center" gap="2">
            <Text variant="eyebrow" size="small">
              v0 · SelectFields, one label
            </Text>
            <button
              type="button"
              className="bcv2-pick"
              aria-label="Rejected direction"
              title="Rejected direction"
            >
              <Icon
                svg={CloseIcon}
                size="small"
                color="var(--a2-foreground-color-critical, #d92d20)"
              />
            </button>
          </Flex>
          <Text variant="body" size="small" subdued>
            One "Budget Code" label; N Anvil <code>SelectField</code>s (set by the
            Field count control) separated by periods, each showing only the code
            and pinning this project's items.
          </Text>
        </Flex>

        {/* One "Budget Code" label; three fields separated by periods, no
            chevron (per Figma). Per-field labels are hidden; the field shows
            only the code and the dropdown row shows code + description. */}
        <Flex direction="column" gap="1">
          <FieldLabel id={labelId}>Budget Code</FieldLabel>
          {/* Group the three fields under the shared "Budget Code" label; each
              field keeps its own distinct label (Cost Code / Cost Type / Phase)
              so screen readers announce e.g. "Budget Code group, Cost Code". */}
          <div
            ref={fieldsRef}
            className="bcv0-fields"
            role="group"
            aria-labelledby={labelId}
            style={{
              width: fieldWidth,
              // Floor the width so segments stay readable and never truncate
              // (per Nick's feedback): 120px per field → 240px for 2, 360px for 3.
              minWidth: V0_MIN_PX_PER_FIELD * SEGMENT_ORDER.length,
              maxWidth: "100%",
              // 1fr per field, `auto` for each "." separator between them.
              gridTemplateColumns: SEGMENT_ORDER.map(() => "1fr").join(" auto "),
            }}
          >
            {SEGMENT_ORDER.map((key, i) => {
              const extraV0 =
                key === "cost-code"
                  ? extraCodes.map(toV0Option)
                  : key === "cost-type"
                    ? extraTypes.map(toV0Option)
                    : extraPhases.map(toV0Option);
              const projectItems = [
                ...v0ProjectItemsFor(key),
                ...extraV0.filter((o) => o.extra.onProject),
              ];
              const moreItems = [
                ...v0MoreItemsFor(key),
                ...extraV0.filter((o) => !o.extra.onProject),
              ];
              const plural = `${SEGMENTS[key].label}s`;
              return (
                <Fragment key={key}>
                  {i > 0 && (
                    <span className="bcv0-sep" aria-hidden="true">
                      .
                    </span>
                  )}
                  <div
                    className={`bcv0-field${composite[key] ? " bcv0-field--filled" : ""}`}
                  >
                    {/* Custom placeholder overlay: a native <input> can't
                        ellipsize its placeholder when focused (only when
                        blurred), so the text would flip between "Cost Co…" and
                        "Cost Code". This span ellipsizes the same in both states.
                        Shown only while the input shows its (transparent) native
                        placeholder, via :has(input:placeholder-shown). */}
                    <span
                      className="bcv0-ph"
                      aria-hidden="true"
                      style={{ fontSize: size === "small" ? 14 : 16 }}
                    >
                      {SEGMENTS[key].label}
                    </span>
                    <SelectFieldSync
                      label={SEGMENTS[key].label}
                      hideLabel
                      size={size}
                      placeholder={SEGMENTS[key].label}
                      // "This project" items are pinned under their own section
                      // label; the rest sit under a "More …" group header (no
                      // per-row chip).
                      options={moreItems}
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
                      // Stock Anvil "add new item" footer button (like v1),
                      // gated by the Create-new harness toggle.
                      {...(allowCreateNew
                        ? {
                            addItemLabel: `Create new ${SEGMENTS[key].label.toLowerCase()}`,
                            onAddNewItem: () => {
                              createIndexRef.current = i;
                              const typed = (lastTypedRef.current[i] ?? "").trim();
                              const existing =
                                key === "cost-code"
                                  ? [...COST_CODES, ...extraCodes]
                                  : key === "cost-type"
                                    ? [...COST_TYPES, ...extraTypes]
                                    : [...PHASES, ...extraPhases];
                              // Seed only a genuinely new string (not an existing item).
                              const isNew =
                                typed !== "" &&
                                !existing.some(
                                  (o) =>
                                    o.token.toLowerCase() === typed.toLowerCase(),
                                );
                              setCreateInitialCode(isNew ? typed : "");
                              if (key === "cost-code") setCreateOpen(true);
                              else if (key === "cost-type") setCreateTypeOpen(true);
                              else setCreatePhaseOpen(true);
                            },
                          }
                        : {})}
                    />
                  </div>
                </Fragment>
              );
            })}
          </div>
        </Flex>

        <AssembledReadout value={v0Assembled} subtext={v0AssembledReadable} />

        <EvalSection title="Pros">
          <li>
            <strong>The conservative choice.</strong> Stock <code>SelectField</code>{" "}
            with lighter overrides and DS precedent — the low-customization option,
            and off the deprecated <code>Combobox</code> cliff (removed in Anvil2
            5.0) that production uses today.
          </li>
          <li>
            <strong>A11y &amp; behavior for free.</strong> Keyboard, screen-reader
            semantics, selected states, and search come from Anvil; much of the
            design is met with supported props (<code>pinned</code>,{" "}
            <code>groupToString</code>, <code>onAddNewItem</code>).
          </li>
          <li>
            <strong>Separate segments = natural affordances.</strong> Auto-advance
            and highlight-on-partial-match come easily since fields are already
            distinct; each is a familiar combobox.
          </li>
          <li>
            <strong>Per-segment clear is possible</strong> (though rarely used, so
            the × is hidden at narrow widths and delete-to-clear covers it).
          </li>
        </EvalSection>

        <EvalSection title="Cons">
          <li>
            <strong>Wider footprint.</strong> N separate fields take more
            horizontal space and get tight in dense tables — the main strike vs. a
            single combined field.
          </li>
          <li>
            <strong>Per-segment popovers.</strong> Each field has its own menu, so
            width/alignment need overrides — no single shared dropdown like v1.
          </li>
          <li>
            <strong>Brittle internal overrides.</strong> Hitting the design needs{" "}
            <code>!important</code> hacks on compiled class names (inline option
            layout, selected color, chevron hide) that can break on an Anvil
            restyle; narrow-width handling (input shrink, hide-× query, placeholder
            overlay) is manual.
          </li>
          <li>
            <strong>Behaviors bolted on.</strong> Highlight-on-open, Tab-accept,
            "."-advance, clear-on-empty, and select-all-on-focus live outside Anvil
            in extra listeners.
          </li>
          <li>
            <strong>Superseded by v2.</strong> The combined field reads as one
            identifier and stays compact in dense tables; N separate stock fields
            lost on footprint and cross-segment consistency despite the lighter
            overrides. (Its one edge — "Create new" for free via{" "}
            <code>onAddNewItem</code> — v2 reproduces with a small custom footer.)
          </li>
        </EvalSection>

        <Customizations
          lead={
            <>
              Stays on stock <code>SelectFieldSync</code>, pushing only as far as
              its API and CSS allow — a gauge of how much design intent the shipped
              component can meet, and which gaps are really Anvil feature requests.
              Grouped: supported-API usage first, then overrides that reach past
              the public surface.
            </>
          }
        >
            <li>
              <strong>Composition:</strong> N stock <code>SelectFieldSync</code>{" "}
              fields (2–3, via the Field count control; native menu, selected
              states, add-new, search, <code>size</code>), one shared{" "}
              <code>FieldLabel</code> + <code>hideLabel</code>, in a CSS grid so
              fields stay equal width when the clear × appears.
            </li>
            <li>
              <strong>Supported API:</strong> <code>label</code> = code,{" "}
              <code>content</code> = code + description, <code>searchText</code> for
              search; <code>pinned</code> ("This project", search-reactive) +{" "}
              <code>groupToString</code> ("More …"); <code>onAddNewItem</code> /{" "}
              <code>addItemLabel</code> footer.
            </li>
            <li>
              <strong>A11y:</strong> each field keeps a distinct label (Cost Code
              / Cost Type / Phase) via <code>label</code> + <code>hideLabel</code>,
              wrapped in a <code>role="group"</code> tied to the shared "Budget
              Code" label — so a screen reader announces the group context plus
              each segment. (Reviewer: fine as long as each gets a distinct label.)
            </li>
            <li>
              <strong>Override (public-ish):</strong> hide the chevron via{" "}
              <code>[aria-label="toggle menu"]</code>; fix all menus to{" "}
              <code>width: 300px</code> and cap the scroller (~6 rows) instead of
              Anvil's per-trigger sizing.
            </li>
            <li>
              <strong>Override (brittle — internals):</strong> flip stacked option
              content to a row with <code>!important</code> + 1-line clamp, and blue
              the selected <em>description</em> too. Targets compiled classes (
              <code>[class*="title"]</code>) and breaks on an Anvil restyle — a
              signal the inline layout / selected-state should be supported.
            </li>
            <li>
              <strong>Override (narrow widths):</strong> shrink the input below
              Anvil's ~100px min-width; a container query hides the clear × once a
              segment is narrow and reclaims its reserved right padding; the
              placeholder is a custom overlay (<code>:has(:placeholder-shown)</code>)
              that ellipsizes consistently whether focused or blurred.
            </li>
            <li>
              <strong>Custom behavior:</strong> opening an empty field highlights
              its first option (Anvil doesn't), and Tab accepts the highlight;
              auto-advance to the next field on selection; typing "." commits the
              top match and advances; focusing a filled segment selects its code
              (fast re-search); clear the segment when its text is emptied and
              blurred (stock <code>SelectFieldSync</code> otherwise restores the
              old value on blur).
            </li>
            <li>
              <strong>Style:</strong> "." separators use the heavier display face
              (Sofia Pro Bold) per Figma.
            </li>
        </Customizations>
      </Flex>
    </Card>
    <CreateCostCodeDialog
      open={createOpen}
      onClose={() => setCreateOpen(false)}
      initialCode={createInitialCode}
      existingCodes={[...COST_CODES, ...extraCodes]}
      onCreated={(option) => {
        setExtraCodes((prev) => [...prev, option]);
        pendingCreatedRef.current = option;
      }}
      onClosed={() => {
        const option = pendingCreatedRef.current;
        pendingCreatedRef.current = null;
        if (!option) return;
        const idx = createIndexRef.current;
        selectAndAdvance(idx, toV0Option(option));
        // Deterministic: run after Anvil's rAF-based focus restore (DrillDown
        // restoreFocus) via a double-rAF — no magic timeout.
        requestAnimationFrame(() =>
          requestAnimationFrame(() => {
            const inputs =
              fieldsRef.current?.querySelectorAll<HTMLInputElement>(
                ".bcv0-field input",
              );
            if (idx < SEGMENT_ORDER.length - 1) {
              const next = inputs?.[idx + 1];
              next?.focus();
              next?.click(); // open the next field's menu
            } else {
              // Rightmost field: focus it (highlighted), no menu.
              inputs?.[idx]?.focus();
            }
          }),
        );
      }}
    />
    <CreateCostTypeDialog
      open={createTypeOpen}
      onClose={() => setCreateTypeOpen(false)}
      initialCode={createInitialCode}
      existingTypes={[...COST_TYPES, ...extraTypes]}
      onCreated={(option) => {
        setExtraTypes((prev) => [...prev, option]);
        pendingCreatedRef.current = option;
      }}
      onClosed={() => {
        const option = pendingCreatedRef.current;
        pendingCreatedRef.current = null;
        if (!option) return;
        const idx = createIndexRef.current;
        selectAndAdvance(idx, toV0Option(option));
        // Deterministic: run after Anvil's rAF-based focus restore (DrillDown
        // restoreFocus) via a double-rAF — no magic timeout.
        requestAnimationFrame(() =>
          requestAnimationFrame(() => {
            const inputs =
              fieldsRef.current?.querySelectorAll<HTMLInputElement>(
                ".bcv0-field input",
              );
            if (idx < SEGMENT_ORDER.length - 1) {
              const next = inputs?.[idx + 1];
              next?.focus();
              next?.click(); // open the next field's menu
            } else {
              // Rightmost field: focus it (highlighted), no menu.
              inputs?.[idx]?.focus();
            }
          }),
        );
      }}
    />
    <CreatePhaseDialog
      open={createPhaseOpen}
      onClose={() => setCreatePhaseOpen(false)}
      initialCode={createInitialCode}
      existingPhases={[...PHASES, ...extraPhases]}
      onCreated={(option) => {
        setExtraPhases((prev) => [...prev, option]);
        pendingCreatedRef.current = option;
      }}
      onClosed={() => {
        const option = pendingCreatedRef.current;
        pendingCreatedRef.current = null;
        if (!option) return;
        const idx = createIndexRef.current;
        selectAndAdvance(idx, toV0Option(option));
        // Deterministic: run after Anvil's rAF-based focus restore (DrillDown).
        requestAnimationFrame(() =>
          requestAnimationFrame(() => {
            const inputs =
              fieldsRef.current?.querySelectorAll<HTMLInputElement>(
                ".bcv0-field input",
              );
            if (idx < SEGMENT_ORDER.length - 1) {
              const next = inputs?.[idx + 1];
              next?.focus();
              next?.click();
            } else {
              inputs?.[idx]?.focus();
            }
          }),
        );
      }}
    />
    </>
  );
}

// ===========================================================================

const FIELD_WIDTH_MIN = 200;
const FIELD_WIDTH_MAX = 560;
const FIELD_WIDTH_DEFAULT = 460;
// Fraction along the track where the default sits (for the tick indicator).
const FIELD_WIDTH_DEFAULT_PCT =
  (FIELD_WIDTH_DEFAULT - FIELD_WIDTH_MIN) / (FIELD_WIDTH_MAX - FIELD_WIDTH_MIN);

export default function BudgetCodePicker() {
  const [size, setSize] = useState<FieldSize>("medium");
  // Constrains just the picker field container (not the whole card), so you can
  // preview how each picker reflows as its available width shrinks.
  const [fieldWidth, setFieldWidth] = useState(FIELD_WIDTH_DEFAULT);
  // How many segments the picker exposes (production budget codes are N-segment).
  const [fieldCount, setFieldCount] = useState(2);
  // Whether the inline "Create new <segment>" affordance is offered. Off by
  // default (system segments usually can't be created ad-hoc).
  const [allowCreateNew, setAllowCreateNew] = useState(false);
  const keys = SEGMENT_ORDER.slice(0, fieldCount);

  return (
    <Flex
      justifyContent="center"
      style={{
        padding: "var(--a2-size-8, 32px)",
        background: "var(--a2-background-color-secondary, #f5f6f7)",
        minHeight: "100vh",
        boxSizing: "border-box",
        // The card row bleeds to the right window edge; clip the few px of
        // page-level overflow that `50vw` (scrollbar-inclusive) adds so the page
        // never scrolls horizontally (which would clip the title on the left).
        overflowX: "clip",
      }}
    >
      <Flex direction="column" gap="4" style={{ width: "100%", maxWidth: 1080 }}>
        <Flex
          justifyContent="space-between"
          alignItems="center"
          gap="4"
          wrap="wrap"
        >
          <Text variant="headline" el="h1" size="medium">
            Budget Code Picker
          </Text>
          <div className="bc-controls">
            {/* Field count: how many segments the picker renders (2 or 3). */}
            <div className="bc-control">
              <span className="bc-control-label">Field count</span>
              <SegmentedControl
                size="small"
                selected={String(fieldCount)}
                onChange={(value) => setFieldCount(Number(value))}
              >
                <SegmentedControl.Segment value="2">2</SegmentedControl.Segment>
                <SegmentedControl.Segment value="3">3</SegmentedControl.Segment>
              </SegmentedControl>
            </div>

            {/* Field-width slider: shrinks the picker container in both cards. */}
            <label className="bc-control">
              <span className="bc-control-label">Field width</span>
              <span className="bc-width-track">
                {/* Drawn track + default marker sit below the native thumb, so
                    the thumb (dot) covers the marker when at the default. */}
                <span className="bc-width-trackline" aria-hidden="true" />
                <span
                  className="bc-width-default"
                  style={{
                    left: `calc(8px + ${FIELD_WIDTH_DEFAULT_PCT} * (100% - 16px))`,
                  }}
                  aria-hidden="true"
                />
                <input
                  type="range"
                  className="bc-width-slider"
                  min={FIELD_WIDTH_MIN}
                  max={FIELD_WIDTH_MAX}
                  step={10}
                  value={fieldWidth}
                  onChange={(e) => setFieldWidth(Number(e.target.value))}
                  aria-label="Picker field width"
                />
              </span>
              <span className="bc-width-value">{fieldWidth}px</span>
            </label>

            <div className="bc-control">
              <span className="bc-control-label">Field size</span>
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

            {/* Create new: offer the inline "Create new <segment>" affordance. */}
            <div className="bc-control">
              <span className="bc-control-label">Create new</span>
              <SegmentedControl
                size="small"
                selected={allowCreateNew ? "yes" : "no"}
                onChange={(value) => setAllowCreateNew(value === "yes")}
              >
                <SegmentedControl.Segment value="yes">
                  Yes
                </SegmentedControl.Segment>
                <SegmentedControl.Segment value="no">
                  No
                </SegmentedControl.Segment>
              </SegmentedControl>
            </div>
          </div>
        </Flex>

        {/* All three options in one horizontally-scrolling row: v2 (chosen,
            green) first, then v1 and v0 (rejected, red). v0 sits partially
            off-screen to invite horizontal scrolling. The width slider above
            constrains just the field inside each card. */}
        <div
          style={{
            display: "flex",
            gap: "var(--a2-size-6, 24px)",
            overflowX: "auto",
            // Vertical room so the 2px card outlines aren't clipped. The left
            // inset exactly cancels the negative left margin below, so at rest the
            // first card lines up with the centered content column (the title) at
            // ANY width — yet the inset scrolls away, letting cards reach the left
            // window edge.
            padding: "var(--a2-size-1, 4px)",
            paddingLeft: "calc(50vw - 50%)",
            // Trailing breathing room after the rightmost card at scroll end.
            paddingRight: "var(--a2-size-6, 24px)",
            alignItems: "stretch",
            // Full-bleed to both window edges (breaking out of the centered
            // max-width column) so cards scroll edge-to-edge: v0 hangs off the
            // right, and scrolling carries cards all the way to the left edge.
            marginLeft: "calc(50% - 50vw)",
            marginRight: "calc(50% - 50vw)",
          }}
        >
          <div style={{ flex: "0 0 480px", maxWidth: "480px" }}>
            <PickerV2
              size={size}
              fieldWidth={fieldWidth}
              keys={keys}
              allowCreateNew={allowCreateNew}
            />
          </div>
          <div style={{ flex: "0 0 480px", maxWidth: "480px" }}>
            <PickerV1
              size={size}
              fieldWidth={fieldWidth}
              keys={keys}
              allowCreateNew={allowCreateNew}
            />
          </div>
          <div style={{ flex: "0 0 480px", maxWidth: "480px" }}>
            <PickerV0
              size={size}
              fieldWidth={fieldWidth}
              keys={keys}
              allowCreateNew={allowCreateNew}
            />
          </div>
        </div>
      </Flex>
    </Flex>
  );
}
