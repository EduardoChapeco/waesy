import { createFileRoute } from "@tanstack/react-router";
import { getLegalDocumentBySlug } from "@/services/legal.functions";
import { LegalDocumentViewer } from "@/components/legal/legal-document-viewer";

const DEFAULT_TROCAS = {
  title: "Políticas de Trocas, Devoluções e Reembolsos",
  slug: "trocas-e-devolucoes",
  version: "2.1",
  summary:
    "Diretrizes e procedimentos oficiais para desistência de compra, trocas por defeito e devoluções, garantindo total transparência e respeito ao Código de Defesa do Consumidor (CDC).",
  content_markdown: `## 1. Direito de Arrependimento (CDC Art. 49)
Para compras realizadas pela internet ou aplicativo, você tem o direito de desistir da compra em até **7 (sete) dias corridos**, contados a partir da data de recebimento do produto. O reembolso será efetuado integralmente, incluindo eventuais valores de frete pagos.

## 2. Como Solicitar uma Troca ou Devolução
Você pode abrir uma solicitação em menos de 1 minuto diretamente pelo seu painel:
1. Acesse **Minha Conta > Trocas e Devoluções**;
2. Selecione o pedido e o produto que deseja trocar ou devolver;
3. Informe o motivo e anexe fotos se houver alguma avaria visível;
4. Aguarde a emissão da etiqueta de postagem reversa ou agendamento de coleta.

## 3. Produtos com Defeito ou Vício Oculto
- Produtos não-duráveis (ex: alimentos): prazo de até **30 dias** para reclamação.
- Produtos duráveis (ex: eletrônicos, vestuário): prazo de até **90 dias** (CDC Art. 26).
- Caso o vício não seja sanado em 30 dias, você poderá optar pela substituição do produto, restituição imediata da quantia paga ou abatimento proporcional do preço.

## 4. Condições para Devolução por Arrependimento
O produto deve ser devolvido em sua embalagem original (quando aplicável), acompanhado da respectiva nota fiscal e de todos os manuais e acessórios que o acompanham.

## 5. Prazos de Reembolso
- **Pix:** Estorno realizado em até 24 horas úteis após a conferência do produto pelo estabelecimento.
- **Cartão de Crédito:** O estorno é solicitado imediatamente à administradora do cartão, sendo lançado em até 2 faturas subsequentes.`,
};

export const Route = createFileRoute("/_store/trocas-e-devolucoes")({
  head: ({ loaderData }) => ({
    meta: [
      {
        title: (loaderData as any)?.doc?.title
          ? `${(loaderData as any).doc.title} | Waesy`
          : "Políticas de Trocas, Devoluções e Cancelamentos | Waesy",
      },
    ],
  }),
  loader: async () => {
    try {
      const doc = await getLegalDocumentBySlug({ data: { slug: "trocas-e-devolucoes" } }).catch(() => null);
      return { doc: doc || DEFAULT_TROCAS };
    } catch {
      return { doc: DEFAULT_TROCAS };
    }
  },
  component: TrocasEDevolucoesPage,
});

function TrocasEDevolucoesPage() {
  const { doc } = ((Route.useLoaderData() as any) || {}) as { doc: any };
  return <LegalDocumentViewer document={doc || DEFAULT_TROCAS} />;
}
