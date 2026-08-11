# CLAUDE.md — Anvil2 Scratchpad

> Personal sandbox for experimenting with ServiceTitan's Anvil2 design system.
> Read this file before writing any code.

---

## Project Overview

This is a standalone Vite + React 19 + TypeScript project for testing Anvil2 components. It is **not** a microfrontend — no `@servicetitan/startup` or `@servicetitan/web-components` involved. All Anvil2 packages are installed directly.

---

## Setup (From Scratch)

If the project has no `package.json`, run these commands in order:

```bash
# 1. Scaffold Vite + React + TypeScript
npm create vite@latest . -- --template react-ts
npm install

# 2. Install all Anvil2 packages
npm install @servicetitan/anvil2 \
  @servicetitan/anvil2-ext-common \
  @servicetitan/anvil2-ext-atlas \
  @servicetitan/anvil2-ext-charts \
  @servicetitan/anvil2-ext-mwv \
  @servicetitan/anvil2-illustrations

# 3. Install peer dependencies required by extended packages
npm install @amcharts/amcharts5 mobx mobx-react @servicetitan/tokens @ionic/react

# 4. Install SVGR plugins for Anvil2 icons and router
npm install -D vite-plugin-svgr@4 esbuild-plugin-svgr
npm install react-router-dom
```

### Vite Config

Replace `vite.config.ts` with:

```ts
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import svgr from "vite-plugin-svgr";
import svgrEsbuild from "esbuild-plugin-svgr";

export default defineConfig({
  plugins: [
    react(),
    svgr({
      include: "**/*.svg", // Process all SVGs as React components (including node_modules)
      svgrOptions: {
        svgoConfig: {
          plugins: [
            {
              name: "preset-default",
              params: {
                overrides: {
                  removeViewBox: false, // Required for Anvil2 icons
                },
              },
            },
          ],
        },
      },
    }),
  ],
  optimizeDeps: {
    esbuildOptions: {
      plugins: [
        // Transform SVGs inside node_modules during Vite's dep pre-bundling
        svgrEsbuild({
          svgoConfig: {
            plugins: [
              {
                name: "preset-default",
                params: {
                  overrides: {
                    removeViewBox: false,
                  },
                },
              },
            ],
          },
        }),
      ],
    },
  },
});
```

**Why two SVGR plugins?** Vite uses esbuild for pre-bundling `node_modules` and its own pipeline for source files. `esbuild-plugin-svgr` handles SVGs inside Anvil2 during pre-bundling; `vite-plugin-svgr` handles SVG imports in your source code and from `node_modules` at serve time.

### SVG Type Declaration

Create `src/svg.d.ts` so TypeScript recognizes SVG imports as React components:

```ts
declare module "*.svg" {
  import React from "react";
  const SVGComponent: React.FC<React.SVGProps<SVGSVGElement>>;
  export default SVGComponent;
}
```

### App Boilerplate

Wrap the app in `AnvilProvider` + `BrowserRouter`. Routes are auto-discovered from `src/experiments/*/index.tsx` — no manual wiring needed.

```tsx
// src/main.tsx
import { BrowserRouter } from "react-router-dom";
import { AnvilProvider } from "@servicetitan/anvil2";
import App from "./App";

createRoot(document.getElementById("root")!).render(
  <BrowserRouter>
    <AnvilProvider themeData={{ mode: "light" }}>
      <App />
    </AnvilProvider>
  </BrowserRouter>
);
```

```tsx
// src/App.tsx
import { Suspense, lazy } from "react";
import { Routes, Route, Link } from "react-router-dom";

// Auto-discover all experiments
const modules = import.meta.glob<{
  default: React.ComponentType;
  meta: { title: string; path: string; date?: string; description?: string };
}>("./experiments/*/index.tsx", { eager: true });

const experiments = Object.values(modules).map((m) => ({
  ...m.meta,
  Component: m.default,
}));

function App() {
  return (
    <Routes>
      <Route path="/" element={<Index />} />
      {experiments.map((exp) => (
        <Route key={exp.path} path={exp.path} element={<exp.Component />} />
      ))}
    </Routes>
  );
}

function Index() {
  return (
    <nav>
      <h1>Scratchpad</h1>
      <ul>
        {experiments.map((exp) => (
          <li key={exp.path}>
            <Link to={exp.path}>{exp.title}</Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}

export default App;
```

