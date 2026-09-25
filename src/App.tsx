import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from '@/context/AuthContext';
import Sidebar from '@/components/Sidebar';
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
import { Signal, Loader2 } from 'lucide-react';
import type { ReactNode } from 'react';

function ProtectedLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-black">
      <Sidebar />
      <main className="ml-16 xl:ml-64 min-h-screen pb-20 md:pb-0">
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
