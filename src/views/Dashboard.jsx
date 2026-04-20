import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, CheckCircle2, Timer, AlertCircle, Plus } from 'lucide-react';
import { useApp } from '../context/AppContext';
import GlassCard from '../components/ui/GlassCard';
import Button from '../components/ui/Button';
import AvatarComponent from '../components/AvatarComponent';

const Dashboard = () => {
  const { subjects, tasks, updateSubject, updateTask, addXP, avatarGender, selectedDate } = useApp();
  const [activeTimerSub, setActiveTimerSub] = useState(null);
  const [newTaskTitle, setNewTaskTitle] = useState('');

  const displayedTasks = tasks.filter(t => !t.completed && (!t.dueDate || t.dueDate === selectedDate));

  const handleAddTask = (e) => {
    e.preventDefault();
    if (!newTaskTitle) return;
    const newTask = {
      id: Math.random().toString(36).substr(2, 9),
      title: newTaskTitle,
      completed: false,
      dueDate: selectedDate,
      createdAt: new Date().toISOString()
    };
    updateTask(newTask);
    setNewTaskTitle('');
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-10"
    >
      <header className="flex justify-between items-end">
        <div>
          <p className="text-indigo-400 font-bold uppercase tracking-widest text-[10px]">Flow Status: Optimal</p>
          <h2 className="text-4xl font-black tracking-tighter text-white">
            {selectedDate === new Date().toISOString().split('T')[0] ? 'Daily Workspace' : `Tasks for ${new Date(selectedDate).toLocaleDateString('default', { month: 'short', day: 'numeric' })}`}
          </h2>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
        <div className="lg:col-span-8 grid grid-cols-1 md:grid-cols-2 gap-6">
          {subjects.map(s => (
            <GlassCard key={s.id} className="relative group">
              <div className="flex justify-between mb-4">
                <div className="p-3 rounded-xl" style={{ backgroundColor: s.color + '20', color: s.color }}>
                  <Timer size={20} />
                </div>
                <div className="text-right text-xs font-bold opacity-50 uppercase tracking-widest text-slate-400">
                  Efficiency: {s.actualTime ? Math.round((s.actualTime / (s.actualTime + (s.breakTime || 0))) * 100) : 0}%
                </div>
              </div>
              <h3 className="text-xl font-black mb-1 text-white">{s.name}</h3>
              <p className="text-xs opacity-50 mb-6 uppercase font-bold tracking-tighter text-slate-400">
                Goal: {Math.floor(s.targetTime / 60)}h {s.targetTime % 60}m
              </p>
              <div className="h-1.5 bg-white/5 rounded-full overflow-hidden mb-6">
                <motion.div
                  animate={{ width: `${Math.min(100, (s.actualTime / s.targetTime) * 100)}%` }}
                  className="h-full bg-indigo-500 shadow-[0_0_10px_#6366f1]"
                />
              </div>
              <Button onClick={() => setActiveTimerSub(s)} className="w-full" icon={Play}>Start Session</Button>
            </GlassCard>
          ))}
        </div>

        <div className="lg:col-span-4 space-y-6">
          <GlassCard className="bg-gradient-to-br from-indigo-600 to-purple-700 text-white border-none shadow-indigo-500/20">
            <h4 className="text-xs font-black uppercase tracking-widest mb-2 opacity-70">Focus Zone</h4>
            <div className="text-3xl font-black">{displayedTasks.length} Tasks Pending</div>
          </GlassCard>

          <GlassCard className="flex flex-col min-h-[400px]">
            <div className="flex justify-between items-center mb-6">
              <h4 className="font-black text-white">To-Do List</h4>
              <span className="text-[10px] font-black bg-indigo-500/10 text-indigo-400 px-2 py-1 rounded-md">{displayedTasks.length}</span>
            </div>

            <form onSubmit={handleAddTask} className="flex gap-2 mb-6">
              <input
                value={newTaskTitle}
                onChange={e => setNewTaskTitle(e.target.value)}
                placeholder="Add a task..."
                className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-sm outline-none focus:border-indigo-500 transition-all text-white"
              />
              <button className="p-2 bg-indigo-600 rounded-xl text-white hover:bg-indigo-700 transition-colors">
                <Plus size={20} />
              </button>
            </form>

            <div className="space-y-3 flex-1 overflow-y-auto pr-2">
              {displayedTasks.length > 0 ? (
                displayedTasks.map(t => (
                  <motion.div
                    key={t.id}
                    layout
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="p-3 bg-white/5 rounded-xl border border-white/5 flex items-center justify-between group"
                  >
                    <span className="text-xs font-bold text-slate-300">{t.title}</span>
                    <button
                      onClick={() => updateTask({ ...t, completed: true })}
                      className="opacity-0 group-hover:opacity-100 text-indigo-400 transition-opacity"
                    >
                      <CheckCircle2 size={18} />
                    </button>
                  </motion.div>
                ))
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-center p-6">
                  <AvatarComponent gender={avatarGender} state="idle" className="w-32 h-32 mb-4" />
                  <p className="text-sm font-bold text-slate-500 italic">"All clear! Ready for a break?"</p>
                </div>
              )}
            </div>
          </GlassCard>
        </div>
      </div>

      <AnimatePresence>
        {activeTimerSub && (
          <TimerModal
            sub={activeTimerSub}
            onClose={() => setActiveTimerSub(null)}
            onSave={(actual, brk) => {
              updateSubject({
                ...activeTimerSub,
                actualTime: activeTimerSub.actualTime + actual,
                breakTime: (activeTimerSub.breakTime || 0) + brk,
                sessions: (activeTimerSub.sessions || 0) + 1
              });
              addXP(actual * 2);
              setActiveTimerSub(null);
            }}
          />
        )}
      </AnimatePresence>
    </motion.div>
  );
};

