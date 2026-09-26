import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import { AuthProvider, useAuth } from '@/context/AuthContext';
import { MessagesProvider } from '@/context/MessagesContext';
import MobileNav from '@/components/MobileNav';
import PageBackground from '@/components/PageBackground';
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
  const location = useLocation();
  return (
    <div className="min-h-screen relative">
      <PageBackground />
      <main className="relative z-10 min-h-screen pb-[92px]">
        <AnimatePresence mode="wait">
          <div key={location.pathname}>
            {children}
          </div>
        </AnimatePresence>
      </main>
      <MobileNav />
    </div>
  );
}

function AuthGate() {
  const { session, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-[#090D16] flex flex-col items-center justify-center relative">
        <div className="absolute top-[-20%] left-[-10%] w-[400px] h-[400px] rounded-full bg-purple-500/25 blur-[120px]" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[400px] h-[400px] rounded-full bg-cyan-500/20 blur-[120px]" />
        <div className="relative z-10 flex flex-col items-center">
          <div className="relative mb-5">
            <div className="absolute inset-0 gradient-primary rounded-3xl blur-2xl opacity-60" />
            <div className="relative w-16 h-16 rounded-3xl gradient-primary flex items-center justify-center">
              <Signal className="w-8 h-8 text-white" strokeWidth={2.5} />
            </div>
          </div>
          <Loader2 className="w-6 h-6 animate-spin text-purple-500" />
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
    <MessagesProvider>
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
    </MessagesProvider>
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
