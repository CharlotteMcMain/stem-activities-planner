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
      
      // Querying based on your specific schema diagram
      let query = supabase.from('activities').select(`
        activity_id,
        activity_title,
        discipline,
        age_min,
        age_max,
        drive_files_url,
        activities_equipment (
          unit_type, 
          ratio, 
          min_quantity,
          notes,
          equipment_master_list ( 
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
        console.error("SUPABASE ERROR:", error.message);
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
    
    // Cleaning the unit_type string to handle variations
    const cleanUnit = unit_type?.toLowerCase().trim();

    if (cleanUnit === 'per class' || cleanUnit === 'per_class') {
      qty = 1;
    } else if (cleanUnit === 'per pupil' || cleanUnit === 'per_pupil') {
      qty = pupils * ratio;
    } else if (cleanUnit === 'per group' || cleanUnit === 'per_group') {
      qty = Math.ceil(pupils / groupSize) * ratio;
    }
    
    return Math.max(Math.ceil(qty), min_quantity || 0);
  };

  return (
    <div className="min-h-screen bg-slate-50 p-6 md:p-12 font-sans text-slate-900">
      <header className="max-w-6xl mx-auto mb-10">
        <h1 className="text-5xl font-black text-indigo-900 tracking-tighter uppercase">STEM Planner</h1>
        <p className="text-slate-500 mt-2 text-lg font-medium">Science Club Session Logistics & Equipment Calculator</p>
      </header>

      <main className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-4 gap-10">
        
        {/* SIDEBAR: CONTROLS */}
        <div className="lg:col-span-1 space-y-8 bg-white p-8 rounded-[2rem] shadow-xl shadow-slate-200/60 border border-slate-100 h-fit sticky top-10">
          <div>
            <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-3 block">Filter Discipline</label>
            <select 
              value={discipline}
              onChange={(e) => setDiscipline(e.target.value)} 
              className="w-full p-4 bg-slate-50 border-2 border-slate-50 rounded-2xl font-bold text-slate-700 focus:border-indigo-500 outline-none transition-all appearance-none cursor-pointer"
            >
              <option value="All">All Disciplines</option>
              <option value="Biology">Biology</option>
              <option value="Chemistry">Chemistry</option>
              <option value="Physics">Physics</option>
              <option value="Engineering">Engineering</option>
            </select>
          </div>

          <div>
            <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-3 block">Number of Pupils</label>
            <input 
              type="number" 
              value={pupils} 
              onChange={(e) => setPupils(Number(e.target.value))} 
              className="w-full p-4 bg-slate-50 border-2 border-slate-50 rounded-2xl font-black text-2xl text-indigo-600 focus:border-indigo-500 outline-none" 
            />
          </div>

          <div>
            <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-3 block">Group Size</label>
            <input 
              type="range" min="1" max="10" 
              value={groupSize} 
              onChange={(e) => setGroupSize(Number(e.target.value))} 
              className="w-full h-2 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-indigo-600 mb-2" 
            />
            <div className="flex justify-between items-center px-1">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-tighter">Individual</span>
                <span className="text-indigo-600 font-black text-lg">Groups of {groupSize}</span>
                <span className="text-xs font-bold text-slate-400 uppercase tracking-tighter">Large</span>
            </div>
          </div>
        </div>

        {/* MAIN CONTENT: ACTIVITY SELECTION */}
        <div className="lg:col-span-3 space-y-8">
          
          {loading ? (
             <div className="flex flex-col items-center justify-center p-20 bg-white rounded-[2rem] border border-slate-100 italic text-slate-400 font-medium animate-pulse">
                Fetching activities from database...
             </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {activities.length === 0 ? (
                <div className="col-span-2 p-16 bg-white rounded-[2rem] border border-dashed border-slate-200 text-center">
                  <p className="text-slate-400 font-bold">No activities found for "{discipline}"</p>
                </div>
              ) : (
                activities.map((a) => (
                  <button 
                    key={a.activity_id} 
                    onClick={() => setSelected(a)} 
                    className={`p-8 rounded-[2rem] text-left transition-all border-4 relative overflow-hidden group ${
                      selected?.activity_id === a.activity_id 
                      ? 'border-indigo-600 bg-white shadow-2xl shadow-indigo-100 scale-[1.02]' 
                      : 'border-transparent bg-white hover:border-slate-200 shadow-sm hover:shadow-md'
                    }`}
                  >
                    <div className="text-[10px] font-black text-indigo-400 uppercase tracking-[0.2em] mb-2">{a.discipline}</div>
                    <div className="text-2xl font-black text-slate-800 leading-tight mb-2">{a.activity_title}</div>
                    <div className="text-slate-400 text-sm font-bold uppercase tracking-tighter">Ages {a.age_min} - {a.age_max}</div>
                  </button>
                ))
              )}
            </div>
          )}

          {/* RESULTS: EQUIPMENT TABLE */}
          {selected && (
            <div className="bg-white p-10 rounded-[3rem] shadow-2xl shadow-slate-200 border border-slate-100 overflow-hidden animate-in fade-in slide-in-from-bottom-6 duration-500">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 gap-6 border-b border-slate-50 pb-8">
                <div>
                  <h2 className="text-4xl font-black text-slate-900 tracking-tight leading-none mb-2">{selected.activity_title}</h2>
                  <p className="text-slate-400 font-bold uppercase text-xs tracking-widest">Prep List for {pupils} Pupils • {groupSize} per group</p>
                </div>
                {selected.drive_files_url && (
                  <a 
                    href={selected.drive_files_url} 
                    target="_blank"
                    className="bg-indigo-600 text-white px-8 py-4 rounded-2xl font-bold hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-100 inline-flex items-center gap-2"
                  >
                    <span>Download Resources</span>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M19 14l-7 7m0 0l-7-7m7 7V3"></path></svg>
                  </a>
                )}
              </div>

              <div className="rounded-2xl border border-slate-100 overflow-hidden">
                <table className="w-full text-left">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="p-5 text-[10px] font-black uppercase tracking-widest text-slate-400">Item Name</th>
                      <th className="p-5 text-[10px] font-black uppercase tracking-widest text-slate-400">Type</th>
                      <th className="p-5 text-[10px] font-black uppercase tracking-widest text-slate-400">Notes</th>
                      <th className="p-5 text-[10px] font-black uppercase tracking-widest text-slate-400 text-right">Quantity</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selected.activities_equipment?.map((item: any, i: number) => (
                      <tr key={i} className="border-t border-slate-50 last:border-0 hover:bg-slate-50/50 transition-colors">
                        <td className="p-6">
                          <div className="font-bold text-lg text-slate-800">
                            {item.equipment_master_list?.item_title || "Unknown Item"}
                          </div>
                        </td>
                        <td className="p-6">
                           <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${
                             item.equipment_master_list?.type === 'Consumable' 
                             ? 'bg-emerald-50 text-emerald-600' 
                             : 'bg-slate-100 text-slate-500'
                           }`}>
                             {item.equipment_master_list?.type || "General"}
                           </span>
                        </td>
                        <td className="p-6 text-slate-500 font-medium text-sm">
                          {item.notes || '-'}
                        </td>
                        <td className="p-6 text-right">
                          <span className="inline-block bg-indigo-50 text-indigo-700 font-black text-3xl px-5 py-2 rounded-2xl min-w-[3rem] text-center">
                            {calculateQty(item)}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              
              <div className="mt-8 p-6 bg-slate-50 rounded-2xl border border-slate-100 flex items-center gap-4">
                 <div className="bg-white p-2 rounded-lg shadow-sm">💡</div>
                 <p className="text-sm text-slate-500 font-medium">
                    Technician Tip: Always check stock of <strong>consumables</strong> at least 48 hours before the session.
                 </p>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}