const TimerModal = ({ sub, onClose, onSave }) => {
  const [study, setStudy] = useState(0);
  const [brk, setBrk] = useState(0);
  const [mode, setMode] = useState('study');
  const [running, setRunning] = useState(true);
  const { avatarGender } = useApp();

  useEffect(() => {
    let id;
    if (running) {
      id = setInterval(() => {
        if (mode === 'study') setStudy(s => s + 1);
        else setBrk(b => b + 1);
      }, 1000);
    }
    return () => clearInterval(id);
  }, [running, mode]);

  const format = (s) => `${Math.floor(s / 60).toString().padStart(2, '0')}:${(s % 60).toString().padStart(2, '0')}`;
  const isAlert = brk > 0 && study > 0 && (brk / study) > 0.2;

  return (
    <div className="fixed inset-0 z-[100] bg-slate-950/90 backdrop-blur-3xl flex items-center justify-center p-6">
      <GlassCard className={`max-w-xl w-full border-2 transition-all duration-1000 ${isAlert && mode === 'brk' ? 'border-red-500/50 shadow-red-500/20' : 'border-indigo-500/30'}`}>
        <div className="flex justify-between items-center mb-8">
          <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">{sub.name} Dual Timer</span>
          {isAlert && mode === 'brk' && (
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="text-[10px] font-black text-red-500 flex items-center gap-1"
            >
              <AlertCircle size={12} /> BREAK LIMIT EXCEEDED
            </motion.div>
          )}
        </div>

        <div className="flex justify-center mb-8">
          <AvatarComponent gender={avatarGender} state={mode === 'study' ? 'studying' : 'idle'} className="w-32 h-32" />
        </div>

        <div className="grid grid-cols-2 gap-8 mb-12 text-center">
          <div className={`p-8 rounded-3xl transition-all ${mode === 'study' ? 'bg-indigo-600/20 border-2 border-indigo-600' : 'bg-white/5 opacity-50'}`}>
            <p className="text-[10px] font-black text-indigo-400 mb-2 uppercase">Study</p>
            <p className="text-5xl font-mono font-black text-white">{format(study)}</p>
          </div>
          <div className={`p-8 rounded-3xl transition-all ${mode === 'brk' ? (isAlert ? 'bg-red-500/20 border-2 border-red-500' : 'bg-purple-600/20 border-2 border-purple-600') : 'bg-white/5 opacity-50'}`}>
            <p className="text-[10px] font-black text-purple-400 mb-2 uppercase">Break</p>
            <p className="text-5xl font-mono font-black text-white">{format(brk)}</p>
          </div>
        </div>

        <div className="flex flex-col gap-4">
          <div className="flex gap-4">
            <Button className="flex-1" onClick={() => setRunning(!running)} variant={running ? 'secondary' : 'primary'}>
              {running ? 'Pause' : 'Resume'}
            </Button>
            <Button className="flex-1" onClick={() => setMode(mode === 'study' ? 'brk' : 'study')} variant="outline">
              Switch Mode
            </Button>
          </div>
          <Button onClick={() => onSave(Math.round(study / 60), Math.round(brk / 60))} className="w-full py-5 text-xl">
            Finish Session
          </Button>
          <button onClick={onClose} className="text-xs font-bold text-slate-500 hover:text-white transition-colors">
            Discard Session
          </button>
        </div>
      </GlassCard>
    </div>
  );
};

export default Dashboard;
