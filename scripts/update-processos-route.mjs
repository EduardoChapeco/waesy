import fs from 'fs';
import path from 'path';

const filePath = path.resolve('src/routes/_store.conta.processos.tsx');
let content = fs.readFileSync(filePath, 'utf-8');

// 1. Add imports if not present
if (!content.includes('harvestDataJudProcessFn')) {
  content = content.replace(
    'createJusDemand,',
    'createJusDemand,\n  harvestDataJudProcessFn,'
  );
  console.log('harvestDataJudProcessFn import added');
}

if (!content.includes('useQueryClient')) {
  content = content.replace(
    'import { useQuery } from "@tanstack/react-query";',
    'import { useQuery, useQueryClient } from "@tanstack/react-query";\nimport { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";\nimport { Input } from "@/components/ui/input";'
  );
  console.log('useQueryClient, Dialog, Input imports added');
}

if (!content.includes('Spinner')) {
  content = content.replace(
    'ArrowSquareOut,',
    'ArrowSquareOut,\n  Spinner,'
  );
  console.log('Spinner icon added');
}

// 2. Add state and handler for CNJ track modal
const stateAnchor = 'const [isPending, startTransition] = useTransition();';
const trackState = `const [isPending, startTransition] = useTransition();
  const queryClient = useQueryClient();
  const [isTrackModalOpen, setIsTrackModalOpen] = useState(false);
  const [cnjInput, setCnjInput] = useState("");
  const [isTracking, setIsTracking] = useState(false);

  const handleTrackLawsuit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cnjInput.trim()) {
      toast.error("Informe o número CNJ do processo");
      return;
    }

    setIsTracking(true);
    try {
      const res = await harvestDataJudProcessFn({
        data: {
          process_number: cnjInput.trim(),
        },
      });

      toast.success(res.message || "Processo sincronizado com sucesso!");
      queryClient.invalidateQueries({ queryKey: ["jus_lawsuits_user"] });
      setIsTrackModalOpen(false);
      setCnjInput("");
    } catch (err: any) {
      toast.error(err?.message || "Erro ao consultar processo no DataJud");
    } finally {
      setIsTracking(false);
    }
  };`;

if (!content.includes('isTrackModalOpen')) {
  content = content.replace(stateAnchor, trackState);
  console.log('Tracking modal state added');
}

// 3. Add "Rastrear CNJ" button to header
const headerButtonAnchor = `<Button
          size="sm"
          onClick={() => setActiveTab(activeTab === "new_demand" ? "lawsuits" : "new_demand")}`;

const newHeaderButtons = `<div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => setIsTrackModalOpen(true)}
            className="rounded-xl h-8 px-3 text-xs font-semibold gap-1.5 shrink-0 shadow-xs cursor-pointer border-border/80"
          >
            <MagnifyingGlass className="size-3.5" />
            <span>Rastrear CNJ</span>
          </Button>

          <Button
            size="sm"
            onClick={() => setActiveTab(activeTab === "new_demand" ? "lawsuits" : "new_demand")}`;

if (!content.includes('Rastrear CNJ')) {
  content = content.replace(headerButtonAnchor, newHeaderButtons);
  // close the div
  content = content.replace(
    '<span>{activeTab === "new_demand" ? "Ver Processos" : "Solicitar Advogado"}</span>\n        </Button>',
    '<span>{activeTab === "new_demand" ? "Ver Processos" : "Solicitar Advogado"}</span>\n        </Button>\n        </div>'
  );
  console.log('Header buttons updated with Rastrear CNJ');
}

// 4. Append Dialog to bottom of component before closing div
const dialogMarkup = `
      {/* Modal de Rastreamento de Processo CNJ DataJud */}
      <Dialog open={isTrackModalOpen} onOpenChange={setIsTrackModalOpen}>
        <DialogContent className="sm:max-w-md rounded-2xl bg-card border border-border/60">
          <DialogHeader>
            <div className="flex items-center gap-2 mb-1">
              <span className="p-2 rounded-xl bg-primary/10 text-primary">
                <Scales className="size-5" />
              </span>
              <DialogTitle className="text-base sm:text-lg font-bold">
                Rastrear Processo Judicial
              </DialogTitle>
            </div>
            <DialogDescription className="text-xs text-muted-foreground">
              Digite o número único CNJ padronizado (20 dígitos). O Waesy consultará a base pública nacional do DataJud e sincronizará os andamentos em tempo real.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleTrackLawsuit} className="space-y-4 py-2">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-foreground">
                Número do Processo (CNJ)
              </label>
              <Input
                placeholder="Ex: 0001234-56.2024.8.24.0067"
                value={cnjInput}
                onChange={(e) => setCnjInput(e.target.value)}
                className="font-mono text-xs rounded-xl h-10"
                required
              />
              <p className="text-[11px] text-muted-foreground">
                Suporta Tribunais Estaduais (TJSC, TJSP, etc.), Federais (TRFs) e do Trabalho (TRTs).
              </p>
            </div>

            <DialogFooter className="gap-2 sm:gap-0 pt-2">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setIsTrackModalOpen(false)}
                className="rounded-xl text-xs h-9 cursor-pointer"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={isTracking || !cnjInput.trim()}
                className="rounded-xl text-xs h-9 font-semibold gap-1.5 cursor-pointer"
              >
                {isTracking ? (
                  <Spinner className="size-3.5 animate-spin" />
                ) : (
                  <MagnifyingGlass className="size-3.5" />
                )}
                Sincronizar DataJud
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}`;

content = content.replace(/\s*<\/div>\s*\);\s*\}\s*$/, dialogMarkup);
fs.writeFileSync(filePath, content, 'utf-8');
console.log('_store.conta.processos.tsx successfully updated!');
