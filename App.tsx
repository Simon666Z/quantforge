import React, { useState, useEffect, useRef } from 'react';
import { ConfigPanel } from './components/ConfigPanel';
import { ResultsView } from './components/ResultsView';
import { ChatInterface, ChatInterfaceRef, Message } from './components/ChatInterface';
import { StrategyType, StrategyParams, DEFAULT_PARAMS, BacktestResult, SavedStrategy, DiagnosisContent, AIConfig } from './types';
import { runBacktest, generateStrategyCode, runStressTest, StressTestResult, checkRealtimeSignal } from './services/quantEngine';
import { generateBacktestReport, analyzeTradeContext } from './services/geminiService';
import { AlertCircle, RefreshCcw, X, Users, Code2, Database, Palette, Hammer, Radar, Bell, Book, BellRing, Loader2, User, LogIn, LogOut, GitCompare } from 'lucide-react';
import { MarketBar } from './components/MarketBar';
import { CodeViewer } from './components/CodeViewer';
import { StressTestModal } from './components/StressTestModal';
import { ScreenerModal } from './components/ScreenerModal';
import { ToastContainer, ToastMessage } from './components/Toast';
import { LibraryPanel } from './components/LibraryPanel';
import { AuthModal } from './components/AuthModal';
import { ComparisonModal } from './components/ComparisonModal';

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
    const [isComparisonOpen, setIsComparisonOpen] = useState(false);
    const [saveModalOpen, setSaveModalOpen] = useState(false);
    const [isAuthOpen, setIsAuthOpen] = useState(false);
    const [user, setUser] = useState<string | null>(null);
    
    const [diagnosisResult, setDiagnosisResult] = useState<DiagnosisContent | null>(null);
    const [diagnosisLoading, setDiagnosisLoading] = useState(false);
    const [activeTab, setActiveTab] = useState<'chat' | 'diagnosis'>('chat');
    
    const [isSubscribed, setIsSubscribed] = useState(false);
    const [hasConfigured, setHasConfigured] = useState(false);
    const [toasts, setToasts] = useState<ToastMessage[]>([]);
    const [chatMessages, setChatMessages] = useState<Message[]>([
        { id: 1, sender: 'ai', type: 'text', content: "Let's optimize your trading strategy. What is your goal?" }
    ]);

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
        if (!result) {
            console.log("Analysis: No result available");
            alert("Please run a backtest first before starting the analysis.");
            return;
        }
        setActiveTab('diagnosis');
        const config = chatRef.current?.getConfig();
        console.log("Analysis: Config retrieved", { hasApiKey: !!config?.apiKey, model: config?.modelName });
        if (!config?.apiKey) { 
            alert("Please set your Gemini API Key in the AI settings (gear icon in the chat panel)"); 
            return; 
        }
        setDiagnosisLoading(true);
        setDiagnosisResult(null); // Clear previous result for re-run
        try {
            const report = await generateBacktestReport(result, strategy, config);
            console.log("Analysis: Report received", report);
            if (report) {
                setDiagnosisResult(report);
            } else {
                alert("Analysis failed. Please check your API key and try again.");
            }
        } catch (err: any) {
            console.error("Analysis error:", err);
            alert(`Analysis error: ${err.message || 'Unknown error occurred'}`);
        } finally {
            setDiagnosisLoading(false);
        }
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

    const handleLoadStrategy = (s: any) => { 
        setTicker(s.ticker); 
        setStrategy(s.strategy_type); 
        // Merge with defaults to ensure all required params exist
        setParams({ ...DEFAULT_PARAMS, ...s.params }); 
        setHasConfigured(true); 
    };
    const handleRequestCode = async () => { setIsCodeModalOpen(true); const codes = await generateStrategyCode(ticker, strategy, params, fees/100, slippage/100); setGeneratedCodes(codes); };
    const handleRequestStressTest = async () => { setIsStressModalOpen(true); setStressLoading(true); setStressResults(null); const results = await runStressTest(ticker, strategy, params, fees/100, slippage/100); setStressResults(results); setStressLoading(false); };
    const handleTickerCommit = (t: string) => { if (t !== ticker) setTicker(t); setIsSubscribed(false); };
    const handleResetApp = () => { if(window.confirm("Reset App?")) window.location.reload(); };
    const handleAIStrategyApply = (s: StrategyType, p: StrategyParams, t?: string) => { 
        console.log("handleAIStrategyApply called:", { strategy: s, params: p, ticker: t });
        setResult(null); 
        setStrategy(s); 
        setParams({...p}); 
        if (t) setTicker(t);
        setHasConfigured(true);
        console.log("Strategy applied, hasConfigured set to true");
    };
    
    useEffect(() => { if (showCredits) setIsCreditsMounted(true); else setTimeout(() => setIsCreditsMounted(false), 300); }, [showCredits]);

    return (
        <div className="min-h-screen font-sans text-slate-850 grid grid-rows-[auto_1fr_auto] relative">
            {/* Background */}
            <div className="fixed inset-0 z-[-2] animate-fade-in" style={{ backgroundColor: '#ffdae4', backgroundImage: `linear-gradient(90deg, rgba(255, 165, 189, 0.2) 50%, transparent 50%), linear-gradient(rgba(255, 165, 189, 0.2) 50%, transparent 50%)`, backgroundSize: '80px 80px' }} />
            <div className="fixed inset-0 z-[-1] bg-white/30 pointer-events-none" />

            <div className="relative z-20 bg-white/80 backdrop-blur-sm">
                <div className="max-w-7xl mx-auto px-4 md:px-8 pt-6 pb-6">
                    <header className="flex flex-col md:flex-row items-center justify-between select-none gap-4 md:gap-0">
                        <div className="flex items-center gap-6 animate-fade-in-up">
                            <div onClick={() => setShowCredits(true)} className="btn-bouncy relative group w-16 h-16 md:w-20 md:h-20 bg-gradient-to-br from-sakura-400 to-rose-500 rounded-[1.5rem] border-2 border-white/50 shadow-[0_10px_25px_-5px_rgba(236,72,153,0.3),0_4px_10px_-3px_rgba(0,0,0,0.1)] flex items-center justify-center overflow-hidden transition-all duration-300 hover:-translate-y-1">
                                <Hammer size={30} strokeWidth={2} className="md:w-10 md:h-10 text-white drop-shadow-md transform transition-transform duration-500 cubic-bezier(0.34, 1.56, 0.64, 1) group-hover:scale-110 group-hover:rotate-12" />
                                <div className="absolute inset-0 bg-gradient-to-b from-white/30 to-transparent pointer-events-none rounded-[1.5rem]"></div>
                                <div className="absolute inset-0 rounded-[1.5rem] ring-1 ring-inset ring-white/20 pointer-events-none"></div>
                            </div>
                            <div onClick={handleResetApp} className="cursor-pointer group flex flex-col justify-center">
                                <h1 className="text-4xl md:text-5xl font-extrabold text-avatar tracking-tight leading-tight group-hover:text-sakura-500 transition-colors duration-300 flex items-center gap-3 drop-shadow-sm">QuantForge Pro</h1>
                                <p className="text-base text-avatar/50 font-bold tracking-wide">Interactive Quant Platform</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-3 animate-fade-in-up animation-delay-100">
                            {user ? (
                                <button onClick={() => setIsAuthOpen(true)} className="h-12 px-4 rounded-xl bg-indigo-50 border border-indigo-200 text-indigo-600 font-bold flex items-center gap-2 hover:bg-indigo-100 transition-all shadow-sm" title="Account">
                                    <User size={20} /> <span className="hidden md:inline">{user}</span>
                                </button>
                            ) : (
                                <button onClick={() => setIsAuthOpen(true)} className="h-12 px-4 rounded-xl bg-white border border-slate-200 text-slate-500 font-bold flex items-center gap-2 hover:text-indigo-600 hover:border-indigo-200 hover:bg-indigo-50 transition-all shadow-sm" title="Login">
                                    <LogIn size={20} /> <span className="hidden md:inline">Login</span>
                                </button>
                            )}
                            <button onClick={() => setIsComparisonOpen(true)} className="h-12 px-4 rounded-xl bg-white border border-slate-200 text-slate-500 hover:text-violet-600 hover:border-violet-200 hover:bg-violet-50 flex items-center gap-2 transition-all shadow-sm group" title="Compare Strategies">
                                <GitCompare size={20} />
                                <span className="font-bold hidden md:inline">Compare</span>
                            </button>
                            <button onClick={() => setIsLibraryOpen(true)} className="h-12 px-4 rounded-xl bg-white border border-slate-200 text-slate-500 hover:text-indigo-600 hover:border-indigo-200 hover:bg-indigo-50 flex items-center gap-2 transition-all shadow-sm group" title="Library">
                                <Book size={20} />
                                <span className="font-bold hidden md:inline">Library</span>
                            </button>
                            <button onClick={() => setIsScreenerOpen(true)} className="h-12 px-4 rounded-xl bg-white border border-slate-200 text-slate-500 hover:text-sakura-600 hover:border-sakura-200 hover:bg-sakura-50 flex items-center gap-2 transition-all shadow-sm group" title="Screener">
                                <Radar size={20} className="group-hover:animate-spin-slow" />
                                <span className="font-bold hidden md:inline">Scanner</span>
                            </button>
                            <button onClick={handleToggleSubscribe} className={`h-12 px-4 rounded-xl border flex items-center gap-2 transition-all shadow-sm group ${isSubscribed ? 'bg-amber-400 border-amber-500 text-white' : 'bg-white border-slate-200 text-slate-500 hover:text-amber-600 hover:border-amber-200 hover:bg-amber-50'}`} title="Alerts">
                                {isSubscribed ? <BellRing size={20} className="animate-pulse" fill="currentColor"/> : <Bell size={20} />}
                                <span className="font-bold hidden md:inline">Alerts</span>
                            </button>
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

            <div className="relative z-10 w-full max-w-7xl mx-auto p-4 md:p-8 flex flex-col mt-8 w-screen">
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

                <main className="flex flex-col gap-8 pb-4 flex-grow">
                    {/* Initial View: Only AI Assistant */}
                    {!hasConfigured ? (
                        <div className="flex flex-col items-center justify-center min-h-[60vh] gap-8">
                            <div className="text-center mb-4 animate-fade-in-up px-4">
                                <h2 className="text-4xl md:text-5xl font-extrabold text-white [-webkit-text-stroke:5px_#ff83a3] md:[-webkit-text-stroke:6px_#ff83a3] [paint-order:stroke_fill] mb-3 py-1">Welcome to QuantForge Pro</h2>
                                <p className="text-slate-500 text-lg font-medium">Describe your trading strategy to the AI assistant below</p>
                            </div>
                            <div className="w-full max-w-4xl animate-fade-in-up animation-delay-200">
                                <ChatInterface 
                                    ref={chatRef} 
                                    onApplyStrategy={handleAIStrategyApply} 
                                    onTabChange={setActiveTab} 
                                    diagnosisResult={diagnosisResult}
                                    isDiagnosisLoading={diagnosisLoading}
                                    onRequestDiagnosis={handleRunDiagnosis}
                                    currentStrategy={strategy}
                                    currentParams={params}
                                    onSkipConfig={() => setHasConfigured(true)}
                                    messages={chatMessages}
                                    setMessages={setChatMessages}
                                    hasBacktestResult={!!result}
                                />
                            </div>
                        </div>
                    ) : (
                        <>
                            {/* Row 1: AI Assistant (Full Width) */}
                            <ChatInterface 
                                ref={chatRef} 
                                onApplyStrategy={handleAIStrategyApply} 
                                onTabChange={setActiveTab} 
                                diagnosisResult={diagnosisResult}
                                isDiagnosisLoading={diagnosisLoading}
                                onRequestDiagnosis={handleRunDiagnosis}
                                currentStrategy={strategy}
                                currentParams={params}
                                messages={chatMessages}
                                setMessages={setChatMessages}
                                hasBacktestResult={!!result}
                            />

                            {/* Row 2: Config (Left) + MarketBar & Chart (Right) */}
                            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
                                <div className="lg:col-span-4 flex flex-col">
                                    <ConfigPanel strategy={strategy} setStrategy={setStrategy} params={params} setParams={setParams} onRun={()=>{}} fees={fees} setFees={setFees} slippage={slippage} setSlippage={setSlippage} onSaveStrategy={() => setSaveModalOpen(true)} />
                                </div>
                                <div className="lg:col-span-8 flex flex-col gap-6">
                                    <MarketBar ticker={ticker} onTickerCommit={handleTickerCommit} startDate={startDate} setStartDate={setStartDate} endDate={endDate} setEndDate={setEndDate} onOpenScreener={() => setIsScreenerOpen(true)} onToggleSubscribe={() => {}} isSubscribed={false} />
                                    {error && <div className="p-4 bg-white border border-red-200 rounded-2xl flex items-center gap-3 text-red-600 text-sm"><AlertCircle size={20} /> <span className="font-bold">Error:</span><span>{error}</span></div>}
                                    {loading ? (
                                        <div className="h-[500px] flex items-center justify-center flex-col gap-6 text-sakura-400 animate-pulse bg-white/90 backdrop-blur-sm rounded-[2rem] border border-sakura-100 shadow-xl">
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
                                            chartOnly={true}
                                        />
                                    )}
                                </div>
                            </div>

                            {/* Row 3: Metrics & Analysis (Full Width) */}
                            {!loading && result && (
                                <ResultsView 
                                    result={result} strategyType={strategy} 
                                    onTradeClick={handleTradeClick} 
                                    onRequestCode={handleRequestCode} 
                                    onRequestStressTest={handleRequestStressTest}
                                    onRequestDiagnosis={handleRunDiagnosis} 
                                    onSaveStrategy={() => setSaveModalOpen(true)}
                                    isFocusMode={activeTab === 'diagnosis'}
                                    highlightedDates={diagnosisResult?.key_dates || []}
                                    metricsOnly={true}
                                />
                            )}
                        </>
                    )}
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
            <ComparisonModal 
                isOpen={isComparisonOpen} 
                onClose={() => setIsComparisonOpen(false)} 
                ticker={ticker}
                startDate={startDate}
                endDate={endDate}
                fees={fees}
                slippage={slippage}
                currentStrategy={strategy}
                currentParams={params}
                currentResult={result}
                currentUser={user}
            />
        </div>
    );
};

const CreditItem = ({ name, role, icon: Icon, color }: any) => (<div className="flex items-start gap-4 p-3 hover:bg-slate-50 rounded-xl transition-colors group cursor-default"><div className={`p-2 rounded-lg ${color} group-hover:scale-110 transition-transform duration-300`}><Icon size={18} /></div><div><h3 className="font-bold text-slate-700 text-sm">{name}</h3><p className="text-xs text-slate-500 leading-relaxed">{role}</p></div></div>);

export default App;