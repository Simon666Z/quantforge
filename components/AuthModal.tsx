import React, { useState } from 'react';
import { X, AlertCircle, User, LogOut } from 'lucide-react';

const API_BASE = 'http://127.0.0.1:8000/api';

interface AuthModalProps {
    isOpen: boolean;
    onClose: () => void;
    onLoginSuccess: (username: string) => void;
    currentUser?: string | null;
    onLogout?: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose, onLoginSuccess, currentUser, onLogout }) => {
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

    if (currentUser) {
        return (
            <div className="fixed inset-0 z-[10001] flex items-center justify-center p-4 animate-ios-overlay">
                <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={onClose}></div>
                <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-2xl animate-ios-enter relative z-10 text-center">
                    <button onClick={onClose} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 transition-colors"><X size={18}/></button>
                    <div className="w-20 h-20 bg-indigo-50 rounded-full flex items-center justify-center mx-auto mb-4 text-indigo-500">
                        <User size={40} />
                    </div>
                    <h3 className="font-bold text-xl text-slate-800 mb-1">{currentUser}</h3>
                    <p className="text-slate-400 text-sm mb-8">Logged in</p>
                    
                    <button onClick={() => { onLogout?.(); onClose(); }} className="w-full py-3 bg-rose-500 text-white font-bold rounded-xl hover:bg-rose-600 transition-transform active:scale-95 shadow-lg shadow-rose-200 flex items-center justify-center gap-2">
                        <LogOut size={18} /> Logout
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="fixed inset-0 z-[10001] flex items-center justify-center p-4 animate-ios-overlay">
            <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={onClose}></div>
            <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-2xl animate-ios-enter relative z-10">
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
