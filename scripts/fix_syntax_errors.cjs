const fs = require('fs');

// 1. Fix _store.conta.empresa.tsx
let empresa = fs.readFileSync('src/routes/_store.conta.empresa.tsx', 'utf8');
const targetEmpresaRegex = /<NativeMobileHeader[\s\S]*?<\/div>\s*<\/div>\s*<\/div>\s*<div className="max-w-6xl/;
const cleanEmpresaHeader = `<NativeMobileHeader
        fallbackHref="/conta"
        title={store.name}
        subtitle={\`\${store.settings?.category || "Comércio & Serviços"} • \${store.city || "Chapecó"}, \${store.state || "SC"}\`}
        rightActions={
          <div className="flex items-center gap-1.5 sm:gap-2">
            <CompanyNotificationsBell />
            <Button asChild size="sm" className="h-8.5 px-3 rounded-xl text-xs font-bold gap-1.5 bg-primary text-primary-foreground">
              <Link to="/workspace">
                <Store className="size-3.5" />
                <span className="hidden xs:inline">Workspace</span>
              </Link>
            </Button>
          </div>
        }
      />

      <div className="max-w-6xl mx-auto px-0 sm:px-4 md:px-0 py-6 space-y-6 animate-in fade-in duration-200">
        {/* Barra de Ações Rápidas da Empresa */}
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-1">
          <Button asChild variant="outline" size="sm" className="h-9 px-3 rounded-xl text-xs gap-1.5 border-border/80 hover:bg-muted/50 shrink-0">
            <Link to="/perfil-da-loja" search={{ storeId: store.id }} target="_blank">
              <span>Ver Perfil Público</span>
              <ArrowUpRight className="size-3.5" />
            </Link>
          </Button>

          <Button asChild variant="outline" size="sm" className="h-9 px-3 rounded-xl text-xs gap-1.5 border-border/80 hover:bg-muted/50 shrink-0">
            <Link to="/workspace/marketing/brand-kit">
              <Edit className="size-3.5 text-primary" />
              <span>Editar Perfil & Marca</span>
            </Link>
          </Button>

          <Button asChild size="sm" variant="outline" className="h-9 px-3 rounded-xl text-xs font-semibold gap-1.5 border-primary/30 text-primary hover:bg-primary/5 shrink-0">
            <Link to="/portal-completo">
              <Layers className="size-3.5" />
              <span>Gestão Pro</span>
            </Link>
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setCustomFields(initialFormSettings?.fields || []);
              setIsCustomFormModalOpen(true);
            }}
            className="h-9 px-3 rounded-xl text-xs font-bold gap-1.5 border-border/80 hover:bg-muted/50 shrink-0"
          >
            <FileText className="size-3.5 text-primary" />
            <span>Campos da Proposta</span>
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsDeliveryModalOpen(true)}
            className="h-9 px-3 rounded-xl text-xs font-bold gap-1.5 border-border/80 hover:bg-muted/50 shrink-0"
          >
            <Bike className="size-3.5 text-primary" />
            <span>Configurar Entregas</span>
          </Button>
        </div>`;

if (targetEmpresaRegex.test(empresa)) {
  empresa = empresa.replace(targetEmpresaRegex, cleanEmpresaHeader);
  fs.writeFileSync('src/routes/_store.conta.empresa.tsx', empresa, 'utf8');
  console.log('[fix] _store.conta.empresa.tsx successfully updated');
} else {
  console.error('[error] targetEmpresaRegex failed to match');
}

// 2. Fix _store.afiliados.tsx
let afiliados = fs.readFileSync('src/routes/_store.afiliados.tsx', 'utf8');
const targetAfiliadosRegex = /<NativeMobileHeader[\s\S]*?<\/div>\s*\{\/\* 3\. Lojas Parceiras/;
const cleanAfiliadosHeader = `<NativeMobileHeader
        fallbackHref="/conta"
        title="Parceiros & Criadores"
        badge={
          partner ? (
            <Badge variant="outline" className="text-[11px] font-mono bg-primary/5 text-primary border-primary/20 shrink-0">
              @{referralHandle}
            </Badge>
          ) : null
        }
        rightActions={
          partner ? (
            <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
              <Button asChild variant="outline" size="sm" className="h-8.5 px-2.5 rounded-xl text-xs gap-1.5">
                <Link to="/u/$username" params={{ username: referralHandle }}>
                  <Globe className="size-3.5" />
                  <span className="hidden xs:inline">Minha Vitrine</span>
                </Link>
              </Button>

              <Button asChild size="sm" className="h-8.5 px-2.5 rounded-xl text-xs font-semibold gap-1.5">
                <Link to="/feed">
                  <PenSquare className="size-3.5" />
                  <span>Publicar</span>
                </Link>
              </Button>
            </div>
          ) : null
        }
      />

      <div className="max-w-6xl mx-auto px-0 sm:px-4 md:px-0 py-6 space-y-6 animate-in fade-in duration-200">
        {/* 3. Lojas Parceiras`;

if (targetAfiliadosRegex.test(afiliados)) {
  afiliados = afiliados.replace(targetAfiliadosRegex, cleanAfiliadosHeader);
  fs.writeFileSync('src/routes/_store.afiliados.tsx', afiliados, 'utf8');
  console.log('[fix] _store.afiliados.tsx successfully updated');
} else {
  console.error('[error] targetAfiliadosRegex failed to match');
}
