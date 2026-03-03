"use client";
export const dynamic = "force-dynamic";
import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import Link from 'next/link';

export default function Home() {
  const [view, setView] = useState<'dashboard' | 'library'>('dashboard');
  const [activities, setActivities] = useState<any[]>([]);
  const [selected, setSelected] = useState<any>(null);
  const [discipline, setDiscipline] = useState('All');
  const [pupils, setPupils] = useState(30);
  const [groupSize, setGroupSize] = useState(4);
  const [loading, setLoading] = useState(true);
  const [showHistory, setShowHistory] = useState(false);
  const [mySchedule, setMySchedule] = useState<any[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [termSettings, setTermSettings] = useState<any>(null);

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setView('library'); }

      const { data: acts } = await supabase.from('activities').select(`
        *,
        activities_equipment!linked_activity (
          unit_type, ratio, min_quantity, notes,
          equipment_master_list!master_item_id ( item_title, type )
        ),
        lesson_steps!linked_activity ( step_title, step_duration, step_order, step_notes )
      `);

      if (user) {
        const { data: sched } = await supabase.from('user_schedules').select('*, activities(*)').eq('user_id', user.id).order('scheduled_date', { ascending: true });
        const { data: setts } = await supabase.from('user_settings').select('*').eq('user_id', user.id).single();
        setMySchedule(sched || []);
        setTermSettings(setts);
      }
      setActivities(acts || []);
      setLoading(false);
    }
    loadData();
  }, []);

  // --- Analytics Logic ---
  const stats = {
    total: mySchedule.filter(s => s.activity_id).length,
    physics: mySchedule.filter(s => s.activities?.discipline === 'Physics').length,
    chemistry: mySchedule.filter(s => s.activities?.discipline === 'Chemistry').length,
    biology: mySchedule.filter(s => s.activities?.discipline === 'Biology').length,
    todo: mySchedule.filter(s => s.activity_id && !s.kit_ordered && !s.is_completed).length,
    upcoming: mySchedule.find(s => s.activity_id && !s.is_completed)
  };

  const handleAssign = async (date: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    await supabase.from('user_schedules').upsert({
      user_id: user?.id, activity_id: selected.activity_id, scheduled_date: date, planned_pupils: pupils, planned_group_size: groupSize
    }, { onConflict: 'user_id,scheduled_date' });
    setIsModalOpen(false);
    window.location.reload(); // Refresh to update dashboard
  };

  const calculateQty = (item: any) => {
    const { unit_type, ratio, min_quantity } = item;
    let qty = 0;
    const cleanUnit = unit_type?.toLowerCase().trim();
    if (cleanUnit === 'per class' || cleanUnit === 'per_class') qty = 1;
    if (cleanUnit === 'per pupil' || cleanUnit === 'per_pupil') qty = pupils * ratio;
    if (cleanUnit === 'per group' || cleanUnit === 'per_group') qty = Math.ceil(pupils / groupSize) * ratio;
    return Math.max(Math.ceil(qty), min_quantity || 0);
  };

  return (
    <div className="h-[calc(100vh-60px)] flex flex-col bg-slate-50 font-sans text-slate-900 overflow-hidden text-[11px]">
      
      {/* 1. TOP TOGGLE BAR */}
      <div className="flex-shrink-0 bg-white border-b border-slate-200 px-8 py-3 z-30 flex justify-between items-center">
        <div className="flex bg-slate-100 p-1 rounded-xl">
           <button onClick={() => setView('dashboard')} className={`px-4 py-1.5 rounded-lg font-black uppercase text-[9px] transition-all ${view === 'dashboard' ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-400'}`}>My Dashboard</button>
           <button onClick={() => setView('library')} className={`px-4 py-1.5 rounded-lg font-black uppercase text-[9px] transition-all ${view === 'library' ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-400'}`}>Session Library</button>
        </div>
        {view === 'library' && (
           <div className="flex items-center gap-4">
              <select value={discipline} onChange={(e) => setDiscipline(e.target.value)} className="bg-transparent font-bold text-indigo-600 outline-none text-[10px] uppercase">
                <option value="All">All Disciplines</option>
                <option value="Biology">Biology</option>
                <option value="Chemistry">Chemistry</option>
                <option value="Physics">Physics</option>
              </select>
              <button onClick={() => setShowHistory(!showHistory)} className="text-[9px] font-black uppercase text-slate-400">{showHistory ? 'Hide History' : 'Show History'}</button>
           </div>
        )}
      </div>

      <main className="flex-1 overflow-hidden">
        {view === 'dashboard' ? (
          /* --- DASHBOARD VIEW --- */
          <div className="h-full overflow-y-auto p-10 space-y-10 bg-slate-50/50">
            <div className="max-w-6xl mx-auto space-y-10">
              
              {/* Stats Row */}
              <div className="grid grid-cols-4 gap-6">
                 {[
                   { label: 'Total Planned', val: stats.total, color: 'text-slate-900' },
                   { label: 'Physics', val: stats.physics, color: 'text-blue-600' },
                   { label: 'Chemistry', val: stats.chemistry, color: 'text-indigo-600' },
                   { label: 'Biology', val: stats.biology, color: 'text-emerald-600' },
                 ].map((s, i) => (
                   <div key={i} className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm text-center">
                      <div className="text-[10px] font-black text-slate-300 uppercase mb-1 tracking-widest">{s.label}</div>
                      <div className={`text-4xl font-black italic ${s.color}`}>{s.val}</div>
                   </div>
                 ))}
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Up Next Section */}
                <div className="lg:col-span-2 space-y-6">
                  <h3 className="text-sm font-black uppercase text-slate-400 tracking-[0.3em]">Coming Up Next</h3>
                  {stats.upcoming ? (
                    <div className="bg-indigo-600 p-10 rounded-[3rem] text-white shadow-2xl shadow-indigo-200 relative overflow-hidden group">
                        <div className="relative z-10">
                            <div className="text-[10px] font-black uppercase tracking-widest opacity-60 mb-2">
                                {new Date(stats.upcoming.scheduled_date).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })}
                            </div>
                            <h2 className="text-5xl font-black uppercase italic tracking-tighter mb-6 leading-none">{stats.upcoming.activities.activity_title}</h2>
                            <div className="flex gap-4">
                                <button onClick={() => {setSelected(stats.upcoming.activities); setView('library');}} className="bg-white text-indigo-600 px-6 py-3 rounded-xl font-black uppercase text-[10px]">View Prep List</button>
                                <Link href="/schedule" className="bg-indigo-500 text-white px-6 py-3 rounded-xl font-black uppercase text-[10px] border border-indigo-400">Manage Schedule</Link>
                            </div>
                        </div>
                        <div className="absolute -right-10 -bottom-10 text-[15rem] font-black text-white/10 italic select-none group-hover:scale-110 transition-transform">{stats.upcoming.activities.discipline[0]}</div>
                    </div>
                  ) : (
                    <div className="p-20 border-2 border-dashed border-slate-200 rounded-[3rem] text-center text-slate-400 font-bold italic uppercase">No upcoming sessions. Head to the library to assign one!</div>
                  )}
                </div>

                {/* To-Do Sidebar */}
                <div className="space-y-6">
                   <h3 className="text-sm font-black uppercase text-slate-400 tracking-[0.3em]">Action Items</h3>
                   <div className="bg-white rounded-[2rem] border border-slate-200 p-8 space-y-4 shadow-sm">
                      <div className="flex items-center gap-4">
                         <div className="text-2xl">📦</div>
                         <div>
                            <div className="text-lg font-black text-indigo-600">{stats.todo} Sessions</div>
                            <div className="text-[10px] font-bold text-slate-400 uppercase leading-none">Need Kit Ordered</div>
                         </div>
                      </div>
                      <div className="pt-4 border-t border-slate-50">
                         <Link href="/schedule" className="text-[10px] font-black text-indigo-600 uppercase hover:underline">Open Schedule to Order →</Link>
                      </div>
                   </div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          /* --- LIBRARY VIEW (Your Existing Planner) --- */
          <div className="flex h-full w-full">
            <aside className="w-1/4 border-r border-slate-200 bg-white flex flex-col flex-shrink-0">
                <div className="p-4 border-b border-slate-50 bg-slate-50/50">
                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Library</span>
                </div>
                <div className="flex-1 overflow-y-auto p-2 space-y-1">
                    {activities.filter(a => showHistory ? true : !mySchedule.some(s => s.activity_id === a.activity_id && s.is_completed)).map((a) => (
                    <button key={a.activity_id} onClick={() => setSelected(a)} className={`w-full p-4 rounded-xl text-left transition-all relative ${selected?.activity_id === a.activity_id ? 'bg-indigo-600 text-white' : 'hover:bg-slate-50 text-slate-600'}`}>
                        <div className={`text-[8px] font-black uppercase mb-0.5 ${selected?.activity_id === a.activity_id ? 'text-indigo-200' : 'text-indigo-500'}`}>{a.discipline}</div>
                        <div className="text-xs font-bold leading-tight">{a.activity_title}</div>
                    </button>
                    ))}
                </div>
            </aside>
            <section className="flex-1 h-full overflow-y-auto p-12 bg-slate-50/30">
               {/* This is where your 75% Details code from the previous step goes */}
               {selected && (
                 <div className="max-w-4xl mx-auto space-y-6 pb-20 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-8">
                        <div className="flex justify-between items-start mb-6">
                            <h2 className="text-3xl font-black text-slate-900 uppercase italic leading-none">{selected.activity_title}</h2>
                            <button onClick={() => setIsModalOpen(true)} className="bg-emerald-500 text-white px-6 py-2 rounded-xl text-[10px] font-black uppercase shadow-lg shadow-emerald-100">Assign to Session</button>
                        </div>
                        <p className="text-slate-500 text-xs leading-relaxed">{selected.description}</p>
                    </div>
                    {/* Add back your Roadmap and Equipment tables here... */}
                 </div>
               )}
            </section>
          </div>
        )}
      </main>

      {/* MODAL POPUP (Same as before) */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-6">
           <div className="bg-white w-full max-w-md rounded-[2.5rem] shadow-2xl p-8">
              <h2 className="text-xl font-black uppercase italic mb-6">Assign {selected?.activity_title}</h2>
              <div className="space-y-2 max-h-60 overflow-y-auto mb-6">
                 {/* Map your generated dates here... */}
              </div>
              <button onClick={() => setIsModalOpen(false)} className="w-full text-slate-400 font-bold py-2">Cancel</button>
           </div>
        </div>
      )}
    </div>
  );
}