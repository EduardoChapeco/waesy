const fs = require('fs');

let code = fs.readFileSync('src/routes/_store.afiliados.tsx', 'utf8');

// 1. Add import
if (!code.includes('NativeMobileHeader')) {
  code = `import { NativeMobileHeader } from "@/components/navigation/native-mobile-header";\n` + code;
}

// 2. Replace the topbar block
const oldTopbarRegex = /\{\/\* ─── Top Bar Nativa Apple HIG \(Direta, Comercial e Silenciosa\) ─── \*\/\}[\s\S]*?<\/div>\s*<\/div>\s*<\/div>/;

const newHeader = `{/* ─── Top Bar Nativa Apple HIG com NativeMobileHeader ─── */}
      <NativeMobileHeader
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
      />`;

if (oldTopbarRegex.test(code)) {
  code = code.replace(oldTopbarRegex, newHeader);
  fs.writeFileSync('src/routes/_store.afiliados.tsx', code, 'utf8');
  console.log('[patch] _store.afiliados.tsx patched cleanly');
} else {
  console.error('[error] oldTopbarRegex did not match');
}
