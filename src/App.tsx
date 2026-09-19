import { BrowserRouter, Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from '@/context/AuthContext';
import Sidebar from '@/components/Sidebar';
import LoginPage from '@/pages/LoginPage';
import SignupPage from '@/pages/SignupPage';
import ForgotPasswordPage from '@/pages/ForgotPasswordPage';
import FeedPage from '@/pages/FeedPage';
import ChatPage from '@/pages/ChatPage';
import ProfilePage from '@/pages/ProfilePage';
import SearchPage from '@/pages/SearchPage';
import RoomsPage from '@/pages/RoomsPage';
import RoomDetailPage from '@/pages/RoomDetailPage';
import { Home, MessageCircle, User, Search as SearchIcon, Signal, Mic } from 'lucide-react';
import { Loader2 } from 'lucide-react';
import type { ReactNode } from 'react';

// =============================================
// 1. تخطيط الصفحات المحمية (بشاشة واسعة للهواتف)
// =============================================
function ProtectedLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-black text-white">
      {/* الشريط الجانبي يظهر فقط في الشاشات الكبيرة */}
      <div className="hidden md:block">
        <Sidebar />
      </div>

      {/* الشاشة واسعة على الهاتف ومزاحة على الحواسيب */}
      <main className="md:ml-64 min-h-screen pb-20 md:pb-0">
        {children}
      </main>

      {/* شريط التنقل السفلي للهواتف فقط */}
      <div className="md:hidden">
        <MobileNav />
      </div>
    </div>
  );
}

// =============================================
// 2. شريط التنقل السفلي (Mobile Navigation)
// =============================================
function MobileNav() {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const items = [
    { path: '/feed', icon: Home, label: 'Feed' },
    { path: '/search', icon: SearchIcon, label: 'Search' },
    { path: '/chat', icon: MessageCircle, label: 'Messages' },
    { path: '/rooms', icon: Mic, label: 'Rooms' },
    ...(profile ? [{ path: `/profile/${profile.id}`, icon: User, label: 'Profile' }] : []),
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 h-16 bg-black/90 backdrop-blur-xl border-t border-white/10 flex items-center justify-around z-40 md:hidden">
      {items.map((item) => {
        const isActive = location.pathname === item.path ||
          (item.path === '/chat' && location.pathname.startsWith('/chat')) ||
          (item.path === '/rooms' && location.pathname.startsWith('/rooms')) ||
          (item.label === 'Profile' && location.pathname.startsWith('/profile/'));
        const Icon = item.icon;
        return (
          <button
            key={item.path}
            onClick={() => navigate(item.path)}
            className={`flex flex-col items-center gap-0.5 px-4 py-1.5 transition-all ${
              isActive ? 'text-rose-500' : 'text-neutral-500'
            }`}
          >
            <Icon className="w-6 h-6" strokeWidth={isActive ? 2.5 : 2} />
            <span className="text-[10px] font-medium">{item.label}</span>
          </button>
        );
      })}
    </nav>
  );
}

// =============================================
// 3. بوابة المصادقة (Auth Gate)
// =============================================
function AuthGate() {
  const { session, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex flex-col items-center justify-center">
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-rose-500 via-pink-500 to-amber-500 flex items-center justify-center mb-4 shadow-lg shadow-rose-500/20">
          <Signal className="w-8 h-8 text-white" strokeWidth={2.5} />
        </div>
        <Loader2 className="w-6 h-6 animate-spin text-rose-500" />
      </div>
    );
  }

  if (!session) {
    return (
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/signup" element={<SignupPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    );
  }

  return (
    <Routes>
      <Route path="/feed" element={<ProtectedLayout><FeedPage /></ProtectedLayout>} />
      <Route path="/search" element={<ProtectedLayout><SearchPage /></ProtectedLayout>} />
      <Route path="/chat" element={<ProtectedLayout><ChatPage /></ProtectedLayout>} />
      <Route path="/chat/:userId" element={<ProtectedLayout><ChatPage /></ProtectedLayout>} />
      <Route path="/profile/:userId" element={<ProtectedLayout><ProfilePage /></ProtectedLayout>} />
      <Route path="/rooms" element={<ProtectedLayout><RoomsPage /></ProtectedLayout>} />
      <Route path="/room/:roomId" element={<ProtectedLayout><RoomDetailPage /></ProtectedLayout>} />
      <Route path="*" element={<Navigate to="/feed" replace />} />
    </Routes>
  );
}

// =============================================
// 4. التطبيق الرئيسي
// =============================================
export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <AuthGate />
      </BrowserRouter>
    </AuthProvider>
  );
}
