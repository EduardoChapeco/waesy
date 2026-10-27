import { describe, expect, it } from "vitest";
import { extractContacts, extractEmails, extractSocials, extractWhatsapp, isPublicHttpUrl } from "./contact-extractor";

describe("extractEmails", () => {
  it("encontra e-mails, desofusca [at] e descarta lixo", () => {
    const text = "contato@bella.com.br, vendas [at] bella [dot] com [dot] br, logo@2x.png, user@example.com, a@sentry.io";
    expect(extractEmails(text)).toEqual(["contato@bella.com.br", "vendas@bella.com.br"]);
  });
  it("retorna vazio sem e-mails", () => {
    expect(extractEmails("sem contato aqui")).toEqual([]);
  });
});

describe("extractWhatsapp", () => {
  it("lê wa.me e api.whatsapp.com", () => {
    expect(extractWhatsapp(["https://wa.me/5549999887766?text=oi"], "")).toBe("5549999887766");
    expect(extractWhatsapp(["https://api.whatsapp.com/send?phone=554933221100"], "")).toBe("554933221100");
  });
  it("retorna undefined sem link válido", () => {
    expect(extractWhatsapp(["https://exemplo.com"], "")).toBeUndefined();
  });
});

describe("extractSocials", () => {
  it("mapeia perfis e ignora links de compartilhamento", () => {
    const socials = extractSocials([
      "https://www.instagram.com/bella.pizza/",
      "https://www.instagram.com/p/ABC123/",
      "https://www.facebook.com/sharer/sharer.php?u=x",
      "https://www.facebook.com/bellapizza",
      "https://www.linkedin.com/",
    ]);
    expect(socials).toEqual({ instagram: "https://www.instagram.com/bella.pizza", facebook: "https://www.facebook.com/bellapizza" });
  });
});

describe("extractContacts", () => {
  it("prioriza mailto e extrai telefones BR", () => {
    const html = '<a href="mailto:oi@bella.com.br?subject=x">e</a> <a href="https://wa.me/5549999887766">w</a> contato@outro.com.br';
    const result = extractContacts({ html, markdown: "Ligue (49) 3322-1100 ou 49 99988-7766" });
    expect(result.emails[0]).toBe("oi@bella.com.br");
    expect(result.phones).toEqual(["4933221100", "49999887766"]);
    expect(result.whatsapp).toBe("5549999887766");
  });
  it("não inventa dados em conteúdo vazio", () => {
    expect(extractContacts({})).toEqual({ emails: [], phones: [], whatsapp: undefined, socials: {} });
  });
});

describe("isPublicHttpUrl", () => {
  it("bloqueia SSRF", () => {
    expect(isPublicHttpUrl("https://bella.com.br")).toBe(true);
    for (const u of ["http://localhost", "http://127.0.0.1", "http://192.168.0.1", "http://169.254.169.254", "ftp://x.com", "http://intranet"]) {
      expect(isPublicHttpUrl(u)).toBe(false);
    }
  });
});
