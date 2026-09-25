import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from '@/context/AuthContext';
import Sidebar from '@/components/Sidebar';
import MobileNav from '@/components/MobileNav';
import LoginPage from '@/pages/LoginPage';
import SignupPage from '@/pages/SignupPage';
import FeedPage from '@/pages/FeedPage';
import ChatPage from '@/pages/ChatPage';
import ProfilePage from '@/pages/ProfilePage';
import SearchPage from '@/pages/SearchPage';
import RoomsPage from '@/pages/RoomsPage';
import { Signal, Loader2 } from 'lucide-react';
import type { ReactNode } from 'react';

function ProtectedLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-[#08080D]">
      <Sidebar />
      <main className="ml-16 xl:ml-64 min-h-screen pb-24 md:pb-0 relative">
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
        <div className="aurora" />
        <div className="relative z-10 flex flex-col items-center">
          <div className="relative mb-6">
            <div className="absolute inset-0 gradient-brand rounded-3xl blur-2xl opacity-50" />
            <div className="relative w-16 h-16 rounded-3xl gradient-brand flex items-center justify-center shadow-depth-3">
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
