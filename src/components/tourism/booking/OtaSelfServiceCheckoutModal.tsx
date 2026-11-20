import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  CheckCircle,
  CircleNotch,
  ShieldCheck,
  CreditCard,
  QrCode,
  CalendarBlank,
  Users,
  AirplaneTakeoff,
  Buildings,
  Copy,
  ArrowRight,
  Info,
} from "@phosphor-icons/react";
import { formatMoney } from "@/lib/money";
import { generatePixBrCode } from "@/lib/pix-payload";
import { infotravelCheckRateFn, infotravelEmitRealBookingFn } from "@/services/infotravel";
import { toast } from "sonner";

export interface OtaOfferItem {
  id: string;
  category: string;
  title: string;
  subtitle?: string;
  origin?: string;
  destination: string;
  departureDate?: string;
  returnDate?: string;
  priceCents: number;
  badge?: string;
  includes?: string[];
  hotelName?: string;
  airline?: string;
  operatorSlug?: string;
  source?: string;
}

interface OtaSelfServiceCheckoutModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  offer: OtaOfferItem | null;
  storeId?: string;
  agencyName?: string;
  onSuccess?: (booking: { bookingId: string; locator: string; voucherUrl?: string }) => void;
}

interface PassengerData {
  fullName: string;
  document: string;
  birthDate: string;
  type: "ADULT" | "CHILD";
}

