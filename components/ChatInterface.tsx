import React, { useState, useEffect, useRef, forwardRef, useImperativeHandle } from 'react';
import { Send, Bot, Sparkles, Settings, Key, Trash2, BookOpen, CheckCircle2, HelpCircle, Stethoscope, Activity, Box, Languages, MessageCircle, AlertTriangle, Lightbulb } from 'lucide-react';
import { StrategyType, StrategyParams, DiagnosisContent, AIConfig } from '../types';
import { parseStrategyFromChat, AIResponse, getFreshSuggestions } from '../services/geminiService';
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
  onApplyStrategy: (strategy: StrategyType, params: StrategyParams) => void;
  onTabChange: (tab: 'chat' | 'diagnosis') => void;
  diagnosisResult: DiagnosisContent | null;
  isDiagnosisLoading: boolean;
  onRequestDiagnosis: () => void;
  currentStrategy: StrategyType;
  currentParams: StrategyParams;
}

export interface ChatInterfaceRef {
  addMessage: (text: string, sender: 'user' | 'ai', meta?: any) => void;
  setLoading: (loading: boolean) => void;
  getApiKey: () => string;
  getConfig: () => AIConfig;
}

interface Message {
  id: number;
  sender: 'user' | 'ai';
  type: 'text' | 'config' | 'explain' | 'error';
  content?: string;
  meta?: any;
}

