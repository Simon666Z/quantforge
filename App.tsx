import React, { useState, useEffect, useRef } from 'react';
import { ConfigPanel } from './components/ConfigPanel';
import { ResultsView } from './components/ResultsView';
import { ChatInterface, ChatInterfaceRef } from './components/ChatInterface';
import { StrategyType, StrategyParams, DEFAULT_PARAMS, BacktestResult, SavedStrategy, DiagnosisContent, AIConfig } from './types';
import { runBacktest, generateStrategyCode, runStressTest, StressTestResult, checkRealtimeSignal } from './services/quantEngine';
import { generateBacktestReport, analyzeTradeContext } from './services/geminiService';
import { AlertCircle, RefreshCcw, X, Users, Code2, Database, Palette, Hammer, Radar, Bell, Book, BellRing, Loader2, User, LogIn, LogOut } from 'lucide-react';
import { MarketBar } from './components/MarketBar';
import { CodeViewer } from './components/CodeViewer';
import { StressTestModal } from './components/StressTestModal';
import { ScreenerModal } from './components/ScreenerModal';
import { ToastContainer, ToastMessage } from './components/Toast';
import { LibraryPanel } from './components/LibraryPanel';
import { AuthModal } from './components/AuthModal';

const InputModal = ({ isOpen, title, onConfirm, onCancel }: any) => {
    const [val, setVal] = useState("");
    if (!isOpen) return null;
    return (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
            <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-2xl animate-in zoom-in-95">
                <h3 className="font-bold text-lg text-slate-800 mb-4">{title}</h3>
                <input autoFocus value={val} onChange={e=>setVal(e.target.value)} className="w-full p-3 border border-slate-200 rounded-xl mb-6 outline-none focus:border-indigo-400 transition-colors" placeholder="Strategy Name..." />
                <div className="flex justify-end gap-3">
                    <button onClick={onCancel} className="px-4 py-2 text-slate-500 font-bold hover:bg-slate-50 rounded-lg transition-colors">Cancel</button>
                    <button onClick={()=>{onConfirm(val); setVal("");}} className="px-4 py-2 bg-indigo-500 text-white font-bold rounded-lg hover:bg-indigo-600 shadow-md transition-transform active:scale-95">Save</button>
                </div>
            </div>
        </div>
    );
};

