import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  BookOpen,
  Clock,
  LayoutDashboard,
  Settings,
  Plus,
  Trash2,
  CheckCircle2,
  AlertCircle,
  TrendingUp,
  Moon,
  Sun,
  LogOut,
  Book,
  DollarSign,
  FileText,
  ChevronRight,
  Flame,
  Trophy,
  BarChart3,
  Coffee,
  Play,
  Pause,
  RotateCcw,
  Bell,
  Search,
  Filter,
  Calendar,
  Zap,
  ArrowUpRight
} from 'lucide-react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
  BarChart,
  Bar
} from 'recharts';
import { motion, AnimatePresence } from 'framer-motion';
import { initializeApp } from 'firebase/app';
import {
  getAuth,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged
} from 'firebase/auth';
import {
  getFirestore,
  doc,
  setDoc,
  getDoc,
  updateDoc,
  collection,
  query,
  onSnapshot,
  addDoc,
  deleteDoc,
  where,
  orderBy,
  serverTimestamp
} from 'firebase/firestore';

// --- Firebase Configuration ---
// TO THE USER: Replace these with your actual Firebase project configuration.
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_AUTH_DOMAIN",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_STORAGE_BUCKET",
  messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
  appId: "YOUR_APP_ID"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

const APP_ID = 'aurastudy-v1';

// --- Utility: Exponential Backoff Wrapper ---
const withBackoff = async (fn, maxRetries = 5) => {
  let delay = 1000;
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (err) {
      console.warn(`Retry ${i + 1}/${maxRetries} after error:`, err);
      if (i === maxRetries - 1) throw err;
      await new Promise(res => setTimeout(res, delay));
      delay *= 2;
    }
  }
};

// --- Helper Components ---

const GlassCard = ({ children, className = "", delay = 0 }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay }}
    className={`glass rounded-2xl p-6 relative overflow-hidden ${className}`}
  >
    {children}
  </motion.div>
);

const Button = ({ children, onClick, variant = 'primary', className = "", icon: Icon, disabled = false, type = "button" }) => {
  const variants = {
    primary: 'aura-gradient text-white shadow-lg hover:shadow-aura-purple/40',
    secondary: 'bg-white/10 text-white hover:bg-white/20 backdrop-blur-md',
    danger: 'bg-red-500/20 text-red-400 hover:bg-red-500/30 border border-red-500/30',
    ghost: 'hover:bg-white/5 text-slate-400 hover:text-white',
    outline: 'border border-white/10 hover:border-aura-purple/50 text-slate-300'
  };

  return (
    <button
      type={type}
      disabled={disabled}
      onClick={onClick}
      className={`flex items-center justify-center gap-2 px-4 py-2 rounded-xl transition-all active:scale-95 font-medium disabled:opacity-50 disabled:cursor-not-allowed ${variants[variant]} ${className}`}
    >
      {Icon && <Icon size={18} />}
      {children}
    </button>
  );
};

// --- Main Application ---

