import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  BookOpen, Clock, LayoutDashboard, Settings, Plus, Trash2, CheckCircle2,
  AlertCircle, TrendingUp, Moon, Sun, LogOut, Book, DollarSign, FileText,
  ChevronRight, Flame, Trophy, BarChart3, Coffee, Play, Pause, RotateCcw,
  Zap, ArrowUpRight, Timer, PieChart as PieIcon, BarChart as BarIcon,
  LineChart as LineIcon, AreaChart as AreaIcon, PlusCircle, Hash,
  ExternalLink, Save, Calendar, Filter
} from 'lucide-react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, BarChart, Bar, LineChart, Line
} from 'recharts';
import { motion, AnimatePresence } from 'framer-motion';
import { initializeApp } from 'firebase/app';
import { getAuth, onAuthStateChanged, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut } from 'firebase/auth';
import {
  getFirestore, doc, setDoc, getDoc, getDocs, updateDoc,
  collection, deleteDoc, writeBatch
} from 'firebase/firestore';

// --- Firebase Configuration ---
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "your-app.firebaseapp.com",
  projectId: "your-app",
  storageBucket: "your-app.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abcdef"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// --- Utils ---
const withRetry = async (fn, retries = 5, delay = 500) => {
  try { return await fn(); } catch (error) {
    if (retries <= 0) throw error;
    await new Promise(res => setTimeout(res, delay));
    return withRetry(fn, retries - 1, delay * 2);
  }
};

const DEFAULT_SUBJECTS = [
  { name: 'Arabic', color: '#6366f1', icon: BookOpen },
  { name: 'English', color: '#a855f7', icon: Book },
  { name: 'Math', color: '#ec4899', icon: Hash },
  { name: 'Chemistry', color: '#10b981', icon: Zap },
  { name: 'Physics', color: '#3b82f6', icon: Flame },
  { name: 'Biology', color: '#f59e0b', icon: Coffee }
];

const XP_PER_MINUTE = 2;
const XP_PER_TASK = 50;

// --- Components ---
const GlassCard = ({ children, className = "", delay = 0 }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay }}
    className={`bg-white/10 dark:bg-slate-900/40 backdrop-blur-xl rounded-3xl p-6 border border-white/10 transition-all duration-500 hover:border-indigo-500/30 ${className}`}
  >
    {children}
  </motion.div>
);

const Button = ({ children, onClick, variant = 'primary', className = "", icon: Icon, disabled = false, type = "button" }) => {
  const variants = {
    primary: 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-xl hover:shadow-indigo-500/20 active:scale-95',
    secondary: 'bg-white/5 text-slate-700 dark:text-white hover:bg-white/10 backdrop-blur-md',
    danger: 'bg-red-500/10 text-red-500 hover:bg-red-500/20 border border-red-500/20',
    ghost: 'hover:bg-indigo-500/10 text-slate-500 hover:text-indigo-600',
    outline: 'border border-slate-200 dark:border-white/10 hover:border-indigo-500/50 text-slate-600 dark:text-slate-300'
  };
  return (
    <button type={type} disabled={disabled} onClick={onClick} className={`flex items-center justify-center gap-2 px-6 py-3 rounded-2xl transition-all font-bold disabled:opacity-50 ${variants[variant]} ${className}`}>
      {Icon && <Icon size={18} className="stroke-[2.5px]" />}
      {children}
    </button>
  );
};

