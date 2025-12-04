import React, { useState, useEffect, useCallback, useRef } from 'react';
import { ConfigPanel } from './components/ConfigPanel';
import { ResultsView } from './components/ResultsView';
import { ChatInterface, ChatInterfaceRef } from './components/ChatInterface';
import { StrategyType, StrategyParams, DEFAULT_PARAMS, StockDataPoint, BacktestResult } from './types';
import { fetchMarketData } from './services/apiService';
import { runBacktest } from './services/quantEngine';
// Logic: Re-added missing AI imports
import { generateBacktestReport, analyzeTradeContext } from './services/geminiService';
import { AlertCircle, RefreshCcw, X, Users, Code2, Database, Palette, Hammer } from 'lucide-react';

const App: React.FC = () => {
    const today = new Date();
    const oneYearAgo = new Date();
    oneYearAgo.setFullYear(today.getFullYear() - 1);
    const formatDate = (d: Date) => d.toISOString().split('T')[0];

    const INITIAL_TICKER = 'NVDA';
    const INITIAL_START = formatDate(oneYearAgo);
    const INITIAL_END = formatDate(today);

    // --- State Management ---
    const [ticker, setTicker] = useState<string>(INITIAL_TICKER);
    const [startDate, setStartDate] = useState<string>(INITIAL_START);
    const [endDate, setEndDate] = useState<string>(INITIAL_END);

    const [strategy, setStrategy] = useState<StrategyType>(StrategyType.SMA_CROSSOVER);
    const [params, setParams] = useState<StrategyParams>(DEFAULT_PARAMS);

    const [rawData, setRawData] = useState<StockDataPoint[] | null>(null);
    const [result, setResult] = useState<BacktestResult | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const [showCredits, setShowCredits] = useState(false);
    const [isCreditsMounted, setIsCreditsMounted] = useState(false);

    // Logic: Re-added chatRef
    const chatRef = useRef<ChatInterfaceRef>(null);

    // --- Effects ---

    // Handle Credits Modal Animation
    useEffect(() => {
        if (showCredits) {
            setIsCreditsMounted(true);
        } else {
            const timer = setTimeout(() => setIsCreditsMounted(false), 300);
            return () => clearTimeout(timer);
        }
    }, [showCredits]);

    // Main Data Fetching Function
    const handleFetchData = useCallback(async (symbolOverride?: string) => {
        const activeTicker = symbolOverride || ticker;
        if (!activeTicker) return;

        setLoading(true);
        setError(null);

        try {
            console.log(`[App] Fetching data for: ${activeTicker} (${startDate} to ${endDate})`);

            const startObj = new Date(startDate);
            startObj.setDate(startObj.getDate() - 250); 
            const bufferStartDate = formatDate(startObj);

            const data = await fetchMarketData(activeTicker, bufferStartDate, endDate);

            if (!data || data.length === 0) {
                throw new Error("Received empty data from API.");
            }

            setRawData(data);
        } catch (err: any) {
            console.error("App Fetch Error:", err);
            setError(err.message || "Failed to load market data.");
            setRawData(null);
        } finally {
            setLoading(false);
        }
    }, [ticker, startDate, endDate]);

    // Auto Refresh
    useEffect(() => {
        const timer = setTimeout(() => {
            handleFetchData();
        }, 500);

        return () => clearTimeout(timer);
    }, [startDate, endDate, handleFetchData]);

    // Initial Load
    useEffect(() => {
        handleFetchData();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Run Backtest
    useEffect(() => {
        if (rawData && rawData.length > 0) {
            const backtestResult = runBacktest(
                [...rawData], // Clone to avoid mutation
                strategy,
                params,
                { start: startDate, end: endDate }
            );
            setResult(backtestResult);
        } else {
            setResult(null);
        }
    }, [rawData, strategy, params, startDate, endDate]);

    // --- Logic: AI Handlers ---

    const handleRunDiagnosis = async () => {
        if (!result || !chatRef.current) return;
        
        const apiKey = chatRef.current.getApiKey();
        if (!apiKey) {
          chatRef.current.addMessage("Please enter your Gemini API Key in the settings first.", "ai");
          return;
        }
    
        chatRef.current.addMessage("Running deep diagnosis on your strategy performance... 🧐", "ai");
        chatRef.current.setLoading(true);
    
        const report = await generateBacktestReport(result, strategy, apiKey);
        
        chatRef.current.setLoading(false);
        
        if (report) {
          chatRef.current.addMessage("", "ai", undefined, report);
        } else {
          chatRef.current.addMessage("Failed to generate diagnosis.", "ai");
        }
    };
    
    const handleTradeClick = async (data: any) => {
        if (!chatRef.current || !rawData) return;
        
        const apiKey = chatRef.current.getApiKey();
        if (!apiKey) {
          chatRef.current.addMessage("I need your API Key to analyze this trade.", "ai");
          return;
        }
    
        const tradeType = data.type === 'BUY' ? "Buy" : "Sell";
        chatRef.current.addMessage(`Analyzing that ${tradeType} signal at $${data.close.toFixed(2)}... 🔍`, "user");
        chatRef.current.setLoading(true);
    
        const tradeInfo = {
          date: data.date,
          type: data.type,
          price: data.close,
          reason: "Manual click analysis"
        };
    
        const analysis = await analyzeTradeContext(tradeInfo as any, rawData, strategy, apiKey);
        
        chatRef.current.setLoading(false);
        chatRef.current.addMessage(analysis, "ai");
    };

    const handleTickerCommit = (newTicker: string) => {
        if (newTicker !== ticker) {
            setTicker(newTicker);
            setTimeout(() => handleFetchData(newTicker), 0);
        }
    };

    const handleResetApp = () => {
        if (window.confirm("Reset QuantForge to default state?")) {
            setTicker(INITIAL_TICKER);
            setStartDate(INITIAL_START);
            setEndDate(INITIAL_END);
            setStrategy(StrategyType.SMA_CROSSOVER);
            setParams(DEFAULT_PARAMS);
            setTimeout(() => window.location.reload(), 100);
        }
    };

    const handleAIStrategyApply = (newStrat: StrategyType, newParams: StrategyParams) => {
        console.log("App: Applying AI Strategy:", newStrat, newParams);
        // Force refresh
        setResult(null);
        setStrategy(newStrat);
        setParams({ ...newParams });
    };

    return (
        <div className="min-h-screen font-sans text-slate-850 grid grid-rows-[auto_1fr_auto] relative">
            <div
                className="fixed inset-0 z-[-2]"
                style={{
                    backgroundColor: '#ffdae4',
                    backgroundImage: `
            linear-gradient(90deg, rgba(255, 165, 189, 0.2) 50%, transparent 50%),
            linear-gradient(rgba(255, 165, 189, 0.2) 50%, transparent 50%)
          `,
                    backgroundSize: '80px 80px',
                }}
            />
            <div className="fixed inset-0 z-[-1] bg-white/30 pointer-events-none" />

            <div className="relative z-20 bg-white/80 backdrop-blur-sm">
                <div className="max-w-7xl mx-auto px-4 md:px-8 pt-6 pb-6">
                    <header className="flex items-center gap-6 select-none">
                        <div
                            onClick={() => setShowCredits(true)}
                            className="
                btn-bouncy relative group
                w-20 h-20
                bg-gradient-to-br from-sakura-400 to-rose-500
                rounded-[1.5rem]
                border-2 border-white/50
                shadow-[0_10px_25px_-5px_rgba(236,72,153,0.3),0_4px_10px_-3px_rgba(0,0,0,0.1)]
                flex items-center justify-center
                overflow-hidden
                transition-all duration-300
                hover:-translate-y-1
              "
                        >
                            <Hammer
                                size={40}
                                strokeWidth={2}
                                className="text-white drop-shadow-md transform transition-transform duration-500 cubic-bezier(0.34, 1.56, 0.64, 1) group-hover:scale-110 group-hover:rotate-12"
                            />
                            <div className="absolute inset-0 bg-gradient-to-b from-white/30 to-transparent pointer-events-none rounded-[1.5rem]"></div>
                            <div className="absolute inset-0 rounded-[1.5rem] ring-1 ring-inset ring-white/20 pointer-events-none"></div>
                        </div>

                        <div
                            onClick={handleResetApp}
                            className="cursor-pointer group flex flex-col justify-center"
                            title="Click to Reset App"
                        >
                            <h1 className="text-5xl font-extrabold text-avatar tracking-tight leading-tight group-hover:text-sakura-500 transition-colors duration-300 flex items-center gap-3 drop-shadow-sm">
                                QuantForge
                                <RefreshCcw size={24} className="text-sakura-400 opacity-0 -translate-x-4 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-500 ease-out" />
                            </h1>
                            <p className="text-base text-avatar/50 font-bold tracking-wide group-hover:text-sakura-400/70 transition-colors drop-shadow-sm">
                                Beginner Friendly Quantitative Backtesting
                            </p>
                        </div>
                    </header>
                </div>

                <div
                    className="w-full h-6 absolute bottom-[-30px] z-20 pointer-events-none"
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
                        <div
                            className={`absolute inset-0 bg-slate-900/40 backdrop-blur-sm ${showCredits ? 'animate-backdrop-in' : 'animate-backdrop-out'}`}
                            onClick={() => setShowCredits(false)}
                        />
                        <div className={`bg-white/95 backdrop-blur-xl p-8 rounded-3xl shadow-2xl border border-white ring-1 ring-sakura-100 max-w-md w-full relative ${showCredits ? 'animate-modal-in' : 'animate-modal-out'}`}>
                            <button
                                onClick={() => setShowCredits(false)}
                                className="absolute top-4 right-4 p-2 rounded-full hover:bg-slate-100 text-slate-400 transition-colors btn-bouncy"
                            >
                                <X size={20} />
                            </button>

                            <div className="flex items-center gap-3 mb-6">
                                <div className="w-12 h-12 bg-sakura-100 text-sakura-500 rounded-2xl flex items-center justify-center">
                                    <Users size={24} />
                                </div>
                                <div>
                                    <h2 className="text-xl font-bold text-slate-800">Team Credits</h2>
                                    <p className="text-sm text-slate-400">The minds behind QuantForge</p>
                                </div>
                            </div>

                            <div className="space-y-4">
                                <CreditItem name="Shuming" role="Strategies research and implementation" icon={Code2} color="text-indigo-500 bg-indigo-50" />
                                <CreditItem name="Shenbao" role="Frontend design and implementation" icon={Palette} color="text-sakura-500 bg-sakura-50" />
                                <CreditItem name="Han" role="Backend design and implementation" icon={Database} color="text-sky-500 bg-sky-50" />
                                <CreditItem name="Zihan" role="Hunt for modules & UI Consultant" icon={Users} color="text-emerald-500 bg-emerald-50" />
                            </div>

                            <div className="mt-8 text-center text-xs text-slate-300 font-mono">
                                Made with ❤️ in 2025
                            </div>
                        </div>
                    </div>
                )}

                <main className="grid grid-cols-1 lg:grid-cols-12 gap-8 pb-4 flex-grow">
                    <div className="lg:col-span-4 flex flex-col gap-6">
                        {/* Logic: Pass Ref to Chat */}
                        <ChatInterface 
                            ref={chatRef}
                            onApplyStrategy={handleAIStrategyApply} 
                        />

                        <ConfigPanel
                            ticker={ticker}
                            onTickerCommit={handleTickerCommit}
                            strategy={strategy}
                            setStrategy={setStrategy}
                            params={params}
                            setParams={setParams}
                            startDate={startDate}
                            setStartDate={setStartDate}
                            endDate={endDate}
                            setEndDate={setEndDate}
                            onRun={() => handleFetchData()}
                        />
                    </div>

                    <div className="lg:col-span-8">
                        {error && (
                            <div className="mb-4 p-4 bg-white border border-red-200 rounded-2xl flex items-center gap-3 text-red-600 text-sm animate-in fade-in slide-in-from-top-2 shadow-lg">
                                <AlertCircle size={20} />
                                <span className="font-bold">Error:</span>
                                <span>{error}</span>
                            </div>
                        )}

                        {loading ? (
                            <div className="h-[600px] flex items-center justify-center flex-col gap-6 text-sakura-400 animate-pulse bg-white/90 backdrop-blur-sm rounded-[2rem] border border-sakura-100 shadow-xl">
                                <div className="text-6xl animate-bounce">🌸</div>
                                <p className="text-slate-400 font-bold font-mono tracking-widest text-lg">
                                    ANALYZING MARKET DATA...
                                </p>
                            </div>
                        ) : (
                            // Logic: Pass interaction handlers
                            <ResultsView
                                key={`${ticker}-${startDate}-${endDate}`} 
                                result={result}
                                strategyType={strategy}
                                onTradeClick={handleTradeClick}
                                onRequestDiagnosis={handleRunDiagnosis}
                            />
                        )}
                    </div>
                </main>
            </div>

            <div className="relative z-20 mt-8">
                <div
                    className="w-full absolute top-[-30px] pointer-events-none"
                    style={{
                        height: '30px',
                        backgroundImage: 'radial-gradient(ellipse 60px 45px at 50% 100%, rgba(255,255,255,0.8) 30px, transparent 31px)',
                        backgroundSize: '60px 30px',
                        backgroundPosition: '0px 0px',
                        backgroundRepeat: 'repeat-x'
                    }}
                />

                <footer className="w-full py-6 text-center text-slate-600 text-s font-bold backdrop-blur-md bg-white/80">
                    <p>
                        Powered by <span className="text-sakura-600 hover:underline cursor-pointer">Yahoo Finance</span> & <span className="text-sky-600 hover:underline cursor-pointer">FastAPI</span>
                    </p>
                </footer>
            </div>
        </div>
    );
};

const CreditItem = ({ name, role, icon: Icon, color }: any) => (
    <div className="flex items-start gap-4 p-3 hover:bg-slate-50 rounded-xl transition-colors group cursor-default">
        <div className={`p-2 rounded-lg ${color} group-hover:scale-110 transition-transform duration-300`}>
            <Icon size={18} />
        </div>
        <div>
            <h3 className="font-bold text-slate-700 text-sm">{name}</h3>
            <p className="text-xs text-slate-500 leading-relaxed">{role}</p>
        </div>
    </div>
);

export default App;