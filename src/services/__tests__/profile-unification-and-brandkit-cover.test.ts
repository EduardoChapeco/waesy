/**
 * src/services/__tests__/profile-unification-and-brandkit-cover.test.ts
 * Testes normativos para a SPEC-20261028-PROFILE-UNIFICATION-AND-BRANDKIT-COVER:
 * 1. Supressão integral de capas em cabeçalhos de perfis públicos (Empresas e Membros)
 * 2. Remoção de campos de upload de capa nos editores in-page de perfil
 * 3. Centralização da capa oficial no BrandKit para alimentação de cards em feeds/vitrines
 */

import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";

describe("SPEC-20261028: Unificação de Perfis e Centralização da Capa no BrandKit", () => {
  it("não deve conter contêineres de capa panorâmica (21:9 ou 4:1) no cabeçalho do perfil da loja", () => {
    const file = fs.readFileSync(
      path.resolve("src/components/commerce/canonical-store-profile-view.tsx"),
      "utf8"
    );

    // Não deve possuir o antigo hero de capa panorâmica com botão 'Alterar Capa (21:9)'
    expect(file).not.toContain('title="Alterar Capa (21:9)"');
    expect(file).not.toContain("Capa Panorâmica Canônica 21:9");

    // Deve conter o cabeçalho canônico padronizado Apple HIG / Instagram / Threads
    expect(file).toContain("CABEÇALHO DO PERFIL CANÔNICO (INSTAGRAM / THREADS / APPLE HIG — SEM CAPA)");
  });

  it("não deve conter contêiner de capa decorativa no perfil de membros e criadores", () => {
    const file = fs.readFileSync(
      path.resolve("src/routes/_store.membro.$id.tsx"),
      "utf8"
    );

    // Não deve possuir a capa panorâmica 4:1 nem texto placeholder de capa
    expect(file).not.toContain("Capa Panorâmica Superior 4:1");
    expect(file).not.toContain("Espaço para foto de capa");

    // Deve conter o cabeçalho canônico padronizado Apple HIG / Instagram / Threads
    expect(file).toContain("CABEÇALHO DO PERFIL CANÔNICO (INSTAGRAM / THREADS / APPLE HIG — SEM CAPA)");
  });

  it("não deve conter opção de upload de capa no ProfileInPageEditor", () => {
    const file = fs.readFileSync(
      path.resolve("src/components/profile/ProfileInPageEditor.tsx"),
      "utf8"
    );

    // Não deve possuir o botão 'Alterar Capa (21:9)' nem o texto 'Sem imagem de capa'
    expect(file).not.toContain("Alterar Capa (21:9)");
    expect(file).not.toContain("Sem imagem de capa (Proporção 21:9)");

    // Deve orientar o usuário para o BrandKit
    expect(file).toContain("Capa dos Feeds & Vitrines");
    expect(file).toContain("/workspace/marketing/brand-kit");
  });

  it("não deve conter opção de upload de capa no UniversalProfileEditor", () => {
    const file = fs.readFileSync(
      path.resolve("src/components/profile/universal-profile-editor.tsx"),
      "utf8"
    );

    expect(file).not.toContain("onUploadCover");
    expect(file).not.toContain("Alterar Capa");
    expect(file).not.toContain("Capa Panorâmica Canônica 21:9");
  });

  it("deve reforçar a capa oficial no BrandKit e sincronizar com stores para cards de feeds e vitrines", () => {
    const brandKitRoute = fs.readFileSync(
      path.resolve("src/routes/workspace.marketing.brand-kit.tsx"),
      "utf8"
    );
    const brandKitFn = fs.readFileSync(
      path.resolve("src/services/brand-kit.functions.ts"),
      "utf8"
    );

    // Interface no BrandKit
    expect(brandKitRoute).toContain("Capa Oficial da Empresa (Cards, Feeds e Vitrines)");

    // Sincronização automática com stores
    expect(brandKitFn).toContain("storeUpdates.cover_url = data.logos.cover_url;");
    expect(brandKitFn).toContain("storeUpdates.banner_url = data.logos.cover_url;");
  });

  it("não deve conter opção de upload de capa no perfil civil (_store.conta.perfil.tsx)", () => {
    const file = fs.readFileSync(
      path.resolve("src/routes/_store.conta.perfil.tsx"),
      "utf8"
    );

    expect(file).not.toContain("coverInputRef");
    expect(file).not.toContain("1:1 Squircle + 21:9 Panorâmica");
    expect(file).not.toContain("Sem banner (Proporção 3:1 Compacta & Discreta)");
    expect(file).toContain("Card 1: Identidade Visual Canônica (Avatar 1:1");
  });

  it("não deve conter opção de upload de capa panorâmica no CreatorProfileSheetEditor", () => {
    const file = fs.readFileSync(
      path.resolve("src/components/profile/creator-profile-sheet-editor.tsx"),
      "utf8"
    );

    expect(file).not.toContain("coverInputRef");
    expect(file).not.toContain("Capa Panorâmica Canônica 21:9 ao lado");
    expect(file).not.toContain("Capa do parceiro (21:9)");
    expect(file).toContain("Avatar Oficial do Criador / Parceiro");
  });

  it("deve sincronizar employer_reviews com colunas canônicas e proibir fallback silencioso de perfil", () => {
    const socialFunctions = fs.readFileSync(
      path.resolve("src/services/social.functions.ts"),
      "utf8"
    );

    // Schema parity com a tabela employer_reviews
    expect(socialFunctions).toContain("user_id: userId");
    expect(socialFunctions).toContain('job_title: exp.title || "Colaborador"');
    expect(socialFunctions).toContain('status: "published"');

    // Anti-hijacking de perfil desconhecido
    expect(socialFunctions).toContain('(decodedId === "eu" || decodedId === "me" || decodedId === "minha-conta") && currentUserId');
  });
});