export default function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isDarkMode, setIsDarkMode] = useState(true);

  // Auth State
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLogin, setIsLogin] = useState(true);
  const [authError, setAuthError] = useState('');

  // App Global State
  const [userData, setUserData] = useState({
    xp: 0,
    level: 1,
    streak: 0,
    lastActive: null,
    totalStudyMinutes: 0
  });
  const [subjects, setSubjects] = useState([]);
  const [tasks, setTasks] = useState([]);

  // Auth Listener & Data Initialization
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
      if (u) {
        initAppData(u.uid);
      } else {
        setLoading(false);
      }
    });
    return unsubscribe;
  }, []);

  const initAppData = async (uid) => {
    try {
      await withBackoff(async () => {
        const userDocRef = doc(db, `artifacts/${APP_ID}/users/${uid}`);
        const userDoc = await getDoc(userDocRef);

        if (userDoc.exists()) {
          const data = userDoc.data();
          setUserData(data);

          // Simple streak check (on login)
          const lastActive = data.lastActive ? new Date(data.lastActive) : null;
          const today = new Date();
          if (lastActive) {
            const diffDays = Math.floor((today - lastActive) / (1000 * 60 * 60 * 24));
            if (diffDays === 1) {
              await updateDoc(userDocRef, { streak: data.streak + 1, lastActive: today.toISOString() });
            } else if (diffDays > 1) {
              await updateDoc(userDocRef, { streak: 1, lastActive: today.toISOString() });
            }
          } else {
            await updateDoc(userDocRef, { streak: 1, lastActive: today.toISOString() });
          }
        } else {
          const initialData = { xp: 0, level: 1, streak: 1, lastActive: new Date().toISOString(), totalStudyMinutes: 0 };
          await setDoc(userDocRef, initialData);
          setUserData(initialData);
        }
      });

      // Subscriptions
      const subQuery = query(collection(db, `artifacts/${APP_ID}/users/${uid}/subjects`), orderBy('createdAt', 'desc'));
      const unsubSubjects = onSnapshot(subQuery, (snapshot) => {
        setSubjects(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      });

      const taskQuery = query(collection(db, `artifacts/${APP_ID}/users/${uid}/tasks`), orderBy('createdAt', 'desc'));
      const unsubTasks = onSnapshot(taskQuery, (snapshot) => {
        setTasks(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      });

      setLoading(false);
      return () => { unsubSubjects(); unsubTasks(); };
    } catch (err) {
      console.error("Failed to init app data:", err);
      setLoading(false);
    }
  };

  const handleAuth = async (e) => {
    e.preventDefault();
    setAuthError('');
    try {
      if (isLogin) {
        await signInWithEmailAndPassword(auth, email, password);
      } else {
        await createUserWithEmailAndPassword(auth, email, password);
      }
    } catch (err) {
      setAuthError(err.message.replace('Firebase: ', ''));
    }
  };

  const handleLogout = () => signOut(auth);

  if (loading) return (
    <div className="min-h-screen bg-[#0f172a] flex flex-col items-center justify-center gap-6">
      <div className="relative">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ repeat: Infinity, duration: 8, ease: "linear" }}
          className="w-24 h-24 border-4 border-aura-purple/20 border-t-aura-purple rounded-full"
        />
        <div className="absolute inset-0 flex items-center justify-center font-bold text-aura-purple">A</div>
      </div>
      <motion.div
        animate={{ opacity: [0.4, 1, 0.4] }}
        transition={{ repeat: Infinity, duration: 1.5 }}
        className="text-slate-400 font-medium tracking-widest uppercase text-xs"
      >
        Aligning your Aura...
      </motion.div>
    </div>
  );

  if (!user) {
    return (
      <div className={`min-h-screen flex items-center justify-center p-4 transition-colors duration-500 ${isDarkMode ? 'bg-[#0f172a]' : 'bg-slate-50'}`}>
        <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
          <div className="absolute -top-1/4 -left-1/4 w-3/4 h-3/4 bg-aura-purple opacity-20 blur-[120px] rounded-full"></div>
          <div className="absolute -bottom-1/4 -right-1/4 w-3/4 h-3/4 bg-aura-blue opacity-20 blur-[120px] rounded-full"></div>
        </div>

        <GlassCard className="w-full max-w-md relative z-10 border border-white/10 shadow-2xl">
          <div className="flex justify-center mb-6">
            <div className="w-16 h-16 aura-gradient rounded-3xl flex items-center justify-center shadow-lg rotate-12">
              <BookOpen className="text-white" size={32} />
            </div>
          </div>
          <h1 className="text-4xl font-black text-center mb-2 aura-text-gradient tracking-tight">AuraStudy</h1>
          <p className="text-slate-400 text-center mb-8 font-medium">Elevate your learning experience.</p>

          <form onSubmit={handleAuth} className="space-y-4">
            <div>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 text-white focus:outline-none focus:ring-2 focus:ring-aura-purple/50 focus:border-transparent transition-all"
                placeholder="Email Address"
                required
              />
            </div>
            <div>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 text-white focus:outline-none focus:ring-2 focus:ring-aura-purple/50 focus:border-transparent transition-all"
                placeholder="Password"
                required
              />
            </div>
            {authError && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-red-400 text-sm bg-red-400/10 p-3 rounded-xl border border-red-400/20 flex items-center gap-2">
                <AlertCircle size={16} />
                {authError}
              </motion.div>
            )}
            <Button type="submit" className="w-full py-4 text-lg font-bold mt-4 rounded-2xl">
              {isLogin ? 'Enter Workspace' : 'Create Your Aura'}
            </Button>
          </form>

          <div className="mt-8 pt-6 border-t border-white/5 text-center">
            <button
              onClick={() => setIsLogin(!isLogin)}
              className="text-slate-400 hover:text-white transition-colors text-sm font-medium"
            >
              {isLogin ? "New here? Join the community" : "Already a member? Sign in"}
            </button>
          </div>
        </GlassCard>
      </div>
    );
  }

  return (
    <div className={`min-h-screen transition-colors duration-500 overflow-hidden ${isDarkMode ? 'bg-[#0b0f1a] text-white' : 'bg-slate-50 text-slate-900'}`}>
      {/* Background Orbs */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-aura-purple/10 blur-[120px] rounded-full"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-aura-blue/10 blur-[120px] rounded-full"></div>
      </div>

      <div className="relative z-10 flex h-screen">
        {/* Navigation - Sidebar */}
        <nav className="w-20 md:w-72 border-r border-white/5 bg-white/[0.02] backdrop-blur-3xl flex flex-col p-6">
          <div className="hidden md:flex items-center gap-3 px-2 mb-10">
            <div className="w-10 h-10 aura-gradient rounded-xl flex items-center justify-center shadow-lg">
              <Zap className="text-white" size={20} fill="currentColor" />
            </div>
            <h1 className="text-2xl font-black tracking-tighter aura-text-gradient">AuraStudy</h1>
          </div>

          <div className="md:hidden flex justify-center mb-10">
            <div className="w-12 h-12 aura-gradient rounded-2xl flex items-center justify-center shadow-lg">
              <Zap className="text-white" size={24} fill="currentColor" />
            </div>
          </div>

          <div className="flex-1 space-y-3">
            <NavItem active={activeTab === 'dashboard'} onClick={() => setActiveTab('dashboard')} icon={LayoutDashboard} label="Workspace" />
            <NavItem active={activeTab === 'subjects'} onClick={() => setActiveTab('subjects')} icon={BookOpen} label="Subjects Hub" />
            <NavItem active={activeTab === 'analytics'} onClick={() => setActiveTab('analytics')} icon={TrendingUp} label="Analytics Engine" />
            <NavItem active={activeTab === 'settings'} onClick={() => setActiveTab('settings')} icon={Settings} label="Settings" />
          </div>

          <div className="mt-auto space-y-4 pt-6 border-t border-white/5">
            <div className="hidden md:block">
              <div className="bg-white/5 rounded-2xl p-4 border border-white/5">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">Level Progression</span>
                  <span className="text-xs font-bold text-aura-purple">{Math.round((userData.xp % 1000) / 10)}%</span>
                </div>
                <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${(userData.xp % 1000) / 10}%` }}
                    className="h-full aura-gradient"
                  />
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <NavItem
                icon={isDarkMode ? Sun : Moon}
                label={isDarkMode ? "Light Aura" : "Dark Aura"}
                onClick={() => {
                  setIsDarkMode(!isDarkMode);
                  document.documentElement.classList.toggle('dark');
                }}
              />
              <NavItem icon={LogOut} label="Sign Out" onClick={handleLogout} variant="danger" />
            </div>
          </div>
        </nav>

        {/* Main Workspace */}
        <main className="flex-1 overflow-y-auto custom-scrollbar">
          <div className="max-w-7xl mx-auto p-6 md:p-10">
            <header className="flex flex-col md:flex-row md:items-end justify-between mb-12 gap-6">
              <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}>
                <div className="text-aura-purple font-bold text-sm tracking-widest uppercase mb-1">Welcome Back</div>
                <h2 className="text-4xl font-black tracking-tight flex items-center gap-3">
                  Elevate your Aura, {user.email?.split('@')[0]}
                  <motion.span animate={{ rotate: [0, 20, 0] }} transition={{ repeat: Infinity, duration: 2 }}>👋</motion.span>
                </h2>
              </motion.div>

              <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="flex items-center gap-3">
                <div className="flex flex-col items-end">
                  <div className="flex items-center gap-2 px-4 py-2 bg-orange-500/10 text-orange-500 rounded-2xl border border-orange-500/20">
                    <Flame size={18} fill="currentColor" />
                    <span className="font-bold tracking-tight">{userData.streak} Day Streak</span>
                  </div>
                </div>
                <div className="flex flex-col items-end">
                  <div className="flex items-center gap-2 px-4 py-2 bg-aura-purple/10 text-aura-purple rounded-2xl border border-aura-purple/20">
                    <Trophy size={18} fill="currentColor" />
                    <span className="font-bold tracking-tight">Level {userData.level}</span>
                  </div>
                </div>
              </motion.div>
            </header>

            <AnimatePresence mode="wait">
              {activeTab === 'dashboard' && <Dashboard key="dashboard" tasks={tasks} subjects={subjects} uid={user.uid} />}
              {activeTab === 'subjects' && <SubjectsView key="subjects" subjects={subjects} uid={user.uid} />}
              {activeTab === 'analytics' && <AnalyticsView key="analytics" tasks={tasks} subjects={subjects} />}
              {activeTab === 'settings' && <SettingsView key="settings" user={user} userData={userData} />}
            </AnimatePresence>
          </div>
        </main>
      </div>
    </div>
  );
}

function NavItem({ active, icon: Icon, label, onClick, variant = 'primary' }) {
  const activeClass = active ? 'bg-aura-purple/15 text-aura-purple border-r-4 border-aura-purple' : 'text-slate-500 hover:text-slate-200 hover:bg-white/[0.03]';
  const dangerClass = 'text-red-400/70 hover:text-red-400 hover:bg-red-400/5';

  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-4 px-4 py-4 rounded-xl transition-all duration-300 group ${variant === 'danger' ? dangerClass : activeClass}`}
    >
      <Icon size={22} className={`${active ? 'text-aura-purple' : 'group-hover:scale-110 transition-transform'} stroke-[2.5px]`} />
      <span className="hidden md:block font-bold tracking-tight">{label}</span>
      {active && <motion.div layoutId="nav-glow" className="absolute left-0 w-1 h-8 bg-aura-purple blur-md" />}
    </button>
  );
}

