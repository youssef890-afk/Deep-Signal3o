import type { ThemeName } from '@/context/ThemeContext';

/**
 * Theme catalogue. It lives outside `ThemeContext` so the context module only
 * exports components and its consumer hook, which keeps Fast Refresh working.
 */
export const THEMES: { id: ThemeName; name: string; nameAr: string; colors: string[] }[] = [
  { id: 'obsidian', name: 'Obsidian', nameAr: 'أوبسيديان', colors: ['#8B5CF6', '#06B6D4', '#090D16'] },
  { id: 'crimson', name: 'Crimson', nameAr: 'قرمزي', colors: ['#F43F5E', '#F59E0B', '#0F0208'] },
  { id: 'golden', name: 'Golden', nameAr: 'ذهبي', colors: ['#FBBF24', '#F59E0B', '#0A0805'] },
  { id: 'royal', name: 'Royal', nameAr: 'ملكي', colors: ['#A855F7', '#FBBF24', '#0A0E1A'] },
];