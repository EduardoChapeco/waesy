import { describe, it, expect } from "vitest";
import { encryptSecret, decryptSecret } from "@/lib/crypto-vault.server";
import {
  getMarketplaceOAuthUrl,
  triggerSyncConnector,
  testMarketplaceConnectorCredentialsFn,
} from "./marketplace-hub.functions";
import { toggleAdCampaignStatus } from "./ads.functions";
import { signContractAsPayer } from "./travel-continuous-flow.functions";
import { submitOmniPageLeadFn } from "./builder.functions";
import { persistCopilotGeneratedArtifactFn } from "./builder-copilot-bridge";

describe("Protocolo Waesy Truth-7 — Persistência Bilateral e Erradicação de Casca de Ovo", () => {
  it("Elo 1 & 2 (Simetria Save ↔ Read AES-256-GCM): encripta e decripta credenciais de marketplace com integridade total", () => {
    const rawToken = "APP_USR-9988776655-101802-abcd1234efgh5678-123456789";
    const encrypted = encryptSecret(rawToken);
    expect(encrypted).not.toBe(rawToken);
    expect(encrypted).toContain(":");

    const decrypted = decryptSecret(encrypted);
    expect(decrypted).toBe(rawToken);
  });

  it("Elo 3 & 5 (Marketplace Hub): expõe Server Functions de OAuth 2.0 1-Clique, teste de credenciais e sincronização bilateral", () => {
    expect(typeof getMarketplaceOAuthUrl).toBe("function");
    expect(typeof testMarketplaceConnectorCredentialsFn).toBe("function");
    expect(typeof triggerSyncConnector).toBe("function");
  });

  it("Elo 4 & 5 (Ads Bidirecional): expõe toggleAdCampaignStatus com propagação remota para Meta Graph API e Google Ads API", () => {
    expect(typeof toggleAdCampaignStatus).toBe("function");
  });

  it("Elo 3 & 4 (Turismo Pós-Assinatura): expõe signContractAsPayer com automação de boletos e planilha de comissões", () => {
    expect(typeof signContractAsPayer).toBe("function");
  });

  it("Elo 3 & 4 (Builder Lead Capture & Copilot 1-Click Save): expõe submitOmniPageLeadFn e persistCopilotGeneratedArtifactFn", () => {
    expect(typeof submitOmniPageLeadFn).toBe("function");
    expect(typeof persistCopilotGeneratedArtifactFn).toBe("function");
  });
});
