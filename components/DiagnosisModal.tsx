import React, { useState, useEffect } from 'react';
import { X, Stethoscope, Activity, CheckCircle2, AlertTriangle, Lightbulb } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { DiagnosisContent } from '../types'; // Fix Import

interface DiagnosisModalProps {
  isOpen: boolean;
  onClose: () => void;
  diagnosis: DiagnosisContent | null;
  loading: boolean;
}

const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-emerald-600 bg-emerald-50 border-emerald-200';
    if (score >= 60) return 'text-amber-600 bg-amber-50 border-amber-200';
    return 'text-rose-600 bg-rose-50 border-rose-200';
};

export const DiagnosisModal: React.FC<DiagnosisModalProps> = ({ isOpen, onClose, diagnosis, loading }) => {
  const [isMounting, setIsMounting] = useState(false);

  useEffect(() => {
    if (isOpen) setIsMounting(true);
    else setTimeout(() => setIsMounting(false), 400); 
  }, [isOpen]);

  if (!isMounting && !isOpen) return null;

  return (
    <div className={`fixed inset-0 z-[9999] flex items-center justify-center p-4 ${isOpen ? 'pointer-events-auto' : 'pointer-events-none'}`}>
      
      <div className={`absolute inset-0 bg-slate-900/40 backdrop-blur-sm transition-opacity duration-400 ease-out ${isOpen ? 'opacity-100' : 'opacity-0'}`} onClick={onClose} />
      
      <div 
        className={`bg-white rounded-3xl shadow-2xl w-full max-w-2xl flex flex-col relative border border-white/50 ring-1 ring-black/5 overflow-hidden transform transition-all duration-500 ${isOpen ? 'opacity-100 scale-100 translate-y-0' : 'opacity-0 scale-95 translate-y-12'}`}
        style={{ transitionTimingFunction: 'cubic-bezier(0.34, 1.56, 0.64, 1)' }}
      >
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b border-slate-100 bg-gradient-to-r from-violet-50 to-white shrink-0">
          <div className="flex items-center gap-4">
             <div className="w-10 h-10 bg-violet-100 text-violet-600 rounded-2xl flex items-center justify-center shadow-sm">
                <Stethoscope size={20} />
             </div>
             <div>
                <h3 className="font-bold text-xl text-slate-800">Strategy Diagnosis</h3>
                <p className="text-xs text-slate-500">Deep AI analysis of your backtest</p>
             </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-400"><X size={20} /></button>
        </div>

        {/* Content */}
        <div className="flex-1 p-8 bg-white overflow-y-auto">
            {loading ? (
                <div className="h-48 flex flex-col items-center justify-center gap-4 text-slate-400 animate-pulse">
                    <div className="w-12 h-12 rounded-full border-4 border-slate-200 border-t-violet-400 animate-spin"></div>
                    <p className="text-sm font-bold tracking-widest">ANALYZING TRADES...</p>
                </div>
            ) : diagnosis ? (
                <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    
                    {/* Score Banner */}
                    <div className={`p-4 rounded-2xl border flex items-center justify-between ${getScoreColor(diagnosis.score)}`}>
                        <div className="flex items-center gap-3">
                            <Activity size={24}/>
                            <div>
                                <h4 className="font-black text-2xl">{diagnosis.score}/100</h4>
                                <p className="text-xs opacity-80 font-bold uppercase tracking-wider">Stability Score</p>
                            </div>
                        </div>
                        <div className="text-right">
                            <h3 className="font-bold text-lg">{diagnosis.verdict}</h3>
                        </div>
                    </div>

                    {/* Analysis Section */}
                    <div>
                        <h4 className="flex items-center gap-2 font-bold text-slate-700 mb-2 text-lg">
                            <AlertTriangle size={20} className="text-amber-500"/> Analysis
                        </h4>
                        <div className="text-base text-slate-700 leading-relaxed bg-slate-50 p-5 rounded-xl border border-slate-100 [&>p]:mb-3 [&>p:last-child]:mb-0 [&>ul]:list-disc [&>ul]:pl-5 [&>ol]:list-decimal [&>ol]:pl-5">
                            <ReactMarkdown>{diagnosis.analysis}</ReactMarkdown>
                        </div>
                    </div>

                    {/* Suggestion Section */}
                    <div>
                        <h4 className="flex items-center gap-2 font-bold text-slate-700 mb-2 text-lg">
                            <Lightbulb size={20} className="text-emerald-500"/> Recommendation
                        </h4>
                        <div className="text-base font-medium text-emerald-900 bg-emerald-50 p-5 rounded-xl border border-emerald-100 flex gap-3 items-start">
                            <CheckCircle2 size={24} className="shrink-0 mt-0.5"/>
                            <div className="[&>p]:mb-2 [&>p:last-child]:mb-0">
                                <ReactMarkdown>{diagnosis.suggestion}</ReactMarkdown>
                            </div>
                        </div>
                    </div>

                </div>
            ) : (
                <div className="text-center text-slate-400 py-10">Analysis failed or not available.</div>
            )}
        </div>
      </div>
    </div>
  );
};