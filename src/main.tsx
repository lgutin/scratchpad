import { createRoot } from "react-dom/client";
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

createRoot(document.getElementById("root")!).render(
  <BrowserRouter basename={import.meta.env.BASE_URL}>
    <AnvilProvider themeData={{ mode: "light" }}>
      <App />
      {import.meta.env.DEV && <DevAgentation />}
    </AnvilProvider>
  </BrowserRouter>
);
