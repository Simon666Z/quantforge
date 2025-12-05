import React, { useState, useEffect } from 'react';
import { X, Copy, Check, Terminal, FileCode, BookOpen } from 'lucide-react';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';

interface CodeViewerProps {
  isOpen: boolean;
  onClose: () => void;
  codes: {
    pseudocode: string;
    vectorbt: string;
    backtrader: string;
  } | null;
}

const TabButton = ({ active, onClick, icon: Icon, label }: any) => (
  <button
    onClick={onClick}
    className={`flex items-center gap-2 px-4 py-3 text-sm font-bold transition-all duration-300 relative group overflow-hidden ${
      active 
        ? 'text-sakura-500 bg-sakura-50/50' 
        : 'text-slate-400 hover:text-slate-600 hover:bg-slate-50'
    }`}
  >
    {active && (
      <div className="absolute bottom-0 left-0 w-full h-[2px] bg-sakura-400 animate-in fade-in slide-in-from-left-full duration-300" />
    )}
    <Icon size={16} className={`transition-transform duration-300 ${active ? 'scale-110' : 'group-hover:scale-110'}`} />
    {label}
  </button>
);

export const CodeViewer: React.FC<CodeViewerProps> = ({ isOpen, onClose, codes }) => {
  const [activeTab, setActiveTab] = useState<'pseudo' | 'vbt' | 'bt'>('pseudo');
  const [copied, setCopied] = useState(false);
  const [isMounting, setIsMounting] = useState(false);

  useEffect(() => {
    if (isOpen) setIsMounting(true);
    else setTimeout(() => setIsMounting(false), 400); // 稍微延长卸载时间以匹配动画
  }, [isOpen]);

  if (!isMounting && !isOpen) return null;

  const getContent = () => {
    if (!codes) return "Generating code...";
    switch (activeTab) {
      case 'pseudo': return codes.pseudocode;
      case 'vbt': return codes.vectorbt;
      case 'bt': return codes.backtrader;
      default: return '';
    }
  };

  const getLanguage = () => (activeTab === 'pseudo' ? 'markdown' : 'python');

  const handleCopy = () => {
    navigator.clipboard.writeText(getContent());
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className={`fixed inset-0 z-[9999] flex items-center justify-center p-4 ${isOpen ? 'pointer-events-auto' : 'pointer-events-none'}`}>
      
      {/* 自定义滚动条样式 (局部作用域) */}
      <style>{`
        .code-scrollbar::-webkit-scrollbar {
          width: 10px;
          height: 10px;
        }
        .code-scrollbar::-webkit-scrollbar-track {
          background: #1e1e1e; /* 深色背景 */
        }
        .code-scrollbar::-webkit-scrollbar-thumb {
          background: #4b5563; /* 显眼的灰色滑块 */
          border-radius: 5px;
          border: 2px solid #1e1e1e; /* 边框让它看起来悬浮 */
        }
        .code-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #6b7280; /* hover 变亮 */
        }
      `}</style>

      {/* Backdrop */}
      <div 
        className={`absolute inset-0 bg-slate-900/40 backdrop-blur-sm transition-opacity duration-400 ease-out ${
            isOpen ? 'opacity-100' : 'opacity-0'
        }`}
        onClick={onClose}
      />
      
      {/* Modal with Bouncy Animation */}
      <div 
        className={`bg-white rounded-2xl shadow-2xl w-full max-w-3xl h-[600px] flex flex-col relative border border-white/50 ring-1 ring-black/5 overflow-hidden transform transition-all duration-500 ${
            isOpen 
            ? 'opacity-100 scale-100 translate-y-0' 
            : 'opacity-0 scale-95 translate-y-12'
        }`}
        style={{
            // 使用自定义贝塞尔曲线实现 Q 弹效果：超出一点点再缩回来
            transitionTimingFunction: 'cubic-bezier(0.34, 1.56, 0.64, 1)'
        }}
      >
        
        {/* Header */}
        <div className="flex justify-between items-center p-4 border-b border-slate-100 bg-slate-50/50 shrink-0">
          <div className="flex items-center gap-3">
             <div className="p-2 bg-indigo-100 text-indigo-500 rounded-xl shadow-sm animate-in zoom-in duration-300 delay-100">
                <Terminal size={20} />
             </div>
             <div>
                <h3 className="font-bold text-slate-700">Strategy Source Code</h3>
                <p className="text-xs text-slate-400">Export & run this strategy locally</p>
             </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-rose-50 hover:text-rose-500 rounded-full transition-colors text-slate-400 btn-bouncy">
            <X size={20} />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-slate-100 bg-white shrink-0">
          <TabButton active={activeTab === 'pseudo'} onClick={() => setActiveTab('pseudo')} icon={BookOpen} label="Logic (Whitebox)" />
          <TabButton active={activeTab === 'vbt'} onClick={() => setActiveTab('vbt')} icon={FileCode} label="VectorBT (Python)" />
          <TabButton active={activeTab === 'bt'} onClick={() => setActiveTab('bt')} icon={Terminal} label="Backtrader (Python)" />
        </div>

        {/* Content Area */}
        <div className="flex-1 relative bg-[#1e1e1e] group overflow-hidden">
           {/* 应用自定义滚动条类名 */}
           <div className="absolute inset-0 overflow-auto code-scrollbar">
               <SyntaxHighlighter
                  language={getLanguage()}
                  style={vscDarkPlus}
                  customStyle={{
                      margin: 0,
                      padding: '1.5rem',
                      background: 'transparent',
                      fontSize: '13px',
                      fontFamily: '"JetBrains Mono", "Fira Code", monospace',
                      lineHeight: '1.6'
                  }}
                  showLineNumbers={true}
                  lineNumberStyle={{ minWidth: '2em', paddingRight: '1em', color: '#6e7681', textAlign: 'right' }}
               >
                  {getContent()}
               </SyntaxHighlighter>
           </div>
           
           <button 
             onClick={handleCopy}
             className="absolute top-4 right-4 flex items-center gap-2 px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white text-xs font-bold rounded-lg backdrop-blur-md transition-all border border-white/10 shadow-lg hover:scale-105 active:scale-95 z-10"
           >
             {copied ? <Check size={14} className="text-emerald-400 animate-in zoom-in duration-200"/> : <Copy size={14} />}
             {copied ? "Copied!" : "Copy Code"}
           </button>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-100 bg-slate-50 text-xs text-slate-400 flex justify-between items-center shrink-0">
           <span className="flex items-center gap-2">
             <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></div>
             Ready to execute
           </span>
           <span className="font-mono bg-slate-200/50 px-2 py-1 rounded border border-slate-200/50 text-slate-500 select-all">
             pip install vectorbt yfinance backtrader
           </span>
        </div>
      </div>
    </div>
  );
};