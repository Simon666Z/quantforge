import { GoogleGenerativeAI } from '@google/generative-ai';
import { StrategyType, StrategyParams, DEFAULT_PARAMS, BacktestResult, DiagnosisContent, AIConfig } from '../types';

const BASE_SYSTEM_PROMPT = `
ROLE: You are "Sakura", an elite Quantitative Trading Mentor.
GOAL: Configure the backtesting engine or explain concepts based on user input.

=== CAPABILITY MATRIX (STRICT) ===
You can ONLY configure these strategies with these specific parameters:

1. TREND FOLLOWING:
   - SMA_CROSSOVER: { shortWindow, longWindow }
   - EMA_CROSSOVER: { shortWindow, longWindow }
   - TURTLE: { turtleEntry (breakout days), turtleExit (breakdown days) }
   - KELTNER: { keltnerPeriod, keltnerMult }
   - TREND_RSI: { trendMa (filter), rsiPeriod, rsiOversold }

2. MEAN REVERSION:
   - RSI_REVERSAL: { rsiPeriod, rsiOversold, rsiOverbought }
   - BOLLINGER_BANDS: { bbPeriod, bbStdDev }

3. MOMENTUM & FILTERS:
   - MACD: { macdFast, macdSlow, macdSignal }
   - MOMENTUM: { rocPeriod }
   - VOLATILITY_FILTER: { adxPeriod, adxThreshold }

4. RISK MANAGEMENT (Apply these if user mentions "safe", "risk", "stop"):
   - stopLoss (%), takeProfit (%), trailingStop (%)

=== OUTPUT FORMAT (JSON ONLY) ===
Do NOT output markdown. Do NOT output conversational text outside JSON.
Structure:
{
  "intent": "CONFIGURE" | "EXPLAIN" | "CHAT",
  "strategy": "ENUM_VALUE",      // Required if intent is CONFIGURE
  "params": { "paramName": 123 }, // Only changed params
  "explanation": "Short, professional rationale.",
  "content": "Explanation text...", // If intent is EXPLAIN
  "message": "Chat text...",        // If intent is CHAT
  "suggestions": ["Short follow-up 1", "Short follow-up 2", "Short follow-up 3"]
}

=== EXAMPLES ===
User: "Use Turtle strategy"
JSON: { "intent": "CONFIGURE", "strategy": "TURTLE", "params": { "turtleEntry": 20, "turtleExit": 10 }, "explanation": "Activated Turtle Trading rules: Buy 20-day highs, sell 10-day lows.", "suggestions": ["Add a Trailing Stop", "Explain Donchian Channels"] }

User: "Make it safer"
JSON: { "intent": "CONFIGURE", "strategy": "TREND_RSI", "params": { "stopLoss": 5, "trendMa": 200 }, "explanation": "Switched to Trend+RSI filter and added a 5% hard stop loss for capital preservation.", "suggestions": ["What is Sharpe Ratio?", "Optimize RSI period"] }
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

const cleanAndParseJSON = (text: string): AIResponse => {
    try {
        // 1. Strip Markdown Code Blocks
        let clean = text.replace(/```json/g, '').replace(/```/g, '').trim();
        
        // 2. Extract JSON Object
        const firstOpen = clean.indexOf('{');
        const lastClose = clean.lastIndexOf('}');
        if (firstOpen !== -1 && lastClose !== -1) {
            clean = clean.substring(firstOpen, lastClose + 1);
            return JSON.parse(clean);
        }
        
        // 3. Fallback: If no JSON found, treat as CHAT
        throw new Error("No JSON object found");
    } catch (e) {
        console.warn("AI JSON Parse Failed, falling back to CHAT mode.");
        return {
            intent: "CHAT",
            message: text, // Display raw text to user so they see SOMETHING
            suggestions: ["Setup Trend Strategy", "Explain Risk Management"]
        };
    }
};

export const parseStrategyFromChat = async (
    userInput: string, 
    config: AIConfig,
    currentContext?: { strategy: StrategyType, params: StrategyParams }
): Promise<AIResponse> => {
  if (!config.apiKey) return { intent: 'ERROR', message: "Please configure your API Key in settings first." };
  
  try {
    const genAI = new GoogleGenerativeAI(config.apiKey);
    const modelName = config.modelName || "gemini-2.0-flash-lite";
    const model = genAI.getGenerativeModel({ model: modelName });
    
    const languageInstruction = config.language ? `IMPORTANT: Output ALL text in ${config.language}.` : "";
    
    const contextStr = currentContext 
        ? `CURRENT CONTEXT: Strategy=${currentContext.strategy}, Params=${JSON.stringify(currentContext.params)}`
        : "CURRENT CONTEXT: Default";

    const fullPrompt = `${BASE_SYSTEM_PROMPT}\n${languageInstruction}\n${contextStr}\n\nUSER INPUT: "${userInput}"`;
    
    const result = await model.generateContent({ contents: [{ role: "user", parts: [{ text: fullPrompt }] }] });
    const text = result.response.text();
    
    if (!text) throw new Error("Empty response");

    const parsed = cleanAndParseJSON(text);
    
    // Post-processing
    if (parsed.intent === 'CONFIGURE') {
        // Merge with defaults to ensure safety
        return { 
            ...parsed,
            params: { ...DEFAULT_PARAMS, ...parsed.params },
            suggestions: parsed.suggestions || ["Optimize this", "Add Risk Control"]
        };
    }

    return parsed;

  } catch (e: any) {
    return { intent: 'CHAT', message: `Connection error: ${e.message}`, suggestions: ["Try again"] };
  }
};

export const generateBacktestReport = async (result: BacktestResult, strategy: StrategyType, config: AIConfig): Promise<DiagnosisContent | null> => {
    if (!config.apiKey || !result) return null;
    try {
        const genAI = new GoogleGenerativeAI(config.apiKey);
        const model = genAI.getGenerativeModel({ model: config.modelName || "gemini-2.0-flash-lite" });
        const languageInstruction = config.language ? `Output in ${config.language}.` : "";
        
        const tradesSample = result.trades.slice(0, 15).map(t => `${t.date}: ${t.type} @ $${t.price.toFixed(2)}`).join('\n');

        const prompt = `
        Act as a Senior Quant Risk Manager. Diagnose this ${strategy} strategy.
        ${languageInstruction}
        
        STATS: Return ${result.metrics.totalReturn.toFixed(2)}%, DD ${result.metrics.maxDrawdown.toFixed(2)}%, Sharpe ${result.metrics.sharpeRatio.toFixed(2)}.
        TRADES (Sample):
        ${tradesSample}
        
        Provide JSON:
        {
            "score": (0-100),
            "verdict": (Short Title),
            "analysis": (Critique specific trade timing),
            "suggestion": (Specific advice),
            "key_dates": ["YYYY-MM-DD"] (Pick 2-3 specific dates from trades to highlight)
        }
        NO MARKDOWN.
        `;
        const res = await model.generateContent(prompt);
        return cleanAndParseJSON(res.response.text()) as DiagnosisContent;
    } catch (e) { return null; }
};

export const analyzeTradeContext = async (trade: any, data: any[], strategy: any, apiKey: string) => {
    return "Analysis pending."; 
};

const SUGGESTION_POOL = [
    "Setup a safe Trend Strategy 🛡️",
    "How to catch breakout? 🚀",
    "Explain Trailing Stop 📉",
    "I want to trade volatility ⚡",
    "Strategy for sideways market 🦀"
];

export const getFreshSuggestions = () => {
    const shuffled = [...SUGGESTION_POOL].sort(() => 0.5 - Math.random());
    return shuffled.slice(0, 3);
};