import React, { useState, useEffect, useRef, forwardRef, useImperativeHandle } from 'react';
import { Send, Bot, Sparkles, Settings, Key, Trash2, BookOpen, CheckCircle2, HelpCircle, Stethoscope, Activity, Box, Languages, Command } from 'lucide-react';
import { StrategyType, StrategyParams } from '../types';
import { parseStrategyFromChat, AIResponse, getFreshSuggestions, DiagnosisContent, AIConfig } from '../services/geminiService';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface ChatInterfaceProps {
  onApplyStrategy: (strategy: StrategyType, params: StrategyParams) => void;
}

export interface ChatInterfaceRef {
  addMessage: (text: string, sender: 'user' | 'ai', meta?: any, diagnosis?: DiagnosisContent) => void;
  setLoading: (loading: boolean) => void;
  getApiKey: () => string;
  getConfig: () => AIConfig;
}

interface Message {
  id: number;
  sender: 'user' | 'ai';
  type: 'text' | 'config' | 'explain' | 'error' | 'diagnosis';
  content?: string;
  meta?: any;
  diagnosis?: DiagnosisContent;
}

const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-emerald-600 border-emerald-200 bg-emerald-50';
    if (score >= 60) return 'text-amber-600 border-amber-200 bg-amber-50';
    return 'text-rose-600 border-rose-200 bg-rose-50';
};

// --- Custom Markdown Styles (Base) ---
const BaseMarkdownComponents = {
    // 强制换行，防止长文本撑爆
    p: ({node, ...props}: any) => <p className="mb-2 last:mb-0 leading-relaxed break-words whitespace-pre-wrap" {...props} />,
    ul: ({node, ...props}: any) => <ul className="list-disc pl-4 mb-2 space-y-1" {...props} />,
    ol: ({node, ...props}: any) => <ol className="list-decimal pl-4 mb-2 space-y-1" {...props} />,
    li: ({node, ...props}: any) => <li className="pl-1 break-words" {...props} />,
    code: ({node, inline, className, children, ...props}: any) => {
        if (inline) {
            return <code className="bg-black/5 px-1.5 py-0.5 rounded-md font-mono text-xs font-bold mx-1" {...props}>{children}</code>;
        }
        return (
            <div className="rounded-lg bg-slate-800 text-slate-100 p-3 my-2 text-xs font-mono overflow-x-auto shadow-inner border border-slate-700">
                <code {...props}>{children}</code>
            </div>
        );
    },
    // 默认加粗样式
    strong: ({node, ...props}: any) => <strong className="font-black text-slate-800" {...props} />,
};

// --- Config Card Markdown Styles (Specific for Green Background) ---
const ConfigMarkdownComponents = {
    ...BaseMarkdownComponents,
    // 在绿色背景卡片中，加粗文字应该是深绿色的，看起来才舒服
    strong: ({node, ...props}: any) => <strong className="font-black text-emerald-800" {...props} />,
    p: ({node, ...props}: any) => <p className="mb-1 last:mb-0 leading-relaxed break-words text-emerald-900/80 text-sm font-medium" {...props} />,
    code: ({node, inline, className, children, ...props}: any) => (
        <code className="bg-emerald-100/50 text-emerald-900 px-1.5 py-0.5 rounded font-mono text-xs font-bold border border-emerald-200/50" {...props}>{children}</code>
    ),
};

