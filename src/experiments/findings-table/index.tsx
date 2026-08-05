import { Card, Flex, Text, Chip, Link, Icon, Button, SearchField } from "@servicetitan/anvil2";
import {
  DataTable,
  createColumnHelper,
  chipsFormatter,
  dateFormatter,
  type TableRow,
} from "@servicetitan/anvil2/beta";
import IconAdd from "@servicetitan/anvil2/assets/icons/material/round/add.svg";
import IconViewColumn from "@servicetitan/anvil2/assets/icons/material/round/view_column.svg";
import IconMoreVert from "@servicetitan/anvil2/assets/icons/material/round/more_vert.svg";
import IconFlag from "@servicetitan/anvil2/assets/icons/material/round/flag.svg";
import IconKeyboardArrowDown from "@servicetitan/anvil2/assets/icons/material/round/keyboard_arrow_down.svg";

export const meta = {
  title: "Findings Card",
  path: "/findings-table",
  date: "2026-07-13",
  description: "Data table on jobs",
};

type Status =
  | "Estimate Accepted"
  | "Job Booked"
  | "New"
  | "Estimate Created";

type Urgency = "Critical" | "High" | "Medium" | "Low";

type Finding = {
  id: string;
  name: string;
  equipment: string;
  sourceJob: string;
  status: Status;
  urgency: Urgency;
  createdBy: string;
  createdOn: string;
};

const statusColor: Record<Status, string> = {
  "Estimate Accepted": "#2f80ed",
  "Job Booked": "#00875a",
  New: "#de9500",
  "Estimate Created": "#de9500",
};

const urgencyColor: Record<Urgency, string> = {
  Critical: "#d32f2f",
  High: "#d32f2f",
  Medium: "#f0a202",
  Low: "#f5c518",
};

const data: TableRow<Finding>[] = [
  {
    id: "1",
    name: "Condenser Coil Fouling",
    equipment: "—",
    sourceJob: "This job",
    status: "Estimate Accepted",
    urgency: "Critical",
    createdBy: "Ashleen Tech",
    createdOn: "2026-04-16",
  },
  {
    id: "2",
    name: "Refrigerant Leak Detected",
    equipment: "Carrier 24k BTU Air Conditioner",
    sourceJob: "This job",
    status: "Job Booked",
    urgency: "High",
    createdBy: "Ashleen Tech",
    createdOn: "2026-04-15",
  },
  {
    id: "3",
    name: "Blower Motor Bearing Wear",
    equipment: "Carrier 24k BTU Air Conditioner",
    sourceJob: "This job",
    status: "New",
    urgency: "Medium",
    createdBy: "Marcus Tech",
    createdOn: "2026-04-15",
  },
  {
    id: "4",
    name: "Blower Motor Bearing Wear",
    equipment: "Carrier 24k BTU Air Conditioner",
    sourceJob: "This job",
    status: "New",
    urgency: "Medium",
    createdBy: "Marcus Tech",
    createdOn: "2026-04-15",
  },
  {
    id: "5",
    name: "Blower Motor Bearing Wear",
    equipment: "Carrier 24k BTU Air Conditioner",
    sourceJob: "This job",
    status: "New",
    urgency: "Medium",
    createdBy: "Marcus Tech",
    createdOn: "2026-04-15",
  },
  {
    id: "6",
    name: "Cracked Heat Exchanger",
    equipment: "Carrier 24k BTU Air Conditioner",
    sourceJob: "This job",
    status: "Estimate Created",
    urgency: "Low",
    createdBy: "Marcus Tech",
    createdOn: "2026-04-15",
  },
  {
    id: "7",
    name: "Clogged Drain Line",
    equipment: "Carrier 24k BTU Air Conditioner",
    sourceJob: "#345678",
    status: "New",
    urgency: "Low",
    createdBy: "Ashleen Tech",
    createdOn: "2026-04-15",
  },
  {
    id: "8",
    name: "Compressor Short Cycling",
    equipment: "Carrier 24k BTU Air Conditioner",
    sourceJob: "#345912",
    status: "New",
    urgency: "Low",
    createdBy: "Ashleen Tech",
    createdOn: "2026-04-15",
  },
  {
    id: "9",
    name: "Compressor Short Cycling",
    equipment: "Carrier 24k BTU Air Conditioner",
    sourceJob: "#345912",
    status: "New",
    urgency: "Low",
    createdBy: "Ashleen Tech",
    createdOn: "2026-04-15",
  },
  {
    id: "10",
    name: "Thermostat Miscalibration",
    equipment: "Carrier 24k BTU Air Conditioner",
    sourceJob: "This job",
    status: "New",
    urgency: "Low",
    createdBy: "Marcus Tech",
    createdOn: "2026-04-14",
  },
];

