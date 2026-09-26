import { useNavigate, useLocation } from 'react-router-dom';
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
      <nav className="fixed bottom-0 left-0 right-0 h-[68px] glass-strong border-t border-white/[0.06] flex items-center justify-around z-40 md:hidden">
        {items.map((item) => {
          const isActive = isItemActive(item.path);
          const Icon = item.Icon;
          return (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className="relative flex flex-col items-center gap-0.5 px-3 py-2 transition-all flex-1"
            >
              {isActive && (
                <span className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-[2px] gradient-brand rounded-full" />
              )}
              <div className="relative">
                <Icon
                  className={`w-6 h-6 transition-all duration-300 ${isActive ? 'text-white scale-110' : 'text-white/40'}`}
                />
                {item.badge > 0 && (
                  <span className="absolute -top-1.5 -right-2 min-w-[18px] h-[18px] px-1 rounded-full bg-rose-500 text-white text-[10px] font-bold flex items-center justify-center shadow-lg shadow-rose-500/50 animate-pulse">
                    {item.badge > 99 ? '99+' : item.badge}
                  </span>
                )}
              </div>
              <span className={`text-[10px] font-medium transition-colors ${isActive ? 'text-white' : 'text-white/40'}`}>
                {item.label}
              </span>
            </button>
          );
        })}
      </nav>

      <nav className="hidden md:flex fixed bottom-6 left-1/2 -translate-x-1/2 z-40 items-center gap-1 px-2 py-2 rounded-full glass-strong border border-white/10 shadow-2xl">
        {items.map((item) => {
          const isActive = isItemActive(item.path);
          const Icon = item.Icon;
          return (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className={`relative flex flex-col items-center gap-0.5 px-5 py-2 rounded-full transition-all ${
                isActive ? 'bg-white/10' : 'hover:bg-white/5'
              }`}
            >
              <div className="relative">
                <Icon className={`w-6 h-6 transition-all duration-300 ${isActive ? 'text-white scale-110' : 'text-white/50'}`} />
                {item.badge > 0 && (
                  <span className="absolute -top-1.5 -right-2 min-w-[18px] h-[18px] px-1 rounded-full bg-rose-500 text-white text-[10px] font-bold flex items-center justify-center shadow-lg shadow-rose-500/50">
                    {item.badge > 99 ? '99+' : item.badge}
                  </span>
                )}
              </div>
              <span className={`text-[10px] font-medium transition-colors ${isActive ? 'text-white' : 'text-white/50'}`}>
                {item.label}
              </span>
            </button>
          );
        })}
      </nav>
    </>
  );
}
