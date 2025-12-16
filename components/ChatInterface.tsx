import React, { useState, useEffect, useRef, forwardRef, useImperativeHandle } from 'react';
import { Send, Bot, Sparkles, Settings, Key, Trash2, BookOpen, CheckCircle2, HelpCircle, Stethoscope, Activity, Box, Languages, MessageCircle, AlertTriangle, Lightbulb, Hammer, TrendingUp, Shield, Target, Zap, ThumbsUp, ThumbsDown, CloudSun, Wrench, ChevronDown, ChevronUp, FileText, BarChart3 } from 'lucide-react';
import { StrategyType, StrategyParams, DiagnosisContent, AIConfig } from '../types';
import { parseStrategyFromChat, AIResponse, getFreshSuggestions, chatAboutAnalysis } from '../services/geminiService';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-emerald-600 border-emerald-200 bg-emerald-50';
    if (score >= 60) return 'text-amber-600 border-amber-200 bg-amber-50';
    return 'text-rose-600 border-rose-200 bg-rose-50';
};

const BaseMarkdownComponents = {
    p: ({node, ...props}: any) => <p className="mb-2 last:mb-0 leading-relaxed break-words whitespace-pre-wrap" {...props} />,
    strong: ({node, ...props}: any) => <strong className="font-black text-slate-800" {...props} />,
    ul: ({node, ...props}: any) => <ul className="list-disc pl-4 mb-2 space-y-1" {...props} />,
    li: ({node, ...props}: any) => <li className="pl-1" {...props} />,
};

interface ChatInterfaceProps {
  onApplyStrategy: (strategy: StrategyType, params: StrategyParams, ticker?: string) => void;
  onTabChange: (tab: 'chat' | 'diagnosis') => void;
  diagnosisResult: DiagnosisContent | null;
  isDiagnosisLoading: boolean;
  onRequestDiagnosis: () => void;
  currentStrategy: StrategyType;
  currentParams: StrategyParams;
  onSkipConfig?: () => void;
  messages?: Message[];
  setMessages?: React.Dispatch<React.SetStateAction<Message[]>>;
  hasBacktestResult?: boolean;
}

export interface ChatInterfaceRef {
  addMessage: (text: string, sender: 'user' | 'ai', meta?: any) => void;
  setLoading: (loading: boolean) => void;
  getApiKey: () => string;
  getConfig: () => AIConfig;
}

export interface Message {
  id: number;
  sender: 'user' | 'ai';
  type: 'text' | 'config' | 'explain' | 'error';
  content?: string;
  meta?: any;
}