export const ChatInterface = forwardRef<ChatInterfaceRef, ChatInterfaceProps>(({ 
    onApplyStrategy, onTabChange, diagnosisResult, isDiagnosisLoading, onRequestDiagnosis, currentStrategy, currentParams
}, ref) => {
  
  const [activeTab, setActiveTab] = useState<'chat' | 'diagnosis'>('chat');
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<Message[]>([
    { id: 1, sender: 'ai', type: 'text', content: "Let's optimize your trading strategy. What is your goal?" }
  ]);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [apiKey, setApiKey] = useState('');
  const [modelName, setModelName] = useState('gemini-2.0-flash-lite');
  const [language, setLanguage] = useState('');
  
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    setApiKey(localStorage.getItem('GEMINI_API_KEY') || '');
    const storedModel = localStorage.getItem('GEMINI_MODEL');
    if (storedModel) setModelName(storedModel);
    setLanguage(localStorage.getItem('GEMINI_LANG') || '');
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
    setLoading(false);
    if (response.suggestions?.length) setSuggestions(response.suggestions);
    if (response.intent === 'ERROR') {
      setMessages(prev => [...prev, { id: Date.now()+1, sender: 'ai', type: 'error', content: response.message || "Error" }]);
      if (response.message?.includes("API Key")) setShowSettings(true);
    } 
    else if (response.intent === 'CONFIGURE') {
      setMessages(prev => [...prev, { id: Date.now()+1, sender: 'ai', type: 'config', content: response.explanation, meta: { strategy: response.strategy, params: response.params } }]);
      if (response.strategy && response.params) onApplyStrategy(response.strategy, response.params as StrategyParams);
    }
    else {
      setMessages(prev => [...prev, { id: Date.now()+1, sender: 'ai', type: 'text', content: response.message || (response.content) }]);
    }
  };

  return (
    <div className="bg-white/85 backdrop-blur-md rounded-3xl shadow-xl shadow-sakura-100/50 border border-white/50 overflow-hidden flex flex-col h-[600px] transition-all duration-500 hover:shadow-2xl relative flex-none">
      <style>{`.no-scrollbar::-webkit-scrollbar { display: none; } .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }`}</style>

      {/* Header */}
      <div className="bg-sakura-50/50 border-b border-sakura-100/50 flex flex-col z-20 relative">
        <div className="flex justify-between items-center p-4 pb-2">
            <div className="flex items-center gap-2 text-sakura-800 font-bold">
                <Sparkles size={18} className="text-sakura-400" />
                <span>AI Mentor</span>
            </div>
            <div className="flex gap-2 items-center">
                {/* --- NEW: Persistent Diagnosis Button in Header --- */}
                {activeTab === 'diagnosis' && (
                    <button 
                        onClick={onRequestDiagnosis}
                        disabled={isDiagnosisLoading}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-violet-500 text-white text-[10px] font-bold rounded-lg hover:bg-violet-600 transition-all shadow-sm active:scale-95 disabled:opacity-50 mr-2"
                    >
                        {isDiagnosisLoading ? <div className="animate-spin rounded-full h-3 w-3 border-2 border-white border-t-transparent"/> : <Stethoscope size={12} />}
                        {isDiagnosisLoading ? 'Running...' : 'Run Analysis'}
                    </button>
                )}

                <button onClick={() => setMessages([messages[0]])} className="p-2 rounded-xl bg-white/50 hover:bg-white text-sakura-300 hover:text-rose-500 transition-colors"><Trash2 size={16} /></button>
                <button onClick={() => setShowSettings(!showSettings)} className={`p-2 rounded-xl transition-colors ${showSettings ? 'bg-sakura-400 text-white' : 'bg-white/50 text-sakura-300'}`}><Settings size={16} /></button>
            </div>
        </div>
        <div className="flex px-4 gap-4 pb-0">
            <button onClick={() => handleTabSwitch('chat')} className={`pb-2 text-sm font-bold border-b-2 transition-colors flex items-center gap-2 ${activeTab === 'chat' ? 'border-sakura-400 text-sakura-600' : 'border-transparent text-slate-400 hover:text-slate-600'}`}><MessageCircle size={14}/> Chat</button>
            <button onClick={() => handleTabSwitch('diagnosis')} className={`pb-2 text-sm font-bold border-b-2 transition-colors flex items-center gap-2 ${activeTab === 'diagnosis' ? 'border-violet-400 text-violet-600' : 'border-transparent text-slate-400 hover:text-slate-600'}`}><Stethoscope size={14}/> Diagnosis</button>
        </div>
      </div>

      {/* Settings Drawer */}
      <div className={`transition-all duration-300 bg-slate-50 border-b border-slate-100 overflow-hidden relative z-30 shadow-md ${showSettings ? 'max-h-80 p-4' : 'max-h-0 p-0 border-none'}`}>
         <div className="space-y-3">
            <div className="space-y-1"><label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1"><Key size={10}/> Gemini API Key</label><input type="password" value={apiKey} onChange={(e) => saveSetting('GEMINI_API_KEY', e.target.value, setApiKey)} className="w-full text-xs p-2 rounded-lg border border-slate-200 outline-none focus:border-sakura-300 transition-colors text-slate-600 font-mono" /></div>
            <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1"><label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1"><Box size={10}/> Model</label><input type="text" value={modelName} onChange={(e) => saveSetting('GEMINI_MODEL', e.target.value, setModelName)} className="w-full text-xs p-2 rounded-lg border border-slate-200 outline-none focus:border-sakura-300 transition-colors text-slate-600 font-mono" /></div>
                <div className="space-y-1"><label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1"><Languages size={10}/> Lang</label><input type="text" value={language} onChange={(e) => saveSetting('GEMINI_LANG', e.target.value, setLanguage)} className="w-full text-xs p-2 rounded-lg border border-slate-200 outline-none focus:border-sakura-300 transition-colors text-slate-600" /></div>
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
                            <div className={`max-w-[85%] p-3.5 rounded-2xl text-sm leading-relaxed shadow-sm overflow-hidden ${msg.sender === 'user' ? 'bg-sakura-100 text-sakura-900 border border-sakura-200' : 'bg-white text-slate-600 border border-slate-100'}`}>
                                <ReactMarkdown remarkPlugins={[remarkGfm]} components={BaseMarkdownComponents}>{msg.content || ''}</ReactMarkdown>
                            </div>
                        )}
                        {msg.type === 'config' && (
                            <div className="max-w-[95%] w-full bg-gradient-to-br from-emerald-50 to-white border border-emerald-100 rounded-2xl p-4 shadow-sm relative overflow-hidden group transform-gpu">
                                <div className="absolute top-0 right-0 p-2 opacity-10 group-hover:opacity-20 transition-opacity"><CheckCircle2 size={64} className="text-emerald-500"/></div>
                                <div className="relative z-10">
                                    <div className="flex items-center gap-2 mb-2 text-emerald-700 font-bold text-xs uppercase tracking-wide"><Settings size={14} /> Strategy Applied</div>
                                    <div className="mb-3 text-slate-700 text-sm font-medium"><ReactMarkdown components={BaseMarkdownComponents}>{msg.content || ''}</ReactMarkdown></div>
                                    <div className="flex flex-wrap gap-2"><span className="px-2 py-1 bg-white border border-emerald-200 rounded-md text-[10px] font-mono text-emerald-600 font-bold">{msg.meta?.strategy}</span></div>
                                </div>
                            </div>
                        )}
                        {msg.type === 'error' && <div className="max-w-[90%] bg-rose-50 border border-rose-100 text-rose-600 p-3 rounded-2xl text-sm flex items-start gap-2"><div className="mt-0.5"><HelpCircle size={16}/></div>{msg.content}</div>}
                    </div>
                    ))}
                    {loading && <div className="flex items-center gap-2 text-slate-400 text-xs pl-2 animate-pulse"><Bot size={16} /> Thinking...</div>}
                </div>
                
                {/* Input Area */}
                <div className="p-3 bg-white/60 backdrop-blur-md border-t border-slate-100">
                    <div className="flex gap-2 overflow-x-auto pb-3 pt-1 no-scrollbar mask-fade-right">
                        {suggestions.map((s, i) => (
                            <button key={i} onClick={() => handleSend(s)} className="whitespace-nowrap px-3 py-1.5 rounded-full bg-white border border-slate-200 text-[11px] text-slate-500 font-medium hover:border-sakura-300 hover:text-sakura-500 hover:bg-sakura-50 transition-all active:scale-95 shadow-sm">{s}</button>
                        ))}
                    </div>
                    <div className="flex items-end gap-2 bg-white rounded-2xl border border-slate-200 p-2 shadow-sm focus-within:ring-2 focus-within:ring-sakura-100 focus-within:border-sakura-300 transition-all">
                        <textarea ref={textareaRef} rows={1} value={input} onChange={(e) => { setInput(e.target.value); e.target.style.height = 'auto'; e.target.style.height = Math.min(e.target.scrollHeight, 100) + 'px'; }} onKeyDown={(e) => { if(e.key === 'Enter' && (e.metaKey || e.ctrlKey)) { e.preventDefault(); handleSend(); } }} placeholder="Ask me anything..." className="flex-1 bg-transparent border-none outline-none text-sm text-slate-700 placeholder:text-slate-400 resize-none py-2 px-2 custom-scrollbar max-h-[100px] font-mono leading-relaxed" />
                        <button onClick={() => handleSend()} disabled={!input.trim() || loading} className="p-2 rounded-xl bg-sakura-400 text-white shadow-md shadow-sakura-200 hover:bg-sakura-500 hover:scale-105 active:scale-95 disabled:opacity-50 disabled:scale-100 transition-all"><Send size={18} /></button>
                    </div>
                </div>
            </div>
            
            {/* RIGHT: Diagnosis View */}
            <div className="w-1/2 h-full overflow-y-auto p-6 custom-scrollbar">
                 {isDiagnosisLoading ? (
                    <div className="h-full flex flex-col items-center justify-center gap-4 text-slate-400 animate-pulse">
                        <div className="w-12 h-12 rounded-full border-4 border-slate-200 border-t-violet-400 animate-spin"></div>
                        <p className="text-sm font-bold tracking-widest">ANALYZING TRADES...</p>
                    </div>
                ) : diagnosisResult ? (
                    <div className="space-y-6 animate-slide-up">
                        <div className={`p-4 rounded-2xl border flex items-center justify-between ${getScoreColor(diagnosisResult.score)}`}>
                            <div className="flex items-center gap-3">
                                <Activity size={24}/>
                                <div><h4 className="font-black text-2xl">{diagnosisResult.score}/100</h4><p className="text-xs opacity-80 font-bold uppercase tracking-wider">Stability</p></div>
                            </div>
                            <div className="text-right"><h3 className="font-bold text-lg">{diagnosisResult.verdict}</h3></div>
                        </div>
                        <div>
                            <h4 className="flex items-center gap-2 font-bold text-slate-700 mb-2"><AlertTriangle size={16} className="text-amber-500"/> Analysis</h4>
                            <div className="text-sm text-slate-600 leading-relaxed bg-white p-4 rounded-xl border border-slate-100 prose"><ReactMarkdown remarkPlugins={[remarkGfm]} components={BaseMarkdownComponents}>{diagnosisResult.analysis}</ReactMarkdown></div>
                        </div>
                        <div>
                            <h4 className="flex items-center gap-2 font-bold text-slate-700 mb-2"><Lightbulb size={16} className="text-emerald-500"/> Suggestion</h4>
                            <div className="text-sm font-medium text-emerald-800 bg-emerald-50 p-4 rounded-xl border border-emerald-100 flex gap-3 items-start">
                                <CheckCircle2 size={18} className="shrink-0 mt-0.5"/>
                                <div><ReactMarkdown components={BaseMarkdownComponents}>{diagnosisResult.suggestion}</ReactMarkdown></div>
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="h-full flex flex-col items-center justify-center text-slate-400 text-center px-6">
                        <Stethoscope size={48} className="opacity-20 mb-4"/>
                        <p className="font-bold text-slate-500 mb-2">No Diagnosis Yet</p>
                        <p className="text-xs text-slate-400 mb-6">Run backtest, then click "Run Analysis" above.</p>
                        
                        {/* Fallback Button (Center) - Also triggers same action */}
                        <button 
                            onClick={onRequestDiagnosis} 
                            className="px-6 py-2 bg-violet-500 text-white text-sm font-bold rounded-full hover:bg-violet-600 transition-all shadow-lg shadow-violet-200 active:scale-95"
                        >
                            Start Diagnosis
                        </button>
                    </div>
                )}
            </div>
        </div>
      </div>
    </div>
  );
});