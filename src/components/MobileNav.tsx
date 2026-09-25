import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { DSHome, DSChat, DSProfile, DSSearch, DSRooms } from '@/components/icons/BrandIcons';

export default function MobileNav() {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const items = [
    { path: '/feed', Icon: DSHome, label: 'Feed' },
    { path: '/search', Icon: DSSearch, label: 'Search' },
    { path: '/chat', Icon: DSChat, label: 'Messages' },
    { path: '/rooms', Icon: DSRooms, label: 'Rooms' },
    ...(profile ? [{ path: `/profile/${profile.id}`, Icon: DSProfile, label: 'Profile' }] : []),
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 h-[68px] glass-strong border-t border-white/5 flex items-center justify-around z-40 md:hidden pb-safe">
      {items.map((item) => {
        const isActive = location.pathname === item.path ||
          (item.path === '/chat' && location.pathname.startsWith('/chat')) ||
          (item.path.startsWith('/profile') && location.pathname.startsWith('/profile'));
        const Icon = item.Icon;
        return (
          <button
            key={item.path}
            onClick={() => navigate(item.path)}
            className="relative flex flex-col items-center gap-0.5 px-3 py-2 transition-all"
          >
            {isActive && (
              <span className="absolute -top-[1px] left-1/2 -translate-x-1/2 w-10 h-[2px] gradient-brand rounded-full shadow-glow-rose" />
            )}
            <Icon
              className={`w-6 h-6 transition-all duration-300 ${
                isActive ? 'text-white scale-110' : 'text-white/40'
              }`}
            />
            <span className={`text-[10px] font-medium transition-colors ${isActive ? 'text-white' : 'text-white/40'}`}>
              {item.label}
            </span>
          </button>
        );
      })}
    </nav>
  );
}