// --- Dashboard / Workspace ---

function Dashboard({ tasks, subjects, uid }) {
  const [newTask, setNewTask] = useState('');
  const [priority, setPriority] = useState('medium');

  const addTask = async (e) => {
    e.preventDefault();
    if (!newTask.trim()) return;
    await withBackoff(() => addDoc(collection(db, `artifacts/${APP_ID}/users/${uid}/tasks`), {
      title: newTask,
      completed: false,
      priority,
      createdAt: new Date().toISOString(),
      dueDate: new Date(Date.now() + 86400000).toISOString() // Default to tomorrow
    }));
    setNewTask('');
  };

  const toggleTask = async (task) => {
    await withBackoff(() => updateDoc(doc(db, `artifacts/${APP_ID}/users/${uid}/tasks`, task.id), {
      completed: !task.completed
    }));
  };

  const deleteTask = async (id) => {
    await withBackoff(() => deleteDoc(doc(db, `artifacts/${APP_ID}/users/${uid}/tasks`, id)));
  };

  const backlog = useMemo(() => tasks.filter(t => !t.completed).sort((a, b) => {
    const pMap = { high: 0, medium: 1, low: 2 };
    return pMap[a.priority] - pMap[b.priority];
  }), [tasks]);

  const completed = useMemo(() => tasks.filter(t => t.completed), [tasks]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
      {/* Central Task Management */}
      <div className="lg:col-span-8 space-y-8">
        <GlassCard className="border border-white/5 shadow-xl">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h3 className="text-2xl font-black flex items-center gap-3">
                <div className="p-2 bg-aura-blue/10 rounded-xl text-aura-blue">
                  <CheckCircle2 size={24} />
                </div>
                Today's Mission
              </h3>
              <p className="text-slate-500 text-sm mt-1 ml-11">Complete these to earn bonus XP</p>
            </div>
            <div className="text-right">
              <span className="text-4xl font-black aura-text-gradient">{backlog.length}</span>
              <div className="text-[10px] font-bold text-slate-500 uppercase tracking-tighter">Remaining</div>
            </div>
          </div>

          <form onSubmit={addTask} className="space-y-4 mb-10">
            <div className="flex gap-3">
              <div className="flex-1 relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-600" size={18} />
                <input
                  type="text"
                  value={newTask}
                  onChange={(e) => setNewTask(e.target.value)}
                  placeholder="Define your next objective..."
                  className="w-full bg-white/[0.03] border border-white/10 rounded-2xl pl-12 pr-4 py-4 focus:outline-none focus:ring-2 focus:ring-aura-purple/50 transition-all font-medium"
                />
              </div>
              <Button type="submit" icon={Plus} className="px-8 rounded-2xl shadow-aura-purple/20">Add Task</Button>
            </div>
            <div className="flex gap-2">
              {['low', 'medium', 'high'].map(p => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setPriority(p)}
                  className={`px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-widest transition-all ${priority === p ? 'bg-white/10 text-white ring-1 ring-white/20' : 'text-slate-600 hover:text-slate-400'}`}
                >
                  {p}
                </button>
              ))}
            </div>
          </form>

          <div className="space-y-3">
            <AnimatePresence initial={false}>
              {backlog.length === 0 && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="py-12 text-center text-slate-600">
                  <div className="mb-4 flex justify-center opacity-20"><CheckCircle2 size={64} /></div>
                  <p className="font-bold">Mission Accomplished!</p>
                  <p className="text-sm">Enjoy your aura of productivity.</p>
                </motion.div>
              )}
              {backlog.map((task, idx) => (
                <motion.div
                  key={task.id}
                  layout
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ delay: idx * 0.05 }}
                  className="flex items-center gap-4 p-5 rounded-2xl bg-white/[0.02] border border-white/5 group hover:bg-white/[0.04] hover:border-aura-purple/30 transition-all"
                >
                  <button
                    onClick={() => toggleTask(task)}
                    className="w-7 h-7 rounded-full border-2 border-slate-700 flex items-center justify-center hover:border-aura-blue transition-all active:scale-90"
                  >
                    <div className="w-4 h-4 rounded-full bg-transparent group-hover:bg-aura-blue/20 transition-colors" />
                  </button>
                  <div className="flex-1">
                    <div className="font-bold text-slate-200">{task.title}</div>
                    <div className="flex items-center gap-3 mt-1">
                      <div className={`text-[10px] font-black uppercase tracking-tighter px-2 py-0.5 rounded-md ${task.priority === 'high' ? 'bg-red-500/10 text-red-400' : task.priority === 'medium' ? 'bg-orange-500/10 text-orange-400' : 'bg-blue-500/10 text-blue-400'}`}>
                        {task.priority} Priority
                      </div>
                      <div className="text-[10px] font-bold text-slate-600 flex items-center gap-1">
                        <Calendar size={10} /> {new Date(task.dueDate).toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                  <button onClick={() => deleteTask(task.id)} className="opacity-0 group-hover:opacity-100 p-2 text-slate-600 hover:text-red-400 transition-all">
                    <Trash2 size={18} />
                  </button>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </GlassCard>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <GlassCard className="group hover:border-aura-pink/30 transition-all">
            <h4 className="font-black text-lg mb-4 flex items-center gap-3">
              <div className="p-2 bg-aura-pink/10 rounded-xl text-aura-pink">
                <RotateCcw size={18} />
              </div>
              The Backlog
            </h4>
            <div className="space-y-4">
              <p className="text-xs text-slate-500 leading-relaxed font-medium">Unfinished objectives from yesterday automatically sync here to keep your momentum.</p>
              <div className="p-4 bg-white/[0.03] rounded-xl border border-white/5 text-sm text-slate-400 font-bold italic">
                "Small steps daily lead to massive results."
              </div>
            </div>
          </GlassCard>

          <GlassCard className="group hover:border-aura-purple/30 transition-all">
            <h4 className="font-black text-lg mb-4 flex items-center gap-3">
              <div className="p-2 bg-aura-purple/10 rounded-xl text-aura-purple">
                <TrendingUp size={18} />
              </div>
              Productivity Forecast
            </h4>
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-400 font-medium">Tomorrow's Load</span>
                <span className="font-black">Light</span>
              </div>
              <div className="w-full h-2 bg-white/5 rounded-full overflow-hidden">
                <div className="h-full bg-aura-purple w-1/3"></div>
              </div>
              <p className="text-[10px] text-slate-500 mt-2 font-bold uppercase tracking-widest">3 tasks scheduled</p>
            </div>
          </GlassCard>
        </div>
      </div>

      {/* Analytics Sidebar */}
      <div className="lg:col-span-4 space-y-8">
        <GlassCard className="aura-gradient !bg-none text-white shadow-2xl shadow-aura-purple/20">
          <div className="absolute -top-6 -right-6 opacity-10">
            <Trophy size={160} />
          </div>
          <div className="relative z-10">
            <div className="flex items-center gap-2 mb-6">
              <div className="p-2 bg-white/20 rounded-lg backdrop-blur-md">
                <Calendar size={16} />
              </div>
              <span className="text-sm font-black uppercase tracking-widest opacity-80">Weekly Progression</span>
            </div>

            <h3 className="text-3xl font-black mb-1">Focus Target</h3>
            <p className="text-white/70 text-sm mb-6 font-medium">Master 20 hours of deep study</p>

            <div className="space-y-2">
              <div className="flex justify-between text-xs font-black">
                <span>PROGRESS</span>
                <span>65%</span>
              </div>
              <div className="h-3 bg-black/20 rounded-full overflow-hidden border border-white/10 p-0.5">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: '65%' }}
                  transition={{ duration: 1.5, ease: "easeOut" }}
                  className="h-full bg-white rounded-full"
                />
              </div>
              <div className="flex justify-between items-center mt-2">
                <span className="text-[10px] font-bold opacity-70">13 HOURS COMPLETED</span>
                <div className="flex -space-x-2">
                  {[1,2,3].map(i => (
                    <div key={i} className="w-6 h-6 rounded-full border-2 border-aura-purple bg-white/20 backdrop-blur-sm"></div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </GlassCard>

        <GlassCard>
          <div className="flex items-center justify-between mb-6">
            <h3 className="font-black text-lg">Active Subjects</h3>
            <button onClick={() => setActiveTab('subjects')} className="text-aura-purple text-xs font-bold hover:underline">View Hub</button>
          </div>
          <div className="space-y-5">
            {subjects.length === 0 && (
              <div className="text-center py-6 text-slate-600 text-sm font-medium">No subjects added yet.</div>
            )}
            {subjects.slice(0, 4).map(sub => (
              <div key={sub.id} className="flex items-center gap-4 group cursor-pointer">
                <div className="w-1.5 h-10 rounded-full shrink-0" style={{ backgroundColor: sub.color || '#A78BFA' }}></div>
                <div className="flex-1">
                  <h4 className="font-bold text-slate-200 group-hover:text-white transition-colors">{sub.name}</h4>
                  <div className="flex items-center gap-3 text-[10px] font-bold text-slate-500 uppercase tracking-tighter mt-0.5">
                    <span className="flex items-center gap-1"><Clock size={10} /> {sub.totalStudyTime || 0}m Session</span>
                    <span className="w-1 h-1 bg-slate-700 rounded-full"></span>
                    <span className="flex items-center gap-1 text-aura-blue"><ArrowUpRight size={10} /> {Math.round((sub.totalStudyTime/600)*100)}% Mastery</span>
                  </div>
                </div>
                <ChevronRight size={16} className="text-slate-700 group-hover:text-aura-purple transition-all group-hover:translate-x-1" />
              </div>
            ))}
          </div>
        </GlassCard>

        <GlassCard className="bg-white/[0.01] border-dashed border-white/10">
          <div className="flex flex-col items-center text-center py-4">
            <div className="w-12 h-12 bg-aura-purple/10 rounded-full flex items-center justify-center text-aura-purple mb-4">
              <Bell size={24} />
            </div>
            <h4 className="font-bold text-sm mb-1">Stay Aligned</h4>
            <p className="text-xs text-slate-500 px-4">Enable desktop notifications to get smart break alerts.</p>
            <button className="mt-4 text-xs font-black text-aura-purple uppercase tracking-widest hover:tracking-[0.2em] transition-all">Enable Now</button>
          </div>
        </GlassCard>
      </div>
    </div>
  );
}

// --- Subjects Hub ---

function SubjectsView({ subjects, uid }) {
  const [isAdding, setIsAdding] = useState(false);
  const [newName, setNewName] = useState('');
  const [selectedSubject, setSelectedSubject] = useState(null);

  const addSubject = async (e) => {
    e.preventDefault();
    if (!newName.trim()) return;
    const colors = ['#A78BFA', '#60A5FA', '#F472B6', '#34D399', '#FB923C', '#818CF8', '#EC4899'];
    await withBackoff(() => addDoc(collection(db, `artifacts/${APP_ID}/users/${uid}/subjects`), {
      name: newName,
      color: colors[Math.floor(Math.random() * colors.length)],
      totalStudyTime: 0,
      totalBreakTime: 0,
      createdAt: new Date().toISOString()
    }));
    setNewName('');
    setIsAdding(false);
  };

  if (selectedSubject) {
    return <SubjectDetail subject={selectedSubject} onClose={() => setSelectedSubject(null)} uid={uid} />;
  }

  return (
    <div className="space-y-10">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h2 className="text-4xl font-black tracking-tight">Subjects Hub</h2>
          <p className="text-slate-500 font-medium mt-1">Manage your resources, expenses, and study time.</p>
        </div>
        <Button onClick={() => setIsAdding(true)} icon={Plus} className="px-8 py-4 rounded-2xl">Add New Subject</Button>
      </div>

      <AnimatePresence>
        {isAdding && (
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}>
            <GlassCard className="border-aura-purple/30 bg-aura-purple/5 shadow-2xl">
              <form onSubmit={addSubject} className="flex flex-col md:flex-row gap-4">
                <input
                  autoFocus
                  type="text"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="Subject Title (e.g., Advanced Mathematics)"
                  className="flex-1 bg-white/[0.05] border border-white/10 rounded-2xl px-6 py-4 text-white focus:outline-none focus:ring-2 focus:ring-aura-purple/50 font-bold"
                />
                <div className="flex gap-2">
                  <Button type="submit" className="px-10 rounded-2xl">Create</Button>
                  <Button variant="secondary" onClick={() => setIsAdding(false)} className="rounded-2xl">Cancel</Button>
                </div>
              </form>
            </GlassCard>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {subjects.map((sub, idx) => (
          <motion.div
            key={sub.id}
            layoutId={sub.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.1 }}
            onClick={() => setSelectedSubject(sub)}
            className="group cursor-pointer relative"
          >
            <div className="absolute inset-0 bg-gradient-to-br opacity-0 group-hover:opacity-10 transition-opacity rounded-3xl" style={{ backgroundImage: `linear-gradient(to bottom right, ${sub.color}, transparent)` }}></div>
            <GlassCard className="h-full border border-white/5 group-hover:border-white/20 transition-all flex flex-col">
              <div className="flex items-start justify-between mb-8">
                <div className="p-4 rounded-2xl shadow-lg" style={{ backgroundColor: `${sub.color}20`, color: sub.color }}>
                  <BookOpen size={28} className="stroke-[2.5px]" />
                </div>
                <div className="text-right">
                  <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Time Invested</div>
                  <div className="text-xl font-black text-slate-200">
                    {Math.floor(sub.totalStudyTime / 60)}<span className="text-sm text-slate-500 ml-0.5">h</span> {sub.totalStudyTime % 60}<span className="text-sm text-slate-500 ml-0.5">m</span>
                  </div>
                </div>
              </div>
              <h3 className="text-2xl font-black mb-6 tracking-tight">{sub.name}</h3>

              <div className="mt-auto space-y-3">
                <div className="flex items-center justify-between text-xs font-bold uppercase tracking-tighter">
                  <span className="text-slate-500">Mastery Level</span>
                  <span style={{ color: sub.color }}>45%</span>
                </div>
                <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden p-0.5">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: '45%' }}
                    className="h-full rounded-full"
                    style={{ backgroundColor: sub.color }}
                  />
                </div>
                <div className="flex items-center gap-4 pt-4 border-t border-white/5">
                  <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                    <FileText size={12} /> 12 Notes
                  </div>
                  <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                    <DollarSign size={12} /> $24.00
                  </div>
                </div>
              </div>
            </GlassCard>
          </motion.div>
        ))}
        {subjects.length === 0 && !isAdding && (
          <div className="col-span-full py-20 text-center border-2 border-dashed border-white/5 rounded-3xl">
            <p className="text-slate-500 font-bold uppercase tracking-widest">Your Hub is Empty</p>
            <p className="text-sm text-slate-600 mt-2">Add your first subject to begin tracking your aura.</p>
          </div>
        )}
      </div>
    </div>
  );
}

// --- Subject Detail & Smart Timer ---

function SubjectDetail({ subject, onClose, uid }) {
  const [activeTab, setActiveTab] = useState('timer');
  const [studyTime, setStudyTime] = useState(0);
  const [breakTime, setBreakTime] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const [timerType, setTimerType] = useState('study');
  const intervalRef = useRef(null);

  const [resources, setResources] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [notes, setNotes] = useState([]);

  useEffect(() => {
    const rRef = collection(db, `artifacts/${APP_ID}/users/${uid}/subjects/${subject.id}/resources`);
    const eRef = collection(db, `artifacts/${APP_ID}/users/${uid}/subjects/${subject.id}/expenses`);
    const nRef = collection(db, `artifacts/${APP_ID}/users/${uid}/subjects/${subject.id}/notes`);

    const unsubR = onSnapshot(query(rRef, orderBy('createdAt', 'desc')), (s) => setResources(s.docs.map(d => ({id: d.id, ...d.data()}))));
    const unsubE = onSnapshot(query(eRef, orderBy('createdAt', 'desc')), (s) => setExpenses(s.docs.map(d => ({id: d.id, ...d.data()}))));
    const unsubN = onSnapshot(query(nRef, orderBy('createdAt', 'desc')), (s) => setNotes(s.docs.map(d => ({id: d.id, ...d.data()}))));

    return () => { unsubR(); unsubE(); unsubN(); };
  }, [subject.id]);

  useEffect(() => {
    if (isRunning) {
      intervalRef.current = setInterval(() => {
        if (timerType === 'study') setStudyTime(prev => prev + 1);
        else setBreakTime(prev => prev + 1);
      }, 1000);
    } else {
      clearInterval(intervalRef.current);
    }
    return () => clearInterval(intervalRef.current);
  }, [isRunning, timerType]);

  const formatTime = (sec) => {
    const h = Math.floor(sec / 3600);
    const m = Math.floor((sec % 3600) / 60);
    const s = sec % 60;
    return `${h > 0 ? h + ':' : ''}${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const saveSession = async () => {
    setIsRunning(false);
    const studyMins = Math.round(studyTime / 60);
    const breakMins = Math.round(breakTime / 60);

    try {
      await withBackoff(async () => {
        await updateDoc(doc(db, `artifacts/${APP_ID}/users/${uid}/subjects`, subject.id), {
          totalStudyTime: (subject.totalStudyTime || 0) + studyMins,
          totalBreakTime: (subject.totalBreakTime || 0) + breakMins
        });

        const userRef = doc(db, `artifacts/${APP_ID}/users/${uid}`);
        const userSnap = await getDoc(userRef);
        const currentData = userSnap.data();
        const xpGain = (studyMins * 10);
        const newXP = currentData.xp + xpGain;
        const newLevel = Math.floor(newXP / 1000) + 1;

        await updateDoc(userRef, {
          xp: newXP,
          level: newLevel,
          totalStudyMinutes: (currentData.totalStudyMinutes || 0) + studyMins,
          lastActive: new Date().toISOString()
        });
      });

      setStudyTime(0);
      setBreakTime(0);
      alert(`Session Analyzed! You earned ${studyMins * 10} XP. Mastery increased.`);
    } catch (err) {
      console.error("Save session failed:", err);
    }
  };

  const breakRatio = studyTime > 0 ? (breakTime / studyTime) : 0;
  const showAlert = breakRatio > 0.2;

  const tabs = [
    { id: 'timer', label: 'Smart Timer', icon: Clock },
    { id: 'resources', label: 'Resources', icon: Book },
    { id: 'expenses', label: 'Budget', icon: DollarSign },
    { id: 'notes', label: 'Quick Notes', icon: FileText }
  ];

  return (
    <div className="space-y-8 pb-20">
      <div className="flex items-center gap-6">
        <button onClick={onClose} className="p-3 bg-white/5 rounded-2xl hover:bg-white/10 text-slate-400 hover:text-white transition-all">
          <ChevronRight size={24} className="rotate-180" />
        </button>
        <div>
          <h2 className="text-4xl font-black tracking-tight">{subject.name}</h2>
          <div className="flex items-center gap-2 mt-1">
            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: subject.color }}></div>
            <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">Active Focus Module</span>
          </div>
        </div>
      </div>

      <div className="flex bg-white/[0.02] p-1.5 rounded-2xl border border-white/5 w-fit">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-6 py-3 rounded-xl font-bold transition-all ${activeTab === tab.id ? 'bg-white/10 text-white shadow-lg ring-1 ring-white/10' : 'text-slate-500 hover:text-slate-300'}`}
          >
            <tab.icon size={18} className={activeTab === tab.id ? 'text-aura-purple' : ''} />
            {tab.label}
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        {activeTab === 'timer' && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <GlassCard className="flex flex-col items-center justify-center py-16 px-10">
              <div className="absolute top-6 left-6 text-[10px] font-black text-aura-purple uppercase tracking-[0.3em]">Deep Work Engine</div>
              <div className={`text-sm font-black uppercase tracking-[0.2em] mb-4 ${timerType === 'study' ? 'text-aura-purple' : 'text-slate-600'}`}>Study Phase</div>
              <div className="text-8xl font-black font-mono tracking-tighter aura-text-gradient mb-12">{formatTime(studyTime)}</div>

              <div className="flex gap-4 w-full max-w-sm">
                {timerType === 'study' ? (
                  <Button
                    className="flex-1 py-4 text-lg font-black rounded-2xl"
                    variant={isRunning ? 'secondary' : 'primary'}
                    onClick={() => setIsRunning(!isRunning)}
                    icon={isRunning ? Pause : Play}
                  >
                    {isRunning ? 'Pause' : 'Focus'}
                  </Button>
                ) : (
                  <Button variant="secondary" className="flex-1 py-4 rounded-2xl font-black" onClick={() => { setTimerType('study'); setIsRunning(true); }}>Resume Study</Button>
                )}
                <Button variant="outline" className="px-6 rounded-2xl" icon={RotateCcw} onClick={() => { setIsRunning(false); setStudyTime(0); }} />
              </div>
            </GlassCard>

            <GlassCard className={`flex flex-col items-center justify-center py-16 px-10 relative overflow-hidden transition-colors duration-500 ${showAlert ? 'ring-2 ring-red-500/50' : ''}`}>
              <AnimatePresence>
                {showAlert && (
                  <motion.div
                    initial={{ y: -50 }} animate={{ y: 0 }} exit={{ y: -50 }}
                    className="absolute top-0 left-0 w-full bg-red-500/20 text-red-400 py-3 flex items-center justify-center gap-3 text-xs font-black uppercase tracking-widest border-b border-red-500/30"
                  >
                    <Bell size={14} className="animate-bounce" /> SMART ALERT: Break Efficiency Dropping (20% Limit)
                  </motion.div>
                )}
              </AnimatePresence>
              <div className={`text-sm font-black uppercase tracking-[0.2em] mb-4 ${timerType === 'break' ? 'text-aura-blue' : 'text-slate-600'}`}>Recovery Phase</div>
              <div className={`text-8xl font-black font-mono tracking-tighter mb-12 ${timerType === 'break' ? 'text-aura-blue' : 'text-slate-300'}`}>{formatTime(breakTime)}</div>

              <div className="flex gap-4 w-full max-w-sm">
                {timerType === 'break' ? (
                  <Button
                    className="flex-1 py-4 text-lg font-black rounded-2xl bg-aura-blue text-white hover:bg-aura-blue/80 shadow-aura-blue/20"
                    variant="primary"
                    onClick={() => setIsRunning(!isRunning)}
                    icon={isRunning ? Pause : Play}
                  >
                    {isRunning ? 'Pause' : 'Rest'}
                  </Button>
                ) : (
                  <Button variant="secondary" className="flex-1 py-4 rounded-2xl font-black" onClick={() => { setTimerType('break'); setIsRunning(true); }}>Take Break</Button>
                )}
                <Button variant="outline" className="px-6 rounded-2xl" icon={RotateCcw} onClick={() => { setIsRunning(false); setBreakTime(0); }} />
              </div>
            </GlassCard>

            {(studyTime > 0 || breakTime > 0) && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="lg:col-span-2 flex justify-center pt-4">
                <Button className="px-16 py-5 text-xl font-black rounded-3xl shadow-2xl" onClick={saveSession}>Sync Session Data</Button>
              </motion.div>
            )}
          </motion.div>
        )}

        {activeTab === 'resources' && <ResourcesTab uid={uid} subjectId={subject.id} resources={resources} />}
        {activeTab === 'expenses' && <ExpensesTab uid={uid} subjectId={subject.id} expenses={expenses} />}
        {activeTab === 'notes' && <NotesTab uid={uid} subjectId={subject.id} notes={notes} />}
      </AnimatePresence>
    </div>
  );
}

