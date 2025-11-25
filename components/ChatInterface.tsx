import React, { useState, useEffect } from 'react';
import { Send, Bot, Sparkles, Settings, Key } from 'lucide-react';
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

export const ChatInterface: React.FC<ChatInterfaceProps> = ({ onApplyStrategy }) => {
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<Message[]>([
    { id: 1, text: "Hello! Describe a strategy (e.g., 'Buy when RSI is below 30') and I'll configure it for you.", sender: 'ai' }
  ]);
  const [loading, setLoading] = useState(false);

  // --- API Key 管理 ---
  const [apiKey, setApiKey] = useState('');
  const [showKeyInput, setShowKeyInput] = useState(false);

  // 组件加载时读取本地存储的 Key
  useEffect(() => {
    const savedKey = localStorage.getItem('GEMINI_API_KEY');
    if (savedKey) setApiKey(savedKey);
  }, []);

  const handleSaveKey = (key: string) => {
    setApiKey(key);
    localStorage.setItem('GEMINI_API_KEY', key);
  };
  // -------------------

  const handleSend = async () => {
    if (!input.trim()) return;

    const userMsg: Message = { id: Date.now(), text: input, sender: 'user' };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    // 调用真实的 Gemini Service
    const response = await parseStrategyFromChat(userMsg.text, apiKey);

    setLoading(false);

    if (response.error) {
      setMessages(prev => [...prev, { 
        id: Date.now() + 1, 
        text: `⚠️ ${response.error}`, 
        sender: 'ai',
        isError: true
      }]);
      // 如果是因为没有 Key 报错，自动打开设置面板
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
    <div className="bg-white rounded-3xl shadow-xl shadow-sakura-100/50 border border-sakura-100 overflow-hidden flex flex-col h-[500px]">
      {/* Header with Key Settings */}
      <div className="bg-sakura-50 p-4 border-b border-sakura-100 flex justify-between items-center">
        <div className="flex items-center gap-2 text-sakura-800 font-bold">
          <Sparkles size={18} />
          <span>AI Assistant</span>
        </div>
        <button 
          onClick={() => setShowKeyInput(!showKeyInput)}
          className={`p-2 rounded-full transition-colors ${showKeyInput ? 'bg-sakura-200 text-sakura-700' : 'text-sakura-400 hover:bg-white'}`}
          title="Set Gemini API Key"
        >
          <Settings size={18} />
        </button>
      </div>

      {/* API Key Input Panel (Toggleable) */}
      {showKeyInput && (
        <div className="bg-slate-50 p-3 border-b border-slate-100 animate-in slide-in-from-top-2">
          <label className="text-xs font-bold text-slate-500 mb-1 block flex items-center gap-1">
            <Key size={12} /> Gemini API Key
          </label>
          <input 
            type="password"
            value={apiKey}
            onChange={(e) => handleSaveKey(e.target.value)}
            placeholder="Paste key here (starts with AIza...)"
            className="w-full text-sm p-2 rounded-lg border border-slate-200 focus:border-sakura-400 outline-none"
          />
          <p className="text-[10px] text-slate-400 mt-1">
            Key is stored locally in your browser. Get one at <a href="https://aistudio.google.com/app/apikey" target="_blank" className="underline text-sakura-500">Google AI Studio</a>.
          </p>
        </div>
      )}

      {/* Chat Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50/30">
        {messages.map((msg) => (
          <div 
            key={msg.id} 
            className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div 
              className={`max-w-[80%] p-3 rounded-2xl text-sm ${
                msg.sender === 'user' 
                  ? 'bg-sakura-400 text-white rounded-tr-none shadow-md shadow-sakura-200' 
                  : msg.isError 
                    ? 'bg-red-50 text-red-600 border border-red-100 rounded-tl-none'
                    : 'bg-white text-slate-700 border border-slate-100 rounded-tl-none shadow-sm'
              }`}
            >
              {msg.text}
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
            <div className="bg-white p-3 rounded-2xl rounded-tl-none border border-slate-100 shadow-sm flex items-center gap-2">
              <Bot size={16} className="text-sakura-400 animate-bounce" />
              <span className="text-xs text-slate-400">Thinking...</span>
            </div>
          </div>
        )}
      </div>

      {/* Input Area */}
      <div className="p-4 bg-white border-t border-slate-100">
        <div className="flex gap-2">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            placeholder="e.g. 'Run a Bollinger Bands strategy with standard deviation of 2.5'"
            className="flex-1 p-3 rounded-xl border border-slate-200 focus:border-sakura-400 focus:ring-4 focus:ring-sakura-50 outline-none transition-all text-sm"
          />
          <button 
            onClick={handleSend}
            disabled={loading}
            className="bg-sakura-400 text-white p-3 rounded-xl hover:bg-sakura-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-lg shadow-sakura-200"
          >
            <Send size={20} />
          </button>
        </div>
      </div>
    </div>
  );
};