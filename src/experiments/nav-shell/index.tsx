import "./tokens-office-nav.css";
import { Shell } from "./Shell";

export const meta = {
  title: "Nav Shell",
  path: "/nav-shell",
  date: "2026-08-10T09:00",
  description: "Top and left nav bars",
};

export default function NavShell() {
  return (
    <Shell>
      <div style={{ padding: 24 }}>
        <h2 style={{ margin: "0 0 8px" }}>Nav Shell</h2>
        <p style={{ margin: 0, color: "var(--a2-foreground-color-subdued, #707070)" }}>
          Top and left nav bars — the ServiceTitan office web-app chrome. Page content goes here.
        </p>
      </div>
    </Shell>
  );
}
