import { useCallback, useEffect, useRef, useState } from "react";
import {
  Tab,
  Card,
  Flex,
  Grid,
  Text,
  Link,
  Button,
  Chip,
  Breadcrumbs,
  SearchField,
  Icon,
} from "@servicetitan/anvil2";
import {
  DataTable,
  createColumnHelper,
  dateFormatter,
  type TableRow,
} from "@servicetitan/anvil2/beta";
import IconKeyboardArrowDown from "@servicetitan/anvil2/assets/icons/material/round/keyboard_arrow_down.svg";
import IconPdf from "@servicetitan/anvil2/assets/icons/st/document_pdf.svg";
import "./nav/tokens-office-nav.css";
import { TopNav } from "./nav/TopNav";
import { LeftNav } from "./nav/LeftNav";

export const meta = {
  title: "Sticky Tabs",
  path: "/subcontractor-detail",
  date: "2026-07-13",
  description: "Subcontractor profile",
};

const SECTIONS = [
  { id: "overview", label: "Overview" },
  { id: "assignments", label: "Assignments" },
  { id: "documents", label: "Documents" },
] as const;

const STICKY_TAB_HEIGHT = 48;
const SCROLL_OFFSET = STICKY_TAB_HEIGHT + 8;

type Assignment = {
  id: string;
  name: string;
  projectId: string;
  status: "Invited" | "Active" | "Completed";
  contracted: number;
  billed: number;
  outstanding: number;
};

type Document = {
  id: string;
  name: string;
  type: "COI" | "W-9" | "Other";
  expiration: string | null;
  createdOn: string;
};

const assignments: TableRow<Assignment>[] = [
  {
    id: "1",
    name: "Mesa Walmart",
    projectId: "345678",
    status: "Invited",
    contracted: 185000,
    billed: 142500,
    outstanding: 42500,
  },
  {
    id: "2",
    name: "Banner Hospital",
    projectId: "345679",
    status: "Active",
    contracted: 92000,
    billed: 61500,
    outstanding: 30500,
  },
  {
    id: "3",
    name: "Scottsdale Office Park",
    projectId: "345680",
    status: "Active",
    contracted: 64000,
    billed: 48000,
    outstanding: 16000,
  },
  {
    id: "4",
    name: "Tempe Distribution Center",
    projectId: "345681",
    status: "Completed",
    contracted: 128000,
    billed: 128000,
    outstanding: 0,
  },
  {
    id: "5",
    name: "Chandler Retail Plaza",
    projectId: "345682",
    status: "Active",
    contracted: 76000,
    billed: 52000,
    outstanding: 24000,
  },
  {
    id: "6",
    name: "Gilbert Medical Center",
    projectId: "345683",
    status: "Invited",
    contracted: 54000,
    billed: 0,
    outstanding: 54000,
  },
  {
    id: "7",
    name: "Peoria Auto Dealership",
    projectId: "345684",
    status: "Completed",
    contracted: 41000,
    billed: 41000,
    outstanding: 0,
  },
];

const documents: TableRow<Document>[] = [
  {
    id: "1",
    name: "Emerson Elementary Blueprint Layout.pdf",
    type: "COI",
    expiration: "2026-12-31",
    createdOn: "2026-04-10",
  },
  {
    id: "2",
    name: "Emerson Elementary Blueprint Layout.pdf",
    type: "W-9",
    expiration: null,
    createdOn: "2026-04-10",
  },
  {
    id: "3",
    name: "Emerson Elementary Blueprint Layout.pdf",
    type: "Other",
    expiration: "2026-12-31",
    createdOn: "2026-04-10",
  },
];

const currencyFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
});

const CONTENT_MAX_WIDTH = 1280;

function getContentPadding(width: number): string {
  if (width >= 1280) return "var(--a2-size-12, 3rem)";
  if (width >= 1024) return "var(--a2-size-10, 2.5rem)";
  if (width >= 768) return "var(--a2-size-8, 2rem)";
  return "var(--a2-size-4, 1rem)";
}

