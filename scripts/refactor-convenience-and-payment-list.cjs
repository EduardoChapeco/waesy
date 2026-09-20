const fs = require('fs');
const path = require('path');

const targetPath = path.resolve(__dirname, '../src/routes/_store.conta.classificados.novo.tsx');
let content = fs.readFileSync(targetPath, 'utf8');

console.log('1. Importando ConvenienceShowcaseView...');
if (!content.includes('import { ConvenienceShowcaseView }')) {
  content = content.replace(
    'import { UniversalClassifiedShowcase } from "@/components/classifieds/universal-classified-showcase";',
    'import { UniversalClassifiedShowcase } from "@/components/classifieds/universal-classified-showcase";\nimport { ConvenienceShowcaseView } from "@/components/classifieds/convenience-showcase-view";'
  );
}

console.log('2. Atualizando tipo e estado templateStyle...');
const oldTemplateState = `  // Template de Exibição (Padrão Comercial vs Vitrine Imersiva / Glamour)
  const [templateStyle, setTemplateStyle] = useState<"standard" | "editorial">(
    initialData?.attributes?.template_style === "editorial" || initialData?.attributes?.template_style === "instagram"
      ? "editorial"
      : niche.id === "viagem"
      ? "editorial"
      : "standard"
  );`;

const newTemplateState = `  // Template de Exibição (Padrão Comercial vs Vitrine Imersiva vs Modo Conveniência)
  const [templateStyle, setTemplateStyle] = useState<"standard" | "editorial" | "conveniencia">(
    initialData?.attributes?.template_style === "editorial" || initialData?.attributes?.template_style === "instagram"
      ? "editorial"
      : initialData?.attributes?.template_style === "conveniencia" || niche.id === "mercado" || niche.id === "gastronomia"
      ? "conveniencia"
      : niche.id === "viagem"
      ? "editorial"
      : "standard"
  );`;

content = content.replace(oldTemplateState, newTemplateState);

console.log('3. Adicionando estados de conveniência...');
const oldCancellation = `  const [cancellationPolicy, setCancellationPolicy] = useState<"flexible" | "moderate" | "strict" | "negotiable">("flexible");`;
const newCancellation = `  const [cancellationPolicy, setCancellationPolicy] = useState<"flexible" | "moderate" | "strict" | "negotiable">("flexible");

  // ── Modo Conveniência & Fast Delivery (Bebidas, Mercado, Lanches) ──
  const [convenienceVolume, setConvenienceVolume] = useState<string>(initialData?.attributes?.volume || "");
  const [convenienceTemp, setConvenienceTemp] = useState<"gelada" | "ambiente" | "congelado" | "fresco" | "none">(
    initialData?.attributes?.temperature || "gelada"
  );
  const [isAlcoholic, setIsAlcoholic] = useState<boolean>(
    initialData?.attributes?.is_alcoholic ?? (niche.id === "mercado")
  );
  const [convenienceBrand, setConvenienceBrand] = useState<string>(
    initialData?.attributes?.brand || ""
  );
  const [deliveryEstimateText, setDeliveryEstimateText] = useState<string>(
    initialData?.attributes?.delivery_estimate || "35-50 min (MotoLink Express)"
  );
  const [readyDelivery, setReadyDelivery] = useState<boolean>(
    initialData?.attributes?.ready_delivery ?? true
  );`;

content = content.replace(oldCancellation, newCancellation);

console.log('4. Atualizando initialData loading...');
const oldInitialTemplate = `if (initialData.attributes.template_style) setTemplateStyle(initialData.attributes.template_style === "editorial" || initialData.attributes.template_style === "instagram" ? "editorial" : "standard");`;
const newInitialTemplate = `if (initialData.attributes.template_style) setTemplateStyle(initialData.attributes.template_style === "editorial" || initialData.attributes.template_style === "instagram" ? "editorial" : initialData.attributes.template_style === "conveniencia" ? "conveniencia" : "standard");
      if (initialData.attributes.volume) setConvenienceVolume(initialData.attributes.volume);
      if (initialData.attributes.temperature) setConvenienceTemp(initialData.attributes.temperature);
      if (initialData.attributes.is_alcoholic !== undefined) setIsAlcoholic(!!initialData.attributes.is_alcoholic);
      if (initialData.attributes.brand) setConvenienceBrand(initialData.attributes.brand);
      if (initialData.attributes.delivery_estimate) setDeliveryEstimateText(initialData.attributes.delivery_estimate);
      if (initialData.attributes.ready_delivery !== undefined) setReadyDelivery(!!initialData.attributes.ready_delivery);`;

content = content.replace(oldInitialTemplate, newInitialTemplate);

console.log('5. Atualizando attributes payload no submit...');
const oldAttributesSave = `        template_style: templateStyle,
        story_highlights: travelStoryHighlights,`;

