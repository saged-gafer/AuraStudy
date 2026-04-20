import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Save, Plus, Trash2, BookOpen } from 'lucide-react';
import { useApp } from '../context/AppContext';
import GlassCard from '../components/ui/GlassCard';
import Button from '../components/ui/Button';

const Curriculum = () => {
  const { subjects, updateSubject } = useApp();
  const [selected, setSelected] = useState(subjects[0]?.id);
  const [tab, setTab] = useState('notes');
  const sub = subjects.find(s => s.id === selected);
  const [val, setVal] = useState(sub?.notes || '');

  useEffect(() => {
    setVal(sub?.notes || '');
  }, [selected, sub]);

  const handleUpdate = (updates) => {
    updateSubject({ ...sub, ...updates });
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="grid grid-cols-1 lg:grid-cols-12 gap-10"
    >
      <div className="lg:col-span-3 space-y-2">
        <h3 className="text-[10px] font-black uppercase text-indigo-400 mb-4 px-4 tracking-widest">Subjects</h3>
        {subjects.map(s => (
          <button
            key={s.id}
            onClick={() => setSelected(s.id)}
            className={`w-full text-left p-4 rounded-2xl font-bold flex items-center gap-3 transition-all ${
              selected === s.id ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20' : 'text-slate-400 hover:bg-white/5 hover:text-white'
            }`}
          >
            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: s.color }} />
            {s.name}
          </button>
        ))}
      </div>

      <GlassCard className="lg:col-span-9 min-h-[600px] flex flex-col">
        {sub ? (
          <>
            <header className="flex justify-between items-center mb-8 pb-4 border-b border-white/5">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg" style={{ backgroundColor: sub.color + '20', color: sub.color }}>
                  <BookOpen size={20} />
                </div>
                <h3 className="text-2xl font-black text-white">{sub.name} Hub</h3>
              </div>
              <div className="flex bg-white/5 p-1 rounded-xl">
                {['resources', 'expenses', 'notes'].map(t => (
                  <button
                    key={t}
                    onClick={() => setTab(t)}
                    className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase transition-all ${
                      tab === t ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-500 hover:text-white'
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </header>

            <div className="flex-1">
              {tab === 'notes' && (
                <div className="h-full flex flex-col gap-4">
                  <textarea
                    value={val}
                    onChange={e => setVal(e.target.value)}
                    className="flex-1 bg-white/5 rounded-2xl p-6 outline-none resize-none text-slate-300 min-h-[400px] border border-white/5 focus:border-indigo-500 transition-all"
                    placeholder="Mastery notes..."
                  />
                  <div className="flex justify-end">
                    <Button icon={Save} onClick={() => handleUpdate({ notes: val })}>Sync Notes</Button>
                  </div>
                </div>
              )}
              {tab === 'resources' && (
                <ResourcesTab
                  resources={sub.resources || []}
                  update={(r) => handleUpdate({ resources: r })}
                />
              )}
              {tab === 'expenses' && (
                <ExpensesTab
                  expenses={sub.expenses || []}
                  update={(e) => handleUpdate({ expenses: e })}
                />
              )}
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-slate-500 font-bold italic">
            Select a subject to view hub
          </div>
        )}
      </GlassCard>
    </motion.div>
  );
};

const ResourcesTab = ({ resources, update }) => {
  const [t, setT] = useState('');
  const add = () => {
    if (t) {
      update([...resources, { id: Date.now(), title: t }]);
      setT('');
    }
  };
  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <input
          value={t}
          onChange={e => setT(e.target.value)}
          placeholder="Resource title or URL..."
          className="flex-1 bg-white/5 rounded-xl px-4 py-3 border border-white/10 outline-none focus:border-indigo-500 transition-all text-white"
        />
        <Button onClick={add}>Add</Button>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {resources.map(r => (
          <div key={r.id} className="p-4 bg-white/5 rounded-2xl flex justify-between items-center group border border-white/5 hover:border-indigo-500/30 transition-all">
            <span className="text-sm font-bold text-slate-300">{r.title}</span>
            <button
              onClick={() => update(resources.filter(x => x.id !== r.id))}
              className="opacity-0 group-hover:opacity-100 text-red-500 transition-opacity"
            >
              <Trash2 size={16} />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};

const ExpensesTab = ({ expenses, update }) => {
  const [item, setItem] = useState('');
  const [cost, setCost] = useState('');
  const add = () => {
    if (item && cost) {
      update([...expenses, { id: Date.now(), item, cost: parseFloat(cost) }]);
      setItem('');
      setCost('');
    }
  };
  const total = expenses.reduce((s, e) => s + e.cost, 0);
  return (
    <div className="space-y-6">
      <div className="p-6 bg-indigo-600/10 border border-indigo-600/20 rounded-2xl flex justify-between items-center">
        <span className="text-xs font-black uppercase tracking-widest text-indigo-400">Total Investment</span>
        <span className="text-3xl font-black text-white">${total.toFixed(2)}</span>
      </div>
      <div className="flex gap-2">
        <input
          value={item}
          onChange={e => setItem(e.target.value)}
          placeholder="Expense item..."
          className="flex-1 bg-white/5 rounded-xl px-4 py-3 border border-white/10 outline-none focus:border-indigo-500 transition-all text-white"
        />
        <input
          value={cost}
          onChange={e => setCost(e.target.value)}
          type="number"
          placeholder="Cost $"
          className="w-24 bg-white/5 rounded-xl px-4 py-3 border border-white/10 outline-none focus:border-indigo-500 transition-all text-white"
        />
        <Button onClick={add}>Log</Button>
      </div>
      <div className="space-y-2">
        {expenses.map(e => (
          <div key={e.id} className="p-4 bg-white/5 rounded-2xl flex justify-between items-center border border-white/5 group">
            <span className="text-slate-300">{e.item}</span>
            <div className="flex items-center gap-4">
              <span className="font-black text-indigo-400">${e.cost.toFixed(2)}</span>
              <button
                onClick={() => update(expenses.filter(x => x.id !== e.id))}
                className="opacity-0 group-hover:opacity-100 text-red-500 transition-opacity"
              >
                <Trash2 size={16} />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Curriculum;