function useContentPadding(containerRef: React.RefObject<HTMLElement | null>) {
  const [padding, setPadding] = useState(() =>
    getContentPadding(CONTENT_MAX_WIDTH),
  );

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const update = () => {
      setPadding(getContentPadding(container.clientWidth));
    };

    update();
    const observer = new ResizeObserver(update);
    observer.observe(container);

    return () => observer.disconnect();
  }, [containerRef]);

  return padding;
}

const sectionStyle: React.CSSProperties = {
  width: "100%",
  minWidth: 0,
};

function PageHeaderSection() {
  return (
    <Flex direction="column" gap="4" style={{ width: "100%" }}>
      <Breadcrumbs>
        <Breadcrumbs.Link href="#">Subcontractors</Breadcrumbs.Link>
        <Breadcrumbs.Link href="#">Apex Electrical Services</Breadcrumbs.Link>
      </Breadcrumbs>

      <Flex
        justifyContent="space-between"
        alignItems="flex-start"
        gap="4"
        wrap="wrap"
      >
        <Flex direction="column" gap="3">
          <Text variant="headline" el="h1" size="medium">
            Apex Electrical Services
          </Text>
          <Flex gap="1" wrap="wrap">
            <Chip label="Electrical" />
            <Chip label="Plumbing" />
            <Chip label="Roofing" />
          </Flex>
        </Flex>

        <Flex gap="2" alignItems="center" style={{ flexShrink: 0 }}>
          <Button appearance="secondary">Edit</Button>
          <Button appearance="primary">Assign</Button>
        </Flex>
      </Flex>
    </Flex>
  );
}

function SectionCard({ children }: { children: React.ReactNode }) {
  return (
    <Card
      padding="large"
      style={{
        width: "100%",
        minWidth: 0,
        overflow: "hidden",
        boxSizing: "border-box",
      }}
    >
      <div style={{ width: "100%", minWidth: 0 }}>{children}</div>
    </Card>
  );
}

function TableContainer({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        width: "100%",
        maxWidth: "100%",
        minWidth: 0,
        overflowX: "auto",
        boxSizing: "border-box",
      }}
    >
      {children}
    </div>
  );
}

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

function DetailRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <Grid templateColumns="144px 1fr" gap="4" alignItems="start">
      <Text variant="body" size="medium" subdued>
        {label}
      </Text>
      <div>{children}</div>
    </Grid>
  );
}

