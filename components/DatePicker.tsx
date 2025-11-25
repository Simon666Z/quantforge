
import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon } from 'lucide-react';

interface DatePickerProps {
  label: string;
  value: string; // YYYY-MM-DD
  onChange: (date: string) => void;
}

export const DatePicker: React.FC<DatePickerProps> = ({ label, value, onChange }) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [dropdownPos, setDropdownPos] = useState({ top: 0, left: 0 });

  // Parse initial date
  const initialDate = value ? new Date(value) : new Date();
  const [viewDate, setViewDate] = useState(initialDate);

  // Sync internal state if prop changes
  useEffect(() => {
    if (value) {
      const date = new Date(value);
      if (!isNaN(date.getTime())) {
        setViewDate(date);
      }
    }
  }, [value]);

  // Calculate position
  const updatePosition = () => {
    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      // Prevent overflow on right side of screen
      let left = rect.left;
      const dropdownWidth = 256; // w-64 is 16rem = 256px
      if (left + dropdownWidth > window.innerWidth) {
        left = window.innerWidth - dropdownWidth - 20;
      }

      setDropdownPos({
        top: rect.bottom + 8,
        left: left
      });
    }
  };

  // Update position when opening
  useEffect(() => {
    if (isOpen) {
      updatePosition();
      // Close on scroll/resize to avoid floating disconnected popup
      const handleScroll = () => setIsOpen(false);
      window.addEventListener('scroll', handleScroll, true);
      window.addEventListener('resize', handleScroll);
      return () => {
        window.removeEventListener('scroll', handleScroll, true);
        window.removeEventListener('resize', handleScroll);
      };
    }
  }, [isOpen]);

  // Close on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      // Check both the trigger container and the portal dropdown
      if (
        containerRef.current && 
        !containerRef.current.contains(event.target as Node) &&
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const year = viewDate.getFullYear();
  const month = viewDate.getMonth(); // 0-11

  const getDaysInMonth = (y: number, m: number) => new Date(y, m + 1, 0).getDate();
  const getFirstDayOfMonth = (y: number, m: number) => new Date(y, m, 1).getDay();

  const daysInCurrentMonth = getDaysInMonth(year, month);
  const startDay = getFirstDayOfMonth(year, month); // 0 = Sun

  const handlePrevMonth = () => setViewDate(new Date(year, month - 1, 1));
  const handleNextMonth = () => setViewDate(new Date(year, month + 1, 1));

  const handleDayClick = (day: number) => {
    const newDate = new Date(year, month, day);
    const y = newDate.getFullYear();
    const m = String(newDate.getMonth() + 1).padStart(2, '0');
    const d = String(newDate.getDate()).padStart(2, '0');
    onChange(`${y}-${m}-${d}`);
    setIsOpen(false);
  };

  const days = [];
  // Empty slots for start of month
  for (let i = 0; i < startDay; i++) {
    days.push(<div key={`empty-${i}`} className="h-8 w-8" />);
  }
  // Days
  for (let i = 1; i <= daysInCurrentMonth; i++) {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
    const isSelected = value === dateStr;
    const isToday = new Date().toISOString().split('T')[0] === dateStr;

    days.push(
      <button
        key={i}
        onClick={() => handleDayClick(i)}
        className={`h-8 w-8 rounded-full flex items-center justify-center text-xs font-medium transition-all duration-200
          ${isSelected 
            ? 'bg-sakura-400 text-white shadow-md shadow-sakura-200 scale-110' 
            : 'text-slate-600 hover:bg-sakura-50 hover:text-sakura-500'}
          ${isToday && !isSelected ? 'border border-sakura-200 text-sakura-500' : ''}
        `}
      >
        {i}
      </button>
    );
  }

  const formatMonth = (d: Date) => d.toLocaleString('default', { month: 'long', year: 'numeric' });

  return (
    <div className="relative" ref={containerRef}>
      <span className="block text-[10px] text-sakura-400 font-bold uppercase tracking-wider mb-1 ml-1">{label}</span>
      <div 
        onClick={() => setIsOpen(!isOpen)}
        className={`
          flex items-center justify-between w-full px-3 py-2 bg-white rounded-xl border cursor-pointer transition-all
          ${isOpen ? 'border-sakura-300 ring-2 ring-sakura-50' : 'border-sakura-100 hover:border-sakura-200'}
        `}
      >
        <span className="text-sm font-mono text-slate-600 tracking-wide">{value}</span>
        <CalendarIcon size={14} className="text-sakura-300" />
      </div>

      {isOpen && createPortal(
        <div 
          ref={dropdownRef}
          style={{ top: dropdownPos.top, left: dropdownPos.left }}
          className="fixed z-[9999] w-64 bg-white rounded-2xl shadow-xl border border-sakura-100 p-4 animate-in fade-in zoom-in-95 duration-200"
        >
          <div className="flex items-center justify-between mb-4">
            <button onClick={handlePrevMonth} className="p-1 hover:bg-slate-50 rounded-full text-slate-400 hover:text-sakura-500 transition-colors">
              <ChevronLeft size={16} />
            </button>
            <span className="text-sm font-bold text-slate-700">{formatMonth(viewDate)}</span>
            <button onClick={handleNextMonth} className="p-1 hover:bg-slate-50 rounded-full text-slate-400 hover:text-sakura-500 transition-colors">
              <ChevronRight size={16} />
            </button>
          </div>
          
          <div className="grid grid-cols-7 mb-2">
            {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => (
              <div key={i} className="h-8 w-8 flex items-center justify-center text-[10px] font-bold text-slate-300">
                {d}
              </div>
            ))}
          </div>
          
          <div className="grid grid-cols-7 gap-y-1">
            {days}
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};
