import React, { useState, useEffect, useRef } from 'react';
import { ConfigPanel } from './components/ConfigPanel';
import { ResultsView } from './components/ResultsView';
import { ChatInterface, ChatInterfaceRef } from './components/ChatInterface';
import { StrategyType, StrategyParams, DEFAULT_PARAMS, BacktestResult } from './types';
import { runBacktest, generateStrategyCode, runStressTest, StressTestResult } from './services/quantEngine';
import { generateBacktestReport, analyzeTradeContext, AIConfig } from './services/geminiService';
import { AlertCircle, RefreshCcw, X, Users, Code2, Database, Palette, Hammer } from 'lucide-react';
import { MarketBar } from './components/MarketBar';
import { CodeViewer } from './components/CodeViewer';
import { StressTestModal } from './components/StressTestModal';

const App: React.FC = () => {
    // ... (Existing Date & Initial State Logic) ...
    const today = new Date();
    const oneYearAgo = new Date();
    oneYearAgo.setFullYear(today.getFullYear() - 1);
    const formatDate = (d: Date) => d.toISOString().split('T')[0];
    
    const INITIAL_TICKER = 'NVDA';
    const INITIAL_START = formatDate(oneYearAgo);
    const INITIAL_END = formatDate(today);

    // --- State ---
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

    // Modals
    const [isCodeModalOpen, setIsCodeModalOpen] = useState(false);
    const [generatedCodes, setGeneratedCodes] = useState<any>(null);
    
    // Stress Test State
    const [isStressModalOpen, setIsStressModalOpen] = useState(false);
    const [stressResults, setStressResults] = useState<StressTestResult[] | null>(null);
    const [stressLoading, setStressLoading] = useState(false);

    const chatRef = useRef<ChatInterfaceRef>(null);

    // ... (useEffect for Credits & Main Backtest remain SAME) ...
    useEffect(() => {
        if (showCredits) setIsCreditsMounted(true);
        else setTimeout(() => setIsCreditsMounted(false), 300);
    }, [showCredits]);

    useEffect(() => {
        const executeBacktest = async () => {
            if (!ticker) return;
            setLoading(true); setError(null);
            try {
                const backtestResult = await runBacktest([], strategy, params, { start: startDate, end: endDate }, ticker, fees / 100, slippage / 100);
                if (!backtestResult) throw new Error("Backtest returned no result.");
                setResult(backtestResult);
            } catch (err: any) {
                setError(err.message || "Failed to execute backtest."); setResult(null);
            } finally { setLoading(false); }
        };
        const timer = setTimeout(executeBacktest, 600);
        return () => clearTimeout(timer);
    }, [ticker, startDate, endDate, strategy, params, fees, slippage]);

    // ... (Helpers: getAIConfig, handleRunDiagnosis, handleTradeClick, handleRequestCode, TickerCommit, Reset, ApplyStrategy - Keep SAME) ...
    const getAIConfig = (): AIConfig | null => chatRef.current ? chatRef.current.getConfig() : null;

    const handleRunDiagnosis = async () => {
        if (!result || !chatRef.current) return;
        const config = getAIConfig();
        if (!config?.apiKey) { chatRef.current.addMessage("Please enter your Gemini API Key in the settings first.", "ai"); return; }
        chatRef.current.addMessage("Running deep diagnosis on your strategy performance... 🧐", "ai");
        chatRef.current.setLoading(true);
        const report = await generateBacktestReport(result, strategy, config);
        chatRef.current.setLoading(false);
        if (report) chatRef.current.addMessage("", "ai", undefined, report);
        else chatRef.current.addMessage("Failed to generate diagnosis.", "ai");
    };

    const handleTradeClick = async (data: any) => { /* ... existing ... */ };
    
    const handleRequestCode = async () => {
        setIsCodeModalOpen(true);
        const codes = await generateStrategyCode(ticker, strategy, params, fees/100, slippage/100);
        setGeneratedCodes(codes);
    };

    // --- NEW: Stress Test Handler ---
    const handleRequestStressTest = async () => {
        setIsStressModalOpen(true);
        setStressLoading(true);
        // Clean old results
        setStressResults(null);
        
        const results = await runStressTest(ticker, strategy, params, fees/100, slippage/100);
        
        setStressResults(results);
        setStressLoading(false);
    };

    const handleTickerCommit = (newTicker: string) => { if (newTicker !== ticker) setTicker(newTicker); };
    const handleResetApp = () => { /* ... */ };
    const handleAIStrategyApply = (newStrat: StrategyType, newParams: StrategyParams) => {
        setResult(null); setStrategy(newStrat); setParams({ ...newParams });
    };

    return (
        <div className="min-h-screen font-sans text-slate-850 grid grid-rows-[auto_1fr_auto] relative">
            <div className="fixed inset-0 z-[-2]" style={{ backgroundColor: '#ffdae4', backgroundImage: `linear-gradient(90deg, rgba(255, 165, 189, 0.2) 50%, transparent 50%), linear-gradient(rgba(255, 165, 189, 0.2) 50%, transparent 50%)`, backgroundSize: '80px 80px' }} />
            <div className="fixed inset-0 z-[-1] bg-white/30 pointer-events-none" />

            {/* Header & Cloud - SAME */}
            <div className="relative z-20 bg-white/80 backdrop-blur-sm">
                <div className="max-w-7xl mx-auto px-4 md:px-8 pt-6 pb-6">
                    <header className="flex items-center gap-6 select-none">
                        <div onClick={() => setShowCredits(true)} className="btn-bouncy relative group w-20 h-20 bg-gradient-to-br from-sakura-400 to-rose-500 rounded-[1.5rem] border-2 border-white/50 shadow-[0_10px_25px_-5px_rgba(236,72,153,0.3),0_4px_10px_-3px_rgba(0,0,0,0.1)] flex items-center justify-center overflow-hidden transition-all duration-300 hover:-translate-y-1">
                            <Hammer size={40} strokeWidth={2} className="text-white drop-shadow-md transform transition-transform duration-500 cubic-bezier(0.34, 1.56, 0.64, 1) group-hover:scale-110 group-hover:rotate-12" />
                            <div className="absolute inset-0 bg-gradient-to-b from-white/30 to-transparent pointer-events-none rounded-[1.5rem]"></div>
                            <div className="absolute inset-0 rounded-[1.5rem] ring-1 ring-inset ring-white/20 pointer-events-none"></div>
                        </div>
                        <div onClick={handleResetApp} className="cursor-pointer group flex flex-col justify-center">
                            <h1 className="text-5xl font-extrabold text-avatar tracking-tight leading-tight group-hover:text-sakura-500 transition-colors duration-300 flex items-center gap-3 drop-shadow-sm">
                                QuantForge <RefreshCcw size={24} className="text-sakura-400 opacity-0 -translate-x-4 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-500 ease-out" />
                            </h1>
                            <p className="text-base text-avatar/50 font-bold tracking-wide group-hover:text-sakura-400/70 transition-colors drop-shadow-sm">Beginner Friendly Quantitative Backtesting</p>
                        </div>
                    </header>
                </div>
                <div className="w-full absolute bottom-[-30px] left-0 z-20 pointer-events-none" style={{ height: '30px', backgroundImage: 'radial-gradient(ellipse 60px 45px at 50% 0, rgba(255,255,255,0.8) 30px, transparent 31px)', backgroundSize: '60px 60px', backgroundPosition: '0px 0px', backgroundRepeat: 'repeat-x' }} />
            </div>

            {/* Main Content */}
            <div className="relative z-10 w-full max-w-7xl mx-auto p-4 md:p-8 flex flex-col mt-8">
                {isCreditsMounted && (
                    <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4">
                        <div className={`absolute inset-0 bg-slate-900/40 backdrop-blur-sm ${showCredits ? 'animate-backdrop-in' : 'animate-backdrop-out'}`} onClick={() => setShowCredits(false)} />
                        <div className={`bg-white/95 backdrop-blur-xl p-8 rounded-3xl shadow-2xl border border-white ring-1 ring-sakura-100 max-w-md w-full relative ${showCredits ? 'animate-modal-in' : 'animate-modal-out'}`}>
                            {/* Credits Content ... */}
                            <button onClick={() => setShowCredits(false)} className="absolute top-4 right-4 p-2 rounded-full hover:bg-slate-100 text-slate-400 transition-colors btn-bouncy"><X size={20} /></button>
                            <div className="space-y-4 pt-4"><CreditItem name="Sakura Team" role="Developers" icon={Users} color="text-emerald-500 bg-emerald-50" /></div>
                        </div>
                    </div>
                )}

                <main className="grid grid-cols-1 lg:grid-cols-12 gap-8 pb-4 flex-grow">
                    <div className="lg:col-span-4 flex flex-col gap-6">
                        <ChatInterface ref={chatRef} onApplyStrategy={handleAIStrategyApply} />
                        <ConfigPanel strategy={strategy} setStrategy={setStrategy} params={params} setParams={setParams} onRun={() => {}} fees={fees} setFees={setFees} slippage={slippage} setSlippage={setSlippage} />
                    </div>
                    <div className="lg:col-span-8 flex flex-col gap-6">
                        <MarketBar ticker={ticker} onTickerCommit={handleTickerCommit} startDate={startDate} setStartDate={setStartDate} endDate={endDate} setEndDate={setEndDate} />
                        {error && <div className="p-4 bg-white border border-red-200 rounded-2xl flex items-center gap-3 text-red-600 text-sm animate-in fade-in slide-in-from-top-2 shadow-lg"><AlertCircle size={20} /> <span className="font-bold">Error:</span><span>{error}</span></div>}
                        {loading ? <div className="h-[600px] flex items-center justify-center flex-col gap-6 text-sakura-400 animate-pulse bg-white/90 backdrop-blur-sm rounded-[2rem] border border-sakura-100 shadow-xl"><div className="text-6xl animate-bounce">🌸</div><p className="text-slate-400 font-bold font-mono tracking-widest text-lg">ANALYZING MARKET DATA...</p></div> : 
                            <ResultsView 
                                key={`${ticker}-${startDate}-${endDate}-${fees}`} 
                                result={result} strategyType={strategy} 
                                onTradeClick={() => {}} 
                                onRequestDiagnosis={handleRunDiagnosis} 
                                onRequestCode={handleRequestCode}
                                onRequestStressTest={handleRequestStressTest}
                            />
                        }
                    </div>
                </main>
            </div>

            {/* Footer */}
            <div className="relative z-20 mt-8">
                <div className="w-full absolute top-[-30px] pointer-events-none" style={{ height: '30px', backgroundImage: 'radial-gradient(ellipse 60px 45px at 50% 100%, rgba(255,255,255,0.8) 30px, transparent 31px)', backgroundSize: '60px 30px', backgroundPosition: '0px 0px', backgroundRepeat: 'repeat-x' }} />
                <footer className="w-full py-6 text-center text-slate-600 text-sm font-bold backdrop-blur-md bg-white/80"><p>Powered by <span className="text-sakura-600">Yahoo Finance</span> & <span className="text-sky-600">FastAPI</span></p></footer>
            </div>

            {/* Global Modals */}
            <CodeViewer isOpen={isCodeModalOpen} onClose={() => setIsCodeModalOpen(false)} codes={generatedCodes} />
            <StressTestModal isOpen={isStressModalOpen} onClose={() => setIsStressModalOpen(false)} results={stressResults} loading={stressLoading} ticker={ticker} />
        </div>
    );
};

const CreditItem = ({ name, role, icon: Icon, color }: any) => (<div className="flex items-start gap-4 p-3 hover:bg-slate-50 rounded-xl transition-colors group cursor-default"><div className={`p-2 rounded-lg ${color} group-hover:scale-110 transition-transform duration-300`}><Icon size={18} /></div><div><h3 className="font-bold text-slate-700 text-sm">{name}</h3><p className="text-xs text-slate-500 leading-relaxed">{role}</p></div></div>);

export default App;