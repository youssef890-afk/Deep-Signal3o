import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import Avatar from '@/components/Avatar';
import { DSLogo, DSHome, DSChat, DSProfile, DSSearch } from '@/components/icons/BrandIcons';
import { LogOut } from 'lucide-react';

export default function Sidebar() {
  const { profile, signOut } = useAuth();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  const navItem = (to: string, Icon: any, label: string) => (
    <NavLink
      to={to}
      className={({ isActive }) =>
        `group relative flex items-center gap-4 px-4 py-3 rounded-2xl transition-all duration-300 ${
          isActive
            ? 'bg-gradient-to-r from-rose-500/15 to-transparent text-white'
            : 'text-white/40 hover:bg-white/5 hover:text-white'
        }`
      }
    >
      {({ isActive }) => (
        <>
          {isActive && (
            <span className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 gradient-brand rounded-r-full shadow-glow-rose" />
          )}
          <Icon className="w-6 h-6 shrink-0 transition-transform group-hover:scale-110" />
          <span className="hidden xl:block text-sm font-medium">{label}</span>
        </>
      )}
    </NavLink>
  );

  return (
    <aside className="fixed left-0 top-0 h-full w-16 xl:w-64 glass border-r border-white/5 z-40 flex flex-col py-6 px-2 xl:px-4">
      <div className="px-2 mb-8 flex items-center gap-3">
        <DSLogo size={40} />
        <span className="hidden xl:block text-xl font-bold gradient-text tracking-tight">Deep Signal</span>
      </div>

      <nav className="flex-1 space-y-1">
        {navItem('/feed', DSHome, 'Feed')}
        {navItem('/search', DSSearch, 'Search')}
        {navItem('/chat', DSChat, 'Messages')}
        {profile && navItem(`/profile/${profile.id}`, DSProfile, 'Profile')}
      </nav>

      <div className="space-y-2 pt-4 border-t border-white/5">
        {profile && (
          <NavLink to={`/profile/${profile.id}`} className="flex items-center gap-3 px-2 py-2 rounded-2xl hover:bg-white/5 transition-colors">
            <Avatar src={profile.avatar_url} name={profile.username} size="sm" />
            <div className="hidden xl:block min-w-0">
              <p className="text-sm font-medium text-white truncate">{profile.username}</p>
              <p className="text-xs text-white/40 truncate">{profile.full_name || 'View profile'}</p>
            </div>
          </NavLink>
        )}
        <button onClick={handleSignOut} className="w-full flex items-center gap-4 px-4 py-3 rounded-2xl text-white/40 hover:bg-white/5 hover:text-white transition-all">
          <LogOut className="w-5 h-5 shrink-0" />
          <span className="hidden xl:block text-sm font-medium">Sign Out</span>
        </button>
      </div>
    </aside>
  );
}
