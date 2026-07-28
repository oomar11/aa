"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import {
  loadUnit,
  saveUnit,
  type LengthUnit,
} from "@/lib/units";

type UnitContextValue = {
  unit: LengthUnit;
  setUnit: (unit: LengthUnit) => void;
};

const UnitContext = createContext<UnitContextValue | null>(null);

export function UnitProvider({ children }: { children: React.ReactNode }) {
  const [unit, setUnitState] = useState<LengthUnit>("mm");

  useEffect(() => {
    setUnitState(loadUnit());
  }, []);

  const setUnit = useCallback((next: LengthUnit) => {
    setUnitState(next);
    saveUnit(next);
  }, []);

  return (
    <UnitContext.Provider value={{ unit, setUnit }}>
      {children}
    </UnitContext.Provider>
  );
}

export function useUnit() {
  const ctx = useContext(UnitContext);
  if (!ctx) {
    throw new Error("useUnit must be used within UnitProvider");
  }
  return ctx;
}
