import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import Avatar from '@/components/Avatar';
import { Home, MessageCircle, User, LogOut, Signal, Search as SearchIcon } from 'lucide-react';

export default function Sidebar() {
  const { profile, signOut } = useAuth();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  const navItem = (to: string, icon: React.ReactNode, label: string) => (
    <NavLink
      to={to}
      className={({ isActive }) =>
        `flex items-center gap-4 px-4 py-3 rounded-xl transition-all duration-200 group ${
          isActive
            ? 'bg-white/10 text-white'
            : 'text-neutral-400 hover:bg-white/5 hover:text-white'
        }`
      }
    >
      {icon}
      <span className="hidden xl:block text-sm font-medium">{label}</span>
    </NavLink>
  );

  return (
    <aside className="fixed left-0 top-0 h-full w-16 xl:w-64 border-r border-white/10 bg-black/80 backdrop-blur-xl z-40 flex flex-col py-6 px-2 xl:px-4">
      {/* Logo */}
      <div className="px-2 mb-8 flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-rose-500 via-pink-500 to-amber-500 flex items-center justify-center shrink-0 shadow-lg shadow-rose-500/20">
          <Signal className="w-6 h-6 text-white" strokeWidth={2.5} />
        </div>
        <span className="hidden xl:block text-xl font-bold gradient-text">Deep Signal</span>
      </div>

      {/* Nav */}
      <nav className="flex-1 space-y-1">
        {navItem('/feed', <Home className="w-6 h-6 shrink-0" />, 'Feed')}
        {navItem('/search', <SearchIcon className="w-6 h-6 shrink-0" />, 'Search')}
        {navItem('/chat', <MessageCircle className="w-6 h-6 shrink-0" />, 'Messages')}
        {profile && navItem(`/profile/${profile.id}`, <User className="w-6 h-6 shrink-0" />, 'Profile')}
      </nav>

      {/* User + Sign out */}
      <div className="space-y-2 pt-4 border-t border-white/10">
        {profile && (
          <NavLink
            to={`/profile/${profile.id}`}
            className="flex items-center gap-3 px-2 py-2 rounded-xl hover:bg-white/5 transition-colors"
          >
            <Avatar src={profile.avatar_url} name={profile.username} size="sm" />
            <div className="hidden xl:block min-w-0">
              <p className="text-sm font-medium text-white truncate">{profile.username}</p>
              <p className="text-xs text-neutral-500 truncate">{profile.full_name || 'View profile'}</p>
            </div>
          </NavLink>
        )}
        <button
          onClick={handleSignOut}
          className="w-full flex items-center gap-4 px-4 py-3 rounded-xl text-neutral-400 hover:bg-white/5 hover:text-white transition-all"
        >
          <LogOut className="w-6 h-6 shrink-0" />
          <span className="hidden xl:block text-sm font-medium">Sign Out</span>
        </button>
      </div>
    </aside>
  );
}