### Experiment File Convention

Each experiment lives in its own folder and exports a `meta` object + a default component:

```tsx
// src/experiments/buttons/index.tsx
import { Button } from "@servicetitan/anvil2";

export const meta = {
  title: "Button Variants",   // card title on the landing page
  path: "/buttons",           // route + shareable URL
  date: "2026-08-04",         // ISO YYYY-MM-DD — set to *today's date* when creating the experiment
  description: "Button demo", // the subtext shown under the title on the landing card
};

export default function ButtonVariants() {
  return (
    <div>
      <h2>Button Variants</h2>
      <Button>Default</Button>
      <Button appearance="ghost">Ghost</Button>
    </div>
  );
}
```

The landing page (`src/landing/Landing.tsx`) renders each experiment card from `meta`: **`title`** (heading), **`description`** (subtext), and **`date`** (formatted, and used to sort cards newest-first). Always fill in all four fields — an experiment with only `title` + `path` renders a card with no subtext and no date.

> **How the user starts an experiment.** When kicking off a new experiment, the user will *typically include the title and the subtext (description) right in their request* — often as two short lines, e.g.
>
> ```
> Nav Shell
> Top and left nav bars
> ```
>
> Treat the **first line as `meta.title`** and the **second line as `meta.description`**. Set **`meta.date` to today's date** (they expect the current date to appear on the landing card — don't leave it blank or copy an old one). If either the title or subtext is missing, pick a sensible one from the task rather than omitting the field.

To add a new experiment: create `src/experiments/<name>/index.tsx` with a `meta` export (all four fields). It automatically appears on the index page and gets its own route. No other files need to change.

### Hosting (GitHub Pages)

The playground is hosted on **GitHub Pages** at `https://<user>.github.io/scratchpad/`. Each experiment is shareable at its own URL, e.g. `/scratchpad/quick-actions`.

SPA routing on Pages is handled by copying `dist/index.html` to `dist/404.html` (see the `postbuild` script), so deep links fall back to the app shell.

Deployment normally runs via **GitHub Actions** (`.github/workflows/deploy-pages.yml`) on every push to `main`. While the `@servicetitan/*` packages are unavailable to CI, deploy manually from a local build:

```bash
npm run build
npx gh-pages -d dist   # publish dist/ to the gh-pages branch
```

The goal is to restore automatic CI-based deployment once those packages are installable in CI again.

---

## Installed Packages

| Package | Purpose |
|---|---|
| `@servicetitan/anvil2` | Core design system — Button, TextField, Dialog, DataTable, etc. |
| `@servicetitan/anvil2-ext-common` | Shared utilities for extended libraries |
| `@servicetitan/anvil2-ext-atlas` | Atlas AI chat components (chat bubbles, panels, screens) |
| `@servicetitan/anvil2-ext-charts` | amCharts 5 themes styled for Anvil2 |
| `@servicetitan/anvil2-ext-mwv` | Mobile Web View components (wraps Ionic) |
| `@servicetitan/anvil2-illustrations` | Illustration assets for empty states, onboarding, etc. |
| `@amcharts/amcharts5` | Charting library (peer dep of ext-charts) |
| `mobx` / `mobx-react` | State management (peer dep of ext-atlas) |
| `@servicetitan/tokens` | Design tokens (peer dep of ext-atlas) |
| `@ionic/react` | Mobile UI primitives (peer dep of ext-mwv) |
| `react-router-dom` | Client-side routing — each experiment gets a shareable URL |

---

## Icons

Anvil2 icons are pure SVGs imported as React components via SVGR.

### Import paths

```tsx
// Material Design icons (most common)
import EditIcon from "@servicetitan/anvil2/assets/icons/material/round/edit.svg";

// ServiceTitan custom icons
import CustomIcon from "@servicetitan/anvil2/assets/icons/st/some-icon.svg";
```

### Usage with components

