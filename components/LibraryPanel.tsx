import React, { useState, useEffect } from 'react';
import { X, Save, Trash2, Play, Book, Calendar, User, Cloud, HardDrive } from 'lucide-react';
import { SavedStrategy } from '../types';

interface LibraryPanelProps {
  isOpen: boolean;
  onClose: () => void;
  onLoadStrategy: (strategy: any) => void;
  refreshTrigger?: number;
  currentUser: string | null;
}

const API_BASE = 'http://127.0.0.1:8000/api';

export const LibraryPanel: React.FC<LibraryPanelProps> = ({ isOpen, onClose, onLoadStrategy, refreshTrigger, currentUser }) => {
  const [localStrategies, setLocalStrategies] = useState<SavedStrategy[]>([]);
  const [cloudStrategies, setCloudStrategies] = useState<SavedStrategy[]>([]);
  const [loading, setLoading] = useState(false);
  const [isMounting, setIsMounting] = useState(false);

  useEffect(() => {
    if (isOpen) {
        setIsMounting(true);
        refreshLists(currentUser);
    } else {
        const timer = setTimeout(() => setIsMounting(false), 500);
        return () => clearTimeout(timer);
    }
  }, [isOpen, refreshTrigger, currentUser]);

  const refreshLists = (user: string | null) => {
      const locals = JSON.parse(localStorage.getItem('local_strategies') || '[]');
      setLocalStrategies(locals.map((s: any) => ({...s, source: 'local'})));
      if (user) {
          setLoading(true);
          fetch(`${API_BASE}/library/list?username=${user}`)
            .then(res => res.json())
            .then(data => setCloudStrategies(data.map((s: any) => ({...s, source: 'cloud'}))))
            .catch(e => console.error(e))
            .finally(() => setLoading(false));
      } else { setCloudStrategies([]); }
  };

  const handleDelete = async (s: SavedStrategy) => {
      if (!window.confirm("Delete?")) return;
      if (s.source === 'local') {
          const newLocals = localStrategies.filter(item => item.id !== s.id);
          localStorage.setItem('local_strategies', JSON.stringify(newLocals));
          setLocalStrategies(newLocals);
      } else {
          await fetch(`${API_BASE}/library/delete/${s.id}`, { method: 'DELETE' });
          refreshLists(currentUser);
      }
  };

  const handleLoad = (s: any) => {
      const params = typeof s.params === 'string' ? JSON.parse(s.params) : s.params;
      onLoadStrategy({ ...s, params }); onClose();
  };

  if (!isMounting && !isOpen) return null;

  return (
    <>
      <div className={`fixed inset-0 bg-slate-900/20 backdrop-blur-sm z-[9998] transition-opacity duration-300 ${isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`} onClick={onClose} />
      <div className={`fixed top-0 right-0 h-full w-[400px] bg-white shadow-2xl z-[9999] transform transition-transform duration-500 cubic-bezier(0.16, 1, 0.3, 1) flex flex-col ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}>
        <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-gradient-to-l from-indigo-50 to-white shrink-0">
            <h3 className="font-bold text-xl text-slate-800 flex items-center gap-2"><Book className="text-indigo-500"/> Library</h3>
            <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-400"><X size={20}/></button>
        </div>
        <div className="flex-1 overflow-y-auto p-6 bg-slate-50/30 custom-scrollbar">
            {currentUser && <div className="mb-6"><h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-2"><Cloud size={14}/> Cloud Strategies</h4>{loading ? <p className="text-xs text-slate-400">Syncing...</p> : <div className="grid gap-3">{cloudStrategies.map(s => (<StrategyCard key={`c-${s.id}`} strategy={s} onLoad={handleLoad} onDelete={handleDelete} />))}</div>}</div>}
            <div><h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-2"><HardDrive size={14}/> Local Strategies</h4><div className="grid gap-3">{localStrategies.map(s => (<StrategyCard key={`l-${s.id}`} strategy={s} onLoad={handleLoad} onDelete={handleDelete} />))}</div></div>
        </div>
      </div>
    </>

  );
};

const StrategyCard = ({ strategy, onLoad, onDelete }: any) => (
    <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm flex justify-between items-center hover:shadow-md transition-all group animate-slide-up">
        <div><h4 className="font-bold text-slate-700 text-sm">{strategy.name}</h4><div className="flex gap-3 text-[10px] text-slate-400 mt-1"><span className="font-mono bg-slate-100 px-1 rounded text-slate-500">{strategy.ticker}</span><span className="uppercase tracking-wide">{strategy.strategy_type}</span></div></div>
        <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity"><button onClick={() => onLoad(strategy)} className="p-2 rounded-lg bg-indigo-50 text-indigo-600 hover:bg-indigo-100 active:scale-95"><Play size={14}/></button><button onClick={() => onDelete(strategy)} className="p-2 rounded-lg hover:bg-rose-50 text-slate-400 hover:text-rose-500 active:scale-95"><Trash2 size={14}/></button></div>
    </div>
);