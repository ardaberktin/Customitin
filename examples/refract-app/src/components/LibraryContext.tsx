import { createContext, useContext, useState, type ReactNode } from 'react';
import type { MediaItem } from '../data/library';
const Context = createContext<{
  selected: MediaItem | null;
  setSelected: (item: MediaItem | null) => void;
} | null>(null);
/** Original card-details state only; no collection filter, sort or density state. */
export function LibraryProvider({ children }: { children: ReactNode }) {
  const [selected, setSelected] = useState<MediaItem | null>(null);
  return (
    <Context.Provider value={{ selected, setSelected }}>
      {children}
    </Context.Provider>
  );
}
export function useLibrary() {
  const value = useContext(Context);
  if (!value) throw new Error('LibraryProvider is required');
  return value;
}
