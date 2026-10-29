import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { GhostCatcher } from "@/game/GhostCatcher";
import "@/styles.css";

const root = document.getElementById("root");
if (root) {
  createRoot(root).render(
    <StrictMode>
      <GhostCatcher />
    </StrictMode>,
  );
}