const newAttributesSave = `        template_style: templateStyle,
        volume: convenienceVolume || undefined,
        temperature: convenienceTemp,
        is_alcoholic: isAlcoholic,
        brand: convenienceBrand || undefined,
        delivery_estimate: deliveryEstimateText,
        ready_delivery: readyDelivery,
        story_highlights: travelStoryHighlights,`;

content = content.replace(oldAttributesSave, newAttributesSave);

console.log('6. Atualizando livePreviewClassified...');
const oldLivePreviewAttr = `        template_style: templateStyle,
        pricing_type: pricingType,`;

const newLivePreviewAttr = `        template_style: templateStyle,
        volume: convenienceVolume,
        temperature: convenienceTemp,
        is_alcoholic: isAlcoholic,
        brand: convenienceBrand,
        delivery_estimate: deliveryEstimateText,
        ready_delivery: readyDelivery,
        pricing_type: pricingType,`;

content = content.replace(oldLivePreviewAttr, newLivePreviewAttr);

console.log('7. Atualizando Seletor de Template Visual em Informações Básicas...');
const oldTemplateSelector = `            {/* Seletor de Template Visual (Padrão vs Vitrine Imersiva) */}
            <div className="space-y-1.5 pb-1">
              <Label className="text-xs text-foreground font-semibold">
                Estilo Visual da Página
              </Label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setTemplateStyle("standard")}
                  className={\`p-2.5 rounded-xl border text-left transition-all \${
                    templateStyle === "standard"
                      ? "border-primary bg-primary/5 ring-1 ring-primary"
                      : "border-border/60 hover:bg-muted/40"
                  }\`}
                >
                  <p className="text-xs font-bold text-foreground">Padrão</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">
                    Visual limpo
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => setTemplateStyle("editorial")}
                  className={\`p-2.5 rounded-xl border text-left transition-all \${
                    templateStyle === "editorial" || (templateStyle as string) === "instagram"
                      ? "border-primary bg-primary/5 ring-1 ring-primary"
                      : "border-border/60 hover:bg-muted/40"
                  }\`}
                >
                  <p className="text-xs font-bold text-foreground flex items-center gap-1">
                    <span>Vitrine Imersiva</span>
                    <span className="size-1.5 rounded-full bg-rose-500 animate-pulse" />
                  </p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">
                    Destaques visuais, abas e roteiro
                  </p>
                </button>
              </div>
            </div>`;

const newTemplateSelector = `            {/* Seletor de Template Visual (Padrão vs Conveniência vs Vitrine Imersiva) */}
            <div className="space-y-1.5 pb-1">
              <div className="flex items-center justify-between">
                <Label className="text-xs text-foreground font-semibold">
                  Modo de Exibição / Template
                </Label>
                <span className="text-[10px] text-muted-foreground font-mono">Adaptativo por nicho</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setTemplateStyle("standard")}
                  className={\`p-2.5 rounded-xl border text-left transition-all cursor-pointer \${
                    templateStyle === "standard"
                      ? "border-primary bg-primary/10 ring-1 ring-primary/40 shadow-2xs"
                      : "border-border/60 bg-background hover:bg-muted/30"
                  }\`}
                >
                  <p className="text-xs font-bold text-foreground flex items-center gap-1.5">
                    <Tag className="size-3.5 text-primary" />
                    <span>Padrão Comercial</span>
                  </p>
                  <p className="text-[10px] text-muted-foreground mt-0.5 leading-snug">
                    Desapego, veículos, imóveis e serviços
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => setTemplateStyle("conveniencia")}
                  className={\`p-2.5 rounded-xl border text-left transition-all cursor-pointer \${
                    templateStyle === "conveniencia"
                      ? "border-emerald-600 bg-emerald-500/10 ring-1 ring-emerald-500/40 shadow-2xs"
                      : "border-border/60 bg-background hover:bg-muted/30"
                  }\`}
                >
                  <p className="text-xs font-bold text-foreground flex items-center gap-1.5">
                    <Zap className="size-3.5 text-emerald-600" />
                    <span>Conveniência</span>
                    <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  </p>
                  <p className="text-[10px] text-muted-foreground mt-0.5 leading-snug">
                    Bebidas, mercado, lanches e entrega express
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => setTemplateStyle("editorial")}
                  className={\`p-2.5 rounded-xl border text-left transition-all cursor-pointer \${
                    templateStyle === "editorial" || (templateStyle as string) === "instagram"
                      ? "border-primary bg-primary/10 ring-1 ring-primary/40 shadow-2xs"
                      : "border-border/60 bg-background hover:bg-muted/30"
                  }\`}
                >
                  <p className="text-xs font-bold text-foreground flex items-center gap-1.5">
                    <Sparkles className="size-3.5 text-primary" />
                    <span>Vitrine Imersiva</span>
                  </p>
                  <p className="text-[10px] text-muted-foreground mt-0.5 leading-snug">
                    Stories, turismo, resorts e experiências
                  </p>
                </button>
              </div>
            </div>`;

