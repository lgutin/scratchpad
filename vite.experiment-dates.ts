import { execFileSync } from "node:child_process";
import { readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import type { Plugin } from "vite";

const VIRTUAL_ID = "virtual:experiment-dates";
const RESOLVED_ID = `\0${VIRTUAL_ID}`;

function newestMtimeMs(dir: string): number {
  let max = 0;
  const walk = (path: string) => {
    for (const ent of readdirSync(path, { withFileTypes: true })) {
      if (ent.name === ".DS_Store") continue;
      const full = join(path, ent.name);
      if (ent.isDirectory()) walk(full);
      else max = Math.max(max, statSync(full).mtimeMs);
    }
  };
  walk(dir);
  return max;
}

function git(root: string, args: string[]): string {
  return execFileSync("git", args, {
    cwd: root,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "ignore"],
  }).trim();
}

function lastCommitMs(root: string, relDir: string): number {
  try {
    const iso = git(root, ["log", "-1", "--format=%cI", "--", relDir]);
    const ms = iso ? Date.parse(iso) : NaN;
    return Number.isNaN(ms) ? 0 : ms;
  } catch {
    return 0;
  }
}

function isDirty(root: string, relDir: string): boolean {
  try {
    return git(root, ["status", "--porcelain", "--", relDir]).length > 0;
  } catch {
    return true;
  }
}

export function collectExperimentDates(root: string): Record<string, string> {
  const experimentsDir = join(root, "src/experiments");
  const dates: Record<string, string> = {};

  for (const ent of readdirSync(experimentsDir, { withFileTypes: true })) {
    if (!ent.isDirectory()) continue;
    const absDir = join(experimentsDir, ent.name);
    const relDir = relative(root, absDir);
    const gitMs = lastCommitMs(root, relDir);
    const mtimeMs = newestMtimeMs(absDir);
    const dirty = isDirty(root, relDir);
    const chosen = !gitMs
      ? mtimeMs
      : dirty
        ? Math.max(gitMs, mtimeMs)
        : gitMs;
    if (chosen) dates[ent.name] = new Date(chosen).toISOString();
  }

  return dates;
}

/** Last-updated timestamps for each `src/experiments/*` folder. */
export function experimentDatesPlugin(): Plugin {
  let root = process.cwd();

  return {
    name: "experiment-dates",
    configResolved(config) {
      root = config.root;
    },
    resolveId(id) {
      if (id === VIRTUAL_ID) return RESOLVED_ID;
    },
    load(id) {
      if (id !== RESOLVED_ID) return;
      return `export default ${JSON.stringify(collectExperimentDates(root), null, 2)};`;
    },
    configureServer(server) {
      server.watcher.add(join(root, "src/experiments"));
    },
    handleHotUpdate({ file, server }) {
      const experimentsDir = join(root, "src/experiments");
      if (!file.startsWith(experimentsDir)) return;
      const mod = server.moduleGraph.getModuleById(RESOLVED_ID);
      if (!mod) return;
      server.moduleGraph.invalidateModule(mod);
      return [...mod.importers, mod];
    },
  };
}
