import { useState } from "react";
import {
  BarChart3,
  Bot,
  Calendar,
  CheckCircle2,
  FileSignature,
  Kanban,
  Layers,
  MessageSquare,
  Plane,
  ShoppingBag,
  Sparkles,
  Users,
  Zap,
} from "lucide-react";

export interface PillarFlowItem {
  id: string;
  label: string;
  title: string;
  summary: string;
  highlights: string[];
  metricLabel: string;
  metricValue: string;
  icon: any;
}

const VERTICAL_PILLARS: Record<string, PillarFlowItem[]> = {
  talk: [
    {
      id: "inbox",
      label: "Inbox WhatsApp",
      title: "Múltiplos atendentes no mesmo número oficial",
      summary: "Distribua conversas por fila, setor e horário sem perder histórico nem misturar contextos.",
      highlights: ["Filas por departamento", "Transferência com nota interna", "Respostas rápidas em 1 clique"],
      metricLabel: "Tempo médio de resposta",
      metricValue: "1 min 40s",
      icon: MessageSquare,
    },
    {
      id: "crm",
      label: "Funil CRM",
      title: "Cada conversa vira oportunidade rastreável",
      summary: "Acompanhe leads em colunas Kanban, histórico de compras e carteira de contatos 360.",
      highlights: ["Pipeline visual Kanban", "Carteira de contatos unificada", "Etiquetas e SLA por etapa"],
      metricLabel: "Conversão de leads",
      metricValue: "+34%",
      icon: Kanban,
    },
    {
      id: "automations",
      label: "Automações",
      title: "Triagem inteligente e fluxos fora do expediente",
      summary: "Qualifique contatos automaticamente e direcione para o consultor certo com contexto pronto.",
      highlights: ["Menus e palavras-chave", "Follow-up automático", "Qualificação com IA"],
      metricLabel: "Atendimentos triados",
      metricValue: "100%",
      icon: Zap,
    },
    {
      id: "reports",
      label: "Relatórios & NPS",
      title: "Métricas reais de equipe e satisfação",
      summary: "Monitore volume por atendente, avaliações pós-atendimento e taxa de fechamento.",
      highlights: ["Ranking por consultor", "Pesquisa NPS automática", "Auditoria de horários"],
      metricLabel: "Satisfação média",
      metricValue: "4,9 / 5",
      icon: BarChart3,
    },
  ],
  turis: [
    {
      id: "quotes",
      label: "Roteiros & Cotações",
      title: "Monte roteiros completos em minutos",
      summary: "Combine aéreo, hospedagem, traslados e passeios em propostas digitais prontas para fechar.",
      highlights: ["Dia a dia visual editável", "Cálculo de câmbio e taxas", "Comparativo de opções"],
      metricLabel: "Tempo por proposta",
      metricValue: "4 min",
      icon: Plane,
    },
    {
      id: "contracts",
      label: "Contratos & Vouchers",
      title: "Aceite digital com emissão imediata",
      summary: "Cliente aprova a proposta, assina o contrato e recebe o voucher organizado no celular.",
      highlights: ["Link público interativo", "Parcelamento configurado", "Lista de embarque e passageiros"],
      metricLabel: "Aprovação online",
      metricValue: "1 clique",
      icon: FileSignature,
    },
    {
      id: "finance",
      label: "Comissões & Caixa",
      title: "Controle financeiro de operadoras e consultores",
      summary: "Acompanhe repasses de operadoras, comissões por vendedor e parcelas a receber.",
      highlights: ["Split por consultor", "Contas a pagar e receber", "Fechamento mensal claro"],
      metricLabel: "Conciliação",
      metricValue: "Automática",
      icon: BarChart3,
    },
  ],
  copilot: [
    {
      id: "agent",
      label: "Assessor IA",
      title: "Agente autônomo conectado ao seu negócio",
      summary: "Analisa vendas, responde clientes e executa tarefas operacionais com aprovação explícita.",
      highlights: ["Memória por projeto", "Leitura de documentos", "Execução auditável"],
      metricLabel: "Velocidade de entrega",
      metricValue: "5x mais rápido",
      icon: Bot,
    },
    {
      id: "squads",
      label: "Squads & Skills",
      title: "Especialistas de IA coordenados por fluxo",
      summary: "Combine skills de pesquisa, análise financeira, jurídico e criação de conteúdo.",
      highlights: ["Fluxos reutilizáveis", "Controle de créditos IA", "Radar de oportunidades"],
      metricLabel: "Autonomia",
      metricValue: "Sob demanda",
      icon: Sparkles,
    },
  ],
  pro: [
    {
      id: "erp",
      label: "PDV & Catálogo",
      title: "Vendas, estoque e caixa em tempo real",
      summary: "Opere balcão, catálogo digital e pedidos com baixa automática de estoque.",
      highlights: ["PDV ágil", "Variações e grade", "Notas e comprovantes"],
      metricLabel: "Operação integrada",
      metricValue: "100%",
      icon: ShoppingBag,
    },
    {
      id: "crm",
      label: "Talk & CRM",
      title: "Atendimento WhatsApp integrado ao funil",
      summary: "Centralize equipe, filas, funil de vendas e carteira de clientes no mesmo lugar.",
      highlights: ["Multi-atendente", "Kanban de negócios", "Histórico do cliente"],
      metricLabel: "Canais unificados",
      metricValue: "Omnichannel",
      icon: MessageSquare,
    },
    {
      id: "finance",
      label: "Financeiro & RH",
      title: "Contas, comissões, contratos e equipe",
      summary: "Controle DRE, repasses, assinaturas digitais e ponto da equipe em um só painel.",
      highlights: ["Caixa e recebíveis", "Contratos digitais", "Gestão de colaboradores"],
      metricLabel: "Sistemas liberados",
      metricValue: "Todos",
      icon: Layers,
    },
    {
      id: "ai",
      label: "Copilot IA",
      title: "Inteligência operacional em toda a empresa",
      summary: "Relatórios, sugestões de resposta e automações ligadas aos dados reais da loja.",
      highlights: ["Assessor executivo", "Radar de demanda", "Skills por setor"],
      metricLabel: "Plano único",
      metricValue: "All-in-One",
      icon: Bot,
    },
  ],
};