// --- App Core ---
export default function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [theme, setTheme] = useState('dark');
  const [setupComplete, setSetupComplete] = useState(false);
  const [totalHours, setTotalHours] = useState(8);
  const [studyBreakRatio, setStudyBreakRatio] = useState(80);
  const [selectedSubjectNames, setSelectedSubjectNames] = useState(DEFAULT_SUBJECTS.map(s => s.name));

  const [subjects, setSubjects] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [stats, setStats] = useState({ xp: 0, level: 1, streak: 1, lastActive: null });
  const [activeTab, setActiveTab] = useState('dashboard');
  const [historicalData, setHistoricalData] = useState([]); // For Analytics Month-to-Month

  useEffect(() => {
    return onAuthStateChanged(auth, async (u) => {
      if (u) { setUser(u); await syncData(u.uid); }
      else { setUser(null); setLoading(false); }
    });
  }, []);

  const calculateStreak = (lastActive) => {
    if (!lastActive) return 1;
    const last = new Date(lastActive);
    const now = new Date();
    const diff = Math.floor((now - last) / (1000 * 60 * 60 * 24));
    if (diff === 1) return (stats.streak || 0) + 1;
    if (diff === 0) return stats.streak || 1;
    return 1;
  };

  const syncData = async (uid) => {
    try {
      const userRef = doc(db, 'artifacts', 'AuraStudy', 'users', uid);
      const subjectsRef = collection(db, 'artifacts', 'AuraStudy', 'users', uid, 'subjects');
      const tasksRef = collection(db, 'artifacts', 'AuraStudy', 'users', uid, 'tasks');

      const [userSnap, subjectsSnap, tasksSnap] = await Promise.all([
        getDoc(userRef), getDocs(subjectsRef), getDocs(tasksRef)
      ]);

      if (userSnap.exists()) {
        const data = userSnap.data();
        const currentStats = data.stats || { xp: 0, level: 1, streak: 1, lastActive: new Date().toISOString() };
        const newStreak = calculateStreak(currentStats.lastActive);

        const updatedStats = { ...currentStats, streak: newStreak, lastActive: new Date().toISOString() };
        setStats(updatedStats);
        setSetupComplete(data.setupComplete || false);
        setTotalHours(data.totalHours || 8);

        // Update Firebase with new streak/lastActive
        updateDoc(userRef, { stats: updatedStats });
      }

      setSubjects(subjectsSnap.docs.map(d => ({ id: d.id, ...d.data() })));
      setTasks(tasksSnap.docs.map(d => ({ id: d.id, ...d.data() })));

      // Mock historical data for comparison
      setHistoricalData([
        { month: 'Oct', study: 400, break: 100 },
        { month: 'Nov', study: 600, break: 120 },
        { month: 'Dec', study: subjectsSnap.docs.reduce((acc, d) => acc + (d.data().actualTime || 0), 0), break: subjectsSnap.docs.reduce((acc, d) => acc + (d.data().breakTime || 0), 0) }
      ]);
    } catch (e) { console.error(e); } finally { setLoading(false); }
  };

  const handleInitialSetup = async () => {
    if (!user) return;
    const studyMins = (totalHours * 60) * (studyBreakRatio / 100);
    const minsPerSubject = studyMins / selectedSubjectNames.length;

    const batch = writeBatch(db);
    const initialSubjects = selectedSubjectNames.map(name => {
      const id = Math.random().toString(36).substr(2, 9);
      const def = DEFAULT_SUBJECTS.find(s => s.name === name) || { color: '#6366f1' };
      const sub = { name, color: def.color, targetTime: Math.round(minsPerSubject), actualTime: 0, breakTime: 0, sessions: 0, resources: [], expenses: [], notes: '' };
      batch.set(doc(db, 'artifacts', 'AuraStudy', 'users', user.uid, 'subjects', id), sub);
      return { id, ...sub };
    });

    const userData = { setupComplete: true, totalHours, stats: { xp: 0, level: 1, streak: 1, lastActive: new Date().toISOString() } };
    batch.set(doc(db, 'artifacts', 'AuraStudy', 'users', user.uid), userData);

    await batch.commit();
    setSubjects(initialSubjects);
    setStats(userData.stats);
    setSetupComplete(true);
  };

  const saveSubject = async (sub) => {
    const ref = doc(db, 'artifacts', 'AuraStudy', 'users', user.uid, 'subjects', sub.id);
    await withRetry(() => updateDoc(ref, sub));
    setSubjects(prev => prev.map(s => s.id === sub.id ? sub : s));
  };

  const saveTask = async (task) => {
    const ref = doc(db, 'artifacts', 'AuraStudy', 'users', user.uid, 'tasks', task.id);
    await withRetry(() => setDoc(ref, task));
    setTasks(prev => {
      const exists = prev.find(t => t.id === task.id);
      return exists ? prev.map(t => t.id === task.id ? task : t) : [...prev, task];
    });
  };

  const addXP = (amount) => {
    setStats(prev => {
      const newXP = prev.xp + amount;
      const updated = { ...prev, xp: newXP, level: Math.floor(newXP / 1000) + 1 };
      updateDoc(doc(db, 'artifacts', 'AuraStudy', 'users', user.uid), { stats: updated });
      return updated;
    });
  };

  if (loading) return <div className="min-h-screen bg-[#0b0f1a] flex items-center justify-center"><div className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div></div>;
  if (!user) return <AuthScreen onAuth={setUser} />;
  if (!setupComplete) return <SetupWizard totalHours={totalHours} setTotalHours={setTotalHours} studyBreakRatio={studyBreakRatio} setStudyBreakRatio={setStudyBreakRatio} selectedSubjectNames={selectedSubjectNames} setSelectedSubjectNames={setSelectedSubjectNames} onComplete={handleInitialSetup} />;

  return (
    <div className={`min-h-screen flex transition-colors duration-500 ${theme === 'dark' ? 'bg-[#0b0f1a] text-white' : 'bg-slate-50 text-slate-900'}`}>
      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} stats={stats} user={user} />
      <main className="flex-1 p-6 md:p-12 overflow-y-auto">
        <div className="max-w-7xl mx-auto">
          <AnimatePresence mode="wait">
            {activeTab === 'dashboard' && <Dashboard subjects={subjects} saveSubject={saveSubject} tasks={tasks} saveTask={saveTask} addXP={addXP} />}
            {activeTab === 'curriculum' && <Curriculum subjects={subjects} saveSubject={saveSubject} />}
            {activeTab === 'analytics' && <AnalyticsEngine subjects={subjects} tasks={tasks} />}
            {activeTab === 'config' && <ConfigView theme={theme} setTheme={setTheme} totalHours={totalHours} setTotalHours={setTotalHours} />}
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
}

