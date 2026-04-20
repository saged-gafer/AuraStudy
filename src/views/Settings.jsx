import React from 'react';
import { motion } from 'framer-motion';
import { Moon, Sun } from 'lucide-react';
import { useApp } from '../context/AppContext';
import GlassCard from '../components/ui/GlassCard';

const Settings = () => {
  const { theme, setTheme, totalHours, setTotalHours } = useApp();

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-2xl mx-auto space-y-12"
    >
      <header>
        <p className="text-indigo-400 font-bold uppercase text-[10px] tracking-widest">System Config</p>
        <h2 className="text-4xl font-black tracking-tighter text-white">Configuration</h2>
      </header>

      <GlassCard className="space-y-8">
        <div className="flex justify-between items-center">
          <div>
            <p className="font-bold text-white">Aura Theme Interface</p>
            <p className="text-xs opacity-50 text-slate-400">Switch visual mode</p>
          </div>
          <button
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            className={`w-14 h-8 rounded-full p-1 transition-colors ${theme === 'dark' ? 'bg-indigo-600' : 'bg-slate-300'}`}
          >
            <motion.div
              animate={{ x: theme === 'dark' ? 24 : 0 }}
              className="w-6 h-6 bg-white rounded-full flex items-center justify-center shadow-sm"
            >
              {theme === 'dark' ? <Moon size={12} className="text-indigo-600" /> : <Sun size={12} className="text-orange-500" />}
            </motion.div>
          </button>
        </div>

        <div className="pt-8 border-t border-white/5 space-y-4">
          <div className="flex justify-between items-center">
            <p className="text-xs font-black uppercase text-indigo-400 tracking-widest">Daily Capacity</p>
            <span className="text-xl font-black text-white">{totalHours}h</span>
          </div>
          <input
            type="range" min="1" max="24"
            value={totalHours}
            onChange={e => setTotalHours(parseInt(e.target.value))}
            className="w-full accent-indigo-600 h-1 bg-white/10 rounded-full cursor-pointer"
          />
          <p className="text-[10px] text-slate-500 font-bold italic">Adjusting this will update your analytics scaling.</p>
        </div>
      </GlassCard>

      <div className="text-center opacity-30 text-[10px] font-black uppercase tracking-[0.5em] text-slate-400">
        StudyFlow OS v3.0.0
      </div>
    </motion.div>
  );
};

export default Settings;