const App: React.FC = () => {
    const today = new Date(); const oneYearAgo = new Date(); oneYearAgo.setFullYear(today.getFullYear() - 1);
    const formatDate = (d: Date) => d.toISOString().split('T')[0];
    const INITIAL_TICKER = 'NVDA'; const INITIAL_START = formatDate(oneYearAgo); const INITIAL_END = formatDate(today);

    const [ticker, setTicker] = useState<string>(INITIAL_TICKER);
    const [startDate, setStartDate] = useState<string>(INITIAL_START);
    const [endDate, setEndDate] = useState<string>(INITIAL_END);
    const [strategy, setStrategy] = useState<StrategyType>(StrategyType.SMA_CROSSOVER);
    const [params, setParams] = useState<StrategyParams>(DEFAULT_PARAMS);
    const [fees, setFees] = useState(0.1);
    const [slippage, setSlippage] = useState(0.05);
    const [result, setResult] = useState<BacktestResult | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [showCredits, setShowCredits] = useState(false);
    const [isCreditsMounted, setIsCreditsMounted] = useState(false);

    const [isCodeModalOpen, setIsCodeModalOpen] = useState(false);
    const [generatedCodes, setGeneratedCodes] = useState<any>(null);
    const [isStressModalOpen, setIsStressModalOpen] = useState(false);
    const [stressResults, setStressResults] = useState<StressTestResult[] | null>(null);
    const [stressLoading, setStressLoading] = useState(false);
    const [isScreenerOpen, setIsScreenerOpen] = useState(false);
    const [isLibraryOpen, setIsLibraryOpen] = useState(false);
    const [saveModalOpen, setSaveModalOpen] = useState(false);
    const [isAuthOpen, setIsAuthOpen] = useState(false);
    const [user, setUser] = useState<string | null>(null);
    
    const [diagnosisResult, setDiagnosisResult] = useState<DiagnosisContent | null>(null);
    const [diagnosisLoading, setDiagnosisLoading] = useState(false);
    const [activeTab, setActiveTab] = useState<'chat' | 'diagnosis'>('chat');
    
    const [isSubscribed, setIsSubscribed] = useState(false);
    const [toasts, setToasts] = useState<ToastMessage[]>([]);

    const chatRef = useRef<ChatInterfaceRef>(null);

    const addToast = (title: string, message: string, type: 'info' | 'buy' | 'sell') => {
        const id = Date.now().toString(); setToasts(prev => [...prev, { id, title, message, type }]);
    };
    const removeToast = (id: string) => setToasts(prev => prev.filter(t => t.id !== id));

    const handleToggleSubscribe = async () => {
        const newState = !isSubscribed;
        setIsSubscribed(newState);
        if (newState) {
            addToast("Alerts Activated", `Monitoring ${ticker}...`, "info");
            const res = await checkRealtimeSignal(ticker, strategy, params);
            if (res.signal === "BUY") addToast("BUY Signal", `${ticker} triggered BUY today.`, "buy");
            else if (res.signal === "SELL") addToast("SELL Signal", `${ticker} triggered SELL today.`, "sell");
        } else {
            addToast("Alerts Off", `Stopped monitoring.`, "info");
        }
    };

    useEffect(() => {
        const storedUser = localStorage.getItem('quantforge_user');
        if (storedUser) setUser(storedUser);
    }, []);

    useEffect(() => {
        const executeBacktest = async () => {
            if (!ticker) return;
            setLoading(true); setError(null);
            setDiagnosisResult(null); 
            
            try {
                const backtestResult = await runBacktest([], strategy, params, { start: startDate, end: endDate }, ticker, fees / 100, slippage / 100);
                if (!backtestResult) throw new Error("No result.");
                setResult(backtestResult);
            } catch (err: any) { setError(err.message); setResult(null); } finally { setLoading(false); }
        };
        const timer = setTimeout(executeBacktest, 600);
        return () => clearTimeout(timer);
    }, [ticker, startDate, endDate, strategy, params, fees, slippage]);

    const handleRunDiagnosis = async () => {
        if (!result) return;
        setActiveTab('diagnosis');
        if (diagnosisResult) return; 
        const config = chatRef.current?.getConfig();
        if (!config?.apiKey) { alert("Please set API Key"); return; }
        setDiagnosisLoading(true);
        const report = await generateBacktestReport(result, strategy, config);
        setDiagnosisResult(report);
        setDiagnosisLoading(false);
    };

    const handleSaveConfirm = async (name: string) => {
        setSaveModalOpen(false);
        const user = localStorage.getItem('quantforge_user');
        const newStrategy: any = {
            id: Date.now(), name, ticker, strategy_type: strategy, params, chat_history: [],
            created_at: new Date().toLocaleDateString(), source: user ? 'cloud' : 'local'
        };
        if (user) {
             await fetch('http://127.0.0.1:8000/api/library/save', {
                method: 'POST', headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({ ...newStrategy, username: user })
            });
        } else {
            const locals = JSON.parse(localStorage.getItem('local_strategies') || '[]');
            locals.unshift(newStrategy);
            localStorage.setItem('local_strategies', JSON.stringify(locals));
        }
        addToast("Saved", `Strategy "${name}" saved.`, "info");
    };

    const handleTradeClick = async (data: any) => {
        if (chatRef.current) chatRef.current.addMessage(`I'm looking at the trade on ${data.date}. Price: ${data.price}`, 'user');
    };

    const handleLoadStrategy = (s: any) => { setTicker(s.ticker); setStrategy(s.strategy_type); setParams(s.params); };
    const handleRequestCode = async () => { setIsCodeModalOpen(true); const codes = await generateStrategyCode(ticker, strategy, params, fees/100, slippage/100); setGeneratedCodes(codes); };
    const handleRequestStressTest = async () => { setIsStressModalOpen(true); setStressLoading(true); setStressResults(null); const results = await runStressTest(ticker, strategy, params, fees/100, slippage/100); setStressResults(results); setStressLoading(false); };
    const handleTickerCommit = (t: string) => { if (t !== ticker) setTicker(t); setIsSubscribed(false); };
    const handleResetApp = () => { if(window.confirm("Reset App?")) window.location.reload(); };
    const handleAIStrategyApply = (s: StrategyType, p: StrategyParams, t?: string) => { 
        setResult(null); 
        setStrategy(s); 
        setParams({...p}); 
        if (t) setTicker(t);
    };
    
    useEffect(() => { if (showCredits) setIsCreditsMounted(true); else setTimeout(() => setIsCreditsMounted(false), 300); }, [showCredits]);

    return (
        <div className="min-h-screen font-sans text-slate-850 grid grid-rows-[auto_1fr_auto] relative">
            {/* Background */}
            <div className="fixed inset-0 z-[-2]" style={{ backgroundColor: '#ffdae4', backgroundImage: `linear-gradient(90deg, rgba(255, 165, 189, 0.2) 50%, transparent 50%), linear-gradient(rgba(255, 165, 189, 0.2) 50%, transparent 50%)`, backgroundSize: '80px 80px' }} />
            <div className="fixed inset-0 z-[-1] bg-white/30 pointer-events-none" />

            <div className="relative z-20 bg-white/80 backdrop-blur-sm">
                <div className="max-w-7xl mx-auto px-4 md:px-8 pt-6 pb-6">
                    <header className="flex items-center justify-between select-none">
                        <div className="flex items-center gap-6">
                            <div onClick={() => setShowCredits(true)} className="btn-bouncy relative group w-20 h-20 bg-gradient-to-br from-sakura-400 to-rose-500 rounded-[1.5rem] border-2 border-white/50 shadow-[0_10px_25px_-5px_rgba(236,72,153,0.3),0_4px_10px_-3px_rgba(0,0,0,0.1)] flex items-center justify-center overflow-hidden transition-all duration-300 hover:-translate-y-1">
                                <Hammer size={40} strokeWidth={2} className="text-white drop-shadow-md transform transition-transform duration-500 cubic-bezier(0.34, 1.56, 0.64, 1) group-hover:scale-110 group-hover:rotate-12" />
                                <div className="absolute inset-0 bg-gradient-to-b from-white/30 to-transparent pointer-events-none rounded-[1.5rem]"></div>
                                <div className="absolute inset-0 rounded-[1.5rem] ring-1 ring-inset ring-white/20 pointer-events-none"></div>
                            </div>
                            <div onClick={handleResetApp} className="cursor-pointer group flex flex-col justify-center">
                                <h1 className="text-5xl font-extrabold text-avatar tracking-tight leading-tight group-hover:text-sakura-500 transition-colors duration-300 flex items-center gap-3 drop-shadow-sm">QuantForge Pro</h1>
                                <p className="text-base text-avatar/50 font-bold tracking-wide">Interactive Quant Platform</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-3">
                            {user ? (
                                <button onClick={() => setIsAuthOpen(true)} className="h-12 px-4 rounded-xl bg-indigo-50 border border-indigo-200 text-indigo-600 font-bold flex items-center gap-2 hover:bg-indigo-100 transition-all shadow-sm" title="Account">
                                    <User size={20} /> <span className="hidden md:inline">{user}</span>
                                </button>
                            ) : (
                                <button onClick={() => setIsAuthOpen(true)} className="h-12 px-4 rounded-xl bg-white border border-slate-200 text-slate-500 font-bold flex items-center gap-2 hover:text-indigo-600 hover:border-indigo-200 hover:bg-indigo-50 transition-all shadow-sm" title="Login">
                                    <LogIn size={20} /> <span className="hidden md:inline">Login</span>
                                </button>
                            )}
                            <button onClick={() => setIsLibraryOpen(true)} className="w-12 h-12 rounded-xl bg-white border border-slate-200 text-slate-400 hover:text-indigo-500 hover:border-indigo-200 hover:bg-indigo-50 flex items-center justify-center transition-all shadow-sm group relative" title="Library"><Book size={20} /></button>
                            <button onClick={() => setIsScreenerOpen(true)} className="w-12 h-12 rounded-xl bg-white border border-slate-200 text-slate-400 hover:text-sakura-500 hover:border-sakura-200 hover:bg-sakura-50 flex items-center justify-center transition-all shadow-sm group relative" title="Screener"><Radar size={20} className="group-hover:animate-spin-slow" /></button>
                            <button onClick={handleToggleSubscribe} className={`w-12 h-12 rounded-xl border flex items-center justify-center transition-all shadow-sm group relative ${isSubscribed ? 'bg-amber-400 border-amber-500 text-white' : 'bg-white border-slate-200 text-slate-400 hover:text-amber-500 hover:border-amber-200 hover:bg-amber-50'}`} title="Alerts">{isSubscribed ? <BellRing size={20} className="animate-pulse" fill="currentColor"/> : <Bell size={20} />}</button>
                        </div>
                    </header>
                </div>
                
                {/* --- CLOUD RESTORED (Original) --- */}
                <div
                    className="w-full absolute bottom-[-30px] z-20 pointer-events-none"
                    style={{
                        height: '30px',
                        backgroundImage: 'radial-gradient(ellipse 60px 45px at 50% 0, rgba(255,255,255,0.8) 30px, transparent 31px)',
                        backgroundSize: '60px 60px',
                        backgroundPosition: '0px 0px',
                        backgroundRepeat: 'repeat-x'
                    }}
                />
            </div>

            <div className="relative z-10 w-full max-w-7xl mx-auto p-4 md:p-8 flex flex-col mt-8">
                {isCreditsMounted && (
                    <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4">
                        <div className={`absolute inset-0 bg-slate-900/40 backdrop-blur-sm ${showCredits ? 'animate-backdrop-in' : 'animate-backdrop-out'}`} onClick={() => setShowCredits(false)} />
                        <div className={`bg-white/95 backdrop-blur-xl p-8 rounded-3xl shadow-2xl border border-white ring-1 ring-sakura-100 max-w-md w-full relative ${showCredits ? 'animate-modal-in' : 'animate-modal-out'}`}>
                            <button onClick={() => setShowCredits(false)} className="absolute top-4 right-4 p-2 rounded-full hover:bg-slate-100 text-slate-400 transition-colors btn-bouncy"><X size={20} /></button>
                            <div className="flex items-center gap-3 mb-6"><div className="w-12 h-12 bg-sakura-100 text-sakura-500 rounded-2xl flex items-center justify-center"><Users size={24} /></div><div><h2 className="text-xl font-bold text-slate-800">Team Credits</h2><p className="text-sm text-slate-400">The minds behind QuantForge</p></div></div>
                            <div className="space-y-4"><CreditItem name="Sakura Team" role="Developers" icon={Code2} color="text-indigo-500 bg-indigo-50" /></div>
                            <div className="mt-8 text-center text-xs text-slate-300 font-mono">Made with ❤️ in 2025</div>
                        </div>
                    </div>
                )}

                <main className="grid grid-cols-1 lg:grid-cols-12 gap-8 pb-4 flex-grow items-stretch"> 
                    <div className="lg:col-span-4 flex flex-col gap-6 h-full">
                        <ChatInterface 
                            ref={chatRef} 
                            onApplyStrategy={handleAIStrategyApply} 
                            onTabChange={setActiveTab} 
                            diagnosisResult={diagnosisResult}
                            isDiagnosisLoading={diagnosisLoading}
                            onRequestDiagnosis={handleRunDiagnosis}
                            currentStrategy={strategy}
                            currentParams={params}
                        />
                        <ConfigPanel strategy={strategy} setStrategy={setStrategy} params={params} setParams={setParams} onRun={()=>{}} fees={fees} setFees={setFees} slippage={slippage} setSlippage={setSlippage} onSaveStrategy={() => setSaveModalOpen(true)} />
                    </div>
                    <div className="lg:col-span-8 flex flex-col gap-6 h-full">
                        <MarketBar ticker={ticker} onTickerCommit={handleTickerCommit} startDate={startDate} setStartDate={setStartDate} endDate={endDate} setEndDate={setEndDate} onOpenScreener={() => setIsScreenerOpen(true)} onToggleSubscribe={() => {}} isSubscribed={false} />
                        {error && <div className="p-4 bg-white border border-red-200 rounded-2xl flex items-center gap-3 text-red-600 text-sm"><AlertCircle size={20} /> <span className="font-bold">Error:</span><span>{error}</span></div>}
                        
                        {/* Wrapper forces ResultsView to stretch */}
                        <div className="flex-1 min-h-0">
                            {loading ? (
                                <div className="h-full flex items-center justify-center flex-col gap-6 text-sakura-400 animate-pulse bg-white/90 backdrop-blur-sm rounded-[2rem] border border-sakura-100 shadow-xl">
                                    <Loader2 size={80} className="animate-spin text-sakura-400" />
                                    <p className="text-slate-400 font-bold font-mono tracking-widest text-lg">ANALYZING MARKET DATA...</p>
                                </div>
                            ) : (
                                <ResultsView 
                                    result={result} strategyType={strategy} 
                                    onTradeClick={handleTradeClick} 
                                    onRequestCode={handleRequestCode} 
                                    onRequestStressTest={handleRequestStressTest}
                                    onRequestDiagnosis={handleRunDiagnosis} 
                                    onSaveStrategy={() => setSaveModalOpen(true)}
                                    isFocusMode={activeTab === 'diagnosis'}
                                    highlightedDates={diagnosisResult?.key_dates || []}
                                />
                            )}
                        </div>
                    </div>
                </main>
            </div>

            <div className="relative z-20 mt-8">
                <div className="w-full absolute top-[-30px] pointer-events-none" style={{ height: '30px', backgroundImage: 'radial-gradient(ellipse 60px 45px at 50% 100%, rgba(255,255,255,0.8) 30px, transparent 31px)', backgroundSize: '60px 30px', backgroundPosition: '0px 0px', backgroundRepeat: 'repeat-x' }} />
                <footer className="w-full py-6 text-center text-slate-600 text-sm font-bold backdrop-blur-md bg-white/80"><p>Powered by <span className="text-sakura-600">Yahoo Finance</span> & <span className="text-sky-600">FastAPI</span></p></footer>
            </div>

            <InputModal isOpen={saveModalOpen} title="Save Strategy" onConfirm={handleSaveConfirm} onCancel={() => setSaveModalOpen(false)} />
            <ToastContainer toasts={toasts} onRemove={removeToast} />
            <LibraryPanel isOpen={isLibraryOpen} onClose={() => setIsLibraryOpen(false)} onLoadStrategy={handleLoadStrategy} currentUser={user} />
            <AuthModal 
                isOpen={isAuthOpen} 
                onClose={() => setIsAuthOpen(false)} 
                onLoginSuccess={(u: string) => { setUser(u); localStorage.setItem('quantforge_user', u); }} 
                currentUser={user}
                onLogout={() => { setUser(null); localStorage.removeItem('quantforge_user'); }}
            />
            <CodeViewer isOpen={isCodeModalOpen} onClose={() => setIsCodeModalOpen(false)} codes={generatedCodes} />
            <StressTestModal isOpen={isStressModalOpen} onClose={() => setIsStressModalOpen(false)} results={stressResults} loading={stressLoading} ticker={ticker} />
            <ScreenerModal isOpen={isScreenerOpen} onClose={() => setIsScreenerOpen(false)} strategy={strategy} params={params} onSelectTicker={(t) => { setTicker(t); setIsScreenerOpen(false); }} />
        </div>
    );
};

const CreditItem = ({ name, role, icon: Icon, color }: any) => (<div className="flex items-start gap-4 p-3 hover:bg-slate-50 rounded-xl transition-colors group cursor-default"><div className={`p-2 rounded-lg ${color} group-hover:scale-110 transition-transform duration-300`}><Icon size={18} /></div><div><h3 className="font-bold text-slate-700 text-sm">{name}</h3><p className="text-xs text-slate-500 leading-relaxed">{role}</p></div></div>);

export default App;