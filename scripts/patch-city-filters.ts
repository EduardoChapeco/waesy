/**
 * patch-city-filters.ts
 * Aplica indexação contextual e filtragem por cidade em Serviços BFF e Rotas de UI
 */

import fs from "fs";
import path from "path";

function patchFile(filePath: string, mutator: (content: string) => string) {
  const fullPath = path.resolve(filePath);
  const original = fs.readFileSync(fullPath, "utf8");
  const modified = mutator(original);
  if (original !== modified) {
    fs.writeFileSync(fullPath, modified, "utf8");
    console.log(`[OK] Modificado: ${filePath}`);
  } else {
    console.log(`[SKIP] Sem alteracoes necessarias: ${filePath}`);
  }
}

// 1. src/services/news.functions.ts
patchFile("src/services/news.functions.ts", (content) => {
  let c = content;

  // Add city, state to NewsArticleDTO
  if (!c.includes("city?: string;")) {
    c = c.replace(
      /(tags:\s*string\[\];)/,
      "$1\n  city?: string;\n  state?: string;"
    );
  }

  // Add city to listPublicArticles validator
  if (!c.includes("city: z.string().optional()")) {
    c = c.replace(
      /(query:\s*z\.string\(\)\.optional\(\),)/,
      "$1\n      city: z.string().optional(),"
    );
  }

  // Add city, state to SQL select
  if (!c.includes("tags, city, state, reading_time_minutes")) {
    c = c.replace(
      "tags, reading_time_minutes",
      "tags, city, state, reading_time_minutes"
    );
  }

  // Add city filter in query
  if (!c.includes("q.or(`city.ilike.%${data.city}%")) {
    c = c.replace(
      /(if\s*\(data\?\.query\)\s*\{)/,
      `if (data?.city && data.city !== "todas" && data.city !== "Todas" && data.city !== "Global" && data.city !== "all") {\n        q = q.or(\`city.ilike.%\${data.city}%,tags.cs.{\${data.city.toLowerCase()}}\`);\n      }\n\n      $1`
    );
  }

  // Add city, state to return mapping
  if (!c.includes('city: a.city || "Chapecó"')) {
    c = c.replace(
      /(tags:\s*a\.tags\s*\|\|\s*\[\],)/,
      `$1\n        city: a.city || "Chapecó",\n        state: a.state || "SC",`
    );
  }

  return c;
});

// 2. src/services/jobs.functions.ts
patchFile("src/services/jobs.functions.ts", (content) => {
  let c = content;

  // Add city to validator
  if (!c.includes("city: z.string().optional()")) {
    c = c.replace(
      /(contract_type:\s*z\.string\(\)\.optional\(\),)/,
      "$1\n        city: z.string().optional(),"
    );
  }

  // Add city filter in query
  if (!c.includes("location_city.ilike")) {
    c = c.replace(
      /(if\s*\(data\?\.search\s*&&)/,
      `if (data?.city && data.city !== "todos" && data.city !== "Todas" && data.city !== "Global" && data.city !== "all") {\n      const c = \`%\${data.city.trim()}%\`;\n      query = query.or(\`location_city.ilike.\${c},location.ilike.\${c}\`);\n    }\n\n    $1`
    );
  }

  return c;
});

// 3. src/services/directory.functions.ts
patchFile("src/services/directory.functions.ts", (content) => {
  let c = content;

  // Add city to validator
  if (!c.includes("city: z.string().optional()")) {
    c = c.replace(
      /(search:\s*z\.string\(\)\.optional\(\),)/,
      "$1\n        city: z.string().optional(),"
    );
  }

  // Add city filter in query
  if (!c.includes("query = query.ilike(\"city\"")) {
    c = c.replace(
      /(if\s*\(data\?\.search\s*&&)/,
      `if (data?.city && data.city !== "todos" && data.city !== "Todas" && data.city !== "Global" && data.city !== "all") {\n      query = query.ilike("city", \`%\${data.city.trim()}%\`);\n    }\n\n    $1`
    );
  }

  return c;
});

// 4. src/routes/_store.noticias.index.tsx
patchFile("src/routes/_store.noticias.index.tsx", (content) => {
  let c = content;

  // Pass city in loader
  c = c.replace(
    'listPublicArticles({ data: { limit: 40 } })',
    'listPublicArticles({ data: { limit: 40, city: activeCity } })'
  );

  // Expose activeCity in loader return
  if (!c.includes("activeCity,")) {
    c = c.replace(
      "return { articles, banners, hotpages, sponsors, indicators: indicators || [] };",
      "return { articles, banners, hotpages, sponsors, indicators: indicators || [], activeCity };"
    );
  }

  // Read activeCity in NoticiasFeedPage
  if (!c.includes("activeCity = \"\"")) {
    c = c.replace(
      "indicators = [],\n  } = ((Route.useLoaderData?.() as any) || {});",
      "indicators = [],\n    activeCity = \"\",\n  } = ((Route.useLoaderData?.() as any) || {});"
    );
  }

  // Pass activeCity in handleFilterCategory
  c = c.replace(
    `category: cat === "todas" ? undefined : cat,\n        query: searchQuery || undefined,\n        limit: 40,`,
    `category: cat === "todas" ? undefined : cat,\n        query: searchQuery || undefined,\n        city: activeCity || undefined,\n        limit: 40,`
  );

  // Pass activeCity in handleSearch
  c = c.replace(
    `category: selectedCategory === "todas" ? undefined : selectedCategory,\n        query: searchQuery || undefined,\n        limit: 40,`,
    `category: selectedCategory === "todas" ? undefined : selectedCategory,\n        query: searchQuery || undefined,\n        city: activeCity || undefined,\n        limit: 40,`
  );

  return c;
});

// 5. src/routes/_store.empregos.index.tsx
patchFile("src/routes/_store.empregos.index.tsx", (content) => {
  let c = content;

  // Pass city in loader
  c = c.replace(
    "listPublicJobs().catch(() => []),",
    "listPublicJobs({ data: { city: activeCity } }).catch(() => []),"
  );

  // Expose activeCity in loader return
  if (!c.includes("activeCity,")) {
    c = c.replace(
      "return { banners: banners || [], hotpages: hotpages || [], jobs: jobs || [] };",
      "return { banners: banners || [], hotpages: hotpages || [], jobs: jobs || [], activeCity };"
    );
  }

  // Read activeCity in JobsMasterPage
  if (!c.includes("activeCity = loaderData.activeCity")) {
    c = c.replace(
      "const initialJobs = loaderData.jobs || [];",
      "const initialJobs = loaderData.jobs || [];\n  const activeCity = loaderData.activeCity || \"\";"
    );
  }

  // Pass city in useQuery
  c = c.replace(
    'queryKey: ["jobs-list", selectedCategory, search],',
    'queryKey: ["jobs-list", selectedCategory, search, activeCity],'
  );

  c = c.replace(
    `category: selectedCategory !== "todos" ? selectedCategory : undefined,\n        search: search || undefined,`,
    `category: selectedCategory !== "todos" ? selectedCategory : undefined,\n        search: search || undefined,\n        city: activeCity || undefined,`
  );

  return c;
});

// 6. src/routes/_store.eventos.tsx
patchFile("src/routes/_store.eventos.tsx", (content) => {
  let c = content;

  // Expose activeCity in loader return
  if (!c.includes("activeCity,")) {
    c = c.replace(
      "return {\n        banners: banners || [],\n        hotpages: hotpages || [],\n      };",
      "return {\n        banners: banners || [],\n        hotpages: hotpages || [],\n        activeCity,\n      };"
    );
  }

  // Read activeCity in EventosPage
  if (!c.includes("const activeCity = loaderData?.activeCity")) {
    c = c.replace(
      "const loaderData = ((typeof Route?.useLoaderData === \"function\" ? Route.useLoaderData() : {}) as any) || {};",
      "const loaderData = ((typeof Route?.useLoaderData === \"function\" ? Route.useLoaderData() : {}) as any) || {};\n  const activeCity = loaderData?.activeCity || \"\";"
    );
  }

  // Pass city to getPublicEvents in useQuery
  c = c.replace(
    'queryKey: ["public-events-marketplace"],',
    'queryKey: ["public-events-marketplace", activeCity],'
  );

  c = c.replace(
    "limit: 150,",
    "limit: 150,\n            city: activeCity || undefined,"
  );

  return c;
});

// 7. src/routes/_store.diretorio.index.tsx
patchFile("src/routes/_store.diretorio.index.tsx", (content) => {
  let c = content;

  // Expose activeCity in loader return
  if (!c.includes("activeCity,")) {
    c = c.replace(
      "return { banners: banners || [], hotpages: hotpages || [] };",
      "return { banners: banners || [], hotpages: hotpages || [], activeCity };"
    );
  }

  // Read activeCity in DirectoryPage
  if (!c.includes("const activeCity = loaderData?.activeCity")) {
    c = c.replace(
      "const loaderData = ((typeof Route?.useLoaderData === \"function\" ? Route.useLoaderData() : {}) as any) || {};",
      "const loaderData = ((typeof Route?.useLoaderData === \"function\" ? Route.useLoaderData() : {}) as any) || {};\n  const activeCity = loaderData?.activeCity || \"\";"
    );
  }

  // Pass city to getPublicDirectory in useQuery
  c = c.replace(
    'queryKey: ["public-directory", selectedCategory, searchQuery],',
    'queryKey: ["public-directory", selectedCategory, searchQuery, activeCity],'
  );

  c = c.replace(
    "category: selectedCategory === \"todos\" ? undefined : selectedCategory,",
    "city: activeCity || undefined,\n        category: selectedCategory === \"todos\" ? undefined : selectedCategory,"
  );

  return c;
});

console.log("Todos os patches concluidos!");
