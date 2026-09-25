import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useState } from 'react';
import { 
 AlertTriangle, 
 Scale, 
 Send, 
 CheckCircle2, 
 FileText, 
 Calendar, 
 Building2,
 ShieldAlert,
 ArrowRight,
 Info
} from 'lucide-react';
import { createConsumerClaim } from '@/services/claim-intelligence.functions';
import type { ClaimCategory } from '@/types/claim-intelligence';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';

export const Route = createFileRoute('/reclamar/novo')({
 head: () => ({ meta: [{ title: 'Registrar Reclamação do Consumidor | Waesy Reclamar & JUS' }] }),
 component: ReclamarNovoPage,
});

const CATEGORIES: { value: ClaimCategory; label: string }[] = [
 { value: 'atraso_voo', label: 'Atraso / Cancelamento de Voo (ANAC 400)' },
 { value: 'cobranca_indevida', label: 'Cobrança Indevida / Estorno' },
 { value: 'defeito', label: 'Defeito em Produto / Serviço Não Entregue' },
 { value: 'atendimento', label: 'Mau Atendimento / Falta de Resposta' },
 { value: 'cancelamento', label: 'Cancelamento / Multa Abusiva' },
 { value: 'fraude', label: 'Suspeita de Fraude / Golpe' },
 { value: 'outro', label: 'Outros Motivos' },
];

