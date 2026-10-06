/**
 * Shim deliberadamente client-safe para imports legados de start-server-core.
 * Esses helpers só podem ser usados dentro de handlers server-side. O alias
 * client-only do Vite evita que o runtime h3/AsyncLocalStorage seja avaliado
 * durante a hidratação; SSR continua resolvendo o pacote oficial.
 */
function serverOnly(name: string): never {
  throw new Error(`[Waesy] ${name} só pode ser executado no runtime do servidor.`);
}

export function getRequest(): never { return serverOnly("getRequest"); }
export function getRequestHeader(): never { return serverOnly("getRequestHeader"); }
export function getCookie(): never { return serverOnly("getCookie"); }
export function getResponseHeaders(): never { return serverOnly("getResponseHeaders"); }
export function setResponseHeader(): never { return serverOnly("setResponseHeader"); }
export function setCookie(): never { return serverOnly("setCookie"); }
