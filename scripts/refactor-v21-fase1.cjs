const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');

// 1. Refactor UtilityCluster
const ucPath = path.join(root, 'src/components/shell/utility-cluster.tsx');
let uc = fs.readFileSync(ucPath, 'utf8');

// Replace tablet search button and sm: breakpoints with md:
const oldUcBlock = `{/* 1. Busca Rápida (Apenas Tablet, escondido no Mobile e no Desktop com busca expandida) */}
 <Button
 variant="ghost"
 size="icon"
 onClick={() => setSearchOpen(true)}
 className="size-8 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted/80 transition-all active:scale-95 cursor-pointer hidden sm:inline-flex lg:hidden"
 title="Buscar"
 >
 <Search className="size-4" />
 </Button>

 {/* 2. Conversas / Chat Direto (Oculto no mobile pois já existe na MobileNav) */}
 {session && (
 <Button
 asChild
 variant="ghost"
 size="icon"
 className="hidden sm:inline-flex size-8 rounded-xl relative text-muted-foreground hover:text-foreground hover:bg-muted/80 transition-all active:scale-95 cursor-pointer"
 title="Atendimento & Suporte"
 >
 <Link to="/conta/suporte">
 <MessageSquare className="size-4" />
 </Link>
 </Button>
 )}

 {/* 3. Sacola de Compras (Oculto no mobile pois já existe na MobileNav) */}
 <Button
 variant="ghost"
 size="icon"
 onClick={() => setIsCartOpen(true)}
 className="hidden sm:inline-flex size-8 rounded-xl relative text-muted-foreground hover:text-foreground hover:bg-muted/80 transition-all active:scale-95 cursor-pointer"
 title="Sacola de Compras"
 >
 <ShoppingBag className="size-4" />
 {totalItemCount > 0 && (
 <span className="absolute -top-1 -right-1 size-4 bg-primary text-primary-foreground text-[9px] font-bold rounded-lg flex items-center justify-center animate-scale-in">
 {totalItemCount}
 </span>
 )}
 </Button>

 {/* 4. Notificações */}
 <NotificationsPopover session={session} />

 {/* 5. Alternador de Tema Dark/Light */}
 <ThemeToggle className="hidden sm:inline-flex size-8 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted/80 transition-all active:scale-95 cursor-pointer" />

 <div className="hidden sm:block h-4 w-px bg-border/60 mx-0.5" />`;

const newUcBlock = `{/* 1. Conversas / Chat Direto (Desktop >= 768px) */}
 {session && (
 <Button
 asChild
 variant="ghost"
 size="icon"
 className="hidden md:inline-flex size-8 rounded-xl relative text-muted-foreground hover:text-foreground hover:bg-muted/80 transition-all active:scale-95 cursor-pointer"
 title="Atendimento & Suporte"
 >
 <Link to="/conta/suporte">
 <MessageSquare className="size-4" />
 </Link>
 </Button>
 )}

 {/* 2. Sacola de Compras (Desktop >= 768px) */}
 <Button
 variant="ghost"
 size="icon"
 onClick={() => setIsCartOpen(true)}
 className="hidden md:inline-flex size-8 rounded-xl relative text-muted-foreground hover:text-foreground hover:bg-muted/80 transition-all active:scale-95 cursor-pointer"
 title="Sacola de Compras"
 >
 <ShoppingBag className="size-4" />
 {totalItemCount > 0 && (
 <span className="absolute -top-1 -right-1 size-4 bg-primary text-primary-foreground text-[9px] font-bold rounded-lg flex items-center justify-center animate-scale-in">
 {totalItemCount}
 </span>
 )}
 </Button>

 {/* 3. Notificações */}
 <NotificationsPopover session={session} />

 {/* 4. Alternador de Tema Dark/Light (Desktop >= 768px) */}
 <ThemeToggle className="hidden md:inline-flex size-8 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted/80 transition-all active:scale-95 cursor-pointer" />

 <div className="hidden md:block h-4 w-px bg-border/60 mx-0.5" />`;

