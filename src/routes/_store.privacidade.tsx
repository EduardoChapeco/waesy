import { createFileRoute } from "@tanstack/react-router";
import { getLegalDocumentBySlug } from "@/services/legal.functions";
import { LegalDocumentViewer } from "@/components/legal/legal-document-viewer";

const DEFAULT_PRIVACIDADE = {
  title: "Política de Privacidade e Governança de Dados Pessoais (LGPD)",
  slug: "privacidade",
  version: "3.0",
  summary:
    "Diretrizes de coleta, tratamento, armazenamento e proteção de dados pessoais de clientes, lojistas, viajantes e parceiros no ecossistema Waesy, em estrita conformidade com a Lei nº 13.709/2018.",
  content_markdown: `## 1. Compromisso com a Privacidade e Princípio Zero-Trust
A Waesy adota a governança de privacidade por padrão (Privacy by Design) e a arquitetura Zero-Trust como pilares fundamentais. Tratamos apenas as informações estritamente necessárias para a prestação dos serviços contratados, segurança operacional e cumprimento de exigências legais e regulatórias.

## 2. Categorias de Dados Pessoais Coletados
- **Dados Cadastrais e de Identificação:** Nome civil, CPF, e-mail, telefone e endereço físico para faturamento e entregas.
- **Dados Profissionais e Corporativos:** Razão social, CNPJ, registro no CADASTUR (para operadores de turismo parceiros), registro de ponto eletrônico (conforme Portaria MTE 671/2021) e contratos corporativos.
- **Dados de Geolocalização:** Coordenadas GPS coletadas com consentimento prévio para roteamento de entregadores, despacho imediato e confirmação de chegada no destino.
- **Dados Transacionais e Financeiros:** Chaves Pix, histórico de compras, faturas e registros contábeis. Informações sensíveis de cartão são tokenizadas diretamente por gateways homologados PCI-DSS, nunca sendo armazenadas em servidores locais da Waesy.

## 3. Bases Legais para o Tratamento (LGPD Art. 7º)
O tratamento de dados pessoais pela Waesy fundamenta-se nas seguintes bases:
- **Execução de Contrato (Inciso V):** Viabilizar compras, despachos de encomendas, emissão de bilhetes turísticos e prestação de suporte ao cliente.
- **Cumprimento de Obrigação Legal ou Regulatória (Inciso II):** Emissão de notas fiscais (NFe/NFCe), relatórios contábeis e registros de ponto eletrônico.
- **Legítimo Interesse (Inciso IX):** Prevenção a fraudes, segurança do ecossistema e melhoria contínua da experiência de uso.
- **Consentimento (Inciso I):** Envio de novidades, comunicações via WhatsApp e tratamentos específicos quando exigidos por lei.

## 4. Compartilhamento Seguro com Parceiros
Os dados pessoais são compartilhados exclusivamente com:
- **Estabelecimentos Comerciais e Agências Parceiras:** Dados de destinatário e passageiro compartilhados estritamente com a loja ou agência parceira responsável pelo cumprimento do pedido (ex.: emissão de passagens ou montagem de pacotes com a Excelência Tour).
- **Operadores de Pagamento e Bancos:** Processamento e liquidação de recebíveis e Pix.
- **Autoridades Governamentais:** Quando exigido por ordem judicial ou disposição legal expressa.

## 5. Medidas Técnicas de Segurança e Isolamento
- Isolamento multitenant no banco de dados via Row-Level Security (RLS) impedindo acesso cruzado entre organizações.
- Criptografia de ponta a ponta em repouso (AES-256) e em trânsito (TLS 1.3).
- Logs imutáveis de auditoria forense registrando todas as ações de leitura e modificação em dados sensíveis.

## 6. Direitos do Titular de Dados e Canal do Encarregado (DPO)
Nos termos do Art. 18 da LGPD, o titular poderá solicitar acesso, correção, anonimização, portabilidade ou eliminação de seus dados pessoais através do canal oficial do Encarregado de Proteção de Dados: **dpo@usewaesy.com**. As solicitações são atendidas dentro dos prazos legais estabelecidos pela Autoridade Nacional de Proteção de Dados (ANPD).`,
};

export const Route = createFileRoute("/_store/privacidade")({
  head: ({ loaderData }) => ({
    meta: [
      {
        title: (loaderData as any)?.doc?.title
          ? `${(loaderData as any).doc.title} | Waesy`
          : "Política de Privacidade e Proteção de Dados (LGPD) | Waesy",
      },
    ],
  }),
  loader: async () => {
    try {
      const doc = await getLegalDocumentBySlug({ data: { slug: "privacidade" } }).catch(() => null);
      return { doc: doc || DEFAULT_PRIVACIDADE };
    } catch {
      return { doc: DEFAULT_PRIVACIDADE };
    }
  },
  component: PrivacidadePage,
});

function PrivacidadePage() {
  const { doc } = ((Route.useLoaderData() as any) || {}) as { doc: any };
  return <LegalDocumentViewer document={doc || DEFAULT_PRIVACIDADE} />;
}
