const fs = require('fs');
const path = require('path');

const srcPath = path.resolve('src/routes/_store.explorar.tsx');
const destPath = path.resolve('src/routes/_store.index.tsx');

let content = fs.readFileSync(srcPath, 'utf8');

// 1. Add imports at the top
const launchImports = `import { getLaunchLandingSettings } from "@/services/launch.functions";
import { LaunchHomeView } from "@/components/landing/launch-home-view";
`;

content = launchImports + content;

// 2. Change Route path back to /_store/
content = content.replace(
  'export const Route = createFileRoute("/_store/explorar")({',
  'export const Route = createFileRoute("/_store/")({'
);

// 3. Update title
content = content.replace(
  'title: "Waesy — Explorar Vitrine Comunitária & Negócios Locais"',
  'title: "Waesy — Seja um Membro Fundador | Circuito 2027"'
);

// 4. In loader, fetch launchSettings
const loaderTarget = 'const filteredCity = activeCity && activeCity !== "Global" ? activeCity : undefined;';
const loaderReplacement = `const filteredCity = activeCity && activeCity !== "Global" ? activeCity : undefined;
      const launchSettings = await getLaunchLandingSettings().catch(() => null);`;

content = content.replace(loaderTarget, loaderReplacement);

// 5. In loader return, add launchSettings
content = content.replace('concursos,\n      };', 'concursos,\n        launchSettings,\n      };');

// 6. In CommunityHomePage, extract launchSettings and conditionally render LaunchHomeView
const componentTarget = `function CommunityHomePage() {
  const {
    banners = [],`;

const componentReplacement = `function CommunityHomePage() {
  const {
    launchSettings = null,
    banners = [],`;

content = content.replace(componentTarget, componentReplacement);

// 7. Add the temporary switch right after the useLoaderData line
const hookTarget = `  } = ((Route.useLoaderData?.() as any) || {});`;
const hookReplacement = `  } = ((Route.useLoaderData?.() as any) || {});

  // Roteamento temporário: por padrão a raiz / exibe a landing page de lançamento (Circuito 2027)
  // com botão de login. A vitrine comunitária completa permanece 100% preservada e acessível
  // via URL /explorar ou adicionando ?view=marketplace.
  const routeSearch = ((Route.useSearch?.() as any) || {});
  const isMarketplace = routeSearch.view === "marketplace" || routeSearch.view === "vitrine";

  if (!isMarketplace) {
    return <LaunchHomeView initialSettings={launchSettings} />;
  }`;

content = content.replace(hookTarget, hookReplacement);

fs.writeFileSync(destPath, content, 'utf8');
console.log('Successfully generated src/routes/_store.index.tsx with all lines intact!');
console.log('New file lines:', content.split('\n').length);
