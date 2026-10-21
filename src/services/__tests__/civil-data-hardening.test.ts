import { describe, it, expect } from "vitest";
import { validateCpfMod11, cleanDocument, formatCpf, validateBirthDate } from "@/lib/document-validator";

describe("Civil Data Hardening & Validation (1 CPF = 1 Conta Civil Única)", () => {
  describe("validateCpfMod11 (Algoritmo Oficial da Receita Federal)", () => {
    it("deve aprovar CPFs válidos com dígitos verificadores corretos", () => {
      // CPFs com checksums matematicamente válidos pelo algoritmo Mod 11 da Receita Federal
      expect(validateCpfMod11("52998224725")).toBe(true);
      expect(validateCpfMod11("529.982.247-25")).toBe(true);
      expect(validateCpfMod11("12310078930")).toBe(true);
      expect(validateCpfMod11("123.100.789-30")).toBe(true);
      expect(validateCpfMod11("98720012357")).toBe(true);
      expect(validateCpfMod11("987.200.123-57")).toBe(true);
    });

    it("deve rejeitar sequências de dígitos iguais repetidos", () => {
      expect(validateCpfMod11("00000000000")).toBe(false);
      expect(validateCpfMod11("11111111111")).toBe(false);
      expect(validateCpfMod11("22222222222")).toBe(false);
      expect(validateCpfMod11("33333333333")).toBe(false);
      expect(validateCpfMod11("44444444444")).toBe(false);
      expect(validateCpfMod11("55555555555")).toBe(false);
      expect(validateCpfMod11("66666666666")).toBe(false);
      expect(validateCpfMod11("77777777777")).toBe(false);
      expect(validateCpfMod11("88888888888")).toBe(false);
      expect(validateCpfMod11("99999999999")).toBe(false);
    });

    it("deve rejeitar CPFs com dígitos verificadores inválidos", () => {
      expect(validateCpfMod11("52998224720")).toBe(false);
      expect(validateCpfMod11("12345678901")).toBe(false);
      expect(validateCpfMod11("10788979920")).toBe(false);
      expect(validateCpfMod11("12310078931")).toBe(false);
    });

    it("deve rejeitar CPFs com tamanho incompleto ou excessivo", () => {
      expect(validateCpfMod11("12345")).toBe(false);
      expect(validateCpfMod11("1234567890")).toBe(false);
      expect(validateCpfMod11("123456789012")).toBe(false);
      expect(validateCpfMod11(null)).toBe(false);
      expect(validateCpfMod11(undefined)).toBe(false);
    });
  });

  describe("cleanDocument & formatCpf", () => {
    it("deve limpar caracteres não-numéricos", () => {
      expect(cleanDocument("529.982.247-25")).toBe("52998224725");
      expect(cleanDocument(" 123-456.789 / 00 ")).toBe("12345678900");
      expect(cleanDocument(null)).toBe("");
    });

    it("deve formatar CPF no padrão oficial 000.000.000-00", () => {
      expect(formatCpf("52998224725")).toBe("529.982.247-25");
      expect(formatCpf("529.982.247-25")).toBe("529.982.247-25");
      expect(formatCpf("12310078930")).toBe("123.100.789-30");
    });
  });

  describe("validateBirthDate (Validação de Intervalo & Maioridade)", () => {
    it("deve validar datas de nascimento plausíveis (ISO e BR)", () => {
      const resIso = validateBirthDate("1995-08-20");
      expect(resIso.isValid).toBe(true);
      expect(resIso.age).toBeGreaterThan(25);

      const resBr = validateBirthDate("20/08/1995");
      expect(resBr.isValid).toBe(true);
      expect(resBr.age).toBeGreaterThan(25);
    });

    it("deve rejeitar datas no futuro", () => {
      const nextYear = new Date().getFullYear() + 2;
      const res = validateBirthDate(`${nextYear}-01-01`);
      expect(res.isValid).toBe(false);
      expect(res.error).toContain("futuro");
    });

    it("deve rejeitar datas fora do limite biológico (>125 anos)", () => {
      const res = validateBirthDate("1850-01-01");
      expect(res.isValid).toBe(false);
      expect(res.error).toContain("fora do intervalo");
    });

    it("deve rejeitar dias ou meses inválidos do calendário", () => {
      expect(validateBirthDate("1995-13-10").isValid).toBe(false);
      expect(validateBirthDate("1995-02-31").isValid).toBe(false);
      expect(validateBirthDate("data_invalida").isValid).toBe(false);
    });
  });

  describe("Imutabilidade Civil e Bloqueio de Múltiplas Contas (Server-Side Logic)", () => {
    it("deve impedir alteração de CPF já cadastrado (Lockdown Civil)", () => {
      const existingCpf = "52998224725";
      const attemptedNewCpf = "12310078930";

      // Simulação da verificação estrita do BFF
      const checkCpfUpdate = (existing: string, incoming?: string) => {
        const cleanExisting = cleanDocument(existing);
        const cleanIncoming = incoming !== undefined ? cleanDocument(incoming) : undefined;

        if (cleanExisting.length === 11) {
          if (cleanIncoming !== undefined && cleanIncoming !== "" && cleanIncoming !== cleanExisting) {
            throw new Error("O CPF cadastrado é um dado civil único e imutável após registro na plataforma.");
          }
          return cleanExisting;
        }
        return cleanIncoming;
      };

      // Tentativa de alterar CPF existente dispara erro
      expect(() => checkCpfUpdate(existingCpf, attemptedNewCpf)).toThrow(
        "O CPF cadastrado é um dado civil único e imutável"
      );

      // Enviar o mesmo CPF preserva o dado com sucesso
      expect(checkCpfUpdate(existingCpf, "529.982.247-25")).toBe("52998224725");
      expect(checkCpfUpdate(existingCpf, "52998224725")).toBe("52998224725");
    });

    it("deve impedir alteração de Data de Nascimento já registrada", () => {
      const existingBirthDate = "1990-05-15";
      const attemptedNewDate = "1995-10-20";

      const checkBirthDateUpdate = (existing: string, incoming?: string) => {
        const cleanExisting = existing.slice(0, 10);
        const cleanIncoming = incoming !== undefined ? incoming.trim().slice(0, 10) : undefined;

        if (cleanExisting) {
          if (cleanIncoming !== undefined && cleanIncoming !== "" && cleanIncoming !== cleanExisting) {
            throw new Error("A data de nascimento civil já cadastrada é imutável após registro na plataforma.");
          }
          return cleanExisting;
        }
        return cleanIncoming;
      };

      expect(() => checkBirthDateUpdate(existingBirthDate, attemptedNewDate)).toThrow(
        "A data de nascimento civil já cadastrada é imutável"
      );
      expect(checkBirthDateUpdate(existingBirthDate, "1990-05-15")).toBe("1990-05-15");
    });

    it("deve bloquear colisão de CPF quando outra conta já possuir o mesmo documento", () => {
      const mockProfilesDatabase = [
        { id: "usr_alice", cpf: "52998224725" },
        { id: "usr_bob", cpf: "12310078930" },
      ];

      const simulateCpfRegistration = (userId: string, newCpf: string) => {
        const clean = cleanDocument(newCpf);
        if (!validateCpfMod11(clean)) {
          throw new Error("CPF inválido.");
        }
        const conflict = mockProfilesDatabase.find(
          (p) => p.id !== userId && (p.cpf === clean || p.cpf === formatCpf(clean))
        );
        if (conflict) {
          throw new Error(
            "Este CPF já está cadastrado em outra conta civil na plataforma. Cada cidadão possui conta individual única."
          );
        }
        return { success: true, cpf: clean };
      };

      // Usuário Carol tenta cadastrar o mesmo CPF de Alice
      expect(() => simulateCpfRegistration("usr_carol", "529.982.247-25")).toThrow(
        "Este CPF já está cadastrado em outra conta civil"
      );

      // Usuário Carol tenta cadastrar o mesmo CPF de Bob
      expect(() => simulateCpfRegistration("usr_carol", "12310078930")).toThrow(
        "Este CPF já está cadastrado em outra conta civil"
      );

      // Usuário Carol cadastra um CPF válido inédito (98720012357): sucesso
      const resCarol = simulateCpfRegistration("usr_carol", "987.200.123-57");
      expect(resCarol.success).toBe(true);
      expect(resCarol.cpf).toBe("98720012357");
    });

    it("deve proteger alteração do nome completo civil quando o perfil tiver KYC verificado", () => {
      const checkFullNameUpdate = (isVerified: boolean, currentFullName: string, newFullName?: string) => {
        if (isVerified) {
          if (newFullName && newFullName.trim() !== currentFullName.trim()) {
            throw new Error(
              "Seu perfil possui verificação oficial de identidade (KYC). A alteração do nome civil requer revalidação documental pela ouvidoria."
            );
          }
        }
        return newFullName || currentFullName;
      };

      // Perfil verificado tentando alterar nome civil
      expect(() =>
        checkFullNameUpdate(true, "Carlos Silva Oficial", "Carlos Silva Fraude")
      ).toThrow("Seu perfil possui verificação oficial de identidade (KYC)");

      // Perfil verificado mantendo o mesmo nome
      expect(checkFullNameUpdate(true, "Carlos Silva Oficial", "Carlos Silva Oficial")).toBe(
        "Carlos Silva Oficial"
      );

      // Perfil não-verificado pode atualizar normalmente
      expect(checkFullNameUpdate(false, "Carlos Silva", "Carlos Silva Atualizado")).toBe(
        "Carlos Silva Atualizado"
      );
    });
  });
});
