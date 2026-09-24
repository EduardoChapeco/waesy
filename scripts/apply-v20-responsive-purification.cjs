const fs = require('fs');
const path = require('path');

const storeIndexPath = path.resolve(__dirname, '../src/routes/_store.index.tsx');
let code = fs.readFileSync(storeIndexPath, 'utf8');

// 1. Purify Rails (Places, Classificados, Feed, Empregos, Eventos, Agenda, Afiliados)
// Replace shadow-2xs with shadow-none and remove backdrop-blur-md
code = code.replace(/shadow-2xs/g, 'shadow-none');
code = code.replace(/hover:shadow-xs/g, '');
code = code.replace(/backdrop-blur-md/g, '');

// Clean Badge styles in cards (replace with clean flat border tokens)
code = code.replace(
  'className="bg-background/90  text-[10px] font-bold"',
  'className="bg-background/95 text-foreground border border-border/40 font-mono text-[9px] uppercase font-bold px-1.5 py-0.5 rounded-md"'
);

// 2. Refactor Mode 2 (Grid): 2 columns on mobile, fluid gap
code = code.replace(
  'className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-5"',
  'className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2.5 sm:gap-4"'
);

// 3. Refactor Mode 3 (List): Separate Mobile (WhatsApp List Pattern) vs Desktop (Split Horizontal Card)
const oldListModeStart = '{/* ─────────────────────────────────────────────────────────────────────────────\n          MODO 3: LISTA COMPACTA (SPLIT COM IMAGEM À ESQUERDA)\n          ───────────────────────────────────────────────────────────────────────────── */}\n      {viewMode === "list" && (';

const oldListSnippetRegex = /\{\/\* ──+[\s\S]*?MODO 3: LISTA COMPACTA[\s\S]*?viewMode === "list" && \([\s\S]*?<\/section>\s*\)\}/;

