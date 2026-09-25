import { createFileRoute } from '@tanstack/react-router';
import { useState } from 'react';
import { CheckCircle2, Globe, User, Phone, ShieldCheck, HeartPulse, Send, AlertCircle, Building2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import {
  getTravelerFormContext,
  submitTravelerRegistrationForm,
  type TravelerFormContextDTO,
} from '@/services/travel-lifecycle.functions';

export const Route = createFileRoute('/viajante/$token')({
  head: ({ loaderData }: any) => ({
    meta: [
      {
        title: loaderData?.context?.agencyName
          ? `Ficha Cadastral | ${loaderData.context.agencyName}`
          : 'Ficha Cadastral do Passageiro | TravelOS',
      },
    ],
  }),
  loader: async ({ params }) => {
    try {
      const context = await getTravelerFormContext({ data: { token: params.token } });
      return { context };
    } catch (err) {
      console.warn('[loader:viajante.$token] Notice:', err);
      return {
        context: {
          success: true,
          tripTitle: 'Ficha do Viajante',
          destination: 'Destino da Viagem',
          departureDate: null,
          returnDate: null,
          agencyName: 'Agência de Viagens',
          agencyLogo: null,
          agencyPhone: null,
          tokenType: 'generic' as const,
        },
      };
    }
  },
  component: PublicTravelerFormPage,
});

function PublicTravelerFormPage() {
  const { token } = Route.useParams();
  const loaderData = Route.useLoaderData() as any;
  const context = loaderData?.context;

  const [step, setStep] = useState(1);
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  // Form states pre-filled if available from context
  const [fullName, setFullName] = useState(context?.passengerData?.fullName || '');
  const [cpf, setCpf] = useState(context?.passengerData?.cpf || '');
  const [rg, setRg] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [gender, setGender] = useState('Outro');
  const [passportNumber, setPassportNumber] = useState('');
  const [passportExpiry, setPassportExpiry] = useState('');
  const [phone, setPhone] = useState(context?.passengerData?.phone || '');
  const [email, setEmail] = useState(context?.passengerData?.email || '');
  const [emergencyName, setEmergencyName] = useState('');
  const [emergencyPhone, setEmergencyPhone] = useState('');
  const [seatPreference, setSeatPreference] = useState('Janela');
  const [specialNeeds, setSpecialNeeds] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim() || !cpf.trim() || !phone.trim()) {
      toast.error('Preencha os campos obrigatórios (Nome, CPF e Telefone).');
      return;
    }

    setLoading(true);
    try {
      const res = await submitTravelerRegistrationForm({
        data: {
          token,
          fullName: fullName.trim(),
          cpf: cpf.trim(),
          rg: rg.trim() || null,
          birthDate: birthDate || null,
          gender: gender || null,
          passportNumber: passportNumber.trim() || null,
          passportExpiry: passportExpiry || null,
          phone: phone.trim(),
          email: email.trim() || null,
          emergencyName: emergencyName.trim() || null,
          emergencyPhone: emergencyPhone.trim() || null,
          seatPreference: seatPreference || null,
          specialNeeds: specialNeeds.trim() || null,
        },
      });

      if (res.success) {
        setSubmitted(true);
        toast.success(res.message || 'Ficha cadastral enviada com sucesso para a agência!');
      }
    } catch (err: any) {
      toast.error('Erro ao enviar ficha: ' + (err?.message || 'Falha na conexão'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-50 flex flex-col items-center justify-center p-4 selection:bg-primary selection:text-primary-foreground font-sans">
      <div className="w-full max-w-xl bg-slate-900 border border-slate-800 rounded-2xl p-6 sm:p-8 shadow-xs space-y-6">
        {/* Header com Identidade da Agência */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            {context?.agencyLogo ? (
              <img
                src={context.agencyLogo}
                alt={context.agencyName}
                className="h-8 max-w-[120px] object-contain rounded-md"
              />
            ) : (
              <div className="size-9 rounded-xl bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-sky-400">
                <Building2 className="size-4" />
              </div>
            )}
            <div>
              <span className="text-[10px] font-mono uppercase tracking-widest text-sky-400 font-bold block">
                {context?.agencyName || 'Agência Credenciada'}
              </span>
              <p className="text-xs text-slate-300 font-medium truncate max-w-[280px]">
                {context?.tripTitle}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-[10px] font-bold text-emerald-400">
            <ShieldCheck className="size-3" />
            <span>Link Seguro</span>
          </div>
        </div>

        {submitted ? (
          <div className="py-12 text-center space-y-4">
            <div className="w-16 h-16 rounded-full bg-emerald-500/10 text-emerald-400 flex items-center justify-center mx-auto">
              <CheckCircle2 className="size-8" />
            </div>
            <h2 className="text-2xl font-black text-white">Ficha Confirmada & Registrada!</h2>
            <p className="text-xs text-slate-400 max-w-sm mx-auto leading-relaxed">
              Obrigado, <strong className="text-white">{fullName}</strong>! Seus dados e documentos foram recebidos e vinculados com segurança pela agência <strong className="text-white">{context?.agencyName}</strong> para emissão de passagens, voucher e seguro viagem.
            </p>
            <div className="pt-2">
              <span className="px-3 py-1 rounded-full bg-slate-800 text-[10px] font-mono text-slate-400">
                Token: {token}
              </span>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-lg font-black text-white">Identificação & Documentação</h1>
                <p className="text-xs text-slate-400">Preencha com atenção conforme seus documentos oficiais.</p>
              </div>
              <span className="text-xs font-mono text-slate-500">Passo {step} de 3</span>
            </div>

            {step === 1 && (
              <div className="space-y-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-300">Nome Completo (Conforme RG/Passaporte) *</label>
                  <Input value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Ex: Lucas Gabriel Oliveira" className="bg-slate-950 border-slate-800 text-xs rounded-xl" autoFocus />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-300">CPF *</label>
                    <Input value={cpf} onChange={(e) => setCpf(e.target.value)} placeholder="000.000.000-00" className="bg-slate-950 border-slate-800 text-xs rounded-xl font-mono" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-300">RG / Órgão Emissor</label>
                    <Input value={rg} onChange={(e) => setRg(e.target.value)} placeholder="1234567 SSP/SC" className="bg-slate-950 border-slate-800 text-xs rounded-xl font-mono" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-300">Data de Nascimento</label>
                    <Input type="date" value={birthDate} onChange={(e) => setBirthDate(e.target.value)} className="bg-slate-950 border-slate-800 text-xs rounded-xl" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-300">Gênero</label>
                    <select value={gender} onChange={(e) => setGender(e.target.value)} className="w-full h-10 px-3 rounded-xl border border-slate-800 bg-slate-950 text-xs text-slate-300">
                      <option value="Masculino">Masculino</option>
                      <option value="Feminino">Feminino</option>
                      <option value="Outro">Outro</option>
                    </select>
                  </div>
                </div>
              </div>
            )}

            {step === 2 && (
              <div className="space-y-4">
                <div className="p-3.5 rounded-2xl bg-sky-950/40 border border-sky-800/40 text-xs text-sky-300 flex items-center gap-2.5">
                  <Globe className="size-4 shrink-0 text-sky-400" />
                  <span>Para viagens internacionais, informe o passaporte com validade superior a 6 meses.</span>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-300">Nº do Passaporte</label>
                    <Input value={passportNumber} onChange={(e) => setPassportNumber(e.target.value)} placeholder="Ex: FY123456" className="bg-slate-950 border-slate-800 text-xs rounded-xl uppercase font-mono" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-300">Validade do Passaporte</label>
                    <Input type="date" value={passportExpiry} onChange={(e) => setPassportExpiry(e.target.value)} className="bg-slate-950 border-slate-800 text-xs rounded-xl" />
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-300">Preferência de Assento no Voo</label>
                  <select value={seatPreference} onChange={(e) => setSeatPreference(e.target.value)} className="w-full h-10 px-3 rounded-xl border border-slate-800 bg-slate-950 text-xs text-slate-300">
                    <option value="Janela">Janela</option>
                    <option value="Corredor">Corredor</option>
                    <option value="Meio">Meio / Sem Preferência</option>
                  </select>
                </div>
              </div>
            )}

            {step === 3 && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-300">WhatsApp *</label>
                    <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="(49) 99999-9999" className="bg-slate-950 border-slate-800 text-xs rounded-xl font-mono" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-300">E-mail</label>
                    <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="seu@email.com" className="bg-slate-950 border-slate-800 text-xs rounded-xl" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-300">Contato de Emergência (Nome)</label>
                    <Input value={emergencyName} onChange={(e) => setEmergencyName(e.target.value)} placeholder="Ex: Pai, Mãe, Cônjuge" className="bg-slate-950 border-slate-800 text-xs rounded-xl" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-300">Telefone de Emergência</label>
                    <Input value={emergencyPhone} onChange={(e) => setEmergencyPhone(e.target.value)} placeholder="(00) 00000-0000" className="bg-slate-950 border-slate-800 text-xs rounded-xl font-mono" />
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-300">Restrições Alimentares / Saúde</label>
                  <Textarea value={specialNeeds} onChange={(e) => setSpecialNeeds(e.target.value)} placeholder="Ex: Alergia a frutos do mar, vegetariano, necessidade de cadeira de rodas..." rows={2} className="bg-slate-950 border-slate-800 text-xs rounded-xl" />
                </div>
              </div>
            )}

            <div className="flex items-center justify-between pt-4 border-t border-slate-800">
              {step > 1 ? (
                <Button type="button" variant="outline" onClick={() => setStep(step - 1)} className="rounded-xl border-slate-800 text-xs">
                  Voltar
                </Button>
              ) : <div />}

              {step < 3 ? (
                <Button type="button" onClick={() => setStep(step + 1)} className="rounded-xl bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold text-xs px-5">
                  Continuar
                </Button>
              ) : (
                <Button type="submit" disabled={loading} className="rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs px-6 shadow-xs">
                  {loading ? 'Enviando & Registrando...' : 'Finalizar & Enviar Ficha'}
                </Button>
              )}
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
