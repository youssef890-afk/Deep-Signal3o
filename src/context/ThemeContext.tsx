import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';

export type ThemeName = 'obsidian' | 'crimson' | 'golden' | 'royal';

interface ThemeContextValue {
  theme: ThemeName;
  setTheme: (t: ThemeName) => void;
}

const ThemeContext = createContext<ThemeContextValue>({
  theme: 'obsidian',
  setTheme: () => {},
});

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<ThemeName>(() => {
    const saved = localStorage.getItem('ds-theme') as ThemeName;
    return saved || 'obsidian';
  });

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('ds-theme', theme);
  }, [theme]);

  const setTheme = (t: ThemeName) => setThemeState(t);

  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}

export const THEMES: { id: ThemeName; name: string; nameAr: string; colors: string[] }[] = [
  { id: 'obsidian', name: 'Obsidian', nameAr: 'أوبسيديان', colors: ['#8B5CF6', '#06B6D4', '#090D16'] },
  { id: 'crimson', name: 'Crimson', nameAr: 'قرمزي', colors: ['#F43F5E', '#F59E0B', '#0F0208'] },
  { id: 'golden', name: 'Golden', nameAr: 'ذهبي', colors: ['#FBBF24', '#F59E0B', '#0A0805'] },
  { id: 'royal', name: 'Royal', nameAr: 'ملكي', colors: ['#A855F7', '#FBBF24', '#0A0E1A'] },
];
