import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  listStoreQuickAnswers,
  createStoreQuickAnswer,
  deleteStoreQuickAnswer,
  interpolateTemplateVariables,
} from "@/services/chat-operations.functions";
import { toast } from "sonner";
import { Zap, Plus, Trash2, Search, Loader2, Pencil } from "lucide-react";

const TEMPLATE_CATEGORIES = [
  { value: "boas_vindas", label: "Boas-vindas" },
  { value: "cobranca", label: "Cobrança" },
  { value: "confirmacao", label: "Confirmação" },
  { value: "pos_venda", label: "Pós-venda" },
  { value: "orcamento", label: "Orçamento" },
  { value: "geral", label: "Geral / Saudação" },
  { value: "financeiro", label: "Financeiro / PIX" },
  { value: "vendas", label: "Vendas / Catálogo" },
  { value: "suporte", label: "Suporte / Dúvidas" },
  { value: "logistica", label: "Logística / Rastreio" },
];

const DYNAMIC_VARIABLES = [
  { token: "{{nome_cliente}}", label: "Nome do Cliente" },
  { token: "{{numero_pedido}}", label: "Nº Pedido" },
  { token: "{{link_pagamento}}", label: "Link Pagamento" },
  { token: "{{loja}}", label: "Nome da Loja" },
  { token: "{{telefone}}", label: "Telefone" },
];

interface QuickAnswersManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectAnswer?: (text: string) => void;
  onUpdated?: () => void;
  customerName?: string;
  customerPhone?: string;
  storeName?: string;
  orderNumber?: string;
  paymentLink?: string;
}

