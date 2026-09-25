import { createFileRoute } from '@tanstack/react-router';
import { useState } from 'react';
import {
 Compass,
 Plane,
 Hotel,
 Calendar,
 CreditCard,
 Camera,
 PhoneCall,
 MapPin,
 Clock,
 ShieldCheck,
 CheckCircle2,
 FileText,
 DollarSign,
 Utensils,
 Sun,
 Globe,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';

export const Route = createFileRoute('/viajante/viagem/$id')({
 component: TripPortalPage,
});

type TabType = 'resumo' | 'explorar' | 'financeiro' | 'memorias' | 'contatos';

export default function TripPortalPage() {
 const { id } = Route.useParams();
 const [activeTab, setActiveTab] = useState<TabType>('resumo');

 return (
 <div className="min-h-screen bg-slate-50 dark:bg-zinc-950 flex flex-col items-center">
 {/* Hero Banner */}
 <div className="w-full bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white py-12 px-6 shadow-xs border-b border-border/20">
 <div className="max-w-4xl mx-auto flex flex-col sm:flex-row sm:items-center justify-between gap-4">
 <div>
 <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-white/10 text-cyan-300 backdrop-blur-md mb-2">
 <Compass className="size-3.5" />
 Portal do Passageiro 360
 </span>
 <h1 className="text-3xl font-black tracking-tight">Férias em Orlando & Miami</h1>
 <p className="text-white/80 text-sm mt-1">
 Viagem #{id} · 15 de Outubro a 23 de Outubro de 2026 · 2 Viajantes
 </p>
 </div>

 <div className="flex items-center gap-2">
 <span className="px-3 py-1.5 rounded-xl bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-xs font-bold flex items-center gap-1.5">
 <CheckCircle2 className="size-4" />
 Reserva Confirmada
 </span>
 </div>
 </div>
 </div>

 {/* Tabs Navigation */}
 <div className="max-w-4xl w-full px-4 sm:px-6 pt-6">
 <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-2 border-b border-border">
 <button
 onClick={() => setActiveTab('resumo')}
 className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap ${
 activeTab === 'resumo'
 ? 'bg-primary text-primary-foreground shadow-sm'
 : 'text-muted-foreground hover:bg-muted'
 }`}
 >
 <Compass className="size-4" />
 Resumo do Roteiro
 </button>

 <button
 onClick={() => setActiveTab('explorar')}
 className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap ${
 activeTab === 'explorar'
 ? 'bg-primary text-primary-foreground shadow-sm'
 : 'text-muted-foreground hover:bg-muted'
 }`}
 >
 <Globe className="size-4" />
 Explorar Destino
 </button>

 <button
 onClick={() => setActiveTab('financeiro')}
 className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap ${
 activeTab === 'financeiro'
 ? 'bg-primary text-primary-foreground shadow-sm'
 : 'text-muted-foreground hover:bg-muted'
 }`}
 >
 <CreditCard className="size-4" />
 Carnê & Financeiro
 </button>

 <button
 onClick={() => setActiveTab('memorias')}
 className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap ${
 activeTab === 'memorias'
 ? 'bg-primary text-primary-foreground shadow-sm'
 : 'text-muted-foreground hover:bg-muted'
 }`}
 >
 <Camera className="size-4" />
 Galeria de Memórias
 </button>

 <button
 onClick={() => setActiveTab('contatos')}
 className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap ${
 activeTab === 'contatos'
 ? 'bg-primary text-primary-foreground shadow-sm'
 : 'text-muted-foreground hover:bg-muted'
 }`}
 >
 <PhoneCall className="size-4" />
 Plantão 24h & Emergência
 </button>
 </div>

 {/* Tab Content */}
 <div className="py-6">
 {activeTab === 'resumo' && (
 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
 <div className="p-5 rounded-2xl border border-border bg-card shadow-sm flex flex-col gap-3">
 <div className="flex items-center gap-2 text-primary font-bold text-sm">
 <Plane className="size-4" />
 Voos Confirmados (Trecho de Ida)
 </div>
 <div className="p-3 rounded-xl bg-muted/40 text-xs flex justify-between items-center">
 <div>
 <p className="font-bold text-foreground">LATAM LA 3214</p>
 <p className="text-muted-foreground">GRU 23:30 &rarr; MIA 07:15</p>
 </div>
 <span className="font-mono text-primary font-bold">PNR: XYZ987</span>
 </div>
 </div>

 <div className="p-5 rounded-2xl border border-border bg-card shadow-sm flex flex-col gap-3">
 <div className="flex items-center gap-2 text-primary font-bold text-sm">
 <Hotel className="size-4" />
 Hospedagem Confirmada
 </div>
 <div className="p-3 rounded-xl bg-muted/40 text-xs flex justify-between items-center">
 <div>
 <p className="font-bold text-foreground">Grand Beach Resort & Spa</p>
 <p className="text-muted-foreground">7 Noites · Café da Manhã Incluso</p>
 </div>
 <Badge variant="outline">Voucher Ativo</Badge>
 </div>
 </div>
 </div>
 )}

 {activeTab === 'explorar' && (
 <div className="p-6 rounded-2xl border border-border bg-card shadow-sm flex flex-col gap-4">
 <div className="flex items-center gap-2 text-foreground font-bold">
 <Sun className="size-5 text-amber-500" />
 Guia & Inteligência de Destino (Orlando & Miami)
 </div>
 <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
 <div className="p-4 rounded-xl bg-muted/30">
 <span className="text-muted-foreground">Clima Esperado:</span>
 <p className="text-base font-bold text-foreground mt-1">26°C · Ensolarado</p>
 </div>
 <div className="p-4 rounded-xl bg-muted/30">
 <span className="text-muted-foreground">Fuso Horário:</span>
 <p className="text-base font-bold text-foreground mt-1">GMT-4 (-1h de Brasília)</p>
 </div>
 <div className="p-4 rounded-xl bg-muted/30">
 <span className="text-muted-foreground">Moeda Local:</span>
 <p className="text-base font-bold text-foreground mt-1">Dólar Americano (USD)</p>
 </div>
 </div>
 </div>
 )}

 {activeTab === 'financeiro' && (
 <div className="p-6 rounded-2xl border border-border bg-card shadow-sm flex flex-col gap-4">
 <div className="flex items-center justify-between">
 <h3 className="text-base font-bold text-foreground flex items-center gap-2">
 <DollarSign className="size-4 text-emerald-500" />
 Carnê de Viagem Parcelada
 </h3>
 <span className="text-xs font-semibold text-emerald-600 bg-emerald-500/10 px-2.5 py-1 rounded-full">
 Em Dia
 </span>
 </div>
 <div className="divide-y divide-border text-xs">
 <div className="flex justify-between py-2.5">
 <span>Parcela 1/3 (Entrada)</span>
 <span className="font-bold text-emerald-600">R$ 1.500,00 · PAGA (PIX)</span>
 </div>
 <div className="flex justify-between py-2.5">
 <span>Parcela 2/3 (Vencimento 10/10)</span>
 <span className="font-bold text-foreground">R$ 1.500,00</span>
 </div>
 <div className="flex justify-between py-2.5">
 <span>Parcela 3/3 (Vencimento 10/11)</span>
 <span className="font-bold text-foreground">R$ 1.500,00</span>
 </div>
 </div>
 </div>
 )}

 {activeTab === 'memorias' && (
 <div className="p-8 rounded-2xl border border-dashed border-border bg-card text-center">
 <Camera className="size-10 text-muted-foreground mx-auto mb-3 opacity-50" />
 <h4 className="text-base font-bold text-foreground">Álbum & Memórias da Viagem</h4>
 <p className="text-xs text-muted-foreground mt-1 mb-4">
 Envie suas fotos favoritas dos passeios para compor o diário visual da viagem.
 </p>
 <input
 type="file"
 id="album-file-input"
 multiple
 accept="image/*"
 className="hidden"
 onChange={(e) => {
 const files = e.target.files;
 if (files && files.length > 0) {
 toast.success(`${files.length} foto(s) selecionada(s) para o álbum.`);
 }
 }}
 />
 <Button
 onClick={() => {
 document.getElementById('album-file-input')?.click();
 }}
 className="h-10 px-5 text-xs font-semibold rounded-xl"
 >
 Adicionar Fotos ao Álbum
 </Button>
 </div>
 )}

 {activeTab === 'contatos' && (
 <div className="p-6 rounded-2xl border border-border bg-card shadow-sm flex flex-col gap-4">
 <h3 className="text-base font-bold text-foreground flex items-center gap-2">
 <PhoneCall className="size-4 text-primary" />
 Contatos de Emergência & Suporte 24 Horas
 </h3>
 <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
 <div className="p-4 rounded-xl bg-muted/40 flex flex-col gap-1">
 <span className="font-bold text-foreground">Plantão 24h da Agência (WhatsApp)</span>
 <span className="text-muted-foreground">+55 (11) 99999-8888</span>
 </div>
 <div className="p-4 rounded-xl bg-muted/40 flex flex-col gap-1">
 <span className="font-bold text-foreground">Seguradora Assist Card</span>
 <span className="text-muted-foreground">0800 770 1660 (Ligação Gratuita)</span>
 </div>
 <div className="p-4 rounded-xl bg-muted/40 flex flex-col gap-1">
 <span className="font-bold text-foreground">Consulado-Geral do Brasil em Miami</span>
 <span className="text-muted-foreground">+1 (305) 285-6200</span>
 </div>
 <div className="p-4 rounded-xl bg-muted/40 flex flex-col gap-1">
 <span className="font-bold text-foreground">LATAM Linhas Aéreas</span>
 <span className="text-muted-foreground">0300 570 5700</span>
 </div>
 </div>
 </div>
 )}
 </div>
 </div>
 </div>
 );
}
