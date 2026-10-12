import "dotenv/config";
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";

export function createLLM(temperature = 0) {
  return new ChatGoogleGenerativeAI({
    apiKey: process.env.GEMINI_API_KEY,
    model: process.env.GEMINI_MODEL || "gemini-flash-lite-latest",
    temperature,
    maxRetries: 5, // retries automatically on 429 / 503 overloads
  });
}

// Gemini sometimes returns content as an array of parts instead of a string
export function textOf(content) {
  if (typeof content === "string") return content;
  if (Array.isArray(content)) {
    return content
      .map((part) => (typeof part === "string" ? part : part?.text ?? ""))
      .join("");
  }
  return String(content ?? "");
}
