import { useEffect, useState } from "react";
import { createFileRoute, useRouter } from "@tanstack/react-router";
import { getRealtimeChannel } from "@/services/realtime-channel";
import { ErrorState } from "@/components/state/states";
import { toast } from "sonner";
import {
  CheckCircle2,
  Clock,
  Loader2,
  Plus,
  ShieldCheck,
  Trash2,
  Zap,
} from "lucide-react";
import { AtendimentoSubmoduleHeader } from "@/components/atendimento/AtendimentoSubmoduleHeader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  createStoreQuickAnswer,
  deleteStoreQuickAnswer,
  listStoreQuickAnswers,
} from "@/services/chat-operations.functions";
import { saveStoreSupportSettings } from "@/services/chat.functions";
import { getStoreSettings } from "@/services/store.functions";
import { saveWhatsAppGovernanceConfig } from "@/services/whatsapp-channel-instances.functions";

export const Route = createFileRoute("/workspace/atendimento/horarios")({
  head: () => ({ meta: [{ title: "Horários & Mensagens — Atendimento" }] }),
  loader: async () => {
    try {
      const store = await getStoreSettings();
      const quickAnswers = await listStoreQuickAnswers({ data: { storeId: store?.id } });
      return {
        store,
        quickAnswers: quickAnswers || [],
        loadError: null as string | null,
      };
    } catch (err: any) {
      return {
        store: null,
        quickAnswers: [],
        loadError: err?.message || "Falha ao carregar horários e respostas rápidas.",
      };
    }
  },
  component: WorkspaceAtendimentoHorariosPage,
});

