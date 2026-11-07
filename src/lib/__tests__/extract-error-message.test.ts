import { describe, it, expect } from "vitest";
import { extractErrorMessage } from "@/lib/utils";

describe("extractErrorMessage (Sanitizador Universal de Erros)", () => {
  it("deve retornar a string bruta quando uma string válida for passada", () => {
    expect(extractErrorMessage("Erro ao salvar produto")).toBe("Erro ao salvar produto");
  });

  it("deve retornar o fallback quando receber null ou undefined", () => {
    expect(extractErrorMessage(null, "Falha padrão")).toBe("Falha padrão");
    expect(extractErrorMessage(undefined, "Falha padrão")).toBe("Falha padrão");
  });

  it("deve rejeitar [object Object] literal e retornar o fallback", () => {
    expect(extractErrorMessage("[object Object]", "Erro ao processar")).toBe("Erro ao processar");
  });

  it("deve extrair message de uma instância padrão de Error", () => {
    const err = new Error("Registro duplicado");
    expect(extractErrorMessage(err)).toBe("Registro duplicado");
  });

  it("deve desempacotar Error cujo message seja um JSON serializado (RPC / Zod)", () => {
    const rpcErr = new Error(JSON.stringify({ message: "Campo 'display_name' é obrigatório" }));
    expect(extractErrorMessage(rpcErr)).toBe("Campo 'display_name' é obrigatório");

    const zodJsonErr = new Error(JSON.stringify([{ message: "UUID inválido para a chave estrangeira" }]));
    expect(extractErrorMessage(zodJsonErr)).toBe("UUID inválido para a chave estrangeira");
  });

  it("deve desempacotar objetos genéricos com chave message, error ou statusText", () => {
    expect(extractErrorMessage({ message: "Sessão expirada" })).toBe("Sessão expirada");
    expect(extractErrorMessage({ error: "Permissão insuficiente" })).toBe("Permissão insuficiente");
    expect(extractErrorMessage({ statusText: "Bad Gateway" })).toBe("Bad Gateway");
  });

  it("deve desempacotar ZodError / issues aninhadas sem renderizar [object Object]", () => {
    const zodLike = {
      issues: [{ message: "O valor deve ser maior que zero" }],
    };
    expect(extractErrorMessage(zodLike)).toBe("O valor deve ser maior que zero");
  });

  it("deve lidar com objetos que possuem message sendo outro objeto aninhado", () => {
    const nested = {
      message: { error: "Falha na transação bancária" },
    };
    expect(extractErrorMessage(nested, "Falha padrão")).toBe("Falha padrão");
  });
});