content = content.replace(oldTemplateSelector, newTemplateSelector);

console.log('8. Adicionando seção de Especificações de Conveniência...');
const markerGastronomiaEnd = `                  })()}
                </div>
              )}`;

const convenienceSpecSection = `                  })()}
                </div>
              )}

              {/* Conveniência, Bebidas & Mercado Especializado */}
              {((niche.id as string) === "mercado" || templateStyle === "conveniencia") && (
                <div className="bg-card rounded-2xl p-4 sm:p-5 space-y-4 border border-border/60 shadow-2xs">
                  <div className="flex items-center justify-between pb-2 border-b border-border/40">
                    <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-foreground">
                      <Zap className="size-4 text-emerald-600" />
                      <span>2. Parâmetros de Conveniência & Delivery</span>
                    </div>
                    <Badge variant="outline" className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 border-emerald-500/30 bg-emerald-500/10">
                      Pronta Entrega
                    </Badge>
                  </div>

                  {/* Volume / Medida */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs text-foreground font-medium">Volume / Embalagem *</Label>
                      <span className="text-[10px] text-muted-foreground font-mono">Ex: 1L, 350ml, 500g</span>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {["350ml", "473ml", "600ml", "1L", "1.5L", "2L", "500g", "1kg", "Pack 6 un", "Unidade"].map((v) => (
                        <button
                          key={v}
                          type="button"
                          onClick={() => setConvenienceVolume(v)}
                          className={cn(
                            "h-7 px-2.5 rounded-lg text-xs font-medium cursor-pointer transition-all border",
                            convenienceVolume === v
                              ? "bg-primary text-primary-foreground border-primary"
                              : "bg-muted/40 hover:bg-muted text-muted-foreground border-border/60"
                          )}
                        >
                          {v}
                        </button>
                      ))}
                    </div>
                    <Input
                      value={convenienceVolume}
                      onChange={(e) => setConvenienceVolume(e.target.value)}
                      placeholder="Ou digite o volume/tamanho (ex: Garrafa 1 Litro)"
                      className="h-10 rounded-xl text-xs bg-background"
                    />
                  </div>

                  {/* Temperatura / Conservação */}
                  <div className="space-y-2">
                    <Label className="text-xs text-foreground font-medium">Temperatura / Conservação</Label>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      {[
                        { id: "gelada", label: "🧊 Gelada", desc: "Pronta p/ consumo" },
                        { id: "ambiente", label: "📦 Ambiente", desc: "Prateleira / Bar" },
                        { id: "congelado", label: "❄️ Congelado", desc: "Freezer / Gelo" },
                        { id: "fresco", label: "🥬 Fresco", desc: "Hortifrúti / Padaria" },
                      ].map((t) => (
                        <button
                          key={t.id}
                          type="button"
                          onClick={() => setConvenienceTemp(t.id as any)}
                          className={cn(
                            "p-2.5 rounded-xl border text-left cursor-pointer transition-all",
                            convenienceTemp === t.id
                              ? "bg-primary/10 border-primary text-foreground ring-1 ring-primary/30"
                              : "bg-background border-border/60 text-muted-foreground hover:bg-muted/30"
                          )}
                        >
                          <p className="text-xs font-bold text-foreground">{t.label}</p>
                          <p className="text-[10px] text-muted-foreground">{t.desc}</p>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Restrição Alcoólica / 18+ */}
                  <div className="p-3.5 rounded-xl border border-border/60 bg-muted/20 flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label htmlFor="conv-alcoholic" className="text-xs font-semibold text-foreground cursor-pointer flex items-center gap-1.5">
                        <span>Contém Álcool (Bebida Alcoólica +18)</span>
                      </Label>
                      <p className="text-[11px] text-muted-foreground">
                        Exibe aviso obrigatório de proibição de venda para menores de 18 anos.
                      </p>
                    </div>
                    <Switch
                      id="conv-alcoholic"
                      checked={isAlcoholic}
                      onCheckedChange={setIsAlcoholic}
                    />
                  </div>

                  {/* Marca & Tempo de Despacho */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label className="text-xs font-medium text-foreground">Marca / Fabricante</Label>
                      <Input
                        value={convenienceBrand}
                        onChange={(e) => setConvenienceBrand(e.target.value)}
                        placeholder="Ex: Mansão Maromba, Ambev, Coca-Cola..."
                        className="h-10 rounded-xl text-xs bg-background"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs font-medium text-foreground">Previsão de Entrega</Label>
                      <Input
                        value={deliveryEstimateText}
                        onChange={(e) => setDeliveryEstimateText(e.target.value)}
                        placeholder="Ex: 35-50 min (MotoLink Express)"
                        className="h-10 rounded-xl text-xs bg-background font-mono"
                      />
                    </div>
                  </div>
                </div>
              )}`;

