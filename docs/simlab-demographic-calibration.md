# Calibração demográfica do SimLab

**Estado em 6 de outubro de 2026:** o catálogo `src/lib/simlab/brazil-demographics.ts` contém personagens fictícios codificados para exploração qualitativa. O próprio catálogo os marca como `seed_catalog_profile` e `not_calibrated`. Seus nomes, rendas, ocupações, hábitos, composição familiar, scores psicográficos e planilhas financeiras não são observações da POF, nem representam uma amostra probabilística.

A página oficial do IBGE informa que a POF 2017–2018 investiga estruturas de consumo, gastos e rendimentos das famílias por amostragem. O desenho divulgado produz estimativas para Brasil, Grandes Regiões e UFs, além de cortes urbano/rural conforme o nível geográfico. A página disponibiliza dados, documentação, questionários, programas de leitura e memória de cálculo da edição 2017–2018; os arquivos foram atualizados em 2023. Isso é base potencial para calibrar alguns marginais demográficos e de consumo, mas não valida uma propensão individual de compra nem uma resposta a anúncio. [1]

A POF tem desenho amostral conglomerado em dois estágios, com estratificação geográfica e socioeconômica. Uma ingestão deve preservar pesos e documentação do desenho amostral; não basta contar linhas ou usar rendas sem os procedimentos oficiais. O IBGE também publicou uma retificação da variável derivada `Renda_Total` nos microdados, portanto a pipeline deve registrar qual versão e transformação foram utilizadas. [1] [2]

## Regra de produto

Até que os microdados estejam ingeridos e validados, os perfis existentes podem ser usados apenas para exploração qualitativa sintética, sempre rotulados como fictícios e não calibrados. Não devem alimentar taxas de conversão, previsão de vendas, estimativa de tamanho de mercado ou afirmações de que representam consumidores brasileiros.

## Requisitos para calibração real

Uma implementação futura precisa registrar a edição e versão dos microdados, o arquivo/documentação de origem, o hash do arquivo, a licença e a transformação aplicada. Deve usar pesos da pesquisa e preservar o nível geográfico em que cada estimativa é sustentada. As personas resultantes devem ser descritas como **perfis sintéticos calibrados a distribuições publicadas**, nunca como pessoas reais nem como réplicas de respondentes.

A amostragem e a calibração devem ser verificadas contra tabelas oficiais ponderadas, com intervalos de incerteza e aviso para células pequenas. Características não medidas pela POF — como preferências por criativo, resposta a ofertas, uso de canais, confiança em marcas e intenção de compra — precisam vir de experimentos ou pesquisas observadas. Não devem ser completadas com coeficientes heurísticos ou histórias individuais atribuídas a uma distribuição demográfica.

Para previsão de vendas, o elo entre população e resultado comercial requer testes prospectivos, resultados observados e validação fora da amostra. A POF informa contexto populacional e de consumo; isoladamente, não identifica efeito causal de preço, campanha ou localização de uma empresa.

## Referências

[1]: https://www.ibge.gov.br/estatisticas/sociais/saude/24786-pof-2017-2018.html "IBGE — POF 2017–2018: informações, metodologia e microdados"
[2]: https://www.ibge.gov.br/en/component/content/article/1998-novo-portal/erramos/26329-update-of-the-derived-variable-renda_total-in-pof-2017-2018-microdata.html "IBGE — retificação da variável derivada Renda_Total nos microdados POF 2017–2018"