// --- Sub-Components ---

function Sidebar({ activeTab, setActiveTab, stats, user }) {
  const items = [
    { id: 'dashboard', label: 'Workspace', icon: LayoutDashboard },
    { id: 'curriculum', label: 'Curriculum', icon: BookOpen },
    { id: 'analytics', label: 'Engine', icon: TrendingUp },
    { id: 'config', label: 'Settings', icon: Settings }
  ];
  return (
    <nav className="w-20 md:w-72 bg-white/5 border-r border-white/5 p-6 flex flex-col gap-12">
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center text-white"><Zap fill="currentColor" /></div>
        <h1 className="hidden md:block text-2xl font-black tracking-tighter">AuraStudy</h1>
      </div>
      <div className="flex-1 space-y-2">
        {items.map(i => (
          <button key={i.id} onClick={() => setActiveTab(i.id)} className={`w-full flex items-center gap-4 p-4 rounded-2xl transition-all ${activeTab === i.id ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-500 hover:bg-white/5'}`}>
            <i.icon size={20} /> <span className="hidden md:block font-bold">{i.label}</span>
          </button>
        ))}
      </div>
      <div className="pt-6 border-t border-white/5 space-y-4">
        <div className="hidden md:block">
          <div className="flex justify-between text-[10px] font-black uppercase text-indigo-400 mb-1"><span>Lvl {stats.level}</span><span>{stats.xp%1000}/1000 XP</span></div>
          <div className="h-1 bg-white/5 rounded-full overflow-hidden"><motion.div animate={{ width: `${(stats.xp%1000)/10}%` }} className="h-full bg-indigo-500" /></div>
        </div>
        <Button variant="danger" className="w-full" icon={LogOut} onClick={() => signOut(auth)}>Sign Out</Button>
      </div>
    </nav>
  );
}

