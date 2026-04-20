import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard, BookOpen, TrendingUp, Settings, LogOut,
  ChevronLeft, ChevronRight, Zap, Calendar as CalendarIcon
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import Button from './ui/Button';

const Sidebar = ({ activeTab, setActiveTab }) => {
  const { stats, logout, subjects, tasks, selectedDate, setSelectedDate } = useApp();
  const [collapsed, setCollapsed] = useState(false);

  const menuItems = [
    { id: 'dashboard', label: 'Workspace', icon: LayoutDashboard },
    { id: 'curriculum', label: 'Curriculum', icon: BookOpen },
    { id: 'analytics', label: 'Engine', icon: TrendingUp },
    { id: 'config', label: 'Settings', icon: Settings }
  ];

  return (
    <motion.nav
      initial={false}
      animate={{ width: collapsed ? 100 : 320 }}
      className="h-screen bg-white/5 border-r border-white/5 flex flex-col p-6 gap-8 relative transition-all duration-500 ease-in-out"
    >
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="absolute -right-4 top-12 w-8 h-8 bg-indigo-600 rounded-full flex items-center justify-center text-white shadow-lg z-50 hover:scale-110 transition-transform"
      >
        {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
      </button>

      {/* Logo Area */}
      <div className="flex items-center gap-4 px-2">
        <div className="min-w-[48px] h-12 bg-indigo-600 rounded-2xl flex items-center justify-center text-white shadow-indigo-500/20 shadow-lg">
          <Zap fill="currentColor" />
        </div>
        {!collapsed && (
          <motion.h1
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            className="text-2xl font-black tracking-tighter text-white"
          >
            StudyFlow
          </motion.h1>
        )}
      </div>

      {/* Navigation Items */}
      <div className="flex-1 space-y-2">
        {menuItems.map((item) => (
          <button
            key={item.id}
            onClick={() => setActiveTab(item.id)}
            className={`w-full flex items-center gap-4 p-4 rounded-2xl transition-all group ${
              activeTab === item.id ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20' : 'text-slate-500 hover:bg-white/5 hover:text-white'
            }`}
          >
            <div className="min-w-[20px]"><item.icon size={20} /></div>
            {!collapsed && (
              <motion.span
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                className="font-bold whitespace-nowrap"
              >
                {item.label}
              </motion.span>
            )}
          </button>
        ))}
      </div>

      {/* Widgets Area */}
      {!collapsed && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="space-y-6"
        >
          {/* Progress Widget */}
          <div className="bg-white/5 rounded-3xl p-4 border border-white/5">
             <div className="flex justify-between items-center mb-4">
                <h4 className="text-[10px] font-black uppercase text-indigo-400">Subject Progress</h4>
             </div>
             <div className="space-y-3">
                {subjects.slice(0, 3).map(s => {
                  const subTasks = tasks.filter(t => t.subjectId === s.id);
                  const completed = subTasks.filter(t => t.completed).length;
                  const remaining = subTasks.length - completed;
                  const progress = subTasks.length ? (completed / subTasks.length) * 100 : 0;
                  return (
                    <div key={s.id}>
                      <div className="flex justify-between text-[10px] mb-1 font-bold text-slate-400">
                        <span>{s.name}</span>
                        <span>{remaining} left • {Math.round(progress)}%</span>
                      </div>
                      <div className="h-1 bg-white/5 rounded-full overflow-hidden">
                        <motion.div
                          animate={{ width: `${progress}%` }}
                          className="h-full bg-indigo-500"
                        />
                      </div>
                    </div>
                  );
                })}
             </div>
          </div>

          {/* Mini Calendar Widget */}
          <div className="bg-white/5 rounded-3xl p-4 border border-white/5">
             <div className="flex items-center gap-2 mb-2">
                <CalendarIcon size={14} className="text-indigo-400" />
                <h4 className="text-[10px] font-black uppercase text-indigo-400">{new Date().toLocaleString('default', { month: 'long' })}</h4>
             </div>
             <div className="grid grid-cols-7 gap-1 text-center mb-1">
                {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => (
                  <div key={i} className="text-[7px] font-black text-slate-600">{d}</div>
                ))}
             </div>
             <div className="grid grid-cols-7 gap-1">
                {(() => {
                  const now = new Date();
                  const firstDay = new Date(now.getFullYear(), now.getMonth(), 1).getDay();
                  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();

                  const days = [];
                  // Add empty slots for the first day offset
                  for (let i = 0; i < firstDay; i++) {
                    days.push(<div key={`empty-${i}`} className="aspect-square" />);
                  }

                  // Add actual days
                  for (let day = 1; day <= daysInMonth; day++) {
                    const dateStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                    const isSelected = selectedDate === dateStr;
                    const isToday = day === now.getDate() && now.getMonth() === new Date().getMonth();

                    days.push(
                      <button
                        key={day}
                        onClick={() => setSelectedDate(dateStr)}
                        className={`aspect-square rounded-md flex items-center justify-center text-[8px] font-bold transition-all ${
                          isSelected ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/40' :
                          isToday ? 'text-indigo-400 border border-indigo-500/30' : 'text-slate-500 hover:text-white hover:bg-white/5'
                        }`}
                      >
                        {day}
                      </button>
                    );
                  }
                  return days;
                })()}
             </div>
          </div>
        </motion.div>
      )}

      {/* Footer / Stats */}
      <div className="pt-6 border-t border-white/5 space-y-4">
        {!collapsed && (
          <div>
            <div className="flex justify-between text-[10px] font-black uppercase text-indigo-400 mb-1">
              <span>Lvl {stats.level}</span>
              <span>{stats.xp % 1000}/1000 XP</span>
            </div>
            <div className="h-1 bg-white/5 rounded-full overflow-hidden">
              <motion.div
                animate={{ width: `${(stats.xp % 1000) / 10}%` }}
                className="h-full bg-indigo-500 shadow-[0_0_10px_#6366f1]"
              />
            </div>
          </div>
        )}
        <Button
          variant="danger"
          className="w-full"
          icon={LogOut}
          onClick={logout}
        >
          {!collapsed && "Sign Out"}
        </Button>
      </div>
    </motion.nav>
  );
};

export default Sidebar;
