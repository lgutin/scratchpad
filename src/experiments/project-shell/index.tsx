import type { CSSProperties } from "react";
import "./nav/tokens-office-nav.css";
import "./tokens-project-shell.css";
import { Shell } from "./nav/Shell";
import { ProjectShell } from "./ProjectShell";
import bannerUrl from "./banner.jpg";

export const meta = {
  title: "Project Shell",
  path: "/project-shell",
  date: "2026-08-10",
  description: "Projects detail and sub nav",
};

// The banner ships as a bundled asset (Vite resolves ./banner.jpg to a hashed, base-aware URL that
// works in dev and on GitHub Pages). Set the shell's banner token from it; CSS custom properties
// inherit, so the .banner element deep inside picks it up.
const bannerStyle = {
  "--project-shell-banner": `url("${bannerUrl}")`,
} as CSSProperties;

export default function ProjectShellExperiment() {
  return (
    <div style={bannerStyle}>
      <Shell>
        <ProjectShell />
      </Shell>
    </div>
  );
}
