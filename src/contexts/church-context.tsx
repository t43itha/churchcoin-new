"use client";

import { createContext, useContext, useState, useEffect, type ReactNode } from "react";
import { useQuery } from "convex/react";
import { api } from "@/lib/convexGenerated";
import type { Id } from "@/lib/convexGenerated";

type ChurchContextType = {
  churchId: Id<"churches"> | null;
  setChurchId: (id: Id<"churches"> | null) => void;
  churches: Array<{ _id: Id<"churches">; name: string }> | undefined;
};

const ChurchContext = createContext<ChurchContextType | null>(null);

export function ChurchProvider({ children }: { children: ReactNode }) {
  const churches = useQuery(api.churches.listChurches, {});
  const [churchId, setChurchId] = useState<Id<"churches"> | null>(null);

  useEffect(() => {
    if (!churchId && churches && churches.length > 0) {
      setChurchId(churches[0]._id);
    }
  }, [churches, churchId]);

  return (
    <ChurchContext.Provider value={{ churchId, setChurchId, churches }}>
      {children}
    </ChurchContext.Provider>
  );
}

export function useChurch() {
  const context = useContext(ChurchContext);
  if (!context) {
    throw new Error("useChurch must be used within ChurchProvider");
  }
  return context;
}
