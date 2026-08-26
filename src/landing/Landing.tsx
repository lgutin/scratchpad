import { useLayoutEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";

import { Card, CardHeader, CardTitle } from "../components/ui/card";
import "./landing.css";

export type ExperimentMeta = {
  title: string;
  path: string;
  date?: string;
  description?: string;
};

type ExternalLink = {
  title: string;
  /** External URL the card links to (opens in a new tab). */
  url: string;
  /** ISO YYYY-MM-DD — last-updated date on GitHub. */
  date?: string;
  /** Gist filename, shown subdued before the external-link arrow. */
  filename?: string;
};

// Hosted prototype demos (external GitHub Pages sites). Dates are each repo's last-updated (push)
// date on GitHub, matched by Pages hostname:
//   • Subcontractor Management → servicetitan/jpm-components-mfe
//   • Fire Life Safety Demo    → servicetitan/fls-demo
//   • Comm+ Sales Demo         → servicetitan/comm-plus-demos
const PROTOTYPES: ExternalLink[] = [
  {
    title: "Subcontractor Management",
    url: "https://friendly-carnival-389vqek.pages.github.io/",
    date: "2026-08-25T22:46:31Z",
  },
  {
    title: "Fire Life Safety Sales Demo",
    url: "https://fuzzy-fishstick-626z5om.pages.github.io/start",
    date: "2026-07-20T13:21:25Z",
  },
  {
    title: "Comm+ Sales Demo",
    url: "https://studious-doodle-p3ze3y9.pages.github.io/",
    date: "2026-06-10T16:29:38Z",
  },
];

// GitHub gists (lgutin). Dates are each gist's last-updated timestamp.
const GISTS: ExternalLink[] = [
  {
    title: "Project shell",
    filename: "PROJECT_SHELL.md",
    url: "https://gist.github.com/lgutin/5ee8a6fe2e44c87a39922837da851438",
    date: "2026-08-24T15:18:22Z",
  },
  {
    title: "Nav shell",
    filename: "NAV_SHELL.md",
    url: "https://gist.github.com/lgutin/db4743c9c9ca86ce4d6cf43e77c3838e",
    date: "2026-08-24T15:15:23Z",
  },
  {
    title: "Code Prototyping Handoff: Setup Guide",
    filename: "code-handoff.md",
    url: "https://gist.github.com/lgutin/30737e17c30b3dc259bb7ad677201456",
    date: "2026-08-24T15:10:02Z",
  },
  {
    title: "Subcontractor UI Sync",
    filename: "SKILL.md",
    url: "https://gist.github.com/lgutin/b3684c3857d79fd296bcf51319fad5b6",
    date: "2026-08-26T15:18:51Z",
  },
  {
    title: "Subcontractor Management Prototype",
    filename: "CLAUDE.md",
    url: "https://gist.github.com/lgutin/3d1f000e4141f10a84fcec2bff8b5229",
    date: "2026-08-26T15:19:29Z",
  },
];

// Thumbnail preview aspect ratio (matches the Figma card image area).
const THUMB_RATIO = 391 / 261;
// Width we render the experiment at inside the iframe before scaling down.
const FRAME_WIDTH = 1200;
const FRAME_HEIGHT = Math.round(FRAME_WIDTH / THUMB_RATIO);

function dateValue(date?: string) {
  if (!date) return 0;
  const d = new Date(date.includes("T") ? date : `${date}T00:00:00`);
  return Number.isNaN(d.getTime()) ? 0 : d.getTime();
}

function formatDate(date?: string) {
  if (!date) return "";
  // `date` may be a plain ISO date (YYYY-MM-DD) or a full ISO datetime used for
  // finer-grained sort ordering. Only the date portion is ever displayed.
  const d = new Date(date.includes("T") ? date : `${date}T00:00:00`);
  if (Number.isNaN(d.getTime())) return date;
  return d.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

/**
 * Renders a live, scaled-down preview of an experiment route inside an iframe.
 * The iframe renders at FRAME_WIDTH and is scaled to fit the card, so the
 * thumbnail always reflects the real experiment.
 */
function Thumbnail({ src, title }: { src: string; title: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const update = () => setScale(el.clientWidth / FRAME_WIDTH);
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className="relative w-full overflow-hidden bg-[#eef0f2]"
      style={{ aspectRatio: `${391} / ${261}` }}
    >
      <iframe
        src={src}
        title={`${title} preview`}
        tabIndex={-1}
        aria-hidden="true"
        scrolling="no"
        loading="lazy"
        style={{
          width: FRAME_WIDTH,
          height: FRAME_HEIGHT,
          border: 0,
          transform: `scale(${scale})`,
          transformOrigin: "top left",
          pointerEvents: "none",
          opacity: scale ? 1 : 0,
          transition: "opacity 0.2s ease",
        }}
      />
    </div>
  );
}

function ExternalLinkSection({
  heading,
  items,
}: {
  heading: string;
  items: ExternalLink[];
}) {
  const sorted = [...items].sort((a, b) => dateValue(b.date) - dateValue(a.date));
  return (
    <section className="mt-16">
      <h2 className="mb-6 text-2xl font-bold tracking-tight">{heading}</h2>
      <div className="flex flex-col gap-3">
        {sorted.map((item) => (
          <a
            key={item.url}
            href={item.url}
            target="_blank"
            rel="noreferrer"
            className="group block rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/30"
          >
            <Card className="flex-row items-center justify-between gap-4 rounded-lg px-6 py-4 shadow-sm transition duration-200 group-hover:shadow-md">
              <CardTitle className="flex min-w-0 items-center gap-1.5 text-base font-semibold leading-6">
                <span className="truncate">{item.title}</span>
                {item.filename ? (
                  <span className="text-muted-foreground/80 shrink-0 text-sm font-normal">
                    {item.filename}
                  </span>
                ) : null}
                <svg
                  className="text-muted-foreground/60 size-3.5 shrink-0 transition group-hover:text-current"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <path d="M7 17 17 7M8 7h9v9" />
                </svg>
              </CardTitle>
              {item.date ? (
                <div className="text-muted-foreground/80 shrink-0 text-xs">
                  {formatDate(item.date)}
                </div>
              ) : null}
            </Card>
          </a>
        ))}
      </div>
    </section>
  );
}

export default function Landing({
  experiments,
}: {
  experiments: ExperimentMeta[];
}) {
  const sorted = [...experiments].sort(
    (a, b) => dateValue(b.date) - dateValue(a.date)
  );
  const base = import.meta.env.BASE_URL;

  return (
    <div className="pg-landing">
      <div className="mx-auto max-w-[1200px] px-6 py-14">
        <header className="mb-10">
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
            Scratchpad
          </h1>
        </header>

        <h2 className="mb-6 text-2xl font-bold tracking-tight">Experiments</h2>
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {sorted.map((exp) => (
            <Link
              key={exp.path}
              to={exp.path}
              className="group block rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/30"
            >
              <Card className="h-full gap-0 overflow-hidden rounded-lg py-0 shadow-sm transition duration-200 group-hover:shadow-md">
                <Thumbnail
                  src={`${base}${exp.path.replace(/^\//, "")}`}
                  title={exp.title}
                />
                <CardHeader className="gap-1.5 p-6">
                  <CardTitle className="text-base font-semibold leading-6">
                    {exp.title}
                  </CardTitle>
                  <div className="text-muted-foreground text-sm leading-5">
                    {exp.description}
                  </div>
                  <div className="text-muted-foreground/80 mt-1 text-xs">
                    {formatDate(exp.date)}
                  </div>
                </CardHeader>
              </Card>
            </Link>
          ))}
        </div>

        <ExternalLinkSection heading="Prototypes" items={PROTOTYPES} />
        <ExternalLinkSection heading="Gists" items={GISTS} />
      </div>
    </div>
  );
}
