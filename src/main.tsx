import { createRoot, type Root } from "react-dom/client";
import { BrowserRouter, useLocation } from "react-router-dom";
import { AnvilProvider } from "@servicetitan/anvil2";
import { Agentation } from "agentation";
import App from "./App";

function inIframe() {
  try {
    return window.self !== window.top;
  } catch {
    return true;
  }
}

// Agentation (dev-only) is hidden on the landing page and inside the landing's
// preview iframes, but stays available on real experiment pages.
function DevAgentation() {
  const { pathname } = useLocation();
  if (inIframe() || pathname === "/") return null;
  return <Agentation endpoint="http://localhost:4747" />;
}

// Reuse a single root across HMR updates so React doesn't warn about calling
// createRoot() twice on the same container.
const container = document.getElementById("root")!;
const globalForRoot = globalThis as typeof globalThis & { __appRoot?: Root };
const root = (globalForRoot.__appRoot ??= createRoot(container));

root.render(
  <BrowserRouter basename={import.meta.env.BASE_URL}>
    <AnvilProvider themeData={{ mode: "light" }}>
      <App />
      {import.meta.env.DEV && <DevAgentation />}
    </AnvilProvider>
  </BrowserRouter>
);
