import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { formatMoney } from "@/lib/money";
import {
  DigitalCompanionCard,
  type DigitalCompanionCardProps,
  type CompanionCardNiche,
  type CompanionCardSectionItem,
  type CompanionRuleItem,
  type CompanionContactItem,
} from "@/components/documents/digital-companion-card";

export function buildClassifiedCompanionData(classified: any): DigitalCompanionCardProps {
  const attrs = classified?.attributes || {};
  const cat = (classified?.category || "").toLowerCase();

  const nicheType: CompanionCardNiche =
    cat === "real_estate" || cat === "imoveis" || cat === "hospedagem" || cat === "temporada"
      ? "real_estate"
      : cat === "vehicles" || cat === "veiculos" || cat === "automotivo" || cat === "auto"
        ? "auto"
        : cat === "services" || cat === "servicos"
          ? "service"
          : cat === "travel" || cat === "viagem" || cat === "turismo"
            ? "tourism"
            : "retail";

  const title = classified?.title || "Anúncio Waesy";
  const subtitle = [classified?.city, classified?.state].filter(Boolean).join(" - ") || "Brasil";
  const code = classified?.id?.slice(0, 8).toUpperCase() || "WAESY";
  const companyName = classified?.store_name || classified?.profiles?.full_name || "Waesy Comunidade";
  const companyLogoUrl = classified?.profiles?.avatar_url || undefined;
  const price = classified?.price_cents ? formatMoney(classified.price_cents) : "Sob Consulta";

  const sections: CompanionCardSectionItem[] = [
    {
      type: "custom",
      badge: "Detalhes Comerciais",
      title,
      subtitle,
      details: [
        { label: "Valor Anunciado", value: price, highlight: true },
        ...(classified?.condition ? [{ label: "Condição", value: classified.condition === "new" ? "Novo" : "Usado" }] : []),
        ...(attrs.delivery_available ? [{ label: "Entrega", value: "Disponível" }] : []),
        ...(classified?.address ? [{ label: "Local", value: classified.address }] : []),
      ],
    },
  ];

  const rules: CompanionRuleItem[] = [];

  const sellerPhone =
    classified?.contact_whatsapp ||
    classified?.whatsapp ||
    classified?.store?.settings?.whatsapp_phone ||
    classified?.profiles?.phone;

  const emergencyContacts: CompanionContactItem[] = [
    ...(sellerPhone
      ? [
          {
            name: companyName,
            category: "Anunciante / Vendedor",
            phone: sellerPhone,
            whatsapp: true,
            is24h: false,
          },
        ]
      : []),
    {
      name: "Suporte Waesy",
      category: "Central de Ajuda",
      phone: "0800 000 0000",
      whatsapp: true,
      is24h: true,
    },
  ];

  return {
    niche: nicheType,
    title,
    subtitle,
    code,
    companyName,
    companyLogoUrl,
    participantsLabel: "Interessado",
    participants: [],
    sections,
    rules,
    emergencyContacts,
    observations: classified?.content?.slice(0, 300) || undefined,
  };
}

interface ClassifiedCompanionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  classified: any;
}

export function ClassifiedCompanionDialog({
  open,
  onOpenChange,
  classified,
}: ClassifiedCompanionDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-screen overflow-y-auto p-4 sm:p-6 rounded-lg bg-background border border-border shadow-xs">
        <DialogHeader className="sr-only">
          <DialogTitle>Guia Digital 9:16 do Anúncio</DialogTitle>
          <DialogDescription>Cartão e guia digital interativo do anúncio</DialogDescription>
        </DialogHeader>
        {classified && (
          <div className="w-full">
            <DigitalCompanionCard {...buildClassifiedCompanionData(classified)} />
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
