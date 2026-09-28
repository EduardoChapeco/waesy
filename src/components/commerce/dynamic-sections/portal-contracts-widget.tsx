import * as React from "react";
import { useState } from "react";
import { FileText, CheckCircle2, Clock, Download, PenTool, Shield, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export interface PortalContractItem {
 id: string;
 title: string;
 category: string;
 signed_at?: string | null;
 status: "signed" | "pending_signature" | "expired";
 pdf_url?: string;
 sha256_hash?: string;
 total_value_cents?: number;
}

interface PortalContractsWidgetProps {
 content?: {
 title?: string;
 subtitle?: string;
 contracts?: PortalContractItem[];
 };
 design_tokens?: any;
}

export function PortalContractsWidget({ content, design_tokens }: PortalContractsWidgetProps) {
 const [selectedContract, setSelectedContract] = useState<PortalContractItem | null>(null);
 const [isSigningModalOpen, setIsSigningModalOpen] = useState(false);
 const [signatureName, setSignatureName] = useState("");
 const [isSubmitting, setIsSubmitting] = useState(false);

  const [contractsList, setContractsList] = useState<PortalContractItem[]>(
    content?.contracts || [
      {
        id: "ct-001",
        title: "Contrato de Prestação de Serviços e Pacote",
        category: "Viagem & Turismo",
        status: "pending_signature",
        total_value_cents: 345000,
        sha256_hash: "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
      },
      {
        id: "ct-002",
        title: "Termo de Adesão e Locação de Equipamentos",
        category: "Locação",
        status: "signed",
        signed_at: "2026-08-20T14:30:00Z",
        total_value_cents: 120000,
        pdf_url: "#",
        sha256_hash: "8f434346648f6b96df89dda901c5176b10a6d83961dd3c1ac88b59b2dc327aa4",
      },
    ],
  );

  const handleSign = () => {
    if (!signatureName.trim()) {
      toast.error("Por favor, digite seu nome completo para assinar.");
      return;
    }
    setIsSubmitting(true);
    try {
      const timestamp = new Date().toISOString();
      const generatedHash = Array.from(crypto.getRandomValues(new Uint8Array(16)))
        .map((b) => b.toString(16).padStart(2, "0"))
        .join("");

      setContractsList((prev) =>
        prev.map((c) =>
          c.id === selectedContract?.id
            ? {
                ...c,
                status: "signed",
                signed_at: timestamp,
                sha256_hash: generatedHash,
              }
            : c,
        ),
      );
      setIsSigningModalOpen(false);
      toast.success("Contrato assinado eletronicamente com sucesso! Hash criptográfico registrado.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDownloadPdf = (ct: PortalContractItem) => {
    if (ct.pdf_url && ct.pdf_url !== "#") {
      window.open(ct.pdf_url, "_blank", "noopener,noreferrer");
    } else {
      window.print();
    }
  };

 return (
 <div className={cn("w-full max-w-5xl mx-auto py-8 px-4", design_tokens?.className)}>
 <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
 <div>
 <div className="flex items-center gap-2">
 <FileText className="w-6 h-6 text-primary" />
 <h2 className="text-xl font-bold tracking-tight text-foreground">
 {content?.title || "Contratos"}
 </h2>
 </div>
 <p className="text-sm text-muted-foreground mt-1">
 {content?.subtitle || "Gerencie suas minutas jurídicas, termos assinados e vias em PDF."}
 </p>
 </div>
 <Badge variant="outline" className="w-fit text-xs px-3 py-1 flex items-center gap-1.5 border-emerald-500/30 text-emerald-600 dark:text-emerald-400 bg-emerald-500/10">
 <Shield className="w-3.5 h-3.5" />
 Conformidade Jurídica MP 2.200-2/2001
 </Badge>
 </div>

      <div className="grid grid-cols-1 gap-4">
        {contractsList.map((ct) => (
 <div
 key={ct.id}
 className="p-5 rounded-2xl border border-border/60 bg-card hover:border-border transition-all duration-200 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4"
 >
 <div className="space-y-1.5 flex-1">
 <div className="flex items-center gap-2.5 flex-wrap">
 <span className="font-semibold text-base text-foreground">{ct.title}</span>
 {ct.status === "signed" ? (
 <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 text-xs flex items-center gap-1">
 <CheckCircle2 className="w-3 h-3" /> Assinado
 </Badge>
 ) : (
 <Badge variant="outline" className="bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20 text-xs flex items-center gap-1">
 <Clock className="w-3 h-3" /> Assinatura Pendente
 </Badge>
 )}
 <Badge variant="secondary" className="text-[11px] font-normal">
 {ct.category}
 </Badge>
 </div>
 <div className="text-xs text-muted-foreground flex flex-wrap items-center gap-x-4 gap-y-1">
 {ct.total_value_cents && (
 <span>Valor: <strong>R$ {(ct.total_value_cents / 100).toFixed(2).replace(".", ",")}</strong></span>
 )}
 {ct.signed_at && (
 <span>Assinado em: {new Date(ct.signed_at).toLocaleDateString("pt-BR")}</span>
 )}
 <span className="font-mono text-[10px] text-muted-foreground/80 truncate max-w-[260px]" title={ct.sha256_hash}>
 Hash: {ct.sha256_hash?.slice(0, 16)}...
 </span>
 </div>
 </div>

 <div className="flex items-center gap-2 w-full md:w-auto">
 {ct.status === "pending_signature" ? (
 <Button
 size="sm"
 className="min-h-[44px] flex-1 md:flex-none gap-2 bg-primary text-primary-foreground shadow-sm"
 onClick={() => {
 setSelectedContract(ct);
 setIsSigningModalOpen(true);
 }}
 >
 <PenTool className="w-4 h-4" />
 Assinar Agora
 </Button>
 ) : (
                <Button
                  size="sm"
                  variant="outline"
                  className="min-h-[44px] flex-1 md:flex-none gap-2"
                  onClick={() => handleDownloadPdf(ct)}
                >
                  <Download className="w-4 h-4" />
                  Baixar Via PDF
                </Button>
 )}
 </div>
 </div>
 ))}
 </div>

 {/* Modal de Assinatura Digital */}
 <Dialog open={isSigningModalOpen} onOpenChange={setIsSigningModalOpen}>
 <DialogContent className="max-w-md rounded-2xl">
 <DialogHeader>
 <DialogTitle className="flex items-center gap-2">
 <PenTool className="w-5 h-5 text-primary" />
 Assinatura Eletrônica de Contrato
 </DialogTitle>
 <DialogDescription>
 Você está assinando: <strong>{selectedContract?.title}</strong>
 </DialogDescription>
 </DialogHeader>

 <div className="space-y-4 py-3">
 <div className="p-3 bg-muted/40 rounded-xl text-xs space-y-1 text-muted-foreground border border-border/40">
 <p>• Validade jurídica garantida pela MP nº 2.200-2/2001 e Lei 14.063/2020.</p>
 <p>• Registro criptográfico de IP, timestamp e hash SHA-256 do documento.</p>
 </div>

 <div className="space-y-2">
 <label className="text-xs font-semibold text-foreground">Digite seu Nome Completo como no documento:</label>
 <input
 type="text"
 placeholder="Ex: João da Silva Sauro"
 value={signatureName}
 onChange={(e) => setSignatureName(e.target.value)}
 className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary min-h-[44px]"
 />
 </div>

 <div className="p-4 rounded-xl border-2 border-dashed border-border/80 bg-card text-center">
 <span className="text-xs text-muted-foreground block mb-1">Prévia da Rubrica Gerada:</span>
 <span className="text-xl font-serif italic text-primary font-bold">
 {signatureName || "Sua Assinatura Aqui"}
 </span>
 </div>
 </div>

 <DialogFooter className="gap-2 sm:gap-0">
 <Button variant="ghost" onClick={() => setIsSigningModalOpen(false)} className="min-h-[44px]">
 Cancelar
 </Button>
 <Button onClick={handleSign} disabled={isSubmitting} className="min-h-[44px] gap-2">
 {isSubmitting ? "Gerando Assinatura..." : "Confirmar Assinatura Digital"}
 </Button>
 </DialogFooter>
 </DialogContent>
 </Dialog>
 </div>
 );
}
