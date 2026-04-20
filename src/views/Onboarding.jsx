import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Zap, Mail, Lock, Clock, BookOpen, Hash, Zap as ZapIcon, Flame, Coffee, Book } from 'lucide-react';
import { useApp } from '../context/AppContext';
import GlassCard from '../components/ui/GlassCard';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import AvatarComponent from '../components/AvatarComponent';

const DEFAULT_SUBJECTS = [
  { name: 'Arabic', color: '#6366f1', icon: BookOpen },
  { name: 'English', color: '#a855f7', icon: Book },
  { name: 'Math', color: '#ec4899', icon: Hash },
  { name: 'Chemistry', color: '#10b981', icon: ZapIcon },
  { name: 'Physics', color: '#3b82f6', icon: Flame },
  { name: 'Biology', color: '#f59e0b', icon: Coffee }
];

const Onboarding = () => {
  const { login, register, avatarGender, setAvatarGender, completeSetup } = useApp();
  const [step, setStep] = useState(1);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [totalHours, setTotalHours] = useState(8);
  const [selectedSubjects, setSelectedSubjects] = useState(DEFAULT_SUBJECTS.map(s => s.name));
  const [isLogin, setIsLogin] = useState(false);

  const nextStep = () => setStep(s => s + 1);
  const prevStep = () => setStep(s => s - 1);

  const handleAuth = async (e) => {
    e.preventDefault();
    setError('');
    try {
      if (isLogin) {
        await login(email, password);
      } else {
        await register(email, password);
      }
      nextStep();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleFinalize = async () => {
    const studyMins = (totalHours * 60) * 0.8;
    const minsPerSubject = studyMins / selectedSubjects.length;

    const subjects = selectedSubjects.map(name => {
      const def = DEFAULT_SUBJECTS.find(s => s.name === name);
      return {
        id: Math.random().toString(36).substr(2, 9),
        name,
        color: def.color,
        targetTime: Math.round(minsPerSubject),
        actualTime: 0,
        breakTime: 0,
        sessions: 0,
        resources: [],
        expenses: [],
        notes: ''
      };
    });

    await completeSetup({
      totalHours,
      subjects,
      stats: { xp: 0, level: 1, streak: 1, lastActive: new Date().toISOString() }
    });
  };

  return (
    <div className="min-h-screen bg-[#0b0f1a] flex items-center justify-center p-6 bg-gradient-to-br from-indigo-950 via-slate-950 to-purple-950 overflow-hidden">
      <AnimatePresence mode="wait">
        {step === 1 && (
          <motion.div
            key="step1"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="max-w-2xl w-full text-center"
          >
            <h2 className="text-4xl font-black mb-2 tracking-tighter text-white">Choose Your Companion</h2>
            <p className="text-slate-400 mb-12">This choice is permanent and defines your journey.</p>

            <div className="flex justify-center gap-12 mb-12">
              {['female', 'male'].map((g) => (
                <button
                  key={g}
                  onClick={() => setAvatarGender(g)}
                  className={`group relative p-6 rounded-3xl transition-all duration-500 border-2 ${
                    avatarGender === g ? 'bg-indigo-600/20 border-indigo-500 shadow-[0_0_30px_rgba(99,102,241,0.3)]' : 'bg-white/5 border-white/5 opacity-50 hover:opacity-100'
                  }`}
                >
                  <AvatarComponent gender={g} state={avatarGender === g ? 'celebrating' : 'idle'} />
                  <p className="mt-4 font-black uppercase tracking-widest text-sm text-white">{g}</p>
                </button>
              ))}
            </div>

            <Button
              disabled={!avatarGender}
              onClick={nextStep}
              className="w-64 mx-auto py-4 text-lg"
            >
              Confirm Identity
            </Button>
          </motion.div>
        )}

        {step === 2 && (
          <motion.div
            key="step2"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="max-w-md w-full"
          >
            <GlassCard className="!bg-white/5">
              <div className="flex justify-center mb-6">
                <AvatarComponent gender={avatarGender} state="idle" className="w-32 h-32" />
              </div>
              <h2 className="text-3xl font-black text-center mb-2 tracking-tighter text-white">Secure Workspace</h2>
              <p className="text-center text-slate-400 mb-10 text-sm italic">"I'll keep your data safe!"</p>

              <form onSubmit={handleAuth} className="space-y-4">
                <Input
                  icon={Mail}
                  placeholder="Email Address"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
                <Input
                  icon={Lock}
                  type="password"
                  placeholder="Secret Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />

                {error && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-4 bg-red-500/10 border border-red-500/20 rounded-2xl text-red-400 text-xs text-center font-bold"
                  >
                    {error}
                  </motion.div>
                )}

                <Button type="submit" className="w-full py-4 text-lg">
                  {isLogin ? 'Enter Aura' : 'Create Aura'}
                </Button>
              </form>

              <button
                onClick={() => setIsLogin(!isLogin)}
                className="w-full mt-6 text-xs text-slate-500 font-bold hover:text-white transition-colors"
              >
                {isLogin ? "New here? Build an account" : "Already have an account? Log in"}
              </button>
            </GlassCard>
          </motion.div>
        )}

        {step === 3 && (
          <motion.div
            key="step3"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="max-w-2xl w-full"
          >
            <GlassCard className="space-y-10">
              <div className="flex items-center gap-6">
                <AvatarComponent gender={avatarGender} state="studying" className="w-24 h-24" />
                <div>
                  <h2 className="text-3xl font-black tracking-tighter text-white">Study Config</h2>
                  <p className="text-slate-400">Let's set your daily goals.</p>
                </div>
              </div>

              <div>
                <p className="text-[10px] font-black uppercase text-indigo-400 mb-4 text-center">Daily Operational Window: {totalHours}h</p>
                <input
                  type="range" min="1" max="24"
                  value={totalHours}
                  onChange={e => setTotalHours(parseInt(e.target.value))}
                  className="w-full accent-indigo-600 h-1 bg-white/10 rounded-full"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                {DEFAULT_SUBJECTS.map(s => (
                  <button
                    key={s.name}
                    onClick={() => setSelectedSubjects(prev =>
                      prev.includes(s.name) ? prev.filter(x => x !== s.name) : [...prev, s.name]
                    )}
                    className={`p-4 rounded-2xl border transition-all flex flex-col items-center gap-2 ${
                      selectedSubjects.includes(s.name)
                        ? 'bg-indigo-600 border-indigo-500 shadow-lg shadow-indigo-600/20'
                        : 'bg-white/5 border-white/5 opacity-50 hover:opacity-100'
                    }`}
                  >
                    <s.icon size={18} className="text-white" />
                    <span className="text-[10px] font-bold uppercase text-white">{s.name}</span>
                  </button>
                ))}
              </div>

              <div className="flex gap-4">
                <Button variant="secondary" onClick={prevStep} className="flex-1">Back</Button>
                <Button onClick={handleFinalize} className="flex-[2] py-4 text-lg">Construct Workspace</Button>
              </div>
            </GlassCard>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Onboarding;
