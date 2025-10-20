// src/contexts/LogosQueueContext.tsx
import React, { createContext, useContext, useRef } from "react";

type Ctx = {
  /** שומר קובץ מקורי בזיכרון לפי מזהה (לא נמחק בקריאה) */
  setOriginalInMemory: (id: string, file: File) => void;
  /** מחזיר את הקובץ לפי מזהה, אם קיים */
  takeOriginalFromMemory: (id: string) => File | undefined;
};

const LogosQueueCtx = createContext<Ctx | null>(null);

export function LogosQueueProvider({ children }: { children: React.ReactNode }) {
  const mapRef = useRef<Map<string, File>>(new Map());

  const setOriginalInMemory = (id: string, file: File) => {
    mapRef.current.set(id, file);
  };

  const takeOriginalFromMemory = (id: string) => {
    return mapRef.current.get(id);
  };

  return (
    <LogosQueueCtx.Provider value={{ setOriginalInMemory, takeOriginalFromMemory }}>
      {children}
    </LogosQueueCtx.Provider>
  );
}

export function useLogosQueue() {
  const ctx = useContext(LogosQueueCtx);
  if (!ctx) throw new Error("useLogosQueue must be used inside LogosQueueProvider");
  return ctx;
}
