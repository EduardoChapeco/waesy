async function testDataJud() {
  console.log("=== TESTANDO CONEXÃO DIRETA COM API PÚBLICA DATAJUD (CNJ) ===");

  const courts = ["tjsc", "tjsp", "trf4"];
  const apiKey = "cDZHYUpZa0JadVREZDJCendQbXY6SkJlTkxScEZTRENwbVZkaUp4clBqUQ==";

  for (const court of courts) {
    const url = `https://api-publica.datajud.cnj.jus.br/api_publica_${court}/_search`;
    console.log(`\nConsultando [${court.toUpperCase()}] em ${url}...`);

    try {
      const res = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `APIKey ${apiKey}`
        },
        body: JSON.stringify({
          query: {
            match_all: {}
          },
          size: 2
        }),
        signal: AbortSignal.timeout(10000)
      });

      console.log(`HTTP Status: ${res.status} ${res.statusText}`);
      if (res.ok) {
        const data = await res.json();
        const total = data.hits?.total?.value || 0;
        console.log(`✓ Total de processos indexados no tribunal: ${total}`);
        if (data.hits?.hits?.length > 0) {
          const sample = data.hits.hits[0]._source;
          console.log("Processo amostra:", {
            numeroProcesso: sample.numeroProcesso,
            classe: sample.classe?.nome,
            tribunal: sample.tribunal,
            dataAjuizamento: sample.dataAjuizamento,
            orgaoJulgador: sample.orgaoJulgador?.nome,
            movimentosCount: sample.movimentos?.length || 0
          });
        }
      } else {
        const errText = await res.text();
        console.log("Resposta de erro:", errText.slice(0, 200));
      }
    } catch (e) {
      console.log(`Erro ao consultar ${court}:`, e.message);
    }
  }
}

testDataJud();
