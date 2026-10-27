import React, { useState, useEffect } from "react";
import { FileText, Copy, Check, Share2, QrCode, Bus, ExternalLink } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { generatePassengerMagicLink } from "@/services/group-tour-tokens.functions";
import { getStoreOnboardingForms } from "@/services/lead-forms.functions";

interface GenerateMagicLinkModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  storeId: string;
  tourId: string;
  seatNumber?: number | null;
  initialPassengerName?: string;
  initialPassengerPhone?: string;
}

export function GenerateMagicLinkModal({
  open,
  onOpenChange,
  storeId,
  tourId,
  seatNumber,
  initialPassengerName = "",
  initialPassengerPhone = "",
}: GenerateMagicLinkModalProps) {
  const [formMode, setFormMode] = useState<"seat_token" | "store_form">("seat_token");
  const [passengerName, setPassengerName] = useState(initialPassengerName);
  const [passengerPhone, setPassengerPhone] = useState(initialPassengerPhone);
  const [generatedUrl, setGeneratedUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(false);

  // Formulários de Onboarding da Loja
  const [storeForms, setStoreForms] = useState<any[]>([]);
  const [selectedFormSlug, setSelectedFormSlug] = useState<string>("");

  useEffect(() => {
    if (open && storeId) {
      getStoreOnboardingForms({ data: { storeId } })
        .then((res) => {
          if (res?.availableForms) {
            setStoreForms(res.availableForms);
            if (res.defaultForm?.slug) {
              setSelectedFormSlug(res.defaultForm.slug);
            } else if (res.availableForms.length > 0) {
              setSelectedFormSlug(res.availableForms[0].slug);
            }
          }
        })
        .catch(() => {});
    }
  }, [open, storeId]);

  const origin = typeof window !== "undefined" ? window.location.origin : "";

  const handleGenerateSeatForm = async () => {
    try {
      setLoading(true);
      const res = await generatePassengerMagicLink({
        data: {
          store_id: storeId,
          tour_id: tourId,
          passenger_seat_number: seatNumber || null,
          passenger_name: passengerName || null,
          passenger_phone: passengerPhone || null,
        },
      });

      const url = `${origin}/m/excursao/${res.token}`;
      setGeneratedUrl(url);
      toast.success("Link do formulário de passageiro gerado!");
    } catch (err: any) {
      toast.error(err?.message || "Erro ao gerar link de formulário de passageiro.");
    } finally {
      setLoading(false);
    }
  };

  const currentStoreFormUrl = selectedFormSlug
    ? `${origin}/f/${selectedFormSlug}?source=excursao&tour_id=${tourId}${seatNumber ? `&seat=${seatNumber}` : ""}`
    : "";

  const handleCopy = (text: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopied(true);
    toast.success("Link copiado para a área de transferência!");
    setTimeout(() => setCopied(false), 2000);
  };

  const handleWhatsApp = (text: string) => {
    if (!text) return;
    const msg = encodeURIComponent(
      `Olá! Segue o formulário oficial para preenchimento dos dados do passageiro e termos de viagem: ${text}`
    );
    const cleanPhone = passengerPhone.replace(/\D/g, "");
    if (cleanPhone) {
      window.open(`https://wa.me/${cleanPhone}?text=${msg}`, "_blank");
    } else {
      window.open(`https://wa.me/?text=${msg}`, "_blank");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg rounded-lg border-border/80 bg-card p-5 space-y-4">
        <DialogHeader>
          <DialogTitle className="text-sm sm:text-base font-bold text-foreground flex items-center gap-2">
            <FileText className="size-4 text-primary shrink-0" />
            <span>Formulário de Inscrição & Onboarding de Passageiro</span>
            {seatNumber && (
              <Badge variant="outline" className="font-mono text-xs ml-auto">
                Poltrona #{seatNumber}
              </Badge>
            )}
          </DialogTitle>
        </DialogHeader>

        <Tabs value={formMode} onValueChange={(v) => setFormMode(v as any)} className="space-y-4">
          <TabsList className="grid grid-cols-2 h-11 p-1 rounded-lg">
            <TabsTrigger value="seat_token" className="h-9 text-xs rounded-lg font-bold gap-1 cursor-pointer">
              <Bus className="size-3.5" />
              <span>Inscrição da Poltrona</span>
            </TabsTrigger>
            <TabsTrigger value="store_form" className="h-9 text-xs rounded-lg font-bold gap-1 cursor-pointer">
              <FileText className="size-3.5" />
              <span>Template de Formulário</span>
            </TabsTrigger>
          </TabsList>

          {/* MODO 1: LINK DEDICADO DE POLTRONA COM AUTO-PREENCHIMENTO */}
          <TabsContent value="seat_token" className="space-y-4">
            {!generatedUrl ? (
              <div className="space-y-3">
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Gere um formulário direto de cadastro para o passageiro preencher CPF, RG, data de nascimento, contato de emergência e aceitar os termos de transporte. Ao preencher, a poltrona é vinculada automaticamente.
                </p>

                <div className="space-y-2">
                  <label className="text-xs font-semibold text-foreground">
                    Nome do Passageiro (opcional)
                  </label>
                  <Input
                    value={passengerName}
                    onChange={(e) => setPassengerName(e.target.value)}
                    placeholder="Ex: Maria dos Santos"
                    className="h-11 text-xs rounded-lg"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-semibold text-foreground">
                    WhatsApp / Celular (opcional)
                  </label>
                  <Input
                    value={passengerPhone}
                    onChange={(e) => setPassengerPhone(e.target.value)}
                    placeholder="Ex: 49999999999"
                    className="h-11 text-xs rounded-lg font-mono"
                  />
                </div>

                <DialogFooter className="pt-2">
                  <Button
                    type="button"
                    onClick={handleGenerateSeatForm}
                    disabled={loading}
                    className="w-full h-11 min-h-11 rounded-lg text-xs font-bold gap-2 cursor-pointer focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <FileText className="size-3.5" />
                    <span>{loading ? "Gerando..." : "Gerar Formulário de Inscrição"}</span>
                  </Button>
                </DialogFooter>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="p-4 rounded-lg bg-muted/20 border border-border/60 space-y-2">
                  <span className="text-xs font-mono text-muted-foreground">
                    Link do Formulário de Inscrição
                  </span>
                  <Input
                    readOnly
                    value={generatedUrl}
                    className="h-10 text-xs rounded-lg font-mono bg-background select-all"
                  />
                </div>

                <div className="flex flex-col sm:flex-row items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => handleCopy(generatedUrl)}
                    className="w-full sm:w-1/2 h-11 min-h-11 rounded-lg text-xs font-semibold gap-2 cursor-pointer focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    {copied ? <Check className="size-3.5 text-emerald-600" /> : <Copy className="size-3.5" />}
                    <span>{copied ? "Copiado!" : "Copiar Link"}</span>
                  </Button>

                  <Button
                    type="button"
                    onClick={() => handleWhatsApp(generatedUrl)}
                    className="w-full sm:w-1/2 h-11 min-h-11 rounded-lg text-xs font-semibold gap-2 cursor-pointer bg-emerald-600 hover:bg-emerald-700 text-primary-foreground focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <Share2 className="size-3.5" />
                    <span>Enviar no WhatsApp</span>
                  </Button>
                </div>
              </div>
            )}
          </TabsContent>

          {/* MODO 2: FORMULÁRIOS DA AGÊNCIA (MÓDULO DE FORMULÁRIOS) */}
          <TabsContent value="store_form" className="space-y-4">
            <div className="space-y-3">
              <p className="text-xs text-muted-foreground leading-relaxed">
                Utilize os formulários dinâmicos customizados no módulo de Formulários de Onboarding da sua agência. As respostas sincronizam com o Lead CRM e Ficha 360°.
              </p>

              {storeForms.length > 0 ? (
                <div className="space-y-3">
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-foreground">
                      Selecione o Template de Formulário:
                    </label>
                    <select
                      value={selectedFormSlug}
                      onChange={(e) => setSelectedFormSlug(e.target.value)}
                      className="w-full h-11 rounded-lg border border-border bg-background px-3 text-xs focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      {storeForms.map((f) => (
                        <option key={f.id} value={f.slug}>
                          {f.title} ({f.niche_id || "Geral"})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="p-4 rounded-lg bg-muted/20 border border-border/60 space-y-2">
                    <span className="text-xs font-mono text-muted-foreground">
                      Link do Template Selecionado
                    </span>
                    <Input
                      readOnly
                      value={currentStoreFormUrl}
                      className="h-10 text-xs rounded-lg font-mono bg-background select-all"
                    />
                  </div>

                  <div className="flex flex-col sm:flex-row items-center gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => handleCopy(currentStoreFormUrl)}
                      className="w-full sm:w-1/2 h-11 min-h-11 rounded-lg text-xs font-semibold gap-2 cursor-pointer focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      {copied ? <Check className="size-3.5 text-emerald-600" /> : <Copy className="size-3.5" />}
                      <span>{copied ? "Copiado!" : "Copiar Link"}</span>
                    </Button>

                    <Button
                      type="button"
                      onClick={() => handleWhatsApp(currentStoreFormUrl)}
                      className="w-full sm:w-1/2 h-11 min-h-11 rounded-lg text-xs font-semibold gap-2 cursor-pointer bg-emerald-600 hover:bg-emerald-700 text-primary-foreground focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      <Share2 className="size-3.5" />
                      <span>Enviar no WhatsApp</span>
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="p-4 rounded-lg border border-dashed border-border text-center space-y-2">
                  <p className="text-xs text-muted-foreground">
                    Nenhum formulário ativo configurado no módulo de marketing.
                  </p>
                  <Button asChild variant="outline" className="h-11 min-h-11 px-4 text-xs font-semibold rounded-lg">
                    <a href="/workspace/marketing/formularios" target="_blank" rel="noreferrer" className="flex items-center gap-2">
                      <ExternalLink className="size-3.5" />
                      <span>Criar Formulário de Onboarding</span>
                    </a>
                  </Button>
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}

export { GenerateMagicLinkModal as PassengerOnboardingModal };