content = content.replace(markerGastronomiaEnd, convenienceSpecSection);

console.log('9. Refatorando FORMAS DE PAGAMENTO de grid expremido para LISTA ESPAÇOSA...');
// Vamos localizar a seção inteira de FORMAS DE PAGAMENTO
const pmtStartMarker = `{/* Formas de Pagamento (8 Cartões Táteis Apple HIG >= 48px com Títulos Simples e Diretos) */}`;
const pmtEndMarker = `{/* Section 3: Fotos & Mídias com Upload Seguro */}`;

const pmtStartIndex = content.indexOf(pmtStartMarker);
const pmtEndIndex = content.indexOf(pmtEndMarker);

if (pmtStartIndex !== -1 && pmtEndIndex !== -1) {
  const newPaymentSection = `{/* Formas de Pagamento (LISTA ESTRUTURADA ESPAÇOSA - ZERO TRUNCATION - 1x = À VISTA) */}
              <div className="bg-card rounded-2xl p-4 sm:p-5 space-y-4 border border-border/60 shadow-2xs">
                <div className="flex items-center justify-between pb-2.5 border-b border-border/40">
                  <div className="flex items-center gap-2 text-xs sm:text-sm font-bold uppercase tracking-wider text-foreground">
                    <CreditCard className="size-4 text-primary shrink-0" />
                    <span>Formas de Pagamento Aceitas</span>
                  </div>
                  <span className="text-[10px] text-muted-foreground font-mono">Ative as opções aceitas</span>
                </div>

                {/* Lista Vertical Espaçosa e Descomplicada */}
                <div className="space-y-3">

                  {/* 1. Pix */}
                  <div className={cn(
                    "p-3.5 sm:p-4 rounded-xl border transition-all space-y-3",
                    acceptsPix
                      ? "border-primary/50 bg-primary/5 ring-1 ring-primary/20"
                      : "border-border/60 bg-muted/20 opacity-80"
                  )}>
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className={cn(
                          "size-10 rounded-xl flex items-center justify-center shrink-0 transition-colors",
                          acceptsPix ? "bg-emerald-600 text-white shadow-2xs" : "bg-muted text-muted-foreground"
                        )}>
                          <QrCode className="size-5" />
                        </div>
                        <div className="min-w-0">
                          <h4 className="text-xs sm:text-sm font-bold text-foreground">Pix (Pagamento Instantâneo)</h4>
                          <p className="text-[11px] text-muted-foreground">
                            {pixDiscountPercent > 0
                              ? \`\${pixDiscountPercent}% de desconto à vista imediato\`
                              : "Pagamento à vista com confirmação em segundos"}
                          </p>
                        </div>
                      </div>
                      <Switch
                        checked={acceptsPix}
                        onCheckedChange={setAcceptsPix}
                        aria-label="Aceitar Pix"
                      />
                    </div>

                    {acceptsPix && (
                      <div className="pt-2 border-t border-border/40 space-y-2.5">
                        <div className="flex items-center justify-between">
                          <Label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                            <BadgePercent className="size-3.5 text-emerald-600" />
                            <span>Desconto no Pix à Vista</span>
                          </Label>
                          <span className="text-xs font-black text-emerald-600 dark:text-emerald-400 font-mono bg-emerald-500/10 px-2 py-0.5 rounded-md">
                            {pixDiscountPercent}% OFF
                          </span>
                        </div>
                        <input
                          type="range"
                          min={0}
                          max={30}
                          step={1}
                          value={pixDiscountPercent}
                          onChange={(e) => setPixDiscountPercent(Math.min(30, Math.max(0, Number(e.target.value) || 0)))}
                          className="w-full h-2 rounded-full accent-emerald-600 cursor-pointer"
                          aria-label="Desconto no Pix"
                        />
                        <div className="flex justify-between text-[10px] text-muted-foreground font-mono">
                          <span>0% (Sem desconto)</span>
                          <span>10%</span>
                          <span>20%</span>
                          <span>30%</span>
                        </div>
                        {pixDiscountPercent > 0 && priceCents && priceCents > 0 && (
                          <div className="pt-1 flex items-center justify-between text-xs font-medium">
                            <span className="text-muted-foreground">Economia: {formatMoney(Math.round(priceCents * (pixDiscountPercent / 100)))}</span>
                            <span className="font-bold text-emerald-600">Sai por: {formatMoney(Math.round(priceCents * (1 - pixDiscountPercent / 100)))}</span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* 2. Cartão de Crédito (1x = À Vista, 2x+ = Parcelamento) */}
                  <div className={cn(
                    "p-3.5 sm:p-4 rounded-xl border transition-all space-y-3",
                    acceptsCard
                      ? "border-primary/50 bg-primary/5 ring-1 ring-primary/20"
                      : "border-border/60 bg-muted/20 opacity-80"
                  )}>
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className={cn(
                          "size-10 rounded-xl flex items-center justify-center shrink-0 transition-colors",
                          acceptsCard ? "bg-blue-600 text-white shadow-2xs" : "bg-muted text-muted-foreground"
                        )}>
                          <CreditCard className="size-5" />
                        </div>
                        <div className="min-w-0">
                          <h4 className="text-xs sm:text-sm font-bold text-foreground">Cartão de Crédito / Débito</h4>
                          <p className="text-[11px] text-muted-foreground">
                            {maxInstallments === 1
                              ? "Cobrança única à vista"
                              : \`À vista ou parcelado em até \${maxInstallments}x \${cardInterestFree ? "sem juros" : ""}\`}
                          </p>
                        </div>
                      </div>
                      <Switch
                        checked={acceptsCard}
                        onCheckedChange={setAcceptsCard}
                        aria-label="Aceitar Cartão"
                      />
                    </div>

                    {acceptsCard && (
                      <div className="pt-2 border-t border-border/40 space-y-3">
                        <div className="flex items-center justify-between">
                          <Label className="text-xs text-foreground font-semibold flex items-center gap-1.5">
                            <CreditCard className="size-3.5 text-primary" />
                            <span>Parcelamento Máximo</span>
                          </Label>
                          <span className="text-xs font-black text-primary font-mono bg-primary/10 px-2 py-0.5 rounded-md">
                            {maxInstallments === 1 ? "À vista" : \`Até \${maxInstallments}x\`}
                          </span>
                        </div>
                        <input
                          type="range"
                          min={1}
                          max={24}
                          step={1}
                          value={maxInstallments}
                          onChange={(e) => setMaxInstallments(Number(e.target.value) || 1)}
                          className="w-full h-2 rounded-full accent-primary cursor-pointer"
                          aria-label="Parcelas no Cartão"
                        />
                        <div className="flex justify-between text-[10px] text-muted-foreground font-mono">
                          <span>À vista (1x)</span>
                          <span>2x</span>
                          <span>6x</span>
                          <span>12x</span>
                          <span>18x</span>
                          <span>24x</span>
                        </div>

                        <div className="flex items-center justify-between pt-1 text-xs">
                          {maxInstallments > 1 ? (
                            <div className="flex items-center gap-2">
                              <Switch
                                checked={cardInterestFree}
                                onCheckedChange={setCardInterestFree}
                                id="card-interest-free"
                              />
                              <Label htmlFor="card-interest-free" className="text-xs font-medium cursor-pointer">
                                Sem juros para o comprador
                              </Label>
                            </div>
                          ) : (
                            <span className="text-[11px] text-muted-foreground">Somente à vista (sem parcelas)</span>
                          )}

                          {priceCents && priceCents > 0 && maxInstallments > 1 && (
                            <span className="text-[11px] text-muted-foreground font-mono font-medium">
                              \${maxInstallments}x de <strong>\${formatMoney(Math.round(priceCents / maxInstallments))}</strong>
                            </span>
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* 3. Dinheiro em Espécie (Presencial) */}
                  <div className={cn(
                    "p-3.5 sm:p-4 rounded-xl border transition-all space-y-2",
                    acceptsCash
                      ? "border-primary/50 bg-primary/5 ring-1 ring-primary/20"
                      : "border-border/60 bg-muted/20 opacity-80"
                  )}>
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className={cn(
                          "size-10 rounded-xl flex items-center justify-center shrink-0 transition-colors",
                          acceptsCash ? "bg-slate-700 text-white shadow-2xs" : "bg-muted text-muted-foreground"
                        )}>
                          <Banknote className="size-5" />
                        </div>
                        <div className="min-w-0">
                          <h4 className="text-xs sm:text-sm font-bold text-foreground">Dinheiro em Espécie (Presencial)</h4>
                          <p className="text-[11px] text-muted-foreground">
                            Pagamento no ato da entrega pelo motoboy ou na retirada no balcão
                          </p>
                        </div>
                      </div>
                      <Switch
                        checked={acceptsCash}
                        onCheckedChange={setAcceptsCash}
                        aria-label="Aceitar Dinheiro"
                      />
                    </div>
                  </div>

                  {/* 4. Boleto Bancário à Vista */}
                  <div className={cn(
                    "p-3.5 sm:p-4 rounded-xl border transition-all space-y-3",
                    acceptsBoleto
                      ? "border-primary/50 bg-primary/5 ring-1 ring-primary/20"
                      : "border-border/60 bg-muted/20 opacity-80"
                  )}>
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className={cn(
                          "size-10 rounded-xl flex items-center justify-center shrink-0 transition-colors",
                          acceptsBoleto ? "bg-amber-600 text-white shadow-2xs" : "bg-muted text-muted-foreground"
                        )}>
                          <Receipt className="size-5" />
                        </div>
                        <div className="min-w-0">
                          <h4 className="text-xs sm:text-sm font-bold text-foreground">Boleto Bancário à Vista</h4>
                          <p className="text-[11px] text-muted-foreground">
                            {acceptsBoleto ? \`Compensação com vencimento em \${boletoDueDays} dias úteis\` : "Emissão de boleto para pagamento em bancos ou lotéricas"}
                          </p>
                        </div>
                      </div>
                      <Switch
                        checked={acceptsBoleto}
                        onCheckedChange={setAcceptsBoleto}
                        aria-label="Aceitar Boleto"
                      />
                    </div>

                    {acceptsBoleto && (
                      <div className="pt-2 border-t border-border/40 space-y-2">
                        <div className="flex items-center justify-between">
                          <Label className="text-xs font-semibold text-foreground">Prazo de Vencimento</Label>
                          <span className="text-xs font-mono font-bold text-primary">{boletoDueDays} dias úteis</span>
                        </div>
                        <div className="grid grid-cols-5 gap-2">
                          {[1, 2, 3, 5, 7].map((days) => (
                            <Button
                              key={days}
                              type="button"
                              variant={boletoDueDays === days ? "default" : "outline"}
                              size="sm"
                              onClick={() => setBoletoDueDays(days)}
                              className="h-8 text-xs font-semibold rounded-lg cursor-pointer"
                            >
                              {days}d
                            </Button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* 5. Boleto Parcelado */}
                  <div className={cn(
                    "p-3.5 sm:p-4 rounded-xl border transition-all space-y-3",
                    acceptsBoletoInstallments
                      ? "border-primary/50 bg-primary/5 ring-1 ring-primary/20"
                      : "border-border/60 bg-muted/20 opacity-80"
                  )}>
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className={cn(
                          "size-10 rounded-xl flex items-center justify-center shrink-0 transition-colors",
                          acceptsBoletoInstallments ? "bg-orange-600 text-white shadow-2xs" : "bg-muted text-muted-foreground"
                        )}>
                          <FileSpreadsheet className="size-5" />
                        </div>
                        <div className="min-w-0">
                          <h4 className="text-xs sm:text-sm font-bold text-foreground">Boleto Parcelado</h4>
                          <p className="text-[11px] text-muted-foreground">
                            {acceptsBoletoInstallments ? \`Parcelamento em até \${maxBoletoInstallments}x direto\` : "Parcelamento via boletos mensais emitidos pela loja"}
                          </p>
                        </div>
                      </div>
                      <Switch
                        checked={acceptsBoletoInstallments}
                        onCheckedChange={setAcceptsBoletoInstallments}
                        aria-label="Aceitar Boleto Parcelado"
                      />
                    </div>

                    {acceptsBoletoInstallments && (
                      <div className="pt-2 border-t border-border/40 space-y-3">
                        <div className="flex items-center justify-between">
                          <Label className="text-xs text-foreground font-semibold">Número de Boletos</Label>
                          <span className="text-xs font-black text-primary font-mono">Até {maxBoletoInstallments}x</span>
                        </div>
                        <input
                          type="range"
                          min={2}
                          max={24}
                          step={1}
                          value={maxBoletoInstallments}
                          onChange={(e) => setMaxBoletoInstallments(Number(e.target.value) || 2)}
                          className="w-full h-2 rounded-full accent-primary cursor-pointer"
                        />
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                          <div className="space-y-1">
                            <Label className="text-xs font-medium text-foreground">Entrada Mínima (R$)</Label>
                            <CurrencyField
                              value={boletoMinDownPaymentCents}
                              onChange={setBoletoMinDownPaymentCents}
                              placeholder="0,00"
                              className="h-9 text-xs"
                            />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-xs font-medium text-foreground">Requisitos</Label>
                            <Input
                              value={boletoNotes}
                              onChange={(e) => setBoletoNotes(e.target.value)}
                              placeholder="Ex: Análise cadastral"
                              className="h-9 text-xs"
                            />
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* 6. Carnê Digital Waesy */}
                  <div className={cn(
                    "p-3.5 sm:p-4 rounded-xl border transition-all space-y-3",
                    acceptsCarne
                      ? "border-primary/50 bg-primary/5 ring-1 ring-primary/20"
                      : "border-border/60 bg-muted/20 opacity-80"
                  )}>
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className={cn(
                          "size-10 rounded-xl flex items-center justify-center shrink-0 transition-colors",
                          acceptsCarne ? "bg-purple-600 text-white shadow-2xs" : "bg-muted text-muted-foreground"
                        )}>
                          <BookOpenCheck className="size-5" />
                        </div>
                        <div className="min-w-0">
                          <h4 className="text-xs sm:text-sm font-bold text-foreground">Carnê Digital Waesy</h4>
                          <p className="text-[11px] text-muted-foreground">
                            {acceptsCarne ? \`Parcelamento em até \${maxCarneInstallments}x direto no app\` : "Emissão de crediário digital com gestão pela plataforma"}
                          </p>
                        </div>
                      </div>
                      <Switch
                        checked={acceptsCarne}
                        onCheckedChange={setAcceptsCarne}
                        aria-label="Aceitar Carnê Digital"
                      />
                    </div>

                    {acceptsCarne && (
                      <div className="pt-2 border-t border-border/40 space-y-3">
                        <div className="flex items-center justify-between">
                          <Label className="text-xs text-foreground font-semibold">Parcelas no Carnê</Label>
                          <span className="text-xs font-black text-primary font-mono">Até {maxCarneInstallments}x</span>
                        </div>
                        <input
                          type="range"
                          min={2}
                          max={36}
                          step={1}
                          value={maxCarneInstallments}
                          onChange={(e) => setMaxCarneInstallments(Number(e.target.value) || 2)}
                          className="w-full h-2 rounded-full accent-primary cursor-pointer"
                        />
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                          <div className="space-y-1">
                            <Label className="text-xs font-medium text-foreground">1º Vencimento</Label>
                            <div className="grid grid-cols-3 gap-1">
                              {[30, 45, 60].map((days) => (
                                <Button
                                  key={days}
                                  type="button"
                                  variant={carneGraceDays === days ? "default" : "outline"}
                                  size="sm"
                                  onClick={() => setCarneGraceDays(days)}
                                  className="h-8 text-xs font-semibold rounded-lg"
                                >
                                  {days}d
                                </Button>
                              ))}
                            </div>
                          </div>
                          <div className="space-y-1">
                            <Label className="text-xs font-medium text-foreground">Entrada Mínima (R$)</Label>
                            <CurrencyField
                              value={carneMinDownPaymentCents}
                              onChange={setCarneMinDownPaymentCents}
                              placeholder="0,00"
                              className="h-8 text-xs"
                            />
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* 7. Aceita Troca / Permuta */}
                  <div className={cn(
                    "p-3.5 sm:p-4 rounded-xl border transition-all space-y-3",
                    acceptsTrade
                      ? "border-primary/50 bg-primary/5 ring-1 ring-primary/20"
                      : "border-border/60 bg-muted/20 opacity-80"
                  )}>
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className={cn(
                          "size-10 rounded-xl flex items-center justify-center shrink-0 transition-colors",
                          acceptsTrade ? "bg-amber-600 text-white shadow-2xs" : "bg-muted text-muted-foreground"
                        )}>
                          <RefreshCw className="size-5" />
                        </div>
                        <div className="min-w-0">
                          <h4 className="text-xs sm:text-sm font-bold text-foreground">Aceita Troca / Permuta</h4>
                          <p className="text-[11px] text-muted-foreground">
                            Aceita propostas de troca por outros itens, veículos ou produtos
                          </p>
                        </div>
                      </div>
                      <Switch
                        checked={acceptsTrade}
                        onCheckedChange={setAcceptsTrade}
                        aria-label="Aceitar Troca"
                      />
                    </div>

                    {acceptsTrade && (
                      <div className="pt-2 border-t border-border/40 space-y-1">
                        <Label className="text-xs font-semibold text-foreground">O que você aceita na troca?</Label>
                        <Input
                          value={tradeNotes}
                          onChange={(e) => setTradeNotes(e.target.value)}
                          placeholder="Ex: Veículo, moto, eletrônicos ou itens sob avaliação"
                          className="h-9 text-xs"
                        />
                      </div>
                    )}
                  </div>

                  {/* 8. Financiamento Bancário */}
                  <div className={cn(
                    "p-3.5 sm:p-4 rounded-xl border transition-all space-y-3",
                    acceptsFinancing
                      ? "border-primary/50 bg-primary/5 ring-1 ring-primary/20"
                      : "border-border/60 bg-muted/20 opacity-80"
                  )}>
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className={cn(
                          "size-10 rounded-xl flex items-center justify-center shrink-0 transition-colors",
                          acceptsFinancing ? "bg-teal-600 text-white shadow-2xs" : "bg-muted text-muted-foreground"
                        )}>
                          <Landmark className="size-5" />
                        </div>
                        <div className="min-w-0">
                          <h4 className="text-xs sm:text-sm font-bold text-foreground">Financiamento Bancário</h4>
                          <p className="text-[11px] text-muted-foreground">
                            Intermediação com bancos parceiros ou carta de consórcio contemplada
                          </p>
                        </div>
                      </div>
                      <Switch
                        checked={acceptsFinancing}
                        onCheckedChange={setAcceptsFinancing}
                        aria-label="Aceitar Financiamento"
                      />
                    </div>

                    {acceptsFinancing && (
                      <div className="pt-2 border-t border-border/40 space-y-1">
                        <Label className="text-xs font-semibold text-foreground">Bancos ou cartas aceitas</Label>
                        <Input
                          value={financingNotes}
                          onChange={(e) => setFinancingNotes(e.target.value)}
                          placeholder="Ex: Santander, BV, Bradesco ou consórcio contemplado"
                          className="h-9 text-xs"
                        />
                      </div>
                    )}
                  </div>

                </div>

                {/* Cancelamento */}
                <div className="space-y-1.5 pt-2 border-t border-border/40">
                  <Label className="text-xs text-foreground font-semibold">Política de Cancelamento</Label>
                  <Select value={cancellationPolicy} onValueChange={(v: any) => setCancellationPolicy(v)}>
                    <SelectTrigger className="h-11 rounded-xl text-xs bg-background font-medium">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="flexible">Flexível (até 24h antes)</SelectItem>
                      <SelectItem value="moderate">Moderado (50% de reembolso)</SelectItem>
                      <SelectItem value="strict">Rígido (não reembolsável)</SelectItem>
                      <SelectItem value="negotiable">A combinar</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              `;

  content = content.slice(0, pmtStartIndex) + newPaymentSection + content.slice(pmtEndIndex);
}

