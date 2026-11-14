import { createFileRoute, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/workspace/catalogo/colecoes")({
  component: WorkspaceCollectionsLayout,
});

function WorkspaceCollectionsLayout() {
  return <Outlet />;
}
