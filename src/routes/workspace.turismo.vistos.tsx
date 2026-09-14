import { createFileRoute, Link } from '@tanstack/react-router';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
 Globe,
 Plus,
 Search,
 CheckCircle2,
 Clock,
 AlertCircle,
 FileCheck,
 Calendar,
 User,
 Trash2,
} from 'lucide-react';
import { PageHeader } from '@/components/commerce/page-header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { getStoreSettings } from '@/services/store.functions';
import { listTravelVisas, updateTravelVisaStatus, deleteTravelVisa } from '@/services/travel-visas.functions';
import { VISA_STATUS_LABELS, type VisaStatus, type TravelVisaDTO } from '@/types/travel-visas';
import { NewVisaWizard } from '@/components/tourism/visas/new-visa-wizard';

export const Route = createFileRoute('/workspace/turismo/vistos')({
 head: () => ({ meta: [{ title: 'Passaportes & Vistos Consulares | Workspace' }] }),
 loader: async () => {
   try {
 const store = await getStoreSettings().catch(() => null);
 return { store };
   } catch (err) {
     console.error("[loader:workspace.turismo.vistos] Unhandled loader error:", err);
     return { store: null };
   }
 },
 component: WorkspaceVisasPage,
});

function WorkspaceVisasPage() {
 const { store } = ((Route.useLoaderData?.() as any) || {});
 const storeId = store?.id || '';

 const [search, setSearch] = useState('');
 const [selectedStatus, setSelectedStatus] = useState('all');
 const [wizardOpen, setWizardOpen] = useState(false);

 const { data: visas = [], refetch, isLoading } = useQuery({
 queryKey: ['travel-visas', storeId, selectedStatus],
 queryFn: () => listTravelVisas({ data: { store_id: storeId, status: selectedStatus } }),
 });

 const filtered = visas.filter(
 (v) =>
 v.client_name.toLowerCase().includes(search.toLowerCase()) ||
 v.country.toLowerCase().includes(search.toLowerCase()) ||
 (v.client_passport && v.client_passport.toLowerCase().includes(search.toLowerCase()))
 );

 const handleStatusChange = async (id: string, newStatus: VisaStatus) => {
 try {
 await updateTravelVisaStatus({ data: { id, status: newStatus } });
 toast.success('Status consular atualizado!');
 refetch();
 } catch (err: any) {
 toast.error('Erro ao atualizar status: ' + err?.message);
 }
 };

 const handleDelete = async (id: string, name: string) => {
 if (!confirm(`Deseja realmente remover o processo de ${name}?`)) return;
 try {
 await deleteTravelVisa({ data: { id } });
 toast.success('Processo removido com sucesso!');
 refetch();
 } catch (err: any) {
 toast.error('Erro ao remover: ' + err?.message);
 }
 };

 return (
 <div className="px-0 sm:px-6 lg:px-8 py-2 sm:py-6 max-w-7xl mx-auto space-y-6">
 <PageHeader
 title="Passaportes & Vistos Consulares"
 description="Acompanhamento de processos de vistos (EUA, Canadá, ETIAS), formulários DS-160 e agendamentos de entrevista."
 >
 <Button
 type="button"
 onClick={() => setWizardOpen(true)}
 className="rounded-2xl bg-primary text-primary-foreground font-bold text-xs gap-1.5 shadow-md h-10 px-4 cursor-pointer"
 >
 <Plus className="size-4" /> Novo Processo
 </Button>
 </PageHeader>

 {/* Alerta de Validade de Passaporte */}
 <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center gap-3 text-xs text-amber-800 dark:text-amber-300">
 <AlertCircle className="size-5 shrink-0 text-amber-600" />
 <p className="leading-relaxed">
 <strong>Regra Internacional dos 6 Meses:</strong> Quase todos os destinos internacionais exigem que o passaporte tenha no mínimo 180 dias de validade a partir da data de retorno da viagem. Monitore os vencimentos abaixo!
 </p>
 </div>

 {/* Barra de Filtros */}
 <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
 <div className="relative flex-1 w-full sm:max-w-md">
 <Search className="size-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
 <Input
 value={search}
 onChange={(e) => setSearch(e.target.value)}
 placeholder="Buscar por passageiro, país ou nº do passaporte..."
 className="h-10 pl-9 rounded-xl text-xs bg-muted/20"
 />
 </div>

 <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar w-full sm:w-auto pb-1 sm:pb-0">
 <button
 type="button"
 onClick={() => setSelectedStatus('all')}
 className={'px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ' + (
 selectedStatus === 'all'
 ? 'bg-primary text-primary-foreground shadow-sm'
 : 'bg-muted/40 text-muted-foreground hover:text-foreground'
 )}
 >
 Todos ({visas.length})
 </button>
 {Object.entries(VISA_STATUS_LABELS).map(([k, meta]) => (
 <button
 key={k}
 type="button"
 onClick={() => setSelectedStatus(k)}
 className={'px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ' + (
 selectedStatus === k
 ? 'bg-primary text-primary-foreground shadow-sm'
 : 'bg-muted/40 text-muted-foreground hover:text-foreground'
 )}
 >
 {meta.label.split('/')[0]}
 </button>
 ))}
 </div>
 </div>

 {/* Grid de Processos */}
 {isLoading ? (
 <div className="py-12 text-center text-xs text-muted-foreground">Carregando processos de visto...</div>
 ) : filtered.length === 0 ? (
 <div className="p-12 text-center rounded-2xl border border-dashed border-border bg-card space-y-3">
 <Globe className="size-8 text-muted-foreground mx-auto" />
 <p className="text-xs font-bold text-foreground">Nenhum processo consular encontrado</p>
 <p className="text-xs text-muted-foreground">Inicie o acompanhamento de vistos para passageiros da agência.</p>
 <Button type="button" onClick={() => setWizardOpen(true)} size="sm" className="rounded-xl">
 Novo Processo de Visto
 </Button>
 </div>
 ) : (
 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
 {filtered.map((v) => {
 const statusMeta = VISA_STATUS_LABELS[v.status] || VISA_STATUS_LABELS.coleta_documentos;
 return (
 <div
 key={v.id}
 className="p-5 rounded-2xl bg-card border border-border hover:border-primary/40 transition-all shadow-sm flex flex-col justify-between space-y-4"
 >
 <div className="space-y-2.5">
 <div className="flex items-start justify-between gap-2">
 <div className="space-y-0.5">
 <h3 className="text-sm font-bold text-foreground leading-tight">{v.client_name}</h3>
 <p className="text-xs text-muted-foreground font-medium flex items-center gap-1">
 <Globe className="size-3 text-primary" /> {v.country} · <span className="font-normal">{v.visa_category}</span>
 </p>
 </div>
 {v.client_passport && (
 <Badge variant="outline" className="font-mono text-[10px] uppercase">
 {v.client_passport}
 </Badge>
 )}
 </div>

 {/* Status Dropdown */}
 <div className="pt-1">
 <select
 value={v.status}
 onChange={(e) => handleStatusChange(v.id, e.target.value as VisaStatus)}
 className={'w-full h-8 px-2.5 rounded-lg text-xs font-bold border transition-colors cursor-pointer ' + statusMeta.color}
 >
 {Object.entries(VISA_STATUS_LABELS).map(([k, meta]) => (
 <option key={k} value={k}>{meta.label}</option>
 ))}
 </select>
 </div>

 {/* Entrevista agendada */}
 {v.interview_date && (
 <div className="text-[11px] text-muted-foreground flex items-center gap-1.5 bg-muted/20 p-2 rounded-xl">
 <Calendar className="size-3.5 text-primary shrink-0" />
 <span>Entrevista: <strong className="text-foreground">{new Date(v.interview_date).toLocaleDateString('pt-BR')}</strong></span>
 </div>
 )}

 {v.notes && (
 <p className="text-[11px] text-muted-foreground leading-relaxed line-clamp-2 italic">
 "{v.notes}"
 </p>
 )}
 </div>

 <div className="border-t border-border/60 pt-3 flex items-center justify-between text-xs text-muted-foreground">
 <span className="text-[10px]">
 {v.documents?.length || 4} itens no checklist
 </span>
 <Button
 type="button"
 variant="ghost"
 size="sm"
 onClick={() => handleDelete(v.id, v.client_name)}
 className="h-8 w-8 p-0 rounded-lg text-muted-foreground hover:text-destructive"
 >
 <Trash2 className="size-3.5" />
 </Button>
 </div>
 </div>
 );
 })}
 </div>
 )}

 {wizardOpen && (
 <NewVisaWizard
 isOpen={wizardOpen}
 onClose={() => setWizardOpen(false)}
 onCreated={refetch}
 storeId={storeId}
 />
 )}
 </div>
 );
}
