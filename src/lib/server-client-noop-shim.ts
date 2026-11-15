/**
 * server-client-noop-shim.ts
 *
 * Shim SSR leve para widgets interativos exclusivos de navegador (croppers,
 * confetes, tabelas completas de DDD/E.164 e editor visual drag-and-drop),
 * preservando hidratação limpa e mantendo o Cloudflare Worker abaixo de 25 MiB.
 */

const NoopComponent = () => null;

export default NoopComponent;
export const OmniEditor = NoopComponent;
export const WaesyBuilder = NoopComponent;
export const TravelPromoFlyerModal = NoopComponent;
export const ManusComputerDrawer = NoopComponent;
export const SimLabQuickTestSheet = NoopComponent;
export const UniversalCrmSpreadsheetImporterModal = NoopComponent;
export const CarouselStudioEditor = NoopComponent;
export const ArtifactBuilderEditor = NoopComponent;
export const ArtifactInteractiveMap = NoopComponent;
export const LeadFlightGridSheet = NoopComponent;
export const OperatorVoucherImportSheet = NoopComponent;
export const NewTravelContractSheet = NoopComponent;
export const NewGroupTourWizard = NoopComponent;
export const ProductCatalogPricingSheet = NoopComponent;

export function parsePhoneNumber(value?: string) {
  const raw = typeof value === "string" ? value : "";
  return {
    country: "BR",
    isValid: () => false,
    formatNational: () => raw,
    formatInternational: () => raw,
    format: () => raw,
  };
}

export class AsYouType {
  input(raw: string) {
    return raw;
  }
  getNumber() {
    return undefined;
  }
}
