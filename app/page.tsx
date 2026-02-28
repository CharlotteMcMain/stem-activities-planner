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
      
      // Note: If Supabase renamed your tables to use underscores internally, 
      // it might be 'activities_equipment' instead of 'activities equipment'.
      // We'll try to fetch the activities first.
      let query = supabase.from('activities').select(`
        activity_id,
        activity_title,
        discipline,
        age_min,
        age_max,
        drive_files_url,
        activities_equipment:activities equipment (
          unit_type, 
          ratio, 
          min_quantity,
          notes,
          equipment_master:equipment master list ( 
            item_title, 
            type,
            unit_price 
          )
        )
      `);
      
      // Use ILIKE for case-insensitive matching (biology vs Biology)
      if (discipline !== 'All') {
        query = query.ilike('discipline', discipline);
      }
      
      const { data, error } = await query;
      
      if (error) {
        console.error("SUPABASE ERROR:", error.message);
        alert("Database connection error. Check your browser console (F12).");
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
      <header className="max-w-6xl mx-auto mb-10">
        <h1 className="text-5xl font-black text-indigo-900 tracking-tighter">STEM PLANNER</h1>
        <p className="text-slate-500 mt-2 text-lg">Select an activity to calculate equipment quantities.</p>
      </header>

      <main className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-4 gap-10">
        
        {/* SIDEBAR */}
        <div className="lg:col-span-1 space-y-8 bg-white p-8 rounded-3xl shadow-xl border border-slate-100 h-fit">
          <div>
            <label className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-3 block">Discipline</label>
            <select 
              value={discipline}
              onChange={(e) => setDiscipline(e.target.value)} 
              className="w-full p-3 bg-slate-50 border-2 border-slate-50 rounded-2xl font-semibold focus:border-indigo-500 outline-none"
            >
              <option value="All">All Disciplines</option>
              <option value="Biology">Biology</option>
              <option value="Chemistry">Chemistry</option>
              <option value="Physics">Physics</option>
              <option value="Engineering">Engineering</option>
            </select>
          </div>

          <div>
            <label className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-3 block">Number of Pupils</label>
            <input 
              type="number" 
              value={pupils} 
              onChange={(e) => setPupils(Number(e.target.value))} 
              className="w-full p-3 bg-slate-50 border-2 border-slate-50 rounded-2xl font-bold text-xl text-indigo-600 focus:border-indigo-500 outline-none" 
            />
          </div>

          <div>
            <label className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-3 block">Pupils per Group</label>
            <input 
              type="range" min="1" max="12" 
              value={groupSize} 
              onChange={(e) => setGroupSize(Number(e.target.value))} 
              className="w-full h-2 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-indigo-600" 
            />
            <div className="text-center font-black text-indigo-600 mt-2 text-lg">Groups of {groupSize}</div>
          </div>
        </div>

        {/* CONTENT AREA */}
        <div className="lg:col-span-3 space-y-8">
          
          {loading ? (
             <div className="text-center p-20 text-slate-400 font-bold animate-pulse text-xl">Loading activities...</div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {activities.length === 0 && (
                <div className="col-span-2 p-10 bg-slate-100 rounded-3xl text-center text-slate-500 font-medium">
                  No activities found for "{discipline}". Check your Supabase data!
                </div>
              )}
              {activities.map((a) => (
                <button 
                  key={a.activity_id} 
                  onClick={() => setSelected(a)} 
                  className={`p-6 rounded-3xl text-left transition-all border-4 ${
                    selected?.activity_id === a.activity_id 
                    ? 'border-indigo-500 bg-white shadow-2xl' 
                    : 'border-transparent bg-white hover:border-slate-200 shadow-sm'
                  }`}
                >
                  <div className="text-xs font-black text-indigo-400 uppercase tracking-widest mb-1">{a.discipline}</div>
                  <div className="text-2xl font-bold text-slate-800">{a.activity_title}</div>
                  <div className="text-slate-400 text-sm mt-1 font-medium">Ages {a.age_min} - {a.age_max}</div>
                </button>
              ))}
            </div>
          )}

          {/* EQUIPMENT LIST */}
          {selected && (
            <div className="bg-white p-10 rounded-[2.5rem] shadow-2xl border border-slate-100">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 gap-6">
                <h2 className="text-4xl font-black text-slate-900 tracking-tight">{selected.activity_title}</h2>
                {selected.drive_files_url && (
                  <a href={selected.drive_files_url} target="_blank" className="bg-indigo-600 text-white px-8 py-4 rounded-2xl font-bold shadow-lg">Resources Bundle</a>
                )}
              </div>

              <div className="rounded-3xl border border-slate-100 overflow-hidden">
                <table className="w-full text-left">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="p-5 text-xs font-bold uppercase tracking-widest text-slate-400">Item</th>
                      <th className="p-5 text-xs font-bold uppercase tracking-widest text-slate-400">Notes</th>
                      <th className="p-5 text-xs font-bold uppercase tracking-widest text-slate-400 text-right">Qty</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selected.activities_equipment?.map((item: any, i: number) => (
                      <tr key={i} className="border-t border-slate-50">
                        <td className="p-5">
                          <div className="font-bold text-lg">{item.equipment_master?.item_title}</div>
                          <div className="text-xs text-slate-400 font-bold uppercase">{item.equipment_master?.type}</div>
                        </td>
                        <td className="p-5 text-slate-500 italic text-sm">{item.notes || '-'}</td>
                        <td className="p-5 text-right font-black text-indigo-600 text-2xl">{calculateQty(item)}</td>
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