export const ChatInterface = forwardRef<ChatInterfaceRef, ChatInterfaceProps>(({
    onApplyStrategy, onTabChange, diagnosisResult, isDiagnosisLoading, onRequestDiagnosis, currentStrategy, currentParams, onSkipConfig, messages: externalMessages, setMessages: externalSetMessages, hasBacktestResult = false
}, ref) => {  const [activeTab, setActiveTab] = useState<'chat' | 'diagnosis'>('chat');
  const [input, setInput] = useState('');
  const [analysisInput, setAnalysisInput] = useState('');
  const [internalMessages, setInternalMessages] = useState<Message[]>([
    { id: 1, sender: 'ai', type: 'text', content: "Let's optimize your trading strategy. What is your goal?" }
  ]);
  
  // Use external messages if provided, otherwise use internal state
  const messages = externalMessages || internalMessages;
  const setMessages = externalSetMessages || setInternalMessages;
  
  // Separate chat for analysis discussion
  const [analysisMessages, setAnalysisMessages] = useState<Message[]>([]);
  const [analysisLoading, setAnalysisLoading] = useState(false);
  const [showReportDetail, setShowReportDetail] = useState(true); // Toggle between report and chat
  
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [apiKey, setApiKey] = useState(() => localStorage.getItem('GEMINI_API_KEY') || '');
  const [modelName, setModelName] = useState(() => localStorage.getItem('GEMINI_MODEL') || 'gemini-2.0-flash-lite');
  const [language, setLanguage] = useState(() => localStorage.getItem('GEMINI_LANG') || '');
  
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const analysisScrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const analysisTextareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    setSuggestions(getFreshSuggestions());
  }, []);

  const saveSetting = (key: string, value: string, setter: (v: string) => void) => {
      setter(value); localStorage.setItem(key, value);
  };

  const handleTabSwitch = (tab: 'chat' | 'diagnosis') => {
      setActiveTab(tab); onTabChange(tab);
  };

  useImperativeHandle(ref, () => ({
    addMessage: (text, sender, meta) => { setMessages(prev => [...prev, { id: Date.now(), content: text, sender, type: 'text', meta }]); },
    setLoading: (isLoading) => setLoading(isLoading),
    getApiKey: () => apiKey,
    getConfig: () => ({ apiKey, modelName, language })
  }));

  useEffect(() => {
    if (activeTab === 'chat' && scrollAreaRef.current) {
      setTimeout(() => { scrollAreaRef.current?.scrollTo({ top: scrollAreaRef.current.scrollHeight, behavior: 'smooth' }); }, 100);
    }
  }, [messages, loading, activeTab]);

  useEffect(() => {
    if (activeTab === 'diagnosis' && analysisScrollRef.current) {
      setTimeout(() => { analysisScrollRef.current?.scrollTo({ top: analysisScrollRef.current.scrollHeight, behavior: 'smooth' }); }, 100);
    }
  }, [analysisMessages, analysisLoading, activeTab]);

  // Show report when new analysis is run
  useEffect(() => {
    if (diagnosisResult) {
      setShowReportDetail(true);
      setAnalysisMessages([
        { id: Date.now(), sender: 'ai', type: 'text', content: `I've completed the analysis. Your strategy scored **${diagnosisResult.score}/100** (${diagnosisResult.verdict}). Feel free to ask me any questions about this analysis or how to improve your strategy!` }
      ]);
    }
  }, [diagnosisResult]);

  const handleSend = async (textOverride?: string) => {
    const textToSend = textOverride || input;
    if (!textToSend.trim()) return;
    const userMsg: Message = { id: Date.now(), content: textToSend, sender: 'user', type: 'text' };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    if (textareaRef.current) textareaRef.current.style.height = 'auto';
    setLoading(true);
    const config: AIConfig = { apiKey, modelName, language };
    const response: AIResponse = await parseStrategyFromChat(textToSend, config, { strategy: currentStrategy, params: currentParams });
    console.log("AI Response:", JSON.stringify(response, null, 2));
    setLoading(false);
    if (response.suggestions?.length) setSuggestions(response.suggestions);
    if (response.intent === 'ERROR') {
      setMessages(prev => [...prev, { id: Date.now()+1, sender: 'ai', type: 'error', content: response.message || "Error" }]);
      if (response.message?.includes("API Key")) setShowSettings(true);
    } 
    else if (response.intent === 'CONFIGURE') {
      console.log("Applying strategy:", response.strategy, "with params:", response.params, "ticker:", response.ticker);
      setMessages(prev => [...prev, { id: Date.now()+1, sender: 'ai', type: 'config', content: response.explanation, meta: { strategy: response.strategy, params: response.params, ticker: response.ticker } }]);
      if (response.strategy && response.params) {
        onApplyStrategy(response.strategy, response.params as StrategyParams, response.ticker);
      } else {
        console.warn("Missing strategy or params in CONFIGURE response");
      }
    }
    else {
      setMessages(prev => [...prev, { id: Date.now()+1, sender: 'ai', type: 'text', content: response.message || (response.content) }]);
    }
  };

  const handleAnalysisSend = async () => {
    const textToSend = analysisInput.trim();
    if (!textToSend) return;
    
    const userMsg: Message = { id: Date.now(), content: textToSend, sender: 'user', type: 'text' };
    setAnalysisMessages(prev => [...prev, userMsg]);
    setAnalysisInput('');
    if (analysisTextareaRef.current) analysisTextareaRef.current.style.height = 'auto';
    
    setAnalysisLoading(true);
    const config: AIConfig = { apiKey, modelName, language };
    const chatHistory = analysisMessages.map(m => ({ role: m.sender === 'user' ? 'user' as const : 'ai' as const, content: m.content || '' }));
    const response = await chatAboutAnalysis(textToSend, config, diagnosisResult, chatHistory);
    setAnalysisLoading(false);
    
    setAnalysisMessages(prev => [...prev, { id: Date.now()+1, sender: 'ai', type: 'text', content: response }]);
  };

  return (
    <div className="bg-white/85 backdrop-blur-md rounded-3xl shadow-xl shadow-sakura-100/50 border border-white/50 overflow-hidden flex flex-col flex-1 min-h-[700px] transition-all duration-500 hover:shadow-2xl relative animate-float-in">
      <style>{`.no-scrollbar::-webkit-scrollbar { display: none; } .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }`}</style>

      {/* Header */}
      <div className="bg-sakura-50/50 border-b border-sakura-100/50 flex flex-col z-20 relative">
        <div className="flex justify-between items-center p-4 pb-2">
            <div className="flex items-center gap-2 text-sakura-800 font-bold text-lg">
                <Sparkles size={20} className="text-sakura-400" />
                <span>QuantForge AI</span>
            </div>
            <div className="flex gap-2 items-center">
                {/* Re-run Analysis Button - Only shows when analysis exists */}
                {activeTab === 'diagnosis' && diagnosisResult && (
                    <button 
                        onClick={onRequestDiagnosis}
                        disabled={isDiagnosisLoading}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-violet-500 text-white text-xs font-bold rounded-lg hover:bg-violet-600 transition-all shadow-sm active:scale-95 disabled:opacity-50 mr-2"
                    >
                        {isDiagnosisLoading ? <div className="animate-spin rounded-full h-3 w-3 border-2 border-white border-t-transparent"/> : <Stethoscope size={13} />}
                        {isDiagnosisLoading ? 'Running...' : 'Re-run Analysis'}
                    </button>
                )}

                <button onClick={() => setMessages([messages[0]])} className="p-2 rounded-xl bg-white/50 hover:bg-white text-sakura-300 hover:text-rose-500 transition-colors"><Trash2 size={16} /></button>
                <button onClick={() => setShowSettings(!showSettings)} className={`p-2 rounded-xl transition-colors ${showSettings ? 'bg-sakura-400 text-white' : 'bg-white/50 text-sakura-300'}`}><Settings size={16} /></button>
            </div>
        </div>
        <div className="flex px-4 gap-4 pb-0">
            <button onClick={() => handleTabSwitch('chat')} className={`pb-2 text-base font-bold border-b-2 transition-colors flex items-center gap-2 ${activeTab === 'chat' ? 'border-sakura-400 text-sakura-600' : 'border-transparent text-slate-400 hover:text-slate-600'}`}><Hammer size={15}/> AI Strategy Configuration</button>
            <button onClick={() => handleTabSwitch('diagnosis')} className={`pb-2 text-base font-bold border-b-2 transition-colors flex items-center gap-2 ${activeTab === 'diagnosis' ? 'border-violet-400 text-violet-600' : 'border-transparent text-slate-400 hover:text-slate-600'}`}><TrendingUp size={15}/> Professional Analysis</button>
        </div>
      </div>

      {/* Input Area - Only show for AI Strategy Configuration tab */}
      {activeTab === 'chat' && (
        <div className="p-3 bg-white/90 backdrop-blur-md border-b border-slate-100 shrink-0">
          <div className="flex items-end gap-2 bg-white rounded-2xl border-2 border-slate-200 p-2.5 shadow-sm focus-within:ring-2 focus-within:ring-sakura-200 focus-within:border-sakura-400 transition-all">
              <textarea 
                  ref={textareaRef} 
                  rows={1} 
                  value={input} 
                  onChange={(e) => { setInput(e.target.value); e.target.style.height = 'auto'; e.target.style.height = Math.min(e.target.scrollHeight, 80) + 'px'; }} 
                  onKeyDown={(e) => { if(e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }} 
                  placeholder="Ask me to configure a strategy..." 
                  className="flex-1 bg-transparent border-none outline-none text-base text-slate-700 placeholder:text-slate-400 resize-none py-1.5 px-2 custom-scrollbar max-h-[80px] leading-relaxed" 
              />
              <button 
                  onClick={() => handleSend()} 
                  disabled={!input.trim() || loading} 
                  className="p-2.5 rounded-xl bg-sakura-500 text-white shadow-lg shadow-sakura-200 hover:bg-sakura-600 hover:scale-105 active:scale-95 disabled:opacity-40 disabled:scale-100 disabled:cursor-not-allowed transition-all"
              >
                  <Send size={18} />
              </button>
          </div>
          <div className="flex gap-2 overflow-x-auto pt-2 no-scrollbar mask-fade-right">
              {suggestions.map((s, i) => (
                  <button key={i} onClick={() => handleSend(s)} className="whitespace-nowrap px-3 py-1.5 rounded-full bg-gradient-to-r from-sakura-50 to-sky-50 border border-sakura-200 text-xs text-slate-600 font-medium hover:border-sakura-400 hover:from-sakura-100 hover:to-sky-100 hover:shadow-md transition-all active:scale-95">{s}</button>
              ))}
          </div>
          {onSkipConfig && (
              <div className="flex justify-center pt-4 pb-1">
                  <button 
                      onClick={onSkipConfig}
                      className="text-sm text-slate-400 hover:text-indigo-500 transition-all duration-300 flex items-center gap-2 group"
                  >
                      <span className="border-b border-dashed border-slate-300 group-hover:border-indigo-400 pb-0.5">Skip and configure manually</span>
                      <span className="text-slate-300 group-hover:text-indigo-400 group-hover:translate-x-1 transition-transform duration-300">→</span>
                  </button>
              </div>
          )}
        </div>
      )}

      {/* Settings Drawer */}
      <div className={`transition-all duration-300 bg-slate-50 border-b border-slate-100 overflow-hidden relative z-30 shadow-md ${showSettings ? 'max-h-80 p-4' : 'max-h-0 p-0 border-none'}`}>
         <div className="space-y-3">
            <div className="space-y-1"><label className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1"><Key size={11}/> Gemini API Key</label><input type="password" value={apiKey} onChange={(e) => saveSetting('GEMINI_API_KEY', e.target.value, setApiKey)} className="w-full text-sm p-2 rounded-lg border border-slate-200 outline-none focus:border-sakura-300 transition-colors text-slate-600 font-mono" /></div>
            <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1"><label className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1"><Box size={11}/> Model</label><input type="text" value={modelName} onChange={(e) => saveSetting('GEMINI_MODEL', e.target.value, setModelName)} className="w-full text-sm p-2 rounded-lg border border-slate-200 outline-none focus:border-sakura-300 transition-colors text-slate-600 font-mono" /></div>
                <div className="space-y-1"><label className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1"><Languages size={11}/> Lang</label><input type="text" value={language} onChange={(e) => saveSetting('GEMINI_LANG', e.target.value, setLanguage)} className="w-full text-sm p-2 rounded-lg border border-slate-200 outline-none focus:border-sakura-300 transition-colors text-slate-600" /></div>
            </div>
        </div>
      </div>

      {/* Content Container */}
      <div className="flex-1 relative overflow-hidden bg-slate-50/30">
        <div className={`absolute w-[200%] h-full flex transition-transform duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] ${activeTab === 'chat' ? 'translate-x-0' : '-translate-x-1/2'}`}>
            
            {/* LEFT: Chat View */}
            <div className="w-1/2 h-full flex flex-col">
                <div ref={scrollAreaRef} className="flex-1 overflow-y-auto p-4 space-y-5 custom-scrollbar">
                    {messages.map((msg) => (
                    <div key={msg.id} className={`flex flex-col ${msg.sender === 'user' ? 'items-end' : 'items-start'} animate-slide-up`}>
                        {msg.type === 'text' && (
                            <div className={`max-w-[85%] p-3.5 rounded-2xl text-base leading-relaxed shadow-sm overflow-hidden ${msg.sender === 'user' ? 'bg-sakura-100 text-sakura-900 border border-sakura-200' : 'bg-white text-slate-600 border border-slate-100'}`}>
                                <ReactMarkdown remarkPlugins={[remarkGfm]} components={BaseMarkdownComponents}>{msg.content || ''}</ReactMarkdown>
                            </div>
                        )}
                        {msg.type === 'config' && (
                            <div className="max-w-[95%] w-full bg-gradient-to-br from-emerald-50 to-white border border-emerald-100 rounded-2xl p-4 shadow-sm relative overflow-hidden group transform-gpu">
                                <div className="absolute top-0 right-0 p-2 opacity-10 group-hover:opacity-20 transition-opacity"><CheckCircle2 size={64} className="text-emerald-500"/></div>
                                <div className="relative z-10">
                                    <div className="flex items-center gap-2 mb-2 text-emerald-700 font-bold text-sm uppercase tracking-wide"><Settings size={15} /> Strategy Applied</div>
                                    <div className="mb-3 text-slate-700 text-base font-medium"><ReactMarkdown components={BaseMarkdownComponents}>{msg.content || ''}</ReactMarkdown></div>
                                    <div className="flex flex-wrap gap-2"><span className="px-2 py-1 bg-white border border-emerald-200 rounded-md text-xs font-mono text-emerald-600 font-bold">{msg.meta?.strategy}</span></div>
                                </div>
                            </div>
                        )}
                        {msg.type === 'error' && <div className="max-w-[90%] bg-rose-50 border border-rose-100 text-rose-600 p-3 rounded-2xl text-base flex items-start gap-2"><div className="mt-0.5"><HelpCircle size={16}/></div>{msg.content}</div>}
                    </div>
                    ))}
                    {loading && <div className="flex items-center gap-2 text-slate-400 text-sm pl-2 animate-pulse"><Bot size={16} /> Thinking...</div>}
                </div>
            </div>
            
            {/* RIGHT: Professional Analysis View */}
            <div className="w-1/2 h-full flex flex-col">
                 {isDiagnosisLoading ? (
                    <div className="h-full flex flex-col items-center justify-center gap-4 text-slate-400 animate-pulse">
                        <div className="w-12 h-12 rounded-full border-4 border-slate-200 border-t-violet-400 animate-spin"></div>
                        <p className="text-base font-bold tracking-widest">ANALYZING TRADES...</p>
                    </div>
                ) : diagnosisResult ? (
                    <div className="flex flex-col h-full">
                        {/* Score Header - Always visible */}
                        <div className="p-4 border-b border-slate-100 bg-gradient-to-r from-violet-50 to-white shrink-0">
                            <div className={`p-3 rounded-xl border flex items-center justify-between ${getScoreColor(diagnosisResult.score)}`}>
                                <div className="flex items-center gap-3">
                                    <Activity size={20}/>
                                    <div><h4 className="font-black text-xl">{diagnosisResult.score}/100</h4><p className="text-xs opacity-80 font-bold uppercase tracking-wider">Score</p></div>
                                </div>
                                <div className="text-right"><h3 className="font-bold text-base">{diagnosisResult.verdict}</h3></div>
                            </div>
                            {/* Toggle Button */}
                            <div className="flex justify-center mt-3">
                                <button 
                                    onClick={() => setShowReportDetail(!showReportDetail)}
                                    className="flex items-center gap-2 px-4 py-1.5 text-xs font-bold text-violet-600 hover:bg-violet-50 rounded-full transition-all"
                                >
                                    {showReportDetail ? (
                                        <><MessageCircle size={14}/> Chat with AI</>
                                    ) : (
                                        <><FileText size={14}/> View Report</>
                                    )}
                                </button>
                            </div>
                        </div>
                        
                        {showReportDetail ? (
                            /* Comprehensive Report View */
                            <div ref={analysisScrollRef} className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
                                {/* Summary Section */}
                                {diagnosisResult.summary && (
                                    <div className="bg-gradient-to-br from-violet-50 to-white border border-violet-100 rounded-xl p-4">
                                        <div className="flex items-center gap-2 mb-2 text-violet-700 font-bold text-sm">
                                            <Target size={16}/> Executive Summary
                                        </div>
                                        <p className="text-sm text-slate-600 leading-relaxed">{diagnosisResult.summary}</p>
                                    </div>
                                )}
                                
                                {/* Strategy Explanation */}
                                {diagnosisResult.strategyExplanation && (
                                    <div className="bg-gradient-to-br from-blue-50 to-white border border-blue-100 rounded-xl p-4">
                                        <div className="flex items-center gap-2 mb-2 text-blue-700 font-bold text-sm">
                                            <FileText size={16}/> Strategy Explanation
                                        </div>
                                        <p className="text-sm text-slate-600 leading-relaxed">{diagnosisResult.strategyExplanation}</p>
                                    </div>
                                )}
                                
                                {/* Performance Breakdown */}
                                {diagnosisResult.performanceBreakdown && (
                                    <div className="bg-gradient-to-br from-emerald-50 to-white border border-emerald-100 rounded-xl p-4">
                                        <div className="flex items-center gap-2 mb-2 text-emerald-700 font-bold text-sm">
                                            <BarChart3 size={16}/> Performance Breakdown
                                        </div>
                                        <p className="text-sm text-slate-600 leading-relaxed whitespace-pre-line">{diagnosisResult.performanceBreakdown}</p>
                                    </div>
                                )}
                                
                                {/* Risk Assessment */}
                                {diagnosisResult.riskAssessment && (
                                    <div className="bg-gradient-to-br from-amber-50 to-white border border-amber-100 rounded-xl p-4">
                                        <div className="flex items-center gap-2 mb-2 text-amber-700 font-bold text-sm">
                                            <Shield size={16}/> Risk Assessment
                                        </div>
                                        <p className="text-sm text-slate-600 leading-relaxed">{diagnosisResult.riskAssessment}</p>
                                    </div>
                                )}
                                
                                {/* Market Conditions */}
                                {diagnosisResult.marketConditions && (
                                    <div className="bg-gradient-to-br from-cyan-50 to-white border border-cyan-100 rounded-xl p-4">
                                        <div className="flex items-center gap-2 mb-2 text-cyan-700 font-bold text-sm">
                                            <TrendingUp size={16}/> Market Conditions
                                        </div>
                                        <p className="text-sm text-slate-600 leading-relaxed">{diagnosisResult.marketConditions}</p>
                                    </div>
                                )}
                                
                                {/* Recommendations */}
                                {diagnosisResult.recommendations && diagnosisResult.recommendations.length > 0 && (
                                    <div className="bg-gradient-to-br from-rose-50 to-white border border-rose-100 rounded-xl p-4">
                                        <div className="flex items-center gap-2 mb-3 text-rose-700 font-bold text-sm">
                                            <Zap size={16}/> Recommendations
                                        </div>
                                        <ul className="space-y-2">
                                            {diagnosisResult.recommendations.map((rec, idx) => (
                                                <li key={idx} className="flex items-start gap-2 text-sm text-slate-600">
                                                    <span className="flex-shrink-0 w-5 h-5 bg-rose-100 text-rose-600 rounded-full flex items-center justify-center text-xs font-bold">{idx + 1}</span>
                                                    <span className="leading-relaxed">{rec}</span>
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                )}
                                
                                {/* Fallback to legacy fields if new fields not available */}
                                {!diagnosisResult.summary && (
                                    <>
                                        <div className="bg-white border border-slate-100 rounded-xl p-4">
                                            <div className="flex items-center gap-2 mb-2 text-slate-700 font-bold text-sm">
                                                <FileText size={16}/> Analysis
                                            </div>
                                            <p className="text-sm text-slate-600 leading-relaxed">{diagnosisResult.analysis}</p>
                                        </div>
                                        <div className="bg-white border border-slate-100 rounded-xl p-4">
                                            <div className="flex items-center gap-2 mb-2 text-slate-700 font-bold text-sm">
                                                <Zap size={16}/> Suggestion
                                            </div>
                                            <p className="text-sm text-slate-600 leading-relaxed">{diagnosisResult.suggestion}</p>
                                        </div>
                                    </>
                                )}
                                
                                {/* Chat CTA at bottom of report */}
                                <div className="flex justify-center py-4">
                                    <button 
                                        onClick={() => setShowReportDetail(false)}
                                        className="flex items-center gap-2 px-6 py-2.5 bg-violet-500 text-white text-sm font-bold rounded-full hover:bg-violet-600 transition-all shadow-lg shadow-violet-200 active:scale-95"
                                    >
                                        <MessageCircle size={16}/> Discuss with AI
                                    </button>
                                </div>
                            </div>
                        ) : (
                            /* Chat View */
                            <>
                                <div ref={analysisScrollRef} className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
                                    {analysisMessages.map((msg) => (
                                        <div key={msg.id} className={`flex flex-col ${msg.sender === 'user' ? 'items-end' : 'items-start'} animate-slide-up`}>
                                            <div className={`max-w-[85%] p-3 rounded-2xl text-sm leading-relaxed shadow-sm ${msg.sender === 'user' ? 'bg-violet-100 text-violet-900 border border-violet-200' : 'bg-white text-slate-600 border border-slate-100'}`}>
                                                <ReactMarkdown remarkPlugins={[remarkGfm]} components={BaseMarkdownComponents}>{msg.content || ''}</ReactMarkdown>
                                            </div>
                                        </div>
                                    ))}
                                    {analysisLoading && <div className="flex items-center gap-2 text-slate-400 text-sm pl-2 animate-pulse"><Bot size={16} /> Thinking...</div>}
                                </div>
                                
                                {/* Analysis Chat Input */}
                                <div className="p-3 border-t border-slate-100 bg-white/90 shrink-0">
                                    <div className="flex items-end gap-2 bg-white rounded-xl border-2 border-slate-200 p-2 shadow-sm focus-within:ring-2 focus-within:ring-violet-200 focus-within:border-violet-400 transition-all">
                                        <textarea 
                                            ref={analysisTextareaRef}
                                            rows={1} 
                                            value={analysisInput} 
                                            onChange={(e) => { setAnalysisInput(e.target.value); e.target.style.height = 'auto'; e.target.style.height = Math.min(e.target.scrollHeight, 60) + 'px'; }} 
                                            onKeyDown={(e) => { if(e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleAnalysisSend(); } }} 
                                            placeholder="Ask about the analysis..." 
                                            className="flex-1 bg-transparent border-none outline-none text-sm text-slate-700 placeholder:text-slate-400 resize-none py-1 px-2 max-h-[60px] leading-relaxed" 
                                        />
                                        <button 
                                            onClick={handleAnalysisSend} 
                                            disabled={!analysisInput.trim() || analysisLoading} 
                                            className="p-2 rounded-lg bg-violet-500 text-white shadow-md shadow-violet-200 hover:bg-violet-600 hover:scale-105 active:scale-95 disabled:opacity-40 disabled:scale-100 disabled:cursor-not-allowed transition-all"
                                        >
                                            <Send size={16} />
                                        </button>
                                    </div>
                                </div>
                            </>
                        )}
                    </div>
                ) : (
                    <div className="h-full flex flex-col items-center justify-center text-slate-400 text-center px-6">
                        <TrendingUp size={48} className="opacity-20 mb-4"/>
                        <p className="font-bold text-slate-500 mb-2 text-base">No Analysis Yet</p>
                        <p className="text-sm text-slate-400 mb-6">
                            {hasBacktestResult 
                                ? "Click below to start the professional analysis." 
                                : "Run a backtest first, then start the professional analysis."}
                        </p>
                        
                        {/* Start Analysis Button */}
                        <button 
                            onClick={onRequestDiagnosis} 
                            disabled={isDiagnosisLoading || !hasBacktestResult}
                            className="px-6 py-2 bg-violet-500 text-white text-sm font-bold rounded-full hover:bg-violet-600 transition-all shadow-lg shadow-violet-200 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {isDiagnosisLoading ? 'Analyzing...' : hasBacktestResult ? 'Start Analysis' : 'Run Backtest First'}
                        </button>
                    </div>
                )}
            </div>
        </div>
      </div>
    </div>
  );
});