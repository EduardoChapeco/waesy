import { createFileRoute } from "@tanstack/react-router";
import { getLegalDocumentBySlug } from "@/services/legal.functions";
import { LegalDocumentViewer } from "@/components/legal/legal-document-viewer";

const DEFAULT_TERMOS = {
  title: "Termos Gerais de Uso e Condições de Serviço",
  slug: "termos",
  version: "3.0",
  summary:
    "Contrato de prestação de serviços tecnológicos e regras operacionais do ecossistema Waesy, regulamentando o acesso a varejo, logística expressa, turismo parceiro, gestão corporativa e liquidação de pagamentos.",
  content_markdown: `## 1. Aceitação e Natureza Jurídica
Ao acessar, criar conta ou utilizar qualquer funcionalidade do ecossistema Waesy ("Plataforma"), você celebra contrato vinculante com a Waesy Tecnologia LTDA, declarando aceitar integralmente estes Termos de Uso e a Política de Privacidade. O ecossistema opera como provedor de infraestrutura tecnológica integrada para cidades e comunidades, provendo módulos de varejo, serviços, mobilidade, logística, turismo e gestão corporativa.

## 2. Acesso à Plataforma e Níveis de Credenciais
A plataforma categoriza os acessos em:
- **Usuários Civis / Consumidores:** Indivíduos que utilizam a interface pública para compra de produtos, contratação de fretes, reservas turísticas e interação comunitária.
- **Negócios & Lojistas Parceiros:** Estabelecimentos comerciais que operam vitrines digitais, pontos de venda (PDV), gestão de pedidos e faturamento.
- **Operadores de Logística e Condutores Parceiros:** Profissionais autônomos ou transportadoras que prestam serviços de coleta, despacho e frete urbano sob tabela tarifária própria ou pré-fixada.
- **Agências de Turismo Parceiras:** Empresas credenciadas (destacando-se a Excelência Tour como agência parceira padrão no módulo Turis) que intermediam pacotes, bilhetes aéreos, hospedagens e excursões.

## 3. Módulos Operacionais e Condições Específicas

### 3.1 Varejo, Delivery e PDV
Os estabelecimentos comerciais são soberanos quanto à disponibilidade, qualidade, precificação e conformidade sanitária de seus produtos. A Waesy provê a infraestrutura de catálogo, conciliação e frente de caixa.

### 3.2 Logística Expressa e Serviços de Despacho
O serviço de despacho urbano conecta remetentes a entregadores locais. As tarifas são cotadas com base em quilometragem e tempo, operando sem comissões abusivas sobre o valor dos produtos, mediante taxa fixa operacional por corrida finalizada. O condutor aguardará o cliente por até 3 (três) minutos no ponto de coleta; decorrido o prazo sem comparecimento, o cancelamento acarreta cobrança integral do deslocamento reservado.

### 3.3 Módulo Turis (Turismo, Viagens & Hospedagem)
A contratação de pacotes, aéreos e hotéis através do módulo Turis é intermediada por agências de viagens devidamente credenciadas junto ao CADASTUR. As reservas, alterações e cancelamentos seguem as condições específicas de cada companhia aérea, hotel ou operadora parceira, além do Código de Defesa do Consumidor.

### 3.4 Gestão de Pessoal e Ponto Eletrônico
As ferramentas de controle de jornada e ponto eletrônico operam em estrita conformidade com a Portaria MTE nº 671/2021, registrando auditoria temporal e geolocalizada dos registros para fins de cálculo de folha de pagamento e segurança jurídica dos empregadores.

## 4. Pagamentos, Liquidação e Inadimplência
Os pagamentos processados via Pix, cartões ou saldo digital são liquidados através de instituições de pagamento autorizadas pelo Banco Central. Débitos pendentes resultantes de cancelamentos intempestivos ou corridas não honradas bloqueiam novos chamados no ecossistema até a devida regularização.

## 5. Propriedade Intelectual e Segurança
É expressamente vedada a engenharia reversa, mineração não autorizada, uso de marcas registradas sem licença prévia ou inserção de dados fraudulentos no sistema. A integridade das APIs e do banco de dados é monitorada permanentemente com mecanismos de defesa contra abuso e negação de serviço.

## 6. Alterações, Vigência e Foro
A Waesy reserva-se o direito de atualizar estes termos periodicamente, notificando os usuários com antecedência razoável. Estes Termos são regidos pelas leis da República Federativa do Brasil, elegendo-se o foro da Comarca de São Miguel do Oeste, Estado de Santa Catarina, com renúncia expressa a qualquer outro.`,
};

export const Route = createFileRoute("/_store/termos")({
  head: ({ loaderData }) => ({
    meta: [
      {
        title: (loaderData as any)?.doc?.title
          ? `${(loaderData as any).doc.title} | Waesy`
          : "Termos Gerais de Uso e Condições | Waesy",
      },
    ],
  }),
  loader: async () => {
    try {
      const doc = await getLegalDocumentBySlug({ data: { slug: "termos" } }).catch(() => null);
      return { doc: doc || DEFAULT_TERMOS };
    } catch {
      return { doc: DEFAULT_TERMOS };
    }
  },
  component: TermosPage,
});

function TermosPage() {
  const { doc } = ((Route.useLoaderData() as any) || {}) as { doc: any };
  return <LegalDocumentViewer document={doc || DEFAULT_TERMOS} />;
}
