import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "@fontsource-variable/inter";
import "@fontsource/space-grotesk/500.css";
import "./styles/index.css";
import { App } from "./App";
import { CloudGate } from "./components/cloud/CloudGate";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    {/* A chave muda quando chegam dados de outro aparelho: o app relê tudo. */}
    <CloudGate>{(generation) => <App key={generation} />}</CloudGate>
  </StrictMode>,
);
