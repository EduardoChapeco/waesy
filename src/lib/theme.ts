/**
 * ============================================================================
 * Canonical Persistent Theme System (Waesy Platform)
 * ============================================================================
 *
 * Arquitetura de Tema Reativa e Persistente:
 * 1. Singleton External Store com useSyncExternalStore: Zero descompasso de estado entre componentes e rotas.
 * 2. Sincronização Cross-Tab via storage event.
 * 3. Anti-FOUC Instantâneo: Injeção síncrona no <head> com matching de preferência de sistema.
 * 4. Persistência pétrea em localStorage sob a chave "waesy-theme".
 * ============================================================================
 */

import { useSyncExternalStore, useCallback, useEffect } from "react";

export type ThemeMode = "system" | "light" | "dark";

const STORAGE_KEY = "waesy-theme";
const THEME_CHANGE_EVENT = "waesy-theme-change";

// ── Funções de Manipulação do DOM ──
function getSystemPreference(): "light" | "dark" {
 if (typeof window === "undefined") return "light";
 return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

export function resolveEffectiveTheme(mode: ThemeMode): "light" | "dark" {
 if (mode === "dark") return "dark";
 if (mode === "light") return "light";
 return getSystemPreference();
}

export function applyThemeToDOM(mode: ThemeMode) {
 if (typeof document === "undefined") return;
 const html = document.documentElement;
 const effective = resolveEffectiveTheme(mode);

 html.classList.remove("light", "dark");
 html.classList.add(effective);
 html.setAttribute("data-theme", effective);
 html.style.colorScheme = effective;
}

// ── Singleton Store ──
let currentTheme: ThemeMode = "system";

function getStoredTheme(): ThemeMode {
 if (typeof localStorage === "undefined") return "system";
 try {
 const stored = localStorage.getItem(STORAGE_KEY) || localStorage.getItem("waesy-theme");
 if (stored === "light" || stored === "dark" || stored === "system") {
 return stored;
 }
 } catch (e) {
    console.warn("[theme] Falha ao ler tema do localStorage:", e);
  }
 return "system";
}

// Inicialização imediata em ambiente browser
if (typeof window !== "undefined") {
 currentTheme = getStoredTheme();
 applyThemeToDOM(currentTheme);

 // Listener para mudança de prefers-color-scheme no SO quando em modo "system"
 const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
 mediaQuery.addEventListener("change", () => {
 if (getStoredTheme() === "system") {
 applyThemeToDOM("system");
 window.dispatchEvent(new CustomEvent(THEME_CHANGE_EVENT));
 }
 });

 // Listener para sincronização entre abas
 window.addEventListener("storage", (e) => {
 if (e.key === STORAGE_KEY) {
 const val = (e.newValue as ThemeMode) || "system";
 currentTheme = val;
 applyThemeToDOM(val);
 window.dispatchEvent(new CustomEvent(THEME_CHANGE_EVENT));
 }
 });
}

function subscribe(callback: () => void) {
 if (typeof window === "undefined") return () => {};
 window.addEventListener(THEME_CHANGE_EVENT, callback);
 return () => {
 window.removeEventListener(THEME_CHANGE_EVENT, callback);
 };
}

function getSnapshot(): ThemeMode {
 return typeof window !== "undefined" ? getStoredTheme() : "system";
}

function getServerSnapshot(): ThemeMode {
 return "system";
}

// ── Hook Canônico ──
export function useTheme() {
 const theme = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
 const resolvedTheme = resolveEffectiveTheme(theme);

 // Garante que o DOM está sempre sincronizado sem race conditions
 useEffect(() => {
 applyThemeToDOM(theme);
 }, [theme]);

 const setTheme = useCallback((newTheme: ThemeMode) => {
 try {
 localStorage.setItem(STORAGE_KEY, newTheme);
 currentTheme = newTheme;
 applyThemeToDOM(newTheme);
 window.dispatchEvent(new CustomEvent(THEME_CHANGE_EVENT));
 } catch (e) {
 console.error("[useTheme] Falha ao persistir tema no localStorage:", e);
 }
 }, []);

 return { theme, resolvedTheme, setTheme };
}

/**
 * Script inline injetado no topo do <head> do documento para prevenir flash de cor (FOUC).
 * Executa antes de qualquer renderização visual do HTML.
 */
export const themeInitScript = `
(function() {
 try {
 var stored = localStorage.getItem('${STORAGE_KEY}') || localStorage.getItem('waesy-theme');
 var isDark = stored === 'dark' || ((!stored || stored === 'system') && window.matchMedia('(prefers-color-scheme: dark)').matches);
 var html = document.documentElement;
 html.classList.remove('light', 'dark');
 if (isDark) {
 html.classList.add('dark');
 html.setAttribute('data-theme', 'dark');
 html.style.colorScheme = 'dark';
 } else {
 html.classList.add('light');
 html.setAttribute('data-theme', 'light');
 html.style.colorScheme = 'light';
 }
 } catch(e) {}
})();
`.trim();