function useScrollSpy(
  scrollContainerRef: React.RefObject<HTMLElement | null>,
  sectionRefs: React.RefObject<(HTMLElement | null)[]>,
  sectionCount: number,
) {
  const [activeIndex, setActiveIndex] = useState(0);
  const isScrollingRef = useRef(false);
  const scrollTimeoutRef = useRef<number | undefined>(undefined);

  const scrollToSection = useCallback(
    (index: number) => {
      const container = scrollContainerRef.current;
      const section = sectionRefs.current?.[index];
      if (!container || !section) return;

      isScrollingRef.current = true;
      setActiveIndex(index);

      const containerTop = container.getBoundingClientRect().top;
      const sectionTop = section.getBoundingClientRect().top;
      const nextScrollTop =
        container.scrollTop + (sectionTop - containerTop) - SCROLL_OFFSET;

      container.scrollTo({ top: nextScrollTop, behavior: "smooth" });

      window.clearTimeout(scrollTimeoutRef.current);
      scrollTimeoutRef.current = window.setTimeout(() => {
        isScrollingRef.current = false;
      }, 600);
    },
    [scrollContainerRef, sectionRefs],
  );

  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    let animationFrame = 0;

    const updateActiveSection = () => {
      if (isScrollingRef.current) return;

      const activationLine =
        container.getBoundingClientRect().top + SCROLL_OFFSET + 1;
      const isAtBottom =
        container.scrollTop + container.clientHeight >=
        container.scrollHeight - 2;

      let nextIndex = isAtBottom ? sectionCount - 1 : 0;

      if (!isAtBottom) {
        for (let index = 0; index < sectionCount; index += 1) {
          const section = sectionRefs.current?.[index];
          if (section && section.getBoundingClientRect().top <= activationLine) {
            nextIndex = index;
          }
        }
      }

      setActiveIndex((currentIndex) =>
        currentIndex === nextIndex ? currentIndex : nextIndex,
      );
    };

    const handleScroll = () => {
      window.cancelAnimationFrame(animationFrame);

      if (isScrollingRef.current) {
        window.clearTimeout(scrollTimeoutRef.current);
        scrollTimeoutRef.current = window.setTimeout(() => {
          isScrollingRef.current = false;
          updateActiveSection();
        }, 150);
        return;
      }

      animationFrame = window.requestAnimationFrame(updateActiveSection);
    };

    updateActiveSection();
    container.addEventListener("scroll", handleScroll, { passive: true });

    return () => {
      container.removeEventListener("scroll", handleScroll);
      window.cancelAnimationFrame(animationFrame);
    };
  }, [scrollContainerRef, sectionRefs, sectionCount]);

  useEffect(
    () => () => window.clearTimeout(scrollTimeoutRef.current),
    [],
  );

  return { activeIndex, scrollToSection };
}

const assignmentColumn = createColumnHelper<Assignment>();
const assignmentColumns = [
  assignmentColumn("name", {
    header: { label: "Assignment Name" },
    sortable: true,
    minWidth: 220,
    defaultWidth: 360,
    maxWidth: 480,
    renderCell: (value: Assignment["name"], { row }: { row: Assignment }) => (
      <Flex direction="column">
        <Link href="#" ghost style={{ fontWeight: 600 }}>
          {value}
        </Link>
        <Link
          href="#"
          ghost
          style={{ color: "var(--a2-foreground-color-subdued)" }}
        >
          Project #{row.projectId}
        </Link>
      </Flex>
    ),
  }),
  assignmentColumn("status", {
    header: { label: "Status" },
    sortable: true,
    minWidth: 110,
    defaultWidth: 120,
    maxWidth: 160,
  }),
  assignmentColumn("contracted", {
    header: { label: "Contracted" },
    sortable: true,
    minWidth: 120,
    defaultWidth: 140,
    maxWidth: 180,
    getCellText: (value: Assignment["contracted"]) => currencyFormatter.format(value),
    renderCell: (value: Assignment["contracted"]) =>
      currencyFormatter.format(value),
  }),
  assignmentColumn("billed", {
    header: { label: "Billed" },
    sortable: true,
    minWidth: 120,
    defaultWidth: 140,
    maxWidth: 180,
    getCellText: (value: Assignment["billed"]) => currencyFormatter.format(value),
    renderCell: (value: Assignment["billed"]) =>
      currencyFormatter.format(value),
  }),
  assignmentColumn("outstanding", {
    header: { label: "Outstanding" },
    sortable: true,
    minWidth: 120,
    defaultWidth: 140,
    maxWidth: 180,
    getCellText: (value: Assignment["outstanding"]) =>
      currencyFormatter.format(value),
    renderCell: (value: Assignment["outstanding"]) =>
      currencyFormatter.format(value),
  }),
];

