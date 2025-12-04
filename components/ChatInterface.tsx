import React, { useState, useEffect, useRef } from 'react';
import { Send, Bot, Sparkles, Settings, Key, Trash2 } from 'lucide-react';
import { StrategyType, StrategyParams } from '../types';
import { parseStrategyFromChat } from '../services/geminiService';

interface ChatInterfaceProps {
  onApplyStrategy: (strategy: StrategyType, params: StrategyParams) => void;
}

interface Message {
  id: number;
  text: string;
  sender: 'user' | 'ai';
  isError?: boolean;
}

const INITIAL_MSG: Message = { 
  id: 1, 
  text: "Hello! Describe a strategy (e.g., 'Buy when RSI is below 30') and I'll configure it for you.", 
  sender: 'ai' 
};

export const ChatInterface: React.FC<ChatInterfaceProps> = ({ onApplyStrategy }) => {
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<Message[]>([INITIAL_MSG]);
  const [loading, setLoading] = useState(false);
  const [apiKey, setApiKey] = useState('');
  const [showKeyInput, setShowKeyInput] = useState(false);
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const savedKey = localStorage.getItem('GEMINI_API_KEY');
    if (savedKey) setApiKey(savedKey);
  }, []);

  const handleSaveKey = (key: string) => {
    setApiKey(key);
    localStorage.setItem('GEMINI_API_KEY', key);
  };

  const scrollToBottom = () => {
    if (scrollAreaRef.current) {
      const { scrollHeight } = scrollAreaRef.current;
      scrollAreaRef.current.scrollTo({
        top: scrollHeight,
        behavior: 'smooth' 
      });
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

    const response = await parseStrategyFromChat(userMsg.text, apiKey);

    setLoading(false);

    if (response.error) {
      setMessages(prev => [...prev, { 
        id: Date.now() + 1, 
        text: `⚠️ ${response.error}`, 
        sender: 'ai',
        isError: true
      }]);
      if (response.error.includes("API Key")) {
        setShowKeyInput(true);
      }
    } else {
      setMessages(prev => [...prev, { 
        id: Date.now() + 1, 
        text: `✅ ${response.explanation}`, 
        sender: 'ai' 
      }]);
      onApplyStrategy(response.strategy, response.params);
    }
  };

  return (
    // 修改点：bg-white/85 backdrop-blur-md 实现磨砂效果
    <div className="bg-white/85 backdrop-blur-md rounded-3xl shadow-xl shadow-sakura-100/50 border border-white/50 overflow-hidden flex flex-col h-[500px] transition-all duration-500 hover:shadow-2xl hover:shadow-sakura-200/50">
      {/* Header */}
      <div className="bg-sakura-50/50 border-b border-sakura-100/50 flex justify-between items-center flex-shrink-0 z-10 relative p-4">
        <div className="flex items-center gap-2 text-sakura-800 font-bold">
          <Sparkles size={18} className="animate-pulse" />
          <span>AI Assistant</span>
        </div>
        <div className="flex gap-2">
          <button 
            onClick={handleClearChat}
            className="btn-bouncy p-2 rounded-xl bg-white/80 hover:bg-white text-sakura-400 hover:text-rose-500 shadow-sm border border-sakura-100"
            title="Clear Chat History"
          >
            <Trash2 size={16} />
          </button>
          <button 
            onClick={() => setShowKeyInput(!showKeyInput)}
            className={`btn-bouncy p-2 rounded-xl shadow-sm border transition-colors duration-300 ${showKeyInput ? 'bg-sakura-400 text-white border-sakura-400' : 'bg-white/80 hover:bg-white text-sakura-400 border-sakura-100'}`}
            title="Set Gemini API Key"
          >
            <Settings size={16} className={`transition-transform duration-500 ${showKeyInput ? 'rotate-180' : ''}`} />
          </button>
        </div>
      </div>

      {/* API Key Input Panel */}
      <div 
        className={`grid transition-[grid-template-rows] duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] border-b border-slate-100/50 bg-slate-50/50 ${showKeyInput ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0 border-b-0'}`}
      >
        <div className="overflow-hidden">
          <div className="p-3">
            <label className="text-xs font-bold text-slate-500 mb-1 block flex items-center gap-1">
              <Key size={12} /> Gemini API Key
            </label>
            <input 
              type="password"
              value={apiKey}
              onChange={(e) => handleSaveKey(e.target.value)}
              placeholder="Paste key here (starts with AIza...)"
              className="w-full text-sm p-2 rounded-xl border border-slate-200/80 bg-white/80 focus:border-sakura-400 focus:ring-2 focus:ring-sakura-100 outline-none transition-all"
            />
            <p className="text-[10px] text-slate-400 mt-1 pl-1">
              Key stored locally. Get one at Google AI Studio.
            </p>
          </div>
        </div>
      </div>

      {/* Chat Messages Area */}
      <div 
        ref={scrollAreaRef} 
        className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar scroll-smooth"
      >
        {messages.map((msg) => (
          <div 
            key={msg.id} 
            className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'} animate-in slide-in-from-bottom-2 duration-300 fade-in`}
          >
            <div 
              className={`max-w-[80%] p-3 rounded-2xl text-sm transition-transform hover:scale-[1.02] shadow-sm ${
                msg.sender === 'user' 
                  ? 'bg-sakura-400 text-white rounded-tr-none shadow-sakura-200' 
                  : msg.isError 
                    ? 'bg-red-50/90 text-red-600 border border-red-100 rounded-tl-none'
                    : 'bg-white/80 backdrop-blur-sm text-slate-700 border border-white/50 rounded-tl-none'
              }`}
            >
              {msg.text}
            </div>
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

      {/* Input Area */}
      <div className="p-4 border-t border-slate-100/50 flex-shrink-0 z-10 bg-white/40 backdrop-blur-sm">
        <div className="flex gap-2">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            placeholder="e.g. 'Run a Bollinger Bands strategy...'"
            className="flex-1 p-3 rounded-xl border border-slate-200/80 bg-white/80 focus:bg-white focus:border-sakura-400 focus:ring-4 focus:ring-sakura-50 outline-none transition-all duration-300 focus:scale-[1.01] text-sm shadow-sm"
          />
          <button 
            onClick={handleSend}
            disabled={loading}
            className="btn-bouncy bg-sakura-400 text-white p-3 rounded-xl shadow-lg shadow-sakura-200 hover:bg-sakura-500 hover:shadow-sakura-300 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
          >
            <Send size={20} />
          </button>
        </div>
      </div>
    </div>
  );
};