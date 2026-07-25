import "server-only";

import { GoogleGenAI } from "@google/genai";

import { AppError } from "@/lib/errors";

let geminiClient: GoogleGenAI | null = null;

export function getGeminiClient() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new AppError(
      "AI analysis is not configured. Add GEMINI_API_KEY to the server environment.",
      503,
      "AI_NOT_CONFIGURED",
    );
  }

  geminiClient ??= new GoogleGenAI({ apiKey });
  return geminiClient;
}
