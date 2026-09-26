import { motion } from 'framer-motion';
import { Check } from 'lucide-react';
import { THEMES, useTheme } from '@/context/ThemeContext';

export default function ThemeSelector() {
  const { theme, setTheme } = useTheme();

  return (
    <div className="grid grid-cols-2 gap-3">
      {THEMES.map((t) => {
        const isActive = theme === t.id;
        return (
          <motion.button
            key={t.id}
            onClick={() => setTheme(t.id)}
            whileTap={{ scale: 0.95 }}
            className={`relative rounded-2xl p-4 text-left transition-all ${
              isActive ? 'ring-2 ring-white/60' : 'ring-1 ring-white/10'
            }`}
            style={{ background: t.colors[2] }}
          >
            <div className="flex gap-1.5 mb-3">
              <div className="w-6 h-6 rounded-full" style={{ background: t.colors[0] }} />
              <div className="w-6 h-6 rounded-full" style={{ background: t.colors[1] }} />
            </div>
            <div className="text-white font-bold text-sm">{t.nameAr}</div>
            <div className="text-white/40 text-xs">{t.name}</div>
            {isActive && (
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="absolute top-3 right-3 w-6 h-6 rounded-full bg-white flex items-center justify-center"
              >
                <Check className="w-4 h-4 text-black" strokeWidth={3} />
              </motion.div>
            )}
          </motion.button>
        );
      })}
    </div>
  );
}
