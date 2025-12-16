import { GoogleGenerativeAI } from '@google/generative-ai';
import { StrategyType, StrategyParams, DEFAULT_PARAMS, BacktestResult, DiagnosisContent, AIConfig } from '../types';

const BASE_SYSTEM_PROMPT = `
ROLE: You are an elite Quantitative Trading Mentor.
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
  "ticker": "AAPL",               // Optional: If user mentions a specific asset
  "explanation": "Short, professional rationale.",
  "content": "Explanation text...", // If intent is EXPLAIN
  "message": "Chat text...",        // If intent is CHAT
  "suggestions": ["Short follow-up 1", "Short follow-up 2", "Short follow-up 3"]
}

=== EXAMPLES ===
User: "Use Turtle strategy on NVDA"
JSON: { "intent": "CONFIGURE", "strategy": "TURTLE", "ticker": "NVDA", "params": { "turtleEntry": 20, "turtleExit": 10 }, "explanation": "Activated Turtle Trading rules for NVDA.", "suggestions": ["Add a Trailing Stop", "Explain Donchian Channels"] }

User: "Make it safer"
JSON: { "intent": "CONFIGURE", "strategy": "TREND_RSI", "params": { "stopLoss": 5, "trendMa": 200 }, "explanation": "Switched to Trend+RSI filter and added a 5% hard stop loss for capital preservation.", "suggestions": ["What is Sharpe Ratio?", "Optimize RSI period"] }
`;

export interface AIResponse {
  intent: 'CONFIGURE' | 'EXPLAIN' | 'CHAT' | 'ERROR';
  strategy?: StrategyType;
  params?: Partial<StrategyParams>;
  ticker?: string;
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
    currentContext?: { strategy: StrategyType, params: StrategyParams },
    retryCount = 0
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
    
    console.log('Raw AI response text:', text);
    
    if (!text) throw new Error("Empty response");

    const parsed = cleanAndParseJSON(text);
    
    console.log('Parsed AI response:', parsed);
    
    // Post-processing
    if (parsed.intent === 'CONFIGURE') {
        console.log('CONFIGURE intent detected, applying defaults');
        // Merge with defaults to ensure safety
        return { 
            ...parsed,
            params: { ...DEFAULT_PARAMS, ...parsed.params },
            suggestions: parsed.suggestions || ["Optimize this", "Add Risk Control"]
        };
    }

    return parsed;

  } catch (e: any) {
    const errorMsg = e.message || '';
    
    // Handle rate limit (429) errors
    if (errorMsg.includes('429') || errorMsg.includes('quota') || errorMsg.includes('rate')) {
      // Extract retry delay if available
      const retryMatch = errorMsg.match(/retry in (\d+\.?\d*)/i);
      const retryDelay = retryMatch ? Math.ceil(parseFloat(retryMatch[1]) * 1000) : 8000;
      
      if (retryCount < 2) {
        console.log(`Rate limited. Waiting ${retryDelay}ms before retry ${retryCount + 1}...`);
        await new Promise(resolve => setTimeout(resolve, retryDelay));
        return parseStrategyFromChat(userInput, config, currentContext, retryCount + 1);
      }
      
      return { 
        intent: 'ERROR', 
        message: "You've exceeded the API rate limit. Please wait a moment and try again, or consider upgrading your Gemini API plan. You can also try switching to 'gemini-2.0-flash-lite' model in settings.", 
        suggestions: ["Wait and try again", "Change model in settings"] 
      };
    }
    
    // Handle overloaded/503 errors with retry
    if ((errorMsg.includes('503') || errorMsg.includes('overloaded')) && retryCount < 2) {
      await new Promise(resolve => setTimeout(resolve, 1500 * (retryCount + 1))); // Wait 1.5s, 3s
      return parseStrategyFromChat(userInput, config, currentContext, retryCount + 1);
    }
    
    // Provide helpful error message
    if (errorMsg.includes('503') || errorMsg.includes('overloaded')) {
      return { intent: 'ERROR', message: "The AI model is currently overloaded. Please try again in a moment, or switch to a different model (e.g., gemini-2.0-flash-lite) in settings.", suggestions: ["Try again"] };
    }
    
    return { intent: 'ERROR', message: `Connection error: ${e.message}`, suggestions: ["Try again"] };
  }
};

