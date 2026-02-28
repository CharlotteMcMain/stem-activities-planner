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

  useEffect(() => {
    async function load() {
      setLoading(true);
      
      // We explicitly tell Supabase to use 'linked_activity' and 'master_item_ID' to join the tables
      let query = supabase.from('activities').select(`
        activity_id,
        activity_title,
        discipline,
        age_min,
        age_max,
        drive_files_url,
        activities_equipment!linked_activity (
          unit_type, 
          ratio, 
          min_quantity,
          notes,
          equipment_master_list!master_item_ID ( 
            item_title, 
            type,
            unit_price 
          )
        )
      `);
      
      if (discipline !== 'All') {
        query = query.ilike('discipline', discipline);
      }
      
      const { data, error } = await query;
      
      if (error) {
        console.error("DATABASE ERROR:", error.message);
      } else {
        setActivities(data || []);
      }
      setLoading(false);
    }
    load();
  }, [discipline]);

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
    <div className="min-h-screen bg-slate-50 p-6 md:p-12 font-sans text-slate-900">
      <header className="max-w-6xl mx-auto mb-10 flex flex-col md:flex-row justify-between items-end gap-4">
        <div>
          <h1 className="text-6xl font-black text-indigo-900 tracking-tighter uppercase">STEM Planner</h1>
          <p className="text-slate-500 mt-2 text-lg font-medium italic">Empowering teachers with instant lab logistics.</p>
        </div>
        <div className="bg-indigo-100 text-indigo-700 px-4 py-2 rounded-full text-xs font-black uppercase tracking-widest">
          {activities.length} Activities Loaded
        </div>
      </header>

      <main className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-4 gap-10">
        
        {/* SIDEBAR: INPUTS */}
        <div className="lg:col-span-1 space-y-8 bg-white p-8 rounded-[2.5rem] shadow-2xl shadow-slate-200/50 border border-slate-100 h-fit sticky top-10">
          <div>
            <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-3 block">Filter Discipline</label>
            <select 
              value={discipline}
              onChange={(e) => setDiscipline(e.target.value)} 
              className="w-full p-4 bg-slate-50 border-2 border-slate-50 rounded-2xl font-bold text-slate-700 focus:border-indigo-500 outline-none transition-all cursor-pointer"
            >
              <option value="All">All Disciplines</option>
              <option value="Biology">Biology</option>
              <option value="Chemistry">Chemistry</option>
              <option value="Physics">Physics</option>
              <option value="Engineering">Engineering</option>
            </select>
          </div>

          <div>
            <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-3 block">Total Number of Pupils</label>
            <input 
              type="number" 
              value={pupils} 
              onChange={(e) => setPupils(Number(e.target.value))} 
              className="w-full p-4 bg-slate-50 border-2 border-slate-50 rounded-2xl font-black text-3xl text-indigo-600 focus:border-indigo-500 outline-none" 
            />
          </div>

          <div>
            <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-3 block">Desired Group Size</label>
            <input 
              type="range" min="1" max="12" 
              value={groupSize} 
              onChange={(e) => setGroupSize(Number(e.target.value))} 
              className="w-full h-2 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-indigo-600 mb-4" 
            />
            <div className="bg-indigo-50 p-4 rounded-2xl text-center">
                <div className="text-indigo-600 font-black text-2xl tracking-tight">Groups of {groupSize}</div>
                <div className="text-[10px] font-bold text-indigo-300 uppercase mt-1 italic">{Math.ceil(pupils/groupSize)} Workstations</div>
            </div>
          </div>
        </div>

        {/* MAIN CONTENT: ACTIVITY LIST */}
        <div className="lg:col-span-3 space-y-8">
          
          {loading ? (
             <div className="flex items-center justify-center p-20 bg-white rounded-[2.5rem] border border-slate-100 italic text-slate-400 font-bold animate-pulse uppercase tracking-widest text-sm">
                Syncing with Lab Database...
             </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {activities.length === 0 ? (
                <div className="col-span-2 p-16 bg-white rounded-[2.5rem] border border-dashed border-slate-200 text-center">
                  <p className="text-slate-400 font-bold italic">No sessions found in the "{discipline}" discipline.</p>
                </div>
              ) : (
                activities.map((a) => (
                  <button 
                    key={a.activity_id} 
                    onClick={() => setSelected(a)} 
                    className={`p-8 rounded-[2.5rem] text-left transition-all border-4 group relative overflow-hidden ${
                      selected?.activity_id === a.activity_id 
                      ? 'border-indigo-600 bg-white shadow-2xl scale-[1.02]' 
                      : 'border-transparent bg-white hover:border-slate-200 shadow-sm hover:shadow-lg'
                    }`}
                  >
                    <div className="text-[10px] font-black text-indigo-400 uppercase tracking-[0.2em] mb-2">{a.discipline}</div>
                    <div className="text-2xl font-black text-slate-800 leading-tight mb-3">{a.activity_title}</div>
                    <div className="flex gap-2">
                        <span className="bg-slate-100 text-slate-500 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-tighter">Ages {a.age_min}-{a.age_max}</span>
                    </div>
                  </button>
                ))
              )}
            </div>
          )}

          {/* EQUIPMENT CALCULATOR RESULTS */}
          {selected && (
            <div className="bg-white p-10 rounded-[3.5rem] shadow-2xl shadow-indigo-100/50 border border-slate-100 overflow-hidden animate-in fade-in slide-in-from-bottom-8 duration-700">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-10 gap-6 border-b border-slate-50 pb-10">
                <div>
                  <h2 className="text-5xl font-black text-slate-900 tracking-tighter leading-none mb-3 italic uppercase">{selected.activity_title}</h2>
                  <p className="text-slate-400 font-bold uppercase text-[10px] tracking-[0.2em]">Prep Required for {pupils} Pupils • Groups of {groupSize}</p>
                </div>
                {selected.drive_files_url && (
                  <a 
                    href={selected.drive_files_url} 
                    target="_blank"
                    className="bg-indigo-600 text-white px-10 py-5 rounded-[1.5rem] font-black uppercase tracking-widest text-xs hover:bg-indigo-700 transition-all shadow-2xl shadow-indigo-200 hover:-translate-y-1"
                  >
                    Get Resources
                  </a>
                )}
              </div>

              <div className="rounded-[2rem] border border-slate-100 overflow-hidden shadow-inner bg-slate-50/30">
                <table className="w-full text-left">
                  <thead className="bg-slate-50/80">
                    <tr>
                      <th className="p-6 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Lab Equipment / Item</th>
                      <th className="p-6 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Classroom Notes</th>
                      <th className="p-6 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 text-right">Qty Needed</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selected.activities_equipment?.map((item: any, i: number) => (
                      <tr key={i} className="border-t border-slate-50 last:border-0 hover:bg-white transition-colors">
                        <td className="p-6">
                          <div className="font-black text-xl text-slate-800 tracking-tight">
                            {item.equipment_master_list?.item_title || "Unknown Item"}
                          </div>
                          <div className="flex items-center gap-2 mt-1">
                             <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-widest ${
                               item.equipment_master_list?.type === 'Consumable' 
                               ? 'bg-emerald-100 text-emerald-600' 
                               : 'bg-indigo-100 text-indigo-500'
                             }`}>
                               {item.equipment_master_list?.type || "Standard"}
                             </span>
                          </div>
                        </td>
                        <td className="p-6 text-slate-400 font-medium italic text-sm">
                          {item.notes || 'No specific notes'}
                        </td>
                        <td className="p-6 text-right">
                          <div className="inline-block bg-white border-2 border-indigo-100 text-indigo-600 font-black text-3xl px-6 py-3 rounded-2xl shadow-sm min-w-[4rem] text-center">
                            {calculateQty(item)}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}