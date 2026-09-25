import React from "react";
import { Link } from "@tanstack/react-router";
import { ShieldAlert, ArrowLeft, Home, Store } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export interface WorkspaceAccessDeniedProps {
  role?: string;
  path?: string;
  storeName?: string;
}

const ROLE_LABELS: Record<string, string> = {
  owner: "Proprietário(a)",
  proprietario: "Proprietário(a)",
  admin: "Administrador(a)",
  manager: "Gerente Operacional",
  gerente: "Gerente Operacional",
  seller: "Vendedor(a) / Atendente",
  vendedor: "Vendedor(a) / Atendente",
  atendente: "Vendedor(a) / Atendente",
  cashier: "Operador(a) de Caixa",
  caixa: "Operador(a) de Caixa",
  kitchen: "Cozinha / KDS",
  cozinha: "Cozinha / KDS",
  operator: "Operador(a) de Expedição",
  estoquista: "Estoquista",
  specialist: "Profissional Especialista",
  profissional: "Profissional Especialista",
  rh: "Recursos Humanos & Recrutamento",
  recruiter: "Recrutador(a)",
  finance: "Financeiro / Contábil",
  content: "Gestor(a) de Conteúdo & Marketing",
  support: "Suporte & Atendimento",
  member: "Colaborador(a)",
};

export function WorkspaceAccessDenied({
  role = "member",
  path = "",
  storeName,
}: WorkspaceAccessDeniedProps) {
  const roleLabel = ROLE_LABELS[role.toLowerCase()] || role;

  return (
    <div className="min-h-[70vh] flex items-center justify-center p-4">
      <div className="max-w-md w-full p-6 sm:p-8 rounded-2xl border border-border/70 bg-card text-center space-y-5 shadow-xs">
        {/* Ícone de Escudo em Camada Suave */}
        <div className="size-14 rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center mx-auto border border-amber-500/20">
          <ShieldAlert className="size-7" />
        </div>

        {/* Título e Explicação Objetiva */}
        <div className="space-y-1.5">
          <h2 className="text-lg font-bold tracking-tight text-foreground">
            Acesso Restrito ao Módulo
          </h2>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Seu perfil atual não possui autorização para visualizar ou editar esta área do negócio.
          </p>
        </div>

        {/* Pílulas de Contexto da Loja e Cargo */}
        <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
          {storeName && (
            <Badge variant="outline" className="text-[11px] font-medium gap-1 py-1 px-2.5 rounded-lg border-border/80">
              <Store className="size-3 text-muted-foreground" />
              <span>{storeName}</span>
            </Badge>
          )}
          <Badge variant="secondary" className="text-[11px] font-semibold py-1 px-2.5 rounded-lg">
            Cargo: {roleLabel}
          </Badge>
        </div>

        {/* Diagnóstico Discreto da Rota Solicitada */}
        {path && (
          <div className="p-2.5 rounded-xl bg-muted/40 border border-border/50 text-[11px] font-mono text-muted-foreground truncate">
            {path}
          </div>
        )}

        {/* Botão de Retorno com Touch Target de 44px */}
        <div className="pt-2">
          <Button
            asChild
            className="w-full h-11 rounded-xl text-xs font-bold gap-2 cursor-pointer shadow-xs"
          >
            <Link to="/workspace">
              <ArrowLeft className="size-4" />
              <span>Voltar para o Painel Geral</span>
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