function Dashboard({ subjects, saveSubject, tasks, saveTask, addXP }) {
  const [activeTimerSub, setActiveTimerSub] = useState(null);
  const [showPredictions, setShowPredictions] = useState(false);

  const importanceOrder = { high: 0, medium: 1, low: 2 };

  const todayTasks = tasks.filter(t => !t.completed && (!t.dueDate || t.dueDate === new Date().toISOString().split('T')[0]));
  const predictions = tasks.filter(t => !t.completed && t.dueDate === new Date(Date.now() + 86400000).toISOString().split('T')[0]);
  const backlog = tasks.filter(t => !t.completed && (!t.dueDate || t.dueDate < new Date().toISOString().split('T')[0]))
    .sort((a, b) => importanceOrder[a.importance || 'low'] - importanceOrder[b.importance || 'low']);

  return (
    <div className="space-y-10">
      <header className="flex justify-between items-end">
        <div>
          <p className="text-indigo-400 font-bold uppercase tracking-widest text-[10px]">Flow Status: Optimal</p>
          <h2 className="text-4xl font-black tracking-tighter">Daily Workspace</h2>
        </div>
        <div className="flex gap-2 bg-white/5 p-1 rounded-xl">
          <button onClick={()=>setShowPredictions(false)} className={`px-4 py-2 rounded-lg text-xs font-bold ${!showPredictions ? 'bg-indigo-600' : ''}`}>Today</button>
          <button onClick={()=>setShowPredictions(true)} className={`px-4 py-2 rounded-lg text-xs font-bold ${showPredictions ? 'bg-indigo-600' : ''}`}>Tomorrow</button>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
        <div className="lg:col-span-8 grid grid-cols-1 md:grid-cols-2 gap-6">
          {subjects.map(s => (
            <GlassCard key={s.id} className="relative group">
              <div className="flex justify-between mb-4">
                <div className="p-3 rounded-xl" style={{ backgroundColor: s.color+'20', color: s.color }}><Timer size={20} /></div>
                <div className="text-right text-xs font-bold opacity-50 uppercase tracking-widest">Efficiency: {s.actualTime ? Math.round((s.actualTime/(s.actualTime+s.breakTime))*100) : 0}%</div>
              </div>
              <h3 className="text-xl font-black mb-1">{s.name}</h3>
              <p className="text-xs opacity-50 mb-6 uppercase font-bold tracking-tighter">Goal: {Math.floor(s.targetTime/60)}h {s.targetTime%60}m</p>
              <div className="h-1.5 bg-white/5 rounded-full overflow-hidden mb-6"><motion.div animate={{ width: `${Math.min(100, (s.actualTime/s.targetTime)*100)}%` }} className="h-full bg-indigo-500 shadow-[0_0_10px_#6366f1]" /></div>
              <Button onClick={() => setActiveTimerSub(s)} className="w-full" icon={Play}>Start Session</Button>
            </GlassCard>
          ))}
        </div>

        <div className="lg:col-span-4 space-y-6">
          <GlassCard className="bg-gradient-to-br from-indigo-600 to-purple-700 text-white border-none shadow-indigo-500/20">
            <h4 className="text-xs font-black uppercase tracking-widest mb-2 opacity-70">Focus Zone</h4>
            <div className="text-3xl font-black">{showPredictions ? predictions.length : todayTasks.length} Tasks Pending</div>
          </GlassCard>
          <GlassCard>
            <div className="flex justify-between items-center mb-6"><h4 className="font-black">The Backlog</h4><span className="text-[10px] font-black bg-red-500/10 text-red-500 px-2 py-1 rounded-md">{backlog.length}</span></div>
            <div className="space-y-3 max-h-[300px] overflow-y-auto pr-2">
              {backlog.map(t => (
                <div key={t.id} className="p-3 bg-white/5 rounded-xl border border-white/5 flex items-center justify-between group">
                  <span className="text-xs font-bold truncate">{t.title}</span>
                  <button onClick={() => saveTask({ ...t, completed: true })} className="opacity-0 group-hover:opacity-100 text-indigo-400"><CheckCircle2 size={16} /></button>
                </div>
              ))}
            </div>
          </GlassCard>
        </div>
      </div>

      <AnimatePresence>
        {activeTimerSub && <TimerModal sub={activeTimerSub} onClose={()=>setActiveTimerSub(null)} onSave={(actual, brk) => {
          saveSubject({ ...activeTimerSub, actualTime: activeTimerSub.actualTime + actual, breakTime: activeTimerSub.breakTime + brk, sessions: activeTimerSub.sessions + 1 });
          addXP(actual * XP_PER_MINUTE);
          setActiveTimerSub(null);
        }} />}
      </AnimatePresence>
    </div>
  );
}

