import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";

describe("Route Loaders Contextual City Propagation", () => {
  const indexRoutePath = path.resolve(process.cwd(), "src/routes/_store.index.tsx");
  const explorarRoutePath = path.resolve(process.cwd(), "src/routes/_store.explorar.tsx");

  const expectedServices = [
    { name: "listActiveBanners (home)", pattern: /listActiveBanners\(\s*\{\s*data:\s*\{\s*placement:\s*["']home["'],\s*city:\s*filteredCity\s*\}\s*\}\s*\)/ },
    { name: "listActiveBanners (home_middle)", pattern: /listActiveBanners\(\s*\{\s*data:\s*\{\s*placement:\s*["']home_middle["'],\s*city:\s*filteredCity\s*\}\s*\}\s*\)/ },
    { name: "listActiveBanners (home_footer)", pattern: /listActiveBanners\(\s*\{\s*data:\s*\{\s*placement:\s*["']home_footer["'],\s*city:\s*filteredCity\s*\}\s*\}\s*\)/ },
    { name: "getPublicDirectory", pattern: /getPublicDirectory\(\s*\{\s*data:\s*\{[^}]*city:\s*filteredCity[^}]*\}\s*\}\s*\)/ },
    { name: "getPublicClassifieds", pattern: /getPublicClassifieds\(\s*\{\s*data:\s*\{[^}]*city:\s*filteredCity[^}]*\}\s*\}\s*\)/ },
    { name: "listPublicJobs", pattern: /listPublicJobs\(\s*\{\s*data:\s*\{[^}]*city:\s*filteredCity[^}]*\}\s*\}\s*\)/ },
    { name: "getPublicEvents", pattern: /getPublicEvents\(\s*\{\s*data:\s*\{[^}]*city:\s*filteredCity[^}]*\}\s*\}\s*\)/ },
    { name: "listPublicArticles", pattern: /listPublicArticles\(\s*\{\s*data:\s*\{[^}]*city:\s*filteredCity[^}]*\}\s*\}\s*\)/ },
  ];

  it("verifies _store.index.tsx loader imports and calls resolveActiveCity", () => {
    const content = fs.readFileSync(indexRoutePath, "utf8");
    expect(content).toContain('import { resolveActiveCity } from "@/lib/city-helper";');
    expect(content).toMatch(/const filteredCity = resolveActiveCity\(location\.search/);
  });

  it("verifies _store.index.tsx passes filteredCity to all queried city services", () => {
    const content = fs.readFileSync(indexRoutePath, "utf8");
    for (const service of expectedServices) {
      expect(content, `Service ${service.name} should receive filteredCity in _store.index.tsx`).toMatch(service.pattern);
    }
  });

  it("verifies _store.explorar.tsx loader imports and passes filteredCity", () => {
    const content = fs.readFileSync(explorarRoutePath, "utf8");
    expect(content).toContain('import { resolveActiveCity } from "@/lib/city-helper";');
    expect(content).toMatch(/const filteredCity = resolveActiveCity\(location\.search/);
    expect(content).toMatch(/getPublicDirectory\(\s*\{\s*data:\s*\{[^}]*city:\s*filteredCity[^}]*\}\s*\}\s*\)/);
  });
});
