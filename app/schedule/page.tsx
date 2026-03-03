"use client";
export const dynamic = "force-dynamic";
import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function SchedulePage() {
  const [user, setUser] = useState<any>(null);
  const [mySchedule, setMySchedule] = useState<any[]>([]);
  const [activities, setActivities] = useState<any[]>([]);
  const [settings, setSettings] = useState({ term_start_date: '', term_end_date: '', club_day_of_week: 3 });
  const [expandedDate, setExpandedDate] = useState<string | null>(null);
  const router = useRouter();

  const loadData = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return router.push('/login');
    setUser(user);
    const { data: setts } = await supabase.from('user_settings').select('*').eq('user_id', user.id).single();
    if (setts) setSettings(setts);
    const { data: acts } = await supabase.from('activities').select('activity_id, activity_title');
    setActivities(acts || []);
    const { data: sched } = await supabase.from('user_schedules').select(`*, activities (activity_id, activity_title, description, activity_time, drive_slides_url, drive_worksheets_url, activities_equipment!linked_activity (unit_type, ratio, min_quantity, notes, equipment_master_list!master_item_id ( item_title, type )))`).eq('user_id', user.id).order('scheduled_date', { ascending: true });
    setMySchedule(sched || []);
  };

  useEffect(() => { loadData(); }, []);

  const generateDates = () => {
    if (!settings.term_start_date || !settings.term_end_date) return [];
    let dates = [];
    let current = new Date(settings.term_start_date);
    let end = new Date(settings.term_end_date);
    while (current <= end) {
      if (current.getDay() === Number(settings.club_day_of_week)) dates.push(new Date(current).toISOString().split('T')[0]);
      current.setDate(current.getDate() + 1);
    }
    return dates;
  };

  const updateStatus = async (date: string, field: string, value: any) => {
    await supabase.from('user_schedules').upsert({ user_id: user.id, scheduled_date: date, [field]: value }, { onConflict: 'user_id,scheduled_date' });
    loadData();
  };

  const calculateQty = (item: any, pupils: number, groupSize: number) => {
    const { unit_type, ratio, min_quantity } = item;
    let qty = 0;
    const cleanUnit = unit_type?.toLowerCase().trim();
    if (cleanUnit === 'per class' || cleanUnit === 'per_class') qty = 1;
    if (cleanUnit === 'per pupil' || cleanUnit === 'per_pupil') qty = pupils * ratio;
    if (cleanUnit === 'per group' || cleanUnit === 'per_group') qty = Math.ceil(pupils / groupSize) * ratio;
    return Math.max(Math.ceil(qty), min_quantity || 0);
  };

  const dates = generateDates();

  return (
    <div className="h-[calc(100vh-60px)] flex flex-col bg-slate-50 font-sans overflow-hidden text-sm">
      <header className="p-8 pb-4 flex justify-between items-center max-w-6xl mx-auto w-full">
         <h1 className="text-4xl font-black text-slate-900 tracking-tighter uppercase italic leading-none">Lab Schedule</h1>
         <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest bg-white px-4 py-2 rounded-full border border-slate-200 shadow-sm">
            {mySchedule.filter(s => s.activity_id).length} Active Sessions
         </div>
      </header>

      <main className="flex-1 overflow-y-auto px-8 pb-20 scroll-smooth">
        <div className="max-w-6xl mx-auto space-y-3">
          {dates.map((date) => {
            const row = mySchedule.find(s => s.scheduled_date === date);
            const isExpanded = expandedDate === date;
            const activity = row?.activities;

            return (
              <div key={date} className={`bg-white rounded-2xl border transition-all overflow-hidden ${row?.is_completed ? 'opacity-50 grayscale' : 'shadow-sm border-slate-100 hover:border-slate-300'}`}>
                
                <div className="p-5 flex items-center justify-between cursor-pointer" onClick={() => setExpandedDate(isExpanded ? null : date)}>
                  <div className="w-32 flex shrink-0 items-center gap-4 border-r border-slate-100 pr-4">
                    <div className="text-center font-black uppercase italic">
                        <div className="text-[9px] text-slate-400 mb-1 leading-none">{new Date(date).toLocaleDateString('en-GB', { weekday: 'short' })}</div>
                        <div className="text-base text-slate-800 tracking-tighter">{new Date(date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}</div>
                    </div>
                    <div className={`transition-transform duration-300 text-slate-300 text-xs ${isExpanded ? 'rotate-180' : ''}`}>▼</div>
                  </div>

                  <div className="flex-1 px-8">
                    {row?.activity_id ? (
                        <div className="space-y-1">
                            <div className="text-xl font-black italic uppercase tracking-tighter text-indigo-600 leading-none">{activity?.activity_title}</div>
                            <div className="flex gap-4">
                                <div className="flex items-center gap-1">
                                    <span className="text-[8px] font-black uppercase text-slate-400 tracking-widest">Time:</span>
                                    <span className="text-[10px] font-bold text-slate-700 uppercase">{activity?.activity_time}m</span>
                                </div>
                                <div className="flex items-center gap-1 pl-4 border-l border-slate-100">
                                    <span className="text-[8px] font-black uppercase text-slate-400 tracking-widest">Class:</span>
                                    <span className="text-[10px] font-bold text-slate-700 uppercase">{row.planned_pupils} Pupils / Groups of {row.planned_group_size}</span>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <select value="" onClick={(e) => e.stopPropagation()} onChange={(e) => updateStatus(date, 'activity_id', e.target.value)} className="w-full p-2.5 bg-slate-50 rounded-xl font-bold text-slate-400 outline-none text-[10px] uppercase">
                            <option value="">— Click to Assign Session —</option>
                            {activities.map(a => <option key={a.activity_id} value={a.activity_id}>{a.activity_title}</option>)}
                        </select>
                    )}
                  </div>

                  <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                     {row?.activity_id && (
                        <>
                            <button onClick={() => updateStatus(date, 'kit_ordered', !row.kit_ordered)} className={`px-4 py-2 rounded-lg text-[9px] font-black uppercase transition-all border ${row.kit_ordered ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-slate-400 border-slate-200 hover:border-indigo-600'}`}>Kit {row.kit_ordered ? 'Ordered' : 'Ready to Order'}</button>
                            <button onClick={() => updateStatus(date, 'is_completed', !row.is_completed)} className={`px-4 py-2 rounded-lg text-[9px] font-black uppercase transition-all border ${row.is_completed ? 'bg-emerald-50 text-white border-emerald-500' : 'bg-white text-slate-400 border-slate-200 hover:border-emerald-500'}`}>{row.is_completed ? 'Finished' : 'Mark Done'}</button>
                        </>
                     )}
                  </div>
                </div>

                {isExpanded && activity && (
                  <div className="p-10 bg-slate-50/50 border-t border-slate-100 animate-in slide-in-from-top-1 duration-200">
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
                        <div className="lg:col-span-1 space-y-6">
                            <div>
                                <h4 className="text-[10px] font-black uppercase text-slate-400 mb-2 tracking-[0.2em]">Brief</h4>
                                <p className="text-slate-600 leading-relaxed italic font-medium">{activity.description}</p>
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                                <a 
                                  href={activity.drive_slides_url || '#'} 
                                  target={activity.drive_slides_url ? "_blank" : undefined}
                                  className={`p-3 rounded-xl text-center font-black uppercase text-[10px] transition-all shadow-sm ${!activity.drive_slides_url ? 'bg-slate-200 text-slate-400 pointer-events-none' : 'bg-slate-900 text-white hover:scale-105'}`}
                                >
                                  Slides
                                </a>
                                <a 
                                  href={activity.drive_worksheets_url || '#'} 
                                  target={activity.drive_worksheets_url ? "_blank" : undefined}
                                  className={`p-3 rounded-xl text-center font-black uppercase text-[10px] transition-all shadow-sm ${!activity.drive_worksheets_url ? 'bg-slate-200 text-slate-400 pointer-events-none' : 'bg-indigo-600 text-white hover:scale-105'}`}
                                >
                                  Worksheets
                                </a>
                                <Link href={`/library?id=${activity.activity_id}`} className="col-span-2 border-2 border-indigo-100 bg-white text-indigo-600 p-3 rounded-xl text-center font-black uppercase text-[10px] hover:border-indigo-600 transition-all">Details & Steps →</Link>
                            </div>
                        </div>

                        <div className="lg:col-span-2 grid grid-cols-2 gap-6">
                            <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
                                <h4 className="text-[10px] font-black uppercase text-emerald-500 mb-4 tracking-widest border-b border-emerald-50 pb-2 flex justify-between"><span>Consumables</span><span>To Buy</span></h4>
                                <ul className="space-y-3 font-black uppercase italic tracking-tighter">
                                    {activity.activities_equipment?.filter((e:any) => e.equipment_master_list?.type?.toLowerCase().trim().includes('consumable')).map((item:any, i:number) => (
                                        <li key={i} className="flex justify-between items-center text-slate-700"><span>{item.equipment_master_list.item_title}</span><span className="bg-emerald-50 text-emerald-600 px-3 py-1 rounded-lg text-lg leading-none">{calculateQty(item, row.planned_pupils, row.planned_group_size)}</span></li>
                                    ))}
                                    {activity.activities_equipment?.filter((e:any) => e.equipment_master_list?.type?.toLowerCase().trim().includes('consumable')).length === 0 && <li className="text-[10px] text-slate-300 italic text-center py-4 uppercase">No consumables</li>}
                                </ul>
                            </div>
                            <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
                                <h4 className="text-[10px] font-black uppercase text-indigo-500 mb-4 tracking-widest border-b border-indigo-50 pb-2 flex justify-between"><span>Equipment</span><span>In Lab</span></h4>
                                <ul className="space-y-3 font-black uppercase italic tracking-tighter">
                                    {activity.activities_equipment?.filter((e:any) => !e.equipment_master_list?.type?.toLowerCase().trim().includes('consumable')).map((item:any, i:number) => (
                                        <li key={i} className="flex justify-between items-center text-slate-700"><span>{item.equipment_master_list.item_title}</span><span className="bg-indigo-50 text-indigo-600 px-3 py-1 rounded-lg text-lg leading-none">{calculateQty(item, row.planned_pupils, row.planned_group_size)}</span></li>
                                    ))}
                                </ul>
                            </div>
                        </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </main>
    </div>
  );
}