const documentColumn = createColumnHelper<Document>();
const documentColumns = [
  documentColumn("name", {
    header: { label: "Document Name" },
    sortable: true,
    minWidth: 280,
    defaultWidth: 480,
    maxWidth: 640,
    getCellText: (value: Document["name"]) => value,
    renderCell: (value: Document["name"]) => (
      <Flex gap="2" alignItems="center">
        <Icon svg={IconPdf} size="medium" />
        <Link href="#" ghost>
          {value}
        </Link>
      </Flex>
    ),
  }),
  documentColumn("type", {
    header: { label: "Type" },
    sortable: true,
    minWidth: 100,
    defaultWidth: 120,
    maxWidth: 160,
  }),
  documentColumn("expiration", {
    header: { label: "Expiration" },
    sortable: true,
    minWidth: 130,
    defaultWidth: 160,
    maxWidth: 200,
    getCellText: (value: Document["expiration"]) => value ?? "—",
    renderCell: (value: Document["expiration"]) =>
      value ? dateFormatter(value, { format: "medium" }) : "—",
  }),
  documentColumn("createdOn", {
    header: { label: "Date Created" },
    sortable: true,
    minWidth: 130,
    defaultWidth: 160,
    maxWidth: 200,
    getCellText: (value: Document["createdOn"]) => value,
    renderCell: (value: Document["createdOn"]) =>
      dateFormatter(value, { format: "medium" }),
  }),
];

