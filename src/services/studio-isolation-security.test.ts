import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const source = readFileSync(resolve(process.cwd(), "src/services/studio.functions.ts"), "utf8");

describe("Studio — isolamento de usuário e tenant", () => {
  it("exige autenticação na listagem e valida store_id solicitado", () => {
    const listBlock = source.slice(
      source.indexOf("export const listStudioProjects"),
      source.indexOf("export const getStudioProjectById"),
    );

    expect(listBlock).toContain('if (!identity.id) throw new Error("Não autenticado")');
    expect(listBlock).toContain("assertStoreAccess(identity, STAFF_ROLES, data.store_id)");
    expect(listBlock).toContain(".eq(\"store_id\", data.store_id)");
  });

  it("aplica filtro de usuário ou tenant em leitura, update e delete", () => {
    const projectReadBlock = source.slice(
      source.indexOf("export const getStudioProjectById"),
      source.indexOf("export const saveStudioProject"),
    );
    const saveBlock = source.slice(
      source.indexOf("export const saveStudioProject"),
      source.indexOf("export const deleteStudioProject"),
    );
    const deleteBlock = source.slice(source.indexOf("export const deleteStudioProject"));

    for (const block of [projectReadBlock, saveBlock, deleteBlock]) {
      expect(block).toContain("user_id.eq.${identity.id}");
      expect(block).toContain("store_id.eq.${identity.store_id}");
    }
  });

  it("não atualiza o proprietário nem o tenant no caminho de update", () => {
    const saveBlock = source.slice(
      source.indexOf("export const saveStudioProject"),
      source.indexOf("export const deleteStudioProject"),
    );

    expect(saveBlock).toContain(".update(projectFields)");
    expect(saveBlock).not.toMatch(/\.update\(payload\)/);
  });
});