function TimerModal({ sub, onClose, onSave }) {
  const [study, setStudy] = useState(0);
  const [brk, setBrk] = useState(0);
  const [mode, setMode] = useState('study');
  const [running, setRunning] = useState(true);

  useEffect(() => {
    let id;
    if (running) id = setInterval(() => mode === 'study' ? setStudy(s=>s+1) : setBrk(b=>b+1), 1000);
    return () => clearInterval(id);
  }, [running, mode]);

  const format = (s) => `${Math.floor(s/60).toString().padStart(2,'0')}:${(s%60).toString().padStart(2,'0')}`;
  const isAlert = brk > 0 && study > 0 && (brk/study) > 0.2;

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/90 backdrop-blur-3xl flex items-center justify-center p-6">
      <GlassCard className={`max-w-xl w-full border-2 transition-all duration-1000 ${isAlert && mode === 'brk' ? 'border-red-500/50 shadow-red-500/20' : 'border-indigo-500/30'}`}>
        <div className="flex justify-between mb-12">
          <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">{sub.name} Dual Timer</span>
          {isAlert && mode === 'brk' && <div className="text-[10px] font-black text-red-500 flex items-center gap-1"><AlertCircle size={12}/> BREAK LIMIT EXCEEDED</div>}
        </div>
        <div className="grid grid-cols-2 gap-8 mb-12 text-center">
          <div className={`p-8 rounded-3xl ${mode === 'study' ? 'bg-indigo-600/20 border-2 border-indigo-600' : 'bg-white/5'}`}>
            <p className="text-[10px] font-black text-indigo-400 mb-2">STUDY</p><p className="text-5xl font-mono font-black">{format(study)}</p>
          </div>
          <div className={`p-8 rounded-3xl ${mode === 'brk' ? (isAlert ? 'bg-red-500/20 border-2 border-red-500' : 'bg-purple-600/20 border-2 border-purple-600') : 'bg-white/5'}`}>
            <p className="text-[10px] font-black text-purple-400 mb-2">BREAK</p><p className="text-5xl font-mono font-black">{format(brk)}</p>
          </div>
        </div>
        <div className="flex flex-col gap-4">
          <div className="flex gap-4">
            <Button className="flex-1" onClick={()=>setRunning(!running)} variant={running?'secondary':'primary'}>{running?'Pause':'Resume'}</Button>
            <Button className="flex-1" onClick={()=>setMode(mode==='study'?'brk':'study')} variant="outline">Switch Mode</Button>
          </div>
          <Button onClick={()=>onSave(Math.round(study/60), Math.round(brk/60))} className="w-full py-5 text-xl">Finish Session</Button>
          <button onClick={onClose} className="text-xs font-bold text-slate-500 hover:text-white transition-colors">Discard</button>
        </div>
      </GlassCard>
    </div>
  );
}

function Curriculum({ subjects, saveSubject }) {
  const [selected, setSelected] = useState(subjects[0]?.id);
  const [tab, setTab] = useState('notes');
  const sub = subjects.find(s=>s.id===selected);
  const [val, setVal] = useState(sub?.notes || '');

  useEffect(() => { setVal(sub?.notes || ''); }, [selected]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
      <div className="lg:col-span-3 space-y-2">
        {subjects.map(s => <button key={s.id} onClick={()=>setSelected(s.id)} className={`w-full text-left p-4 rounded-2xl font-bold flex items-center gap-3 transition-all ${selected===s.id ? 'bg-indigo-600 text-white' : 'hover:bg-white/5'}`}><div className="w-2 h-2 rounded-full" style={{backgroundColor:s.color}}/>{s.name}</button>)}
      </div>
      <GlassCard className="lg:col-span-9 min-h-[600px] flex flex-col">
        {sub ? <>
          <header className="flex justify-between items-center mb-8 pb-4 border-b border-white/5">
            <h3 className="text-2xl font-black">{sub.name} Hub</h3>
            <div className="flex bg-white/5 p-1 rounded-xl">
              {['resources','expenses','notes'].map(t => <button key={t} onClick={()=>setTab(t)} className={`px-4 py-2 rounded-lg text-xs font-bold uppercase transition-all ${tab===t?'bg-indigo-600':''}`}>{t}</button>)}
            </div>
          </header>
          <div className="flex-1">
            {tab === 'notes' && <div className="h-full flex flex-col gap-4">
              <textarea value={val} onChange={e=>setVal(e.target.value)} className="flex-1 bg-white/5 rounded-2xl p-6 outline-none resize-none text-slate-300 min-h-[400px]" placeholder="Mastery notes..."/>
              <div className="flex justify-end"><Button icon={Save} onClick={()=>saveSubject({...sub, notes:val})}>Sync Notes</Button></div>
            </div>}
            {tab === 'resources' && <ResourcesTab sub={sub} update={(r)=>saveSubject({...sub, resources:r})} />}
            {tab === 'expenses' && <ExpensesTab sub={sub} update={(e)=>saveSubject({...sub, expenses:e})} />}
          </div>
        </> : <div className="flex-1 flex items-center justify-center text-slate-500 font-bold italic">Select a subject</div>}
      </GlassCard>
    </div>
  );
}

