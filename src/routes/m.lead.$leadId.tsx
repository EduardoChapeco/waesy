import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import {
  Plane,
  Calendar,
  MapPin,
  CheckCircle2,
  ShieldCheck,
  Phone,
  User,
  HeartPulse,
  Send,
  AlertCircle,
  Plus,
  Trash2,
  Users,
  Zap,
  Info,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  getPublicLeadByToken,
  submitPublicLeadForm,
} from "@/services/crm.functions";

export const Route = createFileRoute("/m/lead/$leadId")({
  head: () => ({
    meta: [
      {
        title: "Preferências de Viagem & Acompanhantes | Central do Passageiro",
      },
    ],
  }),
  loader: async ({ params }: { params: { leadId: string } }) => {
    try {
      const leadData = await getPublicLeadByToken({
        data: { token: params.leadId },
      }).catch((err) => {
        return { error: err?.message || "Link inválido ou não encontrado." };
      });
      return { leadData };
    } catch (err) {
      console.error("[loader:m.lead.$leadId] Unhandled loader error:", err);
      return { leadData: { error: "Erro ao processar formulário." } };
    }
  },
  component: PublicLeadPassageirosPage,
});

interface PaxItem {
  full_name: string;
  document?: string;
  birth_date?: string;
  relationship: string;
  phone?: string;
  email?: string;
}

