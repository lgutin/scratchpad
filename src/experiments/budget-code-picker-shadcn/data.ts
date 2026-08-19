// ---------------------------------------------------------------------------
// Budget code domain model (shadcn exploration for JPM-14945 / JPM-13707)
//
// A budget code is the composite of exactly one item per configured segment,
// joined with periods, e.g. `23-800.L.Phase 1`. The set + order of segments is
// tenant-configured ("structure"), so everything here is generic over N
// segments in an arbitrary order.
// ---------------------------------------------------------------------------

export type SegmentKey = "cost-code" | "cost-type" | "phase" | "department";

export interface SegmentMeta {
  key: SegmentKey;
  label: string;
  /** Placeholder verb, e.g. "cost code". */
  noun: string;
  system: boolean;
  /** Long lists need a search field; short lists can be simple pick lists. */
  searchable: boolean;
  /** Accent color for the segment chip (used only inside the shadcn scope). */
  accent: string;
}

export const SEGMENTS: Record<SegmentKey, SegmentMeta> = {
  "cost-code": {
    key: "cost-code",
    label: "Cost Code",
    noun: "cost code",
    system: true,
    searchable: true,
    accent: "#2563eb",
  },
  "cost-type": {
    key: "cost-type",
    label: "Cost Type",
    noun: "cost type",
    system: true,
    searchable: false,
    accent: "#059669",
  },
  phase: {
    key: "phase",
    label: "Phase",
    noun: "phase",
    system: false,
    searchable: false,
    accent: "#7c3aed",
  },
  department: {
    key: "department",
    label: "Department",
    noun: "department",
    system: false,
    searchable: false,
    accent: "#d97706",
  },
};

/**
 * The tenant-configured structure. Default exploration uses three segments, but
 * every component renders whatever this array contains (see the "Add Department"
 * toggle in the demos to see it scale to four).
 */
export const DEFAULT_STRUCTURE: SegmentKey[] = [
  "cost-code",
  "cost-type",
  "phase",
];

export interface SegmentItem {
  id: string;
  segment: SegmentKey;
  /** Compact token used in the assembled code, e.g. "23-800", "L", "Phase 1". */
  token: string;
  /** Primary label shown in lists, e.g. "23-800". */
  label: string;
  /** Human description, e.g. "HVAC Installation". */
  description?: string;
  /** Belongs to the current project (JPM-13707: surface these first). */
  onProject?: boolean;
}

function cc(
  code: string,
  description: string,
  onProject = false
): SegmentItem {
  return {
    id: `cc-${code}`,
    segment: "cost-code",
    token: code,
    label: code,
    description,
    onProject,
  };
}

// ~40 realistic construction cost codes (consistent NN-NNN format).
const COST_CODES: SegmentItem[] = [
  cc("01-100", "General Requirements"),
  cc("01-200", "Project Management", true),
  cc("01-500", "Temporary Facilities", true),
  cc("02-100", "Site Demolition"),
  cc("02-200", "Site Preparation"),
  cc("02-300", "Earthwork & Grading", true),
  cc("03-100", "Concrete Formwork"),
  cc("03-200", "Concrete Reinforcement"),
  cc("03-300", "Cast-in-Place Concrete", true),
  cc("04-100", "Masonry Mortar"),
  cc("04-200", "Unit Masonry"),
  cc("05-100", "Structural Steel"),
  cc("05-500", "Metal Fabrications"),
  cc("06-100", "Rough Carpentry", true),
  cc("06-200", "Finish Carpentry"),
  cc("07-100", "Waterproofing"),
  cc("07-200", "Building Insulation"),
  cc("07-500", "Membrane Roofing"),
  cc("08-100", "Metal Doors & Frames"),
  cc("08-500", "Windows"),
  cc("09-200", "Plaster & Gypsum Board"),
  cc("09-300", "Tiling"),
  cc("09-500", "Acoustic Ceilings"),
  cc("09-650", "Resilient Flooring"),
  cc("09-900", "Painting & Coating"),
  cc("10-100", "Signage"),
  cc("11-400", "Food Service Equipment"),
  cc("12-300", "Casework"),
  cc("21-100", "Fire Suppression"),
  cc("22-100", "Plumbing Piping", true),
  cc("22-400", "Plumbing Fixtures"),
  cc("23-100", "HVAC Ductwork", true),
  cc("23-500", "Heating Equipment"),
  cc("23-700", "Air Handling Units", true),
  cc("23-800", "HVAC Installation", true),
  cc("26-100", "Electrical Service"),
  cc("26-500", "Lighting"),
  cc("27-100", "Data Cabling"),
  cc("28-100", "Fire Alarm"),
  cc("31-200", "Earth Moving"),
  cc("32-100", "Paving"),
  cc("33-100", "Site Utilities"),
];

