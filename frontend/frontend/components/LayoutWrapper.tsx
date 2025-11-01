'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import { useTheme } from '@/contexts/ThemeContext';
import Navigation from '@/components/Navigation';

export default function LayoutWrapper({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [user, setUser] = useState<any>(null);
  const { theme, toggleTheme } = useTheme();

  useEffect(() => {
    if (!supabase) return;

    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  const bgClass = theme === 'dark' 
    ? 'bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900' 
    : 'bg-gradient-to-br from-gray-50 via-white to-gray-100';

  const handleSignOut = async () => {
    if (!supabase) return;
    await supabase.auth.signOut();
  };

  return (
    <div className={`min-h-screen ${bgClass}`}>
      {/* Navigation Bar - Show on all pages when user is logged in */}
      {user && (
        <div className={`sticky top-0 z-50 ${theme === 'dark' ? 'bg-gray-800/95' : 'bg-white/95'} backdrop-blur-sm border-b ${theme === 'dark' ? 'border-gray-700' : 'border-gray-300'} shadow-lg`}>
          <div className="max-w-7xl mx-auto px-6 py-4">
            <div className="flex items-center justify-between w-full">
              <Navigation theme={theme} />
              <div className="flex items-center gap-3">
                <span className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                  {user.email}
                </span>
                <button
                  onClick={toggleTheme}
                  className={`p-2 rounded-lg transition-colors ${
                    theme === 'dark' 
                      ? 'bg-gray-700 text-yellow-400 hover:bg-gray-600' 
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
                  title="Toggle theme"
                >
                  {theme === 'dark' ? '☀️' : '🌙'}
                </button>
                <button
                  onClick={handleSignOut}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm transition-colors"
                >
                  Sign Out
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      {children}
    </div>
  );
}