function resolvePillarsForVertical(verticalId?: string | null): PillarFlowItem[] {
  const key = String(verticalId || "pro").trim().toLowerCase();
  if (key === "talk" || key === "atendimento" || key === "chat") return VERTICAL_PILLARS.talk;
  if (key === "turis" || key === "tourism" || key === "turismo") return VERTICAL_PILLARS.turis;
  if (key === "copilot" || key === "waesy_copilot" || key === "ia") return VERTICAL_PILLARS.copilot;
  if (key === "pro" || key === "waesy" || key === "waesy_studio") return VERTICAL_PILLARS.pro;

  return [
    {
      id: "ops",
      label: "Operação",
      title: "Fluxo diário focado no seu segmento",
      summary: "Interface limpa com apenas os módulos essenciais da sua operação, sem poluição visual.",
      highlights: ["Agenda e atendimentos", "Pedidos e ordens", "Equipe com permissões"],
      metricLabel: "Onboarding",
      metricValue: "Imediato",
      icon: Calendar,
    },
    {
      id: "crm",
      label: "Clientes & CRM",
      title: "Carteira de clientes e histórico completo",
      summary: "Acompanhe recorrência, contatos, propostas enviadas e avaliações reais.",
      highlights: ["Base organizada", "Funil de acompanhamento", "Notificações automáticas"],
      metricLabel: "Retenção",
      metricValue: "+28%",
      icon: Users,
    },
    {
      id: "finance",
      label: "Caixa & Contratos",
      title: "Previsibilidade financeira e documentos digitais",
      summary: "Controle recebimentos, comissões da equipe e termos assinados online.",
      highlights: ["Fechamento de caixa", "Comissões claras", "Assinatura digital"],
      metricLabel: "Controle",
      metricValue: "Total",
      icon: BarChart3,
    },
  ];
}

