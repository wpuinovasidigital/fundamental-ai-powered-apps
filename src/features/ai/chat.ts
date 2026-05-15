'use server';

import { ENVIRONMENT } from '@/config/environment';
import { GoogleGenAI, ThinkingLevel } from '@google/genai';

const ai = new GoogleGenAI({
  apiKey: ENVIRONMENT.googleGenAIKey,
});

export async function handleChat(message: string) {
  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: message,
    config: {},
  });

  return response.text;
}

export async function handleChatWithThinking(message: string) {
  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: message,
    config: {
      thinkingConfig: {
        includeThoughts: true,
      },
    },
  });

  const parts = response.candidates?.[0]?.content?.parts;
  if (!parts) {
    return;
  }

  const result = {
    thought: '',
    answer: '',
  };

  for (const part of parts) {
    if (!part.text) {
      continue;
    } else if (part.thought) {
      result.thought += part.text;
    } else {
      result.answer += part.text;
    }
  }

  return result;
}