function ResourcesTab({ uid, subjectId, resources }) {
  const [link, setLink] = useState('');
  const [title, setTitle] = useState('');

  const addResource = async (e) => {
    e.preventDefault();
    if (!title) return;
    await addDoc(collection(db, `artifacts/${APP_ID}/users/${uid}/subjects/${subjectId}/resources`), {
      title, link, createdAt: new Date().toISOString()
    });
    setLink(''); setTitle('');
  };

  return (
    <div className="space-y-8">
      <GlassCard className="!p-8 bg-white/[0.01]">
        <h4 className="font-black text-xl mb-6">Catalog New Resource</h4>
        <form onSubmit={addResource} className="grid grid-cols-1 md:grid-cols-12 gap-4">
          <div className="md:col-span-5">
            <input placeholder="Title (e.g., Textbook Vol 1)" value={title} onChange={e=>setTitle(e.target.value)} className="w-full bg-white/[0.05] border border-white/10 rounded-2xl px-6 py-4 text-white focus:outline-none focus:ring-2 focus:ring-aura-purple/50 font-medium" />
          </div>
          <div className="md:col-span-5">
            <input placeholder="Digital Link / ISBN" value={link} onChange={e=>setLink(e.target.value)} className="w-full bg-white/[0.05] border border-white/10 rounded-2xl px-6 py-4 text-white focus:outline-none focus:ring-2 focus:ring-aura-purple/50 font-medium" />
          </div>
          <div className="md:col-span-2">
            <Button type="submit" icon={Plus} className="w-full h-full rounded-2xl">Add</Button>
          </div>
        </form>
      </GlassCard>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {resources.map((r, idx) => (
          <motion.div key={r.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: idx * 0.05 }}>
            <GlassCard className="!p-5 group border border-white/5 hover:border-aura-blue/30 transition-all">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4 truncate">
                  <div className="p-3 bg-aura-blue/10 text-aura-blue rounded-xl shrink-0"><Book size={20} /></div>
                  <div className="truncate">
                    <div className="font-bold text-slate-200 truncate">{r.title}</div>
                    <div className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-0.5 truncate">{r.link || 'NO LINK'}</div>
                  </div>
                </div>
                <button onClick={() => deleteDoc(doc(db, `artifacts/${APP_ID}/users/${uid}/subjects/${subjectId}/resources`, r.id))} className="text-slate-700 hover:text-red-400 transition-colors p-2"><Trash2 size={18} /></button>
              </div>
            </GlassCard>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

function ExpensesTab({ uid, subjectId, expenses }) {
  const [item, setItem] = useState('');
  const [amount, setAmount] = useState('');

  const addExpense = async (e) => {
    e.preventDefault();
    if (!item || !amount) return;
    await addDoc(collection(db, `artifacts/${APP_ID}/users/${uid}/subjects/${subjectId}/expenses`), {
      item, amount: parseFloat(amount), createdAt: new Date().toISOString()
    });
    setItem(''); setAmount('');
  };

  const total = expenses.reduce((sum, e) => sum + e.amount, 0);

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <GlassCard className="lg:col-span-1 aura-gradient !bg-none text-white p-8">
          <div className="text-[10px] font-black uppercase tracking-[0.2em] mb-2 opacity-80">Total Subject Investment</div>
          <div className="text-5xl font-black mb-1">${total.toFixed(2)}</div>
          <p className="text-white/60 text-xs font-bold uppercase tracking-widest mt-4 flex items-center gap-2">
            <DollarSign size={12} /> {expenses.length} Total Transactions
          </p>
        </GlassCard>

        <GlassCard className="lg:col-span-2 !p-8">
          <h4 className="font-black text-xl mb-6">Record Investment</h4>
          <form onSubmit={addExpense} className="grid grid-cols-1 md:grid-cols-12 gap-4">
            <div className="md:col-span-6">
              <input placeholder="Expense Item (e.g., Course Fee)" value={item} onChange={e=>setItem(e.target.value)} className="w-full bg-white/[0.05] border border-white/10 rounded-2xl px-6 py-4 text-white focus:outline-none focus:ring-2 focus:ring-aura-purple/50 font-medium" />
            </div>
            <div className="md:col-span-4">
              <input type="number" placeholder="Amount" value={amount} onChange={e=>setAmount(e.target.value)} className="w-full bg-white/[0.05] border border-white/10 rounded-2xl px-6 py-4 text-white focus:outline-none focus:ring-2 focus:ring-aura-purple/50 font-medium" />
            </div>
            <div className="md:col-span-2">
              <Button type="submit" icon={Plus} className="w-full h-full rounded-2xl">Log</Button>
            </div>
          </form>
        </GlassCard>
      </div>

      <div className="space-y-3">
        {expenses.map((e, idx) => (
          <motion.div key={e.id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: idx * 0.05 }} className="flex items-center justify-between p-5 bg-white/[0.02] border border-white/5 rounded-2xl group hover:border-aura-purple/30 transition-all">
            <div className="flex items-center gap-4">
              <div className="p-2 bg-green-500/10 text-green-400 rounded-lg"><DollarSign size={16} /></div>
              <div>
                <div className="font-bold text-slate-200">{e.item}</div>
                <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{new Date(e.createdAt).toLocaleDateString()}</div>
              </div>
            </div>
            <div className="flex items-center gap-6">
              <span className="text-xl font-black text-white">${e.amount.toFixed(2)}</span>
              <button onClick={() => deleteDoc(doc(db, `artifacts/${APP_ID}/users/${uid}/subjects/${subjectId}/expenses`, e.id))} className="opacity-0 group-hover:opacity-100 p-2 text-slate-700 hover:text-red-400 transition-all"><Trash2 size={18} /></button>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

function NotesTab({ uid, subjectId, notes }) {
  const [content, setContent] = useState('');

  const addNote = async (e) => {
    e.preventDefault();
    if (!content.trim()) return;
    await addDoc(collection(db, `artifacts/${APP_ID}/users/${uid}/subjects/${subjectId}/notes`), {
      content, createdAt: new Date().toISOString()
    });
    setContent('');
  };

  return (
    <div className="space-y-8">
      <GlassCard className="!p-8">
        <h4 className="font-black text-xl mb-6">Aura Note</h4>
        <form onSubmit={addNote} className="space-y-4">
          <textarea
            placeholder="Capture a flash of insight..."
            value={content}
            onChange={e=>setContent(e.target.value)}
            className="w-full h-32 bg-white/[0.05] border border-white/10 rounded-2xl px-6 py-5 text-white focus:outline-none focus:ring-2 focus:ring-aura-purple/50 font-medium custom-scrollbar"
          />
          <div className="flex justify-end">
            <Button type="submit" icon={FileText} className="px-10 py-4 rounded-2xl">Preserve Note</Button>
          </div>
        </form>
      </GlassCard>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {notes.map((n, idx) => (
          <motion.div key={n.id} initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: idx * 0.05 }}>
            <GlassCard className="!p-6 group border border-white/5 hover:border-aura-purple/30 transition-all">
              <div className="flex justify-between items-start mb-4">
                <div className="flex items-center gap-2">
                  <div className="w-1 h-4 aura-gradient rounded-full"></div>
                  <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{new Date(n.createdAt).toLocaleString()}</div>
                </div>
                <button onClick={() => deleteDoc(doc(db, `artifacts/${APP_ID}/users/${uid}/subjects/${subjectId}/notes`, n.id))} className="opacity-0 group-hover:opacity-100 p-2 text-slate-700 hover:text-red-400 transition-all"><Trash2 size={16} /></button>
              </div>
              <div className="text-slate-300 font-medium leading-relaxed whitespace-pre-wrap">{n.content}</div>
            </GlassCard>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

// --- Analytics Engine ---

function AnalyticsView({ tasks, subjects }) {
  const [filter, setFilter] = useState('efficiency');

  const chartData = useMemo(() => {
    return subjects.map(s => ({
      name: s.name.substring(0, 10) + (s.name.length > 10 ? '..' : ''),
      study: s.totalStudyTime || 0,
      break: s.totalBreakTime || 0
    }));
  }, [subjects]);

  const pieData = useMemo(() => {
    return subjects.map(s => ({
      name: s.name,
      value: s.totalStudyTime || 0
    })).filter(v => v.value > 0);
  }, [subjects]);

  const COLORS = ['#A78BFA', '#60A5FA', '#F472B6', '#34D399', '#FB923C', '#818CF8'];

  const stats = [
    { label: 'Total Focus', value: `${Math.round(subjects.reduce((sum, s) => sum + (s.totalStudyTime || 0), 0) / 60)}h`, icon: Clock, color: 'text-aura-purple' },
    { label: 'Avg Session', value: '42m', icon: TrendingUp, color: 'text-aura-blue' },
    { label: 'Streak', value: '7d', icon: Flame, color: 'text-orange-500' },
    { label: 'XP Rank', value: 'Elite', icon: Trophy, color: 'text-aura-pink' }
  ];

  return (
    <div className="space-y-10 pb-20">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h2 className="text-4xl font-black tracking-tight">Analytics Engine</h2>
          <p className="text-slate-500 font-medium mt-1">Deep insights into your learning patterns.</p>
        </div>
        <div className="flex bg-white/[0.03] p-1.5 rounded-2xl border border-white/5 backdrop-blur-md">
          <button
            onClick={() => setFilter('efficiency')}
            className={`px-6 py-3 rounded-xl text-sm font-black uppercase tracking-widest transition-all ${filter === 'efficiency' ? 'bg-white/10 text-white shadow-lg ring-1 ring-white/10' : 'text-slate-500 hover:text-white'}`}
          >
            Efficiency
          </button>
          <button
            onClick={() => setFilter('distribution')}
            className={`px-6 py-3 rounded-xl text-sm font-black uppercase tracking-widest transition-all ${filter === 'distribution' ? 'bg-white/10 text-white shadow-lg ring-1 ring-white/10' : 'text-slate-500 hover:text-white'}`}
          >
            Distribution
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
        {stats.map((stat, idx) => (
          <GlassCard key={idx} className="!p-6 group border border-white/5 hover:border-aura-purple/30 transition-all">
            <div className="flex items-center gap-3 mb-4 text-slate-500">
              <stat.icon size={18} />
              <span className="text-[10px] font-black uppercase tracking-[0.2em]">{stat.label}</span>
            </div>
            <div className={`text-4xl font-black ${stat.color}`}>{stat.value}</div>
          </GlassCard>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <GlassCard className="lg:col-span-8 h-[500px] border border-white/5">
          <div className="flex items-center justify-between mb-10">
            <h3 className="font-black text-xl tracking-tight">Performance Correlation</h3>
            <div className="flex gap-2">
              <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-aura-purple"><div className="w-2 h-2 bg-aura-purple rounded-full"></div> Study</div>
              <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-aura-blue"><div className="w-2 h-2 bg-aura-blue rounded-full"></div> Break</div>
            </div>
          </div>
          <ResponsiveContainer width="100%" height="80%">
            {filter === 'efficiency' ? (
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="colorStudy" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#A78BFA" stopOpacity={0.4}/>
                    <stop offset="95%" stopColor="#A78BFA" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorBreak" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#60A5FA" stopOpacity={0.4}/>
                    <stop offset="95%" stopColor="#60A5FA" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="5 5" stroke="#ffffff05" vertical={false} />
                <XAxis dataKey="name" stroke="#475569" fontSize={10} fontWeight="bold" axisLine={false} tickLine={false} />
                <YAxis stroke="#475569" fontSize={10} fontWeight="bold" axisLine={false} tickLine={false} />
                <Tooltip
                  cursor={{ stroke: '#ffffff10', strokeWidth: 2 }}
                  contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #ffffff10', borderRadius: '16px', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.5)' }}
                />
                <Area type="monotone" dataKey="study" stroke="#A78BFA" strokeWidth={4} fillOpacity={1} fill="url(#colorStudy)" />
                <Area type="monotone" dataKey="break" stroke="#60A5FA" strokeWidth={4} fillOpacity={1} fill="url(#colorBreak)" />
              </AreaChart>
            ) : (
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="5 5" stroke="#ffffff05" vertical={false} />
                <XAxis dataKey="name" stroke="#475569" fontSize={10} fontWeight="bold" axisLine={false} tickLine={false} />
                <YAxis stroke="#475569" fontSize={10} fontWeight="bold" axisLine={false} tickLine={false} />
                <Tooltip
                  cursor={{ fill: '#ffffff05' }}
                  contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #ffffff10', borderRadius: '16px' }}
                />
                <Bar dataKey="study" fill="#A78BFA" radius={[6, 6, 0, 0]} />
                <Bar dataKey="break" fill="#60A5FA" radius={[6, 6, 0, 0]} />
              </BarChart>
            )}
          </ResponsiveContainer>
        </GlassCard>

        <GlassCard className="lg:col-span-4 flex flex-col border border-white/5">
          <h3 className="font-black text-xl tracking-tight mb-10">Study Composition</h3>
          <div className="flex-1 flex flex-col items-center justify-center">
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={65}
                  outerRadius={90}
                  paddingAngle={8}
                  dataKey="value"
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #ffffff10', borderRadius: '16px' }}
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="w-full mt-6 space-y-3">
              {pieData.map((entry, index) => (
                <div key={index} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }}></div>
                    <span className="text-xs font-bold text-slate-300">{entry.name}</span>
                  </div>
                  <span className="text-xs font-black text-slate-500">{Math.round((entry.value / subjects.reduce((sum, s) => sum + (s.totalStudyTime || 0), 0)) * 100)}%</span>
                </div>
              ))}
            </div>
          </div>
        </GlassCard>
      </div>

      <GlassCard className="bg-white/[0.01] border-white/5">
        <div className="flex flex-col md:flex-row items-center gap-8 py-4">
          <div className="w-20 h-20 bg-aura-purple/10 rounded-3xl flex items-center justify-center text-aura-purple shrink-0">
            <TrendingUp size={40} />
          </div>
          <div>
            <h4 className="text-2xl font-black mb-2 tracking-tight">Focus Intelligence Report</h4>
            <p className="text-slate-500 font-medium leading-relaxed max-w-3xl">
              Your "Deep Work" efficiency is at an all-time high this week. You tend to study most effectively between <span className="text-white font-bold">10:00 AM and 1:00 PM</span>. Your break-to-study ratio is stable at <span className="text-aura-blue font-bold">18%</span>, well within the optimal productivity zone. Keep this momentum for another 3 days to unlock the <span className="text-aura-pink font-bold">"Flow Master"</span> badge.
            </p>
          </div>
        </div>
      </GlassCard>
    </div>
  );
}

// --- Settings View ---

function SettingsView({ user, userData }) {
  return (
    <div className="max-w-4xl mx-auto space-y-12 pb-20">
      <div className="flex items-center gap-6">
        <div className="w-24 h-24 aura-gradient rounded-[2.5rem] flex items-center justify-center text-4xl font-black text-white shadow-2xl shadow-aura-purple/30 rotate-3">
          {user.email[0].toUpperCase()}
        </div>
        <div>
          <h2 className="text-4xl font-black tracking-tight">{user.email}</h2>
          <div className="flex items-center gap-3 mt-2">
            <span className="text-xs font-black text-slate-500 uppercase tracking-widest bg-white/5 px-3 py-1 rounded-full border border-white/5">Member since {new Date().getFullYear()}</span>
            <div className="flex items-center gap-1.5 px-3 py-1 bg-aura-purple/10 text-aura-purple rounded-full text-[10px] font-black border border-aura-purple/20 uppercase tracking-widest">Premium Aura</div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <GlassCard className="border border-white/5">
          <h4 className="font-black text-xl mb-8 flex items-center gap-3">
            <Bell size={20} className="text-aura-purple" />
            Intelligence Alerts
          </h4>
          <div className="space-y-6">
            <Toggle label="Smart Break Alerts" active />
            <Toggle label="Daily Performance Review" />
            <Toggle label="Streak Recovery Protection" active />
          </div>
        </GlassCard>

        <GlassCard className="border border-white/5">
          <h4 className="font-black text-xl mb-8 flex items-center gap-3">
            <LayoutDashboard size={20} className="text-aura-blue" />
            Workspace Aesthetics
          </h4>
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-bold">Aura Intensity</div>
                <div className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-1">Gradients & Blurs</div>
              </div>
              <input type="range" className="w-32 accent-aura-purple h-1 bg-white/10 rounded-full" />
            </div>
            <Toggle label="Haptic Feedback" active />
            <Toggle label="Dynamic Color Sync" />
          </div>
        </GlassCard>
      </div>

      <GlassCard className="bg-red-500/[0.02] border-red-500/10 !p-10">
        <h4 className="text-red-400 font-black text-xl mb-2">Danger Zone</h4>
        <p className="text-slate-500 text-sm font-medium mb-6">Irreversibly delete your workspace and all aura data.</p>
        <Button variant="danger" className="px-8 py-3 rounded-2xl font-black">Purge All Data</Button>
      </GlassCard>

      <div className="text-center pt-8">
        <div className="inline-block p-4 bg-white/[0.02] rounded-3xl border border-white/5">
          <p className="text-slate-600 text-xs font-bold uppercase tracking-[0.3em]">AuraStudy OS v1.0.4 — Peak Human Performance Interface</p>
        </div>
      </div>
    </div>
  );
}

function Toggle({ label, active = false }) {
  return (
    <div className="flex items-center justify-between group">
      <span className="text-sm font-bold group-hover:text-white transition-colors">{label}</span>
      <div className={`w-12 h-6 rounded-full relative transition-all cursor-pointer ${active ? 'bg-aura-purple' : 'bg-slate-800'}`}>
        <motion.div
          animate={{ x: active ? 26 : 4 }}
          className="absolute top-1 w-4 h-4 bg-white rounded-full shadow-lg"
        />
      </div>
    </div>
  );
}
