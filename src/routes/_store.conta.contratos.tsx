/**
 * _store.conta.contratos.tsx — Meus Contratos & Certificados (Plataforma Waesy)
 * Exibe todos os contratos assinados pelo usuário com hash de certificado e status de auditoria.
 * Paradigma Apple HIG Clean — alvos 44px, fonte Inter, sem AI-smell.
 * [REQ-11] — Portal de Contratos do Usuário
 */

import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowLeft,
  FileText,
  CheckCircle2,
  Clock,
  ShieldCheck,
  Hash,
  ExternalLink,
  Building2,
  AlertCircle,
} from "lucide-react";
import { listMySignedContracts, type SignedContractDTO } from "@/services/personal-finance.functions";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_store/conta/contratos")({
  head: () => ({ meta: [{ title: "Meus Contratos | Waesy" }] }),
  loader: async (): Promise<{ contracts: SignedContractDTO[] }> => {
    try {
      const contracts = await listMySignedContracts();
      return { contracts };
    } catch {
      return { contracts: [] };
    }
  },
  component: MyContractsPage,
});

function statusLabel(status: string) {
  switch (status) {
    case "signed":
      return { label: "Assinado", color: "text-emerald-600 dark:text-emerald-400", bg: "bg-emerald-500/10", icon: CheckCircle2 };
    case "pending":
      return { label: "Aguardando assinatura", color: "text-amber-600 dark:text-amber-400", bg: "bg-amber-500/10", icon: Clock };
    case "expired":
      return { label: "Expirado", color: "text-rose-600 dark:text-rose-400", bg: "bg-rose-500/10", icon: AlertCircle };
    case "revoked":
      return { label: "Revogado", color: "text-rose-600 dark:text-rose-400", bg: "bg-rose-500/10", icon: AlertCircle };
    default:
      return { label: status, color: "text-muted-foreground", bg: "bg-muted", icon: FileText };
  }
}

function MyContractsPage() {
  const { contracts } = ((Route.useLoaderData?.() as any) || {});

  return (
    <div className="w-full max-w-5xl mx-auto space-y-4 sm:space-y-6 pb-20 px-0 sm:px-4 md:px-0">
      {/* ── 1. Clean Minimalist Header ── */}
      <div className="flex items-center justify-between gap-4 border-b border-border/40 pb-4 pt-1">
        <div className="flex items-center gap-3">
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
            Contratos
          </h1>
          {contracts.length > 0 && (
            <Badge variant="secondary" className="text-xs font-mono font-bold px-2 py-0.5 rounded-full">
              {contracts.length}
            </Badge>
          )}
        </div>

        <Button asChild size="sm" variant="outline" className="rounded-xl text-xs font-semibold h-8 px-3.5 cursor-pointer">
          <Link to="/mercado">Explorar Serviços</Link>
        </Button>
      </div>

        {/* Informativo de Auditoria */}
        <div className="flex items-start gap-3 p-4 rounded-2xl border border-border/60 bg-card shadow-xs">
          <div className="h-9 w-9 shrink-0 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <div className="space-y-0.5">
            <div className="text-sm font-semibold text-foreground">Ledger de Contratos Imutável</div>
            <p className="text-xs text-muted-foreground">
              Cada contrato assinado gera um certificado criptográfico SHA-256 armazenado de forma permanente.
              Contratos não podem ser excluídos após a assinatura — fazem parte do registro de auditoria.
            </p>
          </div>
        </div>

        {/* Lista de Contratos */}
        {contracts.length === 0 ? (
          <div className="bg-card border border-border/60 rounded-2xl p-8 sm:p-12 text-center space-y-3 shadow-xs">
            <div className="h-12 w-12 rounded-2xl bg-muted flex items-center justify-center mx-auto text-muted-foreground">
              <FileText className="h-6 w-6" />
            </div>
            <h3 className="font-semibold text-base text-foreground">Nenhum contrato assinado</h3>
            <p className="text-xs sm:text-sm text-muted-foreground max-w-sm mx-auto">
              Contratos que você assinar aparecerão aqui com seus certificados digitais.
            </p>
          </div>
        ) : (
          <div className="bg-card border border-border/60 rounded-2xl overflow-hidden shadow-xs divide-y divide-border/40">
            {contracts.map((contract: any) => {
              const { label, color, bg, icon: StatusIcon } = statusLabel(contract.status);
              const signedDate = contract.signedAt
                ? new Date(contract.signedAt).toLocaleDateString("pt-BR", {
                    day: "2-digit",
                    month: "long",
                    year: "numeric",
                  })
                : null;

              return (
                <div
                  key={contract.id}
                  className="p-4 sm:p-5 space-y-3 hover:bg-muted/20 transition-colors"
                >
                  {/* Título & Badge */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="h-10 w-10 shrink-0 rounded-xl bg-muted flex items-center justify-center text-muted-foreground">
                        <FileText className="h-5 w-5" />
                      </div>
                      <div className="min-w-0">
                        <div className="font-semibold text-sm sm:text-base text-foreground truncate">
                          {contract.title}
                        </div>
                        {contract.storeName && (
                          <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-0.5">
                            <Building2 className="h-3 w-3 shrink-0" />
                            <span className="truncate">{contract.storeName}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    <div
                      className={cn(
                        "inline-flex items-center gap-1.5 h-6 px-2.5 rounded-full text-xs font-semibold shrink-0",
                        bg,
                        color
                      )}
                    >
                      <StatusIcon className="h-3 w-3" />
                      {label}
                    </div>
                  </div>

                  {/* Metadados */}
                  <div className="space-y-1.5 pl-13">
                    {signedDate && (
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                        <span>Assinado em {signedDate}</span>
                      </div>
                    )}

                    {contract.certificateHash && (
                      <div className="flex items-start gap-2 text-xs text-muted-foreground">
                        <Hash className="h-3.5 w-3.5 shrink-0 mt-0.5 text-primary/60" />
                        <div className="space-y-0.5 min-w-0">
                          <span className="font-medium text-foreground/70">Certificado SHA-256</span>
                          <div className="font-mono text-[10px] text-muted-foreground/60 break-all leading-relaxed bg-muted/60 px-2 py-1 rounded-lg">
                            {contract.certificateHash}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Ações */}
                  <div className="flex items-center gap-2 pt-1">
                    <Link
                      to="/contrato/$token"
                      params={{ token: contract.id }}
                      className="inline-flex items-center gap-1.5 h-9 px-4 rounded-xl text-xs font-medium bg-muted hover:bg-muted/80 text-foreground transition-colors"
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                      Ver Contrato
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
  );
}
