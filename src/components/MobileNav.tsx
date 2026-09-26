import { useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/context/AuthContext';
import { useMessages } from '@/context/MessagesContext';
import { DSHome, DSChat, DSProfile, DSSearch, DSRooms } from '@/components/icons/BrandIcons';

export default function MobileNav() {
  const { profile } = useAuth();
  const { unreadCount } = useMessages();
  const navigate = useNavigate();
  const location = useLocation();

  const items = [
    { path: '/feed', Icon: DSHome, label: 'Feed', badge: 0 },
    { path: '/search', Icon: DSSearch, label: 'Search', badge: 0 },
    { path: '/chat', Icon: DSChat, label: 'Messages', badge: unreadCount },
    { path: '/rooms', Icon: DSRooms, label: 'Rooms', badge: 0 },
    ...(profile ? [{ path: `/profile/${profile.id}`, Icon: DSProfile, label: 'Profile', badge: 0 }] : []),
  ];

  const isItemActive = (path: string) =>
    location.pathname === path ||
    (path === '/chat' && location.pathname.startsWith('/chat')) ||
    (path.startsWith('/profile') && location.pathname.startsWith('/profile'));

  return (
    <>
      <nav className="fixed bottom-0 left-0 right-0 h-[72px] glass-strong border-t border-white/[0.08] flex items-center justify-around z-40 md:hidden">
        {items.map((item) => {
          const isActive = isItemActive(item.path);
          const Icon = item.Icon;
          return (
            <motion.button
              key={item.path}
              onClick={() => navigate(item.path)}
              whileTap={{ scale: 0.85 }}
              transition={{ type: 'spring', stiffness: 400, damping: 17 }}
              className="relative flex flex-col items-center gap-1 px-3 py-2 flex-1"
            >
              <AnimatePresence>
                {isActive && (
                  <motion.span
                    layoutId="bottom-nav-indicator"
                    className="absolute top-0 left-1/2 -translate-x-1/2 w-10 h-[3px] rounded-full gradient-primary"
                    style={{ boxShadow: '0 0 20px rgba(139,92,246,0.9), 0 0 40px rgba(6,182,212,0.5)' }}
                    initial={{ opacity: 0, scaleX: 0 }}
                    animate={{ opacity: 1, scaleX: 1 }}
                    exit={{ opacity: 0, scaleX: 0 }}
                    transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                  />
                )}
              </AnimatePresence>

              <motion.div
                animate={isActive ? { y: -2, scale: 1.1 } : { y: 0, scale: 1 }}
                transition={{ type: 'spring', stiffness: 400, damping: 20 }}
                className="relative"
              >
                <Icon
                  className={`w-6 h-6 transition-colors duration-200 ${
                    isActive
                      ? 'text-white drop-shadow-[0_0_10px_rgba(139,92,246,0.9)]'
                      : 'text-white/40'
                  }`}
                />
                <AnimatePresence>
                  {item.badge > 0 && (
                    <motion.span
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      exit={{ scale: 0 }}
                      transition={{ type: 'spring', stiffness: 500, damping: 15 }}
                      className="absolute -top-1.5 -right-2 min-w-[18px] h-[18px] px-1 rounded-full bg-rose-500 text-white text-[10px] font-bold flex items-center justify-center"
                      style={{ boxShadow: '0 0 12px rgba(244,63,94,0.8)' }}
                    >
                      {item.badge > 99 ? '99+' : item.badge}
                    </motion.span>
                  )}
                </AnimatePresence>
              </motion.div>

              <span className={`text-[10px] font-medium transition-colors duration-200 ${
                isActive ? 'text-white' : 'text-white/40'
              }`}>
                {item.label}
              </span>
            </motion.button>
          );
        })}
      </nav>

      <nav className="hidden md:flex fixed bottom-6 left-1/2 -translate-x-1/2 z-40 items-center gap-1 px-2 py-2 rounded-full glass-strong border border-white/10">
        {items.map((item) => {
          const isActive = isItemActive(item.path);
          const Icon = item.Icon;
          return (
            <motion.button
              key={item.path}
              onClick={() => navigate(item.path)}
              whileTap={{ scale: 0.9 }}
              whileHover={{ scale: 1.05 }}
              className={`relative flex flex-col items-center gap-0.5 px-5 py-2 rounded-full transition-colors ${
                isActive ? 'bg-white/10' : 'hover:bg-white/5'
              }`}
            >
              <div className="relative">
                <Icon className={`w-6 h-6 transition-all duration-300 ${
                  isActive ? 'text-white scale-110' : 'text-white/50'
                }`} />
                {item.badge > 0 && (
                  <motion.span
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="absolute -top-1.5 -right-2 min-w-[18px] h-[18px] px-1 rounded-full bg-rose-500 text-white text-[10px] font-bold flex items-center justify-center"
                  >
                    {item.badge > 99 ? '99+' : item.badge}
                  </motion.span>
                )}
              </div>
              <span className={`text-[10px] font-medium ${isActive ? 'text-white' : 'text-white/50'}`}>
                {item.label}
              </span>
            </motion.button>
          );
        })}
      </nav>
    </>
  );
}