```tsx
import { Icon, Button } from "@servicetitan/anvil2";
import EditIcon from "@servicetitan/anvil2/assets/icons/material/round/edit.svg";

// Standalone icon
<Icon svg={EditIcon} />

// With size and color
<Icon svg={EditIcon} size="large" color="var(--color-green-300)" />

// Button with icon
<Button icon={EditIcon}>Edit</Button>
```

### Icon props

| Prop | Values | Default |
|---|---|---|
| `svg` | Imported SVG component (required) | — |
| `size` | `"small"`, `"medium"`, `"large"`, `"xlarge"` | `"medium"` |
| `color` | Any CSS color value or variable | — |
| `inherit` | `boolean` — enables SVG color inheritance | `false` |

### Icon variants

Some icons have `active` and `inactive` variants (filled vs outline):
```tsx
import StarActive from "@servicetitan/anvil2/assets/icons/material/round/star-active.svg";
import StarInactive from "@servicetitan/anvil2/assets/icons/material/round/star-inactive.svg";
```

---

## Fonts

Anvil2 uses two typefaces:
- **Sofia Pro** (Bold) — Headlines
- **Nunito Sans** (Regular, Semibold, Bold) — Body and Eyebrow text

### Standalone font loading

In MFE projects, `@servicetitan/startup` handles font loading. For this standalone project, fonts need to be loaded manually. Add to `index.html`:

```html
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
<link href="https://fonts.googleapis.com/css2?family=Nunito+Sans:wght@400;600;700&display=swap" rel="stylesheet" />
```

**Sofia Pro** is a commercial font. Check if Anvil2's CSS bundles it via `@font-face`. If not, headlines will fall back to the system sans-serif — this is acceptable for a playground.

**After first `npm run dev`:** Inspect the rendered page to verify fonts load. If `AnvilProvider` injects `@font-face` rules automatically, the manual `<link>` above can be removed.

---

## Component Reference

### Import patterns

```tsx
// Stable components
import { Button, Card, Text, Flex } from "@servicetitan/anvil2";

// Beta components (API may change)
import { SelectField, DataTable, Toolbar } from "@servicetitan/anvil2/beta";

// Design tokens
import { core } from "@servicetitan/anvil2/token";
```

### Component categories

| Category | Components |
|---|---|
| **Layout** | Page, Layout, Flex, Grid, Card |
| **Form** | Button, TextField, Textarea, Combobox, Checkbox, Radio, RadioGroup |
| **Display** | Text, Avatar, Chip, Divider, Skeleton, Alert |
| **Data** | DataTable (beta), Toolbar (beta) |
| **Navigation** | SideNav, SideNavLink |
| **Selection** | SelectField (beta), MultiSelectField, MultiSelectMenu, SelectMenu |

This is not exhaustive — search the Anvil2 MCP for the full list and current APIs.

---

## Available AI Tools

### MCP: Anvil2 Knowledge Base
**Always search before guessing a component API.**

```
mcp__anvil__search_anvil2 — Search docs, code examples, API references
```

Use this to look up:
- Component props and usage patterns
- Available icon names
- Design tokens and theming
- Migration guides and breaking changes

### MCP: Agentation (Browser Annotation Feedback Loop)

Agentation connects the browser toolbar to Claude Code via MCP. The user annotates elements in the browser, and Claude picks them up as actionable feedback — no copy-paste.

**Architecture:** `browser toolbar → agentation server → Claude Code`

#### Tools

| Tool | Purpose |
|---|---|
| `agentation_list_sessions` | List all active annotation sessions |
| `agentation_get_session` | Get a session with all its annotations |
| `agentation_get_pending` | Get unacknowledged annotations for a session |
| `agentation_get_all_pending` | Get all pending annotations across ALL sessions |
| `agentation_acknowledge` | Mark annotation as seen — tells the user you're on it |
| `agentation_resolve` | Mark annotation as fixed, with summary of what changed |
| `agentation_dismiss` | Decline to address annotation, with reason |
| `agentation_reply` | Reply to an annotation thread (ask questions, give updates) |
| `agentation_watch_annotations` | Block until new annotations appear, then return a batch |

