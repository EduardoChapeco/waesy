import React from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import {
  MapPin,
  Storefront,
  Tag,
  Briefcase,
  Ticket,
  ArrowRight,
  Star,
  CheckCircle,
  WhatsappLogo,
  Buildings,
} from "@phosphor-icons/react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { HorizontalRail } from "@/components/commerce/horizontal-rail";
import { HotpagesRail } from "@/components/commerce/hotpages-rail";
import { BannerHeroCarousel } from "@/components/commerce/banner-hero-carousel";
import { OfferCard } from "@/components/commerce/offer-card";
import { DiscoveryControlBar } from "@/components/commerce/discovery-control-bar";
import { VitrineEngineSelector } from "@/components/commerce/vitrine-engine-selector";
import { NewsCard } from "@/components/news/news-card";
import { PlacesHighlightBadge } from "@/components/shell/places-highlight-badge";
import { AdTelemetryBeacon } from "@/components/commerce/ad-telemetry-beacon";
import { ProceduralInfiniteFeed } from "@/components/commerce/procedural-infinite-feed";
import { HorizontalProductShelf } from "@/design-system/patterns/discovery-patterns";
import { MetamorphicBannerSlider } from "@/components/home/MetamorphicBannerSlider";
import { NoorNativeCategoryDock } from "@/components/home/NoorNativeCategoryDock";
import { IFoodSquareCategoryButton } from "@/components/home/IFoodSquareCategoryButton";
import { BentoGridTetris } from "@/components/home/BentoGridTetris";
import { HomePostsShowcase } from "@/components/home/HomePostsShowcase";
import { trackAndOpenWhatsApp } from "@/lib/whatsapp";
import type { HomePageSectionDTO } from "@/services/admin-home-cms.functions";
import type { DirectoryListingDTO } from "@/services/directory.functions";
import type { NewsArticleDTO } from "@/services/news.functions";
import type { JobItemDTO } from "@/services/jobs.functions";
import type { HomeDiscoveryViewProps } from "./HomeMobileNativeApp";

