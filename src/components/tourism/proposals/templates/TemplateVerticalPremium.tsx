import { type Proposal } from "@/services/proposals";
import { formatCurrency, formatDate } from "@/lib/formatters";
import { buildBaseViewModel } from "@/lib/adapters";
import { Check, X, PhoneCall, Calendar, MapPin, Plane, Hotel } from "lucide-react";

interface TemplateProps {
  proposal: Proposal;
  agency: any;
}

export default function TemplateVerticalPremium({ proposal: p, agency }: TemplateProps) {
  const vm = buildBaseViewModel(p, agency);
  const brand = "var(--brand-primary, " + (vm.agency.brand_color || "#174784") + ")";
  const brandFg = vm.agency.brand_color_fg ?? "#FFFFFF";
  const brandLight = "var(--brand-primary-light, #3F82C9)";
  const bgMain = "var(--background-main, #F4F9FE)";

  return (
    <div
      className="flex flex-col w-full text-slate-900 overflow-x-hidden relative pb-10"
      style={{
        fontFamily: "var(--brand-body-font, 'Inter', sans-serif)",
        backgroundColor: bgMain,
      }}
    >
      {/* 5.1 SEÇÃO HERO / CAPA */}
      <div className="w-full bg-white relative px-4 sm:px-8 lg:px-14 py-8 sm:py-12 lg:py-16">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8">
          {/* Coluna Esquerda (~50% no Desktop) */}
          <div className="lg:col-span-6 flex flex-col justify-center pr-0 lg:pr-3">
            <div
              className="inline-flex items-center gap-2 rounded-full px-3 sm:px-4 py-2 sm:py-2 mb-4 sm:mb-6 w-max"
              style={{ backgroundColor: brand, color: brandFg }}
            >
              <Calendar className="w-4 h-4 shrink-0" />
              <span className="text-xs sm:text-sm font-semibold tracking-wide">
                {p.travel_start ? formatDate(p.travel_start) : "Data a definir"}
                {p.travel_end && ` a ${formatDate(p.travel_end)}`}
              </span>
            </div>

            <h1
              className="text-3xl sm:text-5xl lg:text-7xl leading-tight sm:leading-none mb-3 sm:mb-4 text-slate-900"
              style={{ fontFamily: "var(--brand-heading-font, 'Playfair Display', serif)" }}
            >
              {p.title || "Roteiro Exclusivo"}
            </h1>

            {p.destination && (
              <h2 className="text-xl sm:text-2xl lg:text-4xl leading-snug mb-3 text-slate-600 font-light">
                {p.destination}
              </h2>
            )}

            <p className="text-sm sm:text-base lg:text-xl leading-relaxed text-slate-500 mb-6 sm:mb-8 max-w-full lg:max-w-[95%]">
              {p.notes ||
                "Um roteiro desenhado sob medida para você aproveitar o melhor da sua viagem."}
            </p>

            {/* Galeria Inferior do Hero */}
            <div className="flex flex-wrap sm:flex-nowrap gap-3 sm:gap-4 mt-auto">
              {p.cover_image_url && (
                <img
                  src={p.cover_image_url}
                  alt="Galeria 1"
                  crossOrigin="anonymous"
                  className="w-24 sm:w-36 lg:w-44 h-16 sm:h-24 lg:h-28 object-cover rounded-lg sm:rounded-lg border-2 sm:border-4 border-slate-50 shadow-sm"
                />
              )}
              {p.map_image_url && (
                <img
                  src={p.map_image_url}
                  alt="Galeria 2"
                  crossOrigin="anonymous"
                  className="w-24 sm:w-36 lg:w-44 h-16 sm:h-24 lg:h-28 object-cover rounded-lg sm:rounded-lg border-2 sm:border-4 border-slate-50 shadow-sm"
                />
              )}
              {!p.cover_image_url &&
                !p.map_image_url &&
                vm.hasItinerary &&
                p.itinerary![0]?.images?.[0] && (
                  <img
                    src={p.itinerary![0].images[0]}
                    alt="Galeria Roteiro"
                    crossOrigin="anonymous"
                    className="w-24 sm:w-36 lg:w-44 h-16 sm:h-24 lg:h-28 object-cover rounded-lg sm:rounded-lg border-2 sm:border-4 border-slate-50 shadow-sm"
                  />
                )}
            </div>
          </div>

          {/* Coluna Direita (~50% no Desktop) */}
          <div className="lg:col-span-6 relative flex justify-center lg:justify-end pl-0 lg:pl-5">
            {p.cover_image_url ? (
              <img
                src={p.cover_image_url}
                alt="Destino Principal"
                crossOrigin="anonymous"
                className="w-full h-auto min-h-[260px] sm:min-h-[400px] lg:min-h-[580px] object-cover rounded-lg sm:rounded-lg"
              />
            ) : (
              <div className="w-full h-auto min-h-[260px] sm:min-h-[400px] lg:min-h-[580px] bg-slate-100 rounded-lg sm:rounded-lg" />
            )}

            {/* Medalhão da Logo */}
            {vm.agency.logo_url && (
              <div className="absolute left-4 lg:-left-6 top-4 lg:top-[40%] bg-white p-2 sm:p-3 rounded-full shadow-md">
                <div className="w-14 sm:w-20 h-14 sm:h-20 rounded-full overflow-hidden flex items-center justify-center bg-white border border-slate-100">
                  <img
                    src={vm.agency.logo_url}
                    alt={vm.agency.name}
                    crossOrigin="anonymous"
                    className="w-[85%] h-[85%] object-contain"
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 5.2 TRANSIÇÃO E 6. CABEÇALHO DO CRONOGRAMA */}
      <div className="px-4 sm:px-8 lg:px-14 py-8 sm:py-12">
        {vm.hasItinerary && (
          <div className="mb-8 sm:mb-12">
            <div
              className="text-xs sm:text-sm uppercase tracking-wider font-bold mb-2"
              style={{ color: brandLight }}
            >
              Cronograma Completo
            </div>
            <h2
              className="text-2xl sm:text-4xl lg:text-5xl leading-tight text-slate-900"
              style={{ fontFamily: "var(--brand-heading-font, 'Playfair Display', serif)" }}
            >
              Nosso roteiro será assim...
            </h2>
          </div>
        )}

        {/* 7. CARDS DINÂMICOS DO DIA A DIA */}
        {vm.hasItinerary && (
          <div className="flex flex-col gap-6 sm:gap-8">
            {p.itinerary!.map((day, idx) => {
              const dayImages = day.images || [];
              const layoutVariant =
                day.imageLayout ||
                (dayImages.length === 0 ? "none" : dayImages.length === 1 ? "single" : "stack");

              return (
                <div
                  key={day.id || idx}
                  className="bg-white rounded-lg sm:rounded-lg border border-blue-100 p-4 sm:p-6 lg:p-8 shadow-sm overflow-visible"
                >
                  <div className="flex items-center gap-3 sm:gap-4 mb-4 sm:mb-6">
                    <div
                      className="w-10 sm:w-12 h-10 sm:h-12 rounded-full flex items-center justify-center text-base sm:text-xl font-bold text-white shrink-0"
                      style={{ backgroundColor: brand }}
                    >
                      {idx + 1}
                    </div>
                    <div>
                      <h3 className="text-lg sm:text-xl lg:text-2xl font-bold text-slate-900 leading-tight">
                        {day.title || `Dia ${idx + 1}`}
                      </h3>
                      {(day.day || day.city) && (
                        <div className="text-xs sm:text-sm text-slate-500 font-semibold uppercase tracking-wide mt-1 flex items-center gap-2">
                          {day.day && <span>{day.day}</span>}
                          {day.day && day.city && <span className="opacity-50">•</span>}
                          {day.city && <span>{day.city}</span>}
                        </div>
                      )}
                    </div>
                  </div>

                  <div
                    className={`grid ${layoutVariant !== "none" ? "grid-cols-1 lg:grid-cols-12 gap-4 lg:gap-8" : "grid-cols-1"}`}
                  >
                    <div className={`${layoutVariant !== "none" ? "lg:col-span-7" : "col-span-1"}`}>
                      <p className="text-sm sm:text-base lg:text-lg leading-relaxed text-slate-700 whitespace-pre-wrap">
                        {day.description}
                      </p>

                      {/* Atributos Extras do Dia (Opcional) */}
                      {(day.meals?.length || day.overnight) && (
                        <div className="mt-4 sm:mt-6 flex flex-wrap gap-2 sm:gap-3">
                          {day.meals?.map((meal, mIdx) => (
                            <span
                              key={mIdx}
                              className="bg-orange-50 text-orange-700 px-3 py-1 rounded-full text-xs sm:text-sm font-semibold flex items-center gap-2"
                            >
                              • {meal}
                            </span>
                          ))}
                          {day.overnight && (
                            <span className="bg-blue-50 text-blue-700 px-3 py-1 rounded-full text-xs sm:text-sm font-semibold flex items-center gap-2">
                              <Hotel className="w-4 h-4 shrink-0" /> Pernoite: {day.overnight}
                            </span>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Imagens do dia */}
                    {layoutVariant !== "none" && dayImages.length > 0 && (
                      <div className="lg:col-span-5 relative flex flex-col gap-3">
                        {layoutVariant === "single" || dayImages.length === 1 ? (
                          <img
                            src={dayImages[0]}
                            crossOrigin="anonymous"
                            className="w-full h-full min-h-[200px] sm:min-h-[260px] object-cover rounded-lg sm:rounded-lg"
                          />
                        ) : (
                          <div className="flex flex-col gap-3 h-full">
                            {dayImages.slice(0, 3).map((imgUrl, imgIdx) => (
                              <img
                                key={imgIdx}
                                src={imgUrl}
                                crossOrigin="anonymous"
                                className="w-full flex-1 min-h-[120px] object-cover rounded-lg sm:rounded-lg"
                              />
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* 9. DETALHES DA VIAGEM / INCLUSÕES */}
        {(vm.hasIncludes || vm.hasExcludes) && (
          <div className="mt-8 sm:mt-14 grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8">
            {vm.hasIncludes && (
              <div
                className={`${vm.hasExcludes ? "lg:col-span-6" : "col-span-12"} bg-white rounded-lg sm:rounded-lg p-6 sm:p-8 border border-blue-100 shadow-sm`}
              >
                <h2
                  className="text-xl sm:text-2xl lg:text-3xl font-bold mb-4 sm:mb-6"
                  style={{
                    fontFamily: "var(--brand-heading-font, 'Playfair Display', serif)",
                    color: brand,
                  }}
                >
                  O que está incluso
                </h2>
                <ul className="space-y-3">
                  {p.includes!.map((inc, i) => (
                    <li key={i} className="flex items-start gap-3 text-sm sm:text-base text-slate-700">
                      <div className="bg-emerald-100 p-1 rounded-full shrink-0 mt-1">
                        <Check className="w-4 h-4 text-emerald-600" />
                      </div>
                      <span className="leading-snug">{inc}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {vm.hasExcludes && (
              <div
                className={`${vm.hasIncludes ? "lg:col-span-6" : "col-span-12"} bg-slate-50 rounded-lg sm:rounded-lg p-6 sm:p-8 border border-slate-200`}
              >
                <h2
                  className="text-xl sm:text-2xl lg:text-3xl font-bold mb-4 sm:mb-6"
                  style={{
                    fontFamily: "var(--brand-heading-font, 'Playfair Display', serif)",
                    color: brand,
                  }}
                >
                  Não está incluso
                </h2>
                <ul className="space-y-3">
                  {p.excludes!.map((exc, i) => (
                    <li key={i} className="flex items-start gap-3 text-sm sm:text-base text-slate-600">
                      <div className="bg-red-100 p-1 rounded-full shrink-0 mt-1">
                        <X className="w-4 h-4 text-red-500" />
                      </div>
                      <span className="leading-snug">{exc}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        {/* HOTÉIS & VOOS */}
        {(vm.hasHotels || vm.hasFlights) && (
          <div className="mt-8 sm:mt-14 grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8">
            {vm.hasHotels && (
              <div className="col-span-12">
                <h2
                  className="text-2xl sm:text-3xl lg:text-4xl font-bold mb-4 sm:mb-6"
                  style={{
                    fontFamily: "var(--brand-heading-font, 'Playfair Display', serif)",
                    color: brand,
                  }}
                >
                  Hospedagens Previstas
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 lg:gap-6">
                  {p.hotels!.map((h, i) => (
                    <div
                      key={i}
                      className="bg-white rounded-lg p-4 sm:p-6 border border-blue-100"
                    >
                      <h3 className="text-base sm:text-lg font-bold text-slate-900 mb-1">{h.name}</h3>
                      <div className="text-xs sm:text-sm text-slate-600 flex items-center gap-2 mb-3">
                        <MapPin className="w-4 h-4 text-slate-400 shrink-0" /> {h.city}
                      </div>
                      <div className="grid grid-cols-2 gap-3 bg-slate-50 p-3 rounded-lg border border-slate-100 text-xs">
                        <div>
                          <span className="block uppercase font-bold text-slate-400">
                            Check-in
                          </span>
                          <span className="font-semibold text-slate-800">
                            {formatDate(h.checkin)}
                          </span>
                        </div>
                        <div>
                          <span className="block uppercase font-bold text-slate-400">
                            Check-out
                          </span>
                          <span className="font-semibold text-slate-800">
                            {formatDate(h.checkout)}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* 12. INVESTIMENTO */}
        <div className="mt-8 sm:mt-14">
          <h2
            className="text-2xl sm:text-4xl lg:text-5xl mb-6 text-center font-bold"
            style={{
              fontFamily: "var(--brand-heading-font, 'Playfair Display', serif)",
              color: brand,
            }}
          >
            Investimento
          </h2>
          <div className="flex flex-col lg:flex-row bg-white rounded-lg sm:rounded-lg overflow-hidden shadow-sm border border-blue-100">
            {/* Lado Esquerdo - Destaque */}
            <div
              className="w-full lg:w-1/2 p-6 sm:p-8 lg:p-12 flex flex-col justify-center"
              style={{ backgroundColor: brand, color: brandFg }}
            >
              <div className="text-xs sm:text-sm uppercase tracking-wider font-bold opacity-80 mb-1 sm:mb-2">
                A partir de
              </div>
              <div className="text-3xl sm:text-5xl lg:text-6xl font-semibold leading-none mb-2 sm:mb-4">
                {formatCurrency(vm.totals.totalPix, p.currency)}
              </div>
              <div className="text-xs sm:text-sm lg:text-base opacity-90 font-medium">
                por pessoa em apartamento duplo
              </div>
            </div>

            {/* Lado Direito - Pagamento */}
            <div className="w-full lg:w-1/2 p-6 sm:p-8 lg:p-12 flex flex-col justify-center bg-white">
              <div className="text-xs sm:text-sm uppercase tracking-wider font-bold text-slate-400 mb-1 sm:mb-2">
                Opções de Pagamento
              </div>
              <div className="text-lg sm:text-2xl font-bold text-slate-800 mb-1 sm:mb-2">
                Cartão de Crédito em até {vm.totals.parcelasCartao}x
              </div>
              <div className="text-sm sm:text-lg font-medium text-slate-600 mb-4">
                Parcelas de {formatCurrency(vm.totals.valorParcelaCartao, p.currency)}
              </div>
              <p className="text-xs sm:text-sm text-slate-500 leading-relaxed">
                Pagamento facilitado diretamente com a agência. A última parcela deve ser quitada
                até a data de embarque.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* 13. RODAPÉ E CHAMADA FINAL */}
      <div
        className="mt-6 mx-4 sm:mx-8 lg:mx-14 rounded-lg sm:rounded-lg px-4 sm:px-8 lg:px-12 py-6 sm:py-8 flex flex-col sm:flex-row justify-between items-center gap-4"
        style={{ backgroundColor: brand, color: brandFg }}
      >
        <div className="flex items-center gap-4 sm:gap-6">
          {p.agent_photo_url ? (
            <img
              src={p.agent_photo_url}
              alt={p.agent_name || undefined}
              crossOrigin="anonymous"
              className="w-12 sm:w-16 h-12 sm:h-16 rounded-full object-cover border-2 sm:border-4 border-white/30"
            />
          ) : (
            <div className="w-12 sm:w-16 h-12 sm:h-16 rounded-full bg-white/20 flex items-center justify-center text-lg sm:text-2xl font-bold text-white border-2 border-white/30">
              {p.agent_name?.charAt(0) || vm.agency.name?.charAt(0)}
            </div>
          )}
          <div>
            <div className="font-bold text-base sm:text-xl lg:text-2xl mb-1">{p.agent_name || vm.agency.name}</div>
            <div className="text-xs uppercase tracking-wider opacity-80 mb-1">
              Consultor Especialista
            </div>
            {p.agent_whatsapp && (
              <div className="text-xs sm:text-sm font-medium flex items-center gap-2">
                <PhoneCall className="w-4 h-4 shrink-0" /> {p.agent_whatsapp}
              </div>
            )}
          </div>
        </div>
        <div className="text-center sm:text-right">
          <div className="text-xs uppercase tracking-wider opacity-60 mb-1">
            Ref do Documento
          </div>
          <div className="font-mono text-xs opacity-90">{p.public_token?.slice(0, 12)}</div>
        </div>
      </div>
    </div>
  );
}
