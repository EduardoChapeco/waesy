import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import {
  Printer,
  Download,
  Share2,
  Loader2,
  Check,
  Compass,
  Smartphone,
  FileText,
} from "lucide-react";
import { WhatsappLogo } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { getPublicVoucherByToken } from "@/services/travel-lifecycle.functions";
import { VoucherBoardingCard } from "@/components/tourism/voucher-boarding-card";
import { exportElementAsPdf } from "@/lib/pdf-export";
import {
  DigitalCompanionCard,
  type CompanionCardSectionItem,
  type CompanionRuleItem,
  type CompanionContactItem,
} from "@/components/documents/digital-companion-card";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_store/voucher/$token")({
  head: ({ loaderData }: any) => ({
    meta: [
      {
        title: loaderData?.data?.voucher
          ? `Voucher de Embarque: ${loaderData.data.voucher.destination || "Viagem"} — Waesy`
          : "Voucher de Embarque — Waesy",
      },
    ],
  }),
  loader: async ({ params }) => {
    try {
      const data = await getPublicVoucherByToken({ data: { token: params.token } });
      return { data };
    } catch (err) {
      console.error("[loader:_store.voucher.$token] Unhandled loader error:", err);
      return { data: null };
    }
  },
  component: PublicTravelVoucherPage,
});