export default function SubcontractorDetailExperiment() {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const contentWellRef = useRef<HTMLDivElement>(null);
  const sectionRefs = useRef<(HTMLElement | null)[]>([]);
  const contentPadding = useContentPadding(contentWellRef);
  const { activeIndex, scrollToSection } = useScrollSpy(
    scrollContainerRef,
    sectionRefs,
    SECTIONS.length,
  );

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        display: "flex",
        flexDirection: "column",
        width: "100%",
        height: "100dvh",
        overflow: "hidden",
        background: "var(--a2-background-color-strong, #f5f6f7)",
      }}
    >
      <TopNav />

      <div
        style={{
          display: "flex",
          flex: 1,
          minHeight: 0,
          alignItems: "stretch",
        }}
      >
        <LeftNav />

        <div
          ref={scrollContainerRef}
          style={{
            flex: 1,
            minWidth: 0,
            overflow: "auto",
            background: "var(--a2-background-color-default, #fff)",
          }}
        >
          <div
            ref={contentWellRef}
            style={{
              width: "100%",
              maxWidth: CONTENT_MAX_WIDTH,
              margin: "0 auto",
              paddingBlock: "var(--a2-size-6, 1.5rem)",
              paddingBottom: "var(--a2-size-12, 3rem)",
              boxSizing: "border-box",
              minWidth: 0,
            }}
          >
            <div
              style={{
                paddingInline: contentPadding,
                minWidth: 0,
                boxSizing: "border-box",
              }}
            >
              <PageHeaderSection />

              <div
                style={{
                  position: "sticky",
                  top: 0,
                  zIndex: 2,
                  background: "var(--background-color-primary, #fff)",
                  borderBottom:
                    "1px solid var(--border-color-default, #e3e6e8)",
                  boxSizing: "border-box",
                }}
              >
                <Tab
                  index={activeIndex}
                  onIndexChange={(index) => scrollToSection(index)}
                  style={{ margin: 0, padding: 0 }}
                >
                  <Tab.List>
                    {SECTIONS.map((section) => (
                      <Tab.Button
                        key={section.id}
                        id={`${section.id}-tab`}
                        controls={`${section.id}-section`}
                      >
                        {section.label}
                      </Tab.Button>
                    ))}
                  </Tab.List>
                </Tab>
              </div>

              <Flex
                direction="column"
                gap="6"
                alignItems="stretch"
                style={{ paddingTop: "var(--a2-size-6, 1.5rem)", width: "100%" }}
              >
              <section
                id="overview-section"
                data-section-index={0}
                ref={(node) => {
                  sectionRefs.current[0] = node;
                }}
                aria-labelledby="overview-tab"
                style={{ ...sectionStyle, scrollMarginTop: SCROLL_OFFSET }}
              >
                <SectionCard>
                    <Flex direction="column" gap="6">
                      <Text variant="headline" el="h2" size="medium">
                        Overview
                      </Text>
                      <Grid templateColumns="1fr 1fr" gap="8">
                        <Flex direction="column" gap="4">
                          <DetailRow label="Contact">
                            <Text variant="body" size="medium">
                              Marcus Webb
                            </Text>
                          </DetailRow>
                          <DetailRow label="Phone">
                            <Text variant="body" size="medium">
                              (602) 555-0128
                            </Text>
                          </DetailRow>
                          <DetailRow label="Email">
                            <Link href="mailto:m.webb@apexelectrical.com">
                              m.webb@apexelectrical.com
                            </Link>
                          </DetailRow>
                          <DetailRow label="Notes">
                            <Text variant="body" size="medium">
                              Preferred vendor for commercial electrical. Available
                              same-week. Preferred vendor for commercial electrical.{" "}
                              <Link href="#">Show more</Link>
                            </Text>
                          </DetailRow>
                        </Flex>
                        <Flex direction="column" gap="4">
                          <DetailRow label="COI">
                            <Text variant="body" size="medium">
                              Current (Expires Aug 11, 2026)
                            </Text>
                          </DetailRow>
                          <DetailRow label="License">
                            <Text variant="body" size="medium">
                              AZ-EL-48291
                            </Text>
                          </DetailRow>
                          <DetailRow label="Default Retainage">
                            <Text variant="body" size="medium">
                              10%
                            </Text>
                          </DetailRow>
                        </Flex>
                      </Grid>
                    </Flex>
                </SectionCard>
              </section>

              <section
                id="assignments-section"
                data-section-index={1}
                ref={(node) => {
                  sectionRefs.current[1] = node;
                }}
                aria-labelledby="assignments-tab"
                style={{ ...sectionStyle, scrollMarginTop: SCROLL_OFFSET }}
              >
                <SectionCard>
                    <Flex direction="column" gap="4">
                      <Text variant="headline" el="h2" size="medium">
                        Assignments
                      </Text>
                      <Flex justifyContent="space-between" alignItems="center">
                        <Flex gap="2" alignItems="center" wrap="wrap">
                          <SearchField
                            size="small"
                            placeholder="Search assignment name, id..."
                            aria-label="Search assignments"
                            style={{ width: 320 }}
                          />
                          <FilterButton label="Status" />
                        </Flex>
                      </Flex>
                      <TableContainer>
                        <DataTable
                          data={assignments}
                          columns={assignmentColumns}
                          style={{ width: "100%" }}
                          pagination={{
                            rowsPerPage: 10,
                            rowsPerPageOptions: [10, 25, 50],
                            showCount: true,
                          }}
                        />
                      </TableContainer>
                    </Flex>
                </SectionCard>
              </section>

              <section
                id="documents-section"
                data-section-index={2}
                ref={(node) => {
                  sectionRefs.current[2] = node;
                }}
                aria-labelledby="documents-tab"
                style={{ ...sectionStyle, scrollMarginTop: SCROLL_OFFSET }}
              >
                <SectionCard>
                    <Flex direction="column" gap="4">
                      <Text variant="headline" el="h2" size="medium">
                        Documents
                      </Text>
                      <Flex gap="2" alignItems="center" wrap="wrap">
                        <SearchField
                          size="small"
                          placeholder="Search in Documents"
                          aria-label="Search documents"
                          style={{ width: 320 }}
                        />
                        <FilterButton label="Type" />
                        <FilterButton label="Expiration" />
                        <FilterButton label="Date Created" />
                      </Flex>
                      <TableContainer>
                        <DataTable
                          data={documents}
                          columns={documentColumns}
                          style={{ width: "100%" }}
                          defaultSortedColumn={{ id: "createdOn", desc: true }}
                          pagination={{
                            rowsPerPage: 10,
                            rowsPerPageOptions: [10, 25, 50],
                            showCount: true,
                          }}
                        />
                      </TableContainer>
                    </Flex>
                </SectionCard>
              </section>
              </Flex>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
