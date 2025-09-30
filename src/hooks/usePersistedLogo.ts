// src/hooks/usePersistedLogo.ts
import { useCallback, useMemo } from "react";
import { useLogosQueue } from "../contexts/LogosQueueContext";
import { persistLogoTemp, getPendingDataUrlById, clearLogo, LS_LOGO_ID } from "../lib/persistLogo";

export function usePersistedLogo(side: "front"|"back") {
  const { setOriginalInMemory, takeOriginalFromMemory } = useLogosQueue();

  const currentId = useMemo(() => {
    try { return localStorage.getItem(LS_LOGO_ID(side)); } catch { return null; }
  }, [side]);

  const dataUrl = useMemo(() => getPendingDataUrlById(currentId), [currentId]);
  const file = useMemo(() => (currentId ? takeOriginalFromMemory(currentId) : undefined), [currentId, takeOriginalFromMemory]);

  const setFile = useCallback(async (file: File) => {
    const id = `${side}-${Date.now()}-${Math.random().toString(36).slice(2,8)}`;
    setOriginalInMemory(id, file);
    await persistLogoTemp(side, id, file);
  }, [setOriginalInMemory, side]);

  const reset = useCallback(() => {
    clearLogo(side, currentId);
  }, [side, currentId]);

  return { id: currentId, file, dataUrl, setFile, reset };
}
