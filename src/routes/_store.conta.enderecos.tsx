import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useState } from "react";
import {
  getCustomerAddresses,
  addCustomerAddress,
  deleteCustomerAddress,
  setDefaultAddress,
} from "@/services/customer.functions";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { MapPin, Star, Trash2, Plus, CheckCircle2, Navigation, X, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { EmptyState } from "@/components/state/states";
import { CitySelect } from "@/components/ui/city-select";

export const Route = createFileRoute("/_store/conta/enderecos")({
  head: () => ({ meta: [{ title: "Meus Endereços | Waesy" }] }),
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
  const addresses = Route.useLoaderData() as any[];
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
          toast.success("Endereço preenchido automaticamente via CEP!");
        } else {
          toast.error("CEP não encontrado. Digite os dados manualmente.");
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
    if (!confirm("Deseja realmente excluir este endereço?")) return;
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
    <div className="w-full max-w-4xl mx-auto space-y-6 pb-24 px-0 sm:px-4 md:px-0">
      {/* ── 1. Apple HIG Minimalist Header ── */}
      <div className="flex items-center justify-between gap-4 border-b border-border/40 pb-5 pt-2">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
              Endereços
            </h1>
            {Array.isArray(addresses) && addresses.length > 0 && (
              <Badge variant="secondary" className="text-xs font-mono font-bold px-2.5 py-0.5 rounded-full">
                {addresses.length}
              </Badge>
            )}
          </div>
          <p className="text-xs sm:text-sm text-muted-foreground">
            Gerencie seus locais de entrega para pedidos, delivery e agendamentos.
          </p>
        </div>

        {!isAdding && (
          <Button
            size="default"
            onClick={() => setIsAdding(true)}
            className="rounded-2xl h-11 px-5 text-sm font-semibold gap-2 bg-foreground text-background hover:bg-foreground/90 shrink-0 shadow-xs cursor-pointer"
          >
            <Plus className="size-4" />
            <span>Novo Endereço</span>
          </Button>
        )}
      </div>

      {/* ── 2. Apple HIG Inset-Grouped Form: Novo Endereço ── */}
      {isAdding && (
        <div className="bg-card rounded-2xl border border-border/80 shadow-xs overflow-hidden transition-all animate-in fade-in-50 duration-200">
          <div className="px-5 py-4 bg-muted/20 border-b border-border/40 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <MapPin className="size-5 text-foreground" strokeWidth={1.75} />
              <h3 className="text-base font-semibold text-foreground">Cadastrar Novo Endereço</h3>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => setIsAdding(false)}
              className="size-9 rounded-xl text-muted-foreground hover:text-foreground cursor-pointer"
            >
              <X className="size-4" />
            </Button>
          </div>

          <form onSubmit={handleSubmit} className="p-5 sm:p-6 space-y-5">
            {/* Linha 1: CEP com busca automática */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-1.5 sm:col-span-1">
                <label className="text-xs font-semibold text-foreground flex items-center justify-between">
                  <span>CEP *</span>
                  {isCepLoading && (
                    <span className="text-[11px] text-primary flex items-center gap-1 font-normal">
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

              {/* Rua / Logradouro */}
              <div className="space-y-1.5 sm:col-span-2">
                <label className="text-xs font-semibold text-foreground">
                  Rua / Avenida *
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
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-1.5 sm:col-span-1">
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

              <div className="space-y-1.5 sm:col-span-2">
                <label className="text-xs font-semibold text-foreground">
                  Complemento / Referência
                </label>
                <Input
                  placeholder="Ex: Apto 402, Bloco B (Opcional)"
                  value={formData.complement}
                  onChange={(e) => setFormData({ ...formData, complement: e.target.value })}
                  className="h-11 rounded-xl bg-background border-border/70 text-sm focus-visible:ring-primary/20"
                />
              </div>
            </div>

            {/* Linha 3: Bairro, Cidade e Estado */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-1.5 sm:col-span-1">
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

              <div className="sm:col-span-2 space-y-1.5">
                <label className="text-xs font-semibold text-foreground">
                  Cidade & Estado *
                </label>
                <CitySelect
                  stateValue={formData.state || "SC"}
                  cityValue={formData.city || ""}
                  onStateChange={(uf: string) => setFormData({ ...formData, state: uf })}
                  onCityChange={(city: string) => setFormData({ ...formData, city })}
                />
              </div>
            </div>

            {/* Ações do Formulário (Touch targets de 44px) */}
            <div className="flex items-center justify-end gap-3 pt-3 border-t border-border/40">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsAdding(false)}
                className="h-11 rounded-xl px-5 text-sm font-semibold cursor-pointer"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting}
                className="h-11 rounded-xl px-6 text-sm font-semibold bg-foreground text-background hover:bg-foreground/90 shadow-xs cursor-pointer"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="size-4 animate-spin mr-2" />
                    Salvando...
                  </>
                ) : (
                  "Salvar Endereço"
                )}
              </Button>
            </div>
          </form>
        </div>
      )}

      {/* ── 3. Lista de Endereços Cadastrados ── */}
      {!isAdding && (!addresses || addresses.length === 0) ? (
        <EmptyState
          title="Nenhum endereço cadastrado"
          description="Adicione seu endereço para agilizar o cálculo de frete e entregas de pedidos."
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {Array.isArray(addresses) &&
            addresses.map((addr: any) => (
              <div
                key={addr.id}
                className={`bg-card rounded-2xl border p-5 flex flex-col justify-between gap-4 transition-all ${
                  addr.is_default
                    ? "border-primary/50 ring-1 ring-primary/20"
                    : "border-border/70 hover:border-foreground/20"
                }`}
              >
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2.5">
                      <MapPin className="size-5 text-muted-foreground shrink-0 mt-0.5" strokeWidth={1.75} />
                      <div className="min-w-0">
                        <p className="text-sm font-bold text-foreground truncate">
                          {addr.street}, {addr.number}
                        </p>
                        {addr.complement && (
                          <p className="text-xs text-muted-foreground truncate">
                            {addr.complement}
                          </p>
                        )}
                      </div>
                    </div>

                    {addr.is_default && (
                      <Badge variant="success" className="text-[10px] shrink-0">
                        Padrão
                      </Badge>
                    )}
                  </div>

                  <div className="text-xs text-muted-foreground space-y-0.5 pl-11">
                    <p>
                      {addr.neighborhood} — {addr.city} / {addr.state}
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
                      className="h-11 rounded-xl px-3.5 text-xs font-semibold text-muted-foreground hover:text-foreground cursor-pointer"
                    >
                      <Star className="size-3.5 mr-1.5 text-muted-foreground" />
                      Tornar Padrão
                    </Button>
                  ) : (
                    <div />
                  )}

                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-11 rounded-xl px-3.5 text-xs font-semibold text-destructive hover:bg-destructive/10 cursor-pointer ml-auto"
                    onClick={() => handleDelete(addr.id)}
                  >
                    <Trash2 className="size-3.5 mr-1.5" />
                    Excluir
                  </Button>
                </div>
              </div>
            ))}
        </div>
      )}
    </div>
  );
}
