import React, { useState } from 'react';
import { useAuthStore } from '../store/useAuthStore';
import { Loader2, ShieldCheck, Lock, User } from 'lucide-react';

export default function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const setAuth = useAuthStore((state) => state.setAuth);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });

      if (!response.ok) {
        throw new Error('Invalid username or password');
      }

      const data = await response.json();
      setAuth(data.token, data.user);
    } catch (err: any) {
      setError(err.message || 'Something went wrong');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#FBFBFA] flex flex-col items-center justify-center p-4 font-sans text-notion-text-main">
      <div className="w-full max-w-[400px]">
        {/* Logo/Icon */}
        <div className="flex flex-col items-center mb-10">
          <div className="w-16 h-16 bg-white rounded-2xl shadow-sm border border-gray-100 flex items-center justify-center mb-4 transition-transform hover:scale-105">
            <ShieldCheck size={36} className="text-gray-800" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight">Welcome back</h1>
          <p className="text-notion-text-sub mt-2">Log in to your workspace</p>
        </div>

        {/* Form */}
        <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100">
          <form onSubmit={handleLogin} className="space-y-5">
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-notion-text-sub mb-2 ml-1">Username</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-notion-text-sub">
                  <User size={16} />
                </div>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full bg-[#f7f7f5] border-transparent focus:bg-white focus:border-[#2383e2] focus:ring-4 focus:ring-[#2383e21a] rounded-lg py-2.5 pl-10 pr-4 text-sm transition-all outline-none"
                  placeholder="admin@kisah.com"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-notion-text-sub mb-2 ml-1">Password</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-notion-text-sub">
                  <Lock size={16} />
                </div>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-[#f7f7f5] border-transparent focus:bg-white focus:border-[#2383e2] focus:ring-4 focus:ring-[#2383e21a] rounded-lg py-2.5 pl-10 pr-4 text-sm transition-all outline-none"
                  placeholder="••••••••"
                  required
                />
              </div>
            </div>

            {error && (
              <div className="bg-red-50 text-red-600 border border-red-100 px-4 py-2 rounded-lg text-sm transition-all animate-shake">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-[#2383e2] hover:bg-[#1a6bbd] active:bg-[#145a9d] text-white font-medium py-2.5 rounded-lg transition-all shadow-sm hover:shadow-md disabled:opacity-50 flex items-center justify-center gap-2 mt-2"
            >
              {isLoading ? <Loader2 size={18} className="animate-spin" /> : 'Continue'}
            </button>
          </form>
        </div>

        {/* Footer */}
        <p className="text-center text-notion-text-sub text-[12px] mt-8 px-4">
          Secured by JWT Authentication. Login with your administrator credentials.
        </p>
      </div>
    </div>
  );
}