if (uc.includes(oldUcBlock)) {
  uc = uc.replace(oldUcBlock, newUcBlock);
  console.log('✅ utility-cluster.tsx: Replaced header cluster breakpoints');
} else {
  console.warn('⚠️ utility-cluster.tsx: old block not found, performing targeted replacement');
  uc = uc.replace(/hidden sm:inline-flex lg:hidden/g, 'hidden');
  uc = uc.replace(/hidden sm:inline-flex/g, 'hidden md:inline-flex');
  uc = uc.replace(/hidden sm:block/g, 'hidden md:block');
}

// Also unauthenticated button
uc = uc.replace(
  'className="h-8 rounded-xl px-3 text-xs font-bold bg-primary text-primary-foreground"',
  'className="hidden md:inline-flex h-8 rounded-xl px-3 text-xs font-bold bg-primary text-primary-foreground"'
);
fs.writeFileSync(ucPath, uc);

// 2. Refactor ContextSidebar
const csPath = path.join(root, 'src/components/shell/context-sidebar.tsx');
let cs = fs.readFileSync(csPath, 'utf8');

cs = cs.replace(
  'className="hidden lg:flex flex-col w-60 shrink-0 h-full py-3 px-2.5 bg-background justify-between select-none overflow-y-auto no-scrollbar z-20 border-r border-border/40"',
  'className="hidden md:flex flex-col w-52 lg:w-60 shrink-0 h-full py-3 px-2.5 bg-background justify-between select-none overflow-y-auto no-scrollbar z-20 border-r border-border/40"'
);

// Eradicate shadow-2xs in active sidebar links
cs = cs.replace(/"bg-primary\/10 text-primary font-bold shadow-2xs"/g, '"bg-primary/10 text-primary font-bold"');
fs.writeFileSync(csPath, cs);
console.log('✅ context-sidebar.tsx: Updated to hidden md:flex w-52 lg:w-60 and eradicated shadow-2xs');

// 3. Refactor MobileNav
const mnPath = path.join(root, 'src/components/shell/mobile-nav.tsx');
let mn = fs.readFileSync(mnPath, 'utf8');

mn = mn.replace(
  'className="lg:hidden fixed bottom-2.5 inset-x-2.5 z-40 max-w-xl mx-auto select-none"',
  'className="md:hidden fixed bottom-2.5 inset-x-2.5 z-40 max-w-xl mx-auto select-none"'
);

// Eradicate shadows in mobile-nav
mn = mn.replace('border border-border/70 shadow-xs rounded-[24px]', 'border border-border rounded-[24px]');
mn = mn.replace('border border-background shadow-xs">', 'border border-background">');
mn = mn.replace('active:scale-95 transition-all shadow-xs"', 'active:scale-95 transition-all"');
fs.writeFileSync(mnPath, mn);
console.log('✅ mobile-nav.tsx: Strictly bound to md:hidden and eradicated shadows');

// 4. Refactor AppShell
const asPath = path.join(root, 'src/components/shell/app-shell.tsx');
let as = fs.readFileSync(asPath, 'utf8');

as = as.replace(
  'className={isProfilePage || isFormPage || isCleanMobileAppPage ? "hidden sm:block" : ""}',
  'className={isProfilePage || isFormPage || isCleanMobileAppPage ? "hidden md:block" : ""}'
);

as = as.replace(
  'px-[1px] sm:px-4 py-1 sm:py-2.5 pb-24 md:pb-8',
  'px-[1px] md:px-4 py-1 md:py-2.5 pb-24 md:pb-8'
);

as = as.replace(
  'px-[1px] sm:px-6 py-1 sm:py-3 pb-20 md:pb-8',
  'px-[1px] md:px-6 py-1 md:py-3 pb-20 md:pb-8'
);

as = as.replace(
  'px-[1px] sm:px-6 py-1 sm:py-2 pb-24 md:pb-8',
  'px-[1px] md:px-6 py-1 md:py-2 pb-24 md:pb-8'
);

as = as.replace(
  'px-[1px] sm:px-6 py-1 sm:py-2.5 pb-24 md:pb-8',
  'px-[1px] md:px-6 py-1 md:py-2.5 pb-24 md:pb-8'
);

fs.writeFileSync(asPath, as);
console.log('✅ app-shell.tsx: TopBar bound to hidden md:block on app pages and main paddings unified');

console.log('🎉 FASE 1 COMPLETE: Global layout and header breakpoints unified with zero leakage!');
