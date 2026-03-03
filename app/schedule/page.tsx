"use client";
export const dynamic = "force-dynamic";
import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

const DISCIPLINE_COLORS: any = {
  Physics: 'bg-blue-600',
  Chemistry: 'bg-indigo-600',
  Biology: 'bg-emerald-600',
  Engineering: 'bg-amber-600',
  Maths: 'bg-rose-600',
  Other: 'bg-slate-600'
};

const DISCIPLINE_LIGHT: any = {
  Physics: 'bg-blue-50 text-blue-600',
  Chemistry: 'bg-indigo-50 text-indigo-600',
  Biology: 'bg-emerald-50 text-emerald-600',
  Engineering: 'bg-amber-50 text-amber-600',
  Maths: 'bg-rose-50 text-rose-600',
  Other: 'bg-slate-50 text-slate-600'
};

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

    // Fetch settings
    const { data: setts } = await supabase.from('user_settings').select('*').eq('user_id', user.id).single();
    if (setts) setSettings(setts);

    // Fetch all activities for the "Unassigned" dropdowns
    const { data: acts } = await supabase.from('activities').select('activity_id, activity_title');
    setActivities(acts || []);

    // Fetch detailed schedule including equipment logic
    const { data: sched } = await supabase.from('user_schedules').select(`
      *,
      activities (
        activity_id,
        activity_title,
        description,
        activity_time,
        drive_slides_url,
        drive_worksheets_url,
        activities_equipment!linked_activity (
          unit_type, ratio, min_quantity, notes,
          equipment_master_list!master_item_id ( item_title, type )
        )
      )
    `).eq('user_id', user.id).order('scheduled_date', { ascending: true });
    
    setMySchedule(sched || []);
  };

  useEffect(() => { loadData(); }, []);

  const generateDates = () => {
    if (!settings.term_start_date || !settings.term_end_date) return [];
    let dates = [];
    let current = new Date(settings.term_start_date);
    let end = new Date(settings.term_end_date);
    while (current <= end) {
      if (current.getDay() === Number(settings.club_day_of_week)) {
        dates.push(new Date(current).toISOString().split('T')[0]);
      }
      current.setDate(current.getDate() + 1);
    }
    return dates;
  };

  const updateStatus = async (date: string, field: string, value: any) => {
    await supabase.from('user_schedules').upsert({
      user_id: user.id,
      scheduled_date: date,
      [field]: value
    }, { onConflict: 'user_id,scheduled_date' });
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
    <div className="h-[calc(100vh-60px)] flex flex-col bg-slate-50 font-sans overflow-hidden text-[11px]">
      <header className="p-8 pb-4 flex justify-between items-center max-w-6xl mx-auto w-full">
         <h1 className="text-4xl font-black text-slate-900 tracking-tighter uppercase italic">My Lab Schedule</h1>
         <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest bg-white px-4 py-2 rounded-full border border-slate-100 shadow-sm">
            {mySchedule.filter(s => s.activity_id).length} Sessions Planned
         </div>
      </header>

      <main className="flex-1 overflow-y-auto px-8 pb-20 scroll-smooth">
        <div className="max-w-6xl mx-auto space-y-3">
          {dates.map((date) => {
            const row = mySchedule.find(s => s.scheduled_date === date);
            const isExpanded = expandedDate === date;
            const activity = row?.activities;

            return (
              <div key={date} className={`bg-white rounded-[1.5rem] border transition-all overflow-hidden ${row?.is_completed ? 'opacity-50 grayscale' : 'shadow-sm border-slate-100'}`}>
                
                {/* 1. COMPACT ROW HEADER */}
                <div 
                  className="p-5 flex items-center justify-between cursor-pointer hover:bg-slate-50/50"
                  onClick={() => setExpandedDate(isExpanded ? null : date)}
                >
                  <div className="w-28 flex shrink-0 items-center gap-4">
                    <div className="text-center">
                        <div className="text-[8px] font-black text-slate-300 uppercase leading-none mb-1">{new Date(date).toLocaleDateString('en-GB', { weekday: 'short' })}</div>
                        <div className="text-base font-black text-slate-800 tracking-tighter">{new Date(date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}</div>
                    </div>
                    <div className={`transition-transform duration-300 text-slate-300 text-[8px] ${isExpanded ? 'rotate-180' : ''}`}>▼</div>
                  </div>

                  <div className="flex-1 px-6">
                    {row?.activity_id ? (
                        <div className="space-y-1">
                            <div className="text-lg font-black italic uppercase tracking-tighter text-indigo-600 leading-none">{activity?.activity_title}</div>
                            <div className="flex gap-4">
                                <div className="flex items-center gap-1">
                                    <span className="text-[7px] font-black uppercase text-slate-300 tracking-widest">Time:</span>
                                    <span className="text-[9px] font-bold text-slate-500 uppercase">{activity?.activity_time}m</span>
                                </div>
                                <div className="flex items-center gap-1">
                                    <span className="text-[7px] font-black uppercase text-slate-300 tracking-widest">Class:</span>
                                    <span className="text-[9px] font-bold text-slate-500 uppercase">{row.planned_pupils} Pupils</span>
                                </div>
                                <div className="flex items-center gap-1">
                                    <span className="text-[7px] font-black uppercase text-slate-300 tracking-widest">Setup:</span>
                                    <span className="text-[9px] font-bold text-slate-500 uppercase">Groups of {row.planned_group_size}</span>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <select 
                            value=""
                            onClick={(e) => e.stopPropagation()}
                            onChange={(e) => updateStatus(date, 'activity_id', e.target.value)}
                            className="w-full p-2.5 bg-slate-50 rounded-xl font-bold text-slate-400 outline-none appearance-none text-[10px]"
                        >
                            <option value="">— Unassigned Slot —</option>
                            {activities.map(a => <option key={a.activity_id} value={a.activity_id}>{a.activity_title}</option>)}
                        </select>
                    )}
                  </div>

                  <div className="flex items-center gap-3" onClick={(e) => e.stopPropagation()}>
                     {row?.activity_id && (
                        <div className="flex gap-2">
                            <button onClick={() => updateStatus(date, 'kit_ordered', !row.kit_ordered)} className={`px-3 py-1.5 rounded-lg text-[8px] font-black uppercase transition-all border ${row.kit_ordered ? 'bg-indigo-600 text-white border-indigo-600 shadow-md' : 'bg-white text-slate-300 border-slate-200'}`}>
                                Kit {row.kit_ordered ? 'Ordered' : 'Not Ordered'}
                            </button>
                            <button onClick={() => updateStatus(date, 'is_completed', !row.is_completed)} className={`px-3 py-1.5 rounded-lg text-[8px] font-black uppercase transition-all border ${row.is_completed ? 'bg-emerald-500 text-white border-emerald-500 shadow-md' : 'bg-white text-slate-300 border-slate-200'}`}>
                                {row.is_completed ? 'Finished' : 'Mark Done'}
                            </button>
                        </div>
                     )}
                  </div>
                </div>

                {/* 2. DROPDOWN CONTENT */}
                {isExpanded && activity && (
                  <div className="px-10 pb-10 pt-6 bg-slate-50/50 border-t border-slate-100 animate-in slide-in-from-top-1 duration-200">
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                        
                        {/* LEFT: Info & Links */}
                        <div className="lg:col-span-1 space-y-4">
                            <div>
                                <h4 className="text-[8px] font-black uppercase text-slate-400 mb-2 tracking-[0.2em]">Session Overview</h4>
                                <p className="text-slate-500 leading-relaxed text-[10px] line-clamp-6">{activity.description}</p>
                            </div>
                            <div className="grid grid-cols-2 gap-2 pt-2">
                                <a href={activity.drive_slides_url} target="_blank" className="bg-slate-800 text-white p-2.5 rounded-lg text-center font-black uppercase text-[8px] hover:bg-black">Slides</a>
                                <a href={activity.drive_worksheets_url} target="_blank" className="bg-indigo-600 text-white p-2.5 rounded-lg text-center font-black uppercase text-[8px] hover:bg-indigo-700">Worksheets</a>
                                <Link 
                                  href={`/library?id=${activity.activity_id}`} 
                                  className="col-span-2 border-2 border-indigo-100 bg-white text-indigo-600 p-2.5 rounded-lg text-center font-black uppercase text-[8px] hover:border-indigo-600 transition-all"
                                >
                                  Open in Session Library →
                                </Link>
                            </div>
                        </div>

                        {/* RIGHT: Kits */}
                        <div className="lg:col-span-2 grid grid-cols-2 gap-4">
                            <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm">
                                <div className="flex justify-between items-center mb-4 border-b border-emerald-50 pb-2">
                                    <h4 className="text-[9px] font-black uppercase text-emerald-500 tracking-widest">Consumables</h4>
                                    <span className="text-[7px] font-bold text-slate-300 uppercase">To Buy</span>
                                </div>
                                <ul className="space-y-2">
                                    {activity.activities_equipment?.filter((e:any) => e.equipment_master_list?.type?.toLowerCase().trim().includes('consumable')).map((item:any, i:number) => (
                                        <li key={i} className="flex justify-between items-center text-[10px]">
                                            <span className="font-bold text-slate-700">{item.equipment_master_list.item_title}</span>
                                            <span className="bg-emerald-50 text-emerald-600 px-2 py-0.5 rounded-md font-black">{calculateQty(item, row.planned_pupils, row.planned_group_size)}</span>
                                        </li>
                                    ))}
                                    {activity.activities_equipment?.filter((e:any) => e.equipment_master_list?.type?.toLowerCase().trim().includes('consumable')).length === 0 && (
                                        <li className="text-[9px] text-slate-300 italic text-center py-4 uppercase">No consumables</li>
                                    )}
                                </ul>
                            </div>

                            <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm">
                                <div className="flex justify-between items-center mb-4 border-b border-indigo-50 pb-2">
                                    <h4 className="text-[9px] font-black uppercase text-indigo-500 tracking-widest">Equipment</h4>
                                    <span className="text-[7px] font-bold text-slate-300 uppercase">In Lab</span>
                                </div>
                                <ul className="space-y-2">
                                    {activity.activities_equipment?.filter((e:any) => !e.equipment_master_list?.type?.toLowerCase().trim().includes('consumable')).map((item:any, i:number) => (
                                        <li key={i} className="flex justify-between items-center text-[10px]">
                                            <span className="font-bold text-slate-700">{item.equipment_master_list.item_title}</span>
                                            <span className="bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded-md font-black">{calculateQty(item, row.planned_pupils, row.planned_group_size)}</span>
                                        </li>
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
          
          {dates.length === 0 && (
            <div className="text-center p-20 bg-white rounded-[2rem] border-2 border-dashed border-slate-200 text-slate-300 font-bold uppercase tracking-widest">
              Assign dates in Settings to view your schedule
            </div>
          )}
        </div>
      </main>
    </div>
  );
}