export const generateBacktestReport = async (result: BacktestResult, strategy: StrategyType, config: AIConfig, retryCount = 0): Promise<DiagnosisContent | null> => {
    if (!config.apiKey || !result) {
        console.log("generateBacktestReport: Missing apiKey or result");
        return null;
    }
    try {
        console.log("generateBacktestReport: Starting with model", config.modelName);
        const genAI = new GoogleGenerativeAI(config.apiKey);
        const model = genAI.getGenerativeModel({ model: config.modelName || "gemini-2.0-flash-lite" });
        const languageInstruction = config.language ? `Output ALL text in ${config.language}.` : "";
        
        const tradesSample = result.trades.slice(0, 20).map(t => `${t.date}: ${t.type} @ $${t.price.toFixed(2)} (${t.reason || 'signal'})`).join('\n');
        const totalTrades = result.trades.length;
        const buyTrades = result.trades.filter(t => t.type === 'BUY').length;
        const sellTrades = result.trades.filter(t => t.type === 'SELL').length;

        const prompt = `
You are a Senior Quantitative Analyst at a top hedge fund. Generate a COMPREHENSIVE PROFESSIONAL ANALYSIS REPORT for this trading strategy backtest.
${languageInstruction}

=== STRATEGY INFO ===
Strategy Type: ${strategy}
Total Return: ${result.metrics.totalReturn.toFixed(2)}%
Max Drawdown: ${result.metrics.maxDrawdown.toFixed(2)}%
Sharpe Ratio: ${result.metrics.sharpeRatio.toFixed(2)}
Win Rate (Positive Time): ${result.metrics.winRate?.toFixed(1) || 'N/A'}%
Total Trades: ${totalTrades} (${buyTrades} buys, ${sellTrades} sells)
Initial Capital: $${result.metrics.initialCapital?.toLocaleString() || '10,000'}
Final Capital: $${result.metrics.finalCapital?.toLocaleString() || 'N/A'}

=== TRADE SAMPLES ===
${tradesSample}

=== GENERATE THIS JSON REPORT ===
{
    "score": <0-100 overall strategy score>,
    "verdict": "<2-4 word verdict like 'Strong Momentum Play' or 'High Risk, High Reward'>",
    "summary": "<2-3 sentence executive summary of the strategy performance and characteristics>",
    "strategyExplanation": "<paragraph explaining how this specific strategy works, what signals it uses, and the logic behind entry/exit decisions>",
    "performanceBreakdown": "<detailed breakdown of returns, including profit factor, average trade gain/loss, best and worst trades, and how the capital curve evolved>",
    "riskAssessment": "<paragraph about risk level, drawdown analysis, volatility exposure, and risk-adjusted returns>",
    "marketConditions": "<paragraph about what market conditions (trending, volatile, ranging) this strategy works best/worst in>",
    "recommendations": ["<actionable recommendation 1>", "<actionable recommendation 2>", "<actionable recommendation 3>", "<actionable recommendation 4>"],
    "strengths": ["<strength 1>", "<strength 2>", "<strength 3>"],
    "weaknesses": ["<weakness 1>", "<weakness 2>"],
    "risk_assessment": "<legacy field - same as riskAssessment>",
    "market_conditions": "<legacy field - same as marketConditions>",
    "optimization_tips": ["<actionable tip 1>", "<actionable tip 2>", "<actionable tip 3>"],
    "analysis": "<detailed technical analysis paragraph>",
    "suggestion": "<primary recommendation for improvement>",
    "key_dates": ["<important date 1>", "<important date 2>"]
}

Be specific, actionable, and professional. RETURN ONLY VALID JSON. NO MARKDOWN FORMATTING.
        `;
        const res = await model.generateContent(prompt);
        const text = res.response.text();
        console.log("generateBacktestReport: Raw response", text.substring(0, 300));
        
        // Custom parsing for Diagnosis to avoid the AIResponse fallback
        try {
            let clean = text.replace(/```json/g, '').replace(/```/g, '').trim();
            const firstOpen = clean.indexOf('{');
            const lastClose = clean.lastIndexOf('}');
            if (firstOpen !== -1 && lastClose !== -1) {
                clean = clean.substring(firstOpen, lastClose + 1);
                return JSON.parse(clean) as DiagnosisContent;
            }
        } catch (e) {
            console.error("Diagnosis Parse Error", e);
        }
        return null;
    } catch (e: any) { 
        const errorMsg = e.message || '';
        console.error("generateBacktestReport error:", errorMsg);
        
        // Handle rate limit (429) errors
        if (errorMsg.includes('429') || errorMsg.includes('quota') || errorMsg.includes('rate')) {
            const retryMatch = errorMsg.match(/retry in (\d+\.?\d*)/i);
            const retryDelay = retryMatch ? Math.ceil(parseFloat(retryMatch[1]) * 1000) : 8000;
            
            if (retryCount < 2) {
                console.log(`Rate limited. Waiting ${retryDelay}ms before retry ${retryCount + 1}...`);
                await new Promise(resolve => setTimeout(resolve, retryDelay));
                return generateBacktestReport(result, strategy, config, retryCount + 1);
            }
            throw new Error("Rate limit exceeded. Please wait a moment and try again, or switch to 'gemini-2.0-flash-lite' model.");
        }
        
        // Retry on 503/overloaded errors
        if ((errorMsg.includes('503') || errorMsg.includes('overloaded')) && retryCount < 2) {
            await new Promise(resolve => setTimeout(resolve, 2000 * (retryCount + 1)));
            return generateBacktestReport(result, strategy, config, retryCount + 1);
        }
        return null; 
    }
};

