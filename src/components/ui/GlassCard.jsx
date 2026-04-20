import React from 'react';
import { motion } from 'framer-motion';

const GlassCard = ({ children, className = "", delay = 0 }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay }}
    className={`bg-white/10 dark:bg-slate-900/40 backdrop-blur-xl rounded-3xl p-6 border border-white/10 transition-all duration-500 hover:border-indigo-500/30 ${className}`}
  >
    {children}
  </motion.div>
);

export default GlassCard;
