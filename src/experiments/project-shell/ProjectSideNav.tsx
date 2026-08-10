import styles from "./ProjectSideNav.module.css";
import { IconEdit } from "./projectShellIcons";

interface NavItem {
  label: string;
  /** The subtitle under the module name. */
  detail: string;
}

// The full project module list (Figma nodes 922:50898–922:50912), in order.
// Turn a module OFF → delete its line. Reorder = reorder the lines.
const NAV_ITEMS: readonly NavItem[] = [
  { label: "Dashboard", detail: "Project Overview" },
  { label: "Estimates", detail: "Sold & Unsold Estimates" },
  { label: "Jobs & Appointments", detail: "Book or View Jobs" },
  { label: "Project Plan", detail: "Tasks & Jobs" },
  { label: "Submittals", detail: "Items & Packages" },
  { label: "Purchasing", detail: "PO, Requisitions, Transfers, Bills" },
  { label: "Daily Logs", detail: "Field Reports & Daily Logs" },
  { label: "RFIs", detail: "Requests for Information" },
  { label: "Change Orders", detail: "Change Orders" },
  { label: "Financials", detail: "Costing, Invoices, Payments" },
  { label: "Employees", detail: "Timesheets" },
  { label: "Documents", detail: "Forms, Media, Attachments, Measurements" },
  { label: "Messages", detail: "Chat & Email" },
  { label: "History", detail: "Activity & History" },
];

/**
 * The 240px white project side-nav (Figma node 922:50888): a banner photo, a
 * "Project Type" card, and the project-module list — all in one scrolling column,
 * so the banner scrolls up with a long module list. Pass `active` to highlight a
 * module (defaults to "Dashboard", matching the demo).
 */
export function ProjectSideNav({
  projectType = "Construction",
  active = "Dashboard",
}: {
  projectType?: string;
  active?: string;
}) {
  return (
    <aside className={styles.nav} aria-label="Project navigation">
      <div className={styles.banner} role="img" aria-label="Project photo" />

      <div className={styles.info}>
        <div className={styles.typeCard}>
          <span className={styles.typeLabel}>Project Type</span>
          <div className={styles.typeValueRow}>
            <span className={styles.typeValue}>{projectType}</span>
            <span className={styles.typeEdit}>
              <IconEdit size={16} />
            </span>
          </div>
        </div>
      </div>

      <nav className={styles.items}>
        {NAV_ITEMS.map((item) => {
          const isActive = item.label === active;
          return (
            <a
              key={item.label}
              href="#"
              className={`${styles.item}${isActive ? ` ${styles.itemActive}` : ""}`}
              aria-current={isActive ? "page" : undefined}
              onClick={(event) => event.preventDefault()}
            >
              <span className={styles.itemLabel}>{item.label}</span>
              <span className={styles.itemDetail}>{item.detail}</span>
            </a>
          );
        })}
      </nav>
    </aside>
  );
}
