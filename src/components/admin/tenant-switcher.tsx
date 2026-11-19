import { useMutation } from "@tanstack/react-query";
import { useRouter } from "@tanstack/react-router";
import { Building, Building2, Check, ChevronsUpDown, User } from "lucide-react";
import { useState } from "react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList, CommandSeparator } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { setTenantContext } from "@/services/identity.functions";
import type { ServerIdentity } from "@/lib/identity-core";

interface TenantSwitcherProps {
 identity: ServerIdentity;
}

export function TenantSwitcher({ identity }: TenantSwitcherProps) {
 const [open, setOpen] = useState(false);
 const router = useRouter();

 const activeStoreId = identity.store_id || identity.memberships[0]?.store_id || null;
 const activeMembership = identity.memberships.find((m) => m.store_id === activeStoreId) || identity.memberships[0];

 const setContextMutation = useMutation({
 mutationFn: async (store_id: string | null) => {
 return setTenantContext({ data: { store_id } });
 },
 onSuccess: () => {
 router.invalidate();
 setOpen(false);
 },
 onError: (error) => {
 console.error("Failed to switch context", error);
 },
 });

 if (identity.memberships.length === 0) {
 return (
 <div className="flex items-center gap-2 px-3 py-2 text-xs font-semibold text-muted-foreground border border-border rounded-lg bg-card">
 <Building className="h-4 w-4 text-primary" />
 <span className="truncate">{activeMembership?.name || "Unidade Corporativa"}</span>
 </div>
 );
 }

 const getActiveLabel = () => {
 return activeMembership?.name || "Selecione a Loja...";
 };

 return (
 <Popover open={open} onOpenChange={setOpen}>
 <PopoverTrigger asChild>
 <Button
 variant="outline"
 role="combobox"
 aria-expanded={open}
 className="w-full justify-between sm:w-60 h-11 min-h-11"
 disabled={setContextMutation.isPending}
 >
 <div className="flex items-center gap-2 truncate">
 <Building className="h-4 w-4 shrink-0 text-primary" />
 <span className="truncate font-medium">{getActiveLabel()}</span>
 </div>
 <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
 </Button>
 </PopoverTrigger>
 <PopoverContent className="w-60 p-0" align="start">
 <Command>
 <CommandInput placeholder="Buscar loja..." />
 <CommandList>
 <CommandEmpty>Nenhuma loja encontrada.</CommandEmpty>

 <CommandGroup heading="Lojas & Unidades">
 {identity.memberships.map((membership) => (
 <CommandItem
 key={membership.store_id}
 value={membership.name || membership.store_id}
 onSelect={() => {
 if (membership.store_id !== activeStoreId) {
 setContextMutation.mutate(membership.store_id);
 } else {
 setOpen(false);
 }
 }}
 className="flex items-center justify-between"
 >
 <div className="flex items-center gap-2 truncate">
 {membership.logo_url ? (
 <img
 src={membership.logo_url}
 alt="Logo"
 className="h-4 w-4 rounded-full object-cover"
 />
 ) : (
 <Building className="h-4 w-4 text-primary" />
 )}
 <span className="truncate font-medium">{membership.name}</span>
 </div>
 <Check
 className={cn(
 "h-4 w-4",
 activeStoreId === membership.store_id ? "opacity-100" : "opacity-0",
 )}
 />
 </CommandItem>
 ))}
 <CommandItem
 value="seletor de portais empresas"
 onSelect={() => {
 window.location.href = "/auth/portal-selector";
 }}
 className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground cursor-pointer"
 >
 <Building2 className="h-4 w-4 shrink-0 text-primary" />
 <span>Ver Todas as Empresas</span>
 </CommandItem>
 </CommandGroup>

 <CommandSeparator />

 <CommandGroup heading="Acesso Civil">
 <CommandItem
 value="sair para conta pessoal"
 onSelect={() => {
 window.location.href = "/conta";
 }}
 className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground cursor-pointer"
 >
 <User className="h-4 w-4 shrink-0" />
 <span>Ir para Conta Pessoal</span>
 </CommandItem>
 </CommandGroup>
 </CommandList>
 </Command>
 </PopoverContent>
 </Popover>
 );
}
