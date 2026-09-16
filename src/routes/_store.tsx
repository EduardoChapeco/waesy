import { createFileRoute, Outlet, isRedirect } from "@tanstack/react-router";
import { getNavigationMenus, getPublicStoreSettings } from "@/services/cms.functions";
import { getPublicBrandSettings } from "@/services/master.functions";
import { getCart, getGlobalCarts } from "@/services/cart.functions";
import { getActiveGlobalPopups } from "@/services/builder.functions";
import { getUserSession } from "@/services/auth.functions";
import { useEffect } from "react";

import { AppShell } from "@/components/shell/app-shell";
import { GlobalPopupRenderer } from "@/components/commerce/global-popup-renderer";
import { CartProvider, useCartContext } from "@/lib/cart-context";
import { ErrorState, UnconfiguredState } from "@/components/state/states";
import { StoreAnalyticsInjector } from "@/components/analytics/StoreAnalyticsInjector";

export const Route = createFileRoute("/_store")({
 loader: async () => {
 try {
 const [menusRes, storeRes, brandRes, carts, globalCarts, popupsRes, sessionRes] = await Promise.all([
 getNavigationMenus().catch(() => []),
 getPublicStoreSettings().catch(() => null),
 getPublicBrandSettings().catch(() => null),
 getCart().catch(() => null),
 getGlobalCarts().catch(() => []),
 getActiveGlobalPopups().catch(() => []),
 getUserSession().catch(() => null),
 ]);
 return {
 menus: menusRes || [],
 store: storeRes || null,
 brand: brandRes || null,
 carts,
 globalCarts: globalCarts || [],
 popups: popupsRes || [],
 session: sessionRes || null,
 };
 } catch {
 return {
 menus: [],
 store: null,
 brand: null,
 carts: null,
 globalCarts: [],
 popups: [],
 session: null,
 };
 }
 },
 component: StoreLayout,
 errorComponent: StoreRouteError,
});

function StoreRouteError({ error }: { error: Error }) {
 if (isRedirect(error)) {
 throw error;
 }

 const message = error?.message ?? "";
 const isUnconfigured = message.includes("Supabase not configured");

 if (isUnconfigured) {
 return (
 <div className="mx-auto max-w-xl px-4 py-20">
 <UnconfiguredState title="Loja em configuração" />
 </div>
 );
 }

 return (
 <div className="mx-auto max-w-md px-4 py-20 text-center space-y-5">
 <div className="size-14 rounded-2xl bg-destructive/10 border border-destructive/20 flex items-center justify-center text-destructive mx-auto">
 <span className="text-xl font-bold">!</span>
 </div>
 <div className="space-y-1.5">
 <h2 className="text-lg font-bold text-foreground">Não foi possível carregar a página</h2>
 <p className="text-xs text-muted-foreground">
 Ocorreu uma instabilidade temporária ao carregar as informações desta seção.
 </p>
 </div>

 {/* Caixa de Diagnóstico Transparente BigTech */}
 {error?.message && (
 <div className="p-3 rounded-xl bg-destructive/5 border border-destructive/20 text-left text-xs font-mono text-destructive break-all max-h-32 overflow-y-auto">
 <span className="font-bold block mb-1">Diagnóstico Técnico:</span>
 {error.message}
 </div>
 )}

 <div className="flex flex-col sm:flex-row items-center justify-center gap-2 pt-2">
 <button
 onClick={() => {
 if (typeof window !== "undefined") window.location.reload();
 }}
 className="w-full sm:w-auto h-10 px-5 rounded-xl text-xs font-bold bg-primary text-primary-foreground hover:bg-primary/90 transition-colors cursor-pointer"
 >
 Tentar novamente
 </button>
 <a
 href="/"
 className="w-full sm:w-auto h-10 px-5 rounded-xl text-xs font-semibold border border-border hover:bg-muted flex items-center justify-center text-foreground transition-colors"
 >
 Voltar ao início
 </a>
 <a
 href="/workspace"
 className="w-full sm:w-auto h-10 px-5 rounded-xl text-xs font-semibold bg-muted hover:bg-muted/80 flex items-center justify-center text-foreground transition-colors"
 >
 Entrar no Workspace
 </a>
 </div>
 </div>
 );
}

function StoreLayout() {
 const { store, brand, carts, globalCarts, popups, session } = ((Route.useLoaderData?.() as any) || {});
 const { initCart } = useCartContext();

 useEffect(() => {
 initCart(carts, globalCarts);
 }, [carts, globalCarts, initCart]);

 const storeData = store?.data || store;
 const storeName = brand?.platform_name || storeData?.name || "Waesy";
 const logoUrl =
 brand?.logo_url ||
 storeData?.logoUrl ||
 storeData?.settings?.logoUrl ||
 storeData?.settings?.logo_url;
 const baseUrl = typeof window !== "undefined" ? window.location.origin : "https://usewaesy.pages.dev";

 // JSON-LD Structured Data (Organization + WebSite with SearchAction)
 const contactPhone = brand?.support_whatsapp || storeData?.contactPhone || storeData?.phone;
 const jsonLd = {
 "@context": "https://schema.org",
 "@graph": [
 {
 "@type": "Organization",
 "@id": `${baseUrl}/#organization`,
 name: storeName,
 url: baseUrl,
 logo: logoUrl || `${baseUrl}/logo.png`,
 contactPoint: contactPhone
 ? {
 "@type": "ContactPoint",
 telephone: contactPhone,
 contactType: "customer service",
 }
 : undefined,
 },
 {
 "@type": "WebSite",
 "@id": `${baseUrl}/#website`,
 url: baseUrl,
 name: storeName,
 publisher: { "@id": `${baseUrl}/#organization` },
 potentialAction: {
 "@type": "SearchAction",
 target: {
 "@type": "EntryPoint",
 urlTemplate: `${baseUrl}/buscar?q={search_term_string}`,
 },
 "query-input": "required name=search_term_string",
 },
 },
 ],
 };

 const brandSettings = {
 logo_url: brand?.logo_url || storeData?.logoUrl || storeData?.settings?.logoUrl || null,
 favicon_url: brand?.favicon_url || storeData?.faviconUrl || storeData?.settings?.faviconUrl || null,
 show_logo: brand?.show_logo !== false && storeData?.settings?.show_logo !== false,
 show_name: brand?.show_name !== false && storeData?.settings?.show_name !== false,
 platform_name: brand?.platform_name || storeData?.name || "Waesy",
 };

 return (
 <AppShell session={session} brandSettings={brandSettings}>
 <StoreAnalyticsInjector storeSettings={storeData?.settings} />
 <script
 type="application/ld+json"
 dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
 />
 <Outlet />
 <GlobalPopupRenderer popups={popups} />
 </AppShell>
 );
}
