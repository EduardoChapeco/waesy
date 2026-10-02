import { useMutation } from "@tanstack/react-query";
import { useRouter } from "@tanstack/react-router";
import { Building, Check, ChevronsUpDown } from "lucide-react";
import { useState } from "react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { setTenantContext } from "@/services/identity.functions";
import type { ServerIdentity } from "@/lib/identity-core";

interface TenantSwitcherProps {
 identity: ServerIdentity;
}

export function TenantSwitcher({ identity }: TenantSwitcherProps) {
 const [open, setOpen] = useState(false);
 const router = useRouter();

 const activeStoreId = identity.store_id;
 const activeMembership = identity.memberships.find((m) => m.store_id === activeStoreId);

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

 // Mostramos o seletor mesmo se houver apenas 1 membership, porque ele agora pode alternar
 // entre o Perfil Pessoal e aquela 1 membership.
 // Só bloqueamos se houver 0 memberships (não deveria estar no admin, mas apenas por segurança).
 if (identity.memberships.length === 0) {
 return (
 <div className="flex items-center gap-2 px-2 py-2 text-sm font-medium text-muted-foreground">
 <Building className="h-4 w-4" />
 Perfil Pessoal
 </div>
 );
 }

 const getActiveLabel = () => {
 if (!activeStoreId) return "Perfil Pessoal (Física)";
 return activeMembership?.name || "Selecione o Contexto...";
 };

 return (
 <Popover open={open} onOpenChange={setOpen}>
 <PopoverTrigger asChild>
 <Button
 variant="outline"
 role="combobox"
 aria-expanded={open}
 className="w-full justify-between sm:w-60"
 disabled={setContextMutation.isPending}
 >
 <div className="flex items-center gap-2 truncate">
 <Building className="h-4 w-4 shrink-0" />
 <span className="truncate">{getActiveLabel()}</span>
 </div>
 <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
 </Button>
 </PopoverTrigger>
 <PopoverContent className="w-60 p-0" align="start">
 <Command>
 <CommandInput placeholder="Buscar contexto..." />
 <CommandList>
 <CommandEmpty>Nenhum contexto encontrado.</CommandEmpty>

 <CommandGroup heading="Identidade Base">
 <CommandItem
 value="perfil pessoal"
 onSelect={() => {
 if (activeStoreId !== null && activeStoreId !== undefined) {
 setContextMutation.mutate(null);
 } else {
 setOpen(false);
 }
 }}
 className="flex items-center justify-between font-bold text-primary"
 >
 <div className="flex items-center gap-2 truncate">
 <Building className="h-4 w-4" />
 <span className="truncate">Perfil Pessoal (Física)</span>
 </div>
 <Check className={cn("h-4 w-4", !activeStoreId ? "opacity-100" : "opacity-0")} />
 </CommandItem>
 </CommandGroup>

 <CommandGroup heading="Meus Coletivos / Lojas">
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
 <Building className="h-4 w-4" />
 )}
 <span className="truncate">{membership.name}</span>
 </div>
 <Check
 className={cn(
 "h-4 w-4",
 activeStoreId === membership.store_id ? "opacity-100" : "opacity-0",
 )}
 />
 </CommandItem>
 ))}
 </CommandGroup>
 </CommandList>
 </Command>
 </PopoverContent>
 </Popover>
 );
}
