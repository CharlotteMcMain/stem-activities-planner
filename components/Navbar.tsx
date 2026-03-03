"use client";
import Link from 'next/link';
import { supabase } from '../lib/supabase';
import { useEffect, useState } from 'react';

export default function Navbar() {
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    const getUser = async () => {
      const { data } = await supabase.auth.getUser();
      setUser(data.user);
    };
    getUser();
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });
    return () => subscription.unsubscribe();
  }, []);

  return (
    <nav className="bg-white border-b border-slate-200 px-8 py-3 flex justify-between items-center z-50 sticky top-0">
      <div className="flex items-center gap-8">
        <Link href="/" className="flex items-center gap-2 group">
          <div className="bg-indigo-600 w-7 h-7 rounded-lg text-white flex items-center justify-center font-black italic text-xs">S</div>
          <span className="font-black text-slate-900 uppercase text-xs tracking-tighter">STEM Planner</span>
        </Link>
        {user && (
          <div className="flex gap-6">
            <Link href="/" className="text-[10px] font-black uppercase text-slate-400 hover:text-indigo-600">Library</Link>
            <Link href="/schedule" className="text-[10px] font-black uppercase text-slate-400 hover:text-indigo-600">My Schedule</Link>
          </div>
        )}
      </div>

      <div className="flex items-center gap-4">
        {user ? (
          <>
            <Link href="/settings" className="text-[10px] font-black uppercase text-slate-400 hover:text-indigo-600">Settings</Link>
            <button onClick={() => supabase.auth.signOut()} className="text-[10px] font-black uppercase bg-slate-100 px-3 py-1.5 rounded-lg text-slate-600">Sign Out</button>
          </>
        ) : (
          <Link href="/login" className="text-[10px] font-black uppercase bg-indigo-600 px-4 py-2 rounded-lg text-white">Login</Link>
        )}
      </div>
    </nav>
  );
}