import { useState, useMemo, useEffect } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { formatMoney } from "@/lib/money";
import { createDealProposal, getClassifiedBookedDates } from "@/services/deals.functions";
import { getDigitalDownloadSignedUrl, trackClassifiedView } from "@/services/classifieds.functions";
import { resolveClassifiedNiche } from "@/lib/classifieds/semantics";
import type { DepartureOption } from "@/lib/classifieds/canonical-airports";

export interface UseClassifiedDetailProps {
  classified: any;
  status?: string;
  isOwner?: boolean;
  canManage?: boolean;
  viewerContext?: string;
  currentProfile?: any;
}

export function useClassifiedDetail({
  classified,
  status = "active",
  isOwner,
  canManage,
  viewerContext = "anonymous",
  currentProfile,
}: UseClassifiedDetailProps) {
  const navigate = useNavigate();

  const effectiveIsOwner = Boolean(
    isOwner ||
    canManage ||
    (currentProfile?.id && classified?.author_profile_id === currentProfile.id)
  );

  const isOfferExpired = useMemo(() => {
    if (status === "expired" || classified?.status === "expired") return true;
    if (classified?.expires_at) {
      return new Date(classified.expires_at).getTime() < Date.now();
    }
    return false;
  }, [status, classified?.status, classified?.expires_at]);

  const isOfferLimitReached = useMemo(() => {
    const claimed = Number(classified?.claimed_count) || 0;
    if (classified?.offer_limit != null && claimed >= Number(classified.offer_limit)) return true;
    if (classified?.stock_limit != null && claimed >= Number(classified.stock_limit)) return true;
    return false;
  }, [classified?.claimed_count, classified?.offer_limit, classified?.stock_limit]);

  const isAvailableToOrder =
    classified?.status === "active" &&
    isOfferExpired === false &&
    isOfferLimitReached === false &&
    status !== "sold" &&
    status !== "reserved";

  useEffect(() => {
    if (typeof window !== "undefined") {
      window.scrollTo({ top: 0, left: 0, behavior: "instant" as ScrollBehavior });
      document.documentElement.scrollTop = 0;
      document.body.scrollTop = 0;
      const mainContainer = document.querySelector("main");
      if (mainContainer) {
        mainContainer.scrollTo({ top: 0, left: 0, behavior: "instant" as ScrollBehavior });
        mainContainer.scrollTop = 0;
      }
    }
    const targetId = classified?.id;
    if (!targetId || typeof window === "undefined") return;

    try {
      const storageKey = `waesy_viewed_ad_${targetId}`;
      if (sessionStorage.getItem(storageKey)) return;
      sessionStorage.setItem(storageKey, "1");

      trackClassifiedView({ data: { adId: targetId } }).catch((err) => {
        console.debug("[telemetry] Telemetria de visualização:", err);
      });
    } catch {}
  }, [classified?.id]);

  const [companionModalOpen, setCompanionModalOpen] = useState(false);
  const [applyModalOpen, setApplyModalOpen] = useState(false);

  // Proposal Dialog State
  const [proposalOpen, setProposalOpen] = useState(false);
  const [proposalPriceCents, setProposalPriceCents] = useState<number | undefined>(
    classified?.price_cents || undefined
  );
  const [proposalPaymentMethod, setProposalPaymentMethod] = useState<string>("pix");
  const [proposalInstallments, setProposalInstallments] = useState("1");
  const [proposalDepositCents, setProposalDepositCents] = useState<number | undefined>(undefined);
  const [proposalTerms, setProposalTerms] = useState("");
  const [isSendingProposal, setIsSendingProposal] = useState(false);
  const [customAnswers, setCustomAnswers] = useState<Record<string, any>>({});

  // Direct Booking State
  const [bookingOpen, setBookingOpen] = useState(false);
  const [checkInDate, setCheckInDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return d.toISOString().split("T")[0];
  });
  const [checkOutDate, setCheckOutDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 4);
    return d.toISOString().split("T")[0];
  });
  const [bookingGuests, setBookingGuests] = useState(1);
  const [isBooking, setIsBooking] = useState(false);
  const [isBuyingDirect, setIsBuyingDirect] = useState(false);

  const niche = useMemo(() => (classified ? resolveClassifiedNiche(classified) : ({} as any)), [classified]);

  // Service Appointment State
  const isService = Boolean(
    classified?.category === "service" ||
    classified?.attributes?.niche === "servico" ||
    niche?.id === "service"
  );
  const [serviceAppointmentDate, setServiceAppointmentDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return d.toISOString().split("T")[0];
  });
  const [serviceAppointmentTime, setServiceAppointmentTime] = useState("09:00");
  const [serviceAppointmentNotes, setServiceAppointmentNotes] = useState("");

  // Booked Dates
  const { data: bookedDates = [] } = useQuery({
    queryKey: ["classified-booked-dates", classified?.id],
    queryFn: () => getClassifiedBookedDates({ data: { classifiedId: classified.id } }),
    enabled: Boolean(classified?.id),
  });

  const isDateRangeOverlapping = useMemo(() => {
    if (Boolean(checkInDate) === false || Boolean(checkOutDate) === false || Boolean(bookedDates) === false || bookedDates.length === 0) return false;
    const start = new Date(checkInDate).getTime();
    const end = new Date(checkOutDate).getTime();
    return bookedDates.some((b: any) => {
      if (Boolean(b.startDate) === false || Boolean(b.endDate) === false) return false;
      const bStart = new Date(b.startDate).getTime();
      const bEnd = new Date(b.endDate).getTime();
      return start <= bEnd && end >= bStart;
    });
  }, [checkInDate, checkOutDate, bookedDates]);

  // Travel Package State
  const [selectedDeparture, setSelectedDeparture] = useState<DepartureOption | null>(null);
  const [travelPassengers, setTravelPassengers] = useState(1);
  const [selectedBoardingPoint, setSelectedBoardingPoint] = useState<string>("");

  const nightsCount = useMemo(() => {
    if (Boolean(checkInDate) === false || Boolean(checkOutDate) === false) return 1;
    const start = new Date(checkInDate).getTime();
    const end = new Date(checkOutDate).getTime();
    const diff = Math.ceil((end - start) / (1000 * 60 * 60 * 24));
    return diff > 0 ? diff : 1;
  }, [checkInDate, checkOutDate]);

  const cleaningFeeCents = classified?.cleaning_fee_cents || 0;
  const dailyRateCents = classified?.price_cents || 0;
  const bookingTotalCents = dailyRateCents * nightsCount + cleaningFeeCents;

  const isTravelPackage = Boolean(
    classified?.category === "travel" ||
    classified?.category === "viagem" ||
    classified?.category === "tourism" ||
    classified?.attributes?.niche === "viagem" ||
    classified?.attributes?.niche === "travel" ||
    classified?.attributes?.template_style === "editorial" ||
    classified?.attributes?.template_style === "instagram_resort"
  );

  const departureOptions: DepartureOption[] = Array.isArray(classified?.attributes?.departure_options)
    ? classified.attributes.departure_options
    : [];

  const flightDetails = classified?.attributes?.flight_details || null;
  const boardingGateways: string[] = Array.isArray(flightDetails?.boarding_gateways)
    ? flightDetails.boarding_gateways
    : [];

  const effectiveTravelUnitPriceCents =
    selectedDeparture?.price_override_cents && selectedDeparture.price_override_cents > 0
      ? selectedDeparture.price_override_cents
      : classified?.price_cents || 0;

  const travelPricingMode =
    classified?.attributes?.pricing_mode || classified?.attributes?.travel?.pricing_mode || "total_package";
  const isPerPerson = travelPricingMode === "per_person";

  const travelTotalCents = isPerPerson
    ? effectiveTravelUnitPriceCents * travelPassengers
    : effectiveTravelUnitPriceCents;
  const maxInstallments = Math.max(
    1,
    Number(classified?.attributes?.max_installments || classified?.attributes?.travel?.max_installments) || 1
  );
  const travelInstallmentCents = Math.round(travelTotalCents / maxInstallments);

  const handleSendProposal = async () => {
    if (!classified) return;
    const priceCents = proposalPriceCents ?? classified.price_cents ?? 0;

    if (!priceCents || priceCents <= 0) {
      toast.error("Informe um valor válido para a proposta.");
      return;
    }

    const depositCents = proposalDepositCents ?? 0;
    const installments = parseInt(proposalInstallments, 10) || 1;

    const customFields: any[] = classified?.store?.custom_inquiry_fields || [];
    for (const field of customFields) {
      if (field.required) {
        const val = customAnswers[field.id];
        if (val === undefined || val === null || val === "" || (field.type === "checkbox" && Boolean(val) === false)) {
          toast.error(`Por favor, responda o campo obrigatório: "${field.label}"`);
          return;
        }
      }
    }

    let formattedCustomFields = "";
    if (customFields.length > 0) {
      const answered = customFields
        .map((f: any) => {
          const ans = customAnswers[f.id];
          if (ans === undefined || ans === "" || ans === null) return null;
          if (f.type === "checkbox") return `• ${f.label}: ${ans ? "Sim" : "Não"}`;
          return `• ${f.label}: ${ans}`;
        })
        .filter(Boolean);
      if (answered.length > 0) {
        formattedCustomFields = `\n\n[Respostas Personalizadas Solicitadas]\n${answered.join("\n")}`;
      }
    }

    const paymentMethodLabel =
      proposalPaymentMethod === "pix"
        ? "PIX à vista"
        : proposalPaymentMethod === "cartao_credito"
        ? `Cartão de Crédito em ${installments}x`
        : proposalPaymentMethod === "boleto"
        ? "Boleto à vista"
        : proposalPaymentMethod === "boleto_parcelado"
        ? `Boleto Parcelado em ${installments}x`
        : proposalPaymentMethod === "carne_digital"
        ? `Carnê Digital da Loja em ${installments}x`
        : proposalPaymentMethod === "dinheiro"
        ? "Dinheiro em espécie"
        : proposalPaymentMethod === "permuta"
        ? "Permuta / Troca"
        : "Financiamento Bancário";

    const finalTerms = (
      `[Forma de Pagamento: ${paymentMethodLabel}${depositCents > 0 ? ` com entrada de ${formatMoney(depositCents)}` : ""}]\n` +
      proposalTerms.trim() +
      formattedCustomFields
    ).trim();

    setIsSendingProposal(true);
    try {
      await createDealProposal({
        data: {
          classifiedId: classified.id,
          sellerId: classified.author_profile_id,
          proposedPriceCents: priceCents,
          depositCents,
          installmentsCount: installments,
          dealType: classified.category === "real_estate" ? "rental" : "sale",
          terms: finalTerms || undefined,
        },
      });

      toast.success("Proposta enviada ao vendedor! Acompanhe em Minhas Negociações.");
      setProposalOpen(false);
      navigate({ to: "/conta/negociacoes" });
    } catch (err: any) {
      console.error("Erro ao enviar proposta:", err);
      toast.error(err?.message || "Erro ao enviar proposta. Verifique se você está autenticado.");
    } finally {
      setIsSendingProposal(false);
    }
  };

  const handleDirectBooking = async () => {
    if (!classified) return;
    setIsBooking(true);
    try {
      if (isService) {
        await createDealProposal({
          data: {
            classifiedId: classified.id,
            sellerId: classified.author_profile_id,
            proposedPriceCents: classified.price_cents || 0,
            totalPriceCents: classified.price_cents || 0,
            dealType: "service",
            startDate: serviceAppointmentDate,
            isDirectBooking: true,
            terms: `Agendamento de Serviço: ${classified.title}\nData Solicitada: ${serviceAppointmentDate}\nHorário Selecionado: ${serviceAppointmentTime}\nDuração Estimada: ${classified.service_duration_minutes || 60} minutos\nObservações: ${serviceAppointmentNotes.trim() || "Nenhuma"}`,
          },
        });

        toast.success("Solicitação de agendamento enviada! O prestador foi notificado.");
      } else if (isTravelPackage) {
        const depDate = selectedDeparture?.departure_date || "";
        const retDate = selectedDeparture?.return_date || "";
        const depTime = selectedDeparture?.departure_time ? ` às ${selectedDeparture.departure_time}` : "";
        const boarding =
          selectedBoardingPoint ||
          flightDetails?.meeting_point ||
          boardingGateways[0] ||
          "A combinar com a agência";

        await createDealProposal({
          data: {
            classifiedId: classified.id,
            sellerId: classified.author_profile_id,
            proposedPriceCents: travelTotalCents,
            totalPriceCents: travelTotalCents,
            guestsCount: travelPassengers,
            dealType: "travel",
            startDate: depDate || undefined,
            endDate: retDate || undefined,
            isDirectBooking: true,
            terms: `Reserva de Pacote de Viagem: ${classified.title}\nSaída: ${selectedDeparture?.label || "Saída Confirmada"}${depDate ? ` (${depDate}${retDate ? ` até ${retDate}` : ""}${depTime})` : ""}\nLocal de Embarque: ${boarding}\nViajantes: ${travelPassengers} passageiro(s)\nValor por pessoa: ${formatMoney(effectiveTravelUnitPriceCents)}\nTotal: ${formatMoney(travelTotalCents)}`,
          },
        });

        toast.success("Solicitação de reserva de pacote enviada com sucesso! O operador foi notificado.");
      } else {
        if (isDateRangeOverlapping) {
          toast.error("O intervalo de datas selecionado coincide com uma reserva já confirmada.");
          setIsBooking(false);
          return;
        }

        await createDealProposal({
          data: {
            classifiedId: classified.id,
            sellerId: classified.author_profile_id,
            proposedPriceCents: bookingTotalCents,
            totalPriceCents: bookingTotalCents,
            dailyRateCents,
            cleaningFeeCents,
            nightsCount,
            guestsCount: bookingGuests,
            dealType: "rental",
            startDate: checkInDate,
            endDate: checkOutDate,
            isDirectBooking: true,
            terms: `Reserva direta de ${nightsCount} diárias (${checkInDate} a ${checkOutDate}) para ${bookingGuests} hóspede(s).`,
          },
        });

        toast.success("Reserva confirmada! Acompanhe em Minhas Negociações e na sua Agenda.");
      }
      setBookingOpen(false);
      navigate({ to: "/conta/negociacoes" });
    } catch (err: any) {
      console.error("Erro ao reservar:", err);
      toast.error(err?.message || "Erro ao efetuar reserva.");
    } finally {
      setIsBooking(false);
    }
  };

  const handleDirectBuy = async () => {
    if (!classified) return;
    if (viewerContext === "anonymous") {
      toast.info("Identifique-se para continuar a compra com segurança.");
      navigate({
        to: "/entrar",
        search: { returnUrl: `/classificados/${classified.id}` },
      });
      return;
    }
    setIsBuyingDirect(true);
    try {
      await createDealProposal({
        data: {
          classifiedId: classified.id,
          sellerId: classified.author_profile_id,
          proposedPriceCents: classified.price_cents || 0,
          totalPriceCents: classified.price_cents || 0,
          dealType: classified.category === "real_estate" ? "rental" : "sale",
          isDirectBooking: true,
          terms: "Compra direta pelo valor integral anunciado.",
        },
      });

      toast.success("Compra iniciada! Acompanhe o pedido em Minhas Negociações.");
      navigate({ to: "/conta/negociacoes" });
    } catch (err: any) {
      console.error("Erro ao comprar direto:", err);
      toast.error(err?.message || "Erro ao processar compra.");
    } finally {
      setIsBuyingDirect(false);
    }
  };

  const [isDownloadingDigital, setIsDownloadingDigital] = useState(false);

  const handleDownloadDigitalFile = async () => {
    if (!classified) return;
    setIsDownloadingDigital(true);
    try {
      const res = await getDigitalDownloadSignedUrl({
        data: { classifiedId: classified.id },
      });
      if (res?.downloadUrl) {
        window.open(res.downloadUrl, "_blank");
        toast.success(`Download de "${res.fileName}" liberado com sucesso!`);
      } else {
        toast.error("Link de download não disponível no momento.");
      }
    } catch (err: any) {
      console.error("Erro ao baixar arquivo:", err);
      toast.error(err?.message || "Falha ao gerar link de download.");
    } finally {
      setIsDownloadingDigital(false);
    }
  };

  const handleEdit = () => {
    navigate({
      to: "/conta/classificados/novo",
      search: { editId: classified?.id } as any,
    });
  };

  const isConvenienceProduct = Boolean(
    classified?.attributes?.template_style === "conveniencia" ||
    classified?.category === "mercado" ||
    classified?.attributes?.niche === "mercado" ||
    classified?.attributes?.grocery_department ||
    classified?.category === "food" ||
    classified?.attributes?.niche === "gastronomia" ||
    (classified?.title &&
      /drink|whisky|cerveja|refrigerante|energético|vinho|vodka|gin|suco|água mineral|conveniência|fardo|picanha|filé|costela|alcatra|queijo|presunto/i.test(
        classified.title
      ))
  );

  return {
    effectiveIsOwner,
    isOfferExpired,
    isOfferLimitReached,
    isAvailableToOrder,
    companionModalOpen,
    setCompanionModalOpen,
    applyModalOpen,
    setApplyModalOpen,
    proposalOpen,
    setProposalOpen,
    proposalPriceCents,
    setProposalPriceCents,
    proposalPaymentMethod,
    setProposalPaymentMethod,
    proposalInstallments,
    setProposalInstallments,
    proposalDepositCents,
    setProposalDepositCents,
    proposalTerms,
    setProposalTerms,
    isSendingProposal,
    customAnswers,
    setCustomAnswers,
    handleSendProposal,
    bookingOpen,
    setBookingOpen,
    checkInDate,
    setCheckInDate,
    checkOutDate,
    setCheckOutDate,
    bookingGuests,
    setBookingGuests,
    isBooking,
    bookedDates,
    isDateRangeOverlapping,
    nightsCount,
    dailyRateCents,
    cleaningFeeCents,
    bookingTotalCents,
    handleDirectBooking,
    handleDirectBuy,
    isBuyingDirect,
    isDownloadingDigital,
    handleDownloadDigitalFile,
    handleEdit,
    niche,
    isConvenienceProduct,
    isTravelPackage,
    departureOptions,
    flightDetails,
    boardingGateways,
    selectedDeparture,
    setSelectedDeparture,
    travelPassengers,
    setTravelPassengers,
    selectedBoardingPoint,
    setSelectedBoardingPoint,
    effectiveTravelUnitPriceCents,
    isPerPerson,
    travelTotalCents,
    maxInstallments,
    travelInstallmentCents,
    isService,
    serviceAppointmentDate,
    setServiceAppointmentDate,
    serviceAppointmentTime,
    setServiceAppointmentTime,
    serviceAppointmentNotes,
    setServiceAppointmentNotes,
  };
}