const createColumn = createColumnHelper<Finding>();

const columns = [
  createColumn("name", {
    header: { label: "Finding Name" },
    sortable: true,
    resizable: true,
    minWidth: 220,
    getCellText: (value: Finding["name"]) => value,
    renderCell: (value: Finding["name"], { row }: { row: Finding }) => (
      <Flex direction="column">
        <Link href="#" ghost style={{ fontWeight: 600 }}>
          {value}
        </Link>
        {row.equipment && row.equipment !== "—" ? (
          <Link
            href="#"
            ghost
            style={{
              color: "var(--a2-foreground-color-subdued)",
              fontSize:
                "var(--a2-typography-paragraph-size-small, var(--a2-font-size-300, 0.875rem))",
            }}
          >
            {row.equipment}
          </Link>
        ) : (
          <Text variant="body" size="small" subdued>
            {row.equipment}
          </Text>
        )}
      </Flex>
    ),
  }),
  createColumn("sourceJob", {
    header: { label: "Source Job" },
    sortable: true,
    minWidth: 120,
    renderCell: (value: Finding["sourceJob"]) =>
      value.startsWith("#") ? (
        <Link href="#">{value}</Link>
      ) : (
        <Text variant="body" size="small">
          {value}
        </Text>
      ),
  }),
  createColumn("status", {
    header: { label: "Status" },
    sortable: true,
    minWidth: 150,
    renderCell: (value: Finding["status"]) =>
      chipsFormatter([{ label: value, color: statusColor[value] }]),
  }),
  createColumn("urgency", {
    header: { label: "Urgency" },
    sortable: true,
    minWidth: 120,
    getCellText: (value: Finding["urgency"]) => value,
    renderCell: (value: Finding["urgency"]) => (
      <Flex gap="1" alignItems="center">
        <Icon svg={IconFlag} size="small" color={urgencyColor[value]} />
        <Text variant="body" size="small">
          {value}
        </Text>
      </Flex>
    ),
  }),
  createColumn("createdBy", {
    header: { label: "Created By" },
    sortable: true,
    minWidth: 130,
  }),
  createColumn("createdOn", {
    header: { label: "Created On" },
    sortable: true,
    minWidth: 130,
    getCellText: (value: Finding["createdOn"]) => value,
    renderCell: (value: Finding["createdOn"]) =>
      dateFormatter(value, { format: "medium" }),
  }),
  createColumn("id", {
    header: { label: "" },
    minWidth: 56,
    maxWidth: 56,
    pinned: "right",
    renderCell: () => (
      <Button
        appearance="ghost"
        size="small"
        icon={IconMoreVert}
        aria-label="Row actions"
      />
    ),
  }),
];

function FilterButton({ label }: { label: string }) {
  return (
    <Button
      appearance="ghost"
      size="small"
      icon={{ after: IconKeyboardArrowDown }}
    >
      {label}
    </Button>
  );
}

export default function FindingsTableExperiment() {
  return (
    <Flex
      justifyContent="center"
      style={{
        padding: "var(--size-8)",
        background: "var(--background-color-secondary, #f5f6f7)",
        minHeight: "100vh",
        boxSizing: "border-box",
      }}
    >
      <Card padding="large" style={{ width: "100%", maxWidth: 1040 }}>
        <Flex direction="column" gap="4" style={{ minWidth: 0 }}>
          {/* Header: title + count badge + primary action */}
          <Flex justifyContent="space-between" alignItems="center">
            <Flex gap="2" alignItems="center">
              <Text variant="headline" el="h2" size="medium">
                Findings
              </Text>
              <Chip label="10" color="#6a7a85" size="small" />
            </Flex>
            <Button appearance="secondary" icon={{ before: IconAdd }}>
              Add Finding
            </Button>
          </Flex>

          {/* Filters row */}
          <Flex justifyContent="space-between" alignItems="center">
            <Flex gap="2" alignItems="center" wrap="wrap">
              <SearchField
                size="small"
                placeholder="Search findings..."
                aria-label="Search findings"
                style={{ width: 240 }}
              />
              <FilterButton label="Equipment" />
              <FilterButton label="Source" />
              <FilterButton label="Status" />
              <FilterButton label="Urgency" />
            </Flex>
            <Button
              appearance="ghost"
              size="small"
              icon={IconViewColumn}
              aria-label="Column settings"
            />
          </Flex>

          {/* Data table */}
          <DataTable
            data={data}
            columns={columns}
            defaultSortedColumn={{ id: "createdOn", desc: true }}
            pagination={{
              rowsPerPage: 10,
              rowsPerPageOptions: [10, 25, 50],
              showCount: true,
            }}
          />
        </Flex>
      </Card>
    </Flex>
  );
}
