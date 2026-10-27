/**
 * ============================================================================
 * Waesy Platform — drawer-store.ts (Zero-Tear Global Drawer State)
 * ============================================================================
 * Gerencia o estado de abertura dos drawers globais do SuperApp:
 * 1. SuperAppModuleDrawer (catálogo de módulos/hotpages acionado pelo Top-Left Hamburger)
 * 2. AccountSwitcherDrawer (alternador de contas e perfis acionado pela aba Conta)
 * Baseado no padrão React 19 useSyncExternalStore para zero re-render desnecessário.
 * ============================================================================
 */

import { useSyncExternalStore } from "react";

interface DrawerStoreState {
  superAppOpen: boolean;
  accountSwitcherOpen: boolean;
}

let state: DrawerStoreState = {
  superAppOpen: false,
  accountSwitcherOpen: false,
};

const listeners = new Set<() => void>();

function notify() {
  for (const listener of listeners) {
    listener();
  }
}

export const drawerStore = {
  getState: () => state,
  subscribe: (listener: () => void) => {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  },
  openSuperApp: () => {
    state = { ...state, superAppOpen: true };
    notify();
  },
  closeSuperApp: () => {
    state = { ...state, superAppOpen: false };
    notify();
  },
  toggleSuperApp: () => {
    state = { ...state, superAppOpen: !state.superAppOpen };
    notify();
  },
  setSuperAppOpen: (open: boolean) => {
    if (state.superAppOpen !== open) {
      state = { ...state, superAppOpen: open };
      notify();
    }
  },
  openAccountSwitcher: () => {
    state = { ...state, accountSwitcherOpen: true };
    notify();
  },
  closeAccountSwitcher: () => {
    state = { ...state, accountSwitcherOpen: false };
    notify();
  },
  toggleAccountSwitcher: () => {
    state = { ...state, accountSwitcherOpen: !state.accountSwitcherOpen };
    notify();
  },
  setAccountSwitcherOpen: (open: boolean) => {
    if (state.accountSwitcherOpen !== open) {
      state = { ...state, accountSwitcherOpen: open };
      notify();
    }
  },
};

export function useSuperAppDrawer() {
  const isOpen = useSyncExternalStore(
    drawerStore.subscribe,
    () => drawerStore.getState().superAppOpen,
    () => drawerStore.getState().superAppOpen
  );

  return {
    isOpen,
    open: drawerStore.openSuperApp,
    close: drawerStore.closeSuperApp,
    toggle: drawerStore.toggleSuperApp,
    setOpen: drawerStore.setSuperAppOpen,
  };
}

export function useAccountSwitcherDrawer() {
  const isOpen = useSyncExternalStore(
    drawerStore.subscribe,
    () => drawerStore.getState().accountSwitcherOpen,
    () => drawerStore.getState().accountSwitcherOpen
  );

  return {
    isOpen,
    open: drawerStore.openAccountSwitcher,
    close: drawerStore.closeAccountSwitcher,
    toggle: drawerStore.toggleAccountSwitcher,
    setOpen: drawerStore.setAccountSwitcherOpen,
  };
}
