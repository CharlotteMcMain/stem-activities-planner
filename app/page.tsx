"use client";
import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

export default function Home() {
  const [activities, setActivities] = useState([]);
  const [selected, setSelected] = useState(null);
  const [pupils, setPupils] = useState(30);

  useEffect(() => {
    async function load() {
      const { data } = await supabase.from('activities').select(`
        *,
        activity_equipment (
          unit_type, ratio, min_quantity,
          equipment_library ( name, type )
        )
      `);
      setActivities(data || []);
    }
    load();
  }, []);

  return (
    <div className="p-10 font-sans">
      <h1 className="text-3xl font-bold mb-6">STEM Planner</h1>
      <input 
        type="number" 
        value={pupils} 
        onChange={(e) => setPupils(Number(e.target.value))}
        className="border p-2 mb-6" 
        placeholder="Pupils"
      />
      
      <div className="grid grid-cols-2 gap-10">
        <div className="space-y-4">
          {activities.map((a) => (
            <button key={a.id} onClick={() => setSelected(a)} className="block w-full text-left p-4 border rounded hover:bg-gray-50">
              {a.title}
            </button>
          ))}
        </div>

        {selected && (
          <div className="border p-6 rounded shadow">
            <h2 className="text-xl font-bold mb-4">{selected.title}</h2>
            <ul>
              {selected.activity_equipment.map((item, i) => (
                <li key={i} className="mb-2">
                  {item.equipment_library.name}: 
                  <span className="font-bold ml-2">
                    {item.unit_type === 'per_class' ? Math.max(1, item.min_quantity) : Math.max(item.pupils * item.ratio, item.min_quantity)}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}