export const ChatInterface = forwardRef<ChatInterfaceRef, ChatInterfaceProps>(({ onApplyStrategy }, ref) => {
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<Message[]>([
    { id: 1, sender: 'ai', type: 'text', content: "Let's optimize your trading strategy. What is your goal?" }
  ]);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  
  // Settings State
  const [showSettings, setShowSettings] = useState(false);
  const [apiKey, setApiKey] = useState('');
  const [modelName, setModelName] = useState('gemini-2.0-flash-lite');
  const [language, setLanguage] = useState('');
  
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    setApiKey(localStorage.getItem('GEMINI_API_KEY') || '');
    setModelName(localStorage.getItem('GEMINI_MODEL') || 'gemini-2.0-flash-lite');
    setLanguage(localStorage.getItem('GEMINI_LANG') || '');
    setSuggestions(getFreshSuggestions());
  }, []);

  const saveSetting = (key: string, value: string, setter: (v: string) => void) => {
      setter(value);
      localStorage.setItem(key, value);
  };

  useImperativeHandle(ref, () => ({
    addMessage: (text, sender, meta, diagnosis) => {
      if (diagnosis) {
          setMessages(prev => [...prev, { id: Date.now(), sender, type: 'diagnosis', diagnosis }]);
      } else {
          setMessages(prev => [...prev, { id: Date.now(), content: text, sender, type: 'text', meta }]);
      }
    },
    setLoading: (isLoading) => setLoading(isLoading),
    getApiKey: () => apiKey,
    getConfig: () => ({ apiKey, modelName, language })
  }));

  useEffect(() => {
    if (scrollAreaRef.current) {
      setTimeout(() => {
        scrollAreaRef.current?.scrollTo({ top: scrollAreaRef.current.scrollHeight, behavior: 'smooth' });
      }, 100);
    }
  }, [messages, loading]);

  const handleSend = async (textOverride?: string) => {
    const textToSend = textOverride || input;
    if (!textToSend.trim()) return;

    const userMsg: Message = { id: Date.now(), content: textToSend, sender: 'user', type: 'text' };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    if (textareaRef.current) textareaRef.current.style.height = 'auto';
    
    setLoading(true);

    const config: AIConfig = { apiKey, modelName, language };
    const response: AIResponse = await parseStrategyFromChat(textToSend, config);

    setLoading(false);

    if (response.suggestions && response.suggestions.length > 0) {
        setSuggestions(response.suggestions);
    }

    if (response.intent === 'ERROR') {
      setMessages(prev => [...prev, { id: Date.now()+1, sender: 'ai', type: 'error', content: response.message || "Error" }]);
      if (response.message?.includes("API Key")) setShowSettings(true);
    } 
    else if (response.intent === 'CONFIGURE') {
      setMessages(prev => [...prev, { 
        id: Date.now()+1, 
        sender: 'ai', 
        type: 'config', 
        content: response.explanation || "Strategy configured.",
        meta: { strategy: response.strategy, params: response.params }
      }]);
      if (response.strategy && response.params) {
        onApplyStrategy(response.strategy, response.params as StrategyParams);
      }
    }
    else if (response.intent === 'EXPLAIN') {
      setMessages(prev => [...prev, {
        id: Date.now()+1,
        sender: 'ai',
        type: 'explain',
        content: response.content || "",
        meta: { topic: response.topic }
      }]);
    }
    else {
      setMessages(prev => [...prev, { id: Date.now()+1, sender: 'ai', type: 'text', content: response.message || "I'm listening." }]);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="bg-white/85 backdrop-blur-md rounded-3xl shadow-xl shadow-sakura-100/50 border border-white/50 overflow-hidden flex flex-col h-[600px] transition-all duration-500 hover:shadow-2xl relative">
      <style>{`
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>

      {/* Header */}
      <div className="bg-sakura-50/50 border-b border-sakura-100/50 flex justify-between items-center p-4 z-10 relative">
        <div className="flex items-center gap-2 text-sakura-800 font-bold">
          <Sparkles size={18} className="text-sakura-400" />
          <span>AI Mentor</span>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setMessages([messages[0]])} className="p-2 rounded-xl bg-white/50 hover:bg-white text-sakura-300 hover:text-rose-500 transition-colors">
            <Trash2 size={16} />
          </button>
          <button onClick={() => setShowSettings(!showSettings)} className={`p-2 rounded-xl transition-colors ${showSettings ? 'bg-sakura-400 text-white' : 'bg-white/50 text-sakura-300'}`}>
            <Settings size={16} />
          </button>
        </div>
      </div>

      {/* Settings Drawer */}
      <div className={`transition-all duration-300 bg-slate-50 border-b border-slate-100 overflow-hidden relative z-30 shadow-md ${showSettings ? 'max-h-80 p-4' : 'max-h-0 p-0 border-none'}`}>
        <div className="space-y-3">
            <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1"><Key size={10}/> Gemini API Key</label>
                <input type="password" value={apiKey} onChange={(e) => saveSetting('GEMINI_API_KEY', e.target.value, setApiKey)} placeholder="Paste AIza..." className="w-full text-xs p-2 rounded-lg border border-slate-200 outline-none focus:border-sakura-300 transition-colors text-slate-600 font-mono" />
            </div>
            <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1"><Box size={10}/> Model Name</label>
                    <input type="text" value={modelName} onChange={(e) => saveSetting('GEMINI_MODEL', e.target.value, setModelName)} placeholder="gemini-2.0-flash-lite" className="w-full text-xs p-2 rounded-lg border border-slate-200 outline-none focus:border-sakura-300 transition-colors text-slate-600 font-mono" />
                </div>
                <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1"><Languages size={10}/> Language</label>
                    <input type="text" value={language} onChange={(e) => saveSetting('GEMINI_LANG', e.target.value, setLanguage)} placeholder="e.g. Chinese" className="w-full text-xs p-2 rounded-lg border border-slate-200 outline-none focus:border-sakura-300 transition-colors text-slate-600" />
                </div>
            </div>
        </div>
      </div>

      {/* Chat Area */}
      <div ref={scrollAreaRef} className="flex-1 overflow-y-auto p-4 space-y-5 custom-scrollbar relative z-10">
        {messages.map((msg) => (
          <div key={msg.id} className={`flex flex-col ${msg.sender === 'user' ? 'items-end' : 'items-start'} animate-in slide-in-from-bottom-2 fade-in duration-300`}>
            
            {/* Text Bubble */}
            {msg.type === 'text' && (
               <div className={`max-w-[85%] p-3.5 rounded-2xl text-sm leading-relaxed shadow-sm overflow-hidden ${
                 msg.sender === 'user' 
                   ? 'bg-sakura-100 text-sakura-900 border border-sakura-200'
                   : 'bg-white text-slate-600 border border-slate-100'
               }`}>
                 <ReactMarkdown remarkPlugins={[remarkGfm]} components={BaseMarkdownComponents}>
                    {msg.content || ''}
                 </ReactMarkdown>
               </div>
            )}

            {/* Diagnosis Card */}
            {msg.type === 'diagnosis' && msg.diagnosis && (
                <div className="max-w-[95%] w-full bg-white border border-indigo-100 rounded-2xl overflow-hidden shadow-lg shadow-indigo-100/50 group transform-gpu">
                    <div className="bg-slate-50 p-3 border-b border-slate-100 flex justify-between items-center">
                        <div className="flex items-center gap-2 text-indigo-600"><Stethoscope size={16} /><span className="font-bold text-xs uppercase tracking-wide">Diagnosis</span></div>
                        <div className={`px-2 py-0.5 rounded-md text-[10px] font-black border ${getScoreColor(msg.diagnosis.score)}`}>SCORE: {msg.diagnosis.score}</div>
                    </div>
                    <div className="p-4 space-y-3 bg-white">
                        <div>
                            <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Verdict</h4>
                            <p className="text-sm font-bold text-slate-800">{msg.diagnosis.verdict}</p>
                        </div>
                        <div>
                            <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Analysis</h4>
                            <p className="text-xs text-slate-600 leading-relaxed">{msg.diagnosis.analysis}</p>
                        </div>
                        <div className="bg-indigo-50 p-3 rounded-xl border border-indigo-100 flex gap-2">
                            <Activity size={16} className="text-indigo-500 flex-shrink-0 mt-0.5"/>
                            <p className="text-xs text-indigo-700 font-medium leading-relaxed">{msg.diagnosis.suggestion}</p>
                        </div>
                    </div>
                </div>
            )}

            {/* Error Bubble */}
            {msg.type === 'error' && (
                <div className="max-w-[90%] bg-rose-50 border border-rose-100 text-rose-600 p-3 rounded-2xl text-sm flex items-start gap-2">
                    <div className="mt-0.5"><HelpCircle size={16}/></div>
                    {msg.content}
                </div>
            )}

            {/* Configuration Card (Green) - FIXED Markdown Styles */}
            {msg.type === 'config' && (
                <div className="max-w-[95%] w-full bg-gradient-to-br from-emerald-50 to-white border border-emerald-100 rounded-2xl p-4 shadow-sm relative overflow-hidden group transform-gpu">
                    <div className="absolute top-0 right-0 p-2 opacity-10 group-hover:opacity-20 transition-opacity"><CheckCircle2 size={64} className="text-emerald-500"/></div>
                    <div className="relative z-10">
                        <div className="flex items-center gap-2 mb-2 text-emerald-700 font-bold text-xs uppercase tracking-wide"><Settings size={14} /> Strategy Applied</div>
                        
                        {/* Use ConfigMarkdownComponents to fix colors */}
                        <div className="mb-3">
                            <ReactMarkdown components={ConfigMarkdownComponents}>
                                {msg.content || ''}
                            </ReactMarkdown>
                        </div>

                        <div className="flex flex-wrap gap-2">
                            <span className="px-2 py-1 bg-white border border-emerald-200 rounded-md text-[10px] font-mono text-emerald-600 font-bold">{msg.meta?.strategy}</span>
                            {msg.meta?.params?.stopLoss > 0 && <span className="px-2 py-1 bg-rose-50 border border-rose-200 rounded-md text-[10px] font-mono text-rose-500">SL: {msg.meta.params.stopLoss}%</span>}
                        </div>
                    </div>
                </div>
            )}

            {/* Educational Card */}
            {msg.type === 'explain' && (
                <div className="max-w-[95%] bg-white border border-indigo-100 rounded-2xl p-0 shadow-sm overflow-hidden transform-gpu">
                    <div className="bg-indigo-50/50 p-3 border-b border-indigo-50 flex items-center gap-2"><BookOpen size={16} className="text-indigo-500"/><span className="font-bold text-indigo-700 text-sm">{msg.meta?.topic}</span></div>
                    <div className="p-4 text-sm text-slate-600 leading-relaxed bg-white">
                        <ReactMarkdown components={BaseMarkdownComponents}>
                            {msg.content || ''}
                        </ReactMarkdown>
                    </div>
                </div>
            )}

          </div>
        ))}
        {loading && <div className="flex items-center gap-2 text-slate-400 text-xs pl-2 animate-pulse"><Bot size={16} /> Thinking...</div>}
      </div>

      {/* Input Area */}
      <div className="p-3 bg-white/60 backdrop-blur-md border-t border-slate-100 relative z-10">
        <div className="flex gap-2 overflow-x-auto pb-3 pt-1 no-scrollbar mask-fade-right">
            {suggestions.map((s, i) => (
                <button key={i} onClick={() => handleSend(s)} className="whitespace-nowrap px-3 py-1.5 rounded-full bg-white border border-slate-200 text-[11px] text-slate-500 font-medium hover:border-sakura-300 hover:text-sakura-500 hover:bg-sakura-50 transition-all active:scale-95 shadow-sm">{s}</button>
            ))}
        </div>
        <div className="flex items-end gap-2 bg-white rounded-2xl border border-slate-200 p-2 shadow-sm focus-within:ring-2 focus-within:ring-sakura-100 focus-within:border-sakura-300 transition-all">
          <textarea ref={textareaRef} rows={1} value={input} onChange={(e) => { setInput(e.target.value); e.target.style.height = 'auto'; e.target.style.height = Math.min(e.target.scrollHeight, 100) + 'px'; }} onKeyDown={handleKeyDown} placeholder="Ask me anything..." className="flex-1 bg-transparent border-none outline-none text-sm text-slate-700 placeholder:text-slate-400 resize-none py-2 px-2 custom-scrollbar max-h-[100px] font-mono leading-relaxed" />
          <button onClick={() => handleSend()} disabled={!input.trim() || loading} className="p-2 rounded-xl bg-sakura-400 text-white shadow-md shadow-sakura-200 hover:bg-sakura-500 hover:scale-105 active:scale-95 disabled:opacity-50 disabled:scale-100 transition-all relative group" title="Cmd + Enter to send">
            <Send size={18} />
            <div className="absolute bottom-full right-0 mb-2 hidden group-hover:block px-2 py-1 bg-slate-800 text-white text-[10px] rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"><span className="flex items-center gap-1"><Command size={10}/> + Enter</span></div>
          </button>
        </div>
      </div>
    </div>
  );
});