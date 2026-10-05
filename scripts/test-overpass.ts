async function test() {
  // Bounding box de Chapecó/SC: [sul, oeste, norte, leste]
  // -27.16, -52.70, -27.04, -52.55
  const ql = `[out:json][timeout:20];
  (
    node["amenity"](-27.16, -52.70, -27.04, -52.55);
    node["shop"](-27.16, -52.70, -27.04, -52.55);
  );
  out body 25;`;

  const url = `https://overpass-api.de/api/interpreter?data=${encodeURIComponent(ql)}`;
  console.log("Consultando Overpass API para Chapecó...");
  const t0 = Date.now();
  const res = await fetch(url, {
    headers: { "User-Agent": "WaesyPlacesHarvester/2.0 (contato@usewaesy.com)" }
  });
  console.log("HTTP:", res.status, "em", Date.now() - t0, "ms");
  if (res.ok) {
    const data = await res.json();
    console.log("Elementos encontrados:", data.elements?.length);
    const withName = data.elements?.filter((e: any) => e.tags?.name) || [];
    console.log("Elementos com nome comercial:", withName.length);
    if (withName.length > 0) {
      console.log("Sample 1:", {
        id: withName[0].id,
        name: withName[0].tags.name,
        amenity: withName[0].tags.amenity || withName[0].tags.shop,
        street: withName[0].tags["addr:street"],
        phone: withName[0].tags.phone || withName[0].tags["contact:phone"],
        lat: withName[0].lat,
        lon: withName[0].lon,
      });
    }
  } else {
    console.log("Erro:", await res.text());
  }
}

test().catch(console.error);
