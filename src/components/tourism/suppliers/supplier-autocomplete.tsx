import React, { useState, useEffect } from 'react';
import { Building2, Check, ChevronsUpDown, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { listTravelSuppliers } from '@/services/travel-suppliers.functions';
import type { TravelSupplierDTO } from '@/types/travel-suppliers';

interface SupplierAutocompleteProps {
 value?: string;
 onChange: (supplier: TravelSupplierDTO | null) => void;
 placeholder?: string;
 storeId?: string;
 onOpenCreate?: () => void;
}

export function SupplierAutocomplete({
 value,
 onChange,
 placeholder = 'Selecione uma Operadora / Fornecedor...',
 storeId,
 onOpenCreate,
}: SupplierAutocompleteProps) {
 const [suppliers, setSuppliers] = useState<TravelSupplierDTO[]>([]);
 const [isOpen, setIsOpen] = useState(false);
 const [search, setSearch] = useState('');

 useEffect(() => {
 listTravelSuppliers({ data: { store_id: storeId } })
 .then(setSuppliers)
 .catch(() => setSuppliers([]));
 }, [storeId]);

 const selectedSupplier = suppliers.find((s) => s.id === value || s.name === value);

 const filtered = suppliers.filter(
 (s) =>
 s.name.toLowerCase().includes(search.toLowerCase()) ||
 (s.legal_name && s.legal_name.toLowerCase().includes(search.toLowerCase()))
 );

 return (
 <div className="relative w-full">
 <div
 onClick={() => setIsOpen(!isOpen)}
 className="w-full h-10 px-3 rounded-lg border border-border bg-background text-xs flex items-center justify-between cursor-pointer hover:border-primary/50 transition-colors"
 >
 <div className="flex items-center gap-2 truncate">
 <Building2 className="size-3.5 text-muted-foreground shrink-0" />
 <span className={selectedSupplier ? 'text-foreground font-medium' : 'text-muted-foreground'}>
 {selectedSupplier ? selectedSupplier.name : placeholder}
 </span>
 </div>
 <ChevronsUpDown className="size-3.5 text-muted-foreground shrink-0" />
 </div>

 {isOpen && (
 <div className="absolute left-0 right-0 top-11 z-50 rounded-lg border border-border bg-card shadow-2xl p-2 space-y-2 animate-in fade-in zoom-in-95">
 <Input
 value={search}
 onChange={(e) => setSearch(e.target.value)}
 placeholder="Filtrar fornecedor..."
 className="h-8 text-xs rounded-lg"
 autoFocus
 />

 <div className="max-h-48 overflow-y-auto no-scrollbar space-y-1 pr-1">
 {filtered.length === 0 ? (
 <div className="p-3 text-center text-xs text-muted-foreground">
 Nenhum fornecedor encontrado.
 </div>
 ) : (
 filtered.map((s) => (
 <div
 key={s.id}
 onClick={() => {
 onChange(s);
 setIsOpen(false);
 }}
 className={'p-2 rounded-lg text-xs flex items-center justify-between cursor-pointer hover:bg-muted transition-all ' + (
 selectedSupplier?.id === s.id ? 'bg-primary/10 font-bold text-primary' : 'text-foreground'
 )}
 >
 <div className="space-y-1 truncate">
 <p className="truncate">{s.name}</p>
 <span className="text-[10px] text-muted-foreground">{s.country} · {s.commission_rate}% comissão</span>
 </div>
 {selectedSupplier?.id === s.id && <Check className="size-3.5 text-primary shrink-0" />}
 </div>
 ))
 )}
 </div>

 {onOpenCreate && (
 <Button
 type="button"
 variant="outline"
 size="sm"
 onClick={() => {
 setIsOpen(false);
 onOpenCreate();
 }}
 className="w-full h-8 text-xs rounded-lg border-dashed gap-1 text-primary"
 >
 <Plus className="size-3" /> Cadastrar Novo Fornecedor
 </Button>
 )}
 </div>
 )}
 </div>
 );
}
