import { Link } from "@tanstack/react-router";

import { Logo } from "@/components/commerce/logo";

export function PublicFooter({ menuItems = [], store }: { menuItems?: any[]; store?: any }) {
 const storeName = store?.name || "Waesy";
 const storeDesc =
 store?.description ||
 "Plataforma da comunidade para produtores culturais, negócios e artistas locais.";

 // Agrupa a lista plana de itens em colunas de até 4 links
 const navItems = menuItems;

 const colSize = Math.ceil(navItems.length / 2) || 1;
 const col1 = navItems.slice(0, colSize);
 const col2 = navItems.slice(colSize);
  return (
    <footer className="mt-16 bg-card border-t border-border/60">
      <div className="mx-auto max-w-screen-xl px-4 py-12 md:px-6">
        <div className="grid gap-10 md:grid-cols-3">
 <div className="space-y-3">
 <Logo src={store?.logoUrl || store?.settings?.logoUrl || store?.settings?.logo_url} />
 {(store?.logoUrl || store?.settings?.logoUrl || store?.settings?.logo_url) && (
 <h2 className="font-bold text-lg">{storeName}</h2>
 )}
 <p className="max-w-xs text-sm text-muted-foreground">{storeDesc}</p>
 </div>

 <nav aria-label="Navegação 1">
 <h3 className="eyebrow mb-3 text-muted-foreground">Links Úteis</h3>
 <ul className="space-y-2">
 {col1.map((link: any) => (
 <li key={link.url}>
 <Link
 to={link.url}
 className="text-sm text-foreground/80 transition-colors hover:text-primary"
 >
 {link.label}
 </Link>
 </li>
 ))}
 </ul>
 </nav>

 {col2.length > 0 && (
 <nav aria-label="Navegação 2">
 <h3 className="eyebrow mb-3 text-muted-foreground">Mais</h3>
 <ul className="space-y-2">
 {col2.map((link: any) => (
 <li key={link.url}>
 <Link
 to={link.url}
 className="text-sm text-foreground/80 transition-colors hover:text-primary"
 >
 {link.label}
 </Link>
 </li>
 ))}
 </ul>
 </nav>
 )}
 </div>
 <div className="mt-10 flex flex-col gap-2 pt-6 text-xs text-muted-foreground md:flex-row md:items-center md:justify-between">
 <p>
 © {new Date().getFullYear()} {storeName}. Todos os direitos reservados.
 </p>
 <p>{store?.email ? `Contato: ${store.email}` : "Apoie a Comunidade"}</p>
 </div>
 </div>
 </footer>
 );
}
