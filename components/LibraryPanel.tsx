import React, { useState, useEffect } from 'react';
import { X, Save, Trash2, Play, Book, Calendar, User, LogIn, LogOut, Cloud, HardDrive, AlertCircle } from 'lucide-react';
import { SavedStrategy } from '../types';

interface LibraryPanelProps {
  isOpen: boolean;
  onClose: () => void;
  onLoadStrategy: (strategy: any) => void;
  refreshTrigger?: number; 
}

const API_BASE = 'http://127.0.0.1:8000/api';

const AuthModal = ({ isOpen, onClose, onLoginSuccess }: any) => {
    const [isLogin, setIsLogin] = useState(true);
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    
    if (!isOpen) return null;

    const handleSubmit = async () => {
        setError("");
        const endpoint = isLogin ? '/auth/login' : '/auth/register';
        try {
            const res = await fetch(`${API_BASE}${endpoint}`, {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({ username, password })
            });
            if (res.ok) {
                const data = await res.json();
                onLoginSuccess(data.username);
                onClose();
            } else {
                const err = await res.json();
                setError(err.detail || "Authentication failed");
            }
        } catch { setError("Network error"); }
    };

    return (
        <div className="fixed inset-0 z-[10001] flex items-center justify-center p-4 animate-ios-overlay">
            <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-2xl animate-ios-enter relative">
                <button onClick={onClose} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 transition-colors"><X size={18}/></button>
                <h3 className="font-bold text-lg text-slate-800 mb-4 text-center">{isLogin ? 'Welcome Back' : 'Create Account'}</h3>
                {error && <div className="mb-4 p-3 bg-rose-50 text-rose-500 text-xs rounded-xl flex items-center gap-2 animate-shake"><AlertCircle size={14} /> {error}</div>}
                <div className="space-y-3">
                    <input className="w-full p-3 rounded-xl border border-slate-200 outline-none text-sm focus:border-indigo-400 transition-colors" placeholder="Username" value={username} onChange={e=>setUsername(e.target.value)}/>
                    <input className="w-full p-3 rounded-xl border border-slate-200 outline-none text-sm focus:border-indigo-400 transition-colors" type="password" placeholder="Password" value={password} onChange={e=>setPassword(e.target.value)}/>
                </div>
                <button onClick={handleSubmit} className="w-full py-3 bg-indigo-500 text-white font-bold rounded-xl hover:bg-indigo-600 mb-4 mt-6 transition-transform active:scale-95 shadow-lg shadow-indigo-200">{isLogin ? 'Login' : 'Register'}</button>
                <p className="text-xs text-center text-slate-400 cursor-pointer hover:text-indigo-500 transition-colors" onClick={() => { setIsLogin(!isLogin); setError(""); }}>{isLogin ? "New here? Create an account" : "Already have an account? Login"}</p>
            </div>
        </div>
    );
};

export const LibraryPanel: React.FC<LibraryPanelProps> = ({ isOpen, onClose, onLoadStrategy, refreshTrigger }) => {
  const [user, setUser] = useState<string | null>(null);
  const [localStrategies, setLocalStrategies] = useState<SavedStrategy[]>([]);
  const [cloudStrategies, setCloudStrategies] = useState<SavedStrategy[]>([]);
  const [loading, setLoading] = useState(false);
  const [isAuthOpen, setIsAuthOpen] = useState(false);

  useEffect(() => {
      const storedUser = localStorage.getItem('quantforge_user');
      if (storedUser) setUser(storedUser);
      refreshLists(storedUser);
  }, [isOpen, refreshTrigger]);

  const refreshLists = (currentUser: string | null) => {
      const locals = JSON.parse(localStorage.getItem('local_strategies') || '[]');
      setLocalStrategies(locals.map((s: any) => ({...s, source: 'local'})));
      if (currentUser) {
          setLoading(true);
          fetch(`${API_BASE}/library/list?username=${currentUser}`)
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
          refreshLists(user);
      }
  };

  const handleLoad = (s: any) => {
      const params = typeof s.params === 'string' ? JSON.parse(s.params) : s.params;
      onLoadStrategy({ ...s, params }); onClose();
  };

  return (
    <>
      <div className={`fixed inset-0 bg-slate-900/20 backdrop-blur-sm z-[9998] transition-opacity duration-300 ${isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`} onClick={onClose} />
      <div className={`fixed top-0 right-0 h-full w-[400px] bg-white shadow-2xl z-[9999] transform transition-transform duration-500 cubic-bezier(0.16, 1, 0.3, 1) flex flex-col ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}>
        <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-gradient-to-l from-indigo-50 to-white shrink-0">
            <h3 className="font-bold text-xl text-slate-800 flex items-center gap-2"><Book className="text-indigo-500"/> Library</h3>
            <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-400"><X size={20}/></button>
        </div>
        <div className="p-4 bg-slate-50 border-b border-slate-100 flex justify-between items-center shrink-0">
            {user ? <div className="flex items-center gap-2 text-sm font-bold text-indigo-600 bg-indigo-100 px-3 py-1.5 rounded-lg"><User size={16}/> {user}</div> : <span className="text-xs text-slate-400">Local Mode</span>}
            {user ? <button onClick={() => { setUser(null); localStorage.removeItem('quantforge_user'); setCloudStrategies([]); }} className="text-xs font-bold text-slate-400 hover:text-rose-500 flex items-center gap-1"><LogOut size={12}/> Logout</button> : <button onClick={() => setIsAuthOpen(true)} className="text-xs font-bold text-indigo-600 hover:underline flex items-center gap-1"><LogIn size={12}/> Login / Register</button>}
        </div>
        <div className="flex-1 overflow-y-auto p-6 bg-slate-50/30 custom-scrollbar">
            {user && <div className="mb-6"><h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-2"><Cloud size={14}/> Cloud Strategies</h4>{loading ? <p className="text-xs text-slate-400">Syncing...</p> : <div className="grid gap-3">{cloudStrategies.map(s => (<StrategyCard key={`c-${s.id}`} strategy={s} onLoad={handleLoad} onDelete={handleDelete} />))}</div>}</div>}
            <div><h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-2"><HardDrive size={14}/> Local Strategies</h4><div className="grid gap-3">{localStrategies.map(s => (<StrategyCard key={`l-${s.id}`} strategy={s} onLoad={handleLoad} onDelete={handleDelete} />))}</div></div>
        </div>
        <AuthModal isOpen={isAuthOpen} onClose={() => setIsAuthOpen(false)} onLoginSuccess={(u: string) => { setUser(u); localStorage.setItem('quantforge_user', u); refreshLists(u); }} />
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