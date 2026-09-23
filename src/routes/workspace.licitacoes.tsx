/**
 * workspace.licitacoes.tsx — Motor B2B de Licitações Públicas & Gov Harvester
 * 
 * Monitoramento contínuo do PNCP e Portais de Transparência.
 * Desbloqueio de Dossiê Executivo Mastigado por IA tarifado silenciosamente em Tokens.
 * Design Padrão Apple HIG & Paradigma Clean.
 */

import React, { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import {
  FileText,
  Search,
  Sparkles,
  Building,
  Calendar,
  AlertCircle,
  CheckCircle2,
  Lock,
  ExternalLink,
  Bell,
  Coins,
  ShieldCheck,
  ChevronRight,
  Filter,
  DollarSign,
  Clock,
  Briefcase,
  SlidersHorizontal,
  Loader2,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  listPublicTenders,
  unlockTenderWithAiDigest,
  getStoreTenderAlerts,
  saveStoreTenderAlert,
  type MinedTenderItem,
} from "@/services/tenders.functions";
import { getStoreTokenWallet } from "@/services/tokens.functions";
import { toast } from "sonner";

export const Route = createFileRoute("/workspace/licitacoes")({
  head: () => ({
    meta: [{ title: "Licitações Públicas (Gov Harvester) | Workspace Waesy" }],
  }),
  loader: async () => {
    try {
      const [tendersRes, wallet, alertsRes] = await Promise.all([
        listPublicTenders({ data: { limit: 30 } }),
        getStoreTokenWallet().catch(() => null),
        getStoreTenderAlerts().catch(() => ({ alerts: [] })),
      ]);
      return {
        tenders: tendersRes.items,
        total: tendersRes.total,
        wallet,
        alerts: alertsRes.alerts,
      };
    } catch (e: any) {
      console.error("[workspace.licitacoes] loader error:", e);
      return {
        tenders: [],
        total: 0,
        wallet: null,
        alerts: [],
      };
    }
  },
  component: WorkspaceTendersPage,
});

export default function WorkspaceTendersPage() {
  const loaderData = Route.useLoaderData();
  const [tenders, setTenders] = useState<MinedTenderItem[]>(loaderData.tenders);
  const [wallet, setWallet] = useState(loaderData.wallet);
  const [alerts, setAlerts] = useState(loaderData.alerts);
  const [activeTab, setActiveTab] = useState("oportunidades");

  // Filtros
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCity, setSelectedCity] = useState("todas");
  const [selectedModality, setSelectedModality] = useState("todas");
  const [filterUnlockedOnly, setFilterUnlockedOnly] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Dossiê / Sheet Lateral
  const [selectedTender, setSelectedTender] = useState<MinedTenderItem | null>(null);
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [isUnlocking, setIsUnlocking] = useState(false);

  // Alerta Form
  const [newKeyword, setNewKeyword] = useState("");
  const [alertKeywords, setAlertKeywords] = useState<string[]>(
    alerts[0]?.keywords || ["material de limpeza", "alimentos", "transporte"]
  );
  const [isSavingAlert, setIsSavingAlert] = useState(false);

  // Executar busca filtrada
  const handleFilter = async () => {
    try {
      setIsLoading(true);
      const res = await listPublicTenders({
        data: {
          query: searchQuery.trim() || undefined,
          city: selectedCity !== "todas" ? selectedCity : undefined,
          modality: selectedModality !== "todas" ? selectedModality : undefined,
          onlyUnlocked: filterUnlockedOnly,
          limit: 30,
        },
      });
      setTenders(res.items);
    } catch (err: any) {
      toast.error(err.message || "Erro ao filtrar licitações.");
    } finally {
      setIsLoading(false);
    }
  };

  // Desbloquear Edital com Tollbooth
  const handleUnlockTender = async (tender: MinedTenderItem) => {
    setSelectedTender(tender);
    setIsSheetOpen(true);

    if (tender.is_unlocked && tender.ai_curated_digest) {
      return; // Já desbloqueado
    }

    try {
      setIsUnlocking(true);
      const res = await unlockTenderWithAiDigest({
        data: {
          tender_id: tender.id,
        },
      });

      if (res.success) {
        toast.success(res.message || "Dossiê executivo desbloqueado!");
        // Atualiza item no estado
        setTenders((prev) =>
          prev.map((t) => (t.id === tender.id ? { ...t, ...res.tender, is_unlocked: true } : t))
        );
        setSelectedTender({ ...tender, ...res.tender, is_unlocked: true });

        // Recarrega saldo
        const updatedWallet = await getStoreTokenWallet();
        setWallet(updatedWallet);
      }
    } catch (err: any) {
      toast.error(err.message || "Falha ao desbloquear edital.");
    } finally {
      setIsUnlocking(false);
    }
  };

  // Salvar Alertas
  const handleAddKeyword = () => {
    if (!newKeyword.trim()) return;
    if (alertKeywords.includes(newKeyword.trim().toLowerCase())) return;
    setAlertKeywords([...alertKeywords, newKeyword.trim().toLowerCase()]);
    setNewKeyword("");
  };

  const handleRemoveKeyword = (kw: string) => {
    setAlertKeywords(alertKeywords.filter((k) => k !== kw));
  };

  const handleSaveAlerts = async () => {
    try {
      setIsSavingAlert(true);
      const res = await saveStoreTenderAlert({
        data: {
          id: alerts[0]?.id,
          title: "Radar Automático de Compras Públicas",
          keywords: alertKeywords,
          cities: ["Chapecó", "São Miguel do Oeste", "Florianópolis"],
          notify_email: true,
          notify_whatsapp: false,
          is_active: true,
        },
      });
      toast.success(res.message || "Alerta salvo com sucesso!");
      const updated = await getStoreTenderAlerts();
      setAlerts(updated.alerts);
    } catch (err: any) {
      toast.error(err.message || "Erro ao salvar alerta.");
    } finally {
      setIsSavingAlert(false);
    }
  };

  const totalAmountBrl = tenders.reduce((acc, t) => acc + (t.estimated_amount_cents || 0), 0) / 100;

  return (
    <div className="flex-1 overflow-y-auto no-scrollbar p-6 md:p-8 space-y-6 bg-background">
      {/* Top Header Silencioso (Apple HIG) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/40 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold tracking-tight text-foreground">Licitações Públicas</h1>
            <Badge variant="outline" className="text-[10px] text-emerald-600 dark:text-emerald-400 border-emerald-500/30">
              PNCP Gov Harvester
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            Oportunidades municipais e estaduais mineradas em tempo real com análise preditiva de IA.
          </p>
        </div>

        {wallet && (
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl border border-border/60 bg-card text-xs">
            <Coins className="size-3.5 text-primary" />
            <span className="text-muted-foreground">Saldo:</span>
            <span className="font-semibold text-foreground">{(wallet.balance || 0).toLocaleString()}</span>
            <span className="text-[10px] text-muted-foreground">Tokens</span>
          </div>
        )}
      </div>

      {/* Grid de Métricas B2B */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="p-4 rounded-xl border border-border/60 bg-card">
          <span className="text-xs text-muted-foreground font-medium block">Editais Abertos</span>
          <div className="text-2xl font-bold tracking-tight text-foreground mt-1">
            {tenders.length}
          </div>
          <span className="text-[11px] text-muted-foreground">Chapecó e Região Oeste</span>
        </div>

        <div className="p-4 rounded-xl border border-border/60 bg-card">
          <span className="text-xs text-muted-foreground font-medium block">Volume em Disputa</span>
          <div className="text-2xl font-bold tracking-tight text-primary mt-1">
            {totalAmountBrl.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
          </div>
          <span className="text-[11px] text-muted-foreground">valor total estimado</span>
        </div>

        <div className="p-4 rounded-xl border border-border/60 bg-card">
          <span className="text-xs text-muted-foreground font-medium block">Dossiês Desbloqueados</span>
          <div className="text-2xl font-bold tracking-tight text-emerald-600 dark:text-emerald-400 mt-1">
            {tenders.filter((t) => t.is_unlocked).length}
          </div>
          <span className="text-[11px] text-muted-foreground">com checklist de proposta</span>
        </div>

        <div className="p-4 rounded-xl border border-border/60 bg-card">
          <span className="text-xs text-muted-foreground font-medium block">Alertas de Nicho</span>
          <div className="text-2xl font-bold tracking-tight text-foreground mt-1">
            {alertKeywords.length}
          </div>
          <span className="text-[11px] text-muted-foreground">palavras-chave ativas</span>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="flex items-center gap-1.5 w-full sm:w-auto overflow-x-auto no-scrollbar p-1 rounded-xl h-10">
          <TabsTrigger value="oportunidades" className="text-xs">
            Oportunidades em Aberto
          </TabsTrigger>
          <TabsTrigger value="alertas" className="text-xs">
            Filtros & Radar de Alertas
          </TabsTrigger>
        </TabsList>

        {/* Tab 1: Oportunidades */}
        <TabsContent value="oportunidades" className="space-y-4">
          {/* Barra de Filtros Silenciosa */}
          <div className="p-3.5 rounded-xl border border-border/60 bg-card flex flex-col md:flex-row items-center gap-3">
            <div className="relative flex-1 w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
              <Input
                placeholder="Buscar por objeto, órgão ou produto (ex: merenda, transporte, limpeza)..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleFilter()}
                className="pl-9 h-9 text-xs"
              />
            </div>

            <div className="flex items-center gap-2 w-full md:w-auto">
              <Select value={selectedCity} onValueChange={setSelectedCity}>
                <SelectTrigger className="w-[140px] h-9 text-xs">
                  <SelectValue placeholder="Cidade" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todas">Todas Cidades</SelectItem>
                  <SelectItem value="Chapecó">Chapecó</SelectItem>
                  <SelectItem value="São Miguel do Oeste">São Miguel do Oeste</SelectItem>
                  <SelectItem value="Florianópolis">Florianópolis</SelectItem>
                </SelectContent>
              </Select>

              <Select value={selectedModality} onValueChange={setSelectedModality}>
                <SelectTrigger className="w-[160px] h-9 text-xs">
                  <SelectValue placeholder="Modalidade" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todas">Todas Modalidades</SelectItem>
                  <SelectItem value="Pregão Eletrônico">Pregão Eletrônico</SelectItem>
                  <SelectItem value="Dispensa Eletrônica">Dispensa Eletrônica</SelectItem>
                  <SelectItem value="Chamada Pública">Chamada Pública</SelectItem>
                  <SelectItem value="Concorrência">Concorrência</SelectItem>
                </SelectContent>
              </Select>

              <Button
                variant={filterUnlockedOnly ? "secondary" : "ghost"}
                onClick={() => {
                  setFilterUnlockedOnly(!filterUnlockedOnly);
                }}
                className="h-9 px-3 text-xs gap-1.5"
              >
                <ShieldCheck className="size-3.5" />
                Desbloqueados
              </Button>

              <Button onClick={handleFilter} disabled={isLoading} className="h-9 px-4 text-xs font-semibold">
                {isLoading ? <Loader2 className="size-3.5 animate-spin" /> : "Filtrar"}
              </Button>
            </div>
          </div>

          {/* Lista de Editais */}
          <div className="space-y-3">
            {tenders.length === 0 ? (
              <div className="p-12 text-center rounded-xl border border-dashed border-border/80 bg-card">
                <FileText className="size-8 text-muted-foreground mx-auto mb-2 opacity-50" />
                <h3 className="text-sm font-semibold">Nenhuma licitação encontrada</h3>
                <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
                  Ajuste os filtros ou aguarde a próxima varredura automática do Gov Harvester.
                </p>
              </div>
            ) : (
              tenders.map((t) => {
                const amountFormatted = (t.estimated_amount_cents / 100).toLocaleString("pt-BR", {
                  style: "currency",
                  currency: "BRL",
                });
                const closingFormatted = t.closing_date
                  ? new Date(t.closing_date).toLocaleDateString("pt-BR", {
                      day: "2-digit",
                      month: "2-digit",
                      year: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })
                  : "A definir";

                return (
                  <div
                    key={t.id}
                    className="p-4 rounded-xl border border-border/60 bg-card hover:border-border transition-all flex flex-col md:flex-row md:items-center justify-between gap-4"
                  >
                    <div className="space-y-1.5 flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge variant="secondary" className="text-[10px] font-medium">
                          {t.modality}
                        </Badge>
                        <Badge variant="outline" className="text-[10px] text-muted-foreground">
                          {t.city}/{t.uf}
                        </Badge>
                        {t.is_unlocked && (
                          <Badge variant="outline" className="text-[10px] text-emerald-600 dark:text-emerald-400 border-emerald-500/30 gap-1">
                            <CheckCircle2 className="size-2.5" />
                            Dossiê IA Desbloqueado
                          </Badge>
                        )}
                      </div>

                      <h3 className="text-sm font-semibold text-foreground line-clamp-1">{t.title}</h3>
                      <p className="text-xs text-muted-foreground line-clamp-2">{t.description}</p>

                      <div className="flex flex-wrap items-center gap-4 text-[11px] text-muted-foreground pt-1">
                        <span className="flex items-center gap-1">
                          <Building className="size-3" />
                          {t.agency_name}
                        </span>
                        <span className="flex items-center gap-1">
                          <Calendar className="size-3" />
                          Abertura/Encerramento: {closingFormatted}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between md:flex-col md:items-end gap-2 shrink-0 border-t md:border-t-0 pt-3 md:pt-0">
                      <div className="text-right">
                        <span className="text-[10px] text-muted-foreground block">Valor Estimado</span>
                        <span className="text-sm font-bold text-foreground">{amountFormatted}</span>
                      </div>

                      <Button
                        onClick={() => handleUnlockTender(t)}
                        variant={t.is_unlocked ? "secondary" : "outline"}
                        className="gap-1.5 text-xs h-8 font-medium"
                      >
                        {t.is_unlocked ? (
                          <>
                            <FileText className="size-3 text-primary" />
                            Ver Dossiê IA
                          </>
                        ) : (
                          <>
                            <Sparkles className="size-3 text-amber-500" />
                            Ver Dossiê IA
                            <span className="text-[10px] text-muted-foreground font-mono ml-0.5">
                              [ -100 Tokens ]
                            </span>
                          </>
                        )}
                        <ChevronRight className="size-3 text-muted-foreground" />
                      </Button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </TabsContent>

        {/* Tab 2: Filtros & Alertas */}
        <TabsContent value="alertas" className="space-y-4">
          <div className="p-5 rounded-xl border border-border/60 bg-card space-y-5 max-w-2xl">
            <div>
              <h2 className="text-base font-bold text-foreground">Radar de Alertas Proativo</h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                Defina palavras-chave do seu nicho. Quando o Gov Harvester minerar uma licitação correspondente no PNCP, você será notificado imediatamente.
              </p>
            </div>

            <div className="space-y-3">
              <label className="text-xs font-semibold text-foreground block">
                Palavras-chave do seu Ramo de Atuação
              </label>
              <div className="flex items-center gap-2">
                <Input
                  placeholder="Ex: uniforme, marmitex, software, van, combustível..."
                  value={newKeyword}
                  onChange={(e) => setNewKeyword(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleAddKeyword()}
                  className="h-9 text-xs"
                />
                <Button onClick={handleAddKeyword} variant="outline" className="h-9 text-xs">
                  Adicionar
                </Button>
              </div>

              <div className="flex flex-wrap gap-1.5 pt-2">
                {alertKeywords.map((kw) => (
                  <Badge key={kw} variant="secondary" className="text-xs py-1 px-2.5 gap-1.5">
                    {kw}
                    <button
                      onClick={() => handleRemoveKeyword(kw)}
                      className="hover:text-destructive transition-colors"
                    >
                      <X className="size-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            </div>

            <div className="pt-3 border-t border-border/40 flex justify-end">
              <Button onClick={handleSaveAlerts} disabled={isSavingAlert} className="text-xs font-semibold h-9">
                {isSavingAlert ? <Loader2 className="size-3.5 animate-spin mr-1.5" /> : null}
                Salvar Configurações de Radar
              </Button>
            </div>
          </div>
        </TabsContent>
      </Tabs>

      {/* Sheet Lateral: Dossiê Executivo da Licitação */}
      <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
        <SheetContent className="sm:max-w-xl overflow-y-auto no-scrollbar p-6 space-y-6">
          {selectedTender && (
            <>
              <SheetHeader className="space-y-2 text-left">
                <div className="flex items-center gap-2">
                  <Badge variant="secondary" className="text-[10px]">
                    {selectedTender.modality}
                  </Badge>
                  <span className="text-xs text-muted-foreground font-mono">
                    {selectedTender.pncp_id}
                  </span>
                </div>
                <SheetTitle className="text-base font-bold text-foreground">
                  {selectedTender.title}
                </SheetTitle>
                <SheetDescription className="text-xs text-muted-foreground">
                  {selectedTender.agency_name} • {selectedTender.city}/{selectedTender.uf}
                </SheetDescription>
              </SheetHeader>

              {isUnlocking ? (
                <div className="py-16 text-center space-y-3">
                  <Loader2 className="size-8 animate-spin text-primary mx-auto" />
                  <p className="text-xs font-medium text-foreground">
                    O Tollbooth está processando e mastigando o edital com IA...
                  </p>
                  <span className="text-[11px] text-muted-foreground block">
                    Validando habilitação jurídica, cronograma e riscos (-100 Tokens)
                  </span>
                </div>
              ) : selectedTender.ai_curated_digest ? (
                <div className="space-y-5 text-xs">
                  {/* Resumo Executivo */}
                  <div className="p-4 rounded-xl bg-muted/40 border border-border/50 space-y-2">
                    <span className="font-semibold text-foreground flex items-center gap-1.5">
                      <Sparkles className="size-3.5 text-amber-500" />
                      Resumo Executivo do Objeto
                    </span>
                    <p className="text-muted-foreground leading-relaxed">
                      {selectedTender.ai_curated_digest.executive_summary}
                    </p>
                  </div>

                  {/* Requisitos de Habilitação */}
                  {selectedTender.ai_curated_digest.qualification_requirements && (
                    <div className="space-y-2">
                      <span className="font-semibold text-foreground flex items-center gap-1.5">
                        <ShieldCheck className="size-3.5 text-emerald-600 dark:text-emerald-400" />
                        Requisitos de Habilitação Exigidos
                      </span>
                      <ul className="space-y-1.5 pl-1">
                        {selectedTender.ai_curated_digest.qualification_requirements.map((req, idx) => (
                          <li key={idx} className="flex items-start gap-2 text-muted-foreground">
                            <span className="size-1.5 rounded-full bg-emerald-500 mt-1.5 shrink-0" />
                            <span>{req}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Datas Críticas */}
                  {selectedTender.ai_curated_digest.critical_milestones && (
                    <div className="space-y-2">
                      <span className="font-semibold text-foreground flex items-center gap-1.5">
                        <Clock className="size-3.5 text-primary" />
                        Cronograma & Prazos Críticos
                      </span>
                      <ul className="space-y-1.5 pl-1">
                        {selectedTender.ai_curated_digest.critical_milestones.map((m, idx) => (
                          <li key={idx} className="flex items-start gap-2 text-muted-foreground">
                            <span className="size-1.5 rounded-full bg-primary mt-1.5 shrink-0" />
                            <span>{m}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Checklist da Proposta */}
                  {selectedTender.ai_curated_digest.proposal_checklist && (
                    <div className="space-y-2">
                      <span className="font-semibold text-foreground flex items-center gap-1.5">
                        <CheckCircle2 className="size-3.5 text-foreground" />
                        Checklist para Montar sua Proposta
                      </span>
                      <ul className="space-y-1.5 pl-1">
                        {selectedTender.ai_curated_digest.proposal_checklist.map((item, idx) => (
                          <li key={idx} className="flex items-start gap-2 text-muted-foreground">
                            <span className="size-1.5 rounded-full bg-muted-foreground mt-1.5 shrink-0" />
                            <span>{item}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Análise de Riscos */}
                  {selectedTender.ai_curated_digest.risk_assessment && (
                    <div className="p-3.5 rounded-xl border border-amber-500/20 bg-amber-500/5 space-y-1.5">
                      <span className="font-semibold text-amber-700 dark:text-amber-400 flex items-center gap-1.5">
                        <AlertCircle className="size-3.5" />
                        Parecer de Risco do Edital
                      </span>
                      <p className="text-muted-foreground leading-relaxed">
                        {selectedTender.ai_curated_digest.risk_assessment}
                      </p>
                    </div>
                  )}

                  {/* Link Oficial */}
                  <div className="pt-3 border-t border-border/40 flex items-center justify-between">
                    <span className="text-[11px] text-muted-foreground">Fonte Oficial PNCP</span>
                    {selectedTender.portal_url && (
                      <a
                        href={selectedTender.portal_url}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 text-xs text-primary hover:underline font-medium"
                      >
                        Abrir Edital no Portal Federal
                        <ExternalLink className="size-3" />
                      </a>
                    )}
                  </div>
                </div>
              ) : null}
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
