import type { ReactNode } from "react";
import styles from "./Shell.module.css";
import { TopNav } from "./TopNav";
import { LeftNav } from "./LeftNav";

export function Shell({ children }: { children?: ReactNode }) {
  return (
    <div className={styles.frame}>
      <TopNav />
      <div className={styles.body}>
        <LeftNav />
        <main className={styles.screen}>{children}</main>
      </div>
    </div>
  );
}
