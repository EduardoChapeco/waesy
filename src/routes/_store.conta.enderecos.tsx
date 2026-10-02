import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useState } from "react";
import { getUserAddresses, saveUserAddress, deleteUserAddress } from "@/services/addresses.functions";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { MapPin, Star, Trash2, Plus, CheckCircle2, Navigation, X, Loader2, Building, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { CrudActionsMenu } from "@/components/ui/crud-actions-menu";
import { EmptyState } from "@/components/state/states";
import { NativeMobileHeader } from "@/components/navigation/native-mobile-header";
import { formatCep } from "@/lib/document-validator";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_store/conta/enderecos")({
  head: () => ({ meta: [{ title: "Endereços | Waesy" }] }),
  loader: async () => {
    try {
      return (await getUserAddresses().catch(() => [])) || [];
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
    label: "Principal",
    zipcode: "",
    street: "",
    number: "",
    complement: "",
    neighborhood: "",
    city: "",
    state: "",
    is_apartment: false,
    block_tower: "",
    intercom_code: "",
  });

  const handleCepLookup = async (cepValue: string) => {
    const masked = formatCep(cepValue);
    const cleanCep = cepValue.replace(/\D/g, "");
    setFormData((prev) => ({ ...prev, zipcode: masked }));

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
      await saveUserAddress({
        data: {
          label: formData.label.trim() || "Principal",
          zipcode: formData.zipcode,
          street: formData.street,
          number: formData.number,
          complement: formData.complement || null,
          neighborhood: formData.neighborhood,
          city: formData.city,
          state: formData.state.toUpperCase(),
          is_apartment: formData.is_apartment,
          block_tower: formData.block_tower || null,
          intercom_code: formData.intercom_code || null,
          is_default: addresses.length === 0,
        },
      });
      toast.success("Endereço salvo com sucesso!");
      setIsAdding(false);
      setFormData({
        label: "Principal",
        zipcode: "",
        street: "",
        number: "",
        complement: "",
        neighborhood: "",
        city: "",
        state: "",
        is_apartment: false,
        block_tower: "",
        intercom_code: "",
      });
      router.invalidate();
    } catch (error: unknown) {
      toast.error(
        (error instanceof Error ? error.message : String(error)) || "Erro ao salvar endereço."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteUserAddress({ data: { id } });
      toast.success("Endereço excluído com sucesso.");
      router.invalidate();
    } catch {
      toast.error("Erro ao excluir endereço.");
    }
  };

  const handleSetDefault = async (id: string) => {
    try {
      const target = addresses.find((a: any) => a.id === id);
      if (target) {
        await saveUserAddress({
          data: {
            ...target,
            is_default: true,
          },
        });
        toast.success("Endereço padrão atualizado.");
        router.invalidate();
      }
    } catch {
      toast.error("Erro ao atualizar endereço padrão.");
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto space-y-4 sm:space-y-6 pb-24 px-0 sm:px-4 md:px-0 animate-in fade-in duration-200">
      {/* ── 1. Native Mobile Header (Apple HIG / PWA Nativo) ── */}
      <NativeMobileHeader
        title="Meus Endereços"
        fallbackHref="/conta"
        badge={
          addresses.length > 0 ? (
            <Badge variant="secondary" className="text-xs font-mono font-bold px-2 py-1 rounded-full">
              {addresses.length}
            </Badge>
          ) : null
        }
        rightActions={
          !isAdding ? (
            <Button
              size="sm"
              onClick={() => setIsAdding(true)}
              className="rounded-lg h-8.5 px-4 text-xs font-bold gap-2 bg-foreground text-background hover:bg-foreground/90 shrink-0 shadow-2xs cursor-pointer"
            >
              <Plus className="size-3.5" />
              <span>Novo</span>
            </Button>
          ) : undefined
        }
      />

      {/* ── 2. Formulário Apple HIG Inset-Grouped: Novo Endereço ── */}
      {isAdding && (
        <div className="bg-card rounded-none sm:rounded-lg border-y sm:border border-border/80 shadow-xs overflow-hidden transition-all animate-in fade-in-50 duration-200">
          <div className="px-4 sm:px-5 py-4 bg-muted/20 border-b border-border/40 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <MapPin className="size-4.5 text-primary" strokeWidth={2} />
              <h2 className="text-sm font-bold text-foreground">Novo Endereço</h2>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => setIsAdding(false)}
              className="size-8 rounded-lg text-muted-foreground hover:text-foreground cursor-pointer"
            >
              <X className="size-4" />
            </Button>
          </div>

          <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-4">
            {/* Linha 0: Rótulo / Identificação */}
            <div className="space-y-1">
              <label className="text-xs font-semibold text-foreground">
                Identificação do Endereço (ex: Casa, Trabalho, Apartamento)
              </label>
              <Input
                placeholder="Ex: Minha Casa"
                value={formData.label}
                onChange={(e) => setFormData({ ...formData, label: e.target.value })}
                className="h-11 rounded-lg bg-background border-border/70 text-sm focus-visible:ring-primary/20"
              />
            </div>

            {/* Linha 1: CEP com busca automática */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
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
                    type="text"
                    inputMode="numeric"
                    placeholder="00000-000"
                    maxLength={9}
                    value={formData.zipcode}
                    onChange={(e) => handleCepLookup(e.target.value)}
                    className="h-11 rounded-lg bg-background border-border/70 text-sm font-mono focus-visible:ring-primary/20"
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
                  className="h-11 rounded-lg bg-background border-border/70 text-sm focus-visible:ring-primary/20"
                />
              </div>
            </div>

            {/* Linha 2: Número e Complemento */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-1 sm:col-span-1">
                <label className="text-xs font-semibold text-foreground">
                  Número *
                </label>
                <Input
                  required
                  placeholder="Ex: 120"
                  value={formData.number}
                  onChange={(e) => setFormData({ ...formData, number: e.target.value })}
                  className="h-11 rounded-lg bg-background border-border/70 text-sm focus-visible:ring-primary/20"
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
                  className="h-11 rounded-lg bg-background border-border/70 text-sm focus-visible:ring-primary/20"
                />
              </div>
            </div>

            {/* Linha 3: Bairro, Cidade, Estado */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-foreground">
                  Bairro *
                </label>
                <Input
                  required
                  placeholder="Ex: Centro"
                  value={formData.neighborhood}
                  onChange={(e) => setFormData({ ...formData, neighborhood: e.target.value })}
                  className="h-11 rounded-lg bg-background border-border/70 text-sm focus-visible:ring-primary/20"
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
                  className="h-11 rounded-lg bg-background border-border/70 text-sm focus-visible:ring-primary/20"
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
                  className="h-11 rounded-lg bg-background border-border/70 text-sm uppercase font-mono focus-visible:ring-primary/20"
                />
              </div>
            </div>

            {/* Linha 4: Especificações de Condomínio & Apartamento (V139 Waesy Go) */}
            <div className="p-4 rounded-lg bg-muted/30 border border-border/40 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Building className="size-4 text-primary" />
                  <span className="text-xs font-bold text-foreground">Condomínio, Edifício ou Apartamento?</span>
                </div>
                <input
                  type="checkbox"
                  checked={formData.is_apartment}
                  onChange={(e) => setFormData({ ...formData, is_apartment: e.target.checked })}
                  className="size-4.5 rounded-md border-border text-primary focus:ring-primary cursor-pointer"
                />
              </div>

              {formData.is_apartment && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1 animate-in fade-in duration-150">
                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-muted-foreground">Bloco / Torre / Prédio</label>
                    <Input
                      placeholder="Ex: Bloco 2, Torre Norte"
                      value={formData.block_tower}
                      onChange={(e) => setFormData({ ...formData, block_tower: e.target.value })}
                      className="h-10 rounded-lg bg-background text-xs"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-muted-foreground">Interfone / Ramal de Acesso</label>
                    <Input
                      placeholder="Ex: Interfone 402"
                      value={formData.intercom_code}
                      onChange={(e) => setFormData({ ...formData, intercom_code: e.target.value })}
                      className="h-10 rounded-lg bg-background text-xs"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Ações de salvamento */}
            <div className="flex items-center justify-end gap-2 pt-3 border-t border-border/40">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsAdding(false)}
                className="rounded-lg h-11 px-4 text-xs font-semibold cursor-pointer"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting}
                className="rounded-lg h-11 px-6 text-xs font-bold bg-primary text-primary-foreground gap-2 cursor-pointer"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="size-4 animate-spin" />
                    <span>Salvando...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="size-4" />
                    <span>Salvar Endereço</span>
                  </>
                )}
              </Button>
            </div>
          </form>
        </div>
      )}

      {/* ── 3. Lista de Endereços Salvos ── */}
      {!isAdding && addresses.length === 0 ? (
        <div className="p-4 sm:p-0">
          <EmptyState
            title="Nenhum endereço cadastrado"
            description="Cadastre seu endereço para entregas rápidas e cálculo automático de frete."
            action={
              <Button
                onClick={() => setIsAdding(true)}
                className="rounded-lg h-10 px-5 text-xs font-bold gap-2"
              >
                <Plus className="size-3.5" />
                Cadastrar
              </Button>
            }
          />
        </div>
      ) : (
        <>
          {/* Mobile (<640px): WhatsApp List Edge-to-Edge */}
          <div className="sm:hidden w-full divide-y divide-border/40 bg-card border-y border-border/60">
            {addresses.map((addr: any) => (
              <div
                key={addr.id}
                className={cn(
                  "p-4 flex items-start justify-between gap-3 transition-colors",
                  addr.is_default && "bg-primary/5"
                )}
              >
                <div className="flex items-start gap-3 min-w-0 flex-1">
                  <div
                    className={cn(
                      "size-9 rounded-lg flex items-center justify-center shrink-0 mt-1",
                      addr.is_default
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-muted-foreground"
                    )}
                  >
                    <MapPin className="size-4" />
                  </div>
                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-xs font-bold text-foreground truncate">
                        {addr.label || "Endereço"} • {addr.street}, {addr.number}
                      </p>
                      {addr.is_default && (
                        <Badge variant="success" className="text-[9px] px-2 py-0 h-4 font-bold">
                          Padrão
                        </Badge>
                      )}
                      {addr.is_apartment && (
                        <Badge variant="outline" className="text-[9px] px-2 py-0 h-4 font-bold text-primary border-primary/30">
                          Apto/Condomínio
                        </Badge>
                      )}
                    </div>
                    {addr.complement && (
                      <p className="text-[11px] text-muted-foreground truncate">{addr.complement}</p>
                    )}
                    {addr.block_tower && (
                      <p className="text-[10px] text-primary font-medium truncate">
                        Bloco: {addr.block_tower} {addr.intercom_code ? `• Interfone: ${addr.intercom_code}` : ""}
                      </p>
                    )}
                    <p className="text-[11px] text-muted-foreground">
                      {addr.neighborhood} • {addr.city}, {addr.state}
                    </p>
                    <p className="text-[10px] font-mono text-muted-foreground/70">CEP: {addr.zipcode}</p>
                  </div>
                </div>

                <div className="flex items-center gap-1 shrink-0 pt-1">
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
                  "bg-card rounded-lg border p-5 flex flex-col justify-between gap-4 transition-all",
                  addr.is_default
                    ? "border-primary/50 ring-1 ring-primary/20 shadow-2xs"
                    : "border-border/60 hover:border-border"
                )}
              >
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <div
                        className={cn(
                          "size-9 rounded-lg flex items-center justify-center shrink-0",
                          addr.is_default
                            ? "bg-primary text-primary-foreground"
                            : "bg-muted text-muted-foreground"
                        )}
                      >
                        <MapPin className="size-4.5" strokeWidth={1.75} />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-bold text-foreground truncate">
                            {addr.label || "Endereço"}
                          </p>
                          {addr.is_apartment && (
                            <Badge variant="outline" className="text-[10px] font-bold text-primary border-primary/30">
                              Apto/Condomínio
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-foreground font-medium truncate mt-1">
                          {addr.street}, {addr.number}
                        </p>
                        {addr.complement && (
                          <p className="text-xs text-muted-foreground truncate">{addr.complement}</p>
                        )}
                        {addr.block_tower && (
                          <p className="text-[11px] text-primary font-medium truncate mt-1">
                            Bloco: {addr.block_tower} {addr.intercom_code ? `• Interfone: ${addr.intercom_code}` : ""}
                          </p>
                        )}
                      </div>
                    </div>

                    {addr.is_default && (
                      <Badge variant="success" className="text-[10px] shrink-0 font-bold">
                        Padrão
                      </Badge>
                    )}
                  </div>

                  <div className="text-xs text-muted-foreground space-y-1 pl-11.5">
                    <p>{addr.neighborhood}</p>
                    <p>{addr.city} - {addr.state}</p>
                    <p className="font-mono text-[11px] text-muted-foreground/80">CEP: {addr.zipcode}</p>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-3 border-t border-border/40 pl-11.5">
                  <div>
                    {!addr.is_default && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => handleSetDefault(addr.id)}
                        className="h-8 text-xs font-semibold text-muted-foreground hover:text-foreground gap-2 cursor-pointer -ml-2"
                      >
                        <Star className="size-3.5" />
                        <span>Tornar Padrão</span>
                      </Button>
                    )}
                  </div>

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
        </>
      )}
    </div>
  );
}
