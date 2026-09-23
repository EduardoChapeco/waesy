import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useState } from 'react';
import { 
 Building2, 
 FileText, 
 Mail, 
 Phone, 
 Globe, 
 Instagram, 
 CheckCircle2, 
 ShieldCheck, 
 ArrowRight,
 Send,
 Lock
} from 'lucide-react';
import { submitClaimProfile, getEntityForClaim } from '@/services/claim-intelligence.functions';
import type { ProofType, EntityType } from '@/types/claim-intelligence';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';

export const Route = createFileRoute('/claim/reivindicar/$entityId')({
 head: ({ loaderData }: any) => ({
   meta: [{ title: `Reivindicar ${loaderData?.entity?.name || "Empresa"} | Waesy Trust` }],
 }),
 loader: async ({ params }) => {
   try {
     const entity = await getEntityForClaim({ data: { entityId: params.entityId } });
     return { entity };
   } catch {
     return { entity: null };
   }
 },
 component: ClaimReivindicarPage,
});

const PROOF_OPTIONS: { type: ProofType; label: string; desc: string; icon: any }[] = [
 { type: 'email_domain', label: 'E-mail Corporativo', desc: 'Comprove usando o e-mail do domínio oficial da empresa', icon: Mail },
 { type: 'document', label: 'Contrato Social / CNPJ', desc: 'Envio de cartão CNPJ ou ato constitutivo autenticado', icon: FileText },
 { type: 'phone', label: 'Telefone Comercial', desc: 'Validação por SMS ou ligação na linha corporativa', icon: Phone },
 { type: 'social_media', label: 'Rede Social Oficial', desc: 'Verificação através de perfil social oficial verificado', icon: Instagram },
 { type: 'other', label: 'Outro Método', desc: 'Apresente documentação complementar personalizada', icon: Globe },
];

