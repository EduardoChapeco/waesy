import { createFileRoute, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/_store/agendar")({
 component: AgendarLayout,
});

function AgendarLayout() {
 return (
 <div className="min-h-[100dvh] bg-muted/20">
 <Outlet />
 </div>
 );
}
