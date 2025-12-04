import React, { useEffect, useRef } from 'react';
import AirDatepicker from 'air-datepicker';
import localeEn from 'air-datepicker/locale/en';
import 'air-datepicker/air-datepicker.css'; 
import '../styles/datepicker.css'; 
import { Calendar as CalendarIcon } from 'lucide-react';

interface DatePickerProps {
  label: string;
  value: string;
  onChange: (date: string) => void;
}

export const DatePicker: React.FC<DatePickerProps> = ({ label, value, onChange }) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const dpRef = useRef<AirDatepicker | null>(null);

  useEffect(() => {
    if (!inputRef.current) return;

    dpRef.current = new AirDatepicker(inputRef.current, {
      locale: localeEn,
      selectedDates: [new Date(value)],
      autoClose: true,
      dateFormat: 'yyyy-MM-dd',
      position: 'bottom',
      isMobile: false, // 强制使用我们的样式，不使用原生
      buttons: ['today', 'clear'],
      onSelect: ({ formattedDate }) => {
        if (formattedDate) {
          onChange(formattedDate as string);
        }
      }
    });

    return () => {
      dpRef.current?.destroy();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (dpRef.current && value) {
      dpRef.current.selectDate(new Date(value), { updateTime: false, silent: true });
    }
  }, [value]);

  return (
    <div>
       <div className="flex justify-between text-xs mb-2 text-sakura-500 font-bold uppercase tracking-wider">
         <span>{label}</span>
       </div>
       <div className="relative group">
         <CalendarIcon 
           size={16} 
           className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-hover:text-sakura-400 transition-colors pointer-events-none z-10" 
         />
         {/* 关键修改：type="text" 和 readOnly */}
         <input 
           ref={inputRef}
           readOnly 
           type="text" 
           className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 bg-white/50 focus:border-sakura-400 focus:ring-4 focus:ring-sakura-50 outline-none text-slate-600 font-mono text-sm transition-all cursor-pointer hover:border-sakura-200 hover:bg-white"
         />
       </div>
    </div>
  );
};