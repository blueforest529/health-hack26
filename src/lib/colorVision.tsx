import { createContext, useContext, useEffect, useState } from 'react';
import type { ReactNode } from 'react';

/** Colour-vision simulation modes. Matrices: Machado, Oliveira & Fernandes (2009), severity 1.0, linear RGB. */
export type Vision = 'normal' | 'deuteranopia' | 'protanopia' | 'tritanopia' | 'achromatopsia';

export const VISIONS: { id: Vision; label: string; hint: string }[] = [
  { id: 'normal', label: 'Normal', hint: 'Typical colour vision' },
  { id: 'deuteranopia', label: 'Deuteranopia', hint: 'Green-blind, about 5% of men' },
  { id: 'protanopia', label: 'Protanopia', hint: 'Red-blind, about 1% of men' },
  { id: 'tritanopia', label: 'Tritanopia', hint: 'Blue-blind, rare' },
  { id: 'achromatopsia', label: 'Greyscale', hint: 'No colour, or a black-and-white print' },
];

const MATRIX: Record<Exclude<Vision, 'normal'>, number[]> = {
  protanopia: [0.152286, 1.052583, -0.204868, 0.114503, 0.786281, 0.099216, -0.003882, -0.048116, 1.051998],
  deuteranopia: [0.367322, 0.860646, -0.227968, 0.280085, 0.672501, 0.047413, -0.01182, 0.04294, 0.968881],
  tritanopia: [1.255528, -0.076749, -0.178779, -0.078411, 0.930809, 0.147602, 0.004733, 0.691367, 0.3039],
  achromatopsia: [0.2126, 0.7152, 0.0722, 0.2126, 0.7152, 0.0722, 0.2126, 0.7152, 0.0722],
};

const toValues = (m: number[]) => `${m.slice(0, 3).join(' ')} 0 0 ${m.slice(3, 6).join(' ')} 0 0 ${m.slice(6, 9).join(' ')} 0 0 0 0 0 1 0`;

/** CSS filter value for a mode (needs <VisionFilters/> mounted once). */
export const visionFilter = (v: Vision) => (v === 'normal' ? 'none' : `url(#cv-${v})`);

/** Hidden SVG with one feColorMatrix per mode. */
export function VisionFilters() {
  return (
    <svg aria-hidden width="0" height="0" style={{ position: 'absolute' }}>
      {(Object.keys(MATRIX) as (keyof typeof MATRIX)[]).map((k) => (
        <filter id={`cv-${k}`} key={k}>
          <feColorMatrix type="matrix" values={toValues(MATRIX[k])} />
        </filter>
      ))}
    </svg>
  );
}

const KEY = 'otrace-library-vision';
const Ctx = createContext<{ vision: Vision; setVision: (v: Vision) => void }>({ vision: 'normal', setVision: () => {} });

function load(): Vision {
  try {
    const v = localStorage.getItem(KEY) as Vision | null;
    return v && VISIONS.some((x) => x.id === v) ? v : 'normal';
  } catch {
    return 'normal';
  }
}

/** Applies the chosen simulation to the whole app (filter on <html>, so fixed bars keep working). */
export function VisionProvider({ children }: { children: ReactNode }) {
  const [vision, setVision] = useState<Vision>(load);
  useEffect(() => {
    document.documentElement.style.filter = visionFilter(vision);
    try {
      localStorage.setItem(KEY, vision);
    } catch {
      /* storage unavailable */
    }
  }, [vision]);
  return (
    <Ctx.Provider value={{ vision, setVision }}>
      <VisionFilters />
      {children}
    </Ctx.Provider>
  );
}

export const useVision = () => useContext(Ctx);
