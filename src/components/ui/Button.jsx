import React from 'react';

const Button = ({ children, onClick, variant = 'primary', className = "", icon: Icon, disabled = false, type = "button" }) => {
  const variants = {
    primary: 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-xl hover:shadow-indigo-500/20 active:scale-95',
    secondary: 'bg-white/5 text-slate-700 dark:text-white hover:bg-white/10 backdrop-blur-md',
    danger: 'bg-red-500/10 text-red-500 hover:bg-red-500/20 border border-red-500/20',
    ghost: 'hover:bg-indigo-500/10 text-slate-500 hover:text-indigo-600',
    outline: 'border border-slate-200 dark:border-white/10 hover:border-indigo-500/50 text-slate-600 dark:text-slate-300'
  };
  return (
    <button
      type={type}
      disabled={disabled}
      onClick={onClick}
      className={`flex items-center justify-center gap-2 px-6 py-3 rounded-2xl transition-all font-bold disabled:opacity-50 ${variants[variant]} ${className}`}
    >
      {Icon && <Icon size={18} className="stroke-[2.5px]" />}
      {children}
    </button>
  );
};

export default Button;
