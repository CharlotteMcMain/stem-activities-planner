"use client";
import { useState, useEffect } from 'react';
import { supabase } from './lib/supabase';

export default function StemDashboard() {
  // --- State ---
  const [activities, setActivities] = useState<any[]>([]);
  const [selectedActivity, setSelectedActivity] = useState<any>(null);
  const [discipline, setDiscipline] = useState('All');
  const [pupils, setPupils] = useState(30);
  const [groupSize, setGroupSize] = useState(4);

  // --- Fetch Activities ---
  useEffect(() => {
    async function getData() {
      let query = supabase.from('activities').select(`
        *,
        activity_equipment (
          unit_type, ratio, min_quantity,
          equipment_library ( name, type, unit_price )
        )
      `);

      if (discipline !== 'All') {
        query = query.eq('discipline', discipline);
      }

      const { data } = await query;
      setActivities(data || []);
    }
    getData();
  }, [discipline]);

  // --- Calculations ---
  const calculateQty = (item: any) => {
    const { unit_type, ratio, min_quantity } = item;
    let qty = 0;
    if (unit_type === 'per_class') qty = 1;
    if (unit_type === 'per_pupil') qty = pupils * ratio;
    if (unit_type === 'per_group') qty = Math.ceil(pupils / groupSize) * ratio;
    
    return Math.max(Math.ceil(qty), min_quantity);
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8 text-gray-900">
      <header className="max-w-6xl mx-auto mb-12">
        <h1 className="text-4xl font-bold text-blue-700">STEM Club Planner</h1>
        <p className="text-gray-600">Plan your sessions and calculate equipment instantly.</p>
      </header>

      <main className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-8">
        
        {/* Sidebar Controls */}
        <div className="md:col-span-1 space-y-6 bg-white p-6 rounded-xl shadow-sm h-fit">
          <div>
            <label className="block text-sm font-semibold mb-2">Discipline</label>
            <select 
              className="w-full p-2 border rounded"
              onChange={(e) => setDiscipline(e.target.value)}
            >
              <option>All</option>
              <option>Biology</option>
              <option>Chemistry</option>
              <option>Physics</option>
              <option>Engineering</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-semibold mb-2">Number of Pupils</label>
            <input 
              type="number" 
              value={pupils} 
              onChange={(e) => setPupils(Number(e.target.value))}
              className="w-full p-2 border rounded"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold mb-2">Pupils per Group</label>
            <input 
              type="number" 
              value={groupSize} 
              onChange={(e) => setGroupSize(Number(e.target.value))}
              className="w-full p-2 border rounded"
            />
          </div>
        </div>

        {/* Activity Selection & Details */}
        <div className="md:col-span-3 space-y-6">
          
          {/* Activity List */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {activities.map(activity => (
              <button
                key={activity.id}
                onClick={() => setSelectedActivity(activity)}
                className={`p-4 rounded-lg border text-left transition ${
                  selectedActivity?.id === activity.id 
                  ? 'border-blue-500 bg-blue-50 shadow-md' 
                  : 'bg-white hover:border-blue-300 shadow-sm'
                }`}
              >
                <span className="text-xs font-bold uppercase tracking-wider text-blue-500">{activity.discipline}</span>
                <h3 className="font-bold text-lg block">{activity.title}</h3>
              </button>
            ))}
          </div>

          {/* Equipment Results */}
          {selectedActivity && (
            <div className="bg-white p-8 rounded-xl shadow-lg border-t-4 border-blue-600">
              <div className="flex justify-between items-start mb-6">
                <h2 className="text-2xl font-bold">{selectedActivity.title} Required Kit</h2>
                <div className="space-x-2">
                   <a 
                    href={selectedActivity.drive_ppt_url} 
                    target="_blank" 
                    className="bg-orange-500 text-white px-4 py-2 rounded text-sm font-bold hover:bg-orange-600"
                   >
                     Download PPT
                   </a>
                </div>
              </div>

              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b text-gray-400 uppercase text-xs tracking-widest">
                    <th className="py-3">Item</th>
                    <th className="py-3">Type</th>
                    <th className="py-3 text-right">Qty Needed</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedActivity.activity_equipment.map((item: any, idx: number) => (
                    <tr key={idx} className="border-b hover:bg-gray-50">
                      <td className="py-4 font-medium">{item.equipment_library.name}</td>
                      <td className="py-4">
                        <span className={`px-2 py-1 rounded text-xs ${
                          item.equipment_library.type === 'Consumable' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'
                        }`}>
                          {item.equipment_library.type}
                        </span>
                      </td>
                      <td className="py-4 text-right font-bold text-blue-600">
                        {calculateQty(item)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              
              <p className="mt-6 text-sm text-gray-400 italic">
                * Quantities calculated for {pupils} pupils in groups of {groupSize}.
              </p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}