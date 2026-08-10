import { Fragment, type ComponentType } from "react";
import styles from "./LeftNav.module.css";
import {
  // NavMessages,  // Messages ships off by default — uncomment to enable (see ITEMS below)
  NavDashboard,
  NavCalls,
  NavSchedule,
  NavDispatch,
  NavAccounting,
  NavInventory,
  NavFollowUp,
  NavReports,
  NavMarketing,
  NavPricebook,
  // NavProjects,  // Projects ships off by default — uncomment to enable (see ITEMS below)
  NavCollapse,
} from "./officeNav";

interface NavItem {
  label: string;
  /** Renders the outline glyph by default and the filled glyph when `filled` is set (selected). */
  Icon: ComponentType<{ filled?: boolean }>;
  /** Draw a full-width divider after this item (e.g. to split Messages into its own top group). */
  groupEnd?: boolean;
}

// The rail's on/off switch: edit this array to change what shows.
// Turn a module OFF → delete or comment out its line. Turn one ON → uncomment/add its line
// (each icon is imported above + exported from officeNav.tsx). Messages and Projects ship OFF by
// default, so to enable either one uncomment BOTH its ITEMS line and its import above.
// Reorder = reorder the lines. See §8 for adding a brand-new module (vector from the Figma file).
const ITEMS: NavItem[] = [
  // Messages ships off by default. To show it, uncomment this line AND the NavMessages import above.
  // { label: "Messages", Icon: NavMessages, groupEnd: true },
  { label: "Dashboard", Icon: NavDashboard },
  { label: "Calls", Icon: NavCalls },
  { label: "Schedule", Icon: NavSchedule },
  { label: "Dispatch", Icon: NavDispatch },
  { label: "Accounting", Icon: NavAccounting },
  { label: "Inventory", Icon: NavInventory },
  { label: "Follow Up", Icon: NavFollowUp },
  { label: "Reports", Icon: NavReports },
  { label: "Marketing", Icon: NavMarketing },
  { label: "Pricebook", Icon: NavPricebook },
  // Projects ships off by default. To show it, uncomment this line AND the NavProjects import above.
  // { label: "Projects", Icon: NavProjects },
];

/**
 * ServiceTitan (Anvil2) office web-app collapsed global left nav: a fixed 60px dark-navy
 * icon rail with icon + label per module, and a collapse control pinned to the bottom
 * above a hairline divider. Pass `active` to highlight the current module.
 */
export function LeftNav({ active }: { active?: string }) {
  return (
    <nav className={styles.rail}>
      <div className={styles.items}>
        {ITEMS.map((item) => {
          const isActive = item.label === active;
          return (
            <Fragment key={item.label}>
              <button
                type="button"
                className={styles.item}
                data-active={isActive || undefined}
              >
                <span className={styles.iconBox}>
                  <item.Icon filled={isActive} />
                </span>
                <span className={styles.label}>{item.label}</span>
              </button>
              {item.groupEnd && <div className={styles.divider} role="separator" />}
            </Fragment>
          );
        })}
      </div>
      <div className={styles.collapse}>
        <button type="button" className={styles.collapseBtn} aria-label="Collapse menu">
          <span className={styles.iconBox}>
            <NavCollapse />
          </span>
        </button>
      </div>
    </nav>
  );
}