const COST_TYPES: SegmentItem[] = (
  [
    ["Labor", "L", true],
    ["Material", "M", true],
    ["Equipment", "E", true],
    ["Subcontract", "S", true],
    ["Overhead", "OH", false],
    ["Permits", "P", false],
    ["Rentals", "R", false],
    ["Freight", "F", false],
    ["Warranty", "W", false],
    ["Other", "O", false],
  ] as const
).map(([label, token, onProject]) => ({
  id: `ct-${token}`,
  segment: "cost-type" as const,
  token,
  label,
  description: `Cost type · ${token}`,
  onProject,
}));

const PHASES: SegmentItem[] = [
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
  segment: "phase" as const,
  token: `Phase ${i + 1}`,
  label: `Phase ${i + 1}`,
  description: name,
  onProject: i < 3,
}));

const DEPARTMENTS: SegmentItem[] = (
  [
    ["Field Operations", "FO", true],
    ["Service", "SVC", true],
    ["Install", "INS", true],
    ["Fabrication", "FAB", false],
    ["Warehouse", "WHS", false],
    ["Fleet", "FLT", false],
    ["Sales", "SAL", false],
    ["Engineering", "ENG", false],
    ["Safety", "SAF", false],
    ["Administration", "ADM", false],
  ] as const
).map(([label, token, onProject]) => ({
  id: `dp-${token}`,
  segment: "department" as const,
  token,
  label,
  description: `Department · ${token}`,
  onProject,
}));

export const ITEMS_BY_SEGMENT: Record<SegmentKey, SegmentItem[]> = {
  "cost-code": COST_CODES,
  "cost-type": COST_TYPES,
  phase: PHASES,
  department: DEPARTMENTS,
};

export const projectItemsFor = (segment: SegmentKey): SegmentItem[] =>
  ITEMS_BY_SEGMENT[segment].filter((i) => i.onProject);

export const globalItemsFor = (segment: SegmentKey): SegmentItem[] =>
  ITEMS_BY_SEGMENT[segment].filter((i) => !i.onProject);

// ---------------------------------------------------------------------------
// Composite helpers
// ---------------------------------------------------------------------------

export type Composite = Partial<Record<SegmentKey, SegmentItem>>;

export const assembledCode = (
  composite: Composite,
  structure: SegmentKey[]
): string =>
  structure
    .map((key) => composite[key]?.token)
    .filter(Boolean)
    .join(".");

export const isComplete = (
  composite: Composite,
  structure: SegmentKey[]
): boolean => structure.every((key) => Boolean(composite[key]));

export const firstEmptySegment = (
  composite: Composite,
  structure: SegmentKey[]
): SegmentKey | undefined => structure.find((key) => !composite[key]);

/** Build a composite from an ordered list of item ids (used by recents/templates). */
export const compositeFromIds = (ids: string[]): Composite => {
  const out: Composite = {};
  for (const id of ids) {
    for (const seg of Object.keys(ITEMS_BY_SEGMENT) as SegmentKey[]) {
      const found = ITEMS_BY_SEGMENT[seg].find((i) => i.id === id);
      if (found) out[seg] = found;
    }
  }
  return out;
};

export interface SavedCode {
  id: string;
  name: string;
  ids: string[];
  /** For recents: how it was last used. */
  usedBy?: string;
}

// Recently used on this project (most-recent first).
export const RECENTS: SavedCode[] = [
  { id: "r1", name: "HVAC install labor", ids: ["cc-23-800", "ct-L", "ph-3"], usedBy: "You · 2h ago" },
  { id: "r2", name: "Ductwork material", ids: ["cc-23-100", "ct-M", "ph-3"], usedBy: "You · yesterday" },
  { id: "r3", name: "Rough carpentry labor", ids: ["cc-06-100", "ct-L", "ph-2"], usedBy: "M. Chen · yesterday" },
  { id: "r4", name: "Plumbing sub", ids: ["cc-22-100", "ct-S", "ph-3"], usedBy: "You · Mon" },
];

// Saved templates for this project.
export const TEMPLATES: SavedCode[] = [
  { id: "t1", name: "Standard HVAC labor", ids: ["cc-23-800", "ct-L", "ph-3"] },
  { id: "t2", name: "PM overhead", ids: ["cc-01-200", "ct-OH", "ph-1"] },
  { id: "t3", name: "Site earthwork equipment", ids: ["cc-02-300", "ct-E", "ph-1"] },
];