function ResourcesTab({ sub, update }) {
  const [t, setT] = useState('');
  const add = () => { if(t) { update([...(sub.resources||[]), {id:Date.now(), title:t}]); setT(''); } };
  return <div className="space-y-4">
    <div className="flex gap-2"><input value={t} onChange={e=>setT(e.target.value)} placeholder="Resource title..." className="flex-1 bg-white/5 rounded-xl px-4 py-3 border border-white/10 outline-none"/><Button onClick={add}>Add</Button></div>
    <div className="grid grid-cols-2 gap-4">{sub.resources?.map(r => <div key={r.id} className="p-4 bg-white/5 rounded-2xl flex justify-between items-center group"><span className="text-sm font-bold">{r.title}</span><button onClick={()=>update(sub.resources.filter(x=>x.id!==r.id))} className="opacity-0 group-hover:opacity-100 text-red-500"><Trash2 size={16}/></button></div>)}</div>
  </div>;
}

function ExpensesTab({ sub, update }) {
  const [i, setI] = useState('');
  const [c, setC] = useState('');
  const add = () => { if(i && c) { update([...(sub.expenses||[]), {id:Date.now(), item:i, cost:parseFloat(c)}]); setI(''); setC(''); } };
  const total = sub.expenses?.reduce((s,e)=>s+e.cost,0) || 0;
  return <div className="space-y-6">
    <div className="p-6 bg-indigo-600/10 border border-indigo-600/20 rounded-2xl flex justify-between items-center"><span className="text-xs font-black uppercase tracking-widest text-indigo-400">Total Investment</span><span className="text-3xl font-black">${total.toFixed(2)}</span></div>
    <div className="flex gap-2"><input value={i} onChange={e=>setI(e.target.value)} placeholder="Item" className="flex-1 bg-white/5 rounded-xl px-4 py-3 border border-white/10 outline-none"/><input value={c} onChange={e=>setC(e.target.value)} type="number" placeholder="$" className="w-24 bg-white/5 rounded-xl px-4 py-3 border border-white/10 outline-none"/><Button onClick={add}>Log</Button></div>
    <div className="space-y-2">{sub.expenses?.map(e => <div key={e.id} className="p-4 bg-white/5 rounded-2xl flex justify-between items-center"><span>{e.item}</span><span className="font-black text-indigo-400">${e.cost.toFixed(2)}</span></div>)}</div>
  </div>;
}

