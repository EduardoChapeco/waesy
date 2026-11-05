/**
 * Template 6: Catálogo de Grupo Rodoviário
 * Focado em venda massiva (Catálogo de Grupos). Muita foto, botão de ação rápido, layout compacto.
 */
import { type Proposal } from "@/services/proposals";
import { formatCurrency, formatDate } from "@/lib/formatters";
import { buildBaseViewModel } from "@/lib/adapters";
import { Users, MapPin, Calendar, Clock, Bus, CheckCircle2, Building2, Sparkles, Plane } from "lucide-react";

interface TemplateProps {
  proposal: Proposal;
  agency: any;
}

export default function TemplateGroupCatalog({ proposal: p, agency }: TemplateProps) {
  const vm = buildBaseViewModel(p, agency);
  const brand = vm.agency.brand_color;

  return (
    <div className="flex flex-col w-full font-sans bg-slate-50 text-slate-900 pb-16">
      {/* CAPA - ESTILO BANNER DE E-COMMERCE */}
      <div className="relative w-full h-100 break-inside-avoid overflow-hidden">
        {p.cover_image_url ? (
          <img
            src={p.cover_image_url}
            crossOrigin="anonymous"
            className="absolute inset-0 w-full h-full object-cover"
          />
        ) : (
          <div className="absolute inset-0 w-full h-full bg-slate-900" />
        )}
        <div className="absolute inset-0 bg-black/60" />

        <div className="absolute top-8 left-8">
          {vm.agency.logo_url ? (
            <img
              src={vm.agency.logo_url}
              crossOrigin="anonymous"
              alt="Logo"
              className="h-10 w-auto max-w-40 aspect-4/1 object-contain drop-shadow-md"
              width={160}
              height={40}
            />
          ) : (
            <div className="text-xl font-black tracking-tighter text-white uppercase drop-shadow-md">
              {vm.agency.name}
            </div>
          )}
        </div>

        <div className="absolute bottom-12 left-12 max-w-xl text-white">
          {(p as any).package_type === "group" || (p as any).is_group ? (
            <div className="inline-flex items-center gap-2 bg-red-600 text-white px-3 py-1 rounded-full ds-meta font-black uppercase tracking-widest mb-4 shadow-sm">
              <Users className="w-3 h-3" /> Excursão em Grupo
            </div>
          ) : (
            <div className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-3 py-1 rounded-full ds-meta font-black uppercase tracking-widest mb-4 shadow-sm">
              <Sparkles className="w-3 h-3" /> Proposta de Viagem
            </div>
          )}
          <h1
            className="text-5xl font-black tracking-tighter mb-4 leading-none text-white drop-shadow-md"
            style={{ color: "#ffffff", textShadow: "0 4px 12px rgba(0,0,0,0.8)" }}
          >
            {p.title || "Proposta de Viagem"}
          </h1>
          <div className="flex items-center gap-4 font-bold text-lg text-white/95">
            <div className="flex items-center gap-2">
              <MapPin className="w-5 h-5 text-red-500" /> {p.destination || "Destino"}
            </div>
            <div className="w-1.5 h-1.5 rounded-full bg-white/50" />
            <div className="flex items-center gap-2">
              <Calendar className="w-5 h-5 text-red-500" />{" "}
              {p.travel_start ? formatDate(p.travel_start) : "A definir"}
            </div>
          </div>
        </div>
      </div>

      <div className="px-12 py-12 grid grid-cols-1 sm:grid-cols-3 gap-8">
        {/* COLUNA ESQUERDA - DESCRIÇÃO E ROTEIRO (Ocupa 2 colunas) */}
        <div className="col-span-2 space-y-8">
          <div className="bg-card rounded-lg p-8 border border-slate-200 break-inside-avoid">
            <h2 className="text-2xl font-black text-slate-900 uppercase tracking-tighter mb-4">
              Sobre a Viagem
            </h2>
            <p className="text-slate-600 leading-relaxed text-lg">
              {p.notes ||
                p.description ||
                (p as any).subtitle ||
                `Um roteiro cuidadosamente planejado para você aproveitar o melhor de ${p.destination || "seu destino"} com total conforto, segurança e assistência.`}
            </p>
          </div>

          {vm.hasItinerary && (
            <div className="bg-card rounded-lg p-8 border border-slate-200 break-inside-avoid">
              <h2 className="text-2xl font-black text-slate-900 uppercase tracking-tighter mb-6">
                Programação
              </h2>
              <div className="space-y-6">
                {p.itinerary!.map((d, i) => (
                  <div key={i} className="flex gap-4 break-inside-avoid">
                    <div className="w-16 shrink-0 flex flex-col items-center">
                      <div
                        className="w-10 h-10 rounded-full flex items-center justify-center font-black text-foreground"
                        style={{ backgroundColor: brand }}
                      >
                        {i + 1}
                      </div>
                      {i !== p.itinerary!.length - 1 && (
                        <div className="w-1 bg-slate-100 flex-1 my-2" />
                      )}
                    </div>
                    <div className="flex-1 pb-6">
                      <h4 className="text-lg font-bold text-slate-900 mb-2">{d.title}</h4>
                      <p className="text-slate-600 text-sm leading-relaxed">{d.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* COLUNA DIREITA - PAINEL DE VENDAS */}
        <div className="space-y-6">
          <div
            className="bg-card border-2 rounded-lg p-6 sticky top-8 break-inside-avoid"
            style={{ borderColor: brand }}
          >
            <div className="text-center mb-6 border-b border-slate-100 pb-6">
              <div className="ds-label-caps text-slate-400 mb-1">A partir de</div>
              <div className="text-5xl font-black tracking-tighter text-slate-900">
                <span className="text-2xl align-top">R$</span>{" "}
                {Math.floor(vm.totals.valorParcelaCartao)}
                <span className="text-2xl">
                  ,{(vm.totals.valorParcelaCartao % 1).toFixed(2).substring(2)}
                </span>
              </div>
              <div className="text-sm font-bold text-slate-500 mt-1">
                Por pessoa em até {vm.totals.parcelasCartao}x s/ juros
              </div>
            </div>

            <div className="space-y-3 mb-6">
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-500 font-bold">À vista no PIX</span>
                <span className="font-black text-emerald-600">
                  {formatCurrency(vm.totals.totalPix, p.currency)}
                </span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-500 font-bold">Valor Total Parcelado</span>
                <span className="font-black text-slate-900">
                  {formatCurrency(vm.totals.total, p.currency)}
                </span>
              </div>
            </div>

            <div
              className="w-full py-4 rounded-card text-center text-white font-black uppercase tracking-widest text-lg border-b-4 shadow-sm"
              style={{ backgroundColor: brand, borderBottomColor: "rgba(0,0,0,0.3)" }}
            >
              {(p as any).package_type === "group" ? "Garantir Vaga" : "Aprovar Proposta"}
            </div>
            {Boolean((p as any).package_type === "group" && (p as any).remaining_spots) && (
              <div className="text-center text-xs text-slate-500 font-bold mt-4">
                {(p as any).remaining_spots} vagas restantes
              </div>
            )}
          </div>

          <div className="bg-card rounded-lg p-6 border border-slate-200 break-inside-avoid">
            <h3 className="font-black text-slate-900 uppercase tracking-tighter mb-4 text-lg">
              O Pacote Inclui
            </h3>
            <ul className="space-y-3">
              {vm.hasTransfers && (
                <li className="flex items-start gap-2 text-sm font-semibold text-slate-700">
                  <Bus className="w-4 h-4 text-slate-400 shrink-0 mt-1" />
                  {p.transfers?.[0]?.description || "Transporte / Transfer Incluso"}
                </li>
              )}
              {vm.hasFlights && (
                <li className="flex items-start gap-2 text-sm font-semibold text-slate-700">
                  <Plane className="w-4 h-4 text-slate-400 shrink-0 mt-1" />
                  Passagens Aéreas Ida e Volta
                </li>
              )}
              {vm.hasHotels && (
                <li className="flex items-start gap-2 text-sm font-semibold text-slate-700">
                  <Building2 className="w-4 h-4 text-slate-400 shrink-0 mt-1" />
                  Hospedagem com Café da Manhã
                </li>
              )}
              {p.includes?.map((inc, i) => (
                <li key={i} className="flex items-start gap-2 text-sm font-semibold text-slate-700">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-1" />
                  {inc}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
