import { createFileRoute } from "@tanstack/react-router";
import { GhostCatcher } from "@/game/GhostCatcher";

export const Route = createFileRoute("/")({
  component: Home,
});

function Home() {
  return <GhostCatcher />;
}
