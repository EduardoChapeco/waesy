/**
 * onboarding-pipeline.test.ts — Testes do Pipeline de Onboarding Guiado por IA,
 * Segurança Anti-SSRF, Tarifação em 20.000 Tokens e Concílio de Squads.
 */

import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";
import {
  assertSafeUrl,
  OnboardingInputSchema,
  extractInstagramUrlFromContent,
  extractBestLogoUrl,
} from "./onboarding-pipeline.server";
import { ONBOARDING_AI_COST, ONBOARDING_AI_TIME_SAVED_MINUTES, formatPlatformTokens } from "@/config/platform-billing.config";

describe("Onboarding Guiado por IA — Pipeline & Segurança", () => {
  describe("1. Segurança Anti-SSRF e Validação de URLs", () => {
    it("permite URLs públicas legítimas via HTTPS e HTTP", () => {
      const url1 = assertSafeUrl("https://lojaexemplo.com.br/cardapio");
      expect(url1.hostname).toBe("lojaexemplo.com.br");

      const url2 = assertSafeUrl("https://instagram.com/pizzaria_artesanal");
      expect(url2.hostname).toBe("instagram.com");
    });

    it("bloqueia estritamente URLs locais e de loopback (localhost, 127.0.0.1)", () => {
      expect(() => assertSafeUrl("http://localhost:3000")).toThrowError(/segurança/i);
      expect(() => assertSafeUrl("http://127.0.0.1/admin")).toThrowError(/segurança/i);
      expect(() => assertSafeUrl("http://[::1]:8080")).toThrowError(/segurança/i);
    });

    it("bloqueia estritamente IPs de rede privada interna (10.x, 192.168.x, 172.16.x)", () => {
      expect(() => assertSafeUrl("http://10.0.0.1/status")).toThrowError(/segurança/i);
      expect(() => assertSafeUrl("http://192.168.1.1/router")).toThrowError(/segurança/i);
      expect(() => assertSafeUrl("http://172.20.0.5/api")).toThrowError(/segurança/i);
    });

    it("bloqueia endpoints de metadados de nuvem (169.254.169.254 / GCP metadata)", () => {
      expect(() => assertSafeUrl("http://169.254.169.254/latest/meta-data/")).toThrowError(/segurança/i);
      expect(() => assertSafeUrl("http://metadata.google.internal/computeMetadata/v1/")).toThrowError(/segurança/i);
    });

    it("rejeita protocolos não permitidos (file://, ftp://, javascript:)", () => {
      expect(() => assertSafeUrl("file:///etc/passwd")).toThrowError(/Apenas protocolos HTTP e HTTPS/i);
      expect(() => assertSafeUrl("ftp://ftp.example.com/file")).toThrowError(/Apenas protocolos HTTP e HTTPS/i);
    });
  });

  describe("2. Tarifação Canônica em Tokens da Plataforma", () => {
    it("garante o valor central de 20.000 tokens para o Onboarding Completo", () => {
      expect(ONBOARDING_AI_COST).toBe(20_000);
      expect(ONBOARDING_AI_TIME_SAVED_MINUTES).toBe(360);
      expect(formatPlatformTokens(ONBOARDING_AI_COST)).toBe("20.000");
    });
  });

  describe("3. Validação do Esquema de Entrada", () => {
    it("valida payload de entrada com storeId e URL válidos", () => {
      const validPayload = {
        url: "https://minhaloja.com.br",
        storeId: "123e4567-e89b-12d3-a456-426614174000",
      };

      const result = OnboardingInputSchema.safeParse(validPayload);
      expect(result.success).toBe(true);
    });

    it("rejeita storeId que não seja UUID", () => {
      const invalidPayload = {
        url: "https://minhaloja.com.br",
        storeId: "id-invalido-123",
      };

      const result = OnboardingInputSchema.safeParse(invalidPayload);
      expect(result.success).toBe(false);
    });
  });

  describe("4. Descoberta de Instagram e Integridade Anti-Simulação", () => {
    it("extrai perfil válido do Instagram ignorando rotas genéricas (/p/, /reel/, /explore/)", () => {
      const html = `
        <a href="https://www.instagram.com/p/ABC123/">Post</a>
        <a href="https://instagram.com/reel/XYZ999/">Reel</a>
        <a href="https://www.instagram.com/embarque22oficial/">Siga nosso Instagram</a>
      `;
      const found = extractInstagramUrlFromContent(html);
      expect(found).toEqual({
        url: "https://www.instagram.com/embarque22oficial/",
        handle: "embarque22oficial",
      });
    });

    it("retorna null quando não há perfil válido do Instagram no conteúdo", () => {
      const html = `<a href="https://instagram.com/explore/">Explore</a>`;
      expect(extractInstagramUrlFromContent(html)).toBeNull();
    });

    it("garante que AiLiveExtractionDisplay não contém simulação via setTimeout", () => {
      const displaySource = fs.readFileSync(
        path.resolve("src/components/onboarding/ai-live-extraction-display.tsx"),
        "utf8"
      );
      expect(displaySource).not.toContain("setTimeout");
    });

    it("extrai logo real em alta resolução ignorando favicons e ícones pequenos", () => {
      const htmlWithFaviconAndLogo = `
        <html>
          <head>
            <link rel="icon" href="/favicon.ico" sizes="32x32" />
            <link rel="apple-touch-icon" href="/apple-touch-icon.png" sizes="180x180" />
          </head>
          <body>
            <header>
              <img src="/assets/brand-logo-hd.png" class="site-logo" alt="Embarque 22 Logo" />
            </header>
          </body>
        </html>
      `;
      const logo = extractBestLogoUrl(htmlWithFaviconAndLogo, "https://embarque22.com.br/");
      expect(logo).toBe("https://embarque22.com.br/assets/brand-logo-hd.png");

      const htmlFaviconOnly = `
        <html>
          <head>
            <link rel="icon" href="/favicon.ico" />
            <link rel="icon" href="/icon-32x32.png" sizes="32x32" />
          </head>
        </html>
      `;
      expect(
        extractBestLogoUrl(htmlFaviconOnly, "https://embarque22.com.br/", "https://cdn.instagram.com/avatar-hd.jpg")
      ).toBe("https://cdn.instagram.com/avatar-hd.jpg");
    });
  });
});
