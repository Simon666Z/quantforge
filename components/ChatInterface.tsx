import React, { useState, useEffect, useRef, forwardRef, useImperativeHandle } from 'react';
import { Send, Bot, Sparkles, Settings, Key, Trash2, BookOpen, AlertTriangle, Lightbulb, Stethoscope, Activity, CheckCircle2 } from 'lucide-react';
import { StrategyType, StrategyParams } from '../types';
import { parseStrategyFromChat, EducationalContent, DiagnosisContent } from '../services/geminiService';

interface ChatInterfaceProps {
  onApplyStrategy: (strategy: StrategyType, params: StrategyParams) => void;
}

export interface ChatInterfaceRef {
  addMessage: (text: string, sender: 'user' | 'ai', educational?: EducationalContent, diagnosis?: DiagnosisContent) => void;
  setLoading: (loading: boolean) => void;
  getApiKey: () => string;
}

interface Message {
  id: number;
  text: string;
  sender: 'user' | 'ai';
  isError?: boolean;
  educational?: EducationalContent;
  diagnosis?: DiagnosisContent;
}

const INITIAL_MSG: Message = { 
  id: 1, 
  text: "Tell me your trading idea (e.g. 'Catch the trend' or 'Buy the dip'), and I'll configure the strategy for you.", 
  sender: 'ai' 
};

const getScoreColor = (score: number) => {
  if (score >= 80) return 'text-emerald-500 border-emerald-500 bg-emerald-50';
  if (score >= 60) return 'text-amber-500 border-amber-500 bg-amber-50';
  return 'text-rose-500 border-rose-500 bg-rose-50';
};

