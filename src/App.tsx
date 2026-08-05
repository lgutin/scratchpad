import { Routes, Route } from "react-router-dom";
import Landing, { type ExperimentMeta } from "./landing/Landing";

const modules = import.meta.glob<{
  default: React.ComponentType;
  meta: ExperimentMeta;
}>("./experiments/*/index.tsx", { eager: true });

const experiments = Object.values(modules).map((m) => ({
  ...m.meta,
  Component: m.default,
}));

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
