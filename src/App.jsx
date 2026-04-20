import React, { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useApp } from './context/AppContext';
import Sidebar from './components/Sidebar';
import Dashboard from './views/Dashboard';
import Curriculum from './views/Curriculum';
import AnalyticsView from './views/AnalyticsView';
import Settings from './views/Settings';
import Onboarding from './views/Onboarding';

export default function App() {
  const { user, loading, setupComplete, theme } = useApp();
  const [activeTab, setActiveTab] = useState('dashboard');

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0b0f1a] flex items-center justify-center">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full"
        />
      </div>
    );
  }

  if (!user || !setupComplete) {
    return <Onboarding />;
  }

  return (
    <div className={`min-h-screen flex transition-colors duration-500 ${theme === 'dark' ? 'bg-[#0b0f1a] text-white' : 'bg-slate-50 text-slate-900'}`}>
      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />

      <main className="flex-1 p-6 md:p-12 overflow-y-auto relative">
        <div className="max-w-7xl mx-auto">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
            >
              {activeTab === 'dashboard' && <Dashboard />}
              {activeTab === 'curriculum' && <Curriculum />}
              {activeTab === 'analytics' && <AnalyticsView />}
              {activeTab === 'config' && <Settings />}
            </motion.div>
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
}