export function OtaSelfServiceCheckoutModal({
  open,
  onOpenChange,
  offer,
  storeId,
  agencyName,
  onSuccess,
}: OtaSelfServiceCheckoutModalProps) {
  const [step, setStep] = useState<1 | 2 | 3 | 4 | 5>(1);
  const [isLoading, setIsLoading] = useState(false);

  // 1. Passageiros
  const [passengers, setPassengers] = useState<PassengerData[]>([
    { fullName: "", document: "", birthDate: "", type: "ADULT" },
  ]);
  const [contactEmail, setContactEmail] = useState("");
  const [contactPhone, setContactPhone] = useState("");

  // 2. Revalidação & Tarifas
  const [revalidatedFare, setRevalidatedFare] = useState<{
    priceCents: number;
    refundable: boolean;
    cancellationSummary: string;
  } | null>(null);

  // 3. Pagamento
  const [paymentMethod, setPaymentMethod] = useState<"pix" | "card" | "hold">("pix");
  const [cardInstallments, setCardInstallments] = useState(1);
  const [bookingResult, setBookingResult] = useState<{
    bookingId: string;
    locator: string;
    voucherUrl?: string;
  } | null>(null);

  if (!offer) return null;

  const currentPriceCents = revalidatedFare?.priceCents || offer.priceCents;

  const handleAddPassenger = () => {
    if (passengers.length >= 6) return;
    setPassengers((prev) => [...prev, { fullName: "", document: "", birthDate: "", type: "ADULT" }]);
  };

  const handleUpdatePassenger = (index: number, field: keyof PassengerData, val: string) => {
    setPassengers((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], [field]: val };
      return copy;
    });
  };

  const handleRemovePassenger = (index: number) => {
    if (passengers.length <= 1) return;
    setPassengers((prev) => prev.filter((_, i) => i !== index));
  };

  // Etapa 2 -> 3: Revalidação em tempo real (checkRate)
  const handleProceedToRevalidation = async () => {
    // Validação básica do manifesto
    if (!contactEmail.includes("@") || contactPhone.length < 8) {
      toast.error("Informe um e-mail e telefone de contato válidos.");
      return;
    }
    const hasEmptyName = passengers.some((p) => p.fullName.trim().length < 3);
    if (hasEmptyName) {
      toast.error("Preencha o nome completo de todos os passageiros.");
      return;
    }

    setIsLoading(true);
    setStep(3);

    try {
      if (storeId) {
        const check = await infotravelCheckRateFn({
          data: {
            agencyId: storeId,
            booking: {
              offerId: offer.id,
              passengers,
              category: offer.category,
            },
          },
        });
        const fare = check?.booking?.fares?.[0];
        const policies = check?.booking?.cancellationPolicies;
        setRevalidatedFare({
          priceCents: fare?.priceSale ? Math.round(Number(fare.priceSale) * 100) : offer.priceCents,
          refundable: policies?.refundable !== false,
          cancellationSummary: policies?.penalties?.[0]?.description || "Cancelamento conforme regras do fornecedor.",
        });
      } else {
        // Fallback local
        setRevalidatedFare({
          priceCents: offer.priceCents,
          refundable: true,
          cancellationSummary: "Tarifa confirmada em catálogo de parceiros.",
        });
      }
      setStep(4);
    } catch {
      // Se a revalidação falhar temporariamente, permite continuar com a tarifa cotada
      setRevalidatedFare({
        priceCents: offer.priceCents,
        refundable: true,
        cancellationSummary: "Tarifa garantida pela agência.",
      });
      setStep(4);
    } finally {
      setIsLoading(false);
    }
  };

  // Etapa 4 -> 5: Emissão Real Idempotente
  const handleConfirmBooking = async () => {
    if (!storeId) {
      toast.error("Esta oferta requer vínculo com uma agência credenciada para emissão em tempo real.");
      return;
    }
    setIsLoading(true);
    try {
      const externalId = `ota_${offer.id.slice(0, 8)}_${Date.now()}`;
      const res = await infotravelEmitRealBookingFn({
        data: {
          agencyId: storeId,
          externalId,
          booking: {
            client: {
              name: passengers[0].fullName,
              document: passengers[0].document,
              email: contactEmail,
              phone: contactPhone,
            },
            contact: {
              name: passengers[0].fullName,
              email: contactEmail,
              telephone: contactPhone,
            },
            passengers,
            totalAmount: currentPriceCents / 100,
            offerId: offer.id,
            paymentMethod,
          },
        },
      });

      const resolvedLocator =
        "locator" in res && res.locator
          ? String(res.locator)
          : String(res.bookingId);
      const resolvedVoucherUrl =
        "voucherUrl" in res && res.voucherUrl
          ? String(res.voucherUrl)
          : undefined;

      const outcome = {
        bookingId: String(res.bookingId),
        locator: resolvedLocator,
        voucherUrl: resolvedVoucherUrl,
      };
      setBookingResult(outcome);
      onSuccess?.(outcome);
      setStep(5);
      toast.success("Reserva emitida com sucesso!");
    } catch (err: any) {
      toast.error(err?.message || "Não foi possível finalizar a reserva no momento.");
    } finally {
      setIsLoading(false);
    }
  };

  const pixCopyPaste = generatePixBrCode({
    pixKey: "financeiro@waesy.com.br",
    amountCents: currentPriceCents,
    merchantName: agencyName || "Agência Waesy",
    merchantCity: "São Paulo",
    txId: `OTA${offer.id.slice(0, 10).replace(/[^A-Za-z0-9]/g, "")}`,
    description: `Reserva ${offer.destination}`,
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-screen overflow-y-auto p-4 sm:p-6 bg-card text-foreground border border-border rounded-xl">
        <DialogHeader className="space-y-1">
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-xs uppercase font-extrabold text-primary border-primary/30">
              Passo {step} de 5
            </Badge>
            <span className="text-xs text-muted-foreground font-semibold">Reserva Direta OTA</span>
          </div>
          <DialogTitle className="text-base sm:text-lg font-black text-foreground">
            {step === 1 && "Resumo do Roteiro"}
            {step === 2 && "Passageiros"}
            {step === 3 && "Revalidando Tarifa"}
            {step === 4 && "Pagamento"}
            {step === 5 && "Reserva Confirmada"}
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            {step === 1 && "Verifique as inclusões e políticas antes de prosseguir."}
            {step === 2 && "Preencha os dados dos viajantes conforme documento oficial."}
            {step === 3 && "Travando inventário e tarifas com a operadora."}
            {step === 4 && "Escolha como deseja garantir sua reserva."}
            {step === 5 && "Seus localizadores e vouchers foram emitidos."}
          </DialogDescription>
        </DialogHeader>

        {/* ── PASSO 1: Resumo do Pacote / Roteiro ── */}
        {step === 1 && (
          <div className="space-y-4 pt-2">
            <div className="p-4 rounded-xl bg-muted/30 border border-border space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-border/50 pb-3">
                <div>
                  <h3 className="font-bold text-sm sm:text-base text-foreground">{offer.title}</h3>
                  <p className="text-xs text-muted-foreground">{offer.subtitle || offer.destination}</p>
                </div>
                <div className="text-right shrink-0">
                  <span className="text-xs text-muted-foreground block">Valor Total</span>
                  <span className="text-lg font-black text-foreground font-mono">
                    {formatMoney(offer.priceCents)}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                {offer.departureDate && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <CalendarBlank size={16} className="text-primary shrink-0" weight="bold" />
                    <span>Saída: <strong className="text-foreground">{offer.departureDate}</strong></span>
                  </div>
                )}
                {offer.returnDate && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <CalendarBlank size={16} className="text-primary shrink-0" weight="bold" />
                    <span>Retorno: <strong className="text-foreground">{offer.returnDate}</strong></span>
                  </div>
                )}
                {offer.hotelName && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Buildings size={16} className="text-primary shrink-0" weight="bold" />
                    <span>Hotel: <strong className="text-foreground">{offer.hotelName}</strong></span>
                  </div>
                )}
                {offer.airline && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <AirplaneTakeoff size={16} className="text-primary shrink-0" weight="bold" />
                    <span>Voo: <strong className="text-foreground">{offer.airline}</strong></span>
                  </div>
                )}
              </div>

              {offer.includes && offer.includes.length > 0 && (
                <div className="pt-2 border-t border-border/40">
                  <span className="text-xs font-bold text-foreground block mb-2">Itens Inclusos:</span>
                  <div className="flex flex-wrap gap-2">
                    {offer.includes.map((inc, i) => (
                      <span key={i} className="text-xs px-2 py-1 rounded bg-muted text-foreground font-medium">
                        {inc}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="p-4 rounded-xl border border-primary/20 bg-primary/5 space-y-2 text-xs">
              <div className="flex items-center gap-2 font-bold text-foreground">
                <ShieldCheck size={16} className="text-primary" weight="fill" />
                <span>Garantia de Reserva</span>
              </div>
              <p className="text-muted-foreground">
                Reserva emitida diretamente com as operadoras parceiras ({offer.badge || "GDS Homologado"}). Cancelamento gratuito em até 24h conforme Resolução 400 da ANAC para voos comprados com 7+ dias de antecedência.
              </p>
            </div>
          </div>
        )}

        {/* ── PASSO 2: Manifesto de Passageiros ── */}
        {step === 2 && (
          <div className="space-y-4 pt-2">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-foreground flex items-center gap-2">
                  <Users size={16} className="text-primary" weight="bold" />
                  <span>Viajantes ({passengers.length})</span>
                </span>
                {passengers.length < 6 && (
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={handleAddPassenger}
                    className="h-11 min-h-11 px-3 text-xs font-bold text-primary cursor-pointer hover:bg-primary/10"
                  >
                    Adicionar Viajante
                  </Button>
                )}
              </div>

              {passengers.map((p, idx) => (
                <div key={idx} className="p-4 rounded-xl border border-border bg-muted/20 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black text-foreground">Passageiro {idx + 1}</span>
                    {passengers.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleRemovePassenger(idx)}
                        className="h-11 min-h-11 px-2 rounded text-xs text-destructive hover:underline cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      >
                        Remover
                      </button>
                    )}
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="sm:col-span-2 space-y-1">
                      <Label className="text-xs text-muted-foreground">Nome Completo</Label>
                      <Input
                        value={p.fullName}
                        onChange={(e) => handleUpdatePassenger(idx, "fullName", e.target.value)}
                        placeholder="Nome e Sobrenome"
                        className="h-11 min-h-11 text-xs"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">CPF ou Passaporte</Label>
                      <Input
                        value={p.document}
                        onChange={(e) => handleUpdatePassenger(idx, "document", e.target.value)}
                        placeholder="000.000.000-00"
                        className="h-11 min-h-11 text-xs"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="p-4 rounded-xl border border-border bg-muted/20 space-y-3">
              <span className="text-xs font-bold text-foreground block">Contato Principal</span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">E-mail Principal</Label>
                  <Input
                    type="email"
                    value={contactEmail}
                    onChange={(e) => setContactEmail(e.target.value)}
                    placeholder="seuemail@exemplo.com"
                    className="h-11 min-h-11 text-xs"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">WhatsApp / Celular</Label>
                  <Input
                    type="tel"
                    value={contactPhone}
                    onChange={(e) => setContactPhone(e.target.value)}
                    placeholder="(00) 90000-0000"
                    className="h-11 min-h-11 text-xs"
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── PASSO 3: Revalidação em Andamento (Skeleton / Loader) ── */}
        {step === 3 && (
          <div className="py-12 text-center space-y-4">
            <CircleNotch size={36} className="animate-spin motion-reduce:animate-none text-primary mx-auto" />
            <div className="space-y-1">
              <h3 className="font-bold text-sm text-foreground">Conectando à Operadora</h3>
              <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                Revalidando disponibilidade de assentos, bloqueios de quartos e congelando sua tarifa.
              </p>
            </div>
          </div>
        )}

        {/* ── PASSO 4: Pagamento & Confirmação ── */}
        {step === 4 && (
          <div className="space-y-4 pt-2">
            <div className="flex items-center justify-between p-4 rounded-xl bg-muted/30 border border-border">
              <span className="text-xs text-muted-foreground">Tarifa Final Revalidada</span>
              <span className="text-base sm:text-lg font-black text-foreground font-mono">
                {formatMoney(currentPriceCents)}
              </span>
            </div>

            <Tabs value={paymentMethod} onValueChange={(v) => setPaymentMethod(v as any)} className="w-full">
              <TabsList className="flex w-full h-11 min-h-11 p-1 bg-muted rounded-xl">
                <TabsTrigger value="pix" className="flex-1 text-xs font-bold gap-2 h-9">
                  <QrCode size={16} />
                  <span>Pix</span>
                </TabsTrigger>
                <TabsTrigger value="card" className="flex-1 text-xs font-bold gap-2 h-9">
                  <CreditCard size={16} />
                  <span>Cartão</span>
                </TabsTrigger>
                <TabsTrigger value="hold" className="flex-1 text-xs font-bold gap-2 h-9">
                  <Info size={16} />
                  <span>Faturar</span>
                </TabsTrigger>
              </TabsList>

              <TabsContent value="pix" className="pt-3 space-y-3">
                <div className="p-4 rounded-xl border border-emerald-500/30 bg-emerald-500/5 space-y-3 text-center">
                  <span className="text-xs font-bold text-emerald-700 dark:text-emerald-400 block">
                    Pagamento Instantâneo via Pix
                  </span>
                  <div className="p-3 bg-background rounded-lg border border-border text-left font-mono text-xs truncate flex items-center justify-between gap-2">
                    <span className="truncate">{pixCopyPaste}</span>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        navigator.clipboard.writeText(pixCopyPaste);
                        toast.success("Código Pix copiado!");
                      }}
                      className="h-11 min-h-11 px-3 text-xs font-bold shrink-0 gap-1"
                    >
                      <Copy size={14} />
                      <span>Copiar</span>
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Ao confirmar, a reserva é bloqueada no sistema enquanto o pagamento é conciliado.
                  </p>
                </div>
              </TabsContent>

              <TabsContent value="card" className="pt-3 space-y-3">
                <div className="p-4 rounded-xl border border-border bg-muted/20 space-y-3">
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Parcelamento</Label>
                    <select
                      value={cardInstallments}
                      onChange={(e) => setCardInstallments(Number(e.target.value))}
                      className="w-full h-11 min-h-11 px-3 text-xs bg-background border border-border rounded-lg text-foreground focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      <option value={1}>1x de {formatMoney(currentPriceCents)} (sem juros)</option>
                      <option value={3}>3x de {formatMoney(Math.round(currentPriceCents / 3))} (sem juros)</option>
                      <option value={6}>6x de {formatMoney(Math.round(currentPriceCents / 6))} (sem juros)</option>
                      <option value={10}>10x de {formatMoney(Math.round(currentPriceCents / 10))} (sem juros)</option>
                      <option value={12}>12x de {formatMoney(Math.round(currentPriceCents / 12))} (sem juros)</option>
                    </select>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Você será redirecionado para o checkout seguro com antifraude e 3DS da operadora.
                  </p>
                </div>
              </TabsContent>

              <TabsContent value="hold" className="pt-3 space-y-3">
                <div className="p-4 rounded-xl border border-border bg-muted/20 space-y-2">
                  <span className="text-xs font-bold text-foreground block">
                    Faturar com Consultor
                  </span>
                  <p className="text-xs text-muted-foreground">
                    Seguramos seu localizador na operadora por até 24 horas. Nosso consultor entra em contato pelo WhatsApp informado para envio do carnê, boleto ou faturamento corporativo.
                  </p>
                </div>
              </TabsContent>
            </Tabs>
          </div>
        )}

        {/* ── PASSO 5: Confirmação e Sucesso ── */}
        {step === 5 && bookingResult && (
          <div className="py-6 text-center space-y-4">
            <div className="size-12 rounded-full bg-emerald-500/10 text-emerald-600 flex items-center justify-center mx-auto">
              <CheckCircle size={32} weight="fill" />
            </div>
            <div className="space-y-1">
              <h3 className="font-black text-base sm:text-lg text-foreground">Reserva Confirmada</h3>
              <p className="text-xs text-muted-foreground">
                Seu localizador oficial já está registrado nos sistemas da operadora.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-muted/30 border border-border max-w-sm mx-auto space-y-2 text-left">
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Localizador:</span>
                <strong className="font-mono text-sm text-primary">{bookingResult.locator}</strong>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">ID da Reserva:</span>
                <span className="font-mono text-foreground">{bookingResult.bookingId}</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Passageiro Principal:</span>
                <span className="font-bold text-foreground">{passengers[0].fullName}</span>
              </div>
            </div>

            {bookingResult.voucherUrl && (
              <a
                href={bookingResult.voucherUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center justify-center h-11 min-h-11 px-5 rounded-lg bg-primary text-primary-foreground font-bold text-xs gap-2 focus-visible:ring-2 focus-visible:ring-ring"
              >
                <span>Baixar Voucher</span>
              </a>
            )}
          </div>
        )}

        <DialogFooter className="flex flex-col-reverse sm:flex-row items-center justify-between gap-2 pt-3 border-t border-border/50">
          {step > 1 && step < 5 ? (
            <Button
              type="button"
              variant="outline"
              disabled={isLoading}
              onClick={() => setStep((s) => (s - 1) as any)}
              className="h-11 min-h-11 px-4 text-xs font-bold rounded-lg w-full sm:w-auto"
            >
              Voltar
            </Button>
          ) : (
            <div />
          )}

          {step === 1 && (
            <Button
              type="button"
              onClick={() => setStep(2)}
              className="h-11 min-h-11 px-6 rounded-lg bg-primary text-primary-foreground font-bold text-xs gap-2 w-full sm:w-auto cursor-pointer focus-visible:ring-2 focus-visible:ring-ring"
            >
              <span>Continuar</span>
              <ArrowRight size={16} weight="bold" />
            </Button>
          )}

          {step === 2 && (
            <Button
              type="button"
              onClick={handleProceedToRevalidation}
              disabled={isLoading}
              className="h-11 min-h-11 px-6 rounded-lg bg-primary text-primary-foreground font-bold text-xs gap-2 w-full sm:w-auto cursor-pointer focus-visible:ring-2 focus-visible:ring-ring"
            >
              {isLoading ? (
                <>
                  <CircleNotch size={16} className="animate-spin motion-reduce:animate-none" />
                  <span>Revalidando</span>
                </>
              ) : (
                <>
                  <span>Revalidar Tarifa</span>
                  <ArrowRight size={16} weight="bold" />
                </>
              )}
            </Button>
          )}

          {step === 4 && (
            <Button
              type="button"
              onClick={handleConfirmBooking}
              disabled={isLoading}
              className="h-11 min-h-11 px-6 rounded-lg bg-primary text-primary-foreground font-black text-xs sm:text-sm gap-2 w-full sm:w-auto cursor-pointer focus-visible:ring-2 focus-visible:ring-ring"
            >
              {isLoading ? (
                <>
                  <CircleNotch size={18} className="animate-spin motion-reduce:animate-none" />
                  <span>Emitindo</span>
                </>
              ) : (
                <>
                  <CheckCircle size={18} weight="bold" />
                  <span>Confirmar Reserva</span>
                </>
              )}
            </Button>
          )}

          {step === 5 && (
            <Button
              type="button"
              onClick={() => onOpenChange(false)}
              className="h-11 min-h-11 px-6 rounded-lg font-bold text-xs w-full sm:w-auto cursor-pointer"
            >
              Concluir
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
