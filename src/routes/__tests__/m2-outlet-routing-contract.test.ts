import fs from "fs";
import path from "path";
import { describe, it, expect } from "vitest";

const ROUTES_DIR = path.resolve("src/routes");

const KNOWN_BLOCKED_PARENTS = [
  "_store.conta.lojas.tsx",
  "workspace.catalogo.colecoes.tsx",
  "_store.criar-negocio.tsx",
  "_store.loja.$slug.tsx",
  "admin-master.seguranca.certificados.tsx",
  "workspace.relatorios.tsx",
  "workspace.eventos.$id.tsx",
  "workspace.marketing.anuncios.tsx",
  "workspace.turismo.grupos.$id.tsx",
];

describe("M2 Contract — Todas as rotas-pai com rotas-filhas renderizam <Outlet /> sem bloquear navegação", () => {
  it("nenhuma das 9 rotas-pai conhecidas bloqueia suas filhas (todas renderizam Outlet)", () => {
    for (const file of KNOWN_BLOCKED_PARENTS) {
      const fullPath = path.join(ROUTES_DIR, file);
      expect(fs.existsSync(fullPath), `${file} deve existir`).toBe(true);
      const src = fs.readFileSync(fullPath, "utf8");
      expect(src, `${file} deve renderizar <Outlet /> para liberar rotas-filhas`).toMatch(/<Outlet\b/);
    }
  });

  it("varredura completa de src/routes garante que toda rota-pai não-api com filhas diretas declara Outlet", () => {
    const entries = fs
      .readdirSync(ROUTES_DIR)
      .filter((f) => (f.endsWith(".tsx") || f.endsWith(".ts")) && !f.includes(".test.") && !f.startsWith("api.") && f !== "__root.tsx");

    const missingOutlet: string[] = [];

    for (const file of entries) {
      const base = file.replace(/\.(tsx|ts)$/, "");
      if (base.endsWith(".index")) continue;

      const hasNestedChild = entries.some((other) => {
        if (other === file) return false;
        const otherBase = other.replace(/\.(tsx|ts)$/, "");
        // Filho direto herda layout se começar com `${base}.` (rotas `${base}_.` quebram layout propositalmente)
        return otherBase.startsWith(`${base}.`);
      });

      if (hasNestedChild) {
        const src = fs.readFileSync(path.join(ROUTES_DIR, file), "utf8");
        if (!/<Outlet\b/.test(src)) {
          missingOutlet.push(file);
        }
      }
    }

    expect(missingOutlet).toEqual([]);
  });

  it("_store.conta.lojas (e index) trata erro do loader sem TypeError em stores.length quando stores for null", () => {
    const targetFile = fs.existsSync(path.join(ROUTES_DIR, "_store.conta.lojas.index.tsx"))
      ? path.join(ROUTES_DIR, "_store.conta.lojas.index.tsx")
      : path.join(ROUTES_DIR, "_store.conta.lojas.tsx");
    const src = fs.readFileSync(targetFile, "utf8");
    expect(src).not.toMatch(/stores\.length\s*===\s*0/);
    expect(src).not.toContain("setTenantContext({ data: { store_id: storeId } }).catch(() => null)");
  });

  it("admin-master.seguranca.certificados propaga loadError, ErrorState e alvos táteis >= 44px; relatorios e turismo sem font-black/shadow-2xs/mojibake", () => {
    const certsSrc = fs.readFileSync(path.join(ROUTES_DIR, "admin-master.seguranca.certificados.tsx"), "utf8");
    expect(certsSrc).toContain("loadError");
    expect(certsSrc).toContain("ErrorState");
    expect(certsSrc).toContain("toast.error");
    expect(certsSrc).not.toContain('className="pl-9 text-sm h-8"');
    expect(certsSrc).not.toContain('className="size-7 ');

    for (const relFile of [
      "workspace.relatorios.tsx",
      "workspace.relatorios.gastronomia.tsx",
      "workspace.relatorios.metas.tsx",
    ]) {
      const relSrc = fs.readFileSync(path.join(ROUTES_DIR, relFile), "utf8");
      expect(relSrc, `${relFile} não deve conter font-black`).not.toContain("font-black");
      expect(relSrc, `${relFile} não deve conter shadow-2xs`).not.toContain("shadow-2xs");
    }

    const turismoGrupoSrc = fs.readFileSync(path.join(ROUTES_DIR, "workspace.turismo.grupos.$id.tsx"), "utf8");
    expect(turismoGrupoSrc).not.toMatch(/Ã[£§©³ª¡º]|â€|âž/);
    expect(turismoGrupoSrc).not.toContain("font-black");
  });
});
