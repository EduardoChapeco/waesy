import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useState } from "react";
import {
  getUserAddresses,
  saveUserAddress,
  deleteUserAddress,
  setDefaultUserAddress,
  type UserAddressDTO,
} from "@/services/addresses.functions";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { EmptyState } from "@/components/state/states";
import { NativeMobileHeader } from "@/components/navigation/native-mobile-header";
import { CanonicalAddressForm } from "@/components/address/canonical-address-form";
import { AddressCardHub } from "@/components/address/address-card-hub";

export const Route = createFileRoute("/_store/conta/enderecos")({
  head: () => ({ meta: [{ title: "Meus Endereços | Waesy" }] }),
  loader: async () => {
    try {
      return (await getUserAddresses()) || [];
    } catch (err) {
      console.error("[loader:_store.conta.enderecos] Unhandled loader error:", err);
      return [];
    }
  },
  component: AddressesPage,
});

function AddressesPage() {
  const addresses = (Route.useLoaderData() as UserAddressDTO[]) || [];
  const router = useRouter();

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingAddress, setEditingAddress] = useState<UserAddressDTO | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleOpenNew = () => {
    setEditingAddress(null);
    setIsFormOpen(true);
  };

  const handleOpenEdit = (addr: UserAddressDTO) => {
    setEditingAddress(addr);
    setIsFormOpen(true);
  };

  const handleSave = async (formData: any) => {
    setIsSubmitting(true);
    try {
      await saveUserAddress({
        data: formData,
      });

      toast.success(
        editingAddress ? "Endereço atualizado com sucesso!" : "Novo endereço cadastrado com sucesso!"
      );
      setIsFormOpen(false);
      setEditingAddress(null);
      await router.invalidate();
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : "Erro ao salvar endereço.";
      toast.error(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteUserAddress({ data: { id } });
      toast.success("Endereço excluído com sucesso.");
      await router.invalidate();
    } catch {
      toast.error("Erro ao excluir endereço.");
    }
  };

  const handleSetDefault = async (addr: UserAddressDTO) => {
    try {
      await setDefaultUserAddress({ data: { id: addr.id } });
      toast.success("Endereço predefinido atualizado.");
      await router.invalidate();
    } catch {
      toast.error("Erro ao atualizar endereço predefinido.");
    }
  };

  const mobileHeaderRightAction = !isFormOpen ? (
    <Button
      onClick={handleOpenNew}
      className="rounded-lg h-11 min-h-11 px-4 text-xs font-bold gap-2 bg-foreground text-background hover:bg-foreground/90 shrink-0 cursor-pointer focus-visible:ring-2 focus-visible:ring-primary"
    >
      <Plus className="size-4" />
      <span>Novo</span>
    </Button>
  ) : undefined;

  const emptyStateAction = (
    <Button
      onClick={handleOpenNew}
      className="rounded-lg h-11 min-h-11 px-5 text-xs font-bold gap-2 bg-foreground text-background hover:bg-foreground/90 cursor-pointer focus-visible:ring-2 focus-visible:ring-primary"
    >
      <Plus className="size-4" />
      <span>Cadastrar Primeiro Endereço</span>
    </Button>
  );

  return (
    <div className="w-full max-w-5xl mx-auto space-y-4 sm:space-y-6 pb-safe pb-24 px-0 sm:px-4 md:px-0 animate-in fade-in duration-200 motion-reduce:animate-none motion-reduce:transition-none">
      {/* ── 0. Native Mobile Header (<768px) ── */}
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
        rightActions={mobileHeaderRightAction}
      />

      {/* ── 1. Desktop Inpage Header (>=768px) ── */}
      <div className="hidden md:flex items-center justify-between pb-4 border-b border-border/40">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-foreground">Meus Endereços</h1>
          <p className="text-xs text-muted-foreground mt-1">
            Gerencie seus endereços para entrega, serviços e faturamento
          </p>
        </div>
        {!isFormOpen && (
          <Button
            onClick={handleOpenNew}
            className="rounded-lg h-11 min-h-11 px-4 text-xs font-bold gap-2 bg-foreground text-background hover:bg-foreground/90 shrink-0 cursor-pointer focus-visible:ring-2 focus-visible:ring-primary"
          >
            <Plus className="size-4" />
            <span>Novo Endereço</span>
          </Button>
        )}
      </div>

      {/* ── 2. Formulário Estruturado Canônico (Paridade Mercado Livre + Mapa Vetorial) ── */}
      {isFormOpen && (
        <CanonicalAddressForm
          initialData={editingAddress}
          isSubmitting={isSubmitting}
          onSave={handleSave}
          onCancel={() => {
            setIsFormOpen(false);
            setEditingAddress(null);
          }}
          isFirstAddress={addresses.length === 0}
        />
      )}

      {/* ── 3. Lista de Endereços Salvos ── */}
      {!isFormOpen && addresses.length === 0 ? (
        <div className="p-4 sm:p-0">
          <EmptyState
            title="Nenhum endereço cadastrado"
            description="Cadastre seu endereço para entregas rápidas, agendamentos e cálculo automático de frete."
            action={emptyStateAction}
          />
        </div>
      ) : !isFormOpen ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 px-3 sm:px-0">
          {addresses.map((addr) => (
            <AddressCardHub
              key={addr.id}
              address={addr}
              onEdit={handleOpenEdit}
              onDelete={handleDelete}
              onSetDefault={handleSetDefault}
              onUpdated={() => router.invalidate()}
              mode="account"
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}
