async function testFeeds() {
  const feeds = [
    { name: "Prefeitura Chapecó", url: "https://chapeco.sc.gov.br/feed" },
    { name: "DOM SC", url: "https://www.diariomunicipal.sc.gov.br/rss" },
    { name: "G1 SC", url: "https://g1.globo.com/rss/sc/santa-catarina/chapeco-regiao.xml" },
    { name: "G1 SC Geral", url: "https://g1.globo.com/dynamo/sc/santa-catarina/rss2.xml" },
    { name: "G1 Economia", url: "https://g1.globo.com/dynamo/economia/rss2.xml" }
  ];

  for (const f of feeds) {
    try {
      console.log(`\nTesting [${f.name}] (${f.url})...`);
      const res = await fetch(f.url, {
        headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36" },
        signal: AbortSignal.timeout(8000),
      });
      console.log(`Status: ${res.status} ${res.statusText}`);
      if (res.ok) {
        const text = await res.text();
        console.log(`Response length: ${text.length} chars`);
        const itemMatches = text.match(/<item[\s\S]*?<\/item>/gi) || text.match(/<entry[\s\S]*?<\/entry>/gi);
        console.log(`Items/Entries found: ${itemMatches ? itemMatches.length : 0}`);
        if (itemMatches && itemMatches.length > 0) {
          console.log(`First item sample:\n${itemMatches[0].slice(0, 300)}...`);
        }
      }
    } catch (e) {
      console.log(`Error: ${e.message}`);
    }
  }
}

testFeeds();