function PublicLeadPassageirosPage() {
  const { leadData } = (Route.useLoaderData as any)();

  const [paxList, setPaxList] = useState<PaxItem[]>(
    Array.isArray(leadData?.pax_list) ? leadData.pax_list : []
  );
  const [lgpdAccepted, setLgpdAccepted] = useState(
    Boolean(leadData?.lgpd_accepted)
  );
  const [healthNotes, setHealthNotes] = useState(
    leadData?.health_notes || ""
  );
  const [pcd, setPcd] = useState(Boolean(leadData?.pcd));
  const [reducedMobility, setReducedMobility] = useState(
    Boolean(leadData?.reduced_mobility)
  );
  const [autism, setAutism] = useState(Boolean(leadData?.autism));

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  // Modal de Adicionar Passageiro
  const [isPaxModalOpen, setIsPaxModalOpen] = useState(false);
  const [paxForm, setPaxForm] = useState<PaxItem>({
    full_name: "",
    document: "",
    birth_date: "",
    relationship: "spouse",
    phone: "",
    email: "",
  });

  if (!leadData || leadData.error) {
    return (
      <div className="min-h-screen bg-neutral-50 dark:bg-neutral-950 flex items-center justify-center p-4">
        <div className="max-w-md w-full p-8 rounded-3xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 text-center space-y-4 shadow-xs">
          <div className="size-14 rounded-2xl bg-rose-500/10 text-rose-600 flex items-center justify-center mx-auto">
            <AlertCircle className="size-7" />
          </div>
          <h1 className="text-xl font-bold text-foreground">
            Formulário Indisponível
          </h1>
          <p className="text-sm text-muted-foreground leading-relaxed">
            {leadData?.error ||
              "Este link de formulário não foi encontrado, expirou ou já foi finalizado."}
          </p>
          <div className="pt-2">
            <p className="text-xs text-muted-foreground">
              Por favor, entre em contato diretamente com o seu consultor de viagens para receber um novo link.
            </p>
          </div>
        </div>
      </div>
    );
  }

  const handleAddPax = () => {
    if (!paxForm.full_name.trim()) {
      toast.error("Informe o nome completo do passageiro.");
      return;
    }
    setPaxList((prev) => [...prev, { ...paxForm }]);
    setPaxForm({
      full_name: "",
      document: "",
      birth_date: "",
      relationship: "spouse",
      phone: "",
      email: "",
    });
    setIsPaxModalOpen(false);
    toast.success("Acompanhante adicionado à lista.");
  };

  const handleRemovePax = (index: number) => {
    setPaxList((prev) => prev.filter((_, i) => i !== index));
    toast.info("Acompanhante removido.");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!lgpdAccepted) {
      toast.error(
        "Por favor, autorize o tratamento dos dados conforme a LGPD para prosseguir."
      );
      return;
    }

    setIsSubmitting(true);
    try {
      const combinedNotes = [
        healthNotes.trim(),
        pcd ? "• Passageiro PCD" : null,
        reducedMobility ? "• Mobilidade Reduzida" : null,
        autism ? "• Condição no Espectro Autista (TEA)" : null,
      ]
        .filter(Boolean)
        .join("\n");

      await submitPublicLeadForm({
        data: {
          token: leadData.id,
          paxList,
          lgpdAccepted: true,
          healthNotes: combinedNotes || null,
        },
      });

      setIsSubmitted(true);
      toast.success("Dados enviados com sucesso!");
    } catch (err: any) {
      toast.error(err?.message || "Erro ao salvar dados. Tente novamente.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isSubmitted) {
    return (
      <div className="min-h-screen bg-neutral-50 dark:bg-neutral-950 flex items-center justify-center p-4">
        <div className="max-w-md w-full p-8 rounded-3xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 text-center space-y-5 shadow-xs animate-in fade-in zoom-in-95 duration-300">
          <div className="size-16 rounded-3xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center mx-auto border border-emerald-500/20 shadow-xs">
            <CheckCircle2 className="size-8" />
          </div>

          <div className="space-y-2">
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              Tudo Pronto, {leadData.full_name?.split(" ")[0]}!
            </h1>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Suas informações e a relação de acompanhantes foram enviadas com sucesso para a equipe da{" "}
              <strong className="text-foreground font-semibold">
                {leadData.store_name || "Agência de Viagens"}
              </strong>
              .
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-neutral-100 dark:bg-neutral-800/60 border border-neutral-200 dark:border-neutral-700/60 text-left space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Destino:</span>
              <span className="font-bold text-foreground">
                {leadData.destination || "A definir"}
              </span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Passageiros informados:</span>
              <Badge variant="outline" className="font-mono text-xs">
                {paxList.length} acompanhante(s)
              </Badge>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Termos LGPD:</span>
              <span className="text-emerald-600 font-bold flex items-center gap-1">
                <ShieldCheck className="size-3.5" /> Aceito
              </span>
            </div>
          </div>

          <p className="text-xs text-muted-foreground">
            Nosso consultor entrará em contato em breve via WhatsApp para apresentar o roteiro e as melhores opções de voo e hospedagem.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-neutral-950 text-foreground py-8 px-4 sm:px-6 lg:px-8 flex flex-col justify-between">
      <div className="max-w-2xl mx-auto w-full space-y-6">
        {/* Cabeçalho da Agência */}
        <header className="rounded-3xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 p-6 shadow-sm flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            {leadData.store_logo ? (
              <img
                src={leadData.store_logo}
                alt={leadData.store_name}
                className="h-12 w-12 rounded-2xl object-cover border border-neutral-200 dark:border-neutral-800 shrink-0"
              />
            ) : (
              <div className="h-12 w-12 rounded-2xl bg-primary/10 border border-primary/20 text-primary font-black flex items-center justify-center text-lg shrink-0">
                {leadData.store_name?.charAt(0).toUpperCase() || "J"}
              </div>
            )}
            <div className="min-w-0">
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                Central do Passageiro
              </span>
              <h1 className="text-base font-bold text-foreground truncate">
                {leadData.store_name || "Agência de Viagens"}
              </h1>
            </div>
          </div>

          <Badge variant="outline" className="text-[11px] font-medium py-1 px-2.5 rounded-full border-primary/30 text-primary bg-primary/5 shrink-0">
            Formulário Seguro
          </Badge>
        </header>

        {/* Card do Titular e Destino */}
        <div className="rounded-3xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 p-6 shadow-sm space-y-4">
          <div className="space-y-1">
            <span className="text-[10px] font-mono uppercase font-bold text-primary">
              Titular da Cotação
            </span>
            <h2 className="text-xl font-bold text-foreground">
              Olá, {leadData.full_name}!
            </h2>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Preencha abaixo os dados de quem vai viajar com você e quaisquer preferências especiais de saúde ou mobilidade para que possamos emitir os seguros e passagens com perfeição.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
            <div className="p-3.5 rounded-2xl bg-neutral-100/70 dark:bg-neutral-800/50 border border-neutral-200/60 dark:border-neutral-700/50 flex items-center gap-3">
              <div className="size-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                <MapPin className="size-4" />
              </div>
              <div className="min-w-0">
                <span className="text-[10px] uppercase font-semibold text-muted-foreground block">
                  Destino
                </span>
                <span className="text-xs font-bold text-foreground truncate block">
                  {leadData.destination || "Em definição"}
                </span>
              </div>
            </div>

            <div className="p-3.5 rounded-2xl bg-neutral-100/70 dark:bg-neutral-800/50 border border-neutral-200/60 dark:border-neutral-700/50 flex items-center gap-3">
              <div className="size-9 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center shrink-0">
                <Calendar className="size-4" />
              </div>
              <div className="min-w-0">
                <span className="text-[10px] uppercase font-semibold text-muted-foreground block">
                  Período Previsto
                </span>
                <span className="text-xs font-bold text-foreground truncate block">
                  {leadData.travel_start
                    ? `${new Date(leadData.travel_start).toLocaleDateString("pt-BR")} ${leadData.travel_end ? `a ${new Date(leadData.travel_end).toLocaleDateString("pt-BR")}` : ""}`
                    : leadData.interest_period || "A combinar"}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Formulário Principal */}
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Seção 1: Lista de Acompanhantes */}
          <div className="rounded-3xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-foreground flex items-center gap-2">
                  <Users className="size-4 text-primary" />
                  <span>Acompanhantes & Familiares</span>
                </h3>
                <p className="text-xs text-muted-foreground">
                  Quem viajará com você ({paxList.length} cadastrado(s))
                </p>
              </div>

              <Button
                type="button"
                size="sm"
                onClick={() => setIsPaxModalOpen(true)}
                className="rounded-2xl h-9 px-3 text-xs font-bold gap-1.5 shadow-xs bg-primary text-primary-foreground hover:bg-primary/90 cursor-pointer"
              >
                <Plus className="size-3.5" />
                <span>Adicionar</span>
              </Button>
            </div>

            {paxList.length === 0 ? (
              <div className="text-center py-8 px-4 rounded-2xl border border-dashed border-neutral-200 dark:border-neutral-800 space-y-2">
                <Users className="size-8 text-muted-foreground/40 mx-auto" />
                <p className="text-xs font-medium text-foreground">
                  Nenhum acompanhante cadastrado ainda
                </p>
                <p className="text-[11px] text-muted-foreground max-w-xs mx-auto">
                  Clique no botão acima para adicionar cônjuge, filhos, amigos ou parentes que irão viajar.
                </p>
              </div>
            ) : (
              <div className="space-y-2.5">
                {paxList.map((pax, index) => (
                  <div
                    key={index}
                    className="p-3.5 rounded-2xl bg-neutral-50 dark:bg-neutral-800/40 border border-neutral-200 dark:border-neutral-700/60 flex items-center justify-between gap-3"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="size-8 rounded-xl bg-primary/10 text-primary font-bold text-xs flex items-center justify-center shrink-0">
                        {pax.full_name.charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-foreground truncate">
                            {pax.full_name}
                          </span>
                          <Badge variant="outline" className="text-[9px] py-0 px-1.5 capitalize">
                            {pax.relationship === "spouse"
                              ? "Cônjuge"
                              : pax.relationship === "child"
                              ? "Filho(a)"
                              : pax.relationship === "parent"
                              ? "Pai/Mãe"
                              : pax.relationship === "friend"
                              ? "Amigo(a)"
                              : "Outro"}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-3 text-[11px] text-muted-foreground pt-0.5">
                          {pax.birth_date && (
                            <span>Nasc: {new Date(pax.birth_date).toLocaleDateString("pt-BR")}</span>
                          )}
                          {pax.document && <span>Doc: {pax.document}</span>}
                          {pax.phone && <span>Tel: {pax.phone}</span>}
                        </div>
                      </div>
                    </div>

                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => handleRemovePax(index)}
                      className="size-8 text-muted-foreground hover:text-rose-500 rounded-xl shrink-0"
                    >
                      <Trash2 className="size-3.5" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Seção 2: Saúde, Acessibilidade & Restrições */}
          <div className="rounded-3xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 p-6 shadow-sm space-y-4">
            <div>
              <h3 className="text-base font-bold text-foreground flex items-center gap-2">
                <HeartPulse className="size-4 text-rose-500" />
                <span>Acessibilidade & Cuidados Especiais</span>
              </h3>
              <p className="text-xs text-muted-foreground">
                Informações essenciais para reserva de assentos especiais, hotéis acessíveis e atendimento prioritário em aeroportos.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <label className="flex items-center gap-2.5 p-3 rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-800/40 cursor-pointer hover:border-primary/40 transition-colors">
                <Checkbox
                  checked={pcd}
                  onCheckedChange={(c) => setPcd(Boolean(c))}
                />
                <span className="text-xs font-semibold text-foreground">Passageiro PCD</span>
              </label>

              <label className="flex items-center gap-2.5 p-3 rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-800/40 cursor-pointer hover:border-primary/40 transition-colors">
                <Checkbox
                  checked={reducedMobility}
                  onCheckedChange={(c) => setReducedMobility(Boolean(c))}
                />
                <span className="text-xs font-semibold text-foreground">Mobilidade Reduzida</span>
              </label>

              <label className="flex items-center gap-2.5 p-3 rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-800/40 cursor-pointer hover:border-primary/40 transition-colors">
                <Checkbox
                  checked={autism}
                  onCheckedChange={(c) => setAutism(Boolean(c))}
                />
                <span className="text-xs font-semibold text-foreground">Espectro Autista (TEA)</span>
              </label>
            </div>

            <div className="space-y-1.5 pt-1">
              <Label className="text-xs font-semibold">
                Observações de Saúde, Alergias ou Preferências Alimentares
              </Label>
              <Textarea
                value={healthNotes}
                onChange={(e) => setHealthNotes(e.target.value)}
                placeholder="Ex: Alergia a frutos do mar, necessidade de cadeira de rodas para embarque no aeroporto, preferência por andar baixo no hotel..."
                className="text-xs rounded-2xl resize-none"
                rows={3}
              />
            </div>
          </div>

          {/* Seção 3: Termo LGPD & Consentimento */}
          <div className="rounded-3xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 p-6 shadow-sm space-y-3">
            <div className="flex items-center gap-2">
              <ShieldCheck className="size-4 text-emerald-600" />
              <h3 className="text-sm font-bold text-foreground">
                Termo de Proteção de Dados (LGPD)
              </h3>
            </div>

            <p className="text-[11px] text-muted-foreground leading-relaxed">
              Em cumprimento à Lei Geral de Proteção de Dados Pessoais (LGPD - Lei nº 13.709/2018), seus dados e os dos passageiros indicados serão utilizados estritamente para a finalidade de cotação de serviços turísticos, emissão de bilhetes e reservas junto a companhias aéreas, seguradoras e hotéis parceiros.
            </p>

            <label className="flex items-start gap-3 p-3.5 rounded-2xl bg-emerald-500/5 border border-emerald-500/20 cursor-pointer">
              <Checkbox
                checked={lgpdAccepted}
                onCheckedChange={(c) => setLgpdAccepted(Boolean(c))}
                className="mt-0.5"
              />
              <span className="text-xs font-medium text-foreground leading-tight">
                Autorizo a coleta e tratamento das informações acima exclusivamente para a montagem e contratação dos serviços da viagem.
              </span>
            </label>
          </div>

          {/* Botão de Envio Principal (Apple HIG - 44px min touch target) */}
          <div className="sticky bottom-4 pt-2">
            <Button
              type="submit"
              disabled={isSubmitting}
              className="w-full h-12 rounded-2xl text-sm font-bold shadow-xs bg-primary text-primary-foreground hover:bg-primary/90 cursor-pointer gap-2"
            >
              {isSubmitting ? (
                <span>Gravando e Enviando...</span>
              ) : (
                <>
                  <Send className="size-4" />
                  <span>Enviar Preferências à Agência</span>
                </>
              )}
            </Button>
          </div>
        </form>
      </div>

      {/* Modal para Adicionar Passageiro */}
      <Dialog open={isPaxModalOpen} onOpenChange={setIsPaxModalOpen}>
        <DialogContent className="sm:max-w-md rounded-3xl p-6">
          <DialogHeader>
            <DialogTitle className="text-base font-bold">
              Adicionar Passageiro / Acompanhante
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-3.5 py-2">
            <div className="space-y-1">
              <Label className="text-xs font-semibold">Nome Completo *</Label>
              <Input
                value={paxForm.full_name}
                onChange={(e) =>
                  setPaxForm((prev) => ({ ...prev, full_name: e.target.value }))
                }
                placeholder="Ex: Maria dos Santos Silva"
                className="h-9 text-xs rounded-xl"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs font-semibold">Grau de Parentesco</Label>
                <Select
                  value={paxForm.relationship}
                  onValueChange={(val) =>
                    setPaxForm((prev) => ({ ...prev, relationship: val }))
                  }
                >
                  <SelectTrigger className="h-9 text-xs rounded-xl">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl">
                    <SelectItem value="spouse" className="text-xs">Cônjuge</SelectItem>
                    <SelectItem value="child" className="text-xs">Filho(a)</SelectItem>
                    <SelectItem value="parent" className="text-xs">Pai / Mãe</SelectItem>
                    <SelectItem value="friend" className="text-xs">Amigo(a)</SelectItem>
                    <SelectItem value="other" className="text-xs">Outro</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-semibold">Data de Nascimento</Label>
                <Input
                  type="date"
                  value={paxForm.birth_date}
                  onChange={(e) =>
                    setPaxForm((prev) => ({ ...prev, birth_date: e.target.value }))
                  }
                  className="h-9 text-xs rounded-xl"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs font-semibold">CPF ou Passaporte</Label>
                <Input
                  value={paxForm.document}
                  onChange={(e) =>
                    setPaxForm((prev) => ({ ...prev, document: e.target.value }))
                  }
                  placeholder="000.000.000-00"
                  className="h-9 text-xs rounded-xl"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-semibold">Telefone / WhatsApp</Label>
                <Input
                  value={paxForm.phone}
                  onChange={(e) =>
                    setPaxForm((prev) => ({ ...prev, phone: e.target.value }))
                  }
                  placeholder="(00) 00000-0000"
                  className="h-9 text-xs rounded-xl"
                />
              </div>
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsPaxModalOpen(false)}
              className="rounded-xl text-xs font-semibold"
            >
              Cancelar
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={handleAddPax}
              className="rounded-xl text-xs font-bold bg-primary text-primary-foreground"
            >
              Adicionar à Lista
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Rodapé institucional silencioso */}
      <footer className="mt-8 text-center text-[11px] text-muted-foreground/60 py-4">
        Plataforma Segura Waesy · Criptografia de ponta a ponta
      </footer>
    </div>
  );
}
