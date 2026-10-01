import { createFileRoute } from '@tanstack/react-router';
import { useState, useRef, useEffect } from 'react';
import { Users, Send, Layers, Brain, ShieldCheck, CheckCircle2, Activity, TrendingUp, DollarSign, Filter, Sliders, ArrowRight, Clock, Command, MessageSquare, ChevronRight, Info, Key, Briefcase, Home, Wallet, CreditCard, UserCheck, Scale, FileText, Cpu } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { toast } from 'sonner';
import { SimLabResearchPanel } from '@/components/simlab/simlab-research-panel';
import { SimlabReviewPanel } from '@/components/simlab/simlab-review-panel';
import type { SyntheticArchetype, FocusGroupMessage, FocusGroupSession } from '@/types/simlab';
import { listSyntheticArchetypes, getOrCreateActiveFocusSession, listFocusGroupMessages, sendFocusGroupMessage } from '@/services/simlab.functions';
import { getSimLabKeyStatus, saveSimLabApiKey } from '@/services/api-orchestrator.functions';
import { getStoreSettings } from '@/services/store.functions';

export const Route = createFileRoute('/workspace/simlab/focus-group')({
  head: () => ({ meta: [{ title: 'Console de Amostragem Sintética & Focus Group | Waesy' }] }),
  loader: async () => {
    try {
    const store = await getStoreSettings().catch(() => null);
    return { store };
    } catch (err) {
      console.error("[loader:workspace.simlab.focus-group] Unhandled loader error:", err);
      return { store: null };
    }
  },
  component: FocusGroupPage,
});

