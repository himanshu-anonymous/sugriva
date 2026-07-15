import React, { createContext, useContext } from "react";
import { useSugrivaEngine } from "./mockEngine";
import type { SugrivaEngineType } from "./mockEngine";

const StoreContext = createContext<SugrivaEngineType | null>(null);

export const StoreProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const store = useSugrivaEngine();
  return (
    <StoreContext.Provider value={store}>
      {children}
    </StoreContext.Provider>
  );
};

export const useStore = () => {
  const context = useContext(StoreContext);
  if (!context) {
    throw new Error("useStore must be used within a StoreProvider");
  }
  return context;
};
