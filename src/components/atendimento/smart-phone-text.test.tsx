import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { extractPhoneSegments } from "@/lib/phone-links";

describe("EARS-WA-03: SmartPhoneText & Nova Conversa WhatsApp wiring", () => {
  it("extrai telefones brasileiros e internacionais com formato E.164 e link tel:", () => {
    const segments = extractPhoneSegments("Ligue para (49) 99988-7766 ou +55 48 99123-4567 hoje.");
    const phones = segments.filter((s) => s.type === "phone");
    expect(phones.length).toBe(2);
    expect(phones[0]).toMatchObject({
      type: "phone",
      e164: "+5549999887766",
      telHref: "tel:+5549999887766",
    });
    expect(phones[1]).toMatchObject({
      type: "phone",
      e164: "+5548991234567",
      telHref: "tel:+5548991234567",
    });
  });

  it("conecta WhatsAppMarkdownText + SmartPhoneText e startStaffWhatsAppThread no workspace AtendimentoChatWorkspace", () => {
    const wsPath = path.resolve(process.cwd(), "src/components/atendimento/AtendimentoChatWorkspace.tsx");
    const wsSrc = fs.readFileSync(wsPath, "utf8");
    const mdPath = path.resolve(process.cwd(), "src/components/atendimento/WhatsAppMarkdownText.tsx");
    const mdSrc = fs.readFileSync(mdPath, "utf8");
    expect(wsSrc).toContain('import { WhatsAppMarkdownText } from "@/components/atendimento/WhatsAppMarkdownText"');
    expect(wsSrc).toContain("<WhatsAppMarkdownText");
    expect(mdSrc).toContain("<SmartPhoneText");
    expect(wsSrc).toContain("startStaffWhatsAppThread");
    expect(wsSrc).toContain("Nova Conversa");
  });
});
