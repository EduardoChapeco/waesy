import { describe, it, expect, vi } from "vitest";

describe("Resiliência End-to-End da Resolução de Páginas e Vitrines", () => {
  it("OmniPageRenderer importa e utiliza BlockErrorBoundary para isolar falhas de blocos", async () => {
    const fs = await import("fs");
    const path = await import("path");
    const omniRendererSrc = fs.readFileSync(
      path.resolve(process.cwd(), "src/components/builder/OmniPageRenderer.tsx"),
      "utf8",
    );
    expect(omniRendererSrc).toContain("BlockErrorBoundary");
    expect(omniRendererSrc).toContain("<BlockErrorBoundary");
    expect(omniRendererSrc).toContain("</BlockErrorBoundary>");
  });

  it("Rota _store.paginas.$slug não restringe document_type a storefront", async () => {
    const fs = await import("fs");
    const path = await import("path");
    const paginasRouteSrc = fs.readFileSync(
      path.resolve(process.cwd(), "src/routes/_store.paginas.$slug.tsx"),
      "utf8",
    );
    // Não deve conter a trava document_type: "storefront"
    expect(paginasRouteSrc).not.toContain('document_type: "storefront"');
    // Deve suportar omni_page_published e omni_page_draft
    expect(paginasRouteSrc).toContain("omni_page_published");
    expect(paginasRouteSrc).toContain("omni_page_draft");
  });

  it("getPublicExperienceDocumentBySlug suporta document_type opcional e omni_page_published", async () => {
    const fs = await import("fs");
    const path = await import("path");
    const builderFnSrc = fs.readFileSync(
      path.resolve(process.cwd(), "src/services/builder.functions.ts"),
      "utf8",
    );
    expect(builderFnSrc).toContain("omni_page_published");
    expect(builderFnSrc).toContain("omni_page_draft");
    expect(builderFnSrc).toContain("document_type: z.string().optional()");
  });

  it("getPublicStoreProfile possui fallback resiliente para directory_listings", async () => {
    const fs = await import("fs");
    const path = await import("path");
    const catalogFnSrc = fs.readFileSync(
      path.resolve(process.cwd(), "src/services/catalog.functions.ts"),
      "utf8",
    );
    expect(catalogFnSrc).toContain("directory_listings");
    expect(catalogFnSrc).toContain("directory_listings_store_id_fkey");
  });

  it("Links de navegação não utilizam o prefixo inválido /_store/", async () => {
    const fs = await import("fs");
    const path = await import("path");
    const cSlugSrc = fs.readFileSync(
      path.resolve(process.cwd(), "src/routes/_store.c.$slug.tsx"),
      "utf8",
    );
    expect(cSlugSrc).not.toContain('to="/_store/mural"');
    expect(cSlugSrc).toContain('to="/mural"');

    const viagemSrc = fs.readFileSync(
      path.resolve(process.cwd(), "src/routes/viajante.viagem.$id.tsx"),
      "utf8",
    );
    expect(viagemSrc).not.toContain('/_store/voucher/');
    expect(viagemSrc).toContain('/voucher/');
  });
});