export function HomeDesktopWebApp({
  heroSection,
  quickCategoriesSection,
  socialPostsSection,
  customSections,
  editorialHotpages,
  banners,
  middleBanners,
  footerBanners,
  showcasePosts,
  engineMode,
  onEngineModeChange,
  search,
  onSearchChange,
  categories,
  activeCategory,
  onSelectCategory,
  viewMode,
  onViewModeChange,
  filteredPlaces,
  filteredMarketplaceProducts,
  filteredClassifieds,
  filteredNews,
  filteredJobs,
  filteredEvents,
  unifiedItems,
  formatMoney,
}: HomeDiscoveryViewProps) {
  const navigate = useNavigate();

  const getDesktopGridCols = (count: number) => {
    if (count <= 1) return "md:grid-cols-1";
    if (count === 2) return "md:grid-cols-2";
    if (count === 3) return "md:grid-cols-3";
    if (count === 4) return "md:grid-cols-4";
    if (count <= 6) return "md:grid-cols-3 lg:grid-cols-6";
    return "md:grid-cols-4 lg:grid-cols-8";
  };

  return (
    <div className="hidden md:block w-full space-y-6 pb-14" data-testid="home-desktop-web-app">
      {/* ── 1. PALCO HERO WIDESCREEN COMPLETO (Proporção 16:9 Intacta em 100% da Largura) ── */}
      {heroSection && heroSection.items && heroSection.items.length > 0 ? (
        <section aria-label={heroSection.title || "Destaques Principais"} className="w-full">
          {heroSection.show_title && heroSection.title && (
            <div className="mb-2">
              <h2 className="text-lg font-bold text-foreground tracking-tight break-words text-wrap">
                {heroSection.title}
              </h2>
              {heroSection.show_subtitle && heroSection.subtitle && (
                <p className="text-xs text-muted-foreground line-clamp-1">{heroSection.subtitle}</p>
              )}
            </div>
          )}
          <MetamorphicBannerSlider
            items={heroSection.items}
            aspectRatio={heroSection.aspect_ratio}
            columnsDesktop={heroSection.items.length >= 2 ? 2 : 1}
          />
        </section>
      ) : banners && banners.length > 0 ? (
        <section aria-label="Destaques Principais" className="w-full">
          <BannerHeroCarousel banners={banners} />
        </section>
      ) : null}

      {/* ── 2. CATEGORIAS RÁPIDAS DESKTOP (Grade Widescreen Simétrica 100% Preenchida) ── */}
      {quickCategoriesSection && quickCategoriesSection.items && quickCategoriesSection.items.length > 0 && (
        <section aria-label={quickCategoriesSection.title || "Categorias Rápidas"} className="w-full">
          {quickCategoriesSection.show_title && quickCategoriesSection.title && (
            <div className="mb-2">
              <h2 className="text-lg font-bold text-foreground tracking-tight">
                {quickCategoriesSection.title}
              </h2>
              {quickCategoriesSection.show_subtitle && quickCategoriesSection.subtitle && (
                <p className="text-xs text-muted-foreground">{quickCategoriesSection.subtitle}</p>
              )}
            </div>
          )}
          <div className={`grid ${getDesktopGridCols(quickCategoriesSection.items.length)} gap-4`}>
            {quickCategoriesSection.items.map((it) => (
              <IFoodSquareCategoryButton
                key={it.id}
                id={it.id}
                title={it.title}
                imageUrl={it.image_url}
                targetUrl={it.target_url}
                showText={it.show_text}
                badgeText={it.badge_text}
              />
            ))}
          </div>
        </section>
      )}

      {/* ── 3. SEÇÕES MODULARES DO CMS NO DESKTOP (100% da Largura em Proporção Widescreen 16:9) ── */}
      {customSections.map((sec: HomePageSectionDTO) => {
        const activeSecItems = (sec.items || []).filter((it) => it.is_active !== false);
        if (activeSecItems.length === 0) return null;
        const desktopColsClass = getDesktopGridCols(activeSecItems.length);

        return (
          <section key={sec.id} aria-label={sec.title || "Destaques"} className="w-full space-y-2">
            {sec.show_title && sec.title && (
              <div>
                <h2 className="text-lg font-bold text-foreground tracking-tight">
                  {sec.title}
                </h2>
                {sec.show_subtitle && sec.subtitle && (
                  <p className="text-xs text-muted-foreground">{sec.subtitle}</p>
                )}
              </div>
            )}
            {sec.layout_variant === "bento_grid" ? (
              <BentoGridTetris items={activeSecItems} aspectRatio={sec.aspect_ratio} />
            ) : sec.layout_variant === "carousel" ? (
              <MetamorphicBannerSlider
                items={activeSecItems}
                aspectRatio={sec.aspect_ratio}
                columnsDesktop={activeSecItems.length >= 2 ? 2 : 1}
              />
            ) : sec.layout_variant === "horizontal_scroll" ? (
              <NoorNativeCategoryDock items={activeSecItems} />
            ) : (
              <div className={`grid ${desktopColsClass} gap-4`}>
                {activeSecItems.map((it) => (
                  <Link
                    key={it.id}
                    to={it.target_url as any}
                    className="group flex flex-col gap-2 w-full rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                    aria-label={it.title || "Destaque"}
                  >
                    <div className="relative aspect-banner-cinema w-full overflow-hidden rounded-lg bg-muted/40 border border-border/50 group-hover:border-foreground/30 transition-colors">
                      <img
                        src={it.image_url}
                        alt=""
                        loading="lazy"
                        className="size-full object-cover group-hover:scale-105 transition-transform duration-300 motion-reduce:transition-none"
                        onError={(e) => {
                          const img = e.currentTarget as HTMLImageElement;
                          const fallback =
                            "https://images.unsplash.com/photo-1498049794561-7780e7231661?auto=format&fit=crop&w=600&q=80";
                          if (img.src !== fallback) {
                            img.src = fallback;
                          }
                        }}
                      />
                    </div>
                    {it.show_text && it.title && (
                      <span className="w-full text-center text-xs font-semibold text-foreground line-clamp-1 px-1 tracking-tight">
                        {it.title}
                      </span>
                    )}
                  </Link>
                ))}
              </div>
            )}
          </section>
        );
      })}

      {/* ── 4. HOTPAGES EDITORIAIS (Trilho Limpo Sem Fundo Semi-Transparente e Sem Badges) ── */}
      {editorialHotpages && editorialHotpages.length > 0 && (
        <HotpagesRail hotpages={editorialHotpages} cleanMode={true} />
      )}

      {/* ── 5. BARRA DE COMANDO E NAVEGAÇÃO TRI-ENGINE UNIFICADA (Sem Duplicação de Categorias) ── */}
      <div className="space-y-3">
        <VitrineEngineSelector
          activeMode={engineMode}
          onModeChange={onEngineModeChange}
        />

        <DiscoveryControlBar
          search={search}
          onSearchChange={onSearchChange}
          searchPlaceholder="Buscar empresas, produtos, classificados ou vagas..."
          categories={categories}
          activeCategory={activeCategory}
          onSelectCategory={onSelectCategory}
          viewMode={viewMode}
          onViewModeChange={onViewModeChange}
          allowedViewModes={["feed", "grid", "list"]}
          stickyMode="none"
        />
      </div>

      {/* ── 6. MODO 1: FEED WIDESCREEN (PRATELEIRAS PROPORCIONAIS) ── */}
      {viewMode === "feed" && (
        <div className="space-y-6">
          {/* PLACES / GUIA COMERCIAL */}
          {(activeCategory === "todos" || activeCategory === "places") && filteredPlaces.length > 0 && (
            <HorizontalRail
              title="Lugares e Empresas"
              subtitle="Estabelecimentos e serviços locais verificados"
              actionLabel="Ver mais"
              actionTo="/diretorio"
            >
              {filteredPlaces.map((item: DirectoryListingDTO) => {
                const coverImage = item.banner_url || item.avatar_url;
                return (
                  <div
                    key={item.id}
                    className="w-76 shrink-0 snap-start group flex flex-col justify-between rounded-lg border border-border/60 bg-card overflow-hidden hover:border-foreground/30 transition-colors h-72"
                  >
                    <Link to="/diretorio/$id" params={{ id: item.id }} className="block">
                      <div className="relative aspect-video w-full overflow-hidden bg-muted/40">
                        {coverImage ? (
                          <img
                            src={coverImage}
                            alt={item.business_name || undefined}
                            className="size-full object-cover group-hover:scale-105 transition-transform duration-300 motion-reduce:transition-none"
                            loading="lazy"
                            onError={(e) => {
                              (e.currentTarget as HTMLElement).style.display = "none";
                            }}
                          />
                        ) : (
                          <div className="size-full bg-muted/50 flex items-center justify-center">
                            <Storefront size={28} className="text-muted-foreground/40" />
                          </div>
                        )}
                        <div className="absolute top-2 right-2">
                          <Badge variant="secondary" className="bg-background/95 border border-border/40 text-foreground text-xs font-bold">
                            {item.category}
                          </Badge>
                        </div>
                      </div>

                      <div className="p-4 space-y-1 h-16 flex flex-col justify-start">
                        <div className="flex items-center justify-between gap-2">
                          <h3 className="font-bold text-sm text-foreground break-words text-wrap group-hover:text-primary transition-colors">
                            {item.business_name}
                          </h3>
                          {item.is_verified && (
                            <CheckCircle size={15} weight="fill" className="text-info shrink-0" />
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground line-clamp-1">
                          {item.address || "Na sua cidade"}
                        </p>
                      </div>
                    </Link>

                    <div className="px-4 py-1 flex items-center justify-between gap-2 border-t border-border/30 mt-auto min-h-11">
                      <div className="flex items-center gap-1 text-xs font-bold text-amber-500">
                        <Star size={13} weight="fill" />
                        <span>{item.rating ? Number(item.rating).toFixed(1) : "Novo"}</span>
                      </div>

                      {(item.contact_whatsapp || item.contact_phone) && (
                        <button
                          type="button"
                          onClick={() =>
                            trackAndOpenWhatsApp({
                              phone: item.contact_whatsapp || item.contact_phone || "",
                              message: `Olá! Vi o perfil da ${item.business_name} no Waesy.`,
                              storeId: (item as any).store_id || null,
                              entityType: "directory",
                              entityId: item.id,
                              entityTitle: item.business_name,
                              niche: item.category || undefined,
                            })
                          }
                          className="inline-flex items-center gap-2 h-11 min-h-11 px-3 rounded-md text-xs font-bold text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 hover:bg-emerald-500/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 cursor-pointer transition-colors"
                        >
                          <WhatsappLogo size={16} weight="bold" />
                          <span>WhatsApp</span>
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </HorizontalRail>
          )}

          {/* MARKETPLACE DE EMPRESAS */}
          {(activeCategory === "todos" || activeCategory === "marketplace") && (
            filteredMarketplaceProducts.length > 0 ? (
              activeCategory === "marketplace" ? (
                <section aria-label="Catálogo de Produtos de Empresas" className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="size-6 rounded-lg bg-primary/10 text-primary flex items-center justify-center font-bold text-xs">
                        <Storefront size={14} weight="bold" />
                      </span>
                      <h2 className="text-base font-bold text-foreground leading-tight">
                        Produtos Anunciados por Empresas
                      </h2>
                    </div>
                    <span className="text-xs font-mono text-muted-foreground">
                      {filteredMarketplaceProducts.length} {filteredMarketplaceProducts.length === 1 ? "produto" : "produtos"}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    {filteredMarketplaceProducts.map((offer: any) => (
                      <OfferCard key={offer.id} {...offer} />
                    ))}
                  </div>
                </section>
              ) : (
                <section aria-label="Marketplace de Empresas" className="space-y-2">
                  <HorizontalProductShelf
                    title="Marketplace de Empresas"
                    subtitle="Produtos e serviços de empresas parceiras da cidade"
                    viewAllLabel="Ver mais"
                    onViewAll={() => navigate({ to: "/marketplace" })}
                  >
                    {filteredMarketplaceProducts.map((offer: any) => (
                      <div key={offer.id} className="w-68 shrink-0 snap-start">
                        <OfferCard {...offer} />
                      </div>
                    ))}
                  </HorizontalProductShelf>
                </section>
              )
            ) : activeCategory === "marketplace" ? (
              <div className="py-16 text-center space-y-3 bg-card rounded-lg border border-border/60 p-8">
                <Storefront className="size-10 text-muted-foreground/40 mx-auto" />
                <h2 className="text-sm font-bold text-foreground">
                  Nenhum produto anunciado por empresas no momento
                </h2>
              </div>
            ) : null
          )}

          {/* CLASSIFICADOS */}
          {(activeCategory === "todos" || activeCategory === "classificados") && filteredClassifieds.length > 0 && (
            <HorizontalRail
              title="Classificados"
              subtitle="Oportunidades e negociação direta na região"
              actionLabel="Ver mais"
              actionTo="/classificados"
            >
              {filteredClassifieds.map((item: any) => {
                const coverImage =
                  (item.images && item.images[0]) ||
                  (item.photos && item.photos[0]) ||
                  item.image_url ||
                  item.media?.[0] ||
                  item.cover_image;
                const priceDisplay = item.price_cents ? formatMoney(item.price_cents) : "Sob Consulta";

                return (
                  <Link
                    key={item.id}
                    to="/classificados/$id"
                    params={{ id: item.id }}
                    className="w-64 shrink-0 snap-start group flex flex-col justify-between rounded-lg border border-border/60 bg-card overflow-hidden hover:border-foreground/30 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                  >
                    <div className="relative aspect-square w-full overflow-hidden bg-muted/30">
                      {coverImage ? (
                        <img
                          src={coverImage}
                          alt={item.title}
                          className="size-full object-cover group-hover:scale-105 transition-transform duration-300 motion-reduce:transition-none"
                          loading="lazy"
                          onError={(e) => {
                            (e.currentTarget as HTMLElement).style.display = "none";
                          }}
                        />
                      ) : (
                        <div className="size-full bg-muted/50 flex items-center justify-center">
                          <Tag size={28} className="text-muted-foreground/30" />
                        </div>
                      )}
                      <div className="absolute top-2 left-2">
                        <Badge variant="secondary" className="bg-background/95 border border-border/40 text-foreground text-xs font-bold uppercase">
                          {item.deal_type || item.category || "Anúncio"}
                        </Badge>
                      </div>
                    </div>

                    <div className="p-3 space-y-2 flex-1 flex flex-col justify-between">
                      <div>
                        <p className="font-bold text-sm text-foreground line-clamp-2 group-hover:text-primary transition-colors">
                          {item.title}
                        </p>
                        <p className="text-xs font-black text-foreground font-mono mt-1">
                          {priceDisplay}
                        </p>
                        <p className="text-xs text-muted-foreground break-words text-wrap">
                          {item.location_name || item.location_text || "Na sua região"}
                        </p>
                      </div>

                      <div className="pt-2">
                        <span className="w-full h-11 min-h-11 px-4 inline-flex items-center justify-center rounded-md bg-secondary text-secondary-foreground text-xs font-bold group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                          Ver Anúncio
                        </span>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </HorizontalRail>
          )}

          {/* FEED DA CIDADE */}
          {(activeCategory === "todos" || activeCategory === "feed") &&
            (socialPostsSection ? socialPostsSection.is_active : true) && (
            <HomePostsShowcase
              posts={showcasePosts && showcasePosts.length > 0 ? showcasePosts : []}
              title={socialPostsSection?.title || "Feed da Cidade"}
              subtitle={socialPostsSection?.subtitle || "Acontecimentos e publicações locais"}
              showTitle={socialPostsSection ? socialPostsSection.show_title : true}
              showSubtitle={socialPostsSection ? socialPostsSection.show_subtitle : true}
              actionTo="/feed"
            />
          )}

          {/* NOTÍCIAS */}
          {(activeCategory === "todos" || activeCategory === "noticias") && filteredNews.length > 0 && (
            <HorizontalRail
              title="Notícias"
              actionLabel="Ver mais"
              actionTo="/noticias"
            >
              {filteredNews.map((article: NewsArticleDTO) => (
                <div key={article.id} className="w-80 shrink-0 snap-start">
                  <NewsCard article={article} />
                </div>
              ))}
            </HorizontalRail>
          )}

          {/* EMPREGOS */}
          {(activeCategory === "todos" || activeCategory === "empregos") && filteredJobs.length > 0 && (
            <HorizontalRail
              title="Vagas e Empregos"
              subtitle="Oportunidades com recrutamento aberto na região"
              actionLabel="Ver mais"
              actionTo="/empregos"
            >
              {filteredJobs.map((job: JobItemDTO) => {
                const coverImage = (job as any).cover_image_url || job.company_logo_url;

                return (
                  <Link
                    key={job.id}
                    to="/empregos/$id"
                    params={{ id: job.id }}
                    className="w-80 shrink-0 snap-start p-4 rounded-lg border border-border/60 bg-card hover:border-foreground/30 transition-colors space-y-3 group flex flex-col justify-between focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                  >
                    <div className="flex items-start gap-3">
                      <div className="size-12 rounded-lg overflow-hidden bg-muted/40 border border-border/60 shrink-0 flex items-center justify-center">
                        {coverImage ? (
                          <img
                            src={coverImage}
                            alt={job.company_name}
                            className="size-full object-cover group-hover:scale-105 transition-transform duration-300"
                            loading="lazy"
                            onError={(e) => {
                              (e.currentTarget as HTMLElement).style.display = "none";
                            }}
                          />
                        ) : (
                          <Briefcase size={20} className="text-muted-foreground/30" />
                        )}
                      </div>
                      <div className="space-y-1 min-w-0 flex-1">
                        <h3 className="font-bold text-sm text-foreground group-hover:text-primary transition-colors line-clamp-1">
                          {job.title}
                        </h3>
                        <p className="text-xs text-muted-foreground font-medium flex items-center gap-1">
                          <Buildings size={13} className="shrink-0" />
                          <span className="break-words text-wrap">{job.company_name}</span>
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-border/30 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <MapPin size={12} />
                        <span className="break-words text-wrap">{job.location}</span>
                      </span>
                      <span className="font-bold text-foreground">
                        {job.salary_display || "A combinar"}
                      </span>
                    </div>
                  </Link>
                );
              })}
            </HorizontalRail>
          )}

          {/* AGENDA & EVENTOS (Unificado Sem Duplicação) */}
          {(activeCategory === "todos" || activeCategory === "eventos" || activeCategory === "agenda") &&
            filteredEvents.length > 0 && (
              <HorizontalRail
                title="Agenda e Eventos"
                subtitle="Encontros, cursos e programação cultural confirmada"
                actionLabel="Ver mais"
                actionTo="/eventos"
              >
                {filteredEvents.map((ev: any) => {
                  const coverImage = ev.cover_image || ev.image_url || ev.banner_url;

                  return (
                    <Link
                      key={ev.id}
                      to="/evento/$id"
                      params={{ id: ev.id }}
                      className="w-76 shrink-0 snap-start rounded-lg border border-border/60 bg-card overflow-hidden hover:border-foreground/30 transition-colors flex flex-col justify-between group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                    >
                      <div className="relative aspect-video w-full overflow-hidden bg-muted/40">
                        {coverImage ? (
                          <img
                            src={coverImage}
                            alt={ev.title}
                            className="size-full object-cover group-hover:scale-105 transition-transform duration-300 motion-reduce:transition-none"
                            loading="lazy"
                            onError={(e) => {
                              (e.currentTarget as HTMLElement).style.display = "none";
                            }}
                          />
                        ) : (
                          <div className="size-full bg-muted/50 flex items-center justify-center">
                            <Ticket size={28} className="text-muted-foreground/30" />
                          </div>
                        )}
                        <div className="absolute top-2 left-2">
                          <Badge variant="secondary" className="bg-background/95 border border-border/40 text-foreground text-xs font-bold">
                            {ev.category || "Evento"}
                          </Badge>
                        </div>
                        <div className="absolute bottom-2 right-2">
                          <span className="bg-foreground text-background text-xs font-mono font-bold px-2 py-1 rounded-md">
                            {ev.date_display || "Confirmado"}
                          </span>
                        </div>
                      </div>

                      <div className="p-4 space-y-2">
                        <h3 className="font-bold text-sm text-foreground group-hover:text-primary transition-colors line-clamp-1">
                          {ev.title}
                        </h3>
                        <p className="text-xs text-muted-foreground line-clamp-1 flex items-center gap-1">
                          <MapPin size={12} className="shrink-0" />
                          <span>{ev.location || "Localidade da região"}</span>
                        </p>
                      </div>
                    </Link>
                  );
                })}
              </HorizontalRail>
            )}

          {/* DESTAQUE INTERMEDIÁRIO DO CMS (Palco Widescreen 2 Colunas — Proporção 16:9 Sem Estouro) */}
          {((middleBanners.length > 0 && !!middleBanners[0].image_url) || activeCategory === "afiliados") && (
            <section aria-label="Destaque Promocional" className="space-y-3">
              {middleBanners.length > 0 && middleBanners[0].image_url ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-stretch">
                  <AdTelemetryBeacon storeId={middleBanners[0].store_id || null} className="w-full">
                    <Link
                      to={(middleBanners[0].link_url || "/afiliados") as any}
                      className="group relative block w-full aspect-banner-cinema rounded-lg overflow-hidden bg-card border border-border/60 hover:border-foreground/30 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                    >
                      {middleBanners[0].media_type === "video" ? (
                        <video
                          src={middleBanners[0].image_url}
                          autoPlay
                          muted
                          loop
                          playsInline
                          className="size-full object-cover"
                        />
                      ) : (
                        <img
                          src={middleBanners[0].image_url}
                          alt={middleBanners[0].title || "Destaque"}
                          className="size-full object-cover"
                          onError={(e) => {
                            (e.currentTarget as HTMLElement).style.display = "none";
                          }}
                        />
                      )}
                      {(middleBanners[0].title || middleBanners[0].badge_text) && (
                        <div className="absolute inset-x-0 bottom-0 p-4 bg-background/90 border-t border-border/40 text-left">
                          {middleBanners[0].badge_text && (
                            <span className="inline-block px-3 py-1 rounded-md text-xs font-mono font-bold uppercase tracking-wider bg-muted text-foreground border border-border/60 mb-2">
                              {middleBanners[0].badge_text}
                            </span>
                          )}
                          <h3 className="text-base font-bold text-foreground leading-tight line-clamp-1">
                            {middleBanners[0].title}
                          </h3>
                          {middleBanners[0].subtitle && (
                            <p className="text-xs text-muted-foreground line-clamp-1 mt-1">
                              {middleBanners[0].subtitle}
                            </p>
                          )}
                        </div>
                      )}
                    </Link>
                  </AdTelemetryBeacon>

                  {middleBanners.length > 1 && middleBanners[1]?.image_url ? (
                    <AdTelemetryBeacon storeId={middleBanners[1].store_id || null} className="w-full">
                      <Link
                        to={(middleBanners[1].link_url || "/marketplace") as any}
                        className="group relative block w-full aspect-banner-cinema rounded-lg overflow-hidden bg-card border border-border/60 hover:border-foreground/30 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                      >
                        <img
                          src={middleBanners[1].image_url}
                          alt={middleBanners[1].title || "Destaque"}
                          className="size-full object-cover"
                          onError={(e) => {
                            (e.currentTarget as HTMLElement).style.display = "none";
                          }}
                        />
                      </Link>
                    </AdTelemetryBeacon>
                  ) : (
                    <div className="aspect-banner-cinema w-full p-6 rounded-lg border border-border/60 bg-card flex flex-col justify-between">
                      <div className="space-y-2">
                        <Badge variant="outline" className="text-xs font-mono uppercase tracking-wider font-bold">
                          Afiliados
                        </Badge>
                        <h3 className="text-lg font-bold text-foreground leading-tight">
                          Programa de Afiliados Waesy
                        </h3>
                        <p className="text-xs text-muted-foreground leading-relaxed line-clamp-3">
                          Indique empresas para a plataforma e receba comissões e benefícios na sua conta.
                        </p>
                      </div>
                      <Button asChild size="sm" className="h-11 min-h-11 px-5 rounded-lg text-xs font-bold self-start">
                        <Link to="/afiliados">
                          <span>Conhecer Afiliados</span>
                          <ArrowRight size={14} className="ml-2" />
                        </Link>
                      </Button>
                    </div>
                  )}
                </div>
              ) : activeCategory === "afiliados" ? (
                <div className="p-6 rounded-lg border border-border/60 bg-card flex flex-row items-center justify-between gap-4">
                  <div className="space-y-1 max-w-xl">
                    <Badge variant="outline" className="text-xs font-mono uppercase tracking-wider font-bold">
                      Afiliados
                    </Badge>
                    <h3 className="text-lg font-bold text-foreground">
                      Programa de Afiliados Waesy
                    </h3>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      Indique empresas para a plataforma e receba comissões e benefícios na sua conta.
                    </p>
                  </div>
                  <Button asChild size="sm" className="h-11 min-h-11 px-5 rounded-lg text-xs font-bold shrink-0">
                    <Link to="/afiliados">
                      <span>Conhecer Afiliados</span>
                      <ArrowRight size={14} className="ml-2" />
                    </Link>
                  </Button>
                </div>
              ) : null}
            </section>
          )}

          {/* SCROLL INFINITO DE DESCOBERTA */}
          {activeCategory === "todos" && (
            <ProceduralInfiniteFeed
              initialExcludedStoreIds={filteredPlaces.map((p: any) => p.store_id || p.id).filter(Boolean)}
              initialExcludedProductIds={[]}
            />
          )}
        </div>
      )}

      {/* ── 7. MODO 2: GRADE EXPANDIDA DESKTOP ── */}
      {viewMode === "grid" && (
        <section aria-label="Grade de Anúncios">
          {unifiedItems.length === 0 ? (
            <div className="py-20 text-center space-y-3 bg-card rounded-lg border border-border/60 p-8">
              <Tag className="size-10 text-muted-foreground/40 mx-auto" />
              <h2 className="text-sm font-bold text-foreground">
                Nenhum anúncio encontrado com estes filtros
              </h2>
              <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                Tente alterar os termos da busca ou selecionar outra categoria.
              </p>
            </div>
          ) : (
            <div className="adaptive-card-grid">
              {unifiedItems.map((item) => (
                <div
                  key={item.id}
                  className="group rounded-lg border border-border/50 bg-card overflow-hidden hover:border-foreground/30 transition-colors flex flex-col justify-between"
                >
                  <Link to={item.to as any} className="flex-1 flex flex-col cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">
                    <div className="relative aspect-video w-full overflow-hidden bg-muted/40 shrink-0">
                      {item.image ? (
                        <img
                          src={item.image}
                          alt={item.title}
                          className="size-full object-cover group-hover:scale-105 transition-transform duration-300 motion-reduce:transition-none"
                          loading="lazy"
                          onError={(e) => {
                            (e.currentTarget as HTMLElement).style.display = "none";
                          }}
                        />
                      ) : (
                        <div className="size-full bg-muted/40 flex items-center justify-center">
                          <Tag size={28} className="text-muted-foreground/30" />
                        </div>
                      )}
                      <div className="absolute top-2 left-2">
                        <Badge className="bg-background/95 text-foreground font-mono text-xs uppercase font-bold px-2 py-1 rounded-md border border-border/40">
                          {item.badge}
                        </Badge>
                      </div>
                    </div>

                    <div className="p-4 space-y-2 flex-1 flex flex-col justify-between">
                      <div className="space-y-1">
                        {item.priceOrDate && (
                          <p className="text-lg font-black text-foreground font-mono whitespace-nowrap shrink-0">
                            {item.priceOrDate}
                          </p>
                        )}
                        <h3 className="text-sm font-bold text-foreground line-clamp-2 leading-snug group-hover:text-primary transition-colors">
                          {item.title}
                        </h3>
                      </div>

                      {item.location && (
                        <div className="pt-2 border-t border-border/30 flex items-center justify-between text-xs text-muted-foreground">
                          <span className="flex items-center gap-1 break-words text-wrap">
                            <MapPin size={12} className="shrink-0 text-primary" />
                            <span className="break-words text-wrap">{item.location}</span>
                          </span>
                        </div>
                      )}
                    </div>
                  </Link>

                  {item.phone && (
                    <div className="px-3 pb-2 pt-0 flex justify-end">
                      <button
                        type="button"
                        onClick={() =>
                          trackAndOpenWhatsApp({
                            phone: item.phone || "",
                            message: `Olá! Vi o anúncio "${item.title}" no Waesy.`,
                            storeId: null,
                            entityType: item.pillar as any,
                            entityId: item.id,
                            entityTitle: item.title,
                          })
                        }
                        className="inline-flex items-center gap-2 h-11 min-h-11 px-3 rounded-md text-xs font-bold text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 hover:bg-emerald-500/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 cursor-pointer transition-colors"
                      >
                        <WhatsappLogo size={16} weight="bold" />
                        <span>WhatsApp</span>
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {/* ── 8. MODO 3: LISTA HORIZONTAL WIDESCREEN DESKTOP ── */}
      {viewMode === "list" && (
        <section aria-label="Lista de Anúncios" className="space-y-3">
          {unifiedItems.length === 0 ? (
            <div className="py-20 text-center space-y-3 bg-card rounded-lg border border-border/50 p-8">
              <Tag className="size-10 text-muted-foreground/40 mx-auto" />
              <h2 className="text-sm font-bold text-foreground">
                Nenhum anúncio encontrado com estes filtros
              </h2>
            </div>
          ) : (
            <div className="flex flex-col space-y-3">
              {unifiedItems.map((item) => (
                <div
                  key={item.id}
                  className="group flex flex-row items-stretch justify-between rounded-lg border border-border/50 bg-card hover:border-foreground/30 transition-colors overflow-hidden p-0 w-full"
                >
                  <Link
                    to={item.to as any}
                    className="relative w-56 lg:w-64 h-auto min-h-36 overflow-hidden bg-muted/40 shrink-0 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                  >
                    {item.image ? (
                      <img
                        src={item.image}
                        alt={item.title}
                        className="size-full object-cover group-hover:scale-105 transition-transform duration-300 motion-reduce:transition-none"
                        loading="lazy"
                        onError={(e) => {
                          (e.currentTarget as HTMLElement).style.display = "none";
                        }}
                      />
                    ) : (
                      <div className="size-full bg-muted/40 flex items-center justify-center">
                        <Tag size={28} className="text-muted-foreground/30" />
                      </div>
                    )}
                    <div className="absolute top-2 left-2">
                      <Badge className="bg-background/95 text-foreground font-mono text-xs uppercase font-bold px-2 py-1 rounded-md border border-border/40">
                        {item.badge}
                      </Badge>
                    </div>
                  </Link>

                  <div className="flex-1 min-w-0 p-5 flex flex-col justify-between space-y-2">
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
                      <span className="flex items-center gap-1 text-xs text-muted-foreground break-words text-wrap">
                        <MapPin size={12} className="shrink-0 text-muted-foreground" />
                        <span className="break-words text-wrap">{item.location || "Na sua região"}</span>
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
                                message: `Olá! Vi o anúncio "${item.title}" no Waesy.`,
                                storeId: null,
                                entityType: item.pillar as any,
                                entityId: item.id,
                                entityTitle: item.title,
                              })
                            }
                            className="h-11 min-h-11 px-4 rounded-lg text-xs gap-2 border-border/50 hover:bg-muted/50 cursor-pointer"
                          >
                            <WhatsappLogo size={16} weight="bold" />
                            <span>WhatsApp</span>
                          </Button>
                        )}

                        <Button
                          asChild
                          variant="outline"
                          size="sm"
                          className="h-11 min-h-11 px-4 rounded-lg text-xs font-semibold hover:bg-muted cursor-pointer"
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
          )}
        </section>
      )}

      {/* ── 9. BANNER DE RODAPÉ WIDESCREEN (Palco 2 Colunas — Proporção 16:9 Sem Estouro) ── */}
      <section aria-label="Portal de Negócios" className="space-y-3">
        {footerBanners.length > 0 && footerBanners[0].image_url ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-stretch">
            <AdTelemetryBeacon storeId={footerBanners[0].store_id || null} className="w-full">
              <Link
                to={(footerBanners[0].link_url || "/criar-negocio") as any}
                className="group relative block w-full aspect-banner-cinema rounded-lg overflow-hidden bg-card border border-border/60 hover:border-foreground/30 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              >
                {footerBanners[0].media_type === "video" ? (
                  <video
                    src={footerBanners[0].image_url}
                    autoPlay
                    muted
                    loop
                    playsInline
                    className="size-full object-cover"
                  />
                ) : (
                  <img
                    src={footerBanners[0].image_url}
                    alt={footerBanners[0].title || "Divulgue sua empresa"}
                    className="size-full object-cover"
                    onError={(e) => {
                      (e.currentTarget as HTMLElement).style.display = "none";
                    }}
                  />
                )}
                {(footerBanners[0].title || footerBanners[0].badge_text) && (
                  <div className="absolute inset-x-0 bottom-0 p-4 bg-background/90 border-t border-border/40 text-left">
                    {footerBanners[0].badge_text && (
                      <span className="inline-block px-3 py-1 rounded-md text-xs font-mono font-bold uppercase tracking-wider bg-muted text-foreground border border-border/60 mb-2">
                        {footerBanners[0].badge_text}
                      </span>
                    )}
                    <h3 className="text-base font-bold text-foreground leading-tight line-clamp-1">
                      {footerBanners[0].title}
                    </h3>
                    {footerBanners[0].subtitle && (
                      <p className="text-xs text-muted-foreground line-clamp-1 mt-1">
                        {footerBanners[0].subtitle}
                      </p>
                    )}
                  </div>
                )}
              </Link>
            </AdTelemetryBeacon>

            <div className="aspect-banner-cinema w-full p-6 rounded-lg border border-border/60 bg-card flex flex-col justify-between">
              <div className="space-y-2">
                <Badge variant="outline" className="text-xs font-mono uppercase tracking-wider font-bold">
                  Empresas e Negócios
                </Badge>
                <h2 className="text-lg font-black tracking-tight text-foreground leading-tight">
                  Divulgue seu negócio no <PlacesHighlightBadge className="text-lg" />
                </h2>
                <p className="text-xs text-muted-foreground leading-relaxed line-clamp-3">
                  Cadastre o perfil da sua empresa com endereço, fotos e WhatsApp para ser encontrado por clientes da sua cidade.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-3 pt-1">
                <Button asChild className="h-11 min-h-11 px-4 rounded-lg font-bold text-xs bg-foreground text-background hover:bg-foreground/90">
                  <Link to="/criar-negocio">
                    <Storefront size={16} weight="bold" className="mr-2" />
                    Cadastrar Empresa
                  </Link>
                </Button>
                <Button asChild variant="outline" className="h-11 min-h-11 px-4 rounded-lg font-bold text-xs border-border/80 hover:bg-muted/60">
                  <Link to="/portal-completo">
                    Conhecer o Sistema Pro
                  </Link>
                </Button>
              </div>
            </div>
          </div>
        ) : (
          <div className="p-8 rounded-lg border border-border/60 bg-card space-y-4">
            <div className="max-w-xl space-y-1">
              <Badge variant="outline" className="text-xs font-mono uppercase tracking-wider font-bold">
                Empresas e Negócios
              </Badge>
              <h2 className="text-xl font-black tracking-tight text-foreground">
                Divulgue seu negócio no <PlacesHighlightBadge className="text-xl" />
              </h2>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Cadastre o perfil da sua empresa com endereço, fotos e WhatsApp para ser encontrado por clientes da sua cidade.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3 pt-1">
              <Button asChild className="h-11 min-h-11 px-5 rounded-lg font-bold text-xs bg-foreground text-background hover:bg-foreground/90">
                <Link to="/criar-negocio">
                  <Storefront size={16} weight="bold" className="mr-2" />
                  Cadastrar Empresa
                </Link>
              </Button>
              <Button asChild variant="outline" className="h-11 min-h-11 px-5 rounded-lg font-bold text-xs border-border/80 hover:bg-muted/60">
                <Link to="/portal-completo">
                  Conhecer o Sistema Pro
                </Link>
              </Button>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
