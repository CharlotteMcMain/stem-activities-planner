"use client";
export const dynamic = "force-dynamic";
import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useSearchParams } from 'next/navigation';

const DISCIPLINE_COLORS: any = {
  Physics: 'bg-blue-600',
  Chemistry: 'bg-indigo-600',
  Biology: 'bg-emerald-600',
  Engineering: 'bg-amber-600',
  Maths: 'bg-rose-600',
  Other: 'bg-slate-600'
};

const DISCIPLINE_LIGHT: any = {
  Physics: 'bg-blue-50 text-blue-600 border-blue-100',
  Chemistry: 'bg-indigo-50 text-indigo-600 border-indigo-100',
  Biology: 'bg-emerald-50 text-emerald-600 border-emerald-100',
  Engineering: 'bg-amber-50 text-amber-600 border-amber-100',
  Maths: 'bg-rose-50 text-rose-600 border-rose-100',
  Other: 'bg-slate-50 text-slate-600 border-slate-100'
};

export default function LibraryPage() {
  const searchParams = useSearchParams();
  const activityIdFromUrl = searchParams.get('id');

  const [activities, setActivities] = useState<any[]>([]);
  const [selected, setSelected] = useState<any>(null);
  const [discipline, setDiscipline] = useState('All');
  const [ageRange, setAgeRange] = useState('All');
  const [pupils, setPupils] = useState(30);
  const [groupSize, setGroupSize] = useState(4);
  const [loading, setLoading] = useState(true);
  const [mySchedule, setMySchedule] = useState<any[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [termSettings, setTermSettings] = useState<any>(null);

  useEffect(() => {
    async function load() {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      const { data: acts } = await supabase.from('activities').select(`*, activities_equipment!linked_activity (unit_type, ratio, min_quantity, notes, equipment_master_list!master_item_id ( item_title, type )), lesson_steps!linked_activity ( step_title, step_duration, step_order, step_notes )`);
      if (user) {
        const { data: sched } = await supabase.from('user_schedules').select('*').eq('user_id', user.id);
        const { data: setts } = await supabase.from('user_settings').select('*').eq('user_id', user.id).single();
        setMySchedule(sched || []);
        setTermSettings(setts);
      }
      setActivities(acts || []);
      if (activityIdFromUrl && acts) {
        const found = acts.find(a => a.activity_id.toString() === activityIdFromUrl);
        if (found) setSelected(found);
      }
      setLoading(false);
    }
    load();
  }, [activityIdFromUrl]);

  const isAlreadyPlanned = (id: any) => mySchedule.some(s => s.activity_id === id);

  const calculateQty = (item: any) => {
    const { unit_type, ratio, min_quantity } = item;
    let qty = 0;
    const cleanUnit = unit_type?.toLowerCase().trim();
    if (cleanUnit === 'per class' || cleanUnit === 'per_class') qty = 1;
    if (cleanUnit === 'per pupil' || cleanUnit === 'per_pupil') qty = pupils * ratio;
    if (cleanUnit === 'per group' || cleanUnit === 'per_group') qty = Math.ceil(pupils / groupSize) * ratio;
    return Math.max(Math.ceil(qty), min_quantity || 0);
  };

  const getAvailableDates = () => {
    if (!termSettings?.term_start_date || !termSettings?.term_end_date) return [];
    let dates = [];
    let current = new Date(termSettings.term_start_date);
    let end = new Date(termSettings.term_end_date);
    while (current <= end) {
      if (current.getDay() === Number(termSettings.club_day_of_week)) {
        dates.push(new Date(current).toISOString().split('T')[0]);
      }
      current.setDate(current.getDate() + 1);
    }
    return dates;
  };

  const handleAssign = async (date: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    await supabase.from('user_schedules').upsert({ user_id: user?.id, activity_id: selected.activity_id, scheduled_date: date, planned_pupils: pupils, planned_group_size: groupSize }, { onConflict: 'user_id,scheduled_date' });
    setIsModalOpen(false);
    window.location.reload(); 
  };

  const filteredActivities = activities.filter(a => {
    const discMatch = discipline === 'All' || a.discipline.toLowerCase() === discipline.toLowerCase();
    const ageMatch = ageRange === 'All' || (a.age_min <= parseInt(ageRange) && a.age_max >= parseInt(ageRange));
    return discMatch && ageMatch;
  });

  const totalDuration = selected?.lesson_steps?.reduce((acc: number, step: any) => acc + step.step_duration, 0) || 1;

  return (
    <div className="h-[calc(100vh-60px)] flex bg-white font-sans text-slate-900 overflow-hidden text-sm">
      
      {/* SIDEBAR */}
      <aside className="w-1/4 border-r border-slate-200 bg-slate-50 flex flex-col flex-shrink-0">
        <div className="p-4 border-b border-slate-200 space-y-4">
          <div>
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 block">Filter Discipline</label>
            <select value={discipline} onChange={(e) => setDiscipline(e.target.value)} className="w-full p-2.5 bg-white border border-slate-200 rounded-xl font-bold text-indigo-600 outline-none">
              <option value="All">All Disciplines</option>
              <option value="Biology">Biology</option>
              <option value="Chemistry">Chemistry</option>
              <option value="Physics">Physics</option>
              <option value="Engineering">Engineering</option>
            </select>
          </div>
          <div>
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 block">Age Filter</label>
            <select value={ageRange} onChange={(e) => setAgeRange(e.target.value)} className="w-full p-2.5 bg-white border border-slate-200 rounded-xl font-bold text-indigo-600 outline-none">
              <option value="All">Any Age</option>
              <option value="7">Year 3/4</option>
              <option value="10">Year 5/6</option>
              <option value="12">Year 7/8</option>
              <option value="14">Year 10+</option>
            </select>
          </div>
          <div className="bg-white p-3 rounded-xl border border-slate-200 space-y-2">
              <div className="flex justify-between text-[10px] font-black text-slate-400 uppercase">
                  <span>{pupils} Pupils</span>
                  <span className="text-indigo-600 font-black">{Math.ceil(pupils/groupSize)} Groups</span>
              </div>
              <input type="range" min="1" max="10" value={groupSize} onChange={(e) => setGroupSize(Number(e.target.value))} className="w-full accent-indigo-600 h-1" />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-2 bg-white">
          {filteredActivities.map((a) => (
            <button key={a.activity_id} onClick={() => setSelected(a)} className={`w-full p-4 rounded-xl text-left transition-all mb-1 ${selected?.activity_id === a.activity_id ? (DISCIPLINE_COLORS[a.discipline] || 'bg-slate-600') + ' text-white shadow-lg scale-[1.01]' : 'hover:bg-slate-50 text-slate-600'}`}>
              <div className={`text-[9px] font-black uppercase mb-0.5 ${selected?.activity_id === a.activity_id ? 'text-white/60' : 'text-indigo-400'}`}>{a.discipline}</div>
              <div className="font-black leading-tight text-base uppercase italic tracking-tighter">{a.activity_title}</div>
            </button>
          ))}
        </div>
      </aside>

      {/* CONTENT AREA */}
      <section className="flex-1 h-full overflow-y-auto p-8 bg-slate-100/30 scroll-smooth">
        {selected ? (
          <div className="max-w-4xl mx-auto space-y-4 pb-20 animate-in fade-in duration-300">
            
            <div className="bg-white rounded-2xl border border-slate-200 p-8 shadow-sm">
              <div className="flex justify-between items-start mb-6">
                  <div className="space-y-1">
                      <div className="flex gap-2">
                          <span className={`${DISCIPLINE_LIGHT[selected.discipline]} px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-widest border`}>{selected.discipline}</span>
                          <span className="bg-slate-50 text-slate-400 px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-widest italic border border-slate-200">Ages {selected.age_min}-{selected.age_max}</span>
                      </div>
                      <h2 className="text-4xl font-black text-slate-900 tracking-tighter uppercase italic leading-none">{selected.activity_title}</h2>
                  </div>
                  <div className="flex flex-col gap-2 shrink-0">
                      <div className="flex gap-2">
                          <a href={selected.drive_slides_url} target="_blank" className="bg-slate-900 text-white px-4 py-2 rounded-lg text-xs font-black uppercase tracking-widest hover:bg-black transition-all shadow-sm">Slides</a>
                          <a href={selected.drive_worksheets_url} target="_blank" className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-xs font-black uppercase tracking-widest hover:bg-indigo-700 transition-all shadow-sm">Sheets</a>
                      </div>
                      <button disabled={isAlreadyPlanned(selected.activity_id)} onClick={() => setIsModalOpen(true)} className={`w-full px-4 py-2 rounded-lg text-xs font-black uppercase tracking-widest transition-all ${isAlreadyPlanned(selected.activity_id) ? 'bg-slate-100 text-slate-400 border border-slate-200' : 'bg-emerald-500 text-white hover:bg-emerald-600 shadow-md shadow-emerald-100'}`}>
                          {isAlreadyPlanned(selected.activity_id) ? 'Activity Planned' : 'Assign to Term'}
                      </button>
                  </div>
              </div>
              <p className="text-slate-500 text-sm leading-relaxed border-t border-slate-100 pt-4 font-medium italic">"{selected.description}"</p>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
                <div className="flex justify-between items-center mb-6">
                    <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Time-Proportional Roadmap</h3>
                    <span className="text-[10px] font-black text-indigo-600 uppercase tracking-widest">{totalDuration}m Session Total</span>
                </div>
                <div className="w-full flex h-10 rounded-xl overflow-hidden border border-slate-100">
                    {selected.lesson_steps?.sort((a:any, b:any) => a.step_order - b.step_order).map((step:any, i:number) => (
                        <div key={i} style={{ width: `${(step.step_duration / totalDuration) * 100}%` }} className={`${i % 2 === 0 ? DISCIPLINE_COLORS[selected.discipline] || 'bg-indigo-600' : 'bg-slate-800'} border-r border-white/10 last:border-0 h-full flex items-center justify-center`}>
                            <div className="text-[10px] font-black text-white uppercase truncate px-2">{step.step_title}</div>
                        </div>
                    ))}
                </div>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="px-6 py-3 bg-slate-50 border-b border-slate-100">
                    <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Required Kit ({pupils} Pupils)</h3>
                </div>
                <table className="w-full text-left">
                    <tbody className="divide-y divide-slate-50">
                        {selected.activities_equipment?.map((item: any, i: number) => (
                        <tr key={i} className="hover:bg-slate-50/50 transition-colors">
                            <td className="p-4 pl-8">
                                <div className="font-black text-slate-800 text-base uppercase italic tracking-tighter">{item.equipment_master_list?.item_title}</div>
                                <span className={`text-[8px] font-black px-1.5 py-0.5 rounded uppercase border ${item.equipment_master_list?.type?.toLowerCase().includes('consumable') ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-indigo-50 text-indigo-600 border-indigo-100'}`}>{item.equipment_master_list?.type}</span>
                            </td>
                            <td className="p-4 text-slate-400 italic text-xs leading-tight font-medium">{item.notes || 'Standard setup.'}</td>
                            <td className="p-4 pr-8 text-right font-black text-indigo-600 text-2xl tracking-tighter">{calculateQty(item)}</td>
                        </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="px-6 py-3 bg-slate-50 border-b border-slate-100">
                    <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Detailed Instructions</h3>
                </div>
                <div className="p-8 space-y-10">
                    {selected.lesson_steps?.sort((a:any, b:any) => a.step_order - b.step_order).map((step:any, i:number) => (
                        <div key={i} className="flex gap-10 items-start">
                            <div className="flex-shrink-0 w-32 border-r border-slate-100 pr-6">
                                <div className="text-[10px] font-black text-slate-400 uppercase mb-1">Step {i+1}</div>
                                <div className={`text-base font-black ${DISCIPLINE_LIGHT[selected.discipline]?.split(' ')[1] || 'text-indigo-600'} uppercase italic leading-none`}>{step.step_title}</div>
                                <div className="text-[10px] font-bold text-slate-400 uppercase mt-1">{step.step_duration}m</div>
                            </div>
                            <div className="flex-1 text-sm text-slate-600 leading-relaxed whitespace-pre-line font-medium pt-0.5">{step.step_notes}</div>
                        </div>
                    ))}
                </div>
            </div>
          </div>
        ) : (
          <div className="h-full flex items-center justify-center text-slate-300 font-black italic uppercase tracking-widest text-2xl">Select a Session</div>
        )}
      </section>

      {/* MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-6">
           <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl p-10">
              <h2 className="text-xl font-black uppercase italic mb-8 border-b border-slate-100 pb-4 tracking-tighter">Assign Session</h2>
              <div className="space-y-2 max-h-64 overflow-y-auto mb-8 pr-2">
                 {getAvailableDates().map(date => {
                    const alreadyAssigned = mySchedule.find(s => s.scheduled_date === date);
                    return (
                        <button key={date} onClick={() => handleAssign(date)} className="w-full flex items-center justify-between p-4 bg-slate-50 hover:bg-indigo-50 rounded-xl border border-slate-100 transition-colors group">
                            <div className="text-left font-black uppercase italic">
                                <div className="text-[10px] text-slate-400 mb-1">{new Date(date).toLocaleDateString('en-GB', { weekday: 'short' })}</div>
                                <div className="text-sm text-slate-700 tracking-tighter">{new Date(date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}</div>
                            </div>
                            {alreadyAssigned ? <span className="text-[10px] font-black text-amber-500 uppercase">Replace</span> : <span className="text-[10px] font-black text-indigo-400 uppercase">Assign</span>}
                        </button>
                    );
                 })}
              </div>
              <button onClick={() => setIsModalOpen(false)} className="w-full text-slate-300 font-bold py-2 uppercase text-[10px] tracking-widest">Close Window</button>
           </div>
        </div>
      )}
    </div>
  );
}