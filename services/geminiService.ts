import { GoogleGenerativeAI } from '@google/generative-ai';
import { StrategyType, StrategyParams, DEFAULT_PARAMS, BacktestResult } from '../types';

// 基础 System Prompt
const BASE_SYSTEM_PROMPT = `
You are "Sakura", an expert Quantitative Trading Mentor.
Your goal is to guide beginners through trading strategies and risk management.

STYLE: Professional, concise, insightful. No emojis unless necessary.

PLATFORM CAPABILITIES:
1. SMA_CROSSOVER / EMA_CROSSOVER (Trend)
2. TURTLE (Donchian Breakout)
3. RSI_REVERSAL (Mean Reversion)
4. BOLLINGER_BANDS (Volatility)
5. MACD / MOMENTUM (Momentum)
6. TREND_RSI (Trend + Oscillator)
7. VOLATILITY_FILTER (ADX Filter)
8. KELTNER (ATR Channel)
9. RISK: Stop Loss, Take Profit, Trailing Stop.

=== YOUR JOB ===
Classify intent and output JSON.

JSON STRUCTURE:
{
  "intent": "CONFIGURE" | "EXPLAIN" | "CHAT",
  "strategy": "ENUM",
  "params": { ... },
  "explanation": "...",
  "topic": "...",
  "content": "...",
  "message": "...",
  "suggestions": ["suggestion 1", "suggestion 2", "suggestion 3"]
}

RULES:
1. suggestions must be contextual.
2. Return ONLY raw JSON. No Markdown.
`;

export interface AIResponse {
  intent: 'CONFIGURE' | 'EXPLAIN' | 'CHAT' | 'ERROR';
  strategy?: StrategyType;
  params?: Partial<StrategyParams>;
  explanation?: string;
  topic?: string;
  content?: string;
  message?: string;
  suggestions?: string[];
}

export interface DiagnosisContent {
  score: number;
  verdict: string;
  analysis: string;
  suggestion: string;
}

// 辅助配置接口
export interface AIConfig {
    apiKey: string;
    modelName: string;
    language: string;
}

const cleanAndParseJSON = (text: string) => {
    let cleanText = text.replace(/```json/g, '').replace(/```/g, '');
    const firstBrace = cleanText.indexOf('{');
    const lastBrace = cleanText.lastIndexOf('}');
    if (firstBrace !== -1 && lastBrace !== -1) {
        cleanText = cleanText.substring(firstBrace, lastBrace + 1);
    }
    return JSON.parse(cleanText);
};

export const parseStrategyFromChat = async (userInput: string, config: AIConfig): Promise<AIResponse> => {
  if (!config.apiKey) return { intent: 'ERROR', message: "Please configure your API Key in settings first." };

  try {
    const genAI = new GoogleGenerativeAI(config.apiKey);
    // 使用用户指定的模型，如果为空则回退默认
    const model = genAI.getGenerativeModel({ model: config.modelName || "gemini-2.0-flash" });

    // 动态注入语言要求
    const languageInstruction = config.language 
        ? `IMPORTANT: You MUST reply in ${config.language}. All explanations and content must be in ${config.language}.` 
        : "";

    const fullPrompt = `${BASE_SYSTEM_PROMPT}\n${languageInstruction}\n\nUSER INPUT: "${userInput}"`;

    const result = await model.generateContent({
      contents: [{ role: "user", parts: [{ text: fullPrompt }] }]
    });

    const parsed = cleanAndParseJSON(result.response.text());
    
    if (!['CONFIGURE', 'EXPLAIN', 'CHAT'].includes(parsed.intent)) {
        parsed.intent = 'CHAT';
    }

    if (parsed.intent === 'CONFIGURE') {
        return {
            intent: 'CONFIGURE',
            strategy: parsed.strategy as StrategyType,
            params: { ...DEFAULT_PARAMS, ...parsed.params },
            explanation: parsed.explanation,
            suggestions: parsed.suggestions || ["Add Stop Loss", "Explain this"]
        };
    }

    return parsed as AIResponse;

  } catch (e) {
    console.error("AI Parse Error:", e);
    return { intent: 'CHAT', message: "I encountered a processing error. Please check your API Key or Model Name.", suggestions: ["Trend strategies", "Risk Management"] };
  }
};

export const generateBacktestReport = async (result: BacktestResult, strategy: StrategyType, config: AIConfig): Promise<DiagnosisContent | null> => {
    if (!config.apiKey || !result) return null;

    try {
        const genAI = new GoogleGenerativeAI(config.apiKey);
        const model = genAI.getGenerativeModel({ model: config.modelName || "gemini-2.0-flash" });
        
        const languageInstruction = config.language 
            ? `Output content in ${config.language}.` 
            : "";

        const prompt = `
        You are a Risk Manager. Analyze this backtest result for strategy: ${strategy}.
        ${languageInstruction}
        
        DATA:
        - Total Return: ${result.metrics.totalReturn.toFixed(2)}%
        - Max Drawdown: ${result.metrics.maxDrawdown.toFixed(2)}%
        - Win Rate: ${result.metrics.winRate.toFixed(2)}%
        - Sharpe Ratio: ${result.metrics.sharpeRatio.toFixed(2)}
        
        TASK:
        Provide a diagnosis in strict JSON format:
        {
            "score": (Integer 0-100),
            "verdict": (Short Title),
            "analysis": (2 sentences analyzing performance),
            "suggestion": (1 actionable advice)
        }
        NO MARKDOWN. ONLY JSON.
        `;

        const res = await model.generateContent(prompt);
        return cleanAndParseJSON(res.response.text()) as DiagnosisContent;

    } catch (e) { return null; }
};

export const analyzeTradeContext = async (trade: any, data: any[], strategy: any, apiKey: string) => {
    return `Analysis pending implementation.`; 
};

// --- Suggestions Logic ---
const SUGGESTION_POOL = [
    "Setup a safe Trend Strategy 🛡️",
    "How to catch breakout? 🚀",
    "Explain Trailing Stop 📉",
    "I want to trade volatility ⚡",
    "Strategy for sideways market 🦀",
    "Optimize for Sharpe Ratio 📈"
];

export const getFreshSuggestions = () => {
    const shuffled = [...SUGGESTION_POOL].sort(() => 0.5 - Math.random());
    return shuffled.slice(0, 4);
};