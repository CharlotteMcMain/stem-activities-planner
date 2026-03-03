"use client";
import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import Link from 'next/link';

export default function Dashboard() {
  const [stats, setStats] = useState<any>(null);
  const [upcoming, setUpcoming] = useState<any>(null);

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      
      const { data: sched } = await supabase.from('user_schedules').select('*, activities(*)').eq('user_id', user.id).order('scheduled_date', { ascending: true });
      
      if (sched) {
        setUpcoming(sched.find(s => s.activity_id && !s.is_completed));
        setStats({
          total: sched.filter(s => s.activity_id).length,
          physics: sched.filter(s => s.activities?.discipline === 'Physics').length,
          chemistry: sched.filter(s => s.activities?.discipline === 'Chemistry').length,
          biology: sched.filter(s => s.activities?.discipline === 'Biology').length,
          todo: sched.filter(s => s.activity_id && !s.kit_ordered).length
        });
      }
    }
    load();
  }, []);

  if (!stats) return <div className="p-20 text-center animate-pulse font-black uppercase text-slate-300">Loading Dashboard...</div>;

  return (
    <div className="min-h-[calc(100vh-60px)] bg-slate-50 p-10 space-y-10">
      <div className="max-w-6xl mx-auto grid grid-cols-4 gap-6">
          <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm text-center">
              <div className="text-[9px] font-black text-slate-400 uppercase mb-1">Physics</div>
              <div className="text-3xl font-black text-blue-600">{stats.physics}</div>
          </div>
          <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm text-center">
              <div className="text-[9px] font-black text-slate-400 uppercase mb-1">Chemistry</div>
              <div className="text-3xl font-black text-indigo-600">{stats.chemistry}</div>
          </div>
          <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm text-center">
              <div className="text-[9px] font-black text-slate-400 uppercase mb-1">Biology</div>
              <div className="text-3xl font-black text-emerald-600">{stats.biology}</div>
          </div>
          <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm text-center border-b-4 border-b-amber-500">
              <div className="text-[9px] font-black text-slate-400 uppercase mb-1">To Order</div>
              <div className="text-3xl font-black text-amber-500">{stats.todo}</div>
          </div>
      </div>

      <div className="max-w-6xl mx-auto">
        <h3 className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-4">Up Next</h3>
        {upcoming ? (
            <div className="bg-indigo-600 p-12 rounded-[2.5rem] text-white shadow-2xl relative overflow-hidden">
                <div className="relative z-10">
                    <div className="text-[10px] font-black uppercase tracking-widest opacity-60 mb-2">{new Date(upcoming.scheduled_date).toLocaleDateString()}</div>
                    <h2 className="text-5xl font-black uppercase italic tracking-tighter mb-8 leading-none">{upcoming.activities.activity_title}</h2>
                    <Link href="/schedule" className="bg-white text-indigo-600 px-8 py-3 rounded-xl font-black uppercase text-[10px]">View Prep Details</Link>
                </div>
            </div>
        ) : (
            <div className="bg-white p-20 rounded-[2.5rem] border border-dashed border-slate-200 text-center text-slate-400 font-bold uppercase">No sessions planned</div>
        )}
      </div>
    </div>
  );
}