
import { GoogleGenAI } from "@google/genai";

const apiKey = process.env.GEMINI_API_KEY;

if (!apiKey) {
  throw new Error("GEMINI_API_KEY is missing from the server environment.");
}

const ai = new GoogleGenAI({ apiKey });

// Convert text into a numerical vector for semantic search.
export async function generateEmbedding(text) {
  if (!text || !text.trim()) {
    throw new Error("Text is required to generate an embedding.");
  }

  const response = await ai.models.embedContent({
    model: "gemini-embedding-001",
    contents: text.trim(),
  });

  const embedding = response.embeddings?.[0]?.values;

  if (!embedding || embedding.length === 0) {
    throw new Error("The embedding model returned no vector.");
  }

  return embedding;
}
