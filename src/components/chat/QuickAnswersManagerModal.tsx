import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { listStoreQuickAnswers, createStoreQuickAnswer, deleteStoreQuickAnswer } from "@/services/chat-operations.functions";
import { toast } from "sonner";
import { Zap, Plus, Trash2, Search, Loader2 } from "lucide-react";

interface QuickAnswersManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectAnswer?: (text: string) => void;
}

export function QuickAnswersManagerModal({
  isOpen,
  onClose,
  onSelectAnswer,
}: QuickAnswersManagerModalProps) {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [isCreating, setIsCreating] = useState(false);

  // Form State
  const [shortcut, setShortcut] = useState("");
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [category, setCategory] = useState("geral");

  const { data: quickAnswers = [], isLoading } = useQuery({
    queryKey: ["workspace-quick-answers", searchTerm],
    queryFn: () => listStoreQuickAnswers({ data: { search: searchTerm || undefined } }),
    enabled: isOpen,
  });

  const createMutation = useMutation({
    mutationFn: () =>
      createStoreQuickAnswer({
        data: {
          shortcut,
          title,
          message,
          category,
        },
      }),
    onSuccess: () => {
      toast.success("Resposta rápida salva!");
      setShortcut("");
      setTitle("");
      setMessage("");
      setCategory("geral");
      setIsCreating(false);
      queryClient.invalidateQueries({ queryKey: ["workspace-quick-answers"] });
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
              <div className="size-9 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center shrink-0">
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
                  <SelectItem value="geral" className="text-xs">Geral / Saudação</SelectItem>
                  <SelectItem value="financeiro" className="text-xs">Financeiro / Pagamentos</SelectItem>
                  <SelectItem value="vendas" className="text-xs">Vendas / Produtos</SelectItem>
                  <SelectItem value="suporte" className="text-xs">Suporte / Dúvidas</SelectItem>
                  <SelectItem value="logistica" className="text-xs">Logística / Rastreio</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-semibold text-foreground">
                Conteúdo da Mensagem
              </Label>
              <Textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Digite a resposta padrão que será enviada ao cliente..."
                rows={4}
                className="rounded-xl text-xs focus-visible:ring-2 focus-visible:ring-primary resize-none"
                required
              />
            </div>

            <DialogFooter className="gap-2 sm:gap-0 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsCreating(false)}
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
                <span>Salvar Macro</span>
              </Button>
            </DialogFooter>
          </form>
        ) : (
          <div className="space-y-4 py-2">
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
                        <span className="px-2 py-1 rounded-md bg-amber-500/10 text-amber-500 font-mono text-xs font-bold border border-amber-500/20">
                          /{item.shortcut}
                        </span>
                        <span className="font-semibold text-xs text-foreground truncate">
                          {item.title}
                        </span>
                        <span className="text-xs text-muted-foreground font-mono">
                          ({item.category})
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
                            onSelectAnswer(item.message);
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
