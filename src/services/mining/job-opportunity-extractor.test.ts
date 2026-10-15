import { describe, it, expect } from "vitest";
import {
  sanitizeJobTitle,
  parseBrlSalaryToCents,
  normalizeJobCategory,
  sanitizeJobHtmlBody,
  extractRequirementsAndBenefits,
  isJobListingPage,
  extractJobLinksFromListing,
} from "./job-opportunity-extractor";

describe("Job Opportunity Extractor & Curation — Testes Canônicos", () => {
  describe("1. Sanitização Estrita de Títulos de Cargo (Anti-Listing Branding)", () => {
    it("deve preservar cargos válidos e capitalizar a primeira letra", () => {
      expect(sanitizeJobTitle("desenvolvedor full stack sênior")).toBe("Desenvolvedor full stack sênior");
      expect(sanitizeJobTitle("Assistente Administrativo")).toBe("Assistente Administrativo");
      expect(sanitizeJobTitle("Mecânico de Manutenção Industrial")).toBe("Mecânico de Manutenção Industrial");
    });

    it("deve remover sufixos de portais publicitários (Vagas.com, Indeed, Catho, Gupy)", () => {
      expect(sanitizeJobTitle("Auxiliar de Almoxarifado - Vagas.com.br")).toBe("Auxiliar de Almoxarifado");
      expect(sanitizeJobTitle("Analista Financeiro Pleno | Indeed.com")).toBe("Analista Financeiro Pleno");
      expect(sanitizeJobTitle("Operador de Caixa - Catho")).toBe("Operador de Caixa");
      expect(sanitizeJobTitle("Engenheiro de Software • Gupy")).toBe("Engenheiro de Software");
    });

    it("deve rejeitar rigorosamente títulos de agregação e listagens de busca", () => {
      expect(sanitizeJobTitle("1 vaga de emprego para chapeco sc")).toBeNull();
      expect(sanitizeJobTitle("25 vagas de emprego em Chapecó")).toBeNull();
      expect(sanitizeJobTitle("Vagas em Chapecó - SC")).toBeNull();
      expect(sanitizeJobTitle("Empregos em Santa Catarina")).toBeNull();
      expect(sanitizeJobTitle("Encontramos 12 oportunidades em Chapecó")).toBeNull();
      expect(sanitizeJobTitle("Resultado de busca de vagas")).toBeNull();
      expect(sanitizeJobTitle("Pular para o conteúdo Vagas.com Menu Cad")).toBeNull();
    });

    it("deve rejeitar títulos com comprimento inválido ou vazios", () => {
      expect(sanitizeJobTitle("")).toBeNull();
      expect(sanitizeJobTitle("   ")).toBeNull();
      expect(sanitizeJobTitle("ab")).toBeNull();
      expect(sanitizeJobTitle("a".repeat(150))).toBeNull();
    });
  });

  describe("2. Normalização de Salários BRL (Zero Text Slicing)", () => {
    it("deve extrair valores unitários em Real para centavos inteiros", () => {
      const res = parseBrlSalaryToCents("Salário: R$ 3.500,00 por mês");
      expect(res.minCents).toBe(350000);
      expect(res.display).toBe("R$ 3.500,00");
    });

    it("deve extrair faixas salariais (minCents e maxCents)", () => {
      const res = parseBrlSalaryToCents("Faixa salarial: R$ 2.000,00 até R$ 4.500,00");
      expect(res.minCents).toBe(200000);
      expect(res.maxCents).toBe(450000);
      expect(res.display).toContain("R$ 2.000,00");
      expect(res.display).toContain("R$ 4.500,00");
    });

    it("deve normalizar texto de skip-link ou navegação espúria para 'A combinar'", () => {
      const res = parseBrlSalaryToCents("Pular para o conteúdo Vagas.com Menu Cad");
      expect(res.display).toBe("A combinar");
      expect(res.minCents).toBeUndefined();
    });

    it("deve descartar valores espúrios fora da janela viável (< R$ 400 ou > R$ 100.000)", () => {
      const resLow = parseBrlSalaryToCents("Bolsa de R$ 50,00");
      expect(resLow.display).toBe("A combinar");

      const resHigh = parseBrlSalaryToCents("Contrato de R$ 500.000,00");
      expect(resHigh.display).toBe("A combinar");
    });

    it("deve retornar 'A combinar' caso não haja menção numérica BRL", () => {
      const res = parseBrlSalaryToCents("Salário a combinar compatível com o mercado");
      expect(res.display).toBe("A combinar");
    });
  });

  describe("3. Normalizador de Categoria de Emprego", () => {
    it("deve categorizar 'comercial' corretamente", () => {
      expect(normalizeJobCategory("Vendedor Interno e Atendimento")).toBe("comercial");
      expect(normalizeJobCategory("Operadora de Caixa de Supermercado")).toBe("comercial");
    });

    it("deve categorizar 'tech' corretamente", () => {
      expect(normalizeJobCategory("Desenvolvedor Frontend React")).toBe("tech");
      expect(normalizeJobCategory("Analista de Redes e Infraestrutura de TI")).toBe("tech");
    });

    it("deve categorizar 'operacional' corretamente", () => {
      expect(normalizeJobCategory("Auxiliar de Produção e Estoque")).toBe("operacional");
      expect(normalizeJobCategory("Motorista Carreteiro CNH E")).toBe("operacional");
    });

    it("deve categorizar 'saude' corretamente", () => {
      expect(normalizeJobCategory("Enfermeiro Hospitalar Plantonista")).toBe("saude");
      expect(normalizeJobCategory("Farmacêutico Responsável Técnico")).toBe("saude");
    });

    it("deve categorizar 'estagio' e 'pj' corretamente", () => {
      expect(normalizeJobCategory("Estagiário de Administração")).toBe("estagio");
      expect(normalizeJobCategory("Consultor PJ de Negócios")).toBe("pj");
    });
  });

  describe("4. Detecção Precoce de Catálogo/Listagem (isJobListingPage)", () => {
    it("deve identificar páginas de catálogo por padrões de URL de busca", () => {
      expect(isJobListingPage("Vagas", "https://www.vagas.com.br/vagas-em-chapeco-sc", "")).toBe(true);
      expect(isJobListingPage("Empregos", "https://br.indeed.com/empregos-em-Chapec%C3%B3,-SC", "")).toBe(true);
      expect(isJobListingPage("Busca", "https://site.com.br/vagas?cidade=chapeco", "")).toBe(true);
    });

    it("deve identificar páginas de catálogo por padrões de título agregador", () => {
      expect(isJobListingPage("1 vaga de emprego para chapeco sc", "https://portal.com.br/detalhe", "")).toBe(true);
      expect(isJobListingPage("Encontramos 10 vagas abertas", "https://portal.com.br/detalhe", "")).toBe(true);
      expect(isJobListingPage("Vagas em Chapecó", "https://portal.com.br/vagas", "")).toBe(true);
    });

    it("deve identificar páginas que contenham 3 ou mais links de vagas no DOM", () => {
      const htmlWithLinks = `
        <div>
          <a href="/vaga/123-analista">Vaga 1</a>
          <a href="/vaga/124-gerente">Vaga 2</a>
          <a href="/vaga/125-assistente">Vaga 3</a>
        </div>
      `;
      expect(isJobListingPage("Oportunidades", "https://portal.com.br/vagas-gerais", htmlWithLinks)).toBe(true);
    });

    it("não deve classificar uma vaga individual legítima como listagem", () => {
      const htmlSingle = `
        <article>
          <h1>Analista de Recursos Humanos</h1>
          <p>Responsável pelo recrutamento e seleção de talentos.</p>
        </article>
      `;
      expect(isJobListingPage("Analista de Recursos Humanos", "https://empresa.com.br/vagas/v12345/analista-rh", htmlSingle)).toBe(false);
    });
  });

  describe("5. Spidering de Links Filhos (extractJobLinksFromListing)", () => {
    it("deve extrair links individuais de vagas de Vagas.com.br e Indeed", () => {
      const html = `
        <div>
          <a href="/vagas/v2648192/analista-de-rh">Ver vaga RH</a>
          <a href="/vagas/v2648193/desenvolvedor-full-stack">Ver vaga Dev</a>
          <a href="/vagas-em-chapeco-sc">Outra busca</a>
          <a href="https://br.indeed.com/viewjob?jk=abcdef123456">Vaga Indeed</a>
        </div>
      `;
      const links = extractJobLinksFromListing(html, "https://www.vagas.com.br/vagas-em-chapeco-sc");

      expect(links.length).toBe(3);
      expect(links).toContain("https://www.vagas.com.br/vagas/v2648192/analista-de-rh");
      expect(links).toContain("https://www.vagas.com.br/vagas/v2648193/desenvolvedor-full-stack");
      expect(links).toContain("https://br.indeed.com/viewjob?jk=abcdef123456");
      // Não deve incluir links de busca agregada
      expect(links).not.toContain("https://www.vagas.com.br/vagas-em-chapeco-sc");
    });
  });

  describe("6. Parser Heurístico e Extração de Requisitos/Benefícios", () => {
    it("deve isolar seções estruturadas de Requisitos e Benefícios a partir de bullet points", () => {
      const rawText = `
        Sobre a vaga:
        Estamos contratando profissional para atuar em nossa equipe técnica.

        Requisitos:
        - Ensino Superior Completo em Ciências da Computação ou afins
        - Experiência mínima de 2 anos com React e TypeScript
        - Conhecimento em banco de dados SQL

        Benefícios:
        - Vale Refeição de R$ 35,00 por dia
        - Plano de Saúde Unimed coparticipativo
        - Vale Transporte
      `;

      const result = extractRequirementsAndBenefits(rawText);

      expect(result.requirements.length).toBe(3);
      expect(result.requirements[0]).toContain("Ensino Superior");
      expect(result.requirements[1]).toContain("React e TypeScript");

      expect(result.benefits.length).toBe(3);
      expect(result.benefits[0]).toContain("Vale Refeição");
      expect(result.benefits[1]).toContain("Plano de Saúde");
    });

    it("deve sanitizar ruídos mecânicos do HTML (nav, cookies, skip-links)", () => {
      const dirtyHtml = `
        <html>
          <header><nav><a href="/">Home</a> Pular para o conteúdo</nav></header>
          <div class="cookie-consent">Usamos cookies para melhorar sua experiência</div>
          <main>
            <div class="job-description">
              <p>Descrição profissional da vaga de Desenvolvedor Web em regime híbrido com horários flexíveis.</p>
            </div>
          </main>
          <footer>Rodapé institucional 2026</footer>
        </html>
      `;

      const sanitized = sanitizeJobHtmlBody(dirtyHtml);
      expect(sanitized).not.toContain("Home");
      expect(sanitized).not.toContain("cookie");
      expect(sanitized).not.toContain("Rodapé institucional");
      expect(sanitized).toContain("Descrição profissional da vaga");
    });
  });
});
