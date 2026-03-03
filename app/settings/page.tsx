"use client";
import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';

export default function SettingsPage() {
  const [settings, setSettings] = useState({ term_start_date: '', term_end_date: '', club_day_of_week: 3 });

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      const { data } = await supabase.from('user_settings').select('*').eq('user_id', user?.id).single();
      if (data) setSettings(data);
    }
    load();
  }, []);

  const save = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    await supabase.from('user_settings').upsert({ user_id: user?.id, ...settings });
    alert("Settings saved!");
  };

  return (
    <div className="min-h-screen bg-slate-50 p-12">
      <div className="max-w-md mx-auto bg-white p-10 rounded-[2.5rem] shadow-xl border border-slate-100">
        <h1 className="text-2xl font-black text-slate-900 uppercase italic mb-8">Term Settings</h1>
        <div className="space-y-6">
           <div>
              <label className="text-[10px] font-black uppercase text-slate-400 block mb-2">Club Day</label>
              <select value={settings.club_day_of_week} onChange={e => setSettings({...settings, club_day_of_week: Number(e.target.value)})} className="w-full p-4 bg-slate-50 rounded-2xl font-bold">
                 <option value="1">Monday</option><option value="2">Tuesday</option><option value="3">Wednesday</option><option value="4">Thursday</option><option value="5">Friday</option>
              </select>
           </div>
           <div>
              <label className="text-[10px] font-black uppercase text-slate-400 block mb-2">Term Start</label>
              <input type="date" value={settings.term_start_date} onChange={e => setSettings({...settings, term_start_date: e.target.value})} className="w-full p-4 bg-slate-50 rounded-2xl font-bold" />
           </div>
           <div>
              <label className="text-[10px] font-black uppercase text-slate-400 block mb-2">Term End</label>
              <input type="date" value={settings.term_end_date} onChange={e => setSettings({...settings, term_end_date: e.target.value})} className="w-full p-4 bg-slate-50 rounded-2xl font-bold" />
           </div>
           <button onClick={save} className="w-full bg-indigo-600 text-white p-4 rounded-2xl font-black uppercase tracking-widest text-xs shadow-lg shadow-indigo-100">Save Configuration</button>
        </div>
      </div>
    </div>
  );
}