export function QuickAnswersManagerModal({
  isOpen,
  onClose,
  onSelectAnswer,
  onUpdated,
  customerName,
  customerPhone,
  storeName,
  orderNumber,
  paymentLink,
}: QuickAnswersManagerModalProps) {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [isCreating, setIsCreating] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Form State
  const [shortcut, setShortcut] = useState("");
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [category, setCategory] = useState("boas_vindas");

  const { data: quickAnswers = [], isLoading } = useQuery({
    queryKey: ["workspace-quick-answers", searchTerm, categoryFilter],
    queryFn: () =>
      listStoreQuickAnswers({
        data: {
          search: searchTerm || undefined,
          category: categoryFilter !== "all" ? categoryFilter : undefined,
        },
      }),
    enabled: isOpen,
  });

  const resetForm = () => {
    setEditingId(null);
    setShortcut("");
    setTitle("");
    setMessage("");
    setCategory("boas_vindas");
    setIsCreating(false);
  };

  const handleEditItem = (item: any) => {
    setEditingId(item.id);
    setShortcut(item.shortcut || "");
    setTitle(item.title || "");
    setMessage(item.message || "");
    setCategory(item.category || "geral");
    setIsCreating(true);
  };

  const createMutation = useMutation({
    mutationFn: () =>
      createStoreQuickAnswer({
        data: {
          id: editingId || undefined,
          shortcut,
          title,
          message,
          category,
        },
      }),
    onSuccess: () => {
      toast.success(editingId ? "Template atualizado!" : "Resposta rápida salva!");
      resetForm();
      queryClient.invalidateQueries({ queryKey: ["workspace-quick-answers"] });
      onUpdated?.();
    },
    onError: (err: any) => {
      toast.error(err?.message || "Erro ao salvar resposta rápida.");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteStoreQuickAnswer({ data: { id } }),
    onSuccess: () => {
      toast.success("Resposta rápida excluída.");
      queryClient.invalidateQueries({ queryKey: ["workspace-quick-answers"] });
      onUpdated?.();
    },
    onError: (err: any) => {
      toast.error(err?.message || "Erro ao excluir resposta rápida.");
    },
  });

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!shortcut.trim() || !title.trim() || !message.trim()) {
      toast.error("Preencha todos os campos obrigatórios.");
      return;
    }
    createMutation.mutate();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-xl rounded-2xl bg-card border border-border">
        <DialogHeader>
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <div className="size-9 rounded-xl bg-warning/10 text-warning-strong flex items-center justify-center shrink-0">
                <Zap className="size-5" />
              </div>
              <div>
                <DialogTitle className="text-base font-bold text-foreground">
                  Respostas Rápidas (Macros)
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground">
                  Crie atalhos (/atalho) para responder clientes no WhatsApp com um clique.
                </DialogDescription>
              </div>
            </div>

            {!isCreating && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsCreating(true)}
                className="h-11 rounded-xl text-xs font-semibold gap-2 px-3 cursor-pointer focus-visible:ring-2 focus-visible:ring-primary"
              >
                <Plus className="size-4" />
                <span>Nova Macro</span>
              </Button>
            )}
          </div>
        </DialogHeader>

        {isCreating ? (
          <form onSubmit={handleSave} className="space-y-4 py-2">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label className="text-xs font-semibold text-foreground">
                  Atalho de Teclado (ex: pix, ola)
                </Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-mono text-xs">
                    /
                  </span>
                  <Input
                    value={shortcut}
                    onChange={(e) => setShortcut(e.target.value.replace(/[^a-zA-Z0-9_-]/g, ""))}
                    placeholder="ex: pix"
                    className="pl-6 h-11 rounded-xl text-xs font-mono focus-visible:ring-2 focus-visible:ring-primary"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-semibold text-foreground">
                  Título Identificador
                </Label>
                <Input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="ex: Chave PIX Oficial"
                  className="h-11 rounded-xl text-xs focus-visible:ring-2 focus-visible:ring-primary"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-semibold text-foreground">
                Categoria
              </Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger className="h-11 rounded-xl text-xs focus-visible:ring-2 focus-visible:ring-primary">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  {TEMPLATE_CATEGORIES.map((cat) => (
                    <SelectItem key={cat.value} value={cat.value} className="text-xs">
                      {cat.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <Label className="text-xs font-semibold text-foreground">
                  Conteúdo da Mensagem
                </Label>
                <span className="text-xs text-muted-foreground">
                  Inserir variável dinâmica:
                </span>
              </div>
              <div className="flex flex-wrap gap-2">
                {DYNAMIC_VARIABLES.map((variable) => (
                  <button
                    key={variable.token}
                    type="button"
                    onClick={() => setMessage((prev) => `${prev}${prev.endsWith(" ") || !prev ? "" : " "}${variable.token}`)}
                    className="h-11 min-h-11 px-3 rounded-lg border border-border bg-muted/40 hover:bg-muted text-xs font-mono text-foreground transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                  >
                    {variable.token}
                  </button>
                ))}
              </div>
              <Textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Ex.: Olá {{nome_cliente}}! Seu pedido {{numero_pedido}} está confirmado. Finalize em {{link_pagamento}}"
                rows={4}
                className="rounded-xl text-xs focus-visible:ring-2 focus-visible:ring-primary resize-none"
                required
              />
            </div>

            <DialogFooter className="gap-2 sm:gap-0 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={resetForm}
                disabled={createMutation.isPending}
                className="h-11 rounded-xl text-xs font-semibold px-4 cursor-pointer focus-visible:ring-2 focus-visible:ring-primary"
              >
                Voltar
              </Button>
              <Button
                type="submit"
                variant="default"
                disabled={createMutation.isPending}
                className="h-11 rounded-xl text-xs font-semibold px-5 gap-2 cursor-pointer focus-visible:ring-2 focus-visible:ring-primary"
              >
                {createMutation.isPending && <Loader2 className="size-4 animate-spin motion-reduce:animate-none" />}
                <span>{editingId ? "Salvar Alterações" : "Salvar Macro"}</span>
              </Button>
            </DialogFooter>
          </form>
        ) : (
          <div className="space-y-4 py-2">
            <div className="flex flex-wrap gap-2">
              {[
                { value: "all", label: "Todas" },
                { value: "boas_vindas", label: "Boas-vindas" },
                { value: "cobranca", label: "Cobrança" },
                { value: "confirmacao", label: "Confirmação" },
                { value: "pos_venda", label: "Pós-venda" },
                { value: "orcamento", label: "Orçamento" },
              ].map((cat) => (
                <button
                  key={cat.value}
                  type="button"
                  onClick={() => setCategoryFilter(cat.value)}
                  className={`h-11 min-h-11 px-3 rounded-lg border text-xs font-semibold transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
                    categoryFilter === cat.value
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-muted/30 text-muted-foreground border-border hover:text-foreground"
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>

            {/* Campo de Busca */}
            <div className="relative">
              <Search className="size-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Buscar macro por atalho, título ou conteúdo..."
                className="pl-9 h-11 rounded-xl text-xs focus-visible:ring-2 focus-visible:ring-primary"
              />
            </div>

            {/* Lista de Macros */}
            <div className="max-h-72 overflow-y-auto space-y-2 pr-1">
              {isLoading ? (
                <div className="flex items-center justify-center p-8 text-muted-foreground gap-2">
                  <Loader2 className="size-5 animate-spin text-primary" />
                  <span className="text-xs">Carregando macros...</span>
                </div>
              ) : quickAnswers.length === 0 ? (
                <div className="text-center p-8 border border-dashed border-border rounded-xl text-muted-foreground">
                  <p className="text-xs">Nenhuma macro personalizada cadastrada.</p>
                  <p className="text-xs opacity-75 mt-1">
                    Clique em &quot;Nova Macro&quot; acima para registrar suas mensagens frequentes.
                  </p>
                </div>
              ) : (
                quickAnswers.map((item) => (
                  <div
                    key={item.id}
                    className="p-3 rounded-xl border border-border bg-muted/20 hover:border-border transition-colors flex items-start justify-between gap-3 group"
                  >
                    <div className="min-w-0 flex-1 space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="px-2 py-1 rounded-md bg-warning/10 text-warning-strong font-mono text-xs font-bold border border-warning/20">
                          /{item.shortcut}
                        </span>
                        <span className="font-semibold text-xs text-foreground truncate">
                          {item.title}
                        </span>
                        <span className="text-xs text-muted-foreground font-mono">
                          ({TEMPLATE_CATEGORIES.find((c) => c.value === item.category)?.label || item.category})
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground line-clamp-2">
                        {item.message}
                      </p>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      {onSelectAnswer && (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            const interpolated = interpolateTemplateVariables(item.message, {
                              customerName,
                              customerPhone,
                              storeName,
                              orderNumber,
                              paymentLink,
                            });
                            onSelectAnswer(interpolated);
                            onClose();
                          }}
                          className="h-11 rounded-lg text-xs font-semibold px-3 cursor-pointer focus-visible:ring-2 focus-visible:ring-primary"
                        >
                          Usar
                        </Button>
                      )}

                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => handleEditItem(item)}
                        className="size-11 rounded-lg text-muted-foreground hover:text-foreground cursor-pointer focus-visible:ring-2 focus-visible:ring-primary"
                        title="Editar macro"
                      >
                        <Pencil className="size-4" />
                      </Button>

                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => deleteMutation.mutate(item.id)}
                        disabled={deleteMutation.isPending}
                        className="size-11 rounded-lg text-muted-foreground hover:text-destructive cursor-pointer focus-visible:ring-2 focus-visible:ring-primary"
                        title="Excluir macro"
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </div>

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                className="h-11 rounded-xl text-xs font-semibold px-4 cursor-pointer focus-visible:ring-2 focus-visible:ring-primary"
              >
                Fechar
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