function AnalyticsEngine({ subjects, historicalData }) {
  const [comparison, setComparison] = useState('subject');
  const data = subjects.map(s => ({ name: s.name, study: s.actualTime, break: s.breakTime, efficiency: s.actualTime ? Math.round((s.actualTime/(s.actualTime+s.breakTime))*100) : 0 }));

  return (
    <div className="space-y-10">
      <header className="flex justify-between items-end">
        <div><p className="text-indigo-400 font-bold uppercase text-[10px]">Comparative Metrics</p><h2 className="text-4xl font-black tracking-tighter">Analytics Engine</h2></div>
        <div className="flex bg-white/5 p-1 rounded-xl">
          {['subject','phase','history'].map(c => <button key={c} onClick={()=>setComparison(c)} className={`px-4 py-2 rounded-lg text-xs font-bold uppercase transition-all ${comparison===c?'bg-indigo-600':''}`}>{c}</button>)}
        </div>
      </header>
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <GlassCard className="lg:col-span-8 h-[500px]">
          <ResponsiveContainer width="100%" height="100%">
            {comparison === 'subject' ? (
              <AreaChart data={data}>
                <defs><linearGradient id="colorStudy" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#6366f1" stopOpacity={0.3}/><stop offset="95%" stopColor="#6366f1" stopOpacity={0}/></linearGradient></defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#ffffff05" />
                <XAxis dataKey="name" stroke="#475569" fontSize={10} axisLine={false} tickLine={false} />
                <YAxis stroke="#475569" fontSize={10} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{backgroundColor:'#0f172a',border:'none',borderRadius:'16px'}} />
                <Area type="monotone" dataKey="study" stroke="#6366f1" strokeWidth={3} fillOpacity={1} fill="url(#colorStudy)" />
              </AreaChart>
            ) : comparison === 'phase' ? (
              <BarChart data={data}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#ffffff05" />
                <XAxis dataKey="name" stroke="#475569" fontSize={10} axisLine={false} tickLine={false} />
                <YAxis stroke="#475569" fontSize={10} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{backgroundColor:'#0f172a',border:'none',borderRadius:'16px'}} />
                <Bar dataKey="study" fill="#6366f1" radius={[10,10,0,0]} /><Bar dataKey="break" fill="#a855f7" radius={[10,10,0,0]} />
              </BarChart>
            ) : (
              <LineChart data={historicalData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#ffffff05" />
                <XAxis dataKey="month" stroke="#475569" fontSize={10} axisLine={false} tickLine={false} />
                <YAxis stroke="#475569" fontSize={10} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{backgroundColor:'#0f172a',border:'none',borderRadius:'16px'}} />
                <Line type="monotone" dataKey="study" stroke="#6366f1" strokeWidth={3} />
                <Line type="monotone" dataKey="break" stroke="#a855f7" strokeWidth={3} />
              </LineChart>
            )}
          </ResponsiveContainer>
        </GlassCard>
        <GlassCard className="lg:col-span-4 flex flex-col items-center justify-center">
          <h4 className="font-black mb-8">Average Efficiency</h4>
          <div className="relative flex items-center justify-center">
            <svg className="w-48 h-48 transform -rotate-90">
              <circle cx="96" cy="96" r="88" fill="none" stroke="currentColor" strokeWidth="16" className="text-white/5"/>
              <motion.circle cx="96" cy="96" r="88" fill="none" stroke="currentColor" strokeWidth="16" className="text-indigo-600" strokeDasharray={552} initial={{ strokeDashoffset: 552 }} animate={{ strokeDashoffset: 552 - (552 * (data.reduce((a,b)=>a+b.efficiency,0)/Math.max(1,data.length))/100) }} transition={{ duration: 2 }} strokeLinecap="round"/>
            </svg>
            <div className="absolute inset-0 flex items-center justify-center text-4xl font-black">{Math.round(data.reduce((a,b)=>a+b.efficiency,0)/Math.max(1,data.length))}%</div>
          </div>
        </GlassCard>
      </div>
    </div>
  );
}

function ConfigView({ theme, setTheme, totalHours, setTotalHours }) {
  return (
    <div className="max-w-2xl mx-auto space-y-12">
      <header><p className="text-indigo-400 font-bold uppercase text-[10px]">System Config</p><h2 className="text-4xl font-black tracking-tighter">Configuration</h2></header>
      <GlassCard className="space-y-8">
        <div className="flex justify-between items-center">
          <div><p className="font-bold">Aura Theme Interface</p><p className="text-xs opacity-50">Switch visual mode</p></div>
          <button onClick={()=>setTheme(theme==='dark'?'light':'dark')} className={`w-14 h-8 rounded-full p-1 ${theme==='dark'?'bg-indigo-600':'bg-slate-300'}`}><motion.div animate={{x:theme==='dark'?24:0}} className="w-6 h-6 bg-white rounded-full flex items-center justify-center">{theme==='dark'?<Moon size={12} className="text-indigo-600"/>:<Sun size={12} className="text-orange-500"/>}</motion.div></button>
        </div>
        <div className="pt-8 border-t border-white/5 space-y-4">
          <p className="text-xs font-black uppercase text-indigo-400">Daily Capacity: {totalHours}h</p>
          <input type="range" min="1" max="24" value={totalHours} onChange={e=>setTotalHours(parseInt(e.target.value))} className="w-full accent-indigo-600 h-1 bg-white/10 rounded-full"/>
        </div>
      </GlassCard>
      <div className="text-center opacity-30 text-[10px] font-black uppercase tracking-[0.5em]">AuraStudy OS v2.2.0</div>
    </div>
  );
}

