import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { en } from './en';
import type { Key } from './en';
import { pl } from './pl';
import { ro } from './ro';
import { uk } from './uk';

export type Lang = 'en' | 'uk' | 'pl' | 'ro';
export const LANGS: { code: Lang; native: string; english: string }[] = [
  { code: 'en', native: 'English', english: 'English' },
  { code: 'uk', native: 'Українська', english: 'Ukrainian' },
  { code: 'pl', native: 'Polski', english: 'Polish' },
  { code: 'ro', native: 'Română', english: 'Romanian' },
];
const DICTS: Record<Lang, Partial<Record<Key, string>>> = { en, uk, pl, ro };

type Vars = Record<string, string | number>;
type I18n = { lang: Lang; setLang(l: Lang): void; t(key: Key, vars?: Vars): string };

const Ctx = createContext<I18n | null>(null);
const STORE = 'otrace-lang';

export function I18nProvider({ children }: { children: ReactNode }) {
  // The language switcher was removed: the app is English only. Translations stay in i18n/ for later.
  const [lang, setLangState] = useState<Lang>('en');
  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);
  const setLang = useCallback((l: Lang) => {
    setLangState(l);
    try {
      localStorage.setItem(STORE, l);
    } catch {
      /* ignore */
    }
  }, []);
  const t = useCallback(
    (key: Key, vars?: Vars) => {
      let s: string = DICTS[lang][key] ?? en[key] ?? key;
      if (vars) for (const [k, v] of Object.entries(vars)) s = s.split(`{${k}}`).join(String(v));
      return s;
    },
    [lang],
  );
  const value = useMemo(() => ({ lang, setLang, t }), [lang, setLang, t]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useT() {
  const c = useContext(Ctx);
  if (!c) throw new Error('useT outside I18nProvider');
  return c;
}
export type { Key };
