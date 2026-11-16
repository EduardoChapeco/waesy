import React, { useState, useEffect, useCallback } from "react";
import { Brain, Building2, UserCheck, Plus, Trash2, Save } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  getBrandVoiceSettings,
  saveBrandVoiceSettings,
  queryMemory,
  recordMemory,
  deleteUserMemory,
  type AIMemoryItemDTO,
  type BrandVoiceSettingsDTO,
} from "@/services/ai-memory-curation.functions";
import {
  getUserFactsFn,
  upsertUserFactFn,
  type UserMemoryFact,
  type UserFactCategory,
} from "@/services/copilot-memory.functions";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export interface CopilotMemorySettingsSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  storeId?: string | null;
}

export function CopilotMemorySettingsSheet({
  open,
  onOpenChange,
  storeId,
}: CopilotMemorySettingsSheetProps) {
  const [activeTab, setActiveTab] = useState<"brand" | "layers" | "facts">("brand");
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Tom de voz da marca (ai_brand_voice_settings)
  const [brandVoice, setBrandVoice] = useState<BrandVoiceSettingsDTO>({
    store_id: storeId || "",
    persona_name: "Consultor Waesy",
    formality: "consultative",
    verbosity: "concise",
    approved_examples: [],
    forbidden_terms: [],
  });
  const [examplesText, setExamplesText] = useState("");
  const [forbiddenText, setForbiddenText] = useState("");

  // Camadas de memória (ai_memory_layers)
  const [layerItems, setLayerItems] = useState<AIMemoryItemDTO[]>([]);
  const [newLayerType, setNewLayerType] = useState<"brand" | "niche" | "user">("user");
  const [newLayerKey, setNewLayerKey] = useState("");
  const [newLayerValue, setNewLayerValue] = useState("");

  // Fatos do usuário (user_memory_facts)
  const [facts, setFacts] = useState<UserMemoryFact[]>([]);
  const [newFactCat, setNewFactCat] = useState<UserFactCategory>("preference");
  const [newFactKey, setNewFactKey] = useState("");
  const [newFactValue, setNewFactValue] = useState("");

  const loadAll = useCallback(async () => {
    setIsLoading(true);
    try {
      const [voiceRes, layersRes, factsRes] = await Promise.all([
        getBrandVoiceSettings({ data: storeId ? { storeId } : undefined }).catch(() => null),
        queryMemory({ data: { layers: ["brand", "niche", "user"], limit: 30 } }).catch(() => []),
        getUserFactsFn({ data: {} }).catch(() => []),
      ]);
      if (voiceRes) {
        setBrandVoice(voiceRes);
        setExamplesText((voiceRes.approved_examples || []).join("\n"));
        setForbiddenText((voiceRes.forbidden_terms || []).join(", "));
      }
      if (Array.isArray(layersRes)) setLayerItems(layersRes);
      if (Array.isArray(factsRes)) setFacts(factsRes);
    } finally {
      setIsLoading(false);
    }
  }, [storeId]);

  useEffect(() => {
    if (open) {
      void loadAll();
    }
  }, [open, loadAll]);

  const handleSaveBrandVoice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!storeId) {
      toast.info("Selecione uma empresa no Workspace para salvar o tom de voz corporativo.");
      return;
    }
    setIsSaving(true);
    try {
      await saveBrandVoiceSettings({
        data: {
          persona_name: brandVoice.persona_name.trim() || "Consultor Waesy",
          formality: brandVoice.formality,
          verbosity: brandVoice.verbosity,
          approved_examples: examplesText
            .split("\n")
            .map((l) => l.trim())
            .filter(Boolean),
          forbidden_terms: forbiddenText
            .split(",")
            .map((t) => t.trim())
            .filter(Boolean),
        },
      });
      toast.success("Tom de voz da marca atualizado.");
    } catch (err: any) {
      toast.error(err?.message || "Erro ao salvar tom de voz.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddMemoryLayer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLayerKey.trim() || !newLayerValue.trim()) return;
    setIsSaving(true);
    try {
      await recordMemory({
        data: {
          layer_type: newLayerType,
          memory_key: newLayerKey.trim(),
          memory_value: newLayerValue.trim(),
          context_source: "configuracao_manual",
        },
      });
      setNewLayerKey("");
      setNewLayerValue("");
      toast.success("Regra gravada na memória hierárquica.");
      await loadAll();
    } catch (err: any) {
      toast.error(err?.message || "Falha ao gravar regra.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteMemoryLayer = async (memoryId: string) => {
    try {
      await deleteUserMemory({ data: { memoryId } });
      setLayerItems((prev) => prev.filter((item) => item.id !== memoryId));
      toast.success("Memória removida.");
    } catch (err: any) {
      toast.error(err?.message || "Erro ao remover item.");
    }
  };

  const handleAddFact = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newFactKey.trim().length < 2 || !newFactValue.trim()) return;
    setIsSaving(true);
    try {
      await upsertUserFactFn({
        data: {
          category: newFactCat,
          factKey: newFactKey.trim(),
          factValue: newFactValue.trim(),
          confidence: 0.98,
        },
      });
      setNewFactKey("");
      setNewFactValue("");
      toast.success("Preferência salva no perfil do usuário.");
      await loadAll();
    } catch (err: any) {
      toast.error(err?.message || "Erro ao salvar fato.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-xl p-0 flex flex-col bg-background">
        <SheetHeader className="p-6 pt-safe-modal border-b border-border/50 text-left">
          <div className="flex items-center gap-3">
            <div className="size-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
              <Brain className="size-5" />
            </div>
            <div>
              <SheetTitle className="text-base font-bold text-foreground">
                Memória Hierárquica & Tom de Voz
              </SheetTitle>
              <SheetDescription className="text-xs text-muted-foreground">
                Gerencie diretrizes da empresa, regras de nicho e fatos do colaborador.
              </SheetDescription>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 pt-3">
            {[
              { id: "brand", label: "Tom da Marca" },
              { id: "layers", label: "Empresa & Nicho" },
              { id: "facts", label: "Fatos do Usuário" },
            ].map((tab) => (
              <Button
                key={tab.id}
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setActiveTab(tab.id as any)}
                className={cn(
                  "h-11 min-h-11 px-4 rounded-xl text-xs whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40",
                  activeTab === tab.id
                    ? "bg-primary text-primary-foreground font-semibold"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/50",
                )}
              >
                {tab.label}
              </Button>
            ))}
          </div>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {isLoading ? (
            <p className="text-xs text-muted-foreground">Carregando memórias persistidas...</p>
          ) : activeTab === "brand" ? (
            <form onSubmit={(e) => void handleSaveBrandVoice(e)} className="space-y-4 text-xs">
              {!storeId && (
                <div className="p-3 rounded-xl border border-border/50 bg-muted/30 text-muted-foreground">
                  Modo pessoal ativo. Acesse via Workspace corporativo para editar a voz da empresa.
                </div>
              )}
              <div className="space-y-1">
                <label className="font-medium text-foreground block">Persona do atendente</label>
                <Input
                  value={brandVoice.persona_name}
                  onChange={(e) =>
                    setBrandVoice((prev) => ({ ...prev, persona_name: e.target.value }))
                  }
                  className="h-11 min-h-11 rounded-xl"
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-medium text-foreground block">Formalidade</label>
                  <select
                    value={brandVoice.formality}
                    onChange={(e) =>
                      setBrandVoice((prev) => ({ ...prev, formality: e.target.value as any }))
                    }
                    className="w-full h-11 min-h-11 px-3 rounded-xl border border-border bg-background text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                  >
                    <option value="casual">Casual</option>
                    <option value="consultative">Consultiva</option>
                    <option value="formal">Formal</option>
                    <option value="technical">Técnica</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="font-medium text-foreground block">Extensão padrão</label>
                  <select
                    value={brandVoice.verbosity}
                    onChange={(e) =>
                      setBrandVoice((prev) => ({ ...prev, verbosity: e.target.value as any }))
                    }
                    className="w-full h-11 min-h-11 px-3 rounded-xl border border-border bg-background text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                  >
                    <option value="concise">Concisa</option>
                    <option value="balanced">Equilibrada</option>
                    <option value="detailed">Detalhada</option>
                  </select>
                </div>
              </div>
              <div className="space-y-1">
                <label className="font-medium text-foreground block">
                  Frases e exemplos aprovados (um por linha)
                </label>
                <textarea
                  rows={3}
                  value={examplesText}
                  onChange={(e) => setExamplesText(e.target.value)}
                  className="w-full rounded-xl border border-border bg-background p-3 text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                />
              </div>
              <div className="space-y-1">
                <label className="font-medium text-foreground block">
                  Termos proibidos (separados por vírgula)
                </label>
                <Input
                  value={forbiddenText}
                  onChange={(e) => setForbiddenText(e.target.value)}
                  placeholder="Ex.: barato demais, garantido 100%"
                  className="h-11 min-h-11 rounded-xl"
                />
              </div>
              <Button
                type="submit"
                disabled={isSaving || !storeId}
                className="h-11 min-h-11 px-5 rounded-xl text-xs font-semibold gap-2 w-full sm:w-auto"
              >
                <Save className="size-4" />
                <span>{isSaving ? "Salvando..." : "Salvar Tom da Marca"}</span>
              </Button>
            </form>
          ) : activeTab === "layers" ? (
            <div className="space-y-5 text-xs">
              <form onSubmit={(e) => void handleAddMemoryLayer(e)} className="space-y-3 border-b border-border/40 pb-4">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <select
                    value={newLayerType}
                    onChange={(e) => setNewLayerType(e.target.value as any)}
                    className="h-11 min-h-11 px-3 rounded-xl border border-border bg-background text-xs"
                  >
                    <option value="user">Usuário</option>
                    <option value="brand" disabled={!storeId}>
                      Empresa (Brand)
                    </option>
                    <option value="niche">Nicho</option>
                  </select>
                  <Input
                    value={newLayerKey}
                    onChange={(e) => setNewLayerKey(e.target.value)}
                    placeholder="Chave (ex.: prazo_entrega)"
                    className="h-11 min-h-11 rounded-xl sm:col-span-2"
                  />
                </div>
                <div className="flex flex-col sm:flex-row gap-2">
                  <Input
                    value={newLayerValue}
                    onChange={(e) => setNewLayerValue(e.target.value)}
                    placeholder="Regra ou política persistida..."
                    className="h-11 min-h-11 rounded-xl flex-1"
                  />
                  <Button
                    type="submit"
                    disabled={isSaving}
                    className="h-11 min-h-11 px-4 rounded-xl text-xs font-semibold gap-2"
                  >
                    <Plus className="size-4" />
                    <span>Adicionar</span>
                  </Button>
                </div>
              </form>

              <div className="divide-y divide-border/40">
                {layerItems.length === 0 ? (
                  <p className="text-muted-foreground py-4">Nenhuma memória estruturada registrada ainda.</p>
                ) : (
                  layerItems.map((item) => (
                    <div key={item.id} className="py-3 flex items-start justify-between gap-3">
                      <div className="space-y-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-2xs rounded-md">
                            {item.layer_type === "brand" ? (
                              <Building2 className="size-3 mr-1" />
                            ) : (
                              <UserCheck className="size-3 mr-1" />
                            )}
                            {item.layer_type}
                          </Badge>
                          <span className="font-semibold text-foreground truncate">
                            {item.memory_key}
                          </span>
                        </div>
                        <p className="text-muted-foreground break-words">{item.memory_value}</p>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => item.id && void handleDeleteMemoryLayer(item.id)}
                        aria-label={`Remover memória ${item.memory_key}`}
                        className="size-11 min-h-11 p-0 text-muted-foreground hover:text-rose-600 rounded-xl shrink-0"
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </div>
                  ))
                )}
              </div>
            </div>
          ) : (
            <div className="space-y-5 text-xs">
              <form onSubmit={(e) => void handleAddFact(e)} className="space-y-3 border-b border-border/40 pb-4">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <select
                    value={newFactCat}
                    onChange={(e) => setNewFactCat(e.target.value as UserFactCategory)}
                    className="h-11 min-h-11 px-3 rounded-xl border border-border bg-background text-xs"
                  >
                    <option value="preferencia">Preferência</option>
                    <option value="negocio">Negócio</option>
                    <option value="regiao">Região</option>
                    <option value="objetivo">Objetivo</option>
                    <option value="contexto">Contexto</option>
                  </select>
                  <Input
                    value={newFactKey}
                    onChange={(e) => setNewFactKey(e.target.value)}
                    placeholder="Chave (ex.: cidade_base)"
                    className="h-11 min-h-11 rounded-xl sm:col-span-2"
                  />
                </div>
                <div className="flex flex-col sm:flex-row gap-2">
                  <Input
                    value={newFactValue}
                    onChange={(e) => setNewFactValue(e.target.value)}
                    placeholder="Valor lembrado para futuras conversas..."
                    className="h-11 min-h-11 rounded-xl flex-1"
                  />
                  <Button
                    type="submit"
                    disabled={isSaving}
                    className="h-11 min-h-11 px-4 rounded-xl text-xs font-semibold gap-2"
                  >
                    <Plus className="size-4" />
                    <span>Salvar fato</span>
                  </Button>
                </div>
              </form>

              <div className="divide-y divide-border/40">
                {facts.length === 0 ? (
                  <p className="text-muted-foreground py-4">Nenhum fato pessoal aprendido ainda.</p>
                ) : (
                  facts.map((fact) => (
                    <div key={fact.id || fact.factKey} className="py-3 space-y-1">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-2xs rounded-md">
                          {fact.category}
                        </Badge>
                        <span className="font-semibold text-foreground">{fact.factKey}</span>
                      </div>
                      <p className="text-muted-foreground break-words">{fact.factValue}</p>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}