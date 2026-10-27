import React, { useState, useMemo } from "react";
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
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { toast } from "sonner";
import {
  Users,
  Bed,
  Bus,
  CreditCard,
  QrCode,
  Calendar,
  Share2,
  CheckCircle2,
  Loader2,
  DollarSign,
  ShieldCheck,
  Plus,
  Minus,
  Sparkles,
  Link as LinkIcon,
} from "lucide-react";
import { formatMoney } from "@/lib/money";
import {
  bookGroupTourReservation,
  type BusSeatDTO,
} from "@/services/group-tours.functions";

interface SmartTravelBookingModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tourId: string;
  tourTitle: string;
  destination: string;
  basePriceCents: number;
  allowSharedRooms?: boolean;
  singleSupplementCents?: number;
  seats?: BusSeatDTO[];
  onSuccess?: (result: any) => void;
}

export function SmartTravelBookingModal({
  open,
  onOpenChange,
  tourId,
  tourTitle,
  destination,
  basePriceCents,
  allowSharedRooms = true,
  singleSupplementCents = 0,
  seats = [],
  onSuccess,
}: SmartTravelBookingModalProps) {
  const [step, setStep] = useState<1 | 2 | 3 | 4 | 5>(1);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // 1. Passageiros
  const [adultsCount, setAdultsCount] = useState(1);
  const [childrenCount, setChildrenCount] = useState(0);
  const [childrenAges, setChildrenAges] = useState<number[]>([]);

  // 2. Acomodação
  const [roomPreference, setRoomPreference] = useState<
    "single" | "shared" | "double_couple" | "double_twin" | "triple" | "quadruple"
  >(allowSharedRooms && adultsCount === 1 ? "shared" : "double_couple");

  // 3. Poltronas
  const [selectedSeats, setSelectedSeats] = useState<number[]>([]);

  // 4. Contato & Delegação
  const [contactName, setContactName] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [contactDoc, setContactDoc] = useState("");
  const [delegateForms, setDelegateForms] = useState(false);

  // 5. Forma de Pagamento
  const [paymentMethod, setPaymentMethod] = useState<"pix" | "credit_card" | "carne" | "whatsapp">("pix");

  // Resultado
  const [bookingResult, setBookingResult] = useState<any>(null);

  const totalPax = adultsCount + childrenCount;

  // Atualização defensiva de idades de crianças
  const handleChildrenCountChange = (delta: number) => {
    const next = Math.max(0, Math.min(6, childrenCount + delta));
    setChildrenCount(next);
    if (next > childrenAges.length) {
      setChildrenAges([...childrenAges, 5]);
    } else if (next < childrenAges.length) {
      setChildrenAges(childrenAges.slice(0, next));
    }
  };

  const handleChildAgeChange = (index: number, age: number) => {
    const next = [...childrenAges];
    next[index] = Math.max(0, Math.min(17, age));
    setChildrenAges(next);
  };

  // Cálculo de assentos selecionados
  const handleToggleSeat = (seatNum: number, status: string) => {
    if (status !== "free") return;
    if (selectedSeats.includes(seatNum)) {
      setSelectedSeats(selectedSeats.filter((s) => s !== seatNum));
    } else {
      if (selectedSeats.length >= totalPax) {
        toast.info(`Você já selecionou ${totalPax} assento(s) para os passageiros.`);
        return;
      }
      setSelectedSeats([...selectedSeats, seatNum]);
    }
  };

  // Preço Total
  const basePathPrice = () => {
    // Criança de colo (0 a 4 anos) tem gratuidade em roteiros padrão Waesy
    const payingPax = adultsCount + childrenAges.filter((age) => age >= 5).length;
    return payingPax * basePriceCents;
  };

  const singleSupplementTotal = () => {
    if (adultsCount === 1 && childrenCount === 0 && roomPreference === "single") {
      return singleSupplementCents;
    }
    return 0;
  };

  const totalCents = basePathPrice() + singleSupplementTotal();

  // Validação do Passo
  const canProceed = useMemo(() => {
    if (step === 1) return adultsCount >= 1;
    if (step === 2) return Boolean(roomPreference);
    if (step === 3) return selectedSeats.length === totalPax;
    if (step === 4) return contactName.trim().length >= 3 && contactDoc.trim().length >= 5;
    return true;
  }, [step, adultsCount, totalPax, roomPreference, selectedSeats.length, contactName, contactDoc]);

  // Submissão Final
  const handleConfirmBooking = async () => {
    if (!contactName || !contactDoc) {
      toast.error("Informe seu nome completo e documento.");
      return;
    }

    try {
      setIsSubmitting(true);
      const res = await bookGroupTourReservation({
        data: {
          tourId,
          primaryContact: { name: contactName, email: contactEmail || "", phone: contactPhone || "", document: contactDoc || undefined },
          adultsCount,
          childrenAges,
          roomPreference,
          selectedSeats,
          delegateCompanionForms: delegateForms,
          paymentMethod,
        },
      });

      if (!res.success) {
        throw new Error(res.message || "Falha ao processar reserva");
      }

      setBookingResult(res);
      toast.success("Reserva realizada com sucesso!");
      if (onSuccess) onSuccess(res);
    } catch (err: any) {
      toast.error(err.message || "Erro ao efetuar reserva");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-screen sm:max-h-160 overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-2 text-2xs text-primary font-bold uppercase tracking-wider">
            <Sparkles className="size-3.5" /> Reserva Inteligente & Acomodação
          </div>
          <DialogTitle className="text-lg font-bold">{tourTitle}</DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            Destino: {destination} • Seleção dinâmica de quartos, poltronas e delegação
          </DialogDescription>
        </DialogHeader>

        {/* FEEDBACK DE SUCESSO / PÓS-COMPRA */}
        {bookingResult ? (
          <div className="py-6 space-y-4">
            <div className="p-4 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-center space-y-2">
              <CheckCircle2 className="size-10 text-emerald-600 mx-auto" />
              <h3 className="text-sm font-bold text-foreground">Reserva Confirmada!</h3>
              <p className="text-xs text-muted-foreground">
                Inscrição registrada. Código da fatura:{" "}
                <span className="font-mono font-bold text-foreground">{bookingResult.invoiceToken}</span>
              </p>
            </div>

            {bookingResult.companionTokens && bookingResult.companionTokens.length > 0 && (
              <div className="p-4 rounded-lg bg-muted/40 border border-border space-y-3">
                <div className="flex items-center gap-2 text-xs font-bold text-foreground">
                  <Share2 className="size-4 text-primary" />
                  Links Individuais dos Acompanhantes
                </div>
                <p className="text-2xs text-muted-foreground">
                  Compartilhe cada link abaixo com seus acompanhantes para que eles preencham seus dados de RG, CPF e emergência:
                </p>
                <div className="space-y-2">
                  {bookingResult.companionTokens.map((item: any, idx: number) => {
                    const url = `${typeof window !== "undefined" ? window.location.origin : ""}/m/excursao/${item.token}`;
                    return (
                      <div
                        key={item.token}
                        className="flex items-center justify-between p-2 rounded-md bg-background border border-border text-xs"
                      >
                        <span className="font-medium text-foreground truncate pr-2">
                          Passageiro #{idx + 2} (Acompanhante)
                        </span>
                        <Button
                          type="button"
                          variant="ghost"
                          onClick={() => {
                            navigator.clipboard.writeText(url);
                            toast.success("Link do acompanhante copiado!");
                          }}
                          className="h-11 min-h-11 px-3 text-2xs font-bold gap-1 shrink-0 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                        >
                          <LinkIcon className="size-3" /> Copiar
                        </Button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="p-4 rounded-lg bg-card border border-border/70 flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Valor Total Contratado:</span>
              <span className="text-xl font-bold font-mono text-primary">{formatMoney(totalCents)}</span>
            </div>

            <Button
              type="button"
              onClick={() => {
                setBookingResult(null);
                onOpenChange(false);
              }}
              className="h-11 min-h-11 px-6 text-xs font-bold w-full focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            >
              Concluir
            </Button>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Navegador de Passos */}
            <div className="flex items-center justify-between border-b border-border pb-3 text-xs font-semibold text-muted-foreground">
              <button
                type="button"
                onClick={() => setStep(1)}
                className={`flex items-center gap-2 cursor-pointer focus-visible:ring-2 focus-visible:ring-ring rounded-sm ${step === 1 ? "text-primary font-bold" : ""}`}
              >
                <Users className="size-4" /> 1. Viajantes
              </button>
              <button
                type="button"
                onClick={() => setStep(2)}
                className={`flex items-center gap-2 cursor-pointer focus-visible:ring-2 focus-visible:ring-ring rounded-sm ${step === 2 ? "text-primary font-bold" : ""}`}
              >
                <Bed className="size-4" /> 2. Quarto
              </button>
              {seats.length > 0 && (
                <button
                  type="button"
                  onClick={() => setStep(3)}
                  className={`flex items-center gap-2 cursor-pointer focus-visible:ring-2 focus-visible:ring-ring rounded-sm ${step === 3 ? "text-primary font-bold" : ""}`}
                >
                  <Bus className="size-4" /> 3. Assentos
                </button>
              )}
              <button
                type="button"
                onClick={() => setStep(4)}
                className={`flex items-center gap-2 cursor-pointer focus-visible:ring-2 focus-visible:ring-ring rounded-sm ${step === 4 ? "text-primary font-bold" : ""}`}
              >
                <CreditCard className="size-4" /> 4. Contato
              </button>
              <button
                type="button"
                onClick={() => setStep(5)}
                className={`flex items-center gap-2 cursor-pointer focus-visible:ring-2 focus-visible:ring-ring rounded-sm ${step === 5 ? "text-primary font-bold" : ""}`}
              >
                <DollarSign className="size-4" /> 5. Pagamento
              </button>
            </div>

            {/* PASSO 1: VIAJANTES & IDADES */}
            {step === 1 && (
              <div className="space-y-4">
                <div className="p-4 rounded-lg border border-border bg-card space-y-4">
                  {/* Adultos */}
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-xs font-bold text-foreground">Adultos</div>
                      <div className="text-2xs text-muted-foreground">A partir de 12 anos</div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        className="size-11 min-h-11 rounded-full focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                        disabled={adultsCount <= 1}
                        onClick={() => setAdultsCount(Math.max(1, adultsCount - 1))}
                      >
                        <Minus className="size-4" />
                      </Button>
                      <span className="font-bold text-sm min-w-6 text-center">{adultsCount}</span>
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        className="size-11 min-h-11 rounded-full focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                        disabled={adultsCount >= 10}
                        onClick={() => setAdultsCount(adultsCount + 1)}
                      >
                        <Plus className="size-4" />
                      </Button>
                    </div>
                  </div>

                  {/* Crianças */}
                  <div className="flex items-center justify-between border-t border-border pt-4">
                    <div>
                      <div className="text-xs font-bold text-foreground">Crianças</div>
                      <div className="text-2xs text-muted-foreground">De 0 a 11 anos</div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        className="size-11 min-h-11 rounded-full focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                        disabled={childrenCount <= 0}
                        onClick={() => handleChildrenCountChange(-1)}
                      >
                        <Minus className="size-4" />
                      </Button>
                      <span className="font-bold text-sm min-w-6 text-center">{childrenCount}</span>
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        className="size-11 min-h-11 rounded-full focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                        disabled={childrenCount >= 6}
                        onClick={() => handleChildrenCountChange(1)}
                      >
                        <Plus className="size-4" />
                      </Button>
                    </div>
                  </div>

                  {/* Detalhe de idades das crianças */}
                  {childrenCount > 0 && (
                    <div className="border-t border-border pt-4 space-y-2">
                      <Label className="text-2xs font-bold uppercase tracking-wider text-muted-foreground">
                        Informe as idades das crianças na data da viagem:
                      </Label>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                        {childrenAges.map((age, i) => (
                          <div key={i} className="flex items-center gap-2 p-2 rounded-md bg-muted/30 border border-border">
                            <span className="text-2xs font-semibold text-muted-foreground whitespace-nowrap">
                              Criança #{i + 1}:
                            </span>
                            <Input
                              type="number"
                              min={0}
                              max={11}
                              value={age}
                              onChange={(e) => handleChildAgeChange(i, parseInt(e.target.value) || 0)}
                              className="h-8 text-xs font-bold text-center"
                            />
                            <span className="text-2xs text-muted-foreground">anos</span>
                          </div>
                        ))}
                      </div>
                      <p className="text-3xs text-muted-foreground">
                        * Crianças até 4 anos viajam no colo sem cobrança de pacote de acordo com a política do roteiro.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* PASSO 2: CONFIGURAÇÃO DE QUARTO & QUARTO COMPARTILHADO */}
            {step === 2 && (
              <div className="space-y-4">
                <div className="text-xs text-muted-foreground">
                  Escolha como prefere a sua acomodação durante o roteiro:
                </div>

                <RadioGroup
                  value={roomPreference}
                  onValueChange={(val: any) => setRoomPreference(val)}
                  className="space-y-3"
                >
                  {allowSharedRooms && adultsCount === 1 && (
                    <div
                      role="button"
                      tabIndex={0}
                      onClick={() => setRoomPreference("shared")}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          setRoomPreference("shared");
                        }
                      }}
                      className={`p-4 rounded-lg border transition-colors cursor-pointer space-y-1 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ${
                        roomPreference === "shared"
                          ? "border-emerald-500 bg-emerald-500/5"
                          : "border-border hover:bg-muted/30"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-foreground flex items-center gap-2">
                          <RadioGroupItem value="shared" id="room-shared" />
                          <Sparkles className="size-4 text-emerald-600" />
                          Quarto Compartilhado do Grupo (Sem Adicional Single)
                        </span>
                        <Badge className="bg-emerald-600 text-primary-foreground text-2xs">Econômico</Badge>
                      </div>
                      <p className="text-2xs text-muted-foreground pl-6">
                        Você viaja sozinho e divide o quarto com outro passageiro solo do mesmo gênero (ou separado pela agência). Isento de taxa single!
                      </p>
                    </div>
                  )}

                  <div
                    role="button"
                    tabIndex={0}
                    onClick={() => setRoomPreference("single")}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        setRoomPreference("single");
                      }
                    }}
                    className={`p-4 rounded-lg border transition-colors cursor-pointer space-y-1 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ${
                      roomPreference === "single"
                        ? "border-primary bg-primary/5"
                        : "border-border hover:bg-muted/30"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-foreground flex items-center gap-2">
                        <RadioGroupItem value="single" id="room-single" />
                        Quarto Individual Privativo (Single)
                      </span>
                      {singleSupplementCents > 0 && (
                        <span className="text-xs font-mono font-bold text-primary">
                          +{formatMoney(singleSupplementCents)}
                        </span>
                      )}
                    </div>
                    <p className="text-2xs text-muted-foreground pl-6">
                      Quarto exclusivo só para você durante toda a viagem.
                    </p>
                  </div>

                  <div
                    role="button"
                    tabIndex={0}
                    onClick={() => setRoomPreference("double_couple")}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        setRoomPreference("double_couple");
                      }
                    }}
                    className={`p-4 rounded-lg border transition-colors cursor-pointer space-y-1 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ${
                      roomPreference === "double_couple"
                        ? "border-primary bg-primary/5"
                        : "border-border hover:bg-muted/30"
                    }`}
                  >
                    <span className="text-xs font-bold text-foreground flex items-center gap-2">
                      <RadioGroupItem value="double_couple" id="room-couple" />
                      Quarto Duplo Casal (1 Cama de Casal)
                    </span>
                  </div>

                  <div
                    role="button"
                    tabIndex={0}
                    onClick={() => setRoomPreference("double_twin")}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        setRoomPreference("double_twin");
                      }
                    }}
                    className={`p-4 rounded-lg border transition-colors cursor-pointer space-y-1 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ${
                      roomPreference === "double_twin"
                        ? "border-primary bg-primary/5"
                        : "border-border hover:bg-muted/30"
                    }`}
                  >
                    <span className="text-xs font-bold text-foreground flex items-center gap-2">
                      <RadioGroupItem value="double_twin" id="room-twin" />
                      Quarto Duplo Solteiro (2 Camas Separadas)
                    </span>
                  </div>

                  {totalPax >= 3 && (
                    <div
                      role="button"
                      tabIndex={0}
                      onClick={() => setRoomPreference("triple")}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          setRoomPreference("triple");
                        }
                      }}
                      className={`p-4 rounded-lg border transition-colors cursor-pointer space-y-1 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ${
                        roomPreference === "triple"
                          ? "border-primary bg-primary/5"
                          : "border-border hover:bg-muted/30"
                      }`}
                    >
                      <span className="text-xs font-bold text-foreground flex items-center gap-2">
                        <RadioGroupItem value="triple" id="room-triple" />
                        Quarto Triplo / Familiar
                      </span>
                    </div>
                  )}
                </RadioGroup>
              </div>
            )}

            {/* PASSO 3: MAPA 2D DE ASSENTOS RODOVIÁRIOS */}
            {step === 3 && seats.length > 0 && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-semibold text-foreground flex items-center gap-2">
                    <Bus className="size-4 text-primary" />
                    Selecione suas Poltronas ({selectedSeats.length} de {totalPax} escolhidas)
                  </Label>
                  <div className="flex items-center gap-3 text-2xs">
                    <span className="flex items-center gap-1"><span className="size-3 rounded-xs bg-muted border border-border" /> Livre</span>
                    <span className="flex items-center gap-1"><span className="size-3 rounded-xs bg-primary text-primary-foreground" /> Sua Seleção</span>
                    <span className="flex items-center gap-1"><span className="size-3 rounded-xs bg-muted-foreground/30" /> Ocupada</span>
                  </div>
                </div>

                <div className="p-4 rounded-lg border border-border bg-card">
                  <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 gap-2 max-w-sm mx-auto text-center font-mono text-xs">
                    {seats.map((seat) => {
                      const isSelected = selectedSeats.includes(seat.seat_number);
                      const isFree = seat.status === "free";

                      return (
                        <button
                          key={seat.seat_number}
                          type="button"
                          disabled={!isFree}
                          onClick={() => handleToggleSeat(seat.seat_number, seat.status)}
                          className={`h-11 min-h-11 rounded-md font-bold transition-colors flex flex-col items-center justify-center cursor-pointer focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ${
                            isSelected
                              ? "bg-primary text-primary-foreground shadow-xs"
                              : isFree
                              ? "bg-muted/60 hover:bg-muted text-foreground border border-border"
                              : "bg-muted-foreground/20 text-muted-foreground/50 cursor-not-allowed"
                          }`}
                        >
                          <span>{seat.seat_number}</span>
                          <span className="text-3xs font-sans uppercase font-medium">{seat.column}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* PASSO 4: DADOS DO PAGADOR PRINCIPAL & DELEGAÇÃO */}
            {step === 4 && (
              <div className="space-y-4">
                <div className="p-4 rounded-lg border border-border bg-card space-y-3">
                  <div className="text-xs font-bold text-foreground flex items-center gap-2">
                    <ShieldCheck className="size-4 text-primary" />
                    Dados do Pagador / Contratante Principal
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label htmlFor="contact-name" className="text-2xs font-semibold">Nome Completo *</Label>
                      <Input
                        id="contact-name"
                        value={contactName}
                        onChange={(e) => setContactName(e.target.value)}
                        placeholder="Ex: Carlos Silva"
                        className="h-10 text-xs"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="contact-doc" className="text-2xs font-semibold">CPF / Passaporte *</Label>
                      <Input
                        id="contact-doc"
                        value={contactDoc}
                        onChange={(e) => setContactDoc(e.target.value)}
                        placeholder="000.000.000-00"
                        className="h-10 text-xs"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label htmlFor="contact-phone" className="text-2xs font-semibold">WhatsApp / Telefone</Label>
                      <Input
                        id="contact-phone"
                        value={contactPhone}
                        onChange={(e) => setContactPhone(e.target.value)}
                        placeholder="(00) 00000-0000"
                        className="h-10 text-xs"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="contact-email" className="text-2xs font-semibold">E-mail</Label>
                      <Input
                        id="contact-email"
                        type="email"
                        value={contactEmail}
                        onChange={(e) => setContactEmail(e.target.value)}
                        placeholder="carlos@email.com"
                        className="h-10 text-xs"
                      />
                    </div>
                  </div>
                </div>

                {totalPax > 1 && (
                  <div className="p-4 rounded-lg bg-muted/40 border border-border/70 space-y-2">
                    <div className="flex items-start gap-3">
                      <Checkbox
                        id="delegate-forms"
                        checked={delegateForms}
                        onCheckedChange={(c) => setDelegateForms(Boolean(c))}
                        className="mt-1"
                      />
                      <label htmlFor="delegate-forms" className="text-xs text-foreground cursor-pointer select-none space-y-1 block">
                        <span className="font-bold flex items-center gap-2">
                          <Share2 className="size-3.5 text-primary" />
                          Gerar links individuais de preenchimento para acompanhantes
                        </span>
                        <p className="text-2xs text-muted-foreground leading-relaxed">
                          Você paga pelo pacote completo e o sistema gera links para cada acompanhante preencher seus próprios documentos, contatos de emergência e restrições alimentares.
                        </p>
                      </label>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* PASSO 5: FORMAS DE PAGAMENTO & RESUMO */}
            {step === 5 && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-xs font-semibold text-foreground">Forma de Pagamento</Label>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div
                      role="button"
                      tabIndex={0}
                      onClick={() => setPaymentMethod("pix")}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          setPaymentMethod("pix");
                        }
                      }}
                      className={`p-3 rounded-lg border transition-colors cursor-pointer text-center space-y-1 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ${
                        paymentMethod === "pix" ? "border-emerald-500 bg-emerald-500/5" : "border-border hover:bg-muted/30"
                      }`}
                    >
                      <QrCode className="size-5 mx-auto text-emerald-600" />
                      <span className="text-xs font-bold block">PIX Instantâneo</span>
                      <span className="text-2xs text-emerald-600 font-semibold block">Aprovação imediata</span>
                    </div>

                    <div
                      role="button"
                      tabIndex={0}
                      onClick={() => setPaymentMethod("credit_card")}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          setPaymentMethod("credit_card");
                        }
                      }}
                      className={`p-3 rounded-lg border transition-colors cursor-pointer text-center space-y-1 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ${
                        paymentMethod === "credit_card" ? "border-primary bg-primary/5" : "border-border hover:bg-muted/30"
                      }`}
                    >
                      <CreditCard className="size-5 mx-auto text-primary" />
                      <span className="text-xs font-bold block">Cartão de Crédito</span>
                      <span className="text-2xs text-muted-foreground block">Até 12x</span>
                    </div>

                    <div
                      role="button"
                      tabIndex={0}
                      onClick={() => setPaymentMethod("carne")}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          setPaymentMethod("carne");
                        }
                      }}
                      className={`p-3 rounded-lg border transition-colors cursor-pointer text-center space-y-1 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ${
                        paymentMethod === "carne" ? "border-amber-500 bg-amber-500/5" : "border-border hover:bg-muted/30"
                      }`}
                    >
                      <Calendar className="size-5 mx-auto text-amber-600" />
                      <span className="text-xs font-bold block">Carnê da Viagem</span>
                      <span className="text-2xs text-muted-foreground block">Até o embarque</span>
                    </div>
                  </div>
                </div>

                {/* Resumo da Contratação */}
                <div className="p-4 rounded-lg bg-card border border-border/80 space-y-2 text-xs">
                  <div className="flex justify-between text-muted-foreground">
                    <span>Pacote ({totalPax} passageiro(s)):</span>
                    <span className="font-mono font-medium">{formatMoney(basePathPrice())}</span>
                  </div>
                  {singleSupplementTotal() > 0 && (
                    <div className="flex justify-between text-muted-foreground">
                      <span>Suplemento Quarto Individual (Single):</span>
                      <span className="font-mono font-medium text-primary">+{formatMoney(singleSupplementTotal())}</span>
                    </div>
                  )}
                  {roomPreference === "shared" && (
                    <div className="flex justify-between text-emerald-600 font-medium">
                      <span>Quarto Compartilhado Solicitado:</span>
                      <span>Isenção de Taxa Single</span>
                    </div>
                  )}
                  <div className="border-t border-border pt-2 flex justify-between font-bold text-sm">
                    <span className="text-foreground">Total da Viagem:</span>
                    <span className="font-mono text-primary">{formatMoney(totalCents)}</span>
                  </div>
                </div>
              </div>
            )}

            {/* Navegação Inferior */}
            <DialogFooter className="flex items-center justify-between sm:justify-between pt-2 border-t border-border">
              {step > 1 ? (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setStep((step - 1) as any)}
                  className="h-11 min-h-11 px-4 text-xs font-bold focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                >
                  Voltar
                </Button>
              ) : (
                <div />
              )}

              {step < 5 ? (
                <Button
                  type="button"
                  disabled={!canProceed}
                  onClick={() => {
                    if (step === 2 && seats.length === 0) {
                      setStep(4);
                    } else {
                      setStep((step + 1) as any);
                    }
                  }}
                  className="h-11 min-h-11 px-6 text-xs font-bold focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                >
                  Avançar
                </Button>
              ) : (
                <Button
                  type="button"
                  disabled={isSubmitting || !contactName || !contactDoc}
                  onClick={handleConfirmBooking}
                  className="h-11 min-h-11 px-6 text-xs font-bold bg-primary text-primary-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="size-4 animate-spin motion-reduce:animate-none mr-2" />
                      Processando...
                    </>
                  ) : (
                    "Confirmar e Reservar"
                  )}
                </Button>
              )}
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
