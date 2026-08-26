import { Routes, Route } from "react-router-dom";
import lastUpdated from "virtual:experiment-dates";
import Landing, { type ExperimentMeta } from "./landing/Landing";

const modules = import.meta.glob<{
  default: React.ComponentType;
  meta: ExperimentMeta;
}>("./experiments/*/index.tsx", { eager: true });

const experiments = Object.entries(modules).map(([id, m]) => {
  const folder = id.match(/\/experiments\/([^/]+)\//)?.[1];
  return {
    ...m.meta,
    date: (folder && lastUpdated[folder]) || m.meta.date,
    Component: m.default,
  };
});

function App() {
  return (
    <Routes>
      <Route path="/" element={<Landing experiments={experiments} />} />
      {experiments.map((exp) => (
        <Route key={exp.path} path={exp.path} element={<exp.Component />} />
      ))}
    </Routes>
  );
}

export default App;
