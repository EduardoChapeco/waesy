const fs = require('fs');

let storeTsx = fs.readFileSync('src/routes/_store.tsx', 'utf8');

const targetReturnRegex = /return\s*\(\s*<AppShell session=\{session\} brandSettings=\{brandSettings\}>[\s\S]*?<\/AppShell>\s*\);\s*\}/;

const shellEscapeReplacement = `const routerState = useRouterState();
  const searchParams = (routerState.location.search as any) || {};
  const isMarketplace = searchParams.view === "marketplace" || searchParams.view === "vitrine";
  const isMarketingLanding = routerState.location.pathname === "/" && !isMarketplace;

  if (isMarketingLanding) {
    return (
      <div className="w-full min-h-screen bg-background text-foreground overflow-x-hidden selection:bg-primary/20">
        <StoreAnalyticsInjector storeSettings={storeData?.settings} />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
        <Outlet />
        <GlobalPopupRenderer popups={popups} />
      </div>
    );
  }

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
}`;

if (targetReturnRegex.test(storeTsx)) {
  storeTsx = storeTsx.replace(targetReturnRegex, shellEscapeReplacement);
  fs.writeFileSync('src/routes/_store.tsx', storeTsx, 'utf8');
  console.log('[success] _store.tsx updated with The Shell Escape barrier');
} else {
  console.error('[error] targetReturnRegex failed to match');
}

// 2. Add defense-in-depth to app-shell.tsx
let appShell = fs.readFileSync('src/components/shell/app-shell.tsx', 'utf8');
if (!appShell.includes('isMarketingLanding')) {
  const targetAppShellRegex = /const isFeedPage = location\.pathname\.startsWith\("\/feed"\);/;
  const appShellDefense = `const isFeedPage = location.pathname.startsWith("/feed");
  const isMarketplace = (location.search as any)?.view === "marketplace" || (location.search as any)?.view === "vitrine";
  const isMarketingLanding = location.pathname === "/" && !isMarketplace;`;

  if (targetAppShellRegex.test(appShell)) {
    appShell = appShell.replace(targetAppShellRegex, appShellDefense);
    
    // Suprime TopBar se for landing
    appShell = appShell.replace(
      'isProfilePage || isFormPage || isCleanMobileAppPage || isDetailPage ? "hidden md:block" : ""',
      'isMarketingLanding ? "hidden" : (isProfilePage || isFormPage || isCleanMobileAppPage || isDetailPage ? "hidden md:block" : "")'
    );
    
    // Suprime ContextSidebar se for landing
    appShell = appShell.replace(
      'contextConfig.showContextSidebar !== false && (',
      '!isMarketingLanding && contextConfig.showContextSidebar !== false && ('
    );

    // Suprime MobileNav se for landing
    appShell = appShell.replace(
      '{!isDetailPage && <MobileNav session={session} userRole={session?.role} />}',
      '{!isDetailPage && !isMarketingLanding && <MobileNav session={session} userRole={session?.role} />}'
    );

    fs.writeFileSync('src/components/shell/app-shell.tsx', appShell, 'utf8');
    console.log('[success] app-shell.tsx updated with defense-in-depth');
  } else {
    console.error('[error] targetAppShellRegex failed to match');
  }
}
