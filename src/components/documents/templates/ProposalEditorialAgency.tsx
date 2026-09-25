import React from "react";
import { CommercialDocumentTemplateProps } from "../types";
import { CheckCircle2, ArrowRight, ShieldCheck, Clock, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";

export const ProposalEditorialAgency: React.FC<CommercialDocumentTemplateProps> = ({
  data,
  scale = 1,
  className = "",
  onAcceptProposal,
}) => {
  const formatMoney = (cents: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(cents / 100);
  };

  return (
    <div
      style={{
        transform: `scale(${scale})`,
        transformOrigin: "top center",
      }}
      className={`w-full max-w-[1000px] mx-auto bg-white text-slate-900 font-sans border border-slate-200/80 shadow-xl rounded-3xl overflow-hidden print:shadow-none print:border-none print:p-0 flex flex-col md:flex-row ${className}`}
    >
      {/* ── 1. Barra Lateral Esquerda: 25% da Largura (Dark Slate Luxury) ── */}
      <div className="w-full md:w-72 bg-slate-950 text-white p-8 flex flex-col justify-between shrink-0">
        <div>
          {/* Identidade da Agência */}
          <div className="flex items-center gap-2.5 mb-8">
            <div className="size-10 rounded-2xl bg-white text-slate-950 font-black text-xl flex items-center justify-center">
              W
            </div>
            <div>
              <span className="text-xs uppercase tracking-widest text-slate-400 font-bold block">
                STUDIO PROPOSAL
              </span>
              <span className="font-bold text-lg tracking-tight text-white">
                {data.issuer.tradingName || data.issuer.companyName}
              </span>
            </div>
          </div>

          {/* Dados do Cliente */}
          <div className="mb-8 p-4 rounded-2xl bg-white/5 border border-white/10 text-xs space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
              PROPOSTA EXCLUSIVA PARA
            </span>
            <p className="font-bold text-sm text-white">{data.client.name}</p>
            {data.client.companyName && (
              <p className="text-slate-300">{data.client.companyName}</p>
            )}
            <p className="text-slate-400 font-mono text-[11px] pt-1">
              Código: {data.code}
            </p>
          </div>

          {/* Índice Visual / Escopo */}
          <div className="space-y-3 text-xs">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
              ESTRUTURA DO PROJETO
            </span>
            <div className="flex items-center gap-2 text-slate-300">
              <span className="size-5 rounded-full bg-white/10 flex items-center justify-center text-[10px] font-mono">1</span>
              <span>Diagnóstico & Escopo</span>
            </div>
            <div className="flex items-center gap-2 text-slate-300">
              <span className="size-5 rounded-full bg-white/10 flex items-center justify-center text-[10px] font-mono">2</span>
              <span>Execução & Entregáveis</span>
            </div>
            <div className="flex items-center gap-2 text-slate-300">
              <span className="size-5 rounded-full bg-white/10 flex items-center justify-center text-[10px] font-mono">3</span>
              <span>Investimento & Ativação</span>
            </div>
          </div>
        </div>

        {/* Rodapé da Barra Lateral */}
        <div className="pt-8 border-t border-white/10 text-xs text-slate-400 space-y-1">
          <p className="text-white font-medium">Validade da Proposta:</p>
          <p>{data.validUntilDate}</p>
          <p className="text-[11px] pt-2 text-slate-500">Contato: {data.issuer.phoneOrWhatsapp}</p>
        </div>
      </div>

      {/* ── 2. Área Principal: 75% da Largura (Clean Editorial Paper) ── */}
      <div className="flex-1 p-8 sm:p-12 flex flex-col justify-between bg-white">
        <div>
          {/* Título Editorial Display */}
          <div className="mb-8">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-slate-100 text-slate-800 mb-3">
              <Sparkles className="size-3.5 text-amber-500" />
              <span>Proposta Comercial Executiva</span>
            </span>
            <h1 className="text-2xl sm:text-3xl font-black text-slate-950 tracking-tight leading-tight">
              {data.title}
            </h1>
          </div>

          {/* Fases do Escopo (Se Existirem) ou Itens em Destaque */}
          {data.stages && data.stages.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
              {data.stages.map((stage) => (
                <div key={stage.step} className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                        Etapa 0{stage.step}
                      </span>
                      {stage.duration && (
                        <span className="text-[10px] font-semibold text-slate-600 flex items-center gap-1">
                          <Clock className="size-3 text-slate-400" />
                          {stage.duration}
                        </span>
                      )}
                    </div>
                    <h4 className="font-bold text-sm text-slate-900 mb-1.5">{stage.title}</h4>
                    <p className="text-xs text-slate-600 leading-relaxed">{stage.description}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="space-y-3 mb-8">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400 block mb-2">
                ENTREGÁVEIS PRINCIPAIS
              </span>
              {data.items.slice(0, 3).map((item, idx) => (
                <div key={idx} className="flex items-start gap-3 p-3.5 rounded-xl bg-slate-50 border border-slate-200/80">
                  <CheckCircle2 className="size-4 text-emerald-600 mt-0.5 shrink-0" />
                  <div className="flex-1 text-xs">
                    <span className="font-bold text-slate-900">{item.title}</span>
                    {item.description && <p className="text-slate-500 mt-0.5">{item.description}</p>}
                  </div>
                  <span className="font-mono font-bold text-xs text-slate-800">
                    {formatMoney(item.totalPriceCents)}
                  </span>
                </div>
              ))}
            </div>
          )}

          {/* Tabela de Investimento Resumido */}
          <div className="p-6 rounded-2xl bg-slate-950 text-white mb-8 flex flex-col sm:flex-row sm:items-center justify-between gap-6 shadow-md">
            <div>
              <span className="text-xs uppercase font-bold tracking-widest text-slate-400 block mb-1">
                INVESTIMENTO TOTAL DO PROJETO
              </span>
              <div className="text-3xl sm:text-4xl font-black font-mono tracking-tight text-white">
                {formatMoney(data.totalCents)}
              </div>
              {data.paymentTerms.installmentsCount && (
                <span className="text-xs text-slate-300 font-medium block mt-1">
                  ou {data.paymentTerms.installmentsCount} parcelas de {formatMoney(Math.round(data.totalCents / data.paymentTerms.installmentsCount))}
                </span>
              )}
            </div>

            {/* Ação de Aceite Digital */}
            <div>
              {data.signatories?.clientSigned ? (
                <div className="flex items-center gap-2 bg-emerald-500/20 text-emerald-400 border border-emerald-400/30 px-5 py-3 rounded-xl font-bold text-sm">
                  <ShieldCheck className="size-5" />
                  <span>Proposta Aceita & Ativa</span>
                </div>
              ) : (
                <Button
                  size="lg"
                  onClick={onAcceptProposal}
                  className="h-12 px-6 rounded-xl font-bold text-sm bg-white text-slate-950 hover:bg-slate-100 transition-transform active:scale-95 shadow-md flex items-center gap-2"
                >
                  <span>Aceitar Proposta & Iniciar</span>
                  <ArrowRight className="size-4" />
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* Rodapé com Assinaturas */}
        <div className="pt-6 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 gap-4">
          <p>© {new Date().getFullYear()} {data.issuer.companyName}. Todos os direitos reservados.</p>
          <div className="flex items-center gap-2 font-mono text-[11px]">
            <ShieldCheck className="size-4 text-emerald-600" />
            <span>Assinatura Digital Auditável Waesy</span>
          </div>
        </div>
      </div>
    </div>
  );
};
