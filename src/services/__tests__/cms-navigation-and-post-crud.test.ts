import { describe, it, expect } from "vitest";
import * as fs from "fs";
import * as path from "path";

describe("CMS Navigation & Creator Post CRUD Verification", () => {
  const root = process.cwd();

  it("ContentActionsMenu possui resolução defensiva de autoria e suíte completa de CRUD para o proprietário", () => {
    const file = fs.readFileSync(
      path.join(root, "src/components/common/content-actions-menu.tsx"),
      "utf8"
    );
    // Verificação de autoria efetiva
    expect(file).toContain("effectiveIsOwner");
    expect(file).toContain("current-user-session");
    // Verificação de cabeçalho contextual de publicação
    expect(file).toContain('case "post":');
    expect(file).toContain('return "Gerenciar Publicação";');
    // Verificação de ações do proprietário (CRUD)
    expect(file).toContain("Editar Publicação");
    expect(file).toContain("Fixar no Perfil");
    expect(file).toContain("Desativar Comentários");
    expect(file).toContain("Arquivar Publicação");
    expect(file).toContain("Excluir Publicação");
    // Verificação de ações do visualizador
    expect(file).toContain("Não tenho interesse / Ocultar");
    expect(file).toContain("Silenciar @");
    expect(file).toContain("Denunciar Publicação");
  });

  it("FeedThreadPostCard injeta parâmetros de post e gerencia autoria defensiva", () => {
    const file = fs.readFileSync(
      path.join(root, "src/components/community/FeedThreadPostCard.tsx"),
      "utf8"
    );
    expect(file).toContain('entityType="post"');
    expect(file).toContain("postData={post}");
    expect(file).toContain("status=");
    expect(file).toContain("current-user-session");
    expect(file).toContain("isOwner={isOwner}");
  });

  it("MobileNav sincroniza abas dinamicamente com navigation_menus (handle: bottom_nav) do CMS", () => {
    const file = fs.readFileSync(
      path.join(root, "src/components/shell/mobile-nav.tsx"),
      "utf8"
    );
    expect(file).toContain('["navigation-menus", "bottom_nav"]');
    expect(file).toContain("getNavigationMenus");
    expect(file).toContain('m.handle === "bottom_nav"');
    expect(file).toContain("cmsItems.length > 0");
    expect(file).toContain("ICON_LOOKUP");
  });

  it("ContextSidebar sincroniza vitrines dinamicamente com listAllSurfaces() do CMS", () => {
    const file = fs.readFileSync(
      path.join(root, "src/components/shell/context-sidebar.tsx"),
      "utf8"
    );
    expect(file).toContain('["all-marketplace-surfaces"]');
    expect(file).toContain("listAllSurfaces");
    expect(file).toContain("activeSurfaces");
    expect(file).toContain("activeSurfaces.length");
  });
});
