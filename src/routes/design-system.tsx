import { createFileRoute } from "@tanstack/react-router";
import { DS4Showcase } from "@/components/design-system/ds4-showcase";

export const Route = createFileRoute("/design-system")({
  head: () => ({
    meta: [{ title: "Waesy Design System 4.0 | Documentação Viva" }],
  }),
  component: DesignSystemOfficialPage,
});

function DesignSystemOfficialPage() {
  return (
    <div className="min-h-screen bg-background text-foreground p-4 md:p-8">
      <header className="max-w-6xl mx-auto pb-6 border-b border-border/50 mb-6">
        <div className="flex items-center gap-3">
          <div className="size-11 rounded-lg bg-primary flex items-center justify-center text-primary-foreground font-bold text-lg shadow-xs">
            W
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-foreground">
              Waesy Design System 4.0
            </h1>
            <p className="text-xs text-muted-foreground">
              Documentação Oficial Viva • Primitivos, Dados, Turismo, Copilot & Shells
            </p>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto">
        <DS4Showcase />
      </main>
    </div>
  );
}
