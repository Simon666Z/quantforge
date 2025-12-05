import React, { useState, useEffect } from 'react';
import { X, Bell, TrendingUp, TrendingDown, Info } from 'lucide-react';

export interface ToastMessage {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'buy' | 'sell';
}

interface ToastContainerProps {
  toasts: ToastMessage[];
  onRemove: (id: string) => void;
}

const ToastItem = ({ toast, onRemove }: { toast: ToastMessage, onRemove: (id: string) => void }) => {
  const [isExiting, setIsExiting] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsExiting(true);
      setTimeout(() => onRemove(toast.id), 300); // Wait for exit animation
    }, 5000); // Auto close after 5s
    return () => clearTimeout(timer);
  }, [toast.id, onRemove]);

  const handleClose = () => {
    setIsExiting(true);
    setTimeout(() => onRemove(toast.id), 300);
  };

  const styles = {
    info: { bg: 'bg-white', border: 'border-slate-100', icon: Bell, iconColor: 'text-sakura-400', titleColor: 'text-slate-700' },
    buy:  { bg: 'bg-emerald-50', border: 'border-emerald-100', icon: TrendingUp, iconColor: 'text-emerald-500', titleColor: 'text-emerald-700' },
    sell: { bg: 'bg-rose-50', border: 'border-rose-100', icon: TrendingDown, iconColor: 'text-rose-500', titleColor: 'text-rose-700' },
  };

  const style = styles[toast.type];
  const Icon = style.icon;

  return (
    <div 
      className={`
        w-80 p-4 rounded-2xl shadow-xl border flex gap-3 items-start relative overflow-hidden backdrop-blur-md transition-all duration-300 transform-gpu
        ${style.bg} ${style.border}
        ${isExiting ? 'opacity-0 translate-x-full' : 'opacity-100 translate-x-0 animate-in slide-in-from-right-full'}
      `}
    >
      <div className={`p-2 rounded-full bg-white shadow-sm shrink-0 ${style.iconColor}`}>
        <Icon size={18} />
      </div>
      <div className="flex-1 min-w-0">
        <h4 className={`text-sm font-bold ${style.titleColor}`}>{toast.title}</h4>
        <p className="text-xs text-slate-500 mt-1 leading-relaxed">{toast.message}</p>
      </div>
      <button onClick={handleClose} className="text-slate-400 hover:text-slate-600 transition-colors p-1">
        <X size={14} />
      </button>
    </div>
  );
};

export const ToastContainer: React.FC<ToastContainerProps> = ({ toasts, onRemove }) => {
  return (
    <div className="fixed top-24 right-6 z-[10000] flex flex-col gap-3 pointer-events-none">
      <div className="pointer-events-auto flex flex-col gap-3">
        {toasts.map(toast => (
          <ToastItem key={toast.id} toast={toast} onRemove={onRemove} />
        ))}
      </div>
    </div>
  );
};