function WorkspaceAtendimentoHorariosPage() {
  const router = useRouter();
  const loaderData = (Route.useLoaderData?.() as any) || {};
  const loadError = loaderData.loadError || null;
  const store = loaderData.store || null;
  const initialSupport = (store?.settings as any)?.support_settings || {};
  const initialGovPerms = (store?.settings as any)?.whatsapp_governance?.permissions || {};

  // Turnos & Ausência
  const [schedules, setSchedules] = useState<Array<{ day: string; hours: string; active: boolean }>>(
    Array.isArray(initialSupport.support_schedules) && initialSupport.support_schedules.length > 0
      ? initialSupport.support_schedules
      : [
          { day: "Segunda a Sexta", hours: "08:00 às 18:00", active: true },
          { day: "Sábado", hours: "08:00 às 12:00", active: true },
          { day: "Domingo e Feriados", hours: "Fechado", active: false },
        ],
  );
  const [autoReplyEnabled, setAutoReplyEnabled] = useState<boolean>(
    initialSupport.auto_reply_enabled ?? true,
  );
  const [awayMessage, setAwayMessage] = useState<string>(initialSupport.away_message || "");

  // Governança global de atendimento
  const [onlyManagersCanViewQr, setOnlyManagersCanViewQr] = useState<boolean>(
    initialGovPerms.onlyManagersCanViewQr ?? true,
  );
  const [onlyManagersCanDisconnect, setOnlyManagersCanDisconnect] = useState<boolean>(
    initialGovPerms.onlyManagersCanDisconnect ?? true,
  );
  const [showAgentNamePrefixInMessages, setShowAgentNamePrefixInMessages] = useState<boolean>(
    initialGovPerms.showAgentNamePrefixInMessages ?? true,
  );
  const [autoConvertIncomingToLead, setAutoConvertIncomingToLead] = useState<boolean>(
    initialGovPerms.autoConvertIncomingToLead ?? true,
  );
  const [enableCatalogSalesBot, setEnableCatalogSalesBot] = useState<boolean>(
    initialGovPerms.enableCatalogSalesBot ?? true,
  );
  const [isSavingAll, setIsSavingAll] = useState(false);

  // Respostas Rápidas / Macros
  const [quickAnswers, setQuickAnswers] = useState<any[]>(loaderData.quickAnswers || []);
  const [shortcut, setShortcut] = useState("");
  const [macroTitle, setMacroTitle] = useState("");
  const [macroCategory, setMacroCategory] = useState("geral");
  const [macroMessage, setMacroMessage] = useState("");
  const [isSavingMacro, setIsSavingMacro] = useState(false);

  useEffect(() => {
    setQuickAnswers(loaderData.quickAnswers || []);
  }, [loaderData.quickAnswers]);

  useEffect(() => {
    const storeId = store?.id;
    if (!storeId) return;
    let debounceTimer: number | null = null;
    const refreshLive = () => {
      if (debounceTimer !== null) window.clearTimeout(debounceTimer);
      debounceTimer = window.setTimeout(async () => {
        debounceTimer = null;
        const fresh = await listStoreQuickAnswers({ data: { storeId } }).catch(() => null);
        if (fresh) setQuickAnswers(fresh);
        void router.invalidate();
      }, 600);
    };
    const filter = `store_id=eq.${storeId}`;
    const { channel, unsubscribe } = getRealtimeChannel(`atendimento-horarios:${storeId}`);
    channel
      ?.on("postgres_changes", { event: "*", schema: "public", table: "store_quick_answers", filter }, refreshLive)
      .on("postgres_changes", { event: "*", schema: "public", table: "chat_departments", filter }, refreshLive)
      .subscribe();
    return () => {
      if (debounceTimer !== null) window.clearTimeout(debounceTimer);
      unsubscribe();
    };
  }, [store?.id, router]);

  const handleSaveHorariosAndGovernance = async () => {
    setIsSavingAll(true);
    try {
      await saveStoreSupportSettings({
        data: {
          storeId: store?.id,
          away_message: awayMessage,
          auto_reply_enabled: autoReplyEnabled,
          support_schedules: schedules,
        },
      });

      await saveWhatsAppGovernanceConfig({
        data: {
          storeId: store?.id,
          permissions: {
            onlyManagersCanViewQr,
            onlyManagersCanDisconnect,
            showAgentNamePrefixInMessages,
            autoConvertIncomingToLead,
            defaultLeadSource: initialGovPerms.defaultLeadSource || "WhatsApp Orgânico",
            enableMobilityBookingBot: Boolean(initialGovPerms.enableMobilityBookingBot),
            enableCatalogSalesBot,
            enableCorporateTravelBot: Boolean(initialGovPerms.enableCorporateTravelBot),
          },
        },
      });

      toast.success("Horários, ausência e regras salvos com sucesso!");
      void router.invalidate();
    } catch (err: any) {
      toast.error(err?.message || "Erro ao salvar configurações.");
    } finally {
      setIsSavingAll(false);
    }
  };

  const handleAddMacro = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!shortcut.trim() || !macroTitle.trim() || !macroMessage.trim()) {
      toast.error("Preencha atalho, título e conteúdo da resposta rápida.");
      return;
    }
    setIsSavingMacro(true);
    try {
      await createStoreQuickAnswer({
        data: {
          storeId: store?.id,
          shortcut: shortcut.trim().replace(/^\//, ""),
          title: macroTitle.trim(),
          category: macroCategory.trim() || "geral",
          message: macroMessage.trim(),
        },
      });
      const fresh = await listStoreQuickAnswers({ data: { storeId: store?.id } });
      setQuickAnswers(fresh || []);
      setShortcut("");
      setMacroTitle("");
      setMacroMessage("");
      toast.success("Resposta rápida salva e pronta para uso com /atalho.");
    } catch (err: any) {
      toast.error(err?.message || "Erro ao salvar resposta rápida.");
    } finally {
      setIsSavingMacro(false);
    }
  };

  const handleDeleteMacro = async (id: string) => {
    const previous = quickAnswers;
    setQuickAnswers((prev) => prev.filter((item) => item.id !== id));
    try {
      await deleteStoreQuickAnswer({ data: { id, storeId: store?.id } });
      toast.success("Resposta rápida removida.");
    } catch (err: any) {
      setQuickAnswers(previous);
      toast.error(err?.message || "Erro ao remover resposta rápida.");
    }
  };

  return (
    <div className="w-full px-0 sm:px-4 space-y-6">
      {loadError ? (
        <ErrorState
          title="Falha ao carregar horários e governança"
          description={loadError}
          onRetry={() => router.invalidate()}
        />
      ) : null}
      <AtendimentoSubmoduleHeader
        activeKey="horarios"
        title="Horários & Mensagens"
        subtitle="Defina turnos de expediente, resposta de ausência, governança e macros de atendimento (/)"
        showPrimaryChatCta={false}
        rightSlot={
          <Button
            type="button"
            disabled={isSavingAll}
            onClick={handleSaveHorariosAndGovernance}
            className="h-11 min-h-11 px-4 rounded-lg text-xs font-semibold gap-2 focus-visible:ring-2 focus-visible:ring-primary"
          >
            {isSavingAll ? (
              <Loader2 className="size-4 animate-spin motion-reduce:animate-none" />
            ) : (
              <CheckCircle2 className="size-4" />
            )}
            <span>Salvar Horários & Regras</span>
          </Button>
        }
      />

      <section className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Card Turnos */}
        <div className="rounded-xl border border-border/60 bg-card p-4 space-y-4">
          <div className="flex items-center gap-2">
            <Clock className="size-4 text-muted-foreground" />
            <h2 className="text-sm font-semibold text-foreground">Turnos de Expediente</h2>
          </div>

          <div className="space-y-3">
            {schedules.map((item, idx) => (
              <div
                key={item.day}
                className="p-3 rounded-lg bg-muted/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
              >
                <div className="flex-1 space-y-1">
                  <span className="text-xs font-semibold text-foreground block">{item.day}</span>
                  <Input
                    value={item.hours}
                    onChange={(e) => {
                      const next = [...schedules];
                      next[idx] = { ...next[idx], hours: e.target.value };
                      setSchedules(next);
                    }}
                    className="h-11 min-h-11 text-xs bg-background"
                    placeholder="Ex: 08:00 às 18:00"
                  />
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Switch
                    id={`sched-${idx}`}
                    checked={item.active}
                    onCheckedChange={(checked) => {
                      const next = [...schedules];
                      next[idx] = { ...next[idx], active: checked };
                      setSchedules(next);
                    }}
                  />
                  <Badge variant="outline" className="text-xs">
                    {item.active ? "Ativo" : "Fechado"}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Card Ausência & Regras de Segurança */}
        <div className="rounded-xl border border-border/60 bg-card p-4 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <ShieldCheck className="size-4 text-muted-foreground" />
              <span>Ausência & Governança Global</span>
            </h2>
            <div className="flex items-center gap-2">
              <Switch
                id="auto-reply-hours"
                checked={autoReplyEnabled}
                onCheckedChange={setAutoReplyEnabled}
              />
              <Label htmlFor="auto-reply-hours" className="text-xs cursor-pointer">
                Auto-resposta fora do horário
              </Label>
            </div>
          </div>

          <div className="space-y-1">
            <Label className="text-xs font-medium text-muted-foreground">
              Mensagem Automática de Ausência
            </Label>
            <Textarea
              rows={3}
              value={awayMessage}
              onChange={(e) => setAwayMessage(e.target.value)}
              placeholder="Nosso atendimento retorna no próximo horário útil..."
              className="text-xs resize-none"
            />
          </div>

          <div className="divide-y divide-border/50">
            <div className="py-3 flex items-center justify-between gap-2">
              <Label htmlFor="gov-qr" className="text-xs cursor-pointer">
                Somente gestores geram/veem QR Code
              </Label>
              <Switch
                id="gov-qr"
                checked={onlyManagersCanViewQr}
                onCheckedChange={setOnlyManagersCanViewQr}
              />
            </div>
            <div className="py-3 flex items-center justify-between gap-2">
              <Label htmlFor="gov-disc" className="text-xs cursor-pointer">
                Somente gestores desconectam aparelhos
              </Label>
              <Switch
                id="gov-disc"
                checked={onlyManagersCanDisconnect}
                onCheckedChange={setOnlyManagersCanDisconnect}
              />
            </div>
            <div className="py-3 flex items-center justify-between gap-2">
              <Label htmlFor="gov-prefix" className="text-xs cursor-pointer">
                Identificar nome do atendente na mensagem
              </Label>
              <Switch
                id="gov-prefix"
                checked={showAgentNamePrefixInMessages}
                onCheckedChange={setShowAgentNamePrefixInMessages}
              />
            </div>
            <div className="py-3 flex items-center justify-between gap-2">
              <Label htmlFor="gov-lead" className="text-xs cursor-pointer">
                Converter novas conversas em leads CRM automaticamente
              </Label>
              <Switch
                id="gov-lead"
                checked={autoConvertIncomingToLead}
                onCheckedChange={setAutoConvertIncomingToLead}
              />
            </div>
            <div className="py-3 flex items-center justify-between gap-2">
              <Label htmlFor="gov-bot" className="text-xs cursor-pointer">
                Habilitar assistente comercial de catálogo
              </Label>
              <Switch
                id="gov-bot"
                checked={enableCatalogSalesBot}
                onCheckedChange={setEnableCatalogSalesBot}
              />
            </div>
          </div>
        </div>
      </section>

      {/* Macros / Respostas Rápidas (/) */}
      <section className="rounded-xl border border-border/60 bg-card p-4 space-y-4">
        <div className="flex items-center gap-2">
          <Zap className="size-4 text-muted-foreground" />
          <div>
            <h2 className="text-sm font-semibold text-foreground">Respostas Rápidas (/)</h2>
            <p className="text-xs text-muted-foreground">
              Digite /atalho no chat ao vivo para inserir textos padronizados com variáveis{" "}
              {"{{nome_cliente}}"}, {"{{loja}}"} e {"{{link_pagamento}}"}.
            </p>
          </div>
        </div>

        <form onSubmit={handleAddMacro} className="grid grid-cols-1 lg:grid-cols-12 gap-3 items-end">
          <div className="lg:col-span-2 space-y-1">
            <Label className="text-xs font-medium">Atalho</Label>
            <Input
              value={shortcut}
              onChange={(e) => setShortcut(e.target.value)}
              placeholder="/pix"
              className="h-11 min-h-11 text-xs font-mono"
            />
          </div>
          <div className="lg:col-span-3 space-y-1">
            <Label className="text-xs font-medium">Título</Label>
            <Input
              value={macroTitle}
              onChange={(e) => setMacroTitle(e.target.value)}
              placeholder="Chave Pix Comercial"
              className="h-11 min-h-11 text-xs"
            />
          </div>
          <div className="lg:col-span-2 space-y-1">
            <Label className="text-xs font-medium">Categoria</Label>
            <Input
              value={macroCategory}
              onChange={(e) => setMacroCategory(e.target.value)}
              placeholder="financeiro"
              className="h-11 min-h-11 text-xs"
            />
          </div>
          <div className="lg:col-span-3 space-y-1">
            <Label className="text-xs font-medium">Mensagem</Label>
            <Input
              value={macroMessage}
              onChange={(e) => setMacroMessage(e.target.value)}
              placeholder="Olá {{nome_cliente}}, segue nosso link..."
              className="h-11 min-h-11 text-xs"
            />
          </div>
          <div className="lg:col-span-2">
            <Button
              type="submit"
              variant="outline"
              disabled={isSavingMacro}
              className="w-full h-11 min-h-11 text-xs font-medium gap-2 border-border/60"
            >
              {isSavingMacro ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />}
              <span>Adicionar</span>
            </Button>
          </div>
        </form>

        {quickAnswers.length === 0 ? (
          <p className="text-xs text-muted-foreground py-6 text-center">
            Nenhuma resposta rápida cadastrada ainda.
          </p>
        ) : (
          <div className="divide-y divide-border/50">
            {quickAnswers.map((qa) => (
              <div
                key={qa.id}
                className="py-3 flex items-start justify-between gap-3 text-xs"
              >
                <div className="min-w-0 space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge variant="secondary" className="font-mono text-xs">
                      /{qa.shortcut}
                    </Badge>
                    <span className="font-semibold text-foreground">{qa.title}</span>
                    <span className="text-muted-foreground">• {qa.category || "geral"}</span>
                  </div>
                  <p className="text-muted-foreground whitespace-pre-line break-words">
                    {qa.message || qa.content}
                  </p>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  aria-label={`Excluir resposta rápida ${qa.shortcut}`}
                  onClick={() => handleDeleteMacro(qa.id)}
                  className="size-11 min-w-11 min-h-11 text-destructive shrink-0 focus-visible:ring-2 focus-visible:ring-destructive"
                >
                  <Trash2 className="size-4" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
