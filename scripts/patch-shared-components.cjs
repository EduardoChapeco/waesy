const fs = require('fs');

// 1. Patch CrudActionsMenuProps in src/components/ui/crud-actions-menu.tsx
let crudContent = fs.readFileSync('src/components/ui/crud-actions-menu.tsx', 'utf8');
crudContent = crudContent.replace(
  '  archiveLabel?: string;',
  '  archiveLabel?: string;\n  archiveTitle?: string;\n  archiveDescription?: string;'
);
crudContent = crudContent.replace(
  '  deleteConfirmDescription?: string;',
  '  deleteConfirmDescription?: string;\n  deleteTitle?: string;\n  deleteDescription?: string;'
);
crudContent = crudContent.replace(
  '  triggerClassName?: string;',
  '  triggerClassName?: string;\n  triggerVariant?: string;'
);
crudContent = crudContent.replace(
  '  triggerAriaLabel,',
  '  triggerAriaLabel,\n  deleteTitle,\n  deleteDescription,\n  triggerVariant,'
);
crudContent = crudContent.replace(
  'deleteConfirmTitle || `Excluir ${entityName}`',
  'deleteConfirmTitle || deleteTitle || `Excluir ${entityName}`'
);
crudContent = crudContent.replace(
  'deleteConfirmDescription ||',
  'deleteConfirmDescription || deleteDescription ||'
);
fs.writeFileSync('src/components/ui/crud-actions-menu.tsx', crudContent, 'utf8');
console.log('patched crud-actions-menu.tsx');

// 2. Patch FavoriteButtonProps in src/components/common/favorite-button.tsx
let favContent = fs.readFileSync('src/components/common/favorite-button.tsx', 'utf8');
favContent = favContent.replace(
  'export interface FavoriteButtonProps {\n  entityType: "classified" | "post" | "event" | "product" | "service";\n  entityId: string;',
  'export interface FavoriteButtonProps {\n  entityType?: "classified" | "post" | "event" | "product" | "service";\n  entityId?: string;\n  itemType?: string;\n  itemId?: string;'
);
favContent = favContent.replace(
  '  size,\n  showLabel = true,\n}: FavoriteButtonProps) {',
  '  size,\n  showLabel = true,\n  itemType,\n  itemId,\n}: FavoriteButtonProps) {\n  const effectiveEntityType = (entityType || itemType || "product") as "classified" | "post" | "event" | "product" | "service";\n  const effectiveEntityId = entityId || itemId || "";'
);
favContent = favContent.replace(
  'const backendEntityType = entityType === "service" ? "product" : entityType;',
  'const backendEntityType = effectiveEntityType === "service" ? "product" : effectiveEntityType;'
);
favContent = favContent.replace(
  'queryKey: ["is-favorited", backendEntityType, entityId],',
  'queryKey: ["is-favorited", backendEntityType, effectiveEntityId],'
);
favContent = favContent.replace(
  'entityId,',
  'entityId: effectiveEntityId,'
);
favContent = favContent.replace(
  'entityId,',
  'entityId: effectiveEntityId,'
);
fs.writeFileSync('src/components/common/favorite-button.tsx', favContent, 'utf8');
console.log('patched favorite-button.tsx');

// 3. Patch MapLibreCanvasProps in src/components/mobility/maplibre-canvas.tsx
let mapContent = fs.readFileSync('src/components/mobility/maplibre-canvas.tsx', 'utf8');
mapContent = mapContent.replace(
  '  center?: { lat: number; lng: number };\n  zoom?: number;',
  '  center?: { lat: number; lng: number };\n  zoom?: number;\n  initialCenter?: any;\n  initialZoom?: number;'
);
mapContent = mapContent.replace(
  '  center = DEFAULT_CENTER,\n  zoom = 13.5,',
  '  center = DEFAULT_CENTER,\n  zoom = 13.5,\n  initialCenter,\n  initialZoom,'
);
mapContent = mapContent.replace(
  '  const mapContainer = useRef<HTMLDivElement>(null);',
  '  const effectiveCenter = initialCenter ? (Array.isArray(initialCenter) ? { lat: initialCenter[1], lng: initialCenter[0] } : initialCenter) : center;\n  const effectiveZoom = initialZoom ?? zoom;\n  const mapContainer = useRef<HTMLDivElement>(null);'
);
mapContent = mapContent.replace(
  'center: [center.lng, center.lat],',
  'center: [effectiveCenter.lng, effectiveCenter.lat],'
);
mapContent = mapContent.replace(
  'zoom,',
  'zoom: effectiveZoom,'
);
fs.writeFileSync('src/components/mobility/maplibre-canvas.tsx', mapContent, 'utf8');
console.log('patched maplibre-canvas.tsx');

// 4. Patch PriceDisplay in src/components/commerce/price-display.tsx
let priceContent = fs.readFileSync('src/components/commerce/price-display.tsx', 'utf8');
priceContent = priceContent.replace(
  'export function PriceDisplay({\n  amountCents,',
  'export function PriceDisplay({\n  amountCents = 0,\n  priceCents,'
);
priceContent = priceContent.replace(
  '  amountCents: number;\n  compareAtCents?: number | null;',
  '  amountCents?: number;\n  priceCents?: number;\n  compareAtCents?: number | null;'
);
priceContent = priceContent.replace(
  '  const hasCompare = typeof compareAtCents === "number" && compareAtCents > amountCents;',
  '  const effectiveAmount = priceCents !== undefined ? priceCents : amountCents;\n  const hasCompare = typeof compareAtCents === "number" && compareAtCents > effectiveAmount;'
);
priceContent = priceContent.replace(
  'formatMoney(amountCents, currency)',
  'formatMoney(effectiveAmount, currency)'
);
fs.writeFileSync('src/components/commerce/price-display.tsx', priceContent, 'utf8');
console.log('patched price-display.tsx');
