import React from 'react';

export const Card: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className = '' }) => (
  <div className={`bg-white rounded-2xl shadow-sm border border-sakura-100 p-6 ${className}`}>
    {children}
  </div>
);

export const Button: React.FC<{ onClick?: () => void; children: React.ReactNode; variant?: 'primary' | 'secondary' }> = ({ 
  onClick, children, variant = 'primary' 
}) => {
  const baseClass = "px-4 py-2 rounded-xl font-medium transition-all duration-200 flex items-center justify-center gap-2";
  const variants = {
    primary: "bg-sakura-400 text-white hover:bg-sakura-500 shadow-md hover:shadow-lg",
    secondary: "bg-sky-100 text-sky-600 hover:bg-sky-200",
  };
  return <button onClick={onClick} className={`${baseClass} ${variants[variant]}`}>{children}</button>;
};

export const Input: React.FC<React.InputHTMLAttributes<HTMLInputElement>> = (props) => (
  <input {...props} className="w-full px-4 py-2 rounded-xl border border-sakura-200 focus:border-sakura-400 focus:ring-2 focus:ring-sakura-100 outline-none transition-all text-slate-600 bg-sakura-50/50" />
);

export const Label: React.FC<{ children: React.ReactNode; htmlFor?: string }> = ({ children, htmlFor }) => (
  <label htmlFor={htmlFor} className="block text-sm font-bold text-slate-600 mb-1 ml-1">{children}</label>
);

// --- Restored Badge ---
export const Badge: React.FC<{ children: React.ReactNode; color?: string }> = ({ children, color = 'bg-sky-100 text-sky-700' }) => (
  <span className={`px-2 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider ${color}`}>
    {children}
  </span>
);