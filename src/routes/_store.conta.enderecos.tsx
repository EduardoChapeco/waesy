import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useState } from "react";
import { getCustomerAddresses, addCustomerAddress, deleteCustomerAddress, setDefaultAddress } from "@/services/customer.functions";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { MapPin, Star, Trash2, Plus, CheckCircle2, Navigation, X, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { CrudActionsMenu } from "@/components/ui/crud-actions-menu";
import { EmptyState } from "@/components/state/states";
import { NativeMobileHeader } from "@/components/navigation/native-mobile-header";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_store/conta/enderecos")({
  head: () => ({ meta: [{ title: "Endereços | Waesy" }] }),
  loader: async () => {
    try {
      return (await getCustomerAddresses().catch(() => [])) || [];
    } catch (err) {
      console.error("[loader:_store.conta.enderecos] Unhandled loader error:", err);
      return [];
    }
  },
  component: AddressesPage,
});

function AddressesPage() {
  const addresses = (Route.useLoaderData() as any[]) || [];
  const router = useRouter();
  const [isAdding, setIsAdding] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCepLoading, setIsCepLoading] = useState(false);

  const [formData, setFormData] = useState({
    zipcode: "",
    street: "",
    number: "",
    complement: "",
    neighborhood: "",
    city: "",
    state: "",
  });

  const handleCepLookup = async (cepValue: string) => {
    const cleanCep = cepValue.replace(/\D/g, "");
    setFormData((prev) => ({ ...prev, zipcode: cepValue }));

    if (cleanCep.length === 8) {
      setIsCepLoading(true);
      try {
        const res = await fetch(`https://viacep.com.br/ws/${cleanCep}/json/`);
        const data = await res.json();
        if (!data.erro) {
          setFormData((prev) => ({
            ...prev,
            street: data.logradouro || prev.street,
            neighborhood: data.bairro || prev.neighborhood,
            city: data.localidade || prev.city,
            state: data.uf || prev.state,
          }));
          toast.success("Endereço preenchido via CEP!");
        } else {
          toast.error("CEP não localizado. Preencha manualmente.");
        }
      } catch (e) {
        console.error("Erro ViaCEP:", e);
      } finally {
        setIsCepLoading(false);
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    if (!formData.zipcode || !formData.street || !formData.number || !formData.neighborhood || !formData.city) {
      toast.error("Preencha todos os campos obrigatórios (*).");
      return;
    }

    setIsSubmitting(true);
    try {
      await addCustomerAddress({ data: formData });
      toast.success("Endereço adicionado com sucesso!");
      setIsAdding(false);
      setFormData({
        zipcode: "",
        street: "",
        number: "",
        complement: "",
        neighborhood: "",
        city: "",
        state: "",
      });
      router.invalidate();
    } catch (error: unknown) {
      toast.error(
        (error instanceof Error ? error.message : String(error)) || "Erro ao adicionar endereço."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteCustomerAddress({ data: { id } });
      toast.success("Endereço excluído com sucesso.");
      router.invalidate();
    } catch (e: unknown) {
      toast.error("Erro ao excluir endereço.");
    }
  };

  const handleSetDefault = async (id: string) => {
    try {
      await setDefaultAddress({ data: { id } });
      toast.success("Endereço padrão atualizado.");
      router.invalidate();
    } catch (e: unknown) {
      toast.error("Erro ao atualizar endereço padrão.");
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto space-y-4 sm:space-y-6 pb-24 px-0 sm:px-4 md:px-0 animate-in fade-in duration-200">
      {/* ── 1. Native Mobile Header (Apple HIG / PWA Nativo) ── */}
      <NativeMobileHeader
        title="Endereços"
        fallbackHref="/conta"
        badge={
          addresses.length > 0 ? (
            <Badge variant="secondary" className="text-xs font-mono font-bold px-2 py-0.5 rounded-full">
              {addresses.length}
            </Badge>
          ) : null
        }
        rightActions={
          !isAdding ? (
            <Button
              size="sm"
              onClick={() => setIsAdding(true)}
              className="rounded-xl h-8.5 px-3.5 text-xs font-bold gap-1.5 bg-foreground text-background hover:bg-foreground/90 shrink-0 shadow-2xs cursor-pointer"
            >
              <Plus className="size-3.5" />
              <span>Novo</span>
            </Button>
          ) : undefined
        }
      />

      {/* ── 2. Formulário Apple HIG Inset-Grouped: Novo Endereço ── */}
      {isAdding && (
        <div className="bg-card rounded-none sm:rounded-2xl border-y sm:border border-border/80 shadow-xs overflow-hidden transition-all animate-in fade-in-50 duration-200">
          <div className="px-4 sm:px-5 py-3.5 bg-muted/20 border-b border-border/40 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <MapPin className="size-4.5 text-primary" strokeWidth={2} />
              <h2 className="text-sm font-bold text-foreground">Novo Endereço</h2>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => setIsAdding(false)}
              className="size-8 rounded-xl text-muted-foreground hover:text-foreground cursor-pointer"
            >
              <X className="size-4" />
            </Button>
          </div>

          <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-4">
            {/* Linha 1: CEP com busca automática */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
              <div className="space-y-1 sm:col-span-1">
                <label className="text-xs font-semibold text-foreground flex items-center justify-between">
                  <span>CEP *</span>
                  {isCepLoading && (
                    <span className="text-[10px] text-primary flex items-center gap-1 font-normal">
                      <Loader2 className="size-3 animate-spin" /> Buscando...
                    </span>
                  )}
                </label>
                <div className="relative">
                  <Input
                    required
                    placeholder="00000-000"
                    maxLength={9}
                    value={formData.zipcode}
                    onChange={(e) => handleCepLookup(e.target.value)}
                    className="h-11 rounded-xl bg-background border-border/70 text-sm font-mono focus-visible:ring-primary/20"
                  />
                  <Navigation className="size-4 text-muted-foreground/50 absolute right-3.5 top-3.5 pointer-events-none" />
                </div>
              </div>

              {/* Rua */}
              <div className="space-y-1 sm:col-span-2">
                <label className="text-xs font-semibold text-foreground">
                  Rua ou Avenida *
                </label>
                <Input
                  required
                  placeholder="Ex: Avenida Brasil"
                  value={formData.street}
                  onChange={(e) => setFormData({ ...formData, street: e.target.value })}
                  className="h-11 rounded-xl bg-background border-border/70 text-sm focus-visible:ring-primary/20"
                />
              </div>
            </div>

            {/* Linha 2: Número e Complemento */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
              <div className="space-y-1 sm:col-span-1">
                <label className="text-xs font-semibold text-foreground">
                  Número *
                </label>
                <Input
                  required
                  placeholder="Ex: 120"
                  value={formData.number}
                  onChange={(e) => setFormData({ ...formData, number: e.target.value })}
                  className="h-11 rounded-xl bg-background border-border/70 text-sm focus-visible:ring-primary/20"
                />
              </div>

              <div className="space-y-1 sm:col-span-2">
                <label className="text-xs font-semibold text-foreground">
                  Complemento (Opcional)
                </label>
                <Input
                  placeholder="Ex: Apto 402, Bloco B"
                  value={formData.complement}
                  onChange={(e) => setFormData({ ...formData, complement: e.target.value })}
                  className="h-11 rounded-xl bg-background border-border/70 text-sm focus-visible:ring-primary/20"
                />
              </div>
            </div>

            {/* Linha 3: Bairro, Cidade, Estado */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-foreground">
                  Bairro *
                </label>
                <Input
                  required
                  placeholder="Ex: Centro"
                  value={formData.neighborhood}
                  onChange={(e) => setFormData({ ...formData, neighborhood: e.target.value })}
                  className="h-11 rounded-xl bg-background border-border/70 text-sm focus-visible:ring-primary/20"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-foreground">
                  Cidade *
                </label>
                <Input
                  required
                  placeholder="Ex: Chapecó"
                  value={formData.city}
                  onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                  className="h-11 rounded-xl bg-background border-border/70 text-sm focus-visible:ring-primary/20"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-foreground">
                  Estado (UF) *
                </label>
                <Input
                  required
                  maxLength={2}
                  placeholder="SC"
                  value={formData.state}
                  onChange={(e) => setFormData({ ...formData, state: e.target.value.toUpperCase() })}
                  className="h-11 rounded-xl bg-background border-border/70 text-sm uppercase font-mono focus-visible:ring-primary/20"
                />
              </div>
            </div>

            {/* Ações de salvamento */}
            <div className="flex items-center justify-end gap-2 pt-3 border-t border-border/40">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsAdding(false)}
                className="rounded-xl h-11 px-4 text-xs font-semibold cursor-pointer"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting}
                className="rounded-xl h-11 px-6 text-xs font-bold bg-primary text-primary-foreground gap-1.5 cursor-pointer"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="size-4 animate-spin" />
                    <span>Salvando...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="size-4" />
                    <span>Salvar</span>
                  </>
                )}
              </Button>
            </div>
          </form>
        </div>
      )}

      {/* ── 3. Lista Bifurcada de Endereços ── */}
      {!isAdding && addresses.length === 0 ? (
        <div className="p-4 sm:p-0">
          <EmptyState
            title="Nenhum endereço cadastrado"
            description="Cadastre seu endereço para entregas rápidas e cálculo automático de frete."
            action={
              <Button
                onClick={() => setIsAdding(true)}
                className="rounded-xl h-10 px-5 text-xs font-bold gap-1.5"
              >
                <Plus className="size-3.5" />
                Cadastrar
              </Button>
            }
          />
        </div>
      ) : (
        <>
          {/* Mobile (<640px): Padrão WhatsApp List Edge-to-Edge */}
          <div className="sm:hidden w-full divide-y divide-border/40 bg-card border-y border-border/60">
            {addresses.map((addr: any) => (
              <div
                key={addr.id}
                className={cn(
                  "p-3.5 flex items-start justify-between gap-3 transition-colors",
                  addr.is_default && "bg-primary/5"
                )}
              >
                <div className="flex items-start gap-3 min-w-0 flex-1">
                  <div
                    className={cn(
                      "size-9 rounded-xl flex items-center justify-center shrink-0 mt-0.5",
                      addr.is_default
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-muted-foreground"
                    )}
                  >
                    <MapPin className="size-4" />
                  </div>
                  <div className="min-w-0 flex-1 space-y-0.5">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <p className="text-xs font-bold text-foreground truncate">
                        {addr.street}, {addr.number}
                      </p>
                      {addr.is_default && (
                        <Badge variant="success" className="text-[9px] px-1.5 py-0 h-4 font-bold">
                          Padrão
                        </Badge>
                      )}
                    </div>
                    {addr.complement && (
                      <p className="text-[11px] text-muted-foreground truncate">{addr.complement}</p>
                    )}
                    <p className="text-[11px] text-muted-foreground">
                      {addr.neighborhood} • {addr.city}, {addr.state}
                    </p>
                    <p className="text-[10px] font-mono text-muted-foreground/70">CEP: {addr.zipcode}</p>
                  </div>
                </div>

                <div className="flex items-center gap-0.5 shrink-0 pt-0.5">
                  {!addr.is_default && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleSetDefault(addr.id)}
                      className="size-8 rounded-lg text-muted-foreground hover:text-amber-500 cursor-pointer"
                      title="Tornar Padrão"
                      aria-label="Tornar Padrão"
                    >
                      <Star className="size-3.5" />
                    </Button>
                  )}
                  <CrudActionsMenu
                    entityName="Endereço"
                    onDelete={() => handleDelete(addr.id)}
                    deleteConfirmTitle="Excluir endereço?"
                    deleteConfirmDescription={`Remover ${addr.street}, ${addr.number} (${addr.city || "sua localidade"})?`}
                    customActions={[
                      ...(!addr.is_default
                        ? [
                            {
                              id: "set-default",
                              label: "Tornar Padrão",
                              icon: Star,
                              onClick: () => handleSetDefault(addr.id),
                            },
                          ]
                        : []),
                    ]}
                  />
                </div>
              </div>
            ))}
          </div>

          {/* Desktop/Tablet (>=640px): Bento Grid 2 Colunas */}
          <div className="hidden sm:grid grid-cols-2 gap-4">
            {addresses.map((addr: any) => (
              <div
                key={addr.id}
                className={cn(
                  "bg-card rounded-2xl border p-5 flex flex-col justify-between gap-4 transition-all",
                  addr.is_default
                    ? "border-primary/50 ring-1 ring-primary/20 shadow-2xs"
                    : "border-border/60 hover:border-border"
                )}
              >
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-2.5">
                      <div
                        className={cn(
                          "size-9 rounded-xl flex items-center justify-center shrink-0",
                          addr.is_default
                            ? "bg-primary text-primary-foreground"
                            : "bg-muted text-muted-foreground"
                        )}
                      >
                        <MapPin className="size-4.5" strokeWidth={1.75} />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-bold text-foreground truncate">
                          {addr.street}, {addr.number}
                        </p>
                        {addr.complement && (
                          <p className="text-xs text-muted-foreground truncate">{addr.complement}</p>
                        )}
                      </div>
                    </div>

                    {addr.is_default && (
                      <Badge variant="success" className="text-[10px] shrink-0 font-bold">
                        Padrão
                      </Badge>
                    )}
                  </div>

                  <div className="text-xs text-muted-foreground space-y-0.5 pl-11.5">
                    <p>
                      {addr.neighborhood} — {addr.city}, {addr.state}
                    </p>
                    <p className="font-mono text-[11px]">CEP: {addr.zipcode}</p>
                  </div>
                </div>

                <div className="flex items-center justify-between gap-2 pt-3 border-t border-border/40">
                  {!addr.is_default ? (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleSetDefault(addr.id)}
                      className="h-9 rounded-xl px-3 text-xs font-semibold text-muted-foreground hover:text-foreground cursor-pointer"
                    >
                      <Star className="size-3.5 mr-1.5 text-muted-foreground" />
                      Tornar Padrão
                    </Button>
                  ) : (
                    <div />
                  )}

                  <CrudActionsMenu
                    entityName="Endereço"
                    onDelete={() => handleDelete(addr.id)}
                    deleteConfirmTitle="Excluir este endereço de entrega?"
                    deleteConfirmDescription={`Deseja remover ${addr.street}, ${addr.number} (${addr.city || "sua localidade"}) da sua lista de endereços?`}
                    customActions={[
                      ...(!addr.is_default
                        ? [
                            {
                              id: "set-default",
                              label: "Tornar Endereço Padrão",
                              icon: Star,
                              onClick: () => handleSetDefault(addr.id),
                            },
                          ]
                        : []),
                    ]}
                  />
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* ── 4. FAB Flutuante Mobile para Novo Endereço ── */}
      {!isAdding && addresses.length > 0 && (
        <button
          type="button"
          onClick={() => {
            setIsAdding(true);
            window.scrollTo({ top: 0, behavior: "smooth" });
          }}
          className="sm:hidden fixed bottom-20 right-4 z-30 size-12 rounded-full bg-primary text-primary-foreground shadow-lg flex items-center justify-center cursor-pointer active:scale-95 transition-transform"
          aria-label="Cadastrar novo endereço"
        >
          <Plus className="size-5" />
        </button>
      )}
    </div>
  );
}
