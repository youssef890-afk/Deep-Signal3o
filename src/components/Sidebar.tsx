import type { ComponentType } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import Avatar from '@/components/Avatar';
import { DSLogo, DSHome, DSChat, DSProfile, DSSearch, DSRooms } from '@/components/icons/BrandIcons';
import { Compass, Gamepad2, LogOut, Clapperboard } from 'lucide-react';

export default function Sidebar() {
  const { profile, signOut } = useAuth();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  const navItem = (to: string, Icon: ComponentType<{ className?: string }>, label: string) => (
    <NavLink
      to={to}
      aria-label={label}
      className={({ isActive }) =>
        `group relative flex items-center gap-4 px-3 xl:px-4 py-3 rounded-xl transition-all duration-200 ${
          isActive
            ? 'bg-white/[0.08] text-white'
            : 'text-white/55 hover:bg-white/[0.05] hover:text-white'
        }`
      }
    >
      {({ isActive }) => (
        <>
          {isActive && (
            <span className="absolute left-0 top-1/2 -translate-y-1/2 h-7 w-[3px] rounded-r-full bg-rose-400" />
          )}
          <Icon className="w-[22px] h-[22px] shrink-0 transition-transform group-hover:scale-110" />
          <span className="hidden xl:block text-sm font-medium">{label}</span>
        </>
      )}
    </NavLink>
  );

  return (
    <aside className="fixed left-0 top-0 z-40 hidden h-dvh w-16 flex-col border-r border-white/[0.08] bg-[#09090d]/95 px-2 py-5 backdrop-blur-2xl lg:flex xl:w-60 xl:px-4">
      <NavLink to="/feed" aria-label="Deep-Signal الرئيسية" className="mb-9 flex items-center justify-center gap-3 px-2 xl:justify-start">
        <DSLogo size={40} />
        <span className="hidden font-serif text-xl font-bold italic text-white xl:block">Deep-Signal</span>
      </NavLink>

      <nav className="flex-1 space-y-1" aria-label="التنقل الرئيسي">
        {navItem('/feed', DSHome, 'الرئيسية')}
        {navItem('/search', DSSearch, 'البحث')}
        {navItem('/discover', Compass, 'اكتشف')}
        {navItem('/reels', Clapperboard, 'ريلز')}
        {navItem('/chat', DSChat, 'الرسائل')}
        {navItem('/rooms', DSRooms, 'الغرف الصوتية')}
        {navItem('/games', Gamepad2, 'الألعاب')}
        {profile && navItem(`/profile/${profile.id}`, DSProfile, 'الملف الشخصي')}
      </nav>

      <div className="space-y-2 pt-4 border-t border-white/5">
        {profile && (
          <NavLink to={`/profile/${profile.id}`} className="flex items-center justify-center gap-3 rounded-xl px-2 py-2 transition-colors hover:bg-white/5 xl:justify-start">
            <Avatar src={profile.avatar_url} name={profile.username} size="sm" />
            <div className="hidden xl:block min-w-0">
              <p className="text-sm font-medium text-white truncate">{profile.username}</p>
              <p className="text-xs text-white/40 truncate">{profile.full_name || 'View profile'}</p>
            </div>
          </NavLink>
        )}
        <button onClick={handleSignOut} aria-label="تسجيل الخروج" className="w-full flex items-center justify-center gap-4 rounded-xl px-3 py-3 text-white/50 transition-all hover:bg-white/5 hover:text-white xl:justify-start xl:px-4">
          <LogOut className="h-5 w-5 shrink-0" />
          <span className="hidden text-sm font-medium xl:block">تسجيل الخروج</span>
        </button>
      </div>
    </aside>
  );
}