function ClaimReivindicarPage() {
 const { entityId } = Route.useParams();
 const { entity } = (Route.useLoaderData() as any) || {};
 const navigate = useNavigate();

 const [proofType, setProofType] = useState<ProofType>('document');
 const [requesterName, setRequesterName] = useState('');
 const [requesterEmail, setRequesterEmail] = useState('');
 const [requesterDocument, setRequesterDocument] = useState('');
 const [proofValue, setProofValue] = useState('');
 const [notes, setNotes] = useState('');
 const [isSubmitting, setIsSubmitting] = useState(false);
 const [isSubmitted, setIsSubmitted] = useState(false);

 async function handleSubmit(e: React.FormEvent) {
 e.preventDefault();
 if (!requesterName || !requesterEmail) {
 toast.error('Preencha seu nome e e-mail de contato corporativo.');
 return;
 }

 setIsSubmitting(true);
 try {
 await submitClaimProfile({
 data: {
 storeId: entity?.type === 'store' ? entity.id : '00000000-0000-0000-0000-000000000000',
 entityId,
 entityType: entity?.type || 'company',
 requesterName,
 requesterEmail,
 requesterDocument,
 proofType,
 proofData: { proof_value: proofValue },
 additionalNotes: notes,
 }
 });
 setIsSubmitted(true);
 toast.success('Solicitação de reivindicação enviada com sucesso!');
 } catch (err: any) {
 toast.error('Erro ao enviar solicitação: ' + err.message);
 } finally {
 setIsSubmitting(false);
 }
 }

  if (isSubmitted) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="max-w-md w-full p-6 sm:p-8 rounded-2xl border border-border/80 bg-card shadow-xs text-center flex flex-col items-center">
          <div className="size-14 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mb-4">
            <CheckCircle2 className="size-7" />
          </div>
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">Solicitação em Auditoria</h2>
          <p className="text-xs sm:text-sm text-muted-foreground mt-2 leading-relaxed">
            Seu pedido de titularidade sobre o perfil foi recebido com sucesso. Nossa equipe e motores de compliance analisarão os dados em até 24 horas úteis.
          </p>
          <div className="w-full mt-5 p-3.5 rounded-xl bg-muted/40 text-left text-xs space-y-1">
            <p className="text-muted-foreground">E-mail de confirmação enviado para:</p>
            <p className="font-semibold text-foreground break-all">{requesterEmail}</p>
          </div>
          <Button 
            className="w-full mt-6 h-11 rounded-xl font-semibold text-sm cursor-pointer shadow-xs"
            onClick={() => navigate({ to: '/claim/reputacao/$entityId', params: { entityId } })}
          >
            Ver Reputação Pública do Perfil
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground py-8 sm:py-12 px-3 sm:px-6">
      <div className="max-w-3xl mx-auto">
        <div className="text-center mb-8">
          <Badge variant="outline" className="px-3 py-1 mb-3 rounded-full text-xs font-semibold gap-1.5 border-primary/30 text-primary">
            <ShieldCheck className="size-3.5" /> Waesy Trust & Compliance
          </Badge>
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-black tracking-tight">
            Reivindicar {entity?.name || 'Perfil Comercial'}
          </h1>
          <p className="text-muted-foreground mt-2 text-xs sm:text-sm max-w-lg mx-auto">
            {entity?.city && entity?.state ? `${entity.city} - ${entity.state} • ` : ''}
            Comprove a administração ou titularidade desta empresa para gerenciar sua reputação pública, responder avaliações de clientes e acessar inteligência de mercado.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="p-4 sm:p-8 rounded-xl sm:rounded-2xl border border-border/70 bg-card shadow-2xs space-y-6">
          <div className="space-y-4">
            <h2 className="text-base sm:text-lg font-bold flex items-center gap-2">
              <Building2 className="size-5 text-primary" /> 1. Seus Dados de Administrador
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-semibold text-muted-foreground">Seu Nome Completo</label>
                <Input 
                  className="mt-1 h-11 rounded-xl text-xs sm:text-sm"
                  placeholder="Ex: Carlos Drummond de Andrade"
                  value={requesterName}
                  onChange={(e) => setRequesterName(e.target.value)}
                  required
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-muted-foreground">E-mail Corporativo</label>
                <Input 
                  type="email"
                  className="mt-1 h-11 rounded-xl text-xs sm:text-sm"
                  placeholder="diretoria@empresa.com.br"
                  value={requesterEmail}
                  onChange={(e) => setRequesterEmail(e.target.value)}
                  required
                />
              </div>
              <div className="sm:col-span-2">
                <label className="text-xs font-semibold text-muted-foreground">CPF do Representante / CNPJ da Empresa</label>
                <Input 
                  className="mt-1 h-11 rounded-xl text-xs sm:text-sm"
                  placeholder="00.000.000/0001-00"
                  value={requesterDocument}
                  onChange={(e) => setRequesterDocument(e.target.value)}
                />
              </div>
            </div>
          </div>

          <div className="space-y-4 pt-4 border-t border-border/60">
            <h2 className="text-base sm:text-lg font-bold flex items-center gap-2">
              <Lock className="size-5 text-primary" /> 2. Método de Validação de Propriedade
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {PROOF_OPTIONS.map((opt) => {
                const Icon = opt.icon;
                const isSelected = proofType === opt.type;
                return (
                  <button
                    key={opt.type}
                    type="button"
                    onClick={() => setProofType(opt.type)}
                    className={`p-3.5 sm:p-4 rounded-xl border text-left flex items-start gap-3 transition-all min-h-[44px] cursor-pointer ${
                      isSelected 
                        ? 'border-primary bg-primary/10 shadow-xs ring-1 ring-primary' 
                        : 'border-border/70 bg-card hover:bg-muted/30'
                    }`}
                  >
                    <Icon className={`size-5 shrink-0 mt-0.5 ${isSelected ? 'text-primary' : 'text-muted-foreground'}`} />
                    <div>
                      <p className="text-xs sm:text-sm font-semibold text-foreground">{opt.label}</p>
                      <p className="text-[11px] text-muted-foreground mt-0.5 leading-snug">{opt.desc}</p>
                    </div>
                  </button>
                );
              })}
            </div>

            <div>
              <label className="text-xs font-semibold text-muted-foreground">
                {proofType === 'email_domain' ? 'Endereço de e-mail corporativo para envio do link' :
                proofType === 'document' ? 'Número de registro do contrato ou link do documento' :
                proofType === 'phone' ? 'Número de telefone comercial com DDD' :
                proofType === 'social_media' ? 'URL do perfil ou @handle oficial' : 'Descrição da prova apresentada'}
              </label>
              <Input 
                className="mt-1 h-11 rounded-xl text-xs sm:text-sm"
                placeholder="Insira o dado de comprovação..."
                value={proofValue}
                onChange={(e) => setProofValue(e.target.value)}
                required
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-muted-foreground">Observações Adicionais (Opcional)</label>
              <Textarea 
                className="mt-1 rounded-xl resize-none text-xs sm:text-sm"
                rows={3}
                placeholder="Detalhes sobre a representação legal, procurações ou contexto da empresa..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>
          </div>

          <Button 
            type="submit" 
            disabled={isSubmitting}
            className="w-full h-11 sm:h-12 rounded-xl font-semibold text-sm cursor-pointer shadow-xs gap-2 min-h-[44px]"
          >
            {isSubmitting ? 'Enviando Comprovação...' : 'Confirmar Reivindicação'}
            <ArrowRight className="size-4" />
          </Button>
        </form>
      </div>
    </div>
  );
}