function AuthScreen({ onAuth }) {
  const [l, setL] = useState(true);
  const [e, setE] = useState('');
  const [p, setP] = useState('');
  const [err, setErr] = useState('');
  const handle = async (ev) => {
    ev.preventDefault(); setErr('');
    try {
      const u = l ? await signInWithEmailAndPassword(auth, e, p) : await createUserWithEmailAndPassword(auth, e, p);
      onAuth(u.user);
    } catch (err) { setErr(err.message); }
  };
  return (
    <div className="min-h-screen bg-[#0b0f1a] flex items-center justify-center p-6 bg-gradient-to-br from-indigo-950 via-slate-950 to-purple-950">
      <GlassCard className="max-w-md w-full !bg-white/5">
        <div className="flex justify-center mb-8"><div className="w-16 h-16 bg-indigo-600 rounded-3xl flex items-center justify-center text-white"><Zap size={32} fill="currentColor"/></div></div>
        <h2 className="text-3xl font-black text-center mb-2 tracking-tighter">AuraStudy</h2>
        <p className="text-center opacity-50 text-sm mb-10 font-bold">Premium Aura Workspace</p>
        <form onSubmit={handle} className="space-y-4">
          <input value={e} onChange={ev=>setE(ev.target.value)} placeholder="Email" className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 outline-none focus:border-indigo-600 transition-all"/>
          <input type="password" value={p} onChange={ev=>setP(ev.target.value)} placeholder="Password" className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 outline-none focus:border-indigo-600 transition-all"/>
          {err && <p className="text-red-400 text-xs text-center font-bold">{err}</p>}
          <Button type="submit" className="w-full py-4 text-lg">{l?'Login':'Create Aura'}</Button>
        </form>
        <button onClick={()=>setL(!l)} className="w-full mt-6 text-xs text-slate-500 font-bold hover:text-white transition-colors">{l?"New here? Create account":"Back to login"}</button>
      </GlassCard>
    </div>
  );
}

function SetupWizard({ totalHours, setTotalHours, studyBreakRatio, setStudyBreakRatio, selectedSubjectNames, setSelectedSubjectNames, onComplete }) {
  return (
    <div className="min-h-screen bg-[#0b0f1a] flex items-center justify-center p-6 bg-gradient-to-br from-indigo-950 to-slate-950">
      <GlassCard className="max-w-2xl w-full">
        <h2 className="text-4xl font-black mb-2 text-center tracking-tighter">Initialize Aura</h2>
        <p className="text-center text-slate-400 mb-12">Construct your productivity workspace</p>
        <div className="space-y-10">
          <div><p className="text-[10px] font-black uppercase text-indigo-400 mb-4 text-center">Daily Operational Window: {totalHours}h</p><input type="range" min="1" max="24" value={totalHours} onChange={e=>setTotalHours(parseInt(e.target.value))} className="w-full accent-indigo-600 h-1 bg-white/10 rounded-full"/></div>
          <div><div className="flex justify-between text-[10px] font-black mb-4 uppercase"><span className="text-indigo-400">Study: {studyBreakRatio}%</span><span className="text-purple-400">Break: {100-studyBreakRatio}%</span></div><input type="range" min="50" max="95" value={studyBreakRatio} onChange={e=>setStudyBreakRatio(parseInt(e.target.value))} className="w-full accent-indigo-600 h-1 bg-white/10 rounded-full"/></div>
          <div className="grid grid-cols-3 gap-2">{DEFAULT_SUBJECTS.map(s => <button key={s.name} onClick={()=>setSelectedSubjectNames(prev=>prev.includes(s.name)?prev.filter(x=>x!==s.name):[...prev,s.name])} className={`p-4 rounded-2xl border transition-all flex flex-col items-center gap-2 ${selectedSubjectNames.includes(s.name)?'bg-indigo-600 border-indigo-500 shadow-lg shadow-indigo-600/20':'bg-white/5 border-white/5 opacity-50'}`}><s.icon size={18}/><span className="text-[10px] font-bold uppercase">{s.name}</span></button>)}</div>
          <Button onClick={onComplete} className="w-full py-5 text-xl">Construct Workspace</Button>
        </div>
      </GlassCard>
    </div>
  );
}
