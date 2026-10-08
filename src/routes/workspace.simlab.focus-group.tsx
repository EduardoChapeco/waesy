import { createFileRoute } from '@tanstack/react-router';
import { useState, useRef, useEffect } from 'react';
import { Users, Send, Layers, Brain, ShieldCheck, CheckCircle2, Activity, TrendingUp, DollarSign, Filter, Sliders, ArrowRight, Clock, Command, MessageSquare, ChevronRight, Info, Key, Briefcase, Home, Wallet, CreditCard, UserCheck, Scale, FileText, Cpu } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { toast } from 'sonner';
import type { SyntheticArchetype, FocusGroupMessage, FocusGroupSession } from '@/types/simlab';
import { listSyntheticArchetypes, getOrCreateActiveFocusSession, listFocusGroupMessages, sendFocusGroupMessage } from '@/services/simlab.functions';
import { getSimLabKeyStatus, saveSimLabApiKey } from '@/services/api-orchestrator.functions';
import { getStoreSettings } from '@/services/store.functions';

export const Route = createFileRoute('/workspace/simlab/focus-group')({
  head: () => ({ meta: [{ title: 'Focus Group Sintético — Exploração Qualitativa | Waesy' }] }),
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

  const [statements, setStatements] = useState<FocusGroupMessage[]>([]);

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

        // Perfis sintéticos curados; não são pessoas entrevistadas nem amostra IBGE.
        const rows = storeId ? await listSyntheticArchetypes({ data: { storeId } }) : [];
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
        toast.error('Selecione ao menos um perfil sintético.');
        return;
      }
      setSelectedPersonas(selectedPersonas.filter(x => x.id !== p.id));
    } else {
      if (selectedPersonas.length >= 5) {
        toast.error('Limite operacional: máximo de 5 perfis por pergunta neste console.');
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
    if (!session?.id) {
      toast.error('A sessão do workspace ainda não está pronta. Recarregue e tente novamente.');
      return;
    }

    const queryText = inputMessage.trim();
    setInputMessage('');
    setIsProcessing(true);

    // Adiciona feedback otimista da mensagem do moderador
    const tempModMsg: FocusGroupMessage = {
      id: 'mod-' + Date.now(),
          session_id: session.id,
      sender_type: 'moderator_user',
          sender_id: 'moderator',
          sender_name: 'Pesquisador do workspace',
      content: queryText,
      created_at: new Date().toISOString(),
    };
    setStatements(prev => [...prev, tempModMsg]);

    try {
      const result = await sendFocusGroupMessage({
        data: {
          sessionId: session.id,
          userMessage: queryText,
          selectedPersonas: selectedPersonas,
        }
      });

      if (result?.success && result.newMessages.length > 0) {
        setStatements(prev => {
          const filtered = prev.filter(m => m.id !== tempModMsg.id);
          return [...filtered, ...result.newMessages];
        });
        toast.success(`Respostas hipotéticas geradas para ${selectedPersonas.length} perfis sintéticos.`);
      }
    } catch (err: any) {
      setStatements(prev => prev.filter(m => m.id !== tempModMsg.id));
      setInputMessage(queryText);
      toast.error('Falha ao processar simulação: ' + err.message);
    } finally {
      setIsProcessing(false);
    }
  }

  return (
    <div className="w-full min-h-full bg-background text-foreground flex flex-col font-sans selection:bg-primary/20">
      {/* Level 2: TopBar Flutuante com Glassmorphism Apple HIG */}
      <header className="sticky top-0 z-30 bg-background/90 backdrop-blur-md border-b border-border/40 px-6 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="size-9 rounded-lg bg-primary/10 border border-primary/20 text-primary flex items-center justify-center shrink-0">
            <Layers className="size-4.5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-sm font-semibold tracking-tight text-foreground">Focus Group</h1>
              <Badge variant="secondary" className="text-xs font-medium py-0 px-2 text-primary bg-primary/10 border border-primary/20">
                Reações sintéticas
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground">
              Respostas hipotéticas geradas por IA sobre perfis sintéticos; sem probabilidade de compra ou forecast.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          {/* Status do Motor Cognitivo */}
          {keyStatus.hasActiveKey ? (
            <Badge className="bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 text-xs font-medium py-1 px-3 gap-2 h-8">
              <Cpu className="size-3.5 text-emerald-500" />
              <span>Chave configurada ({keyStatus.activeProvider?.toUpperCase()})</span>
            </Badge>
          ) : (
            <Badge className="bg-sky-500/10 text-sky-600 border border-sky-500/20 text-xs font-medium py-1 px-3 gap-2 h-8">
              <Brain className="size-3.5 text-sky-500" />
              <span>Disponibilidade verificada ao enviar</span>
            </Badge>
          )}

          {/* Botão de Governança de Chaves */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsKeySheetOpen(true)}
            className="h-8 rounded-lg text-xs font-medium gap-2 border-border/80"
          >
            <Key className="size-3.5" />
            <span>Chave de IA</span>
          </Button>

          <Badge className="bg-muted text-muted-foreground border-border/60 text-xs font-medium py-1 px-3 gap-2 h-8">
            <Activity className="size-3 text-emerald-500" />
            {selectedPersonas.length} de {availablePersonas.length} Personas Ativas
          </Badge>
        </div>
      </header>

      {/* Grid Principal: Terminal de 2 Colunas */}
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
        {/* Barra Horizontal Compacta Mobile */}
        <div className="lg:hidden border-b border-border/40 bg-card/40 p-3 space-y-2 shrink-0">
          <div className="flex items-center justify-between text-xs text-muted-foreground font-medium px-1">
            <span className="flex items-center gap-2">
              <Users className="size-3" />
              Bancada Amostral ({selectedPersonas.length}/{availablePersonas.length})
            </span>
            <span className="text-xs">Toque para alternar</span>
          </div>
          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-1">
            {availablePersonas.map((p) => {
              const isSelected = selectedPersonas.some(x => x.id === p.id);
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => handleTogglePersona(p)}
                  className={`h-11 px-3 rounded-lg border text-xs font-medium shrink-0 flex items-center gap-2 transition-all min-h-11 ${
                    isSelected
                      ? 'bg-card border-border shadow-xs text-foreground ring-1 ring-primary/30'
                      : 'bg-muted/30 border-transparent text-muted-foreground opacity-60'
                  }`}
                >
                  <span className="truncate max-w-[120px]">{p.display_name}</span>
                  <Badge variant="secondary" className="text-xs py-0 px-2 rounded-sm">
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
            <span className="flex items-center gap-2">
              <Users className="size-3.5" />
              Bancada Amostral Ativa
            </span>
            <span className="font-semibold text-foreground">{selectedPersonas.length} selecionadas</span>
          </div>

          <div className="space-y-3">
            {availablePersonas.map((p) => {
              const isSelected = selectedPersonas.some(x => x.id === p.id);
              const profession = p.curriculum?.profession_title || (p.decision_heuristics as any)?.occupation || 'Ocupação não informada';

              return (
                <div
                  key={p.id}
                  className={`p-4 rounded-lg border transition-all min-h-11 ${
                    isSelected 
                      ? 'bg-card border-border/90 shadow-xs ring-1 ring-border/80' 
                      : 'bg-muted/20 border-transparent opacity-60 hover:opacity-100 hover:bg-muted/40'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0" onClick={() => handleTogglePersona(p)}>
                      <p className="text-xs font-semibold text-foreground truncate">{p.display_name}</p>
                      <p className="text-xs text-muted-foreground truncate mt-1">
                        {profession}
                      </p>
                    </div>
                    <Badge variant="secondary" className="text-xs font-semibold py-1 px-2 shrink-0">
                      {p.abep_social_class}
                    </Badge>
                  </div>

                  <div className="mt-3 pt-3 border-t border-border/40 space-y-1 text-[10px] text-muted-foreground">
                    <p>{p.median_income_brl == null ? 'Renda: não informada' : 'Renda: preenchida, origem não verificada'}</p>
                    <p>Origem: {p.source_profile_type || p.profile_origin || 'desconhecida'} · calibração: {p.calibration_status || 'desconhecida'}</p>
                  </div>

                  {/* Ação de Inspecionar Ficha 360° */}
                  <div className="mt-3 pt-2 border-t border-border/30 flex items-center justify-between">
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

        {/* Painel Central: respostas sintéticas com proveniência explícita */}
        <main className="flex-1 flex flex-col bg-background">
          <div className="flex-1 p-6 overflow-y-auto space-y-4 no-scrollbar">
            <div className="rounded-lg border border-border/80 bg-card divide-y divide-border/40 shadow-xs overflow-hidden">
              {statements.length === 0 && (
                <div className="p-6 text-center space-y-2">
                  <MessageSquare className="mx-auto size-5 text-muted-foreground" />
                  <p className="text-xs font-semibold text-foreground">Nenhuma pergunta ou resposta nesta sessão</p>
                  <p className="text-[10px] text-muted-foreground">Selecione perfis sintéticos e envie uma pergunta. Se a IA falhar, nenhuma resposta será inventada.</p>
                </div>
              )}
              {statements.map((s) => {
                const isModerator = s.sender_type === 'moderator_user';
                const isScientist = s.sender_type === 'squad_scientist';
                const matchedPersona = availablePersonas.find(p => p.id === s.sender_id);

                return (
                  <div key={s.id} className={`p-4.5 flex items-start gap-4 transition-colors ${
                    isModerator ? 'bg-primary/5' : isScientist ? 'bg-blue-500/5' : 'bg-transparent'
                  }`}>
                    <div className={`size-8 rounded-lg flex items-center justify-center shrink-0 mt-1 text-xs font-bold ${
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
                              className="text-xs text-muted-foreground hover:text-primary underline flex items-center gap-1"
                            >
                          <span>ver perfil e proveniência</span>
                            </button>
                          )}
                        </div>
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                          <Clock className="size-3" />
                          {new Date(s.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      <p className="text-sm text-foreground/90 mt-2 leading-relaxed">
                      {s.content}
                      </p>
                      {isModerator ? <Badge variant="outline" className="mt-2 text-[10px]">Pergunta do pesquisador</Badge> : s.provenance?.record_kind === 'llm_generated_synthetic_qualitative_response' ? <Badge variant="outline" className="mt-2 text-[10px]">Resposta hipotética de IA · não é cliente real</Badge> : <Badge variant="secondary" className="mt-2 text-[10px]">Registro legado · origem desconhecida</Badge>}
                    </div>
                  </div>
                );
              })}
            </div>

            {isProcessing && (
              <div className="flex items-center gap-2 text-xs text-muted-foreground py-2 px-1">
                <span className="size-2 rounded-full bg-primary animate-pulse" />
                Gerando respostas qualitativas para os perfis selecionados...
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
                placeholder="Faça uma pergunta sobre a oferta, preço, mensagem ou proposta..."
                className="flex-1 h-11 rounded-lg text-sm bg-card border-border/80 focus-visible:ring-1 focus-visible:ring-primary min-h-11"
                disabled={isProcessing}
              />
              <Button
                type="submit"
                disabled={isProcessing || !inputMessage.trim()}
                className="h-11 px-6 rounded-lg font-medium text-xs gap-2 min-h-11 shrink-0"
              >
                <span>Gerar reações hipotéticas</span>
                <ArrowRight className="size-3.5" />
              </Button>
            </form>
          </footer>
        </main>
      </div>

      {/* ── SHEET 1: PERFIL SINTÉTICO E PROVENIÊNCIA ── */}
      <Sheet open={!!inspectingPersona} onOpenChange={(open) => !open && setInspectingPersona(null)}>
        <SheetContent side="right" size="wide" className="w-full sm:max-w-3xl md:max-w-4xl lg:max-w-[70vw] xl:max-w-[70vw] overflow-y-auto p-6 space-y-6">
          {inspectingPersona && (
            <>
              <SheetHeader className="space-y-2">
                <div className="flex items-center gap-2">
                  <Badge variant="secondary" className="text-xs">Perfil sintético · classe {inspectingPersona.abep_social_class}</Badge>
                  <Badge variant="outline" className="text-xs">{inspectingPersona.region} · {inspectingPersona.age} anos</Badge>
                </div>
                <SheetTitle className="text-base font-bold">{inspectingPersona.display_name}</SheetTitle>
                <SheetDescription className="text-xs text-muted-foreground">
                  Personagem sintético. Origem: {inspectingPersona.source_profile_type || inspectingPersona.profile_origin || "desconhecida"}. Calibração: {inspectingPersona.calibration_status || "desconhecida"}.
                </SheetDescription>
              </SheetHeader>

              <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-4 text-xs text-amber-700 dark:text-amber-300">
                Os atributos abaixo descrevem um perfil de simulação; não são ficha de uma pessoa real, dados de microdados individuais nem evidência de compra.
              </div>

              <div className="rounded-lg border border-border/70 p-4 space-y-3 bg-muted/20">
                <div className="flex items-center gap-2 text-xs font-semibold"><Briefcase className="size-4 text-primary" /><span>Contexto informado do perfil</span></div>
                <dl className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div><dt className="text-muted-foreground">Ocupação</dt><dd className="font-medium">{inspectingPersona.curriculum?.profession_title || (inspectingPersona.decision_heuristics as any)?.occupation || "Não informada"}</dd></div>
                  <div><dt className="text-muted-foreground">Cidade/região</dt><dd className="font-medium">{(inspectingPersona.decision_heuristics as any)?.city || "Não informada"} · {inspectingPersona.region}</dd></div>
                  <div><dt className="text-muted-foreground">Renda mensal</dt><dd className="font-medium">{inspectingPersona.median_income_brl == null ? "Não informada" : `R$ ${inspectingPersona.median_income_brl.toLocaleString("pt-BR")}`} · fonte não verificada</dd></div>
                  <div><dt className="text-muted-foreground">Fonte/calibração</dt><dd className="font-medium">{inspectingPersona.source_profile_type || "legada desconhecida"} · {inspectingPersona.calibration_status || "desconhecida"}</dd></div>
                </dl>
              </div>

              <div className="rounded-lg border border-border/70 p-4 space-y-2 bg-muted/20">
                <h4 className="text-xs font-semibold">Descrição comportamental fornecida ao modelo</h4>
                <p className="text-xs leading-relaxed text-muted-foreground whitespace-pre-wrap">
                  {inspectingPersona.bio || (inspectingPersona.decision_heuristics as any)?.profile_text || "Nenhuma descrição comportamental foi fornecida."}
                </p>
              </div>

              <div className="rounded-lg border border-border/70 p-4 space-y-2 bg-muted/20">
                <h4 className="text-xs font-semibold">Limitação</h4>
                <p className="text-xs leading-relaxed text-muted-foreground">Traços numéricos ou informações ausentes não devem ser tratados como observações ou parâmetros calibrados. Respostas geradas por LLM são hipóteses qualitativas, não respostas de clientes.</p>
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
            <div className="space-y-2">
              <label className="text-xs font-medium text-foreground">Provedor de IA</label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setKeyProvider('gemini')}
                  className={`h-10 rounded-lg border text-xs font-medium transition-all ${
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
                  className={`h-10 rounded-lg border text-xs font-medium transition-all ${
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
                  className={`h-10 rounded-lg border text-xs font-medium transition-all ${
                    keyProvider === 'openai' 
                      ? 'bg-primary text-primary-foreground border-primary' 
                      : 'bg-muted/40 border-border/80 text-muted-foreground'
                  }`}
                >
                  OpenAI
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-medium text-foreground">Chave de API ({keyProvider.toUpperCase()})</label>
              <Input
                type="password"
                placeholder={keyProvider === 'gemini' ? 'AIzaSy...' : keyProvider === 'groq' ? 'gsk_...' : 'sk-...'}
                value={apiKeyInput}
                onChange={(e) => setApiKeyInput(e.target.value)}
                className="h-11 rounded-lg text-xs bg-card border-border/80 font-mono"
              />
              <p className="text-xs text-muted-foreground leading-relaxed">
                A chave é criptografada e armazenada no Supabase (`api_key_pools`), habilitando chamadas seguras server-side.
              </p>
            </div>

            <div className="pt-2">
              <Button
                type="submit"
                disabled={isSavingKey || !apiKeyInput.trim()}
                className="w-full h-11 rounded-lg font-medium text-xs gap-2 min-h-11"
              >
                {isSavingKey ? 'Salvando e Testando...' : 'Salvar e Ativar Chave'}
              </Button>
            </div>
          </form>

          <div className="pt-4 border-t border-border/50 space-y-2 text-xs">
            <p className="font-semibold text-foreground">Status Atual:</p>
            <div className="p-3 rounded-lg border border-border/60 bg-muted/20 space-y-1 text-xs">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Chave ativa detectada:</span>
                <span className={keyStatus.hasActiveKey ? 'text-emerald-600 font-semibold' : 'text-amber-600 font-semibold'}>
                  {keyStatus.hasActiveKey ? `Sim (${keyStatus.activeProvider?.toUpperCase()})` : 'Não (provedor de IA não configurado)'}
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