function PublicTravelVoucherPage() {
  const { data } = ((Route.useLoaderData?.() as any) || {});
  const [viewMode, setViewMode] = useState<"stories" | "a4">("stories");
  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const [isCopied, setIsCopied] = useState(false);

  if (!data || !data.voucher) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center p-6 text-center space-y-4">
        <div className="size-14 rounded-2xl bg-muted/60 flex items-center justify-center text-muted-foreground">
          <Compass className="size-7" />
        </div>
        <div className="space-y-1">
          <h1 className="text-base font-bold text-foreground">Voucher não encontrado</h1>
          <p className="text-xs text-muted-foreground max-w-sm">
            Este voucher de viagem não está mais disponível ou o link informado expirou.
          </p>
        </div>
        <Button asChild size="sm" variant="outline" className="rounded-xl">
          <Link to="/">Ir para a Página Inicial</Link>
        </Button>
      </div>
    );
  }

  const { voucher, trip, store } = data;

  const handlePrint = () => {
    if (typeof window !== "undefined") {
      window.print();
    }
  };

  const handleExportPdf = async () => {
    try {
      setIsExportingPdf(true);
      await exportElementAsPdf(
        "voucher-printable-area",
        `Voucher_${voucher.voucher_code || "Embarque"}.pdf`
      );
      toast.success("Voucher PDF gerado com sucesso!");
    } catch (err: any) {
      toast.error(err?.message || "Erro ao gerar PDF do voucher.");
    } finally {
      setIsExportingPdf(false);
    }
  };

  const handleCopyLink = () => {
    if (typeof navigator !== "undefined") {
      navigator.clipboard.writeText(window.location.href);
      setIsCopied(true);
      toast.success("Link do voucher copiado!");
      setTimeout(() => setIsCopied(false), 2000);
    }
  };

  const cleanPhone = (store.whatsapp_phone || "").replace(/\D/g, "");

  // Mapeamento dinâmico e seguro para o DigitalCompanionCard 9:16
  const companionSections: CompanionCardSectionItem[] = [];

  (voucher.flights || []).forEach((f: any, idx: number) => {
    companionSections.push({
      id: `flight-${idx}`,
      type: "flight",
      badge: f.locator ? `LOC: ${f.locator}` : "Voo Confirmado",
      title: `${f.airline || "Cia Aérea"} · ${f.flight_number || "Voo"}`,
      subtitle: `${f.origin || "Origem"} ➔ ${f.destination || "Destino"}`,
      details: [
        { label: "Data / Horário", value: `${f.date || ""} ${f.departure_time || ""} ➔ ${f.arrival_time || ""}`.trim(), highlight: true },
        { label: "Localizador", value: f.locator || "Pendente" },
        { label: "Bagagem", value: f.baggage || "1x 10kg mão inclusa" },
        { label: "Classe", value: f.class || "Econômica" },
      ].filter((d) => Boolean(d.value)),
    });
  });

  (voucher.hotels || []).forEach((h: any, idx: number) => {
    companionSections.push({
      id: `hotel-${idx}`,
      type: "hotel",
      badge: h.confirmation ? `Reserva: ${h.confirmation}` : "Hospedagem",
      title: h.name || "Hotel / Pousada",
      subtitle: h.city || "Destino",
      details: [
        { label: "Check-in", value: h.checkin || "-", highlight: true },
        { label: "Check-out", value: h.checkout || "-" },
        { label: "Regime", value: h.meal_plan || "Café da Manhã" },
        { label: "Acomodação", value: h.room_type || "Standard" },
      ].filter((d) => Boolean(d.value)),
    });
  });

  (voucher.transfers || []).forEach((t: any, idx: number) => {
    companionSections.push({
      id: `transfer-${idx}`,
      type: "transport",
      badge: "Receptivo / Transfer",
      title: t.type || "Transfer Executivo",
      subtitle: `${t.origin || "Ponto de Partida"} ➔ ${t.destination || "Ponto de Chegada"}`,
      details: [
        { label: "Data", value: t.date || "-", highlight: true },
        { label: "Horário de Coleta", value: t.pickup_time || "A combinar" },
      ].filter((d) => Boolean(d.value)),
    });
  });

  (voucher.tours || []).forEach((t: any, idx: number) => {
    companionSections.push({
      id: `tour-${idx}`,
      type: "tour",
      badge: "Atividade & Experiência",
      title: t.title || "Passeio Turístico",
      subtitle: t.location || "",
      details: [
        { label: "Data", value: t.date || "-", highlight: true },
        { label: "Duração", value: t.duration || "Meio período" },
      ].filter((d) => Boolean(d.value)),
    });
  });

  if (voucher.insurance && (voucher.insurance.provider || voucher.insurance.policy_number)) {
    companionSections.push({
      id: "insurance",
      type: "insurance",
      badge: "Seguro Garantido",
      title: voucher.insurance.provider || "Seguro Assistência Viagem",
      subtitle: voucher.insurance.policy_number ? `Apólice Nº ${voucher.insurance.policy_number}` : undefined,
      details: [
        { label: "Telefone 24h", value: voucher.insurance.emergency_phone || "0800 24h", highlight: true },
        { label: "Cobertura", value: voucher.insurance.coverage_details || "Assistência Médica Global" },
      ].filter((d) => Boolean(d.value)),
    });
  }

  const companionRules: CompanionRuleItem[] = [
    {
      title: "Apresentação e Check-in no Aeroporto",
      description: "Compareça com antecedência mínima de 2 horas para voos nacionais e 3 horas para voos internacionais.",
      badge: "Aeroporto",
      highlight: true,
    },
    {
      title: "Documentação Oficial Obrigatória",
      description: "Documento oficial com foto (RG ou CNH dentro da validade). Para voos internacionais, passaporte válido.",
      badge: "Documentos",
    },
    {
      title: "Franquia de Bagagem",
      description: "Bagagem de mão de até 10kg inclusa. Verifique as dimensões das companhias aéreas para evitar cobranças de despacho no portão.",
      badge: "Bagagem",
    },
    {
      title: "Horários Hoteleiros",
      description: "Check-in padrão a partir das 14h00 e check-out até 11h00/12h00 conforme política do estabelecimento.",
      badge: "Hospedagem",
    },
  ];

  const companionContacts: CompanionContactItem[] = [
    ...(voucher.emergency_contacts || []).map((c: any) => ({
      name: c.name || c.role || "Contato de Emergência",
      category: c.label || c.role || "Plantão Local",
      phone: c.phone || "",
      whatsapp: true,
      is24h: true,
    })),
    ...(store.whatsapp_phone
      ? [
          {
            name: store.name || "Agência de Viagens",
            category: "Plantão da Agência",
            phone: store.whatsapp_phone,
            whatsapp: true,
            is24h: false,
          },
        ]
      : []),
    ...(voucher.insurance?.emergency_phone
      ? [
          {
            name: voucher.insurance.provider || "Seguradora Assistência",
            category: "Seguro Viagem 24h",
            phone: voucher.insurance.emergency_phone,
            whatsapp: false,
            is24h: true,
          },
        ]
      : []),
  ];

  const participantsList =
    voucher.passengers?.map((p: any) => (typeof p === "string" ? p : p.name)) ||
    (voucher.passenger_name ? [voucher.passenger_name] : []);

  return (
    <div className="min-h-screen bg-muted/20 py-4 sm:py-8 px-0 sm:px-4 md:px-0 space-y-6 animate-in fade-in duration-200">
      {/* ── BARRA DE AÇÕES SUPERIOR (OCULTA NA IMPRESSÃO) ── */}
      <div className="max-w-4xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4 p-4 rounded-2xl bg-card border border-border/80 print:hidden">
        <div className="flex items-center gap-2">
          <div className="size-8 rounded-xl bg-primary/10 flex items-center justify-center text-primary shrink-0">
            <Compass className="size-4" />
          </div>
          <div>
            <h1 className="text-xs font-bold text-foreground">Documento Oficial de Embarque</h1>
            <p className="text-[11px] text-muted-foreground">
              Voucher emitido por <span className="font-semibold text-foreground">{store.name}</span>
            </p>
          </div>
        </div>

        {/* ── SELETOR DE FORMATO APPLE HIG ── */}
        <div className="flex items-center p-1 rounded-xl bg-muted/60 border border-border/60">
          <button
            type="button"
            onClick={() => setViewMode("stories")}
            className={cn(
              "px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer",
              viewMode === "stories"
                ? "bg-background text-foreground shadow-xs"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <Smartphone className="size-3.5" />
            <span>Cartão 9:16 (WhatsApp)</span>
          </button>
          <button
            type="button"
            onClick={() => setViewMode("a4")}
            className={cn(
              "px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer",
              viewMode === "a4"
                ? "bg-background text-foreground shadow-xs"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <FileText className="size-3.5" />
            <span>Voucher A4</span>
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={handleCopyLink}
            className="rounded-xl text-xs font-bold gap-1.5 min-h-[44px] sm:min-h-[36px] h-11 sm:h-9"
          >
            {isCopied ? <Check className="size-3.5 text-emerald-600" /> : <Share2 className="size-3.5" />}
            <span>{isCopied ? "Copiado" : "Compartilhar"}</span>
          </Button>

          {viewMode === "a4" && (
            <>
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={isExportingPdf}
                onClick={handleExportPdf}
                className="rounded-xl text-xs font-bold gap-1.5 min-h-[44px] sm:min-h-[36px] h-11 sm:h-9"
              >
                {isExportingPdf ? (
                  <Loader2 className="size-3.5 animate-spin" />
                ) : (
                  <Download className="size-3.5" />
                )}
                <span>Baixar PDF</span>
              </Button>

              <Button
                type="button"
                size="sm"
                onClick={handlePrint}
                className="rounded-xl text-xs font-bold gap-1.5 min-h-[44px] sm:min-h-[36px] h-11 sm:h-9 bg-foreground text-background hover:bg-foreground/90"
              >
                <Printer className="size-3.5" />
                <span>Imprimir</span>
              </Button>
            </>
          )}

          {cleanPhone && (
            <Button
              asChild
              size="sm"
              className="rounded-xl text-xs font-bold gap-1.5 h-11 sm:h-9 bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              <a
                href={`https://wa.me/55${cleanPhone}?text=Ol%C3%A1%2C%20estou%20com%20meu%20voucher%20${voucher.voucher_code}%20e%20gostaria%20de%20tirar%20uma%20d%C3%BAvida.`}
                target="_blank"
                rel="noopener noreferrer"
              >
                <WhatsappLogo className="size-4" weight="fill" />
                <span>Plantão Agência</span>
              </a>
            </Button>
          )}
        </div>
      </div>

      {/* ── CONTEÚDO PRINCIPAL DE ACORDO COM O MODO ESCOLHIDO ── */}
      {viewMode === "stories" ? (
        <div className="max-w-4xl mx-auto">
          <DigitalCompanionCard
            niche="tourism"
            title={voucher.destination || "Roteiro de Viagem"}
            subtitle={trip?.title || (voucher.start_date ? `Período: ${voucher.start_date} ${voucher.end_date ? `até ${voucher.end_date}` : ""}` : undefined)}
            code={voucher.voucher_code}
            companyName={store.name}
            companyLogoUrl={store.logo_url}
            coverImageUrl={voucher.cover_image_url}
            participantsLabel="Viajantes"
            participants={participantsList}
            sections={companionSections}
            rules={companionRules}
            emergencyContacts={companionContacts}
            observations={voucher.important_notes}
            publicUrl={typeof window !== "undefined" ? window.location.href : undefined}
          />
        </div>
      ) : (
        <VoucherBoardingCard
          voucher={voucher}
          tripNumber={trip?.trip_number}
          agency={{
            name: store.name,
            logo_url: store.logo_url,
            whatsapp_phone: store.whatsapp_phone,
          }}
        />
      )}
    </div>
  );
}
