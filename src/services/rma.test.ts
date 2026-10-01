import { describe, it, expect } from "vitest";
import { parseRmaForensics, analyzePhotoForensics } from "@/services/rma.functions";

describe("RMA Visual Anti-Fraud & Forensics (Plano #19 - Frente B)", () => {
  describe("analyzePhotoForensics", () => {
    it("detecta imagens geradas por IA (Midjourney, DALL-E, Stable Diffusion) como suspeitas", () => {
      const midjourneyResult = analyzePhotoForensics(
        "https://cdn.midjourney.com/images/12345/damage_shoe.png",
        "Produto chegou com a sola descolada",
      );
      expect(midjourneyResult.forensicStatus).toBe("flagged");
      expect(midjourneyResult.isAiFlagged).toBe(true);
      expect(midjourneyResult.forensicRisk).toContain("ALTO");

      const dalleResult = analyzePhotoForensics(
        "https://oaidalleapiprodscus.blob.core.windows.net/user-data/broken_screen.png",
        "Tela do aparelho chegou trincada de fábrica",
      );
      expect(dalleResult.forensicStatus).toBe("flagged");
      expect(dalleResult.isAiFlagged).toBe(true);
    });

    it("detecta placeholders genéricos da web como imagens suspeitas", () => {
      const placeholderResult = analyzePhotoForensics(
        "https://picsum.photos/800/600",
        "Produto quebrado",
      );
      expect(placeholderResult.forensicStatus).toBe("flagged");
      expect(placeholderResult.isAiFlagged).toBe(true);
    });

    it("aprova imagens autênticas com URLs legítimas de storage ou base64 de upload real", () => {
      const legitUrlResult = analyzePhotoForensics(
        "https://storage.waesy.com/post-media/store-123/2026/09/camera_evidence_9872.jpg",
        "Costura da jaqueta desfeita no zíper lateral",
      );
      expect(legitUrlResult.forensicStatus).toBe("verified");
      expect(legitUrlResult.isAiFlagged).toBe(false);
      expect(legitUrlResult.forensicRisk).toContain("BAIXO");

      const base64Result = analyzePhotoForensics(
        "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEASABIAAD/2wBD...",
        "Mancha visível no tecido da camiseta recebida",
      );
      expect(base64Result.forensicStatus).toBe("verified");
      expect(base64Result.isAiFlagged).toBe(false);
    });
  });

  describe("parseRmaForensics", () => {
    it("lida graciosamente com notas nulas ou indefinidas", () => {
      const result = parseRmaForensics(null);
      expect(result.claimPhotoUrl).toBeNull();
      expect(result.forensicStatus).toBe("pending");
      expect(result.isAiFlagged).toBe(false);
      expect(result.cleanNotes).toBe("");
    });

    it("extrai corretamente laudo pericial verificado e separa observações limpas do usuário", () => {
      const formattedNotes = `O produto não serviu no meu pé e veio com mancha.

[LAUDO_PERICIAL] Foto: upload_local_midia | Status: verified | Risco: BAIXO (Foto Autêntica Verificada) | FotoUrl: https://storage.waesy.com/evidence/123.jpg`;

      const result = parseRmaForensics(formattedNotes);
      expect(result.claimPhotoUrl).toBe("https://storage.waesy.com/evidence/123.jpg");
      expect(result.forensicStatus).toBe("verified");
      expect(result.isAiFlagged).toBe(false);
      expect(result.cleanNotes).toBe("O produto não serviu no meu pé e veio com mancha.");
    });

    it("extrai corretamente laudo pericial sinalizado com alerta de IA sintética", () => {
      const formattedNotes = `Solicito devolução urgente.

[LAUDO_PERICIAL] Foto: https://cdn.midjourney.com/fake.png | Status: flagged | Risco: ALTO (Alerta de Imagem Sintética) | FotoUrl: https://cdn.midjourney.com/fake.png`;

      const result = parseRmaForensics(formattedNotes);
      expect(result.claimPhotoUrl).toBe("https://cdn.midjourney.com/fake.png");
      expect(result.forensicStatus).toBe("flagged");
      expect(result.isAiFlagged).toBe(true);
      expect(result.cleanNotes).toBe("Solicito devolução urgente.");
    });
  });
});
