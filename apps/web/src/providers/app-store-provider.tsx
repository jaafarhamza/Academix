"use client";

import {
  createContext,
  useContext,
  useState,
  type ReactNode,
} from "react";
import { useStore } from "zustand";

import { createAppStore, type AppStore, type AppStoreApi } from "@/stores";

const AppStoreContext = createContext<AppStoreApi | null>(null);

type AppStoreProviderProps = {
  children: ReactNode;
};

export function AppStoreProvider({ children }: AppStoreProviderProps) {
  const [store] = useState(createAppStore);

  return (
    <AppStoreContext.Provider value={store}>
      {children}
    </AppStoreContext.Provider>
  );
}

export function useAppStore<T>(selector: (state: AppStore) => T) {
  const store = useContext(AppStoreContext);

  if (!store) {
    throw new Error("useAppStore must be used within AppStoreProvider");
  }

  return useStore(store, selector);
}
