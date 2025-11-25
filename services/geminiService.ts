import { GoogleGenerativeAI } from "@google/generative-ai";
import { StrategyType, StrategyParams, DEFAULT_PARAMS } from "../types";

export interface AIStrategyResponse {
  strategy: StrategyType;
  params: StrategyParams;
  explanation: string;
  error?: string;
}

export const parseStrategyFromChat = async (
  userMessage: string,
  apiKey: string // <--- 新增参数：从 UI 传入 API Key
): Promise<AIStrategyResponse> => {
  
  if (!apiKey) {
    return {
      strategy: StrategyType.SMA_CROSSOVER,
      params: DEFAULT_PARAMS,
      explanation: "",
      error: "Please enter your Gemini API Key in the settings above."
    };
  }

  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

    // 定义强类型的 Prompt，强迫 AI 返回 JSON
    const prompt = `
      You are a quantitative trading assistant.
      Analyze the user's request and map it to one of these Strategy Types:
      [${Object.values(StrategyType).join(', ')}]

      Extract parameters. If not mentioned, use these defaults:
      ${JSON.stringify(DEFAULT_PARAMS)}

      Your response must be a valid JSON object with NO markdown formatting. Structure:
      {
        "strategy": "StrategyType Enum Value",
        "params": { ...extracted parameters... },
        "explanation": "A very short, 1-sentence confirmation of what you configured."
      }

      User Request: "${userMessage}"
    `;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    // 清理可能存在的 Markdown 标记 (```json ... ```)
    const cleanedText = text.replace(/```json|```/g, '').trim();
    
    const parsed = JSON.parse(cleanedText);

    // 合并默认参数以防 AI 漏掉某些字段
    return {
      strategy: parsed.strategy || StrategyType.SMA_CROSSOVER,
      params: { ...DEFAULT_PARAMS, ...parsed.params },
      explanation: parsed.explanation || "Strategy configured.",
    };

  } catch (error: any) {
    console.error("Gemini API Error:", error);
    return {
      strategy: StrategyType.SMA_CROSSOVER,
      params: DEFAULT_PARAMS,
      explanation: "",
      error: "AI Request Failed: " + (error.message || "Unknown error")
    };
  }
};