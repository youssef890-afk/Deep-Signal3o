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
      <nav className="fixed bottom-0 left-0 right-0 h-[72px] z-40 md:hidden" style={{ background: 'var(--nav-bg)', backdropFilter: 'blur(24px)', borderTop: '1px solid var(--nav-border)' }}>
        <div className="h-full flex items-center justify-around">
          {items.map((item) => {
            const isActive = isItemActive(item.path);
            const Icon = item.Icon;
            return (
              <motion.button
                key={item.path}
                onClick={() => navigate(item.path)}
                whileTap={{ scale: 0.85 }}
                transition={{ type: 'spring', stiffness: 400, damping: 17 }}
                className="relative flex flex-col items-center gap-1 px-3 pt-3 pb-2 flex-1 h-full"
              >
                <AnimatePresence>
                  {isActive && (
                    <motion.span
                      layoutId="bottom-nav-indicator"
                      className="absolute top-0 left-1/2 -translate-x-1/2 h-[3px] rounded-b-full"
                      style={{ width: 36, background: 'var(--accent-gradient)', boxShadow: '0 0 20px var(--accent-glow)' }}
                      initial={{ opacity: 0, scaleX: 0 }}
                      animate={{ opacity: 1, scaleX: 1 }}
                      exit={{ opacity: 0, scaleX: 0 }}
                      transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                    />
                  )}
                </AnimatePresence>

                <motion.div
                  animate={isActive ? { y: -1, scale: 1.08 } : { y: 0, scale: 1 }}
                  transition={{ type: 'spring', stiffness: 400, damping: 20 }}
                  className="relative"
                >
                  <Icon
                    className="w-6 h-6 transition-colors duration-200"
                    style={isActive ? { color: 'var(--accent)', filter: 'drop-shadow(0 0 8px var(--accent-glow))' } : { color: 'rgba(255,255,255,0.4)' }}
                  />
                  <AnimatePresence>
                    {item.badge > 0 && (
                      <motion.span
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        exit={{ scale: 0 }}
                        transition={{ type: 'spring', stiffness: 500, damping: 15 }}
                        className="absolute -top-1.5 -right-2 min-w-[18px] h-[18px] px-1 rounded-full text-white text-[10px] font-bold flex items-center justify-center"
                        style={{ background: 'var(--badge-bg)', boxShadow: '0 0 12px var(--badge-glow)' }}
                      >
                        {item.badge > 99 ? '99+' : item.badge}
                      </motion.span>
                    )}
                  </AnimatePresence>
                </motion.div>

                <span className="text-[10px] font-medium transition-colors duration-200" style={isActive ? { color: 'var(--accent)' } : { color: 'rgba(255,255,255,0.4)' }}>
                  {item.label}
                </span>
              </motion.button>
            );
          })}
        </div>
      </nav>

      <nav className="hidden md:flex fixed bottom-6 left-1/2 -translate-x-1/2 z-40 items-center gap-1 px-2 py-2 rounded-full" style={{ background: 'var(--nav-bg)', backdropFilter: 'blur(24px)', border: '1px solid var(--nav-border)' }}>
        {items.map((item) => {
          const isActive = isItemActive(item.path);
          const Icon = item.Icon;
          return (
            <motion.button
              key={item.path}
              onClick={() => navigate(item.path)}
              whileTap={{ scale: 0.9 }}
              whileHover={{ scale: 1.05 }}
              className="relative flex flex-col items-center gap-0.5 px-5 py-2 rounded-full transition-colors"
              style={isActive ? { background: 'var(--accent-soft)' } : {}}
            >
              <div className="relative">
                <Icon className="w-6 h-6 transition-all duration-300" style={isActive ? { color: 'var(--accent)' } : { color: 'rgba(255,255,255,0.5)' }} />
                {item.badge > 0 && (
                  <span className="absolute -top-1.5 -right-2 min-w-[18px] h-[18px] px-1 rounded-full text-white text-[10px] font-bold flex items-center justify-center" style={{ background: 'var(--badge-bg)' }}>
                    {item.badge > 99 ? '99+' : item.badge}
                  </span>
                )}
              </div>
              <span className="text-[10px] font-medium" style={isActive ? { color: 'var(--accent)' } : { color: 'rgba(255,255,255,0.5)' }}>
                {item.label}
              </span>
            </motion.button>
          );
        })}
      </nav>
    </>
  );
}