function ReclamarNovoPage() {
 const navigate = useNavigate();

 const [consumerName, setConsumerName] = useState('');
 const [consumerEmail, setConsumerEmail] = useState('');
 const [targetEntityName, setTargetEntityName] = useState('');
 const [category, setCategory] = useState<ClaimCategory>('atraso_voo');
 const [title, setTitle] = useState('');
 const [description, setDescription] = useState('');
 const [incidentDate, setIncidentDate] = useState('');
 const [legalAdviseNeeded, setLegalAdviseNeeded] = useState(false);
 const [isSubmitting, setIsSubmitting] = useState(false);
 const [isSuccess, setIsSuccess] = useState(false);

 async function handleSubmit(e: React.FormEvent) {
 e.preventDefault();
 if (!consumerName || !consumerEmail || !targetEntityName || !title || !description) {
 toast.error('Preencha todos os campos obrigatórios.');
 return;
 }

 setIsSubmitting(true);
 try {
 await createConsumerClaim({
 data: {
 storeId: '00000000-0000-0000-0000-000000000000',
 consumerName,
 consumerEmail,
 targetEntityName,
 category,
 title,
 description,
 incidentDate: incidentDate || undefined,
 legalAdviseNeeded,
 }
 });
 setIsSuccess(true);
 toast.success('Reclamação registrada com sucesso no Waesy Reclamar!');
 } catch (err: any) {
 toast.error('Erro ao enviar reclamação: ' + err.message);
 } finally {
 setIsSubmitting(false);
 }
 }

 if (isSuccess) {
 return (
 <div className="min-h-screen bg-background flex items-center justify-center p-4">
 <div className="max-w-md w-full p-8 rounded-2xl border border-border bg-card shadow-xs text-center flex flex-col items-center">
 <div className="size-16 rounded-full bg-emerald-500/10 text-emerald-500 flex items-center justify-center mb-4">
 <CheckCircle2 className="size-8" />
 </div>
 <h2 className="text-2xl font-bold tracking-tight text-foreground">Reclamação Publicada</h2>
 <p className="text-sm text-muted-foreground mt-2 leading-relaxed">
 A empresa <b>{targetEntityName}</b> foi notificada oficialmente para resposta.
 {legalAdviseNeeded && ' Seu caso também foi encaminhado ao Módulo Advocacia (JUS 360°) para triagem jurídica prioritária.'}
 </p>
 <Button 
 className="w-full mt-6 h-12 rounded-2xl font-bold text-sm"
 onClick={() => navigate({ to: '/workspace/advocacia' as any })}
 >
 Acessar Painel Jurídico / Notificações
 </Button>
 </div>
 </div>
 );
 }

 return (
 <div className="min-h-screen bg-background text-foreground py-12 px-4 sm:px-6">
 <div className="max-w-2xl mx-auto">
 <div className="text-center mb-8">
 <Badge variant="outline" className="px-3 py-1 mb-3 rounded-full text-xs font-semibold gap-1.5 border-rose-500/30 text-rose-500">
 <AlertTriangle className="size-3.5" /> Waesy Reclamar & Proteção ao Consumidor
 </Badge>
 <h1 className="text-3xl font-black tracking-tight">Registrar Manifestação Oficial</h1>
 <p className="text-muted-foreground mt-2 text-sm">
 Canal público e auditado de mediação e resolução entre clientes, empresas e assistência jurídica.
 </p>
 </div>

 <form onSubmit={handleSubmit} className="p-6 sm:p-8 rounded-2xl border border-border bg-card shadow-xs space-y-5">
 <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
 <div>
 <label className="text-xs font-semibold text-muted-foreground">Seu Nome Completo</label>
 <Input 
 className="mt-1 h-11 rounded-xl"
 placeholder="Ex: João da Silva"
 value={consumerName}
 onChange={(e) => setConsumerName(e.target.value)}
 required
 />
 </div>
 <div>
 <label className="text-xs font-semibold text-muted-foreground">Seu E-mail</label>
 <Input 
 type="email"
 className="mt-1 h-11 rounded-xl"
 placeholder="joao@email.com"
 value={consumerEmail}
 onChange={(e) => setConsumerEmail(e.target.value)}
 required
 />
 </div>
 </div>

 <div>
 <label className="text-xs font-semibold text-muted-foreground">Empresa Reclamada</label>
 <Input 
 className="mt-1 h-11 rounded-xl"
 placeholder="Ex: Companhia Aérea, Agência ou Loja..."
 value={targetEntityName}
 onChange={(e) => setTargetEntityName(e.target.value)}
 required
 />
 </div>

 <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
 <div>
 <label className="text-xs font-semibold text-muted-foreground">Categoria do Ocorrido</label>
 <select 
 value={category} 
 onChange={(e) => setCategory(e.target.value as any)}
 className="mt-1 w-full h-11 rounded-xl border border-input bg-background px-3 text-sm focus:outline-none focus:ring-1 focus:ring-primary min-h-[44px]"
 >
 {CATEGORIES.map((c) => (
 <option key={c.value} value={c.value}>{c.label}</option>
 ))}
 </select>
 </div>
 <div>
 <label className="text-xs font-semibold text-muted-foreground">Data do Incidente</label>
 <Input 
 type="date"
 className="mt-1 h-11 rounded-xl"
 value={incidentDate}
 onChange={(e) => setIncidentDate(e.target.value)}
 />
 </div>
 </div>

 <div>
 <label className="text-xs font-semibold text-muted-foreground">Título da Reclamação</label>
 <Input 
 className="mt-1 h-11 rounded-xl"
 placeholder="Resumo em poucas palavras..."
 value={title}
 onChange={(e) => setTitle(e.target.value)}
 required
 />
 </div>

 <div>
 <label className="text-xs font-semibold text-muted-foreground">Relato Detalhado dos Fatos</label>
 <Textarea 
 className="mt-1 rounded-xl resize-none text-sm"
 rows={4}
 placeholder="Descreva o que aconteceu, prejuízos sofridos e o que você solicita da empresa..."
 value={description}
 onChange={(e) => setDescription(e.target.value)}
 required
 />
 </div>

 {/* Integração Especial com JUS 360° */}
 <div className="p-4 rounded-2xl border border-primary/20 bg-primary/5 flex items-center justify-between gap-4">
 <div className="flex items-start gap-3">
 <Scale className="size-5 text-primary shrink-0 mt-0.5" />
 <div>
 <p className="text-sm font-bold text-foreground">Encaminhar para Assessoria Jurídica (JUS 360°)</p>
 <p className="text-xs text-muted-foreground mt-0.5">
 Se a empresa não responder ou o dano for grave, um advogado parceiro poderá assumir a demanda via mediação ou ação judicial.
 </p>
 </div>
 </div>
 <Switch 
 checked={legalAdviseNeeded}
 onCheckedChange={setLegalAdviseNeeded}
 />
 </div>

 <Button 
 type="submit" 
 disabled={isSubmitting}
 className="w-full h-13 rounded-2xl font-bold text-base shadow-xs shadow-primary/20 gap-2 min-h-[44px]"
 >
 {isSubmitting ? 'Registrando...' : 'Publicar Reclamação'}
 <ArrowRight className="size-4" />
 </Button>
 </form>
 </div>
 </div>
 );
}
