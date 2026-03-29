import { db } from './db';
import { AIModel } from '../types';
import { parseAIResponse } from './responseParser';

export interface AIResponse {
  message: string;
  files?: Record<string, string>;
}

/**
 * Reads an SSE stream from the backend proxy and calls onChunk with accumulated text.
 * Returns the final complete text when the stream ends.
 */
async function readSSEStream(
  response: Response,
  onChunk?: (accumulatedText: string) => void
): Promise<string> {
  const reader = response.body?.getReader();
  if (!reader) throw new Error('No se pudo leer la respuesta del servidor.');

  const decoder = new TextDecoder();
  let finalText = '';
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });

    // Process complete SSE lines
    const lines = buffer.split('\n');
    buffer = lines.pop() || ''; // Keep incomplete line in buffer

    for (const line of lines) {
      if (!line.startsWith('data: ')) continue;
      const jsonStr = line.slice(6).trim();
      if (!jsonStr) continue;

      try {
        const event = JSON.parse(jsonStr);

        if (event.type === 'chunk') {
          finalText = event.text;
          onChunk?.(event.text);
        } else if (event.type === 'done') {
          finalText = event.text;
        } else if (event.type === 'error') {
          throw new Error(event.error);
        }
      } catch (e: any) {
        if (e.message && !e.message.includes('JSON')) throw e;
        // Ignore JSON parse errors from partial data
      }
    }
  }

  return finalText;
}

export const aiService = {
  /**
   * Non-streaming method (calls the streaming endpoint but ignores chunks).
   */
  async sendPrompt(
    projectId: string,
    prompt: string,
    modelId: AIModel = 'gemini-2.5-flash',
    history: { role: 'ai' | 'user'; content: string }[] = [],
    currentFiles: Record<string, string> = {}
  ): Promise<AIResponse> {
    return this.sendPromptStream(projectId, prompt, modelId, history, currentFiles, () => {});
  },

  /**
   * Streaming method — calls the backend proxy and streams the response via SSE.
   */
  async sendPromptStream(
    projectId: string,
    prompt: string,
    modelId: AIModel = 'gemini-2.5-flash',
    history: { role: 'ai' | 'user'; content: string }[] = [],
    currentFiles: Record<string, string> = {},
    onChunk: (accumulatedText: string) => void
  ): Promise<AIResponse> {
    try {
      const user = db.getUser();
      if (!user) throw new Error('Debes iniciar sesión para usar la IA');

      const response = await fetch('/api/ai/stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt,
          modelId,
          history,
          currentFiles,
        }),
      });

      if (!response.ok) {
        const err = await response.json().catch(() => ({ error: 'Error del servidor' }));
        throw new Error(err.error || `Error HTTP ${response.status}`);
      }

      const fullText = await readSSEStream(response, onChunk);

      // Parse the complete response
      const parsed = parseAIResponse(fullText, projectId);
      return {
        message: parsed.chatMessage,
        files: Object.keys(parsed.files).length > 0 ? parsed.files : undefined,
      };
    } catch (error: any) {
      console.error('AI Error:', error);
      throw new Error(error.message || 'Error al comunicarse con la IA.');
    }
  },
};
