'use server';

import { Conversation } from '@/app/types/ai';
import { ENVIRONMENT } from '@/config/environment';
import { GoogleGenAI, ThinkingLevel } from '@google/genai';

const ai = new GoogleGenAI({
  apiKey: ENVIRONMENT.googleGenAIKey,
});

export async function handleChat(
  conversation: Conversation[],
  isThinking: boolean,
) {
  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: [...conversation],
    config: {
      thinkingConfig: {
        includeThoughts: isThinking,
      },
    },
  });

  const result = {
    thought: '',
    answer: '',
  };

  if (isThinking) {
    const parts = response.candidates?.[0]?.content?.parts;
    if (!parts) {
      return;
    }

    for (const part of parts) {
      if (!part.text) {
        continue;
      } else if (part.thought) {
        result.thought += part.text;
      } else {
        result.answer += part.text;
      }
    }
  } else {
    result.answer = `${response.text}`;
  }
  return result;
}

export async function* handleChatStreaming(
  conversation: Conversation[],
  isThinking: boolean,
) {
  const response = await ai.models.generateContentStream({
    model: 'gemini-3-flash-preview',
    contents: [...conversation],
    config: {
      thinkingConfig: {
        includeThoughts: isThinking,
        // thinkingLevel: isThinking ? ThinkingLevel.HIGH : ThinkingLevel.MINIMAL,
        // thinkingBudget: isThinking ? -1 : 0,
      },
      systemInstruction: `
      Kamu adalah seorang financial advisor yang akan menjawab pertanyaan user
      `,
      // sampling params
      temperature: 0.2,
      topK: 5,
      topP: 0.1,
      // output control
      maxOutputTokens: 1024,
      stopSequences: ['\n\n\n', '###', 'User:', 'Pengguna:'],
      // repetition penalties
      // presencePenalty: 1.5,
      // frequencyPenalty: 1.5,
    },
  });

  if (isThinking) {
    for await (const chunk of response) {
      const parts = chunk.candidates?.[0]?.content?.parts;
      if (parts) {
        for (const part of parts) {
          if (!part.text) {
            continue;
          } else if (part.thought) {
            yield `[thought]${part.text}`;
          } else {
            yield part.text;
          }
        }
      }
    }
  } else {
    for await (const chunk of response) {
      if (chunk.text) {
        yield chunk.text;
      }
    }
  }
}