export function VerticalProductPreview({
  verticalId,
  brandName,
}: {
  verticalId?: string | null;
  brandName: string;
}) {
  const pillars = resolvePillarsForVertical(verticalId);
  const [activeId, setActiveId] = useState(pillars[0]?.id || "ops");
  const active = pillars.find((p) => p.id === activeId) || pillars[0];
  const Icon = active.icon;

  return (
    <div className="rounded-2xl border border-border bg-card overflow-hidden">
      <div className="px-4 py-3 border-b border-border/60 bg-muted/30 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <span className="size-2 rounded-full bg-primary shrink-0" />
          <span className="text-xs font-semibold text-foreground truncate">{brandName}</span>
        </div>
        <span className="text-2xs font-mono text-muted-foreground shrink-0">
          {active.metricLabel}: <strong className="text-foreground">{active.metricValue}</strong>
        </span>
      </div>

      <div className="p-3 border-b border-border/50 flex flex-wrap gap-2 bg-background">
        {pillars.map((pillar) => {
          const selected = pillar.id === active.id;
          return (
            <button
              key={pillar.id}
              type="button"
              onClick={() => setActiveId(pillar.id)}
              className={`h-11 min-h-11 sm:h-9 sm:min-h-9 px-3 rounded-lg text-xs font-semibold transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                selected
                  ? "bg-foreground text-background"
                  : "bg-muted/50 text-muted-foreground hover:text-foreground hover:bg-muted"
              }`}
            >
              {pillar.label}
            </button>
          );
        })}
      </div>

      <div className="p-5 sm:p-6 space-y-4 bg-background">
        <div className="flex items-start gap-3">
          <div className="size-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
            <Icon className="size-5" />
          </div>
          <div className="space-y-1 min-w-0">
            <h3 className="text-sm sm:text-base font-bold text-foreground leading-snug">
              {active.title}
            </h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              {active.summary}
            </p>
          </div>
        </div>

        <ul className="space-y-2 pt-2 border-t border-border/50">
          {active.highlights.map((hl) => (
            <li key={hl} className="flex items-center gap-2 text-xs text-foreground">
              <CheckCircle2 className="size-4 text-primary shrink-0" />
              <span>{hl}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

export function VerticalPillarShowcase({
  verticalId,
  brandName,
}: {
  verticalId?: string | null;
  brandName: string;
}) {
  const pillars = resolvePillarsForVertical(verticalId);
  const [activeId, setActiveId] = useState(pillars[0]?.id || "ops");
  const active = pillars.find((p) => p.id === activeId) || pillars[0];
  const Icon = active.icon;

  return (
    <section className="py-10 sm:py-14 border-y border-border/60 bg-muted/20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 space-y-6">
        <div className="max-w-2xl space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wider text-primary">
            Fluxo Operacional
          </p>
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
            Tudo o que o {brandName} entrega no dia a dia
          </h2>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          <div className="lg:col-span-5 flex flex-col gap-2">
            {pillars.map((pillar) => {
              const PillarIcon = pillar.icon;
              const selected = pillar.id === active.id;
              return (
                <button
                  key={pillar.id}
                  type="button"
                  onClick={() => setActiveId(pillar.id)}
                  className={`w-full min-h-11 p-4 rounded-xl text-left transition-colors cursor-pointer flex items-start gap-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                    selected
                      ? "bg-background border border-border text-foreground"
                      : "hover:bg-background/60 text-muted-foreground"
                  }`}
                >
                  <PillarIcon className={`size-5 shrink-0 mt-1 ${selected ? "text-primary" : ""}`} />
                  <div className="space-y-1 min-w-0">
                    <span className="text-sm font-bold block text-foreground">{pillar.label}</span>
                    <span className="text-xs text-muted-foreground line-clamp-2">{pillar.summary}</span>
                  </div>
                </button>
              );
            })}
          </div>

          <div className="lg:col-span-7 rounded-2xl border border-border bg-background p-6 sm:p-8 space-y-5">
            <div className="flex items-center justify-between gap-3 border-b border-border/50 pb-4">
              <div className="flex items-center gap-3">
                <div className="size-11 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                  <Icon className="size-5" />
                </div>
                <div>
                  <p className="text-xs font-mono text-muted-foreground">{active.label}</p>
                  <h3 className="text-lg font-bold text-foreground">{active.title}</h3>
                </div>
              </div>
              <div className="text-right hidden sm:block">
                <p className="text-2xs text-muted-foreground">{active.metricLabel}</p>
                <p className="text-base font-bold font-mono text-foreground">{active.metricValue}</p>
              </div>
            </div>

            <p className="text-sm text-muted-foreground leading-relaxed">{active.summary}</p>

            <ul className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
              {active.highlights.map((hl) => (
                <li key={hl} className="flex items-center gap-2 text-xs font-medium text-foreground">
                  <CheckCircle2 className="size-4 text-primary shrink-0" />
                  <span>{hl}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}