console.log('10. Atualizando Right Panel / Live Preview no Editor...');
const oldPreviewBranch = `        {templateStyle === "editorial" || (templateStyle as string) === "instagram" ? (
          <div className="bg-card rounded-2xl overflow-hidden border border-border/60 shadow-2xs">
            <div className="bg-muted/40 px-4 py-2 flex items-center justify-between text-xs border-b border-border/40">
              <span className="font-semibold flex items-center gap-1.5 text-muted-foreground">
                <Eye className="size-3.5 text-primary" />
                Prévia ao vivo
              </span>
            </div>
            <div className="max-h-[85vh] overflow-y-auto">
              <EditorialShowcaseView
                classified={livePreviewClassified}
                isOwner={false}
              />
            </div>
          </div>
        ) : (`;

const newPreviewBranch = `        {templateStyle === "conveniencia" ? (
          <div className="bg-card rounded-2xl overflow-hidden border border-border/60 shadow-2xs">
            <div className="bg-muted/40 px-4 py-2 flex items-center justify-between text-xs border-b border-border/40">
              <span className="font-semibold flex items-center gap-1.5 text-emerald-600">
                <Zap className="size-3.5" />
                Prévia ao vivo · Modo Conveniência & Delivery
              </span>
            </div>
            <div className="max-h-[85vh] overflow-y-auto">
              <ConvenienceShowcaseView
                previewData={{
                  title: title || "Drink Pronto Mansão Maromba Whisky Double Darkness - 1L",
                  description,
                  priceCents,
                  images,
                  locationName: locationName || "São Miguel do Oeste e Região",
                  whatsapp,
                  volume: convenienceVolume || "1L",
                  temperature: convenienceTemp,
                  isAlcoholic,
                  brand: convenienceBrand,
                  deliveryEstimate: deliveryEstimateText,
                  readyDelivery,
                  acceptsPix,
                  pixDiscountPercent,
                  acceptsCard,
                  maxInstallments,
                  cardInterestFree,
                  acceptsCash,
                }}
              />
            </div>
          </div>
        ) : templateStyle === "editorial" || (templateStyle as string) === "instagram" ? (
          <div className="bg-card rounded-2xl overflow-hidden border border-border/60 shadow-2xs">
            <div className="bg-muted/40 px-4 py-2 flex items-center justify-between text-xs border-b border-border/40">
              <span className="font-semibold flex items-center gap-1.5 text-muted-foreground">
                <Eye className="size-3.5 text-primary" />
                Prévia ao vivo · Vitrine Imersiva
              </span>
            </div>
            <div className="max-h-[85vh] overflow-y-auto">
              <EditorialShowcaseView
                classified={livePreviewClassified}
                isOwner={false}
              />
            </div>
          </div>
        ) : (`;

content = content.replace(oldPreviewBranch, newPreviewBranch);

fs.writeFileSync(targetPath, content, 'utf8');
console.log('✓ _store.conta.classificados.novo.tsx refatorado com sucesso!');
