import { describe, expect, it } from "vitest";
import { WHATSAPP_CREDENTIAL_PROVIDER, WHATSAPP_META_CHANNEL_PROVIDER } from "./whatsapp-provider-contract";

describe("WhatsApp provider contract", () => {
  it("mantém namespaces explícitos para credencial histórica e canal operacional", () => {
    expect(WHATSAPP_CREDENTIAL_PROVIDER).toBe("whatsapp_cloud_api");
    expect(WHATSAPP_META_CHANNEL_PROVIDER).toBe("meta_cloud_api");
    expect(WHATSAPP_CREDENTIAL_PROVIDER).not.toBe(WHATSAPP_META_CHANNEL_PROVIDER);
  });

  it("não permite que a tradução seja apagada silenciosamente do webhook oficial", async () => {
    const source = await import("node:fs/promises").then((fs) => fs.readFile(new URL("../routes/api.webhooks.whatsapp.ts", import.meta.url), "utf8"));
    expect(source).toContain("WHATSAPP_CREDENTIAL_PROVIDER");
    expect(source).toContain("WHATSAPP_META_CHANNEL_PROVIDER");
    expect(source).toContain('.eq("provider", WHATSAPP_CREDENTIAL_PROVIDER)');
    expect(source).toContain("provider: WHATSAPP_META_CHANNEL_PROVIDER");
    expect(source).not.toContain('const WHATSAPP_PROVIDER = "whatsapp_cloud_api"');
  });
});
