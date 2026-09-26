import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from '@/context/AuthContext';
import MobileNav from '@/components/MobileNav';
import LoginPage from '@/pages/LoginPage';
import SignupPage from '@/pages/SignupPage';
import ForgotPasswordPage from '@/pages/ForgotPasswordPage';
import ResetPasswordPage from '@/pages/ResetPasswordPage';
import FeedPage from '@/pages/FeedPage';
import ChatPage from '@/pages/ChatPage';
import ProfilePage from '@/pages/ProfilePage';
import SearchPage from '@/pages/SearchPage';
import RoomsPage from '@/pages/RoomsPage';
import ReelsPage from '@/pages/ReelsPage';
import RoomDetailPage from '@/pages/RoomDetailPage';
import { Signal, Loader2 } from 'lucide-react';
import type { ReactNode } from 'react';

function ProtectedLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-[#08080D]">
      <main className="min-h-screen pb-[88px]">
        {children}
      </main>
      <MobileNav />
    </div>
  );
}

function AuthGate() {
  const { session, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-[#08080D] flex flex-col items-center justify-center relative">
        <div className="absolute top-[-20%] left-[-10%] w-[400px] h-[400px] rounded-full bg-rose-500/20 blur-[120px]" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[400px] h-[400px] rounded-full bg-orange-500/15 blur-[120px]" />
        <div className="relative z-10 flex flex-col items-center">
          <div className="relative mb-5">
            <div className="absolute inset-0 bg-gradient-to-br from-rose-500 to-orange-500 rounded-3xl blur-2xl opacity-60" />
            <div className="relative w-16 h-16 rounded-3xl bg-gradient-to-br from-rose-500 via-pink-500 to-orange-500 flex items-center justify-center">
              <Signal className="w-8 h-8 text-white" strokeWidth={2.5} />
            </div>
          </div>
          <Loader2 className="w-6 h-6 animate-spin text-rose-500" />
        </div>
      </div>
    );
  }

  if (!session) {
    return (
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/signup" element={<SignupPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    );
  }

  return (
    <Routes>
      <Route path="/feed" element={<ProtectedLayout><FeedPage /></ProtectedLayout>} />
      <Route path="/search" element={<ProtectedLayout><SearchPage /></ProtectedLayout>} />
      <Route path="/rooms" element={<ProtectedLayout><RoomsPage /></ProtectedLayout>} />
      <Route path="/rooms/:roomId" element={<ProtectedLayout><RoomDetailPage /></ProtectedLayout>} />
      <Route path="/reels" element={<ProtectedLayout><ReelsPage /></ProtectedLayout>} />
      <Route path="/chat" element={<ProtectedLayout><ChatPage /></ProtectedLayout>} />
      <Route path="/chat/:userId" element={<ProtectedLayout><ChatPage /></ProtectedLayout>} />
      <Route path="/profile/:userId" element={<ProtectedLayout><ProfilePage /></ProtectedLayout>} />
      <Route path="*" element={<Navigate to="/feed" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <AuthGate />
      </BrowserRouter>
    </AuthProvider>
  );
}