#### Three Operating Modes

**1. Hands-Free Mode** — Process annotations as they arrive:
```
Call agentation_watch_annotations in a loop.
For each annotation: acknowledge → fix the code → resolve with summary.
Continue watching until told to stop or timeout.
```

**2. Critique Mode** — Agent reviews the page and adds annotations:
Requires `vercel-labs/agent-browser` skill (see setup below). Claude opens a headed browser, scrolls the page top-to-bottom, and creates annotations on elements that need improvement.

**3. Self-Driving Mode** — Critique + auto-fix in one session:
Claude opens the browser, critiques elements, then immediately edits the source code to fix each issue and resolves the annotation. No human in the loop.

#### Setup for Critique / Self-Driving Modes

If `vercel-labs/agent-browser` is not installed:
```bash
npx skills add vercel-labs/agent-browser
```

### Skills
- **`/anvil2`** — Activate when building with Anvil2 components. Provides component knowledge and patterns.
- **`/frontend-design`** — Generate production-grade React interfaces with high design quality.
- **`/figma`** — Translate Figma designs into code or push code to Figma.

### Auto Mode

This project is designed to be used with:
```bash
claude --model opus --enable-auto-mode
```

**Agentation is ON by default.** After completing any build or code change, automatically:
1. Check for pending annotations with `agentation_get_all_pending`
2. If annotations exist, process them: acknowledge → fix → resolve
3. If no annotations, call `agentation_watch_annotations` to wait for new ones
4. Continue the watch loop until the user says stop or timeout

#### Default workflow

1. Build a component experiment
2. Start the dev server (`npm run dev`)
3. Open the browser and screenshot the result
4. Enter agentation watch loop — process annotations as they arrive
5. Fix issues and resolve annotations with a summary of what changed
6. Repeat until the user is satisfied

#### Triggering other modes

The user can switch modes at any time:

- **"watch mode"** or **"hands-free"** → Enter `agentation_watch_annotations` loop (default)
- **"critique this page"** → Use `agent-browser` skill to open a headed browser, scroll the page, and create annotations on elements that need improvement
- **"self-driving mode"** → Critique + auto-fix: open browser, find issues, create annotations, immediately fix the code, and resolve each annotation. No human in the loop.
- **"stop watching"** → Exit the annotation loop

---

## Development Workflow

### Start the dev server
```bash
npm run dev
```
This starts both **Vite** (`localhost:5173`) and **Agentation** (`localhost:4747`) in one command.

### Add a new experiment

Create a folder in `src/experiments/` with an `index.tsx`:

```
src/experiments/
  buttons/index.tsx         → /buttons
  data-table/index.tsx      → /data-table
  atlas-chat/index.tsx      → /atlas-chat
```

That's it — no other files to touch. The experiment auto-registers via `import.meta.glob` and appears on the index page with its own shareable URL.

### Look up a component API

Before using any Anvil2 component, search the MCP:
```
search: "Button props appearance variants"
search: "DataTable sorting filtering"
search: "Dialog modal usage"
```

### Build, type-check, deploy
```bash
npm run build         # tsc + vite build
npm run lint          # eslint
npx gh-pages -d dist  # manual GitHub Pages deploy (see Hosting)
```

---

## Rules

1. **Anvil2 only in experiments** — Use Anvil2 components and tokens exclusively for all experiments (`src/experiments/*`). No Tailwind or shadcn/ui there. **Exception:** the landing page (`src/landing/*`) uses Tailwind v4 + shadcn, imported without preflight and fully scoped under `.pg-landing` so it never leaks into the experiments.
2. **Always import from `@servicetitan/anvil2`** — Never reach into internal/undocumented paths
3. **`AnvilProvider` at the root** — Many components break without it
4. **Search the Anvil2 MCP before guessing** — Don't assume component APIs, look them up
5. **One experiment per folder** — `src/experiments/<name>/index.tsx` with a `meta` export. No manual route wiring.
6. **Icons via SVGR only** — Don't inline SVGs or use icon fonts

---

## Support

Questions about Anvil2: **#ask-designsystem** Slack channel
