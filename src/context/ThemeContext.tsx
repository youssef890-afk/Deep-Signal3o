import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';

export type ThemeName = 'obsidian' | 'crimson' | 'golden' | 'royal';
export type ThemeMode = 'light' | 'dark' | 'auto';
export type ThemeSelection = ThemeName | ThemeMode;

interface ThemeContextValue {
  theme: ThemeSelection;
  mode: ThemeMode;
  palette: ThemeName;
  accentColor: string;
  setTheme: (theme: ThemeSelection) => void;
  setMode: (mode: ThemeMode) => void;
  setAccentColor: (color: string) => void;
}

const ThemeContext = createContext<ThemeContextValue>({
  theme: 'obsidian',
  mode: 'dark',
  palette: 'obsidian',
  accentColor: '#FB7185',
  setTheme: () => undefined,
  setMode: () => undefined,
  setAccentColor: () => undefined,
});

const themeNames: ThemeName[] = ['obsidian', 'crimson', 'golden', 'royal'];
const themeModes: ThemeMode[] = ['light', 'dark', 'auto'];

function isThemeName(value: string | null): value is ThemeName {
  return value !== null && themeNames.includes(value as ThemeName);
}

function isThemeMode(value: string | null): value is ThemeMode {
  return value !== null && themeModes.includes(value as ThemeMode);
}

function withAlpha(hex: string, alpha: number): string {
  const normalized = hex.replace('#', '');
  const red = Number.parseInt(normalized.slice(0, 2), 16);
  const green = Number.parseInt(normalized.slice(2, 4), 16);
  const blue = Number.parseInt(normalized.slice(4, 6), 16);
  return `rgba(${red}, ${green}, ${blue}, ${alpha})`;
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [palette, setPaletteState] = useState<ThemeName>(() => {
    const saved = localStorage.getItem('ds-theme');
    return isThemeName(saved) ? saved : 'obsidian';
  });
  const [mode, setModeState] = useState<ThemeMode>(() => {
    const saved = localStorage.getItem('ds-theme-mode');
    return isThemeMode(saved) ? saved : 'dark';
  });
  const [theme, setThemeState] = useState<ThemeSelection>(() => {
    const savedMode = localStorage.getItem('ds-theme-mode');
    if (isThemeMode(savedMode)) return savedMode;
    const savedPalette = localStorage.getItem('ds-theme');
    return isThemeName(savedPalette) ? savedPalette : 'obsidian';
  });
  const [accentColor, setAccentColorState] = useState(() => {
    const saved = localStorage.getItem('ds-accent-color');
    return saved && /^#[0-9a-fA-F]{6}$/.test(saved) ? saved : '#FB7185';
  });

  useEffect(() => {
    const root = document.documentElement;
    root.setAttribute('data-theme', palette);
    root.setAttribute('data-color-mode', mode);
    root.style.colorScheme = mode === 'auto' ? 'light dark' : mode;
    root.style.setProperty('--accent', accentColor);
    root.style.setProperty('--accent-soft', withAlpha(accentColor, 0.15));
    root.style.setProperty('--accent-glow', withAlpha(accentColor, 0.55));
    root.style.setProperty('--accent-gradient', `linear-gradient(135deg, ${accentColor}, ${accentColor})`);
    localStorage.setItem('ds-theme', palette);
    localStorage.setItem('ds-theme-mode', mode);
    localStorage.setItem('ds-accent-color', accentColor);
  }, [accentColor, mode, palette]);

  const setTheme = (selection: ThemeSelection) => {
    setThemeState(selection);
    if (themeModes.includes(selection as ThemeMode)) {
      setModeState(selection as ThemeMode);
    } else {
      setPaletteState(selection as ThemeName);
    }
  };

  const setMode = (nextMode: ThemeMode) => {
    setModeState(nextMode);
    setThemeState(nextMode);
  };

  const setAccentColor = (color: string) => {
    if (/^#[0-9a-fA-F]{6}$/.test(color)) setAccentColorState(color);
  };

  return (
    <ThemeContext.Provider value={{ theme, mode, palette, accentColor, setTheme, setMode, setAccentColor }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
