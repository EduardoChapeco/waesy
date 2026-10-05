const fs = require('fs');
const path = require('path');

const niches = [
  { id: "gastronomy", name: "Gastronomia & Delivery", macro: "A", routes: ["_store.gastronomia.tsx", "workspace.pdv.*", "_store.checkout.tsx", "_store.carrinho.tsx"] },
  { id: "retail", name: "Varejo, Moda & Bens", macro: "A", routes: ["_store.moda.tsx", "_store.casa.tsx", "_store.eletronicos.tsx", "_store.construcao.tsx", "_store.limpeza.tsx", "_store.livros.tsx"] },
  { id: "supermarket", name: "Mercado & Hortifruti", macro: "A", routes: ["_store.mercado.tsx", "_store.acougue.tsx", "_store.bebidas.tsx"] },
  { id: "pharmacy", name: "Farmácia, Beleza & Saúde", macro: "A", routes: ["_store.farmacia.tsx", "_store.beleza.tsx"] },
  { id: "pet", name: "Pet Shop & Veterinária", macro: "A", routes: ["_store.pet.tsx"] },
  { id: "vehicles", name: "Veículos & Automotivo", macro: "B", routes: ["_store.classificados.index.tsx", "_store.classificados.$id.tsx", "_store.conta.classificados.novo.tsx"] },
  { id: "real_estate", name: "Imóveis (Venda e Locação)", macro: "B", routes: ["_store.imoveis.tsx", "_store.classificados.index.tsx", "_store.classificados.$id.tsx"] },
  { id: "tourism", name: "Turismo & Hospedagem", macro: "B", routes: ["_store.turismo.index.tsx", "_store.turismo.$id.tsx", "workspace.turismo.*"] },
  { id: "business", name: "Negócios & M&A", macro: "B", routes: ["_store.classificados.index.tsx", "_store.classificados.$id.tsx", "_store.conta.classificados.novo.tsx"] },
  { id: "services", name: "Serviços & Autônomos", macro: "C", routes: ["_store.servicos.tsx", "_store.agendar.index.tsx", "_store.agendar.$id.tsx", "_store.agenda.tsx"] },
  { id: "tech_repair", name: "Assistência Técnica & OS", macro: "C", routes: ["workspace.servicos.os.*", "workspace.ordens-servico.*"] },
  { id: "jobs", name: "Empregos & Recrutamento", macro: "C", routes: ["_store.empregos.index.tsx", "_store.empregos.$id.tsx", "_store.conta.curriculo.tsx", "_store.conta.candidaturas.tsx"] },
  { id: "rental", name: "Locação de Equipamentos", macro: "C", routes: ["_store.classificados.index.tsx", "_store.classificados.$id.tsx"] },
  { id: "events", name: "Eventos, Ingressos & Cultural", macro: "D", routes: ["_store.eventos.tsx", "_store.evento.$id.tsx", "_store.conta.ingressos.tsx"] },
  { id: "social_community", name: "Social, Comunidade & Criadores", macro: "D", routes: ["_store.feed.tsx", "_store.mural.tsx", "_store.bio.$slug.tsx", "_store.membro.$id.tsx", "_store.u.$username.tsx", "_store.doacoes.tsx"] }
];

console.log("Total defined niches:", niches.length);
console.log(JSON.stringify(niches, null, 2));
