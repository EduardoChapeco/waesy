const fs = require('fs');
const path = require('path');

const targetFile = path.resolve('src/routes/_store.conta.classificados.novo.tsx');
let content = fs.readFileSync(targetFile, 'utf8');

// 1. Update templateStyle state declaration to support "conveniencia" and default for mercado/gastronomia
const oldTemplateState = `  // Template de Exibição (Padrão Comercial vs Vitrine Imersiva / Glamour)
  const [templateStyle, setTemplateStyle] = useState<"standard" | "editorial">(
    initialData?.attributes?.template_style === "editorial" || initialData?.attributes?.template_style === "instagram"
      ? "editorial"
      : niche.id === "viagem"
      ? "editorial"
      : "standard"
  );`;

const newTemplateState = `  // Template de Exibição (Padrão Comercial vs Vitrine Imersiva vs Conveniência & Fast Delivery)
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

// 2. Update Passo 1 Template Selector UI to 3 options with badges
const oldSelectorUI = `              <div className="grid grid-cols-2 gap-2">
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
              </div>`;

const newSelectorUI = `              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setTemplateStyle("standard")}
                  className={\`p-3 rounded-xl border text-left transition-all cursor-pointer \${
                    templateStyle === "standard"
                      ? "border-primary bg-primary/5 ring-1 ring-primary"
                      : "border-border/60 hover:bg-muted/40"
                  }\`}
                >
                  <p className="text-xs font-bold text-foreground">Padrão Comercial</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">
                    Geral para veículos, serviços e bens
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => setTemplateStyle("conveniencia")}
                  className={\`p-3 rounded-xl border text-left transition-all cursor-pointer \${
                    templateStyle === "conveniencia"
                      ? "border-primary bg-primary/5 ring-1 ring-primary"
                      : "border-border/60 hover:bg-muted/40"
                  }\`}
                >
                  <p className="text-xs font-bold text-foreground flex items-center gap-1">
                    <span>Conveniência & Delivery</span>
                    <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  </p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">
                    Bebidas, mercado, +18 e pedido direto
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => setTemplateStyle("editorial")}
                  className={\`p-3 rounded-xl border text-left transition-all cursor-pointer \${
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
                    Editorial zine, roteiro e glamour
                  </p>
                </button>
              </div>`;

content = content.replace(oldSelectorUI, newSelectorUI);

// 3. In livePreviewClassified attributes, add convenience fields
const attrTarget = `        niche: niche.id === "negocio" ? "business" : niche.id,
        template_style: templateStyle,`;

const attrReplacement = `        niche: niche.id === "negocio" ? "business" : niche.id,
        template_style: templateStyle,
        volume: convenienceVolume || undefined,
        specification_volume: convenienceVolume || undefined,
        temperature: convenienceTemp,
        is_alcoholic: isAlcoholic,
        brand: convenienceBrand || undefined,
        manufacturer: convenienceBrand || undefined,
        delivery_estimate: deliveryEstimateText,
        ready_delivery: readyDelivery,`;

content = content.replace(attrTarget, attrReplacement);

// 4. In Step 4 preview, render ConvenienceShowcaseView if convenience mode
const step4Target = `              {templateStyle === "editorial" || niche.id === "viagem" ? (
                <EditorialShowcaseView
                  classified={livePreviewClassified}
                  isOwner={true}
                  onOpenBookingModal={() => toast.info("Simulação: Modal de reserva abre aqui.")}
                  onOpenProposalModal={() => toast.info("Simulação: Modal de proposta abre aqui.")}
                  onEditClassified={() => setCurrentStep(2)}
                />
              ) : (`;

const step4Replacement = `              {templateStyle === "conveniencia" || niche.id === "mercado" || niche.id === "gastronomia" ? (
                <ConvenienceShowcaseView
                  classified={livePreviewClassified}
                  isOwner={true}
                  onEdit={() => setCurrentStep(2)}
                />
              ) : templateStyle === "editorial" || niche.id === "viagem" ? (
                <EditorialShowcaseView
                  classified={livePreviewClassified}
                  isOwner={true}
                  onOpenBookingModal={() => toast.info("Simulação: Modal de reserva abre aqui.")}
                  onOpenProposalModal={() => toast.info("Simulação: Modal de proposta abre aqui.")}
                  onEditClassified={() => setCurrentStep(2)}
                />
              ) : (`;

content = content.replace(step4Target, step4Replacement);

// 5. In Right-side Live Truthful Preview, render ConvenienceShowcaseView
const rightSideTarget = `        {templateStyle === "editorial" || (templateStyle as string) === "instagram" ? (
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

const rightSideReplacement = `        {templateStyle === "conveniencia" || niche.id === "mercado" || niche.id === "gastronomia" ? (
          <div className="bg-card rounded-2xl overflow-hidden border border-border/60 shadow-2xs">
            <div className="bg-muted/40 px-4 py-2 flex items-center justify-between text-xs border-b border-border/40">
              <span className="font-semibold flex items-center gap-1.5 text-muted-foreground">
                <Eye className="size-3.5 text-primary" />
                Prévia ao vivo · Modo Conveniência & Fast Delivery
              </span>
              <Badge variant="outline" className="text-[10px] font-mono bg-background">
                Quick Commerce
              </Badge>
            </div>
            <div className="max-h-[85vh] overflow-y-auto">
              <ConvenienceShowcaseView
                classified={livePreviewClassified}
                isPreview={true}
              />
            </div>
          </div>
        ) : templateStyle === "editorial" || (templateStyle as string) === "instagram" ? (
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

content = content.replace(rightSideTarget, rightSideReplacement);

fs.writeFileSync(targetFile, content, 'utf8');
console.log('Successfully patched convenience mode and live preview in novo.tsx!');
