"use client";
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { supabase } from '../lib/supabase';
import { useEffect, useState } from 'react';

export default function Navbar() {
  const [user, setUser] = useState<any>(null);
  const pathname = usePathname();

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

  const navItems = [
    { name: 'Dashboard', path: '/' },
    { name: 'Session Library', path: '/library' },
    { name: 'My Schedule', path: '/schedule' },
  ];

  return (
    <nav className="bg-white border-b border-slate-200 px-8 py-3 flex justify-between items-center z-50 sticky top-0 h-[60px]">
      <div className="flex items-center gap-10">
        <Link href="/" className="flex items-center gap-2">
          <div className="bg-indigo-600 w-7 h-7 rounded-lg text-white flex items-center justify-center font-black italic text-xs">S</div>
          <span className="font-black text-slate-900 uppercase text-xs tracking-tighter">STEM Planner</span>
        </Link>
        
        {user && (
          <div className="flex gap-1">
            {navItems.map((item) => (
              <Link 
                key={item.path} 
                href={item.path} 
                className={`text-[10px] font-black uppercase px-4 py-2 rounded-lg transition-all ${
                  pathname === item.path ? 'bg-slate-100 text-indigo-600' : 'text-slate-400 hover:text-indigo-600'
                }`}
              >
                {item.name}
              </Link>
            ))}
          </div>
        )}
      </div>

      <div className="flex items-center gap-4">
        {user ? (
          <>
            <Link href="/settings" className="text-[9px] font-black uppercase text-slate-400 hover:text-indigo-600">Settings</Link>
            <button onClick={() => supabase.auth.signOut()} className="text-[9px] font-black uppercase bg-slate-50 px-3 py-1.5 rounded-md text-slate-500 border border-slate-100">Sign Out</button>
          </>
        ) : (
          <Link href="/login" className="text-[9px] font-black uppercase bg-indigo-600 px-4 py-2 rounded-lg text-white">Teacher Login</Link>
        )}
      </div>
    </nav>
  );
}