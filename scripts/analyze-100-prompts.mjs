import fs from "fs";
import path from "path";

const promptsData = JSON.parse(fs.readFileSync("scripts/last_user_prompts.json", "utf8"));

console.log(`Total de prompts catalogados: ${promptsData.length}`);

// Categorizar os temas dos prompts
const categories = {
  mobile_native_design: [],
  mining_crawlers_rss: [],
  turismo_viagens: [],
  commerce_pdv_delivery: [],
  jus_juridico: [],
  imoveis_classificados: [],
  seguranca_multitenant_rls: [],
  suporte_chamados: [],
  marketing_vouchers_hotpages: [],
  rh_ponto_terceirizados: []
};

promptsData.forEach((p, index) => {
  const content = (p.content || "").toLowerCase();
  
  if (content.includes("mobile") || content.includes("teclado") || content.includes("zoom") || content.includes("responsiv") || content.includes("espaçamento") || content.includes("3 toques") || content.includes("anti-ai")) {
    categories.mobile_native_design.push({ num: p.num || index + 1, date: p.created_at, snippet: p.content.slice(0, 150) });
  }
  if (content.includes("mine") || content.includes("crawl") || content.includes("scrap") || content.includes("rss") || content.includes("telemetria")) {
    categories.mining_crawlers_rss.push({ num: p.num || index + 1, date: p.created_at, snippet: p.content.slice(0, 150) });
  }
  if (content.includes("turismo") || content.includes("viagem") || content.includes("roteiro") || content.includes("hotel") || content.includes("cotacao")) {
    categories.turismo_viagens.push({ num: p.num || index + 1, date: p.created_at, snippet: p.content.slice(0, 150) });
  }
  if (content.includes("pdv") || content.includes("delivery") || content.includes("pedido") || content.includes("motolink") || content.includes("caixa") || content.includes("cardapio")) {
    categories.commerce_pdv_delivery.push({ num: p.num || index + 1, date: p.created_at, snippet: p.content.slice(0, 150) });
  }
  if (content.includes("jus") || content.includes("processo") || content.includes("juridico") || content.includes("audiencia") || content.includes("honorarios")) {
    categories.jus_juridico.push({ num: p.num || index + 1, date: p.created_at, snippet: p.content.slice(0, 150) });
  }
  if (content.includes("classificado") || content.includes("imovel") || content.includes("veiculo")) {
    categories.imoveis_classificados.push({ num: p.num || index + 1, date: p.created_at, snippet: p.content.slice(0, 150) });
  }
  if (content.includes("rls") || content.includes("multitenant") || content.includes("tenant") || content.includes("seguranca") || content.includes("permissao")) {
    categories.seguranca_multitenant_rls.push({ num: p.num || index + 1, date: p.created_at, snippet: p.content.slice(0, 150) });
  }
  if (content.includes("suporte") || content.includes("chamado") || content.includes("ticket") || content.includes("portaria")) {
    categories.suporte_chamados.push({ num: p.num || index + 1, date: p.created_at, snippet: p.content.slice(0, 150) });
  }
  if (content.includes("voucher") || content.includes("cupom") || content.includes("hotpage") || content.includes("banner")) {
    categories.marketing_vouchers_hotpages.push({ num: p.num || index + 1, date: p.created_at, snippet: p.content.slice(0, 150) });
  }
  if (content.includes("ponto") || content.includes("rh") || content.includes("terceirizado") || content.includes("equipe")) {
    categories.rh_ponto_terceirizados.push({ num: p.num || index + 1, date: p.created_at, snippet: p.content.slice(0, 150) });
  }
});

console.log("=== DISTRIBUIÇÃO DOS REQUISITOS NOS ÚLTIMOS PROMPTS ===");
for (const [key, list] of Object.entries(categories)) {
  console.log(`- ${key}: ${list.length} ocorrências`);
}
