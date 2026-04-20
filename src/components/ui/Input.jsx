import React from 'react';

const Input = ({ value, onChange, placeholder, type = "text", className = "", icon: Icon }) => {
  return (
    <div className={`relative w-full ${className}`}>
      {Icon && (
        <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500">
          <Icon size={18} />
        </div>
      )}
      <input
        type={type}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        className={`w-full bg-white/5 border border-white/10 rounded-2xl ${Icon ? 'pl-12' : 'px-6'} py-4 outline-none focus:border-indigo-600 transition-all text-white placeholder:text-slate-500`}
      />
    </div>
  );
};

export default Input;
