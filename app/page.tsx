"use client";
export const dynamic = "force-dynamic";
import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

export default function Home() {
  const [activities, setActivities] = useState<any[]>([]);
  const [selected, setSelected] = useState<any>(null);
  const [discipline, setDiscipline] = useState('All');
  const [pupils, setPupils] = useState(30);
  const [groupSize, setGroupSize] = useState(4);
  const [loading, setLoading] = useState(true);
  const [showHistory, setShowHistory] = useState(false);
  const [mySchedule, setMySchedule] = useState<any[]>([]);

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();

      // 1. Fetch all activities
      const { data: acts } = await supabase.from('activities').select(`
        *,
        activities_equipment!linked_activity (
          unit_type, ratio, min_quantity, notes,
          equipment_master_list!master_item_id ( item_title, type )
        ),
        lesson_steps!linked_activity ( 
          step_title, step_duration, step_order, step_notes 
        )
      `);

      // 2. Fetch user's schedule to check badges
      if (user) {
        const { data: sched } = await supabase.from('user_schedules').select('*').eq('user_id', user.id);
        setMySchedule(sched || []);
      }

      setActivities(acts || []);
      setLoading(false);
    }
    loadData();
  }, []);

  const isAssigned = (id: any) => mySchedule.some(s => s.activity_id === id);
  const isCompleted = (id: any) => mySchedule.some(s => s.activity_id === id && s.is_completed);

  // Filtering Logic
  const filteredActivities = activities.filter(a => {
    const discMatch = discipline === 'All' || a.discipline.toLowerCase() === discipline.toLowerCase();
    const historyMatch = showHistory ? isCompleted(a.activity_id) : !isCompleted(a.activity_id);
    return discMatch && historyMatch;
  });

  const calculateQty = (item: any) => {
    const { unit_type, ratio, min_quantity } = item;
    let qty = 0;
    const cleanUnit = unit_type?.toLowerCase().trim();
    if (cleanUnit === 'per class' || cleanUnit === 'per_class') qty = 1;
    if (cleanUnit === 'per pupil' || cleanUnit === 'per_pupil') qty = pupils * ratio;
    if (cleanUnit === 'per group' || cleanUnit === 'per_group') qty = Math.ceil(pupils / groupSize) * ratio;
    return Math.max(Math.ceil(qty), min_quantity || 0);
  };

  const saveToSchedule = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return alert("Log in to save!");
    const { error } = await supabase.from('user_schedules').insert({
      user_id: user.id,
      activity_id: selected.activity_id,
      scheduled_date: new Date().toISOString().split('T')[0],
      planned_pupils: pupils,
      planned_group_size: groupSize
    });
    if (error) alert(error.message);
    else alert("Saved to Schedule!");
  };

  return (
    <div className="h-[calc(100vh-50px)] flex flex-col bg-slate-50 font-sans text-slate-900 overflow-hidden">
      
      {/* FILTER BAR */}
      <div className="flex-shrink-0 bg-white border-b border-slate-200 px-8 py-3 z-20">
        <div className="max-w-[1800px] mx-auto flex flex-wrap items-center justify-between gap-6">
          <div className="flex items-center gap-6 bg-slate-50 p-1.5 rounded-xl border border-slate-100">
            <div className="flex items-center gap-2 px-3 border-r border-slate-200">
              <label className="text-[9px] font-black uppercase text-slate-400 tracking-widest">Discipline</label>
              <select value={discipline} onChange={(e) => setDiscipline(e.target.value)} className="bg-transparent font-bold text-[10px] text-indigo-600 outline-none cursor-pointer">
                <option value="All">All</option>
                <option value="Biology">Biology</option>
                <option value="Chemistry">Chemistry</option>
                <option value="Physics">Physics</option>
              </select>
            </div>
            <div className="flex items-center gap-2 px-3 border-r border-slate-200">
              <label className="text-[9px] font-black uppercase text-slate-400">Pupils</label>
              <input type="number" value={pupils} onChange={(e) => setPupils(Number(e.target.value))} className="w-8 bg-transparent font-bold text-[10px] outline-none text-center" />
            </div>
            <div className="flex items-center gap-3 px-3">
              <label className="text-[9px] font-black uppercase text-slate-400">Group Size: {groupSize}</label>
              <input type="range" min="1" max="10" value={groupSize} onChange={(e) => setGroupSize(Number(e.target.value))} className="w-16 accent-indigo-600" />
            </div>
          </div>

          <button 
            onClick={() => setShowHistory(!showHistory)}
            className={`text-[9px] font-black uppercase px-4 py-2 rounded-lg border transition-all ${showHistory ? 'bg-indigo-600 text-white shadow-lg' : 'bg-white text-slate-400 border-slate-200 hover:border-indigo-200 hover:text-indigo-600'}`}
          >
            {showHistory ? 'Showing: History' : 'View History'}
          </button>
        </div>
      </div>

      <main className="flex-1 flex overflow-hidden max-w-[1800px] mx-auto w-full">
        
        {/* LEFT LIST */}
        <aside className="w-1/4 border-r border-slate-200 bg-white flex flex-col flex-shrink-0">
          <div className="p-4 border-b border-slate-50 bg-slate-50/50">
            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
              {showHistory ? 'Completed Tasks' : 'Session Library'} ({filteredActivities.length})
            </span>
          </div>
          <div className="flex-1 overflow-y-auto p-2 space-y-1">
            {loading ? <div className="p-10 text-center animate-pulse text-slate-300 font-bold text-[10px] uppercase italic">Syncing Database...</div> : (
              filteredActivities.map((a) => (
                <button key={a.activity_id} onClick={() => setSelected(a)} className={`w-full p-4 rounded-xl text-left transition-all relative group ${selected?.activity_id === a.activity_id ? 'bg-indigo-600 text-white shadow-md' : 'hover:bg-slate-50 text-slate-600'}`}>
                  {isAssigned(a.activity_id) && !isCompleted(a.activity_id) && (
                    <div className="absolute top-2 right-2 bg-emerald-100 text-emerald-600 text-[7px] font-black px-1.5 py-0.5 rounded uppercase shadow-sm">Assigned</div>
                  )}
                  <div className={`text-[8px] font-black uppercase mb-0.5 ${selected?.activity_id === a.activity_id ? 'text-indigo-200' : 'text-indigo-500'}`}>{a.discipline}</div>
                  <div className="text-xs font-bold leading-tight tracking-tight">{a.activity_title}</div>
                </button>
              ))
            )}
          </div>
        </aside>

        {/* RIGHT DETAILS */}
        <section className="flex-1 h-full overflow-y-auto p-8 bg-slate-50/30">
          {selected ? (
            <div className="max-w-4xl mx-auto space-y-6 pb-20 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="p-8 border-b border-slate-100">
                  <div className="flex justify-between items-start mb-6">
                    <div className="space-y-2">
                        <div className="flex gap-2">
                            <span className="bg-indigo-600 text-white px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-widest">{selected.discipline}</span>
                            <span className="bg-slate-100 text-slate-500 px-2 py-0.5 rounded text-[8px] font-black uppercase">Ages {selected.age_min}-{selected.age_max}</span>
                        </div>
                        <h2 className="text-3xl font-black text-slate-900 tracking-tight uppercase italic leading-none">{selected.activity_title}</h2>
                    </div>
                    <div className="flex flex-col gap-2">
                        <div className="flex gap-2">
                            <a href={selected.drive_slides_url} target="_blank" className="bg-slate-900 text-white px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest hover:bg-black">Slides</a>
                            <a href={selected.drive_worksheets_url} target="_blank" className="bg-indigo-600 text-white px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest hover:bg-indigo-700">Sheets</a>
                        </div>
                        <button onClick={saveToSchedule} className="w-full bg-emerald-500 text-white px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest hover:bg-emerald-600 shadow-sm">Add to Schedule</button>
                    </div>
                  </div>
                  <div className="text-slate-500 text-[11px] leading-relaxed border-t border-slate-50 pt-4">
                    <strong className="text-slate-800 uppercase text-[9px] block mb-1">Session Overview</strong>
                    {selected.description}
                  </div>
                </div>
                <div className="grid grid-cols-4 divide-x divide-slate-100 bg-slate-50/50">
                    {[
                        { label: 'Run Time', val: `${selected.activity_time}m` },
                        { label: 'Prep Time', val: `${selected.prep_time}m` },
                        { label: 'Tidy Time', val: `${selected.tidy_time}m` },
                        { label: 'Stations', val: Math.ceil(pupils/groupSize) }
                    ].map((m, i) => (
                        <div key={i} className="py-3 px-4 text-center">
                            <div className="text-[8px] font-black text-slate-400 uppercase tracking-widest">{m.label}</div>
                            <div className="text-xs font-black text-slate-800">{m.val}</div>
                        </div>
                    ))}
                </div>
              </div>

              {/* ROADMAP */}
              <div className="bg-white rounded-2xl border border-slate-200 p-8 shadow-sm">
                 <h3 className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-8">Lesson Roadmap</h3>
                 <div className="flex justify-between relative px-4">
                    <div className="absolute top-2.5 left-10 right-10 h-0.5 bg-slate-100"></div>
                    {selected.lesson_steps?.sort((a:any, b:any) => a.step_order - b.step_order).map((step:any, i:number) => (
                        <div key={i} className="relative z-10 flex flex-col items-center">
                            <div className="w-4 h-4 rounded-full bg-indigo-600 text-white flex items-center justify-center text-[8px] font-black border-2 border-white shadow-sm mb-2">{i+1}</div>
                            <div className="text-[9px] font-black text-slate-800 uppercase leading-none">{step.step_title}</div>
                            <div className="text-[8px] font-bold text-indigo-400 mt-0.5">{step.step_duration}m</div>
                        </div>
                    ))}
                 </div>
              </div>

              {/* EQUIPMENT */}
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden text-[11px]">
                <table className="w-full text-left">
                  <thead className="bg-slate-50/80 border-b border-slate-100">
                    <tr>
                      <th className="p-4 text-[8px] font-black uppercase text-slate-400">Lab Item</th>
                      <th className="p-4 text-[8px] font-black uppercase text-slate-400">Prep Notes</th>
                      <th className="p-4 text-[8px] font-black uppercase text-slate-400 text-right">Qty</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {selected.activities_equipment?.map((item: any, i: number) => (
                      <tr key={i} className="hover:bg-slate-50/50">
                        <td className="p-4">
                          <div className="font-bold text-slate-800 mb-1 leading-tight">{item.equipment_master_list?.item_title}</div>
                          <span className={`text-[8px] font-black px-1.5 py-0.5 rounded uppercase tracking-widest ${item.equipment_master_list?.type === 'Consumable' ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-500'}`}>{item.equipment_master_list?.type}</span>
                        </td>
                        <td className="p-4 text-slate-400 font-medium italic">{item.notes || '-'}</td>
                        <td className="p-4 text-right">
                          <span className="bg-indigo-50 text-indigo-600 font-black px-3 py-1 rounded-md border border-indigo-100">{calculateQty(item)}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* DETAILED INSTRUCTIONS */}
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden p-8 space-y-8">
                  {selected.lesson_steps?.sort((a:any, b:any) => a.step_order - b.step_order).map((step:any, i:number) => (
                      <div key={i} className="flex gap-8 items-start">
                          <div className="flex-shrink-0 w-24">
                              <div className="text-[10px] font-black text-indigo-600 uppercase italic leading-none mb-1">{step.step_title}</div>
                              <div className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter">{step.step_duration} Mins</div>
                          </div>
                          <div className="flex-1 text-[11px] text-slate-600 leading-relaxed border-l-2 border-slate-100 pl-8 whitespace-pre-line">
                              {step.step_notes || "No detailed notes provided."}
                          </div>
                      </div>
                  ))}
              </div>
            </div>
          ) : (
            <div className="h-full flex items-center justify-center text-slate-300 uppercase text-[10px] font-black italic tracking-widest">Select a session to begin planning</div>
          )}
        </section>
      </main>
    </div>
  );
}