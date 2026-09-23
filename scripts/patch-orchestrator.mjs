import fs from "fs";

const filePath = "src/services/api-orchestrator.functions.ts";
let content = fs.readFileSync(filePath, "utf8");

// 1. Importar enrichOrInsertMinedProduct
if (!content.includes("enrichOrInsertMinedProduct")) {
  content = content.replace(
    'import { getActiveSecretForProvider, internalTestSecretKeyConnection } from "./secret-vault.functions";',
    'import { getActiveSecretForProvider, internalTestSecretKeyConnection } from "./secret-vault.functions";\nimport { enrichOrInsertMinedProduct } from "./mining.functions";'
  );
}

// 2. Inserir extração mecânica zero-token Schema.org JSON-LD após const html = await fetchRes.text();
const targetHtmlFetch = "const html = await fetchRes.text();";
const mechanicalBlock = `const html = await fetchRes.text();

      // 3.1. Tentativa Mecânica Zero-Token (Schema.org JSON-LD Product)
      try {
        const jsonLdMatches = html.matchAll(/<script[^>]*type=["']application\\/ld\\+json["'][^>]*>([\\s\\S]*?)<\\/script>/gi);
        for (const match of jsonLdMatches) {
          try {
            const parsed = JSON.parse(match[1]);
            const items = Array.isArray(parsed) ? parsed : [parsed];
            for (const item of items) {
              const candidate = item["@graph"] ? item["@graph"] : [item];
              for (const node of candidate) {
                const type = node["@type"];
                const isProduct = type === "Product" || (Array.isArray(type) && type.includes("Product"));
                if (isProduct && (node.name || node.title)) {
                  const rawPrice = node.offers?.price || (Array.isArray(node.offers) ? node.offers[0]?.price : undefined);
                  let priceCents = 0;
                  if (rawPrice) {
                    const numeric = parseFloat(String(rawPrice).replace(/[^\\d.,]/g, "").replace(",", "."));
                    if (!isNaN(numeric)) priceCents = Math.round(numeric * 100);
                  }
                  const images = [];
                  const rawImages = node.image ? (Array.isArray(node.image) ? node.image : [node.image]) : [];
                  for (const img of rawImages) {
                    const url = typeof img === "string" ? img : img?.url;
                    if (url && typeof url === "string" && url.startsWith("http")) images.push(url);
                  }
                  const brand = typeof node.brand === "string" ? node.brand : node.brand?.name;

                  const mechanicalProduct = {
                    title: String(node.name || node.title).trim(),
                    description: String(node.description || "").trim(),
                    price_cents: priceCents,
                    brand: brand ? String(brand).trim() : undefined,
                    images: images.slice(0, 8),
                  };

                  // Enriquecer e salvar atomicamente na base global mined_products
                  enrichOrInsertMinedProduct(supabase, {
                    source_url: input.url,
                    source_domain: new URL(input.url).hostname.replace("www.", ""),
                    title: mechanicalProduct.title,
                    description: mechanicalProduct.description,
                    price_cents: mechanicalProduct.price_cents,
                    brand: mechanicalProduct.brand,
                    images: mechanicalProduct.images,
                    category: "Produtos",
                  }).catch((err) => console.warn("[api-orchestrator] Falha não impeditiva ao enriquecer mined_product:", err));

                  return mechanicalProduct;
                }
              }
            }
          } catch {}
        }
      } catch (e) {
        console.warn("[api-orchestrator] Extração mecânica Schema.org ignorada, prosseguindo com fallback de IA:", e);
      }`;

if (!content.includes("// 3.1. Tentativa Mecânica Zero-Token (Schema.org JSON-LD Product)")) {
  content = content.replace(targetHtmlFetch, mechanicalBlock);
  console.log("✓ Extração mecânica zero-token integrada em importProductFromUrl!");
}

// 3. Enriquecer base global antes de retornar extractedProduct (após fallback de IA)
const returnTarget = "return extractedProduct;\n  });";
const returnTargetCRLF = "return extractedProduct;\r\n  });";

const enrichedReturn = `// Enriquecer base global mined_products antes de retornar
    if (extractedProduct && extractedProduct.title) {
      enrichOrInsertMinedProduct(supabase, {
        source_url: input.url,
        source_domain: new URL(input.url).hostname.replace("www.", ""),
        title: extractedProduct.title,
        description: extractedProduct.description,
        price_cents: extractedProduct.price_cents,
        brand: extractedProduct.brand,
        images: extractedProduct.images,
        category: "Produtos",
      }).catch((err) => console.warn("[api-orchestrator] Falha não impeditiva ao enriquecer mined_product via IA:", err));
    }

    return extractedProduct;\n  });`;

if (!content.includes("// Enriquecer base global mined_products antes de retornar")) {
  if (content.includes(returnTargetCRLF)) {
    content = content.replace(returnTargetCRLF, enrichedReturn.replace(/\n/g, "\r\n"));
    console.log("✓ Enriquecimento global pós-IA integrado (CRLF)!");
  } else if (content.includes(returnTarget)) {
    content = content.replace(returnTarget, enrichedReturn);
    console.log("✓ Enriquecimento global pós-IA integrado (LF)!");
  }
}

fs.writeFileSync(filePath, content, "utf8");
console.log("api-orchestrator.functions.ts finalizado com sucesso!");
