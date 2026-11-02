/**
 * server-browser-only-shim.ts
 *
 * Shim server-side estritamente vazio para bibliotecas pesadas exclusivas do navegador
 * (jspdf, html2canvas, maplibre-gl, xlsx).
 *
 * Evita o vazamento dessas dependências clientes (10+ MB) para o Cloudflare Pages
 * Worker SSR, mantendo o tamanho descompactado do worker rigorosamente abaixo do
 * teto de 25 MiB da Cloudflare.
 */

export default {};
export const jsPDF = class {
  addPage() { return this; }
  addImage() { return this; }
  save() {}
  output() { return new Blob([]); }
};
export const utils = {
  book_new: () => ({}),
  book_append_sheet: () => {},
  json_to_sheet: () => ({}),
};
export const write = () => new Uint8Array();
export const read = () => ({ SheetNames: [], Sheets: {} });
export const Map = class {
  on() { return this; }
  remove() {}
};
