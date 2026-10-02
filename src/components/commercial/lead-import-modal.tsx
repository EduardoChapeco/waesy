import { useState } from "react";
import { toast } from "sonner";
import { Upload, FileText, AlertCircle, CheckCircle2, Users, ArrowRight, Download, X } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { batchImportLeads } from "@/services/crm.functions";

interface ParsedLead {
  fullName: string;
  phone?: string;
  email?: string;
  destination?: string;
  estimatedValue?: number;
  passengerCount?: number;
}

interface LeadImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function LeadImportModal({ isOpen, onClose, onSuccess }: LeadImportModalProps) {
  const [rawText, setRawText] = useState("");
  const [parsedLeads, setParsedLeads] = useState<ParsedLead[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [step, setStep] = useState<"paste" | "preview">("paste");

  const handleParse = () => {
    if (!rawText.trim()) {
      toast.error("Insira o conteúdo CSV ou texto antes de continuar.");
      return;
    }

    const lines = rawText.split("\n").filter((l) => l.trim().length > 0);
    const leads: ParsedLead[] = [];

    lines.forEach((line, index) => {
      // Pula cabeçalho se houver
      if (index === 0 && (line.toLowerCase().includes("nome") || line.toLowerCase().includes("name"))) {
        return;
      }

      const parts = line.split(/[;,|\t]/).map((p) => p.trim().replace(/^["']|["']$/g, ""));
      if (parts.length >= 1 && parts[0]) {
        const fullName = parts[0];
        const phone = parts.length > 1 ? parts[1] : undefined;
        const email = parts.length > 2 && parts[2].includes("@") ? parts[2] : undefined;
        const destination = parts.length > 3 ? parts[3] : undefined;
        const valStr = parts.length > 4 ? parts[4].replace(/[^0-9.,]/g, "").replace(",", ".") : "0";
        const estimatedValue = Math.round((parseFloat(valStr) || 0) * 100);
        const paxStr = parts.length > 5 ? parts[5] : "1";
        const passengerCount = parseInt(paxStr, 10) || 1;

        leads.push({
          fullName,
          phone,
          email,
          destination,
          estimatedValue,
          passengerCount,
        });
      }
    });

    if (leads.length === 0) {
      toast.error("Nenhum contato válido foi identificado na formatação.");
      return;
    }

    setParsedLeads(leads);
    setStep("preview");
  };

  const handleConfirmImport = async () => {
    if (parsedLeads.length === 0) return;
    setIsProcessing(true);
    try {
      const payload = parsedLeads.map((l) => ({
        fullName: l.fullName,
        email: l.email || null,
        phone: l.phone || null,
        destination: l.destination || null,
        estimated_value_cents: l.estimatedValue || 0,
        passenger_count: l.passengerCount || 1,
        status: "new",
        acquisition_channel: "importacao_massa",
      }));

      await batchImportLeads({ data: { leads: payload } });
      toast.success(`${parsedLeads.length} leads importados com sucesso!`);
      setRawText("");
      setParsedLeads([]);
      setStep("paste");
      onSuccess();
      onClose();
    } catch (err: any) {
      toast.error(err?.message || "Erro ao importar lote de leads.");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <SheetContent side="right" size="wide" className="w-full sm:max-w-3xl md:max-w-4xl lg:max-w-[70vw] xl:max-w-[70vw] bg-card border-l border-border p-4 sm:p-6 overflow-y-auto flex flex-col justify-between">
        <div className="space-y-4">
          <SheetHeader className="space-y-1">
            <SheetTitle className="text-base font-bold text-foreground flex items-center gap-2">
              <Users className="size-4 text-primary" />
              Importação em Massa de Oportunidades e Leads
            </SheetTitle>
            <SheetDescription className="text-xs text-muted-foreground">
              Cole contatos no formato CSV ou colunas tabuladas (Nome, Telefone, E-mail, Destino, Valor Estimado, Qtd Passageiros).
            </SheetDescription>
          </SheetHeader>

          {step === "paste" ? (
            <div className="space-y-4 py-2">
              <div className="bg-muted/40 p-3 rounded-lg border border-border/80 text-[11px] font-mono text-muted-foreground space-y-1">
                <p className="font-bold text-foreground">Exemplo aceito (separado por vírgula, ponto-e-vírgula ou tab):</p>
                <p>Mariana Souza; (11) 98765-4321; mariana@email.com; Maceió; 4500; 2</p>
                <p>Carlos Eduardo; (49) 99123-4567; carlos@empresa.com; Gramado; 2800; 1</p>
              </div>

              <Textarea
                placeholder="Cole aqui as linhas de leads ou dados copiados de uma planilha..."
                value={rawText}
                onChange={(e) => setRawText(e.target.value)}
                rows={8}
                className="font-mono text-xs rounded-lg bg-background/50 border-border"
              />

              <div className="flex justify-between items-center text-xs text-muted-foreground">
                <span>Linhas detectadas: {rawText.split("\n").filter((l) => l.trim()).length}</span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    setRawText(
                      `João Paulo da Silva; (11) 99887-1122; joao@exemplo.com; Porto Seguro; 3200; 2\nAna Clara Santos; (48) 98877-3344; ana@exemplo.com; Santiago; 6500; 1\nRoberto Lima; (21) 97766-5544; roberto@exemplo.com; Cancún; 8900; 2`
                    )
                  }
                  className="text-[11px] h-7 rounded-lg"
                >
                  Carregar Exemplo
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-4 py-2">
              <div className="flex items-center justify-between">
                <Badge variant="secondary" className="text-xs font-bold rounded-lg px-3 py-1">
                  {parsedLeads.length} contatos prontos para o CRM
                </Badge>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setStep("paste")}
                  className="text-xs h-7 text-muted-foreground"
                >
                  Voltar à edição
                </Button>
              </div>

              <div className="max-h-64 overflow-y-auto rounded-lg border border-border divide-y divide-border/60 text-xs">
                {parsedLeads.map((lead, i) => (
                  <div key={i} className="p-3 flex items-center justify-between hover:bg-muted/30">
                    <div className="space-y-1">
                      <p className="font-bold text-foreground">{lead.fullName}</p>
                      <p className="text-[11px] text-muted-foreground">
                        {lead.phone || "Sem fone"} · {lead.email || "Sem e-mail"}
                      </p>
                    </div>
                    <div className="text-right space-y-1">
                      <span className="font-mono font-bold text-foreground">
                        R$ {((lead.estimatedValue || 0) / 100).toFixed(2)}
                      </span>
                      {lead.destination && (
                        <p className="text-[10px] text-muted-foreground uppercase">{lead.destination}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <SheetFooter className="gap-2 sm:gap-0 pt-4 border-t border-border">
          <Button variant="outline" onClick={onClose} disabled={isProcessing} className="rounded-lg min-h-11">
            Cancelar
          </Button>
          {step === "paste" ? (
            <Button onClick={handleParse} className="rounded-lg min-h-11 gap-2">
              Validar Contatos <ArrowRight className="size-4" />
            </Button>
          ) : (
            <Button
              onClick={handleConfirmImport}
              disabled={isProcessing}
              className="rounded-lg min-h-11 gap-2 bg-primary text-primary-foreground"
            >
              {isProcessing ? "Importando..." : `Confirmar e Gravar ${parsedLeads.length} Leads`}
            </Button>
          )}
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
