/**
 * _store.conta.contratos.tsx — Cofre Pessoal de Contratos & Certificados (Plataforma Waesy)
 * Exibe todos os contratos do usuário (assinados e pendentes), com reconciliação automática por CPF.
 * Paradigma Apple HIG Clean — alvos de 44px, fonte refinada, sem AI-smell.
 */

import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import {
  FileText,
  CheckCircle2,
  Clock,
  ShieldCheck,
  Hash,
  ExternalLink,
  Building2,
  AlertCircle,
  PenTool,
  Download,
  Filter,
} from "lucide-react";
import {
  listUserEnvelopesAndContracts,
  type UserContractVaultItemDTO,
} from "@/services/contracts.functions";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/datetime";

export const Route = createFileRoute("/_store/conta/contratos")({
  head: () => ({ meta: [{ title: "Meus Contratos | Waesy" }] }),
  loader: async (): Promise<{ contracts: UserContractVaultItemDTO[] }> => {
    try {
      const contracts = await listUserEnvelopesAndContracts();
      return { contracts };
    } catch (err) {
      console.error("[loader:_store.conta.contratos] Erro ao carregar contratos:", err);
      return { contracts: [] };
    }
  },
  component: MyContractsPage,
});

function MyContractsPage() {
  const { contracts = [] } = ((Route.useLoaderData?.() as any) || {});
  const [filterTab, setFilterTab] = useState<"all" | "signed" | "pending">("all");

  const filteredContracts = contracts.filter((c: UserContractVaultItemDTO) => {
    if (filterTab === "signed") return c.status === "signed";
    if (filterTab === "pending") return c.status === "pending";
    return true;
  });

  return (
    <div className="w-full max-w-5xl mx-auto space-y-4 sm:space-y-6 pb-20 px-0 sm:px-4 md:px-0 animate-in fade-in duration-200">
      {/* ── 1. Clean Minimalist Header ── */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-border/40 pb-4 pt-1">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
              Meus Contratos
            </h1>
            {contracts.length > 0 && (
              <Badge variant="secondary" className="text-xs font-mono font-bold px-2 py-0.5 rounded-full">
                {contracts.length}
              </Badge>
            )}
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            Cofre digital pessoal com validade jurídica nacional (MP 2.200-2/2001 e Lei 14.063/2020)
          </p>
        </div>

        {/* Filtros em Tabs */}
        <div className="flex items-center p-1 bg-muted rounded-xl text-xs">
          <button
            type="button"
            onClick={() => setFilterTab("all")}
            className={`px-3 py-1.5 rounded-lg transition-all font-medium ${
              filterTab === "all" ? "bg-card text-foreground font-semibold shadow-xs" : "text-muted-foreground"
            }`}
          >
            Todos ({contracts.length})
          </button>
          <button
            type="button"
            onClick={() => setFilterTab("signed")}
            className={`px-3 py-1.5 rounded-lg transition-all font-medium ${
              filterTab === "signed" ? "bg-card text-foreground font-semibold shadow-xs" : "text-muted-foreground"
            }`}
          >
            Assinados ({contracts.filter((c: any) => c.status === "signed").length})
          </button>
          <button
            type="button"
            onClick={() => setFilterTab("pending")}
            className={`px-3 py-1.5 rounded-lg transition-all font-medium ${
              filterTab === "pending" ? "bg-card text-foreground font-semibold shadow-xs" : "text-muted-foreground"
            }`}
          >
            Aguardando ({contracts.filter((c: any) => c.status === "pending").length})
          </button>
        </div>
      </div>

      {/* Informativo de Auditoria Imutável */}
      <div className="flex items-start gap-3 p-4 rounded-2xl border border-border/60 bg-card shadow-xs">
        <div className="h-9 w-9 shrink-0 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
          <ShieldCheck className="h-5 w-5" />
        </div>
        <div className="space-y-0.5">
          <div className="text-sm font-semibold text-foreground">Cofre Criptográfico Permanente</div>
          <p className="text-xs text-muted-foreground">
            Documentos assinados por você ou vinculados ao seu CPF ficam permanentemente custodiados com hash SHA-256 e trilha de auditoria verificável.
          </p>
        </div>
      </div>

      {/* Lista de Contratos */}
      {filteredContracts.length === 0 ? (
        <div className="bg-card border border-border/60 rounded-2xl p-8 sm:p-12 text-center space-y-3 shadow-xs">
          <div className="h-12 w-12 rounded-2xl bg-muted flex items-center justify-center mx-auto text-muted-foreground">
            <FileText className="h-6 w-6" />
          </div>
          <h3 className="font-semibold text-base text-foreground">Nenhum contrato nesta seção</h3>
          <p className="text-xs sm:text-sm text-muted-foreground max-w-sm mx-auto">
            Quando você assinar documentos em qualquer loja ou prestador da Waesy, eles aparecerão aqui automaticamente.
          </p>
        </div>
      ) : (
        <div className="bg-card border border-border/60 rounded-2xl overflow-hidden shadow-xs divide-y divide-border/40">
          {filteredContracts.map((contract: UserContractVaultItemDTO) => {
            const isSigned = contract.status === "signed";
            const signingUrl = `/assinar/${contract.signingToken}`;
            const verifyUrl = `/verify/document/${contract.verificationCode}`;

            return (
              <div
                key={contract.envelopeId}
                className="p-4 sm:p-5 space-y-3.5 hover:bg-muted/20 transition-colors"
              >
                {/* Cabeçalho do Card */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="size-10 shrink-0 rounded-xl bg-muted flex items-center justify-center text-muted-foreground">
                      <FileText className="size-5" />
                    </div>
                    <div className="min-w-0">
                      <div className="font-semibold text-sm sm:text-base text-foreground truncate">
                        {contract.title}
                      </div>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                        {contract.storeName && (
                          <span className="flex items-center gap-1 truncate">
                            <Building2 className="size-3 shrink-0" />
                            {contract.storeName}
                          </span>
                        )}
                        <span>·</span>
                        <span>{formatDate(contract.createdAt)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Badges de Status */}
                  <div className="flex items-center gap-2 shrink-0">
                    {contract.isSettled && (
                      <Badge variant="outline" className="text-[10px] border-emerald-500/40 text-emerald-600 bg-emerald-500/5">
                        Quitado ✓
                      </Badge>
                    )}
                    {contract.govBrVerified && (
                      <Badge variant="outline" className="text-[10px] border-blue-500/40 text-blue-600 bg-blue-500/5">
                        Gov.br Oficial
                      </Badge>
                    )}
                    <Badge
                      variant={isSigned ? "default" : "secondary"}
                      className={`text-xs font-semibold ${
                        isSigned
                          ? "bg-emerald-600 hover:bg-emerald-600 text-white"
                          : "bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/30"
                      }`}
                    >
                      {isSigned ? (
                        <span className="flex items-center gap-1">
                          <CheckCircle2 className="size-3" />
                          Assinado
                        </span>
                      ) : (
                        <span className="flex items-center gap-1">
                          <Clock className="size-3" />
                          Aguardando Assinatura
                        </span>
                      )}
                    </Badge>
                  </div>
                </div>

                {/* Hash Criptográfico */}
                {contract.hashSha256 && (
                  <div className="flex items-center gap-2 text-[11px] text-muted-foreground bg-muted/40 p-2.5 rounded-xl border border-border/60">
                    <Hash className="size-3.5 text-primary shrink-0" />
                    <span className="font-mono truncate">{contract.hashSha256}</span>
                  </div>
                )}

                {/* Ações Rápidas (Apple HIG Touch Targets) */}
                <div className="flex flex-wrap items-center gap-2 pt-1">
                  {!isSigned ? (
                    <Button
                      asChild
                      size="sm"
                      className="rounded-xl text-xs font-bold h-10 px-5 bg-primary text-primary-foreground min-h-[44px] sm:min-h-[36px]"
                    >
                      <Link to={signingUrl}>
                        <PenTool className="size-3.5 mr-1.5" />
                        Assinar Documento Agora
                      </Link>
                    </Button>
                  ) : (
                    <>
                      <Button
                        asChild
                        variant="outline"
                        size="sm"
                        className="rounded-xl text-xs font-medium h-9 px-4 min-h-[44px] sm:min-h-[36px]"
                      >
                        <Link to={verifyUrl}>
                          <ExternalLink className="size-3.5 mr-1.5" />
                          Ver Certificado de Autenticidade
                        </Link>
                      </Button>

                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => window.open(verifyUrl, "_blank")}
                        className="rounded-xl text-xs font-medium h-9 px-3 text-muted-foreground hover:text-foreground"
                      >
                        <Download className="size-3.5 mr-1.5" />
                        Baixar PDF
                      </Button>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
