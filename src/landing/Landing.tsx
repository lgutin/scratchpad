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

// Thumbnail preview aspect ratio (matches the Figma card image area).
const THUMB_RATIO = 391 / 261;
// Width we render the experiment at inside the iframe before scaling down.
const FRAME_WIDTH = 1200;
const FRAME_HEIGHT = Math.round(FRAME_WIDTH / THUMB_RATIO);

function formatDate(date?: string) {
  if (!date) return "";
  const d = new Date(`${date}T00:00:00`);
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

export default function Landing({
  experiments,
}: {
  experiments: ExperimentMeta[];
}) {
  const sorted = [...experiments].sort((a, b) =>
    (b.date ?? "").localeCompare(a.date ?? "")
  );
  const base = import.meta.env.BASE_URL;

  return (
    <div className="pg-landing">
      <div className="mx-auto max-w-[1200px] px-6 py-14">
        <header className="mb-10">
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
            Component Playground
          </h1>
        </header>

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
      </div>
    </div>
  );
}
