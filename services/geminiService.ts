import { GoogleGenerativeAI } from "@google/generative-ai";
import { StrategyType, StrategyParams, DEFAULT_PARAMS, BacktestResult, TradeSignal, StockDataPoint } from "../types";

export interface EducationalContent {
  concept: string;
  reason: string;
  risk: string;
}

export interface DiagnosisContent {
  score: number;
  verdict: string;
  analysis: string;
  suggestion: string;
}

export interface AIStrategyResponse {
  strategy: StrategyType;
  params: StrategyParams;
  explanation: string;
  educational?: EducationalContent;
  error?: string;
}

const getModel = (apiKey: string) => {
  const genAI = new GoogleGenerativeAI(apiKey);
  return genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
};

export const parseStrategyFromChat = async (
  userMessage: string,
  apiKey: string 
): Promise<AIStrategyResponse> => {
  if (!apiKey) return { strategy: StrategyType.SMA_CROSSOVER, params: DEFAULT_PARAMS, explanation: "", error: "Missing API Key" };

  try {
    const model = getModel(apiKey);
    const prompt = `
      You are "Sakura", a patient and helpful Quant Trading Mentor for beginners.
      User Input: "${userMessage}"
      
      Task: Map user intent to a strategy.
      Strategies: [SMA_CROSSOVER, EMA_CROSSOVER, RSI_REVERSAL, BOLLINGER_BANDS, MACD, MOMENTUM]
      
      JSON Response Only (No Markdown):
      {
        "strategy": "Enum",
        "params": { ...overrides... },
        "explanation": "Brief confirmation (e.g. 'I've set up a Bollinger Band strategy for you').",
        "educational": {
          "concept": "Name of the financial concept",
          "reason": "Why this fits their request",
          "risk": "One simple risk warning"
        }
      }
    `;

    const result = await model.generateContent(prompt);
    const text = result.response.text().replace(/```json|```/g, '').trim();
    const parsed = JSON.parse(text);

    return {
      strategy: parsed.strategy || StrategyType.SMA_CROSSOVER,
      params: { ...DEFAULT_PARAMS, ...parsed.params },
      explanation: parsed.explanation || "Configured.",
      educational: parsed.educational
    };
  } catch (error: any) {
    return { strategy: StrategyType.SMA_CROSSOVER, params: DEFAULT_PARAMS, explanation: "", error: error.message };
  }
};

// --- 修复评分逻辑：更加宽容和基于数据 ---
export const generateBacktestReport = async (
  result: BacktestResult,
  strategyType: StrategyType,
  apiKey: string
): Promise<DiagnosisContent | null> => {
  if (!apiKey) return null;

  try {
    const model = getModel(apiKey);
    const metrics = result.metrics;
    
    const prompt = `
      Act as a Constructive Quant Mentor reviewing a beginner's strategy.
      
      STRATEGY: ${strategyType}
      DATA:
      - Total Return: ${metrics.totalReturn.toFixed(2)}%
      - Max Drawdown: ${metrics.maxDrawdown.toFixed(2)}%
      - Win Rate: ${metrics.winRate.toFixed(2)}%
      - Trades: ${metrics.tradeCount}

      SCORING RULES (Be fair, not harsh):
      - If Total Return is NEGATIVE: Score < 50.
      - If Total Return is POSITIVE (0-10%): Score 60-70.
      - If Total Return is GOOD (>10%): Score 75-85.
      - If Total Return is EXCELLENT (>50%) AND Drawdown < 30%: Score 90+.
      - Do not give low scores just because it's a simple strategy. If it makes money, it's good.

      TASK: Return JSON (NO MARKDOWN):
      {
        "score": (Integer 0-100 based on rules above),
        "verdict": "Short, punchy headline (e.g. 'Solid Profit, Low Risk')",
        "analysis": "2 sentences on why it worked or failed. Focus on market trend vs strategy logic.",
        "suggestion": "1 specific actionable advice (e.g. 'Try reducing the RSI period to catch more trades')."
      }
    `;

    const resultAI = await model.generateContent(prompt);
    const text = resultAI.response.text().replace(/```json|```/g, '').trim();
    return JSON.parse(text);
  } catch (error) {
    console.error("Report Gen Error", error);
    return null;
  }
};

export const analyzeTradeContext = async (
  trade: TradeSignal,
  marketData: StockDataPoint[],
  strategyType: StrategyType,
  apiKey: string
): Promise<string> => {
  if (!apiKey) return "Missing API Key.";

  try {
    const model = getModel(apiKey);
    const tradeIndex = marketData.findIndex(d => d.date === trade.date);
    const contextData = marketData.slice(Math.max(0, tradeIndex - 5), tradeIndex + 1);
    const indicatorValues = contextData[contextData.length - 1];

    const prompt = `
      User clicked a specific ${trade.type} trade at $${trade.price.toFixed(2)}.
      Strategy: ${strategyType}.
      Indicators at moment: RSI=${indicatorValues.rsi?.toFixed(2)}, Close=${indicatorValues.close.toFixed(2)}.
      
      Explain this trade simply. Was it a good entry or risky? 
      Keep it conversational and under 30 words.
    `;

    const result = await model.generateContent(prompt);
    return result.response.text();
  } catch (error) {
    return "Analysis failed.";
  }
};