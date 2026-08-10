import { type ReactNode } from "react";
import styles from "./ProjectShell.module.css";
import { ProjectSideNav } from "./ProjectSideNav";
import { ProjectHeader } from "./ProjectHeader";

export function ProjectShell({ children }: { children?: ReactNode }) {
  // Two columns. The left column spans both rows and scrolls as one — the banner, Project Type
  // card, and module list scroll together (the banner scrolls up under a long list). The right
  // column is the header band (auto height, top) over the scrollable page content.
  return (
    <div className={styles.frame}>
      <div className={styles.sideCol}>
        <ProjectSideNav />
      </div>
      <ProjectHeader />
      <div className={styles.content}>{children}</div>
    </div>
  );
}