export const analyzeTradeContext = async (trade: any, data: any[], strategy: any, apiKey: string) => {
    return "Analysis pending."; 
};

// Chat about analysis results - general discussion mode
export const chatAboutAnalysis = async (
    userInput: string,
    config: AIConfig,
    analysisContext: DiagnosisContent | null,
    chatHistory: { role: 'user' | 'ai', content: string }[],
    retryCount = 0
): Promise<string> => {
    if (!config.apiKey) return "Please configure your API Key in settings first.";
    
    try {
        const genAI = new GoogleGenerativeAI(config.apiKey);
        const model = genAI.getGenerativeModel({ model: config.modelName || "gemini-2.0-flash-lite" });
        
        const languageInstruction = config.language ? `Respond in ${config.language}.` : "";
        
        const analysisStr = analysisContext 
            ? `ANALYSIS CONTEXT:
Score: ${analysisContext.score}/100
Verdict: ${analysisContext.verdict}
Analysis: ${analysisContext.analysis}
Suggestion: ${analysisContext.suggestion}`
            : "No analysis has been run yet.";
        
        const historyStr = chatHistory.slice(-6).map(m => `${m.role === 'user' ? 'User' : 'AI'}: ${m.content}`).join('\n');
        
        const systemPrompt = `You are an expert Quantitative Trading Analyst. The user has run a backtest analysis and wants to discuss the results with you.

${analysisStr}

RECENT CHAT:
${historyStr}

INSTRUCTIONS:
- Be helpful and conversational
- Explain trading concepts clearly when asked
- Provide actionable advice based on the analysis
- Keep responses concise but informative
- You can discuss risk management, strategy optimization, market conditions, etc.
${languageInstruction}

USER: "${userInput}"

Respond naturally as a helpful trading expert:`;

        const result = await model.generateContent({ contents: [{ role: "user", parts: [{ text: systemPrompt }] }] });
        const text = result.response.text();
        
        return text || "I couldn't generate a response. Please try again.";
    } catch (e: any) {
        const errorMsg = e.message || '';
        
        // Handle rate limit (429) errors
        if (errorMsg.includes('429') || errorMsg.includes('quota') || errorMsg.includes('rate')) {
            const retryMatch = errorMsg.match(/retry in (\d+\.?\d*)/i);
            const retryDelay = retryMatch ? Math.ceil(parseFloat(retryMatch[1]) * 1000) : 8000;
            
            if (retryCount < 2) {
                console.log(`Rate limited. Waiting ${retryDelay}ms before retry ${retryCount + 1}...`);
                await new Promise(resolve => setTimeout(resolve, retryDelay));
                return chatAboutAnalysis(userInput, config, analysisContext, chatHistory, retryCount + 1);
            }
            return "You've exceeded the API rate limit. Please wait a moment and try again, or switch to 'gemini-2.0-flash-lite' model in settings.";
        }
        
        // Retry on 503/overloaded errors
        if ((errorMsg.includes('503') || errorMsg.includes('overloaded')) && retryCount < 2) {
            await new Promise(resolve => setTimeout(resolve, 1500 * (retryCount + 1)));
            return chatAboutAnalysis(userInput, config, analysisContext, chatHistory, retryCount + 1);
        }
        
        if (errorMsg.includes('503') || errorMsg.includes('overloaded')) {
            return "The AI model is currently overloaded. Please try again in a moment, or switch to a different model in settings.";
        }
        return `Error: ${errorMsg}`;
    }
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