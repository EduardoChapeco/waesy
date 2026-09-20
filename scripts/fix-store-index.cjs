const fs = require('fs');
const path = require('path');

const srcPath = path.resolve('src/routes/_store.explorar.tsx');
const destPath = path.resolve('src/routes/_store.index.tsx');

let content = fs.readFileSync(srcPath, 'utf8');

// 1. Ensure imports at top
const launchImports = `import { getLaunchLandingSettings } from "@/services/launch.functions";
import { LaunchHomeView } from "@/components/landing/launch-home-view";
`;

if (!content.includes('import { LaunchHomeView }')) {
  content = launchImports + content;
}

// 2. Change route definition to /_store/
content = content.replace(
  'export const Route = createFileRoute("/_store/explorar")({',
  'export const Route = createFileRoute("/_store/")({'
);

// 3. Update title
content = content.replace(
  'title: "Waesy — Explorar Vitrine Comunitária & Negócios Locais"',
  'title: "Waesy — Seja um Membro Fundador | Circuito 2027"'
);

// 4. In loader, fetch launchSettings safely
const cityLine = 'const filteredCity = activeCity && activeCity !== "Global" ? activeCity : undefined;';
const cityWithLaunch = `const filteredCity = activeCity && activeCity !== "Global" ? activeCity : undefined;
      const launchSettings = await getLaunchLandingSettings().catch(() => null);`;

content = content.replace(cityLine, cityWithLaunch);

// 5. In loader return, add launchSettings to both success and catch
const successReturnTarget = `        feedPosts: (feedResponse as MuralFeedResponse)?.items || [],
        concursos: concursos || [],
      };`;

const successReturnRepl = `        feedPosts: (feedResponse as MuralFeedResponse)?.items || [],
        concursos: concursos || [],
        launchSettings: launchSettings || null,
      };`;

content = content.replace(successReturnTarget, successReturnRepl);

const catchReturnTarget = `        feedPosts: [],
        concursos: [],
      };`;

const catchReturnRepl = `        feedPosts: [],
        concursos: [],
        launchSettings: null,
      };`;

content = content.replace(catchReturnTarget, catchReturnRepl);

// 6. Wrap the Marketplace logic in CommunityMarketplaceView and make CommunityHomePage the clean switcher
const oldComponentDecl = 'function CommunityHomePage() {';
const newComponentDecl = `function CommunityHomePage() {
  const data = (Route.useLoaderData?.() as any) || {};
  const routeSearch = (Route.useSearch?.() as any) || {};
  const isMarketplace = routeSearch.view === "marketplace" || routeSearch.view === "vitrine";

  if (!isMarketplace) {
    return <LaunchHomeView initialSettings={data.launchSettings || null} />;
  }

  return <CommunityMarketplaceView data={data} />;
}

function CommunityMarketplaceView({ data }: { data: any }) {`;

content = content.replace(oldComponentDecl, newComponentDecl);

// 7. Update data extraction inside CommunityMarketplaceView
content = content.replace(
  '} = ((Route.useLoaderData?.() as any) || {});',
  '} = (data || {});'
);

fs.writeFileSync(destPath, content, 'utf8');
console.log('Successfully generated clean src/routes/_store.index.tsx!');
console.log('Total lines:', content.split('\n').length);
