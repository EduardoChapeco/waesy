import React from "react";
import {
  CheckCircle2,
  Sparkles,
  MapPin,
  Ticket,
  Star,
  ShoppingBag,
  Clock,
  Share2,
} from "lucide-react";
import { WhatsappLogo } from "@phosphor-icons/react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import type { CnpjCompanyDTO } from "@/services/public-apis.functions";

interface FounderSmartphoneMockupProps {
  companyName: string;
  responsibleName: string;
  whatsapp: string;
  ticketNumber: string;
  city?: string;
  companyDetails?: CnpjCompanyDTO | null;
  onReset?: () => void;
}

export function FounderSmartphoneMockup({
  companyName,
  responsibleName,
  whatsapp,
  ticketNumber,
  city = "Chapecó / SMO - SC",
  companyDetails,
  onReset,
}: FounderSmartphoneMockupProps) {
  const displayCity = companyDetails?.address?.city
    ? `${companyDetails.address.city} - ${companyDetails.address.state}`
    : city;

  const segment =
    companyDetails?.mainCnae?.description ||
    "Comércio, Turismo & Experiências Regionais";

  const sampleProducts = React.useMemo(() => {
    const desc = (segment || "").toLowerCase();
    if (desc.includes("restaurante") || desc.includes("alimento") || desc.includes("lanche") || desc.includes("pizz") || desc.includes("padaria") || desc.includes("bar")) {
      return [
        { name: "Prato Especial da Casa", price: "R$ 49,90", image: "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=400&q=80" },
        { name: "Combo Executivo", price: "R$ 38,00", image: "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=400&q=80" },
        { name: "Sobremesa Artesanal", price: "R$ 18,90", image: "https://images.unsplash.com/photo-1551024709-8f23befc6f87?auto=format&fit=crop&w=400&q=80" },
      ];
    }
    if (desc.includes("hotel") || desc.includes("pousada") || desc.includes("turis") || desc.includes("viag") || desc.includes("hospedag")) {
      return [
        { name: "Diária Suíte Master", price: "R$ 280,00", image: "https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=400&q=80" },
        { name: "Passeio Regional Guiado", price: "R$ 95,00", image: "https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?auto=format&fit=crop&w=400&q=80" },
        { name: "Pacote Fim de Semana", price: "R$ 520,00", image: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=400&q=80" },
      ];
    }
    if (desc.includes("vestu") || desc.includes("calcado") || desc.includes("roupa") || desc.includes("moda") || desc.includes("loja")) {
      return [
        { name: "Peça Coleção 2027", price: "R$ 129,90", image: "https://images.unsplash.com/photo-1445205170230-053b83016050?auto=format&fit=crop&w=400&q=80" },
        { name: "Calçado Couro Legítimo", price: "R$ 189,00", image: "https://images.unsplash.com/photo-1549298916-b41d501d3772?auto=format&fit=crop&w=400&q=80" },
        { name: "Acessório Premium", price: "R$ 59,90", image: "https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=400&q=80" },
      ];
    }
    if (desc.includes("veiculo") || desc.includes("auto") || desc.includes("mecanic") || desc.includes("oficina")) {
      return [
        { name: "Revisão Preventiva", price: "R$ 180,00", image: "https://images.unsplash.com/photo-1486006920555-c77dce18193b?auto=format&fit=crop&w=400&q=80" },
        { name: "Alinhamento & Balanceamento", price: "R$ 90,00", image: "https://images.unsplash.com/photo-1619642751034-765dfdf7c58e?auto=format&fit=crop&w=400&q=80" },
        { name: "Troca de Óleo Completa", price: "R$ 210,00", image: "https://images.unsplash.com/photo-1517524008697-84bbe3c3fd98?auto=format&fit=crop&w=400&q=80" },
      ];
    }
    if (desc.includes("estetica") || desc.includes("saude") || desc.includes("beleza") || desc.includes("odonto") || desc.includes("cabelo")) {
      return [
        { name: "Sessão Especial", price: "R$ 110,00", image: "https://images.unsplash.com/photo-1560750588-73207b1ef5b8?auto=format&fit=crop&w=400&q=80" },
        { name: "Consulta Especializada", price: "R$ 150,00", image: "https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?auto=format&fit=crop&w=400&q=80" },
        { name: "Procedimento Facial", price: "R$ 190,00", image: "https://images.unsplash.com/photo-1570172619644-dfd03ed5d881?auto=format&fit=crop&w=400&q=80" },
      ];
    }
    return [
      { name: "Experiência Especial", price: "R$ 89,90", image: "https://images.unsplash.com/photo-1544816155-12df9643f363?auto=format&fit=crop&w=400&q=80" },
      { name: "Reserva Premium", price: "R$ 149,00", image: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=400&q=80" },
      { name: "Combo Fundador", price: "R$ 199,00", image: "https://images.unsplash.com/photo-1526304640581-d334cdbbf45e?auto=format&fit=crop&w=400&q=80" },
    ];
  }, [segment]);

  const handleShare = () => {
    const text = `Conheça a ${companyName} no Circuito Waesy 2027! Ticket: ${ticketNumber}`;
    const url = window.location.href;
    if (navigator.share) {
      navigator.share({ title: `${companyName} na Waesy`, text, url }).catch(() => {});
    } else if (navigator.clipboard) {
      navigator.clipboard.writeText(`${text}\n${url}`);
      toast.success("Link copiado para a área de transferência!");
    } else {
      toast.info(`Ticket da Sorte: ${ticketNumber}`);
    }
  };

  const cleanWa = whatsapp.replace(/\D/g, "");

  return (
    <div className="w-full max-w-lg sm:max-w-sm mx-auto animate-in zoom-in-95 duration-500">
      {/* Moldura do Smartphone Adaptativa: Card fluido no Mobile, Bezel Apple no Desktop */}
      <div className="relative rounded-2xl sm:rounded-[2.5rem] border border-border/80 sm:border-[6px] sm:border-neutral-900 bg-card shadow-md sm:shadow-2xl overflow-hidden ring-0 sm:ring-1 sm:ring-border/80">
        {/* Dynamic Island / Notch — Apenas Desktop/Tablet */}
        <div className="hidden sm:flex absolute top-2.5 left-1/2 -translate-x-1/2 w-28 h-4.5 bg-neutral-900 rounded-full z-30 items-center justify-between px-2.5">
          <div className="size-2 rounded-full bg-neutral-800" />
          <div className="size-1.5 rounded-full bg-sky-500/40" />
        </div>

        {/* Barra de Status — Apenas Desktop/Tablet */}
        <div className="hidden sm:flex pt-2 px-6 pb-2 items-center justify-between text-[11px] font-bold text-muted-foreground z-20 relative bg-background/80 backdrop-blur-xs">
          <span>09:41</span>
          <div className="flex items-center gap-1.5 text-[10px]">
            <span>5G</span>
            <span>100%</span>
          </div>
        </div>

        {/* Conteúdo do Perfil da Empresa */}
        <div className="p-3.5 sm:px-4 sm:pt-2 sm:pb-6 space-y-4 max-h-none sm:max-h-[580px] overflow-y-visible sm:overflow-y-auto scrollbar-none text-left">
          {/* Topo do Perfil com Avatar e Capa Compacta */}
          <div className="flex items-center gap-3">
            <div className="size-16 rounded-2xl bg-gradient-to-br from-primary/20 via-primary/5 to-muted border border-border flex items-center justify-center font-bold text-xl text-primary shrink-0 shadow-xs uppercase">
              {companyName.charAt(0) || "W"}
            </div>
            <div className="min-w-0 flex-1 space-y-1">
              <div className="flex items-center gap-1.5">
                <h3 className="text-sm font-bold text-foreground truncate leading-tight">
                  {companyName}
                </h3>
                <CheckCircle2 className="size-3.5 text-primary shrink-0 fill-primary/20" />
              </div>
              <p className="text-[11px] text-muted-foreground truncate flex items-center gap-1">
                <MapPin className="size-3 text-muted-foreground/70 shrink-0" />
                <span>{displayCity}</span>
              </p>
              <div className="flex items-center gap-2 text-[10px] font-medium text-muted-foreground">
                <span className="flex items-center gap-0.5 text-amber-500 font-bold">
                  <Star className="size-3 fill-amber-400 text-amber-400" /> 5.0
                </span>
                <span>•</span>
                <span className="text-emerald-600 font-semibold flex items-center gap-1">
                  <Clock className="size-2.5" /> Aberto agora
                </span>
              </div>
            </div>
          </div>

          {/* Badge Oficial de Membro Fundador */}
          <div className="rounded-2xl bg-gradient-to-r from-amber-500/15 via-amber-500/10 to-transparent border border-amber-500/30 p-3 space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-amber-600 dark:text-amber-400 flex items-center gap-1.5">
                <Sparkles className="size-3 text-amber-500" />
                Membro Fundador 2027
              </span>
              <Badge variant="outline" className="bg-amber-500/20 text-amber-600 border-amber-500/30 text-[9px] font-mono font-bold">
                OFICIAL
              </Badge>
            </div>
            <p className="text-[10px] text-muted-foreground leading-relaxed">
              Empresa credenciada no Circuito Internacional Waesy Chapecó & SMO.
            </p>
          </div>

          {/* Cartão de Sorteio de Viagens (Número da Sorte) */}
          <div className="rounded-2xl bg-primary/10 border border-primary/20 p-3 space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-primary flex items-center gap-1">
                <Ticket className="size-3.5" />
                Sorteio de Viagens 2027
              </span>
              <span className="text-[10px] text-primary/80 font-medium">Chances 2x</span>
            </div>
            <div className="flex items-center justify-between bg-card/80 rounded-xl px-3 py-1.5 border border-border/80">
              <span className="text-xs font-mono font-bold text-foreground">
                {ticketNumber}
              </span>
              <span className="text-[9px] font-semibold text-emerald-600 bg-emerald-500/10 px-1.5 py-0.5 rounded-md">
                Ativo
              </span>
            </div>
          </div>

          {/* Botões de Ação Rápida */}
          <div className="grid grid-cols-2 gap-2 pt-1">
            <Button
              asChild
              size="sm"
              className="w-full rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white h-10 gap-1.5 shadow-xs"
            >
              <a
                href={cleanWa ? `https://wa.me/55${cleanWa}` : "#"}
                target="_blank"
                rel="noreferrer"
              >
                <WhatsappLogo className="size-4" weight="fill" />
                <span>WhatsApp</span>
              </a>
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="w-full rounded-xl text-xs font-bold h-10 gap-1.5 border-border"
              onClick={handleShare}
            >
              <Share2 className="size-3.5" />
              <span>Compartilhar</span>
            </Button>
          </div>

          {/* Vitrine Demonstrativa de Produtos */}
          <div className="space-y-2 pt-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                <ShoppingBag className="size-3.5 text-primary" />
                Vitrine Digital da Loja
              </span>
              <span className="text-[10px] text-muted-foreground">3 itens ativos</span>
            </div>

            <div className="grid grid-cols-3 gap-2">
              {sampleProducts.map((p, idx) => (
                <div
                  key={idx}
                  onClick={() => toast.info(`Demonstração: ${p.name}`, { description: `Valor anunciado: ${p.price}. No app Waesy, seus clientes compram em até 3 toques com Pix instantâneo.` })}
                  className="rounded-xl border border-border/80 bg-muted/20 hover:bg-muted/50 overflow-hidden space-y-1 p-1 text-center cursor-pointer transition-all active:scale-95"
                >
                  <img
                    src={p.image}
                    alt={p.name}
                    className="w-full aspect-square object-cover rounded-lg"
                    loading="lazy"
                  />
                  <p className="text-[9px] font-semibold text-foreground truncate px-0.5">
                    {p.name}
                  </p>
                  <p className="text-[10px] font-bold text-primary font-mono">
                    {p.price}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Informações Oficiais de Enriquecimento (se houver CNPJ) */}
          {companyDetails && (
            <div className="pt-2 border-t border-border/60 text-[10px] text-muted-foreground space-y-0.5">
              <p className="truncate">
                <strong className="text-foreground">Razão Social:</strong> {companyDetails.corporateName}
              </p>
              <p className="truncate">
                <strong className="text-foreground">Atividade:</strong> {segment}
              </p>
              <p className="truncate">
                <strong className="text-foreground">Responsável:</strong> {responsibleName}
              </p>
            </div>
          )}
        </div>

        {/* Barra inferior do celular — Apenas Desktop/Tablet */}
        <div className="hidden sm:flex py-2 justify-center bg-background/80 border-t border-border/40">
          <div className="w-28 h-1 bg-muted-foreground/30 rounded-full" />
        </div>
      </div>

      {onReset && (
        <div className="text-center pt-3">
          <button
            type="button"
            onClick={onReset}
            className="text-xs text-muted-foreground hover:text-foreground font-medium underline underline-offset-4 cursor-pointer"
          >
            Cadastrar outra empresa na lista
          </button>
        </div>
      )}
    </div>
  );
}
