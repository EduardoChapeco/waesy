import React from "react";
import { ShieldCheck, User, Phone, Mail, MapPin, Calendar, DollarSign, ShoppingBag, Clock, FileText } from "lucide-react";
import { formatBRL } from "@/lib/utils";

export interface Customer360DossierProps {
  id?: string;
  customer: {
    id: string;
    fullName: string;
    taxId?: string | null;
    email?: string | null;
    phone?: string | null;
    city?: string | null;
    state?: string | null;
    birthDate?: string | null;
    avatarUrl?: string | null;
    isConsentLgpd?: boolean;
    createdAt?: string;
  };
  metrics?: {
    ltvCents?: number;
    ordersCount?: number;
    pendingDebtCents?: number;
    lastInteraction?: string;
  };
  history?: Array<{
    id: string;
    date: string;
    title: string;
    type: string;
    amountCents?: number;
    status: string;
  }>;
  storeName?: string;
  storeLogoUrl?: string | null;
}

export function Customer360PrintableDossier({
  id = "customer-360-dossier",
  customer,
  metrics,
  history = [],
  storeName = "Waesy Enterprise Suite",
  storeLogoUrl,
}: Customer360DossierProps) {
  const emissionDate = new Date().toLocaleDateString("pt-BR");
  const emissionTime = new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
  const ltvFormatted = formatBRL((metrics?.ltvCents || 0) / 100);
  const debtFormatted = formatBRL((metrics?.pendingDebtCents || 0) / 100);

  return (
    <div
      id={id}
      className="a4-page w-full max-w-3xl min-h-screen bg-card text-card-foreground p-8 sm:p-10 font-sans flex flex-col justify-between border border-border/80 mx-auto"
    >
      <div className="space-y-6">
        {/* ── 1. CABEÇALHO DO DOSSIÊ ── */}
        <div className="border-b-2 border-foreground/80 pb-5 flex items-start justify-between">
          <div className="space-y-1">
            <span className="text-xs font-mono font-bold tracking-widest text-primary uppercase">
              Dossiê 360° do Cliente & Histórico Transacional
            </span>
            <h1 className="text-2xl font-black uppercase text-foreground tracking-tight">
              {customer.fullName}
            </h1>
            <p className="text-xs text-muted-foreground">{storeName}</p>
          </div>

          <div className="text-right space-y-1">
            <span className="text-xs font-mono text-muted-foreground uppercase">ID do Cliente</span>
            <p className="text-sm font-mono font-bold text-foreground">{customer.id.slice(0, 12)}</p>
            <div className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
              <ShieldCheck className="size-4" />
              <span>Conforme LGPD</span>
            </div>
          </div>
        </div>

        {/* ── 2. DADOS CADASTRAIS & PERFIL ── */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 p-4 rounded-lg bg-muted/30 border border-border/60 text-xs">
          <div>
            <span className="text-xs font-mono text-muted-foreground uppercase">Documento / CPF</span>
            <p className="font-mono font-bold text-foreground mt-1">
              {customer.taxId || "Não informado"}
            </p>
          </div>
          <div>
            <span className="text-xs font-mono text-muted-foreground uppercase">Contato Principal</span>
            <p className="font-semibold text-foreground mt-1">
              {customer.phone || customer.email || "Não informado"}
            </p>
          </div>
          <div>
            <span className="text-xs font-mono text-muted-foreground uppercase">Localização</span>
            <p className="font-semibold text-foreground mt-1">
              {customer.city ? `${customer.city} - ${customer.state || ""}` : "Brasil"}
            </p>
          </div>
        </div>

        {/* ── 3. KPIS E SAÚDE FINANCEIRA ── */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="p-4 rounded-lg bg-card border border-border/70 space-y-1">
            <span className="text-xs font-semibold text-muted-foreground uppercase">Volume (LTV)</span>
            <p className="text-xl font-bold font-mono text-foreground">{ltvFormatted}</p>
            <span className="text-xs text-muted-foreground">Total acumulado</span>
          </div>

          <div className="p-4 rounded-lg bg-card border border-border/70 space-y-1">
            <span className="text-xs font-semibold text-muted-foreground uppercase">Transações</span>
            <p className="text-xl font-bold font-mono text-foreground">
              {metrics?.ordersCount ?? history.length}
            </p>
            <span className="text-xs text-muted-foreground">Pedidos e viagens</span>
          </div>

          <div className="p-4 rounded-lg bg-card border border-border/70 space-y-1">
            <span className="text-xs font-semibold text-muted-foreground uppercase">Pendências / Débitos</span>
            <p className="text-xl font-bold font-mono text-emerald-600">{debtFormatted}</p>
            <span className="text-xs text-emerald-600 font-medium">Situação regular</span>
          </div>
        </div>

        {/* ── 4. HISTÓRICO TRANSAÇÃO & SERVIÇOS ── */}
        <div className="space-y-3">
          <div className="flex items-center justify-between border-b border-border/50 pb-2">
            <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
              <Clock className="size-4 text-primary" /> Histórico Recente de Interações
            </h2>
            <span className="text-xs text-muted-foreground font-mono">
              {history.length} registro(s)
            </span>
          </div>

          {history.length === 0 ? (
            <div className="p-6 text-center text-xs text-muted-foreground bg-muted/20 rounded-lg border border-border/40">
              Nenhuma transação ou viagem pendente registrada para este cliente.
            </div>
          ) : (
            <div className="space-y-2">
              {history.slice(0, 5).map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between p-3 rounded-lg bg-muted/20 border border-border/40 text-xs"
                >
                  <div className="space-y-1">
                    <p className="font-bold text-foreground">{item.title}</p>
                    <span className="text-xs text-muted-foreground font-mono">
                      {item.type} · {item.date}
                    </span>
                  </div>
                  <div className="text-right">
                    {item.amountCents !== undefined && (
                      <span className="font-mono font-bold text-foreground block">
                        {formatBRL(item.amountCents / 100)}
                      </span>
                    )}
                    <span className="text-xs font-medium text-emerald-600 uppercase">
                      {item.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── 5. RODAPÉ DE AUDITORIA & SEGURANÇA ── */}
      <div className="border-t border-border/60 pt-4 mt-8 flex items-center justify-between text-xs text-muted-foreground">
        <div>
          <span className="font-semibold text-foreground">Dossiê Confidencial 360°</span>
          <p className="text-xs text-muted-foreground">
            Gerado eletronicamente em {emissionDate} às {emissionTime}
          </p>
        </div>
        <div className="text-right font-mono text-xs">
          <span>Autenticação: WAESY-360-SECURE</span>
        </div>
      </div>
    </div>
  );
}

export default Customer360PrintableDossier;
