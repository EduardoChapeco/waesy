const fs = require('fs');
const path = require('path');

const targetFile = path.resolve('src/routes/_store.conta.classificados.novo.tsx');
let content = fs.readFileSync(targetFile, 'utf8');

// 1. Make Section 3 (Entrega e Retirada) visible for ALL physical goods niches, not just "desapego"
const oldDeliveryCondition = `{niche.id === "desapego" && (
            <div className="space-y-4">
            <div className="bg-card rounded-2xl p-4 sm:p-5 space-y-4 border border-border/60 shadow-2xs">`;

const newDeliveryCondition = `{(niche.id === "desapego" || niche.id === "mercado" || niche.id === "gastronomia" || niche.id === "equipamento" || niche.id === "doacao" || templateStyle === "conveniencia") && (
            <div className="space-y-4">
            <div className="bg-card rounded-2xl p-4 sm:p-5 space-y-4 border border-border/60 shadow-2xs">`;

content = content.replace(oldDeliveryCondition, newDeliveryCondition);

// 2. In upsertClassified call, include delivery_mode, city, neighborhood, state and full location
const oldPayloadLocation = `          location_name: locationName.trim() || undefined,
          hide_location: hideLocation,
          images: images,
          attributes,`;

const newPayloadLocation = `          delivery_mode: deliveryMode,
          delivery_type: deliveryMode === "both" ? "both" : deliveryMode === "local_delivery" ? "local_delivery" : deliveryMode === "shipping" ? "national_shipping" : "pickup",
          location_name: locationName.trim() || undefined,
          location_text: locationName.trim() || undefined,
          city: (structuredLoc?.city || (locationName ? locationName.split("-")[0]?.trim() : undefined)),
          neighborhood: (structuredLoc?.neighborhood || (locationName ? locationName.split("-")[1]?.trim() : undefined)),
          state: (structuredLoc?.state || undefined),
          location_lat: structuredLoc?.lat || null,
          location_lng: structuredLoc?.lng || null,
          hide_location: hideLocation,
          images: images,
          attributes: {
            ...attributes,
            delivery_mode: deliveryMode,
            city: (structuredLoc?.city || (locationName ? locationName.split("-")[0]?.trim() : undefined)),
            neighborhood: (structuredLoc?.neighborhood || (locationName ? locationName.split("-")[1]?.trim() : undefined)),
            state: (structuredLoc?.state || undefined),
            hide_location: hideLocation,
            hide_address: hideLocation,
          },`;

content = content.replace(oldPayloadLocation, newPayloadLocation);

// 3. In useEffect hydration, ensure deliveryMode is hydrated
const oldHydrateLocation = `    if (initialData.location_name || initialData.location_text) setLocationName(initialData.location_name || initialData.location_text);`;

const newHydrateLocation = `    if (initialData.location_name || initialData.location_text) setLocationName(initialData.location_name || initialData.location_text);
    if (initialData.delivery_mode) setDeliveryMode(initialData.delivery_mode as any);
    if (initialData.attributes?.delivery_mode) setDeliveryMode(initialData.attributes.delivery_mode as any);`;

content = content.replace(oldHydrateLocation, newHydrateLocation);

// 4. In locationName initial state, provide fallback from store/city cookie if creating a new ad
const oldLocationState = `  const [locationName, setLocationName] = useState("");`;
const newLocationState = `  const [locationName, setLocationName] = useState(() => {
    if (initialData?.location_name || initialData?.location_text) return initialData.location_name || initialData.location_text;
    if (initialData?.attributes?.city) return [initialData.attributes.neighborhood, initialData.attributes.city, initialData.attributes.state].filter(Boolean).join(" — ");
    return "Centro — São Miguel do Oeste - SC";
  });`;

content = content.replace(oldLocationState, newLocationState);

fs.writeFileSync(targetFile, content, 'utf8');
console.log('Successfully patched CMS CRUD delivery and location controls in novo.tsx!');
