"use client";
import { Auth } from '@supabase/auth-ui-react';
import { ThemeSupa } from '@supabase/auth-ui-shared';
import { supabase } from '../../lib/supabase';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function LoginPage() {
  const router = useRouter();

  useEffect(() => {
    // If user is already logged in, send them to the planner
    supabase.auth.onAuthStateChange((event, session) => {
      if (session) {
        router.push('/');
      }
    });
  }, [router]);

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
      <div className="max-w-md w-full bg-white p-8 rounded-[2rem] shadow-xl border border-slate-100">
        <div className="text-center mb-8">
          <div className="bg-indigo-600 w-12 h-12 rounded-2xl text-white flex items-center justify-center font-black text-2xl mx-auto mb-4 italic shadow-lg shadow-indigo-100">S</div>
          <h1 className="text-2xl font-black text-slate-900 uppercase italic">Teacher Sign In</h1>
          <p className="text-slate-400 text-xs font-medium mt-1 uppercase tracking-widest">Access your STEM Club Schedule</p>
        </div>
        
        <Auth
          supabaseClient={supabase}
          appearance={{ theme: ThemeSupa }}
          theme="minimal"
          providers={[]} // Add 'google' here later if you want
          redirectTo="http://localhost:3000/"
        />
      </div>
    </div>
  );
}