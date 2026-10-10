import { useEffect, useState } from 'react';

export function useMedia(query: string): boolean {
  const [on, setOn] = useState(() => typeof window !== 'undefined' && window.matchMedia(query).matches);
  useEffect(() => {
    const m = window.matchMedia(query);
    const fn = () => setOn(m.matches);
    fn();
    m.addEventListener('change', fn);
    return () => m.removeEventListener('change', fn);
  }, [query]);
  return on;
}

/** Desktop layout (sidebar, tables) from 900px. */
export const useWide = () => useMedia('(min-width: 900px)');