export const ChatInterface = forwardRef<ChatInterfaceRef, ChatInterfaceProps>(({ onApplyStrategy }, ref) => {
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<Message[]>([INITIAL_MSG]);
  const [loading, setLoading] = useState(false);
  const [apiKey, setApiKey] = useState('');
  const [showKeyInput, setShowKeyInput] = useState(false);
  
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  // 使用 Ref 来控制 Textarea 的高度
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const savedKey = localStorage.getItem('GEMINI_API_KEY');
    if (savedKey) setApiKey(savedKey);
  }, []);

  useImperativeHandle(ref, () => ({
    addMessage: (text, sender, educational, diagnosis) => {
      setMessages(prev => [...prev, { id: Date.now(), text, sender, educational, diagnosis }]);
    },
    setLoading: (isLoading) => setLoading(isLoading),
    getApiKey: () => apiKey
  }));

  const handleSaveKey = (key: string) => {
    setApiKey(key);
    localStorage.setItem('GEMINI_API_KEY', key);
  };

  const scrollToBottom = () => {
    if (scrollAreaRef.current) {
      setTimeout(() => {
        scrollAreaRef.current?.scrollTo({
            top: scrollAreaRef.current.scrollHeight,
            behavior: 'smooth' 
        });
      }, 100);
    }
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading]);

  const handleClearChat = () => {
    setMessages([INITIAL_MSG]);
  };

  const handleSend = async () => {
    if (!input.trim()) return;

    const userMsg: Message = { id: Date.now(), text: input, sender: 'user' };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    // 发送后重置输入框高度
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }

    const response = await parseStrategyFromChat(userMsg.text, apiKey);

    setLoading(false);

    if (response.error) {
      setMessages(prev => [...prev, { id: Date.now() + 1, text: `⚠️ ${response.error}`, sender: 'ai', isError: true }]);
      if (response.error.includes("API Key")) setShowKeyInput(true);
    } else {
      setMessages(prev => [...prev, { 
        id: Date.now() + 1, 
        text: `✅ ${response.explanation}`, 
        sender: 'ai',
        educational: response.educational 
      }]);
      
      // --- 关键修复：确保在这里调用父组件的应用逻辑 ---
      console.log("AI applying strategy:", response.strategy, response.params);
      onApplyStrategy(response.strategy, response.params);
    }
  };

  // --- 修复：支持高度自适应的 Textarea ---
  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    // 自动调整高度
    e.target.style.height = 'auto';
    e.target.style.height = `${Math.min(e.target.scrollHeight, 120)}px`; // 最大高度 120px
  };

  // --- 修复：处理 Enter 发送，Shift+Enter 换行 ---
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault(); // 阻止默认的换行
      handleSend();
    }
  };

  return (
    <div className="bg-white/85 backdrop-blur-md rounded-3xl shadow-xl shadow-sakura-100/50 border border-white/50 overflow-hidden flex flex-col h-[500px] transition-all duration-500 hover:shadow-2xl hover:shadow-sakura-200/50">
      
      {/* Header */}
      <div className="bg-sakura-50/50 border-b border-sakura-100/50 flex justify-between items-center flex-shrink-0 z-10 relative p-4">
        <div className="flex items-center gap-2 text-sakura-800 font-bold">
          <Sparkles size={18} className="animate-pulse" />
          <span>AI Mentor</span>
        </div>
        <div className="flex gap-2">
          <button onClick={handleClearChat} className="btn-bouncy p-2 rounded-xl bg-white/80 hover:bg-white text-sakura-400 hover:text-rose-500 shadow-sm border border-sakura-100">
            <Trash2 size={16} />
          </button>
          <button onClick={() => setShowKeyInput(!showKeyInput)} className={`btn-bouncy p-2 rounded-xl shadow-sm border transition-colors duration-300 ${showKeyInput ? 'bg-sakura-400 text-white border-sakura-400' : 'bg-white/80 hover:bg-white text-sakura-400 border-sakura-100'}`}>
            <Settings size={16} className={`transition-transform duration-500 ${showKeyInput ? 'rotate-180' : ''}`} />
          </button>
        </div>
      </div>

      {/* API Key Input */}
      <div className={`grid transition-[grid-template-rows] duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] border-b border-slate-100/50 bg-slate-50/50 ${showKeyInput ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0 border-b-0'}`}>
        <div className="overflow-hidden p-3">
          <label className="text-xs font-bold text-slate-500 mb-1 block flex items-center gap-1"><Key size={12} /> Gemini API Key</label>
          <input type="password" value={apiKey} onChange={(e) => handleSaveKey(e.target.value)} placeholder="Paste key here (starts with AIza...)" className="w-full text-sm p-2 rounded-xl border border-slate-200/80 bg-white/80 focus:border-sakura-400 focus:ring-2 focus:ring-sakura-100 outline-none transition-all" />
        </div>
      </div>

      {/* Chat Area */}
      <div ref={scrollAreaRef} className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar scroll-smooth">
        {messages.map((msg) => (
          <div key={msg.id} className={`flex flex-col ${msg.sender === 'user' ? 'items-end' : 'items-start'} animate-in slide-in-from-bottom-2 duration-300 fade-in`}>
            {/* Bubble */}
            <div className={`max-w-[85%] p-3 rounded-2xl text-sm shadow-sm whitespace-pre-wrap ${msg.sender === 'user' ? 'bg-sakura-400 text-white rounded-tr-none shadow-sakura-200' : msg.isError ? 'bg-red-50/90 text-red-600 border border-red-100 rounded-tl-none' : 'bg-white/80 backdrop-blur-sm text-slate-700 border border-white/50 rounded-tl-none'}`}>
              {msg.text}
            </div>

            {/* Educational Content */}
            {msg.sender === 'ai' && msg.educational && (
              <div className="mt-2 max-w-[95%] bg-white/90 backdrop-blur-md rounded-2xl p-4 border border-sakura-100 shadow-lg shadow-sakura-100/30 animate-in zoom-in-95 duration-500 delay-100">
                <div className="flex items-center gap-2 mb-3 pb-2 border-b border-slate-100">
                  <BookOpen size={16} className="text-sky-500" />
                  <span className="font-bold text-slate-700 text-xs uppercase tracking-wide">{msg.educational.concept}</span>
                </div>
                <div className="space-y-3">
                  <div className="flex gap-3">
                    <Lightbulb size={16} className="text-amber-400 flex-shrink-0 mt-0.5" />
                    <p className="text-xs text-slate-600 leading-relaxed"><span className="font-bold text-slate-700 block mb-0.5">Logic</span>{msg.educational.reason}</p>
                  </div>
                  <div className="flex gap-3 bg-rose-50 p-2 rounded-xl border border-rose-100">
                    <AlertTriangle size={16} className="text-rose-500 flex-shrink-0 mt-0.5" />
                    <p className="text-xs text-rose-700 leading-relaxed"><span className="font-bold block mb-0.5">Risk</span>{msg.educational.risk}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Diagnosis Report */}
            {msg.sender === 'ai' && msg.diagnosis && (
              <div className="mt-2 w-full max-w-[95%] bg-white/95 backdrop-blur-xl rounded-2xl overflow-hidden border border-indigo-100 shadow-xl shadow-indigo-100/50 animate-in zoom-in-95 duration-500">
                <div className="bg-slate-50 p-4 border-b border-slate-100 flex justify-between items-center">
                  <div className="flex items-center gap-2 text-indigo-600">
                    <Stethoscope size={18} />
                    <span className="font-bold text-sm uppercase tracking-wide">Diagnosis Report</span>
                  </div>
                  <div className={`px-3 py-1 rounded-full text-xs font-black border ${getScoreColor(msg.diagnosis.score)}`}>
                    SCORE: {msg.diagnosis.score}
                  </div>
                </div>
                <div className="p-5 space-y-4">
                  <div>
                    <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Verdict</h4>
                    <p className="text-lg font-bold text-slate-800">{msg.diagnosis.verdict}</p>
                  </div>
                  <div className="flex gap-3">
                    <Activity size={18} className="text-slate-400 flex-shrink-0 mt-1" />
                    <div>
                       <h4 className="text-xs font-bold text-slate-500 mb-1">Analysis</h4>
                       <p className="text-xs text-slate-600 leading-relaxed">{msg.diagnosis.analysis}</p>
                    </div>
                  </div>
                  <div className="flex gap-3 bg-indigo-50 p-3 rounded-xl border border-indigo-100">
                    <CheckCircle2 size={18} className="text-indigo-500 flex-shrink-0 mt-1" />
                    <div>
                       <h4 className="text-xs font-bold text-indigo-700 mb-1">Prescription</h4>
                       <p className="text-xs text-indigo-600 leading-relaxed font-medium">{msg.diagnosis.suggestion}</p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        ))}
        {loading && (
          <div className="flex justify-start animate-in fade-in slide-in-from-bottom-2">
            <div className="bg-white/80 backdrop-blur-sm p-3 rounded-2xl rounded-tl-none border border-white/50 shadow-sm flex items-center gap-2">
              <Bot size={16} className="text-sakura-400 animate-bounce" />
              <span className="text-xs text-slate-400">Thinking...</span>
            </div>
          </div>
        )}
      </div>

      {/* 
         Input Area 修复：
         1. 使用 textarea 替代 input
         2. 设置 max-h 和 resize-none
         3. 按钮位置调整
      */}
      <div className="p-3 border-t border-slate-100/50 flex-shrink-0 z-10 bg-white/40 backdrop-blur-sm">
        <div className="flex items-end gap-2">
          <textarea
            ref={textareaRef}
            rows={1}
            value={input}
            onChange={handleInput}
            onKeyDown={handleKeyDown}
            placeholder="Describe your strategy"
            className="flex-1 p-3 rounded-xl border border-slate-200/80 bg-white/80 focus:bg-white focus:border-sakura-400 focus:ring-4 focus:ring-sakura-50 outline-none transition-all shadow-sm resize-none custom-scrollbar max-h-[120px] min-h-[46px]"
          />
          <button 
            onClick={handleSend} 
            disabled={loading} 
            className="btn-bouncy bg-sakura-400 text-white rounded-xl shadow-lg shadow-sakura-200 hover:bg-sakura-500 disabled:opacity-50 h-[46px] w-[46px] flex items-center justify-center flex-shrink-0"
          >
            <Send size={20} />
          </button>
        </div>
      </div>
    </div>
  );
});