function FocusGroupPage() {
  const { store } = ((Route.useLoaderData?.() as any) || {});
  const storeId = store?.id || '';
  const [session, setSession] = useState<FocusGroupSession | null>(null);
  const [availablePersonas, setAvailablePersonas] = useState<SyntheticArchetype[]>([]);
  const [selectedPersonas, setSelectedPersonas] = useState<SyntheticArchetype[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [inspectingPersona, setInspectingPersona] = useState<SyntheticArchetype | null>(null);
  const [isKeySheetOpen, setIsKeySheetOpen] = useState(false);
  const [keyProvider, setKeyProvider] = useState<'gemini' | 'groq' | 'openai'>('gemini');
  const [apiKeyInput, setApiKeyInput] = useState('');
  const [isSavingKey, setIsSavingKey] = useState(false);
  const [keyStatus, setKeyStatus] = useState<{ hasActiveKey: boolean; activeProvider: string | null; poolCount: number }>({
    hasActiveKey: false,
    activeProvider: null,
    poolCount: 0,
  });

  const [statements, setStatements] = useState<FocusGroupMessage[]>([
    {
      id: 'stmt-init',
      session_id: 'default',
      sender_type: 'squad_scientist',
      sender_id: 'scientist-arnaldo',
      sender_name: 'Prof. Dr. Arnaldo (Econometrista Chefe)',
      content: 'Bancada sintética calibrada segundo os microdados do Censo IBGE 2022, POF e Teoria de Escolha Discreta (McFadden RUM). Submeta hipóteses comerciais com preços e parcelas: o motor decompõe ticket unitário, folga orçamentária familiar e utilidade percebida de cada agente.',
      created_at: new Date().toISOString(),
    }
  ]);

  const feedEndRef = useRef<HTMLDivElement>(null);

  async function refreshKeyStatus() {
    try {
      const res = await getSimLabKeyStatus();
      if (res) setKeyStatus(res);
    } catch {
      // fallback
    }
  }

  useEffect(() => {
    async function loadData() {
      try {
        await refreshKeyStatus();

        // 1. Carregar arquétipos reais com currículos e balanço patrimonial
        const rows = await listSyntheticArchetypes();
        if (rows && rows.length > 0) {
          setAvailablePersonas(rows);
          const initialSelection = rows.slice(0, 3);
          setSelectedPersonas(initialSelection);

          // 2. Inicializar ou recuperar sessão de Focus Group
          if (storeId) {
            const sessRes = await getOrCreateActiveFocusSession({
              data: {
                storeId,
                personaIds: initialSelection.map(p => p.id)
              }
            });

            if (sessRes?.session) {
              setSession(sessRes.session);

              // 3. Carregar histórico de mensagens
              const messages = await listFocusGroupMessages({
                data: { sessionId: sessRes.session.id }
              });

              if (messages && messages.length > 0) {
                setStatements(messages);
              }
            }
          }
        }
      } catch (e: any) {
        console.warn('Erro ao carregar dados do SimLab Focus Group:', e.message);
      }
    }
    loadData();
  }, [storeId]);

  useEffect(() => {
    feedEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [statements, isProcessing]);

  function handleTogglePersona(p: SyntheticArchetype) {
    if (selectedPersonas.some(x => x.id === p.id)) {
      if (selectedPersonas.length <= 1) {
        toast.error('A bancada amostral deve possuir no mínimo 1 persona.');
        return;
      }
      setSelectedPersonas(selectedPersonas.filter(x => x.id !== p.id));
    } else {
      if (selectedPersonas.length >= 5) {
        toast.error('Limite amostral do console: máximo de 5 personas simultâneas.');
        return;
      }
      setSelectedPersonas([...selectedPersonas, p]);
    }
  }

  async function handleSaveKey(e: React.FormEvent) {
    e.preventDefault();
    if (!apiKeyInput.trim()) {
      toast.error('Insira uma chave de API válida.');
      return;
    }

    setIsSavingKey(true);
    try {
      const res = await saveSimLabApiKey({
        data: {
          provider: keyProvider,
          apiKey: apiKeyInput.trim(),
          label: `Chave ${keyProvider.toUpperCase()} (SimLab Studio)`
        }
      });

      if (res?.success) {
        toast.success(`Chave ${keyProvider.toUpperCase()} ativada com sucesso!`);
        setApiKeyInput('');
        setIsKeySheetOpen(false);
        await refreshKeyStatus();
      }
    } catch (err: any) {
      toast.error('Falha ao salvar chave: ' + err.message);
    } finally {
      setIsSavingKey(false);
    }
  }

  async function handleTriggerInquiry(e: React.FormEvent) {
    e.preventDefault();
    if (!inputMessage.trim() || isProcessing) return;

    const queryText = inputMessage.trim();
    setInputMessage('');
    setIsProcessing(true);

    // Adiciona feedback otimista da mensagem do moderador
    const tempModMsg: FocusGroupMessage = {
      id: 'mod-' + Date.now(),
      session_id: session?.id || 'default',
      sender_type: 'moderator_user',
      sender_id: 'moderator',
      sender_name: 'Moderador de Hipóteses (Operação)',
      content: queryText,
      created_at: new Date().toISOString(),
    };
    setStatements(prev => [...prev, tempModMsg]);

    try {
      const result = await sendFocusGroupMessage({
        data: {
          sessionId: session?.id || 'default',
          userMessage: queryText,
          selectedPersonas: selectedPersonas,
        }
      });

      if (result?.success && result.newMessages.length > 0) {
        setStatements(prev => {
          const filtered = prev.filter(m => m.id !== tempModMsg.id);
          return [...filtered, ...result.newMessages];
        });
        toast.success(`Pareceres computados para ${selectedPersonas.length} personas.`);
      }
    } catch (err: any) {
      toast.error('Falha ao processar simulação: ' + err.message);
    } finally {
      setIsProcessing(false);
    }
  }

  return (
    <div className="w-full min-h-full bg-background text-foreground flex flex-col font-sans selection:bg-primary/20">
      {/* Level 2: TopBar Flutuante com Glassmorphism Apple HIG */}
      <header className="sticky top-0 z-30 bg-background/90 backdrop-blur-md border-b border-border/40 px-6 py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="size-9 rounded-xl bg-primary/10 border border-primary/20 text-primary flex items-center justify-center shrink-0">
            <Layers className="size-4.5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-sm font-semibold tracking-tight text-foreground">Focus Group</h1>
              <Badge variant="outline" className="text-xs font-medium py-0 px-2 border-border/60">
                Censo IBGE 2022
              </Badge>
              <Badge variant="secondary" className="text-xs font-medium py-0 px-2 text-primary bg-primary/10 border border-primary/20">
                SimLab V2
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground">
              Simulação preditiva ancorada em microdados socioeconômicos, currículos e escolha discreta (McFadden RUM).
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          {/* Status do Motor Cognitivo */}
          {keyStatus.hasActiveKey ? (
            <Badge className="bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 text-xs font-medium py-1 px-3 gap-1.5 h-8">
              <Cpu className="size-3.5 text-emerald-500" />
              <span>IA Viva ({keyStatus.activeProvider?.toUpperCase()})</span>
            </Badge>
          ) : (
            <Badge className="bg-sky-500/10 text-sky-600 border border-sky-500/20 text-xs font-medium py-1 px-3 gap-1.5 h-8">
              <Brain className="size-3.5 text-sky-500" />
              <span>Econometria McFadden (IBGE)</span>
            </Badge>
          )}

          {/* Botão de Governança de Chaves */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsKeySheetOpen(true)}
            className="h-8 rounded-xl text-xs font-medium gap-1.5 border-border/80"
          >
            <Key className="size-3.5" />
            <span>Chave de IA</span>
          </Button>

          <Badge className="bg-muted text-muted-foreground border-border/60 text-xs font-medium py-1 px-3 gap-1.5 h-8">
            <Activity className="size-3 text-emerald-500" />
            {selectedPersonas.length} de {availablePersonas.length} Personas Ativas
          </Badge>
        </div>
      </header>

      {/* Grid Principal: Terminal de 2 Colunas */}
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
        {/* Barra Horizontal Compacta Mobile */}
        <div className="lg:hidden border-b border-border/40 bg-card/40 p-2.5 space-y-1.5 shrink-0">
          <div className="flex items-center justify-between text-xs text-muted-foreground font-medium px-1">
            <span className="flex items-center gap-1.5">
              <Users className="size-3" />
              Bancada Amostral ({selectedPersonas.length}/{availablePersonas.length})
            </span>
            <span className="text-xs">Toque para alternar</span>
          </div>
          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-0.5">
            {availablePersonas.map((p) => {
              const isSelected = selectedPersonas.some(x => x.id === p.id);
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => handleTogglePersona(p)}
                  className={`h-11 px-3 rounded-xl border text-xs font-medium shrink-0 flex items-center gap-2 transition-all min-h-[44px] ${
                    isSelected
                      ? 'bg-card border-border shadow-xs text-foreground ring-1 ring-primary/30'
                      : 'bg-muted/30 border-transparent text-muted-foreground opacity-60'
                  }`}
                >
                  <span className="truncate max-w-[120px]">{p.display_name}</span>
                  <Badge variant="secondary" className="text-xs py-0 px-1.5 rounded-sm">
                    {p.abep_social_class}
                  </Badge>
                </button>
              );
            })}
          </div>
        </div>

        {/* Painel Lateral Desktop: Bancada Amostral com Currículos e Finanças */}
        <aside className="hidden lg:block w-88 border-r border-border/60 bg-card/30 p-4 space-y-4 overflow-y-auto no-scrollbar shrink-0">
          <div className="flex items-center justify-between text-xs text-muted-foreground font-medium pb-2 border-b border-border/40">
            <span className="flex items-center gap-1.5">
              <Users className="size-3.5" />
              Bancada Amostral Ativa
            </span>
            <span className="font-semibold text-foreground">{selectedPersonas.length} selecionadas</span>
          </div>

          <div className="space-y-2.5">
            {availablePersonas.map((p) => {
              const isSelected = selectedPersonas.some(x => x.id === p.id);
              const profession = p.curriculum?.profession_title || 'Profissional autônomo';
              const surplus = p.financial_sheet?.discretionary_surplus_brl || Math.round(p.median_income_brl * 0.25);

              return (
                <div
                  key={p.id}
                  className={`p-3.5 rounded-2xl border transition-all min-h-[44px] ${
                    isSelected 
                      ? 'bg-card border-border/90 shadow-xs ring-1 ring-border/80' 
                      : 'bg-muted/20 border-transparent opacity-60 hover:opacity-100 hover:bg-muted/40'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0" onClick={() => handleTogglePersona(p)}>
                      <p className="text-xs font-semibold text-foreground truncate">{p.display_name}</p>
                      <p className="text-xs text-muted-foreground truncate mt-0.5">
                        {profession}
                      </p>
                    </div>
                    <Badge variant="secondary" className="text-xs font-semibold py-0.5 px-2 shrink-0">
                      {p.abep_social_class}
                    </Badge>
                  </div>

                  <div className="mt-3 pt-2.5 border-t border-border/40 grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <span className="text-muted-foreground block text-xs">Folga Mensal POF</span>
                      <span className="font-semibold text-foreground">R$ {surplus.toLocaleString('pt-BR')}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground block text-xs">Sensibilidade Preço</span>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <Progress value={p.price_sensitivity * 10} className="h-1 bg-muted/60" />
                        <span className="font-semibold text-xs">{p.price_sensitivity}</span>
                      </div>
                    </div>
                  </div>

                  {/* Ação de Inspecionar Ficha 360° */}
                  <div className="mt-2.5 pt-2 border-t border-border/30 flex items-center justify-between">
                    <button
                      type="button"
                      onClick={() => handleTogglePersona(p)}
                      className="text-xs text-primary font-medium hover:underline"
                    >
                      {isSelected ? 'Desmarcar' : 'Incluir na Bancada'}
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setInspectingPersona(p);
                      }}
                      className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1"
                    >
                      <FileText className="size-3" />
                      <span>Dossiê 360°</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </aside>

        {/* Painel Central: Trilha de Depoimentos Auditados */}
        <main className="flex-1 flex flex-col bg-background">
          <div className="flex-1 p-6 overflow-y-auto space-y-4 no-scrollbar">
            <div className="rounded-2xl border border-border/80 bg-card divide-y divide-border/40 shadow-xs overflow-hidden">
              {statements.map((s) => {
                const isModerator = s.sender_type === 'moderator_user';
                const isScientist = s.sender_type === 'squad_scientist';
                const matchedPersona = availablePersonas.find(p => p.id === s.sender_id);

                return (
                  <div key={s.id} className={`p-4.5 flex items-start gap-4 transition-colors ${
                    isModerator ? 'bg-primary/5' : isScientist ? 'bg-blue-500/5' : 'bg-transparent'
                  }`}>
                    <div className={`size-8 rounded-xl flex items-center justify-center shrink-0 mt-0.5 text-xs font-bold ${
                      isModerator 
                        ? 'bg-primary text-primary-foreground' 
                        : isScientist 
                        ? 'bg-blue-500/10 text-blue-600 border border-blue-500/20' 
                        : 'bg-muted text-foreground border border-border/60'
                    }`}>
                      {isModerator ? <Command className="size-4" /> : isScientist ? <ShieldCheck className="size-4" /> : <Activity className="size-4" />}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <p className="text-xs font-semibold text-foreground">{s.sender_name}</p>
                          {matchedPersona && (
                            <button
                              type="button"
                              onClick={() => setInspectingPersona(matchedPersona)}
                              className="text-xs text-muted-foreground hover:text-primary underline flex items-center gap-0.5"
                            >
                              <span>ver currículo e finanças</span>
                            </button>
                          )}
                        </div>
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                          <Clock className="size-3" />
                          {new Date(s.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      <p className="text-sm text-foreground/90 mt-1.5 leading-relaxed">
                        {s.content}
                      </p>
                      {s.sentiment_score !== null && s.sentiment_score !== undefined && (
                        <div className="mt-2.5 flex items-center gap-3">
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-muted-foreground font-medium">Receptividade Estimada:</span>
                            <div className="w-20 bg-muted/60 h-1.5 rounded-sm overflow-hidden">
                              <div 
                                className={`h-full rounded-sm ${s.sentiment_score >= 0.75 ? 'bg-emerald-500' : s.sentiment_score >= 0.5 ? 'bg-amber-500' : 'bg-rose-500'}`}
                                style={{ width: `${Math.round((s.sentiment_score || 0) * 100)}%` }}
                              />
                            </div>
                            <span className="text-xs font-semibold">{Math.round((s.sentiment_score || 0) * 100)}%</span>
                          </div>
                          {s.sentiment_score >= 0.75 && (
                            <Badge variant="outline" className="text-xs py-0 px-1.5 border-emerald-500/30 text-emerald-600 bg-emerald-500/5">
                              Alta Probabilidade de Compra
                            </Badge>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {isProcessing && (
              <div className="flex items-center gap-2 text-xs text-muted-foreground py-2 px-1">
                <span className="size-2 rounded-full bg-primary animate-pulse" />
                Decompondo ticket, calculando utilidade de McFadden e avaliando comprometimento de renda...
              </div>
            )}
            <div ref={feedEndRef} />
          </div>

          {/* Barra Inferior de Entrada (Level 2) */}
          <footer className="p-4 border-t border-border/60 bg-background/90 backdrop-blur-md">
            <form onSubmit={handleTriggerInquiry} className="flex items-center gap-3 max-w-4xl mx-auto">
              <Input
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                placeholder="Insira a hipótese comercial (ex: 'Pacote Beto Carrero World por R$ 290,00 por pessoa com transporte e ingresso em até 10x sem juros no cartão')"
                className="flex-1 h-11 rounded-xl text-sm bg-card border-border/80 focus-visible:ring-1 focus-visible:ring-primary min-h-[44px]"
                disabled={isProcessing}
              />
              <Button
                type="submit"
                disabled={isProcessing || !inputMessage.trim()}
                className="h-11 px-6 rounded-xl font-medium text-xs gap-2 min-h-[44px] shrink-0"
              >
                <span>Avaliar Amostra</span>
                <ArrowRight className="size-3.5" />
              </Button>
            </form>
          </footer>
        </main>
      </div>

      {/* ── SHEET 1: DOSSIÊ CURRICULAR & BALANÇO FINANCEIRO 360° DA PERSONA ── */}
      <Sheet open={!!inspectingPersona} onOpenChange={(open) => !open && setInspectingPersona(null)}>
        <SheetContent side="right" size="wide" className="w-full sm:max-w-3xl md:max-w-4xl lg:max-w-[70vw] xl:max-w-[70vw] overflow-y-auto p-6 space-y-6">
          {inspectingPersona && (
            <>
              <SheetHeader className="space-y-1">
                <div className="flex items-center gap-2">
                  <Badge variant="secondary" className="text-xs font-semibold">
                    Classe {inspectingPersona.abep_social_class}
                  </Badge>
                  <Badge variant="outline" className="text-xs font-medium">
                    {inspectingPersona.region} · {inspectingPersona.age} anos
                  </Badge>
                </div>
                <SheetTitle className="text-base font-bold text-foreground">
                  {inspectingPersona.display_name}
                </SheetTitle>
                <SheetDescription className="text-xs text-muted-foreground">
                  Dossiê demográfico e patrimonial calibrado pelo Censo IBGE 2022 e POF.
                </SheetDescription>
              </SheetHeader>

              {/* Bloco 1: Currículo & Carreira */}
              <div className="rounded-xl border border-border/70 p-4 space-y-3 bg-muted/20">
                <div className="flex items-center gap-2 text-xs font-semibold text-foreground">
                  <Briefcase className="size-4 text-primary" />
                  <span>Currículo Profissional e Ocupação</span>
                </div>
                <div className="space-y-1.5 text-xs">
                  <p className="text-foreground font-medium">
                    {inspectingPersona.curriculum?.profession_title || 'Profissional Autônomo'}
                  </p>
                  <p className="text-muted-foreground text-xs">
                    Setor: {inspectingPersona.curriculum?.occupation_sector || 'Serviços'} · {inspectingPersona.curriculum?.work_experience_years || 10} anos de atuação
                  </p>
                  <p className="text-muted-foreground text-xs">
                    Formação: {inspectingPersona.curriculum?.education_degree || inspectingPersona.education_level}
                  </p>
                  <p className="text-foreground/90 text-xs leading-relaxed pt-1 border-t border-border/40">
                    {inspectingPersona.curriculum?.career_summary || inspectingPersona.bio}
                  </p>
                </div>
              </div>

              {/* Bloco 2: Perfil do Domicílio */}
              <div className="rounded-xl border border-border/70 p-4 space-y-3 bg-muted/20">
                <div className="flex items-center gap-2 text-xs font-semibold text-foreground">
                  <Home className="size-4 text-primary" />
                  <span>Estrutura Familiar e Dependentes</span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="text-xs text-muted-foreground block">Estrutura</span>
                    <span className="font-semibold text-foreground capitalize">
                      {inspectingPersona.household_profile?.family_structure?.replace(/_/g, ' ') || 'Nuclear com filhos'}
                    </span>
                  </div>
                  <div>
                    <span className="text-xs text-muted-foreground block">Membros no Lar</span>
                    <span className="font-semibold text-foreground">
                      {inspectingPersona.household_profile?.total_members || 3} pessoas ({inspectingPersona.household_profile?.dependents_count || 1} dependentes)
                    </span>
                  </div>
                </div>
              </div>

              {/* Bloco 3: Balanço Patrimonial & Renda POF */}
              <div className="rounded-xl border border-border/70 p-4 space-y-3 bg-muted/20">
                <div className="flex items-center gap-2 text-xs font-semibold text-foreground">
                  <Wallet className="size-4 text-primary" />
                  <span>Balanço Mensal e Capacidade Financeira</span>
                </div>
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <span className="text-xs text-muted-foreground block">Renda Bruta</span>
                    <span className="font-semibold text-foreground">
                      R$ {(inspectingPersona.financial_sheet?.gross_monthly_income_brl || inspectingPersona.median_income_brl).toLocaleString('pt-BR')}
                    </span>
                  </div>
                  <div>
                    <span className="text-xs text-muted-foreground block">Renda Líquida</span>
                    <span className="font-semibold text-foreground">
                      R$ {(inspectingPersona.financial_sheet?.net_monthly_income_brl || Math.round(inspectingPersona.median_income_brl * 0.85)).toLocaleString('pt-BR')}
                    </span>
                  </div>
                  <div>
                    <span className="text-xs text-muted-foreground block">Custos Fixos Essenciais</span>
                    <span className="font-semibold text-foreground">
                      R$ {(inspectingPersona.financial_sheet?.essential_fixed_expenses_brl || Math.round(inspectingPersona.median_income_brl * 0.7)).toLocaleString('pt-BR')}
                    </span>
                  </div>
                  <div className="p-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                    <span className="text-xs text-emerald-700 block font-medium">Folga Discricionária</span>
                    <span className="font-bold text-emerald-800">
                      R$ {(inspectingPersona.financial_sheet?.discretionary_surplus_brl || Math.round(inspectingPersona.median_income_brl * 0.25)).toLocaleString('pt-BR')}
                    </span>
                  </div>
                </div>

                <div className="pt-2 border-t border-border/40 grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="text-muted-foreground block text-xs">Limite de Cartão</span>
                    <span className="font-semibold text-foreground">
                      R$ {(inspectingPersona.financial_sheet?.credit_limit_available_brl || 3000).toLocaleString('pt-BR')}
                    </span>
                  </div>
                  <div>
                    <span className="text-muted-foreground block text-xs">Comprometimento Dívida</span>
                    <span className="font-semibold text-foreground">
                      {inspectingPersona.financial_sheet?.debt_commitment_percent || 20}%
                    </span>
                  </div>
                </div>
              </div>

              {/* Bloco 4: Heurísticas de Decisão */}
              <div className="rounded-xl border border-border/70 p-4 space-y-3 bg-muted/20">
                <div className="flex items-center gap-2 text-xs font-semibold text-foreground">
                  <Scale className="size-4 text-primary" />
                  <span>Heurísticas Comportamentais de Compra</span>
                </div>
                <div className="space-y-2 text-xs">
                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-muted-foreground">Sensibilidade a Preço</span>
                      <span className="font-semibold">{inspectingPersona.price_sensitivity} / 10</span>
                    </div>
                    <Progress value={inspectingPersona.price_sensitivity * 10} className="h-1.5" />
                  </div>
                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-muted-foreground">Índice de Cinismo / Ceticismo</span>
                      <span className="font-semibold">{inspectingPersona.cynicism_index} / 10</span>
                    </div>
                    <Progress value={inspectingPersona.cynicism_index * 10} className="h-1.5" />
                  </div>
                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-muted-foreground">Impulsividade de Compra</span>
                      <span className="font-semibold">{inspectingPersona.impulsivity_index} / 10</span>
                    </div>
                    <Progress value={inspectingPersona.impulsivity_index * 10} className="h-1.5" />
                  </div>
                </div>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>

      {/* ── SHEET 2: GOVERNANÇA DE CHAVES DE IA (GEMINI / GROQ / OPENAI) ── */}
      <Sheet open={isKeySheetOpen} onOpenChange={setIsKeySheetOpen}>
        <SheetContent side="right" size="wide" className="w-full sm:max-w-3xl md:max-w-4xl lg:max-w-[70vw] xl:max-w-[70vw] p-6 space-y-5">
          <SheetHeader className="space-y-1">
            <div className="flex items-center gap-2">
              <Key className="size-4 text-primary" />
              <SheetTitle className="text-base font-bold text-foreground">
                Conectar Provedor de IA Real
              </SheetTitle>
            </div>
            <SheetDescription className="text-xs text-muted-foreground">
              Insira sua chave de API para ativar inferência cognitiva viva com LLM no SimLab e Squads.
            </SheetDescription>
          </SheetHeader>

          <form onSubmit={handleSaveKey} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-foreground">Provedor de IA</label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setKeyProvider('gemini')}
                  className={`h-10 rounded-xl border text-xs font-medium transition-all ${
                    keyProvider === 'gemini' 
                      ? 'bg-primary text-primary-foreground border-primary' 
                      : 'bg-muted/40 border-border/80 text-muted-foreground'
                  }`}
                >
                  Google Gemini
                </button>
                <button
                  type="button"
                  onClick={() => setKeyProvider('groq')}
                  className={`h-10 rounded-xl border text-xs font-medium transition-all ${
                    keyProvider === 'groq' 
                      ? 'bg-primary text-primary-foreground border-primary' 
                      : 'bg-muted/40 border-border/80 text-muted-foreground'
                  }`}
                >
                  Groq (Llama)
                </button>
                <button
                  type="button"
                  onClick={() => setKeyProvider('openai')}
                  className={`h-10 rounded-xl border text-xs font-medium transition-all ${
                    keyProvider === 'openai' 
                      ? 'bg-primary text-primary-foreground border-primary' 
                      : 'bg-muted/40 border-border/80 text-muted-foreground'
                  }`}
                >
                  OpenAI
                </button>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-foreground">Chave de API ({keyProvider.toUpperCase()})</label>
              <Input
                type="password"
                placeholder={keyProvider === 'gemini' ? 'AIzaSy...' : keyProvider === 'groq' ? 'gsk_...' : 'sk-...'}
                value={apiKeyInput}
                onChange={(e) => setApiKeyInput(e.target.value)}
                className="h-11 rounded-xl text-xs bg-card border-border/80 font-mono"
              />
              <p className="text-xs text-muted-foreground leading-relaxed">
                A chave é criptografada e armazenada no Supabase (`api_key_pools`), habilitando chamadas seguras server-side.
              </p>
            </div>

            <div className="pt-2">
              <Button
                type="submit"
                disabled={isSavingKey || !apiKeyInput.trim()}
                className="w-full h-11 rounded-xl font-medium text-xs gap-2 min-h-[44px]"
              >
                {isSavingKey ? 'Salvando e Testando...' : 'Salvar e Ativar Chave'}
              </Button>
            </div>
          </form>

          <div className="pt-4 border-t border-border/50 space-y-2 text-xs">
            <p className="font-semibold text-foreground">Status Atual:</p>
            <div className="p-3 rounded-xl border border-border/60 bg-muted/20 space-y-1 text-xs">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Chave ativa detectada:</span>
                <span className={keyStatus.hasActiveKey ? 'text-emerald-600 font-semibold' : 'text-amber-600 font-semibold'}>
                  {keyStatus.hasActiveKey ? `Sim (${keyStatus.activeProvider?.toUpperCase()})` : 'Não (Operando via McFadden RUM)'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Chaves na pool:</span>
                <span className="font-semibold text-foreground">{keyStatus.poolCount} cadastradas</span>
              </div>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
