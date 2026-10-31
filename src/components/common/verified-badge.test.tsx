import { describe, it, expect } from "vitest";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { VerifiedBadge } from "./VerifiedBadge";

describe("VerifiedBadge — Sovereign Verification Invariant", () => {
  it("renders strictly null when isVerified is false, null or undefined", () => {
    const unverifiedFalse = renderToStaticMarkup(<VerifiedBadge isVerified={false} />);
    expect(unverifiedFalse).toBe("");

    const unverifiedNull = renderToStaticMarkup(<VerifiedBadge isVerified={null} />);
    expect(unverifiedNull).toBe("");

    const unverifiedUndefined = renderToStaticMarkup(<VerifiedBadge />);
    expect(unverifiedUndefined).toBe("");
  });

  it("renders official rosette SVG when isVerified is true and no custom badgeUrl is provided", () => {
    const html = renderToStaticMarkup(<VerifiedBadge isVerified={true} />);
    expect(html).toContain("<svg");
    expect(html).toContain("text-sky-500");
    expect(html).toContain("Verificado pelo Admin Master");
  });

  it("renders custom uploaded seal img when badgeUrl is provided and isVerified is true", () => {
    const customUrl = "https://cdn.usewaesy.com/seals/official-gold-seal.png";
    const html = renderToStaticMarkup(
      <VerifiedBadge isVerified={true} badgeUrl={customUrl} title="Selo Oficial de Ouro" />
    );
    expect(html).toContain("<img");
    expect(html).toContain(customUrl);
    expect(html).toContain("Selo Oficial de Ouro");
  });
});
