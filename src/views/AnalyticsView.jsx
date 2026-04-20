import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell
} from 'recharts';
import { useApp } from '../context/AppContext';
import GlassCard from '../components/ui/GlassCard';

const AnalyticsView = () => {
  const { subjects, totalHours } = useApp();
  const [chartType, setChartType] = useState('area');

  const data = subjects.map(s => ({
    name: s.name,
    study: s.actualTime || 0,
    break: s.breakTime || 0,
    efficiency: s.actualTime ? Math.round((s.actualTime / (s.actualTime + (s.breakTime || 0))) * 100) : 0,
    color: s.color
  }));

  const avgEfficiency = Math.round(data.reduce((a, b) => a + b.efficiency, 0) / Math.max(1, data.length));

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-10"
    >
      <header className="flex justify-between items-end">
        <div>
          <p className="text-indigo-400 font-bold uppercase tracking-widest text-[10px]">Comparative Metrics</p>
          <h2 className="text-4xl font-black tracking-tighter text-white">Analytics Engine</h2>
        </div>
        <div className="flex bg-white/5 p-1 rounded-xl">
          {['area', 'bar', 'line', 'pie'].map(type => (
            <button
              key={type}
              onClick={() => setChartType(type)}
              className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase transition-all ${
                chartType === type ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-500 hover:text-white'
              }`}
            >
              {type}
            </button>
          ))}
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <GlassCard className="lg:col-span-8 h-[500px]">
          <ResponsiveContainer width="100%" height="100%">
            {chartType === 'area' ? (
              <AreaChart data={data}>
                <defs>
                  <linearGradient id="colorStudy" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#ffffff05" />
                <XAxis dataKey="name" stroke="#475569" fontSize={10} axisLine={false} tickLine={false} />
                <YAxis
                  stroke="#475569" fontSize={10} axisLine={false} tickLine={false}
                />
                <Tooltip contentStyle={{ backgroundColor: '#0f172a', border: 'none', borderRadius: '16px', color: '#fff' }} />
                <Area type="monotone" dataKey="study" stroke="#6366f1" strokeWidth={3} fillOpacity={1} fill="url(#colorStudy)" />
              </AreaChart>
            ) : chartType === 'bar' ? (
              <BarChart data={data} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#ffffff05" />
                <XAxis
                  type="number"
                  domain={[0, totalHours * 60]}
                  stroke="#475569" fontSize={10} axisLine={false} tickLine={false}
                  label={{ value: 'Minutes', position: 'insideBottom', offset: -5, fill: '#475569', fontSize: 10 }}
                />
                <YAxis dataKey="name" type="category" stroke="#475569" fontSize={10} axisLine={false} tickLine={false} width={80} />
                <Tooltip contentStyle={{ backgroundColor: '#0f172a', border: 'none', borderRadius: '16px', color: '#fff' }} />
                <Bar dataKey="study" fill="#6366f1" radius={[0, 10, 10, 0]} barSize={20} />
                <Bar dataKey="break" fill="#a855f7" radius={[0, 10, 10, 0]} barSize={10} />
              </BarChart>
            ) : chartType === 'line' ? (
              <LineChart data={data}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#ffffff05" />
                <XAxis dataKey="name" stroke="#475569" fontSize={10} axisLine={false} tickLine={false} />
                <YAxis stroke="#475569" fontSize={10} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ backgroundColor: '#0f172a', border: 'none', borderRadius: '16px', color: '#fff' }} />
                <Line type="monotone" dataKey="study" stroke="#6366f1" strokeWidth={3} dot={{ r: 6, fill: '#6366f1', strokeWidth: 2, stroke: '#0b0f1a' }} />
                <Line type="monotone" dataKey="break" stroke="#a855f7" strokeWidth={3} dot={{ r: 6, fill: '#a855f7', strokeWidth: 2, stroke: '#0b0f1a' }} />
              </LineChart>
            ) : (
              <PieChart>
                <Pie
                  data={data}
                  innerRadius={80}
                  outerRadius={140}
                  paddingAngle={5}
                  dataKey="study"
                >
                  {data.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ backgroundColor: '#0f172a', border: 'none', borderRadius: '16px', color: '#fff' }} />
              </PieChart>
            )}
          </ResponsiveContainer>
        </GlassCard>

        <GlassCard className="lg:col-span-4 flex flex-col items-center justify-center">
          <h4 className="font-black text-white mb-8">Average Efficiency</h4>
          <div className="relative flex items-center justify-center">
            <svg className="w-48 h-48 transform -rotate-90">
              <circle cx="96" cy="96" r="88" fill="none" stroke="currentColor" strokeWidth="16" className="text-white/5" />
              <motion.circle
                cx="96" cy="96" r="88" fill="none" stroke="currentColor" strokeWidth="16" className="text-indigo-600"
                strokeDasharray={552}
                initial={{ strokeDashoffset: 552 }}
                animate={{ strokeDashoffset: 552 - (552 * (avgEfficiency / 100)) }}
                transition={{ duration: 2, ease: "easeOut" }}
                strokeLinecap="round"
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-4xl font-black text-white">{avgEfficiency}%</span>
              <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Global</span>
            </div>
          </div>
          <p className="mt-8 text-center text-xs text-slate-400 font-bold px-6 leading-relaxed">
            Your efficiency is calculated based on study time vs. break periods during active sessions.
          </p>
        </GlassCard>
      </div>
    </motion.div>
  );
};

export default AnalyticsView;
