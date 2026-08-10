import { useLayoutEffect, useRef } from "react";
import styles from "./ProjectHeader.module.css";
import { IconEdit, IconSettings, IconExpandMore } from "./projectShellIcons";

/**
 * The project header band (Figma node 921:50848): project title + a single-row
 * metadata strip on the left, and edit / settings / Actions controls on the right.
 * 120px tall, white, hairline bottom border. Values are static demo chrome.
 *
 * The metadata never wraps: when the band is too narrow, whole detail items are
 * hidden from the right (see `useLayoutEffect` below) so the band keeps its height
 * instead of growing a second row.
 */
export function ProjectHeader() {
  const detailsRef = useRef<HTMLDivElement>(null);

  // Keep the metadata on one row. Rather than wrapping (which grows the band and shifts the layout),
  // hide whole detail items from the right that don't fit the available width. Re-runs on resize.
  useLayoutEffect(() => {
    const details = detailsRef.current;
    if (!details) return;

    const fit = () => {
      const items = Array.from(details.children) as HTMLElement[];
      items.forEach((el) => (el.style.display = "")); // reset so measurements reflect natural widths
      const right = details.getBoundingClientRect().right;
      let hidden = false;
      for (const el of items) {
        // Once one item overflows the container's right edge, it and everything after it are hidden.
        if (hidden || el.getBoundingClientRect().right > right + 0.5) {
          hidden = true;
          el.style.display = "none";
        }
      }
    };

    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(details);
    return () => ro.disconnect();
  }, []);

  return (
    <div className={styles.header}>
      <div className={styles.info}>
        <h1 className={styles.title}>
          <span className={styles.titleLead}>Project #23235:</span> Sunset Plaza High School
        </h1>
        <div className={styles.details} ref={detailsRef}>
          <div className={styles.detail}>
            <span className={styles.detailLabel}>Status</span>
            <div className={styles.statusValue}>
              <span className={styles.statusDot} aria-hidden="true" />
              <span className={styles.detailValue}>In Progress</span>
            </div>
          </div>
          <div className={styles.detail}>
            <span className={styles.detailLabel}>Business Unit</span>
            <span className={styles.detailValue}>Construction</span>
          </div>
          <div className={styles.detail}>
            <span className={styles.detailLabel}>Bill To</span>
            <span className={`${styles.detailValue} ${styles.detailValueLink}`}>ABC Builder</span>
          </div>
          <div className={styles.detail}>
            <span className={styles.detailLabel}>Service Address</span>
            <span className={styles.detailValue}>123 Sunset Blvd Los Angeles, CA 90028</span>
          </div>
        </div>
      </div>

      <div className={styles.actions}>
        <button type="button" className={styles.iconBtn} aria-label="Edit project">
          <IconEdit size={24} />
        </button>
        <button type="button" className={styles.iconBtn} aria-label="Project settings">
          <IconSettings size={24} />
        </button>
        <button type="button" className={styles.actionsBtn}>
          <span>Actions</span>
          <span className={styles.actionsChevron}>
            <IconExpandMore size={16} />
          </span>
        </button>
      </div>
    </div>
  );
}
