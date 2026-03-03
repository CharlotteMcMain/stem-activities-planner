"use client";
import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useRouter } from 'next/navigation';

export default function SchedulePage() {
  const [user, setUser] = useState<any>(null);
  const [mySchedule, setMySchedule] = useState<any[]>([]);
  const [activities, setActivities] = useState<any[]>([]);
  const [settings, setSettings] = useState({ term_start_date: '', term_end_date: '', club_day_of_week: 3 });
  const router = useRouter();

  const loadData = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return router.push('/login');
    setUser(user);

    const { data: setts } = await supabase.from('user_settings').select('*').eq('user_id', user.id).single();
    if (setts) setSettings(setts);

    const { data: acts } = await supabase.from('activities').select('activity_id, activity_title');
    setActivities(acts || []);

    const { data: sched } = await supabase.from('user_schedules').select('*').eq('user_id', user.id).order('scheduled_date', { ascending: true });
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
    const { error } = await supabase.from('user_schedules').upsert({
      user_id: user.id,
      scheduled_date: date,
      [field]: value
    }, { onConflict: 'user_id,scheduled_date' });
    
    if (error) alert(error.message);
    loadData(); // Refresh list
  };

  const dates = generateDates();

  return (
    <div className="h-[calc(100vh-60px)] flex flex-col bg-slate-50 font-sans overflow-hidden">
      <header className="p-8 pb-4 flex justify-between items-center max-w-6xl mx-auto w-full">
         <h1 className="text-4xl font-black text-slate-900 tracking-tighter uppercase italic">My Lab Schedule</h1>
      </header>

      <main className="flex-1 overflow-y-auto px-8 pb-20">
        <div className="max-w-6xl mx-auto space-y-3">
          {dates.map((date) => {
            const row = mySchedule.find(s => s.scheduled_date === date);
            return (
              <div key={date} className={`flex items-center justify-between p-6 bg-white rounded-2xl border transition-all ${row?.is_completed ? 'opacity-50 grayscale' : 'shadow-sm border-slate-100 hover:border-indigo-200'}`}>
                <div className="w-32">
                  <div className="text-[10px] font-black text-slate-400 uppercase leading-none mb-1">{new Date(date).toLocaleDateString('en-GB', { weekday: 'long' })}</div>
                  <div className="text-lg font-black text-slate-800">{new Date(date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}</div>
                </div>

                <div className="flex-1 px-8">
                  <select 
                    value={row?.activity_id || ""}
                    onChange={(e) => updateStatus(date, 'activity_id', e.target.value === "" ? null : e.target.value)}
                    className="w-full p-4 bg-slate-50 border-none rounded-2xl font-bold text-xs text-indigo-600 outline-none cursor-pointer appearance-none"
                  >
                    <option value="">— Unassigned Slot —</option>
                    {activities.map(a => <option key={a.activity_id} value={a.activity_id}>{a.activity_title}</option>)}
                  </select>
                </div>

                <div className="flex items-center gap-3">
                   {row?.activity_id && (
                     <>
                        <button 
                          onClick={() => updateStatus(date, 'kit_ordered', !row.kit_ordered)}
                          className={`px-4 py-2 rounded-xl text-[9px] font-black uppercase transition-all border ${row.kit_ordered ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-slate-300 border-slate-200'}`}
                        >
                          Kit {row.kit_ordered ? 'Ordered' : 'Order Now'}
                        </button>
                        <button 
                          onClick={() => updateStatus(date, 'is_completed', !row.is_completed)}
                          className={`px-4 py-2 rounded-xl text-[9px] font-black uppercase transition-all border ${row.is_completed ? 'bg-emerald-500 text-white border-emerald-500' : 'bg-white text-slate-300 border-slate-200'}`}
                        >
                          {row.is_completed ? 'Completed' : 'Mark Done'}
                        </button>
                     </>
                   )}
                </div>
              </div>
            );
          })}
          {dates.length === 0 && (
            <div className="text-center p-20 bg-white rounded-[3rem] border-2 border-dashed border-slate-200 text-slate-300 font-bold uppercase tracking-widest text-xs">
              Go to Settings to define your Term Dates
            </div>
          )}
        </div>
      </main>
    </div>
  );
}