const newMode3Code = `{/* ─────────────────────────────────────────────────────────────────────────────
          MODO 3: LISTA COMPACTA (SEPARAÇÃO RIGOROSA MOBILE VS DESKTOP)
          - Mobile (< 768px): WhatsApp List Pattern (Row compacta, 48px thumb, dados à direita)
          - Desktop (>= 768px): Split Card Horizontal Widescreen
          ───────────────────────────────────────────────────────────────────────────── */}
      {viewMode === "list" && (
        <section aria-label="Lista de Anúncios" className="space-y-3">
          {unifiedItems.length === 0 ? (
            <div className="py-20 text-center space-y-3 bg-card rounded-2xl border border-border/50 p-8">
              <Tag className="size-10 text-muted-foreground/40 mx-auto" />
              <h2 className="text-sm font-bold text-foreground">
                Nenhum anúncio encontrado com estes filtros
              </h2>
            </div>
          ) : (
            <>
              {/* ── MOBILE EXCLUSIVO (< 768px): WhatsApp List Pattern ── */}
              <div className="block md:hidden divide-y divide-border/30 rounded-2xl border border-border/50 bg-card overflow-hidden">
                {unifiedItems.map((item) => (
                  <Link
                    key={item.id}
                    to={item.to as any}
                    className="p-3 flex items-center justify-between gap-3 hover:bg-muted/40 transition-colors group cursor-pointer"
                  >
                    <div className="size-12 rounded-xl bg-muted/30 border border-border/40 shrink-0 overflow-hidden flex items-center justify-center">
                      {item.image ? (
                        <img src={item.image} alt={item.title} className="size-full object-cover" loading="lazy" />
                      ) : (
                        <Tag size={20} className="text-muted-foreground/40" />
                      )}
                    </div>

                    <div className="min-w-0 flex-1 space-y-0.5">
                      <div className="flex items-center gap-1.5">
                        <Badge variant="outline" className="text-[9px] font-mono px-1 py-0 h-4 text-muted-foreground border-border/50">
                          {item.badge}
                        </Badge>
                        {item.priceOrDate && (
                          <span className="font-mono font-bold text-xs text-foreground truncate">
                            {item.priceOrDate}
                          </span>
                        )}
                      </div>
                      <p className="font-bold text-xs text-foreground truncate group-hover:text-primary transition-colors">
                        {item.title}
                      </p>
                      {item.location && (
                        <p className="text-[11px] text-muted-foreground truncate flex items-center gap-1">
                          <MapPin size={11} className="shrink-0 text-muted-foreground" />
                          <span className="truncate">{item.location}</span>
                        </p>
                      )}
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      {item.phone && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            trackAndOpenWhatsApp({
                              phone: item.phone || "",
                              message: \`Olá! Vi o anúncio "\${item.title}" no Waesy.\`,
                              storeId: null,
                              entityType: item.pillar,
                              entityId: item.id,
                              entityTitle: item.title,
                            });
                          }}
                          className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors cursor-pointer"
                          title="WhatsApp"
                        >
                          <WhatsappLogo size={18} weight="bold" />
                        </button>
                      )}
                      <ArrowRight size={16} className="text-muted-foreground/60 group-hover:text-foreground transition-transform group-hover:translate-x-0.5" />
                    </div>
                  </Link>
                ))}
              </div>

              {/* ── DESKTOP EXCLUSIVO (>= 768px): Split Card Horizontal Widescreen ── */}
              <div className="hidden md:flex flex-col space-y-3">
                {unifiedItems.map((item) => (
                  <div
                    key={item.id}
                    className="group flex flex-row items-stretch justify-between rounded-2xl border border-border/50 bg-card hover:border-foreground/30 transition-all overflow-hidden p-0 w-full"
                  >
                    <Link
                      to={item.to as any}
                      className="relative w-56 lg:w-64 h-auto min-h-[140px] overflow-hidden bg-muted/40 shrink-0 cursor-pointer"
                    >
                      {item.image ? (
                        <img
                          src={item.image}
                          alt={item.title}
                          className="size-full object-cover group-hover:scale-105 transition-transform duration-500"
                          loading="lazy"
                        />
                      ) : (
                        <div className="size-full bg-muted/40 flex items-center justify-center">
                          <Tag size={28} className="text-muted-foreground/30" />
                        </div>
                      )}
                      <div className="absolute top-2.5 left-2.5">
                        <Badge className="bg-background/95 text-foreground font-mono text-[9px] uppercase font-bold px-2 py-0.5 rounded-md border border-border/40">
                          {item.badge}
                        </Badge>
                      </div>
                    </Link>

                    <div className="flex-1 min-w-0 p-4 sm:p-5 flex flex-col justify-between space-y-2">
                      <Link to={item.to as any} className="space-y-1 block cursor-pointer">
                        {item.priceOrDate && (
                          <p className="text-lg font-black text-foreground font-mono">
                            {item.priceOrDate}
                          </p>
                        )}
                        <h3 className="font-bold text-base text-foreground leading-snug line-clamp-2 group-hover:text-primary transition-colors">
                          {item.title}
                        </h3>
                      </Link>

                      <div className="flex items-center justify-between gap-2 pt-2 border-t border-border/30">
                        <span className="flex items-center gap-1 text-xs text-muted-foreground truncate">
                          <MapPin size={12} className="shrink-0 text-muted-foreground" />
                          <span className="truncate">{item.location || "Na sua região"}</span>
                        </span>

                        <div className="flex items-center gap-2">
                          {item.phone && (
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() =>
                                trackAndOpenWhatsApp({
                                  phone: item.phone || "",
                                  message: \`Olá! Vi o anúncio "\${item.title}" no Waesy.\`,
                                  storeId: null,
                                  entityType: item.pillar,
                                  entityId: item.id,
                                  entityTitle: item.title,
                                })
                              }
                              className="h-8 px-3 rounded-xl text-xs gap-1.5 border-border/50 hover:bg-muted/50 cursor-pointer"
                            >
                              <WhatsappLogo size={15} weight="bold" />
                              <span>WhatsApp</span>
                            </Button>
                          )}

                          <Button
                            asChild
                            variant="outline"
                            size="sm"
                            className="h-8 px-3.5 rounded-xl text-xs font-semibold hover:bg-muted cursor-pointer"
                          >
                            <Link to={item.to as any}>
                              <span>Ver</span>
                              <ArrowRight size={14} className="ml-1" />
                            </Link>
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </section>
      )}`;

if (oldListSnippetRegex.test(code)) {
  code = code.replace(oldListSnippetRegex, newMode3Code);
  console.log('✅ Mode 3 successfully purified with WhatsApp List Pattern & Desktop Split Card.');
} else {
  console.error('❌ Could not match old Mode 3 snippet.');
}

fs.writeFileSync(storeIndexPath, code, 'utf8');
console.log('✅ _store.index.tsx successfully refactored and purified.');
