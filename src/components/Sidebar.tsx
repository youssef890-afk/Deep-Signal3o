import { useState, type ComponentType } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import Avatar from '@/components/Avatar';
import { DSLogo, DSHome, DSChat, DSSearch, DSRooms } from '@/components/icons/BrandIcons';
import { Code2, Compass, Gamepad2, LogOut, Clapperboard, X } from 'lucide-react';

export default function Sidebar() {
  const { profile, signOut } = useAuth();
  const navigate = useNavigate();
  const [showParticipationInfo, setShowParticipationInfo] = useState(false);

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
      </nav>

      <div className="space-y-2 pt-4 border-t border-white/5">
        <button
          onClick={() => setShowParticipationInfo(true)}
          aria-label="شارك في بناء التطبيق"
          title="شارك في بناء التطبيق"
          className="w-full flex items-center justify-center gap-3 rounded-xl px-3 py-3 text-white/55 transition-all hover:bg-white/5 hover:text-white xl:justify-start xl:px-4"
        >
          <Code2 className="h-5 w-5 shrink-0" />
          <span className="hidden text-sm font-medium xl:block">شارك في بناء التطبيق</span>
        </button>
        <button onClick={handleSignOut} aria-label="تسجيل الخروج" className="w-full flex items-center justify-center gap-4 rounded-xl px-3 py-3 text-white/50 transition-all hover:bg-white/5 hover:text-white xl:justify-start xl:px-4">
          <LogOut className="h-5 w-5 shrink-0" />
          <span className="hidden text-sm font-medium xl:block">تسجيل الخروج</span>
        </button>
        {profile && (
          <NavLink
            to={`/profile/${profile.id}`}
            aria-label="الملف الشخصي"
            title="الملف الشخصي"
            className="flex items-center justify-center rounded-xl px-2 py-2 transition-colors hover:bg-white/5 xl:justify-start"
          >
            <Avatar src={profile.avatar_url} name={profile.username} size="sm" />
          </NavLink>
        )}
      </div>

      {showParticipationInfo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm" onClick={() => setShowParticipationInfo(false)}>
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="participation-title"
            className="w-full max-w-md rounded-2xl border border-white/10 bg-[#111118] p-6 shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="mb-5 flex items-start justify-between gap-4">
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-rose-400/10 text-rose-300">
                  <Code2 className="h-5 w-5" />
                </span>
                <h2 id="participation-title" className="text-lg font-semibold text-white">شارك في بناء التطبيق</h2>
              </div>
              <button onClick={() => setShowParticipationInfo(false)} aria-label="إغلاق" className="rounded-lg p-1 text-white/50 transition-colors hover:bg-white/5 hover:text-white">
                <X className="h-5 w-5" />
              </button>
            </div>
            <p className="text-sm leading-7 text-white/70">
              تقدر تساهم بأفكارك أو تساعد في تطوير التطبيق. حالياً ما كايناش آلية ربح مفعّلة، وما نقدرش نضمن أي دخل. إلا تطلقات مكافآت مستقبلاً، غادي تتوضح طريقة الاستفادة والشروط قبلها.
            </p>
            <p className="mt-3 text-sm leading-7 text-white/50">
              تقدر تخطي الدعوة وتكمل استعمال التطبيق، ولكن ميزات المشاركة والمكافآت المستقبلية المرتبطة بها ما غاديش تكون متاحة لحسابك.
            </p>
            <button
              onClick={() => setShowParticipationInfo(false)}
              className="mt-6 w-full rounded-xl bg-white/10 px-4 py-3 text-sm font-medium text-white transition-colors hover:bg-white/15"
            >
              تخطي الآن
            </button>
          </section>
        </div>
      )}
    </aside>
  );
}
