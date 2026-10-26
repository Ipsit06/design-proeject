import { apiRequest } from '../../services/apiClient.js';
import type { LlmAssistResponse, RecognitionMode } from '@signbridge/shared';

export interface RecognizedToken {
  id: string;
  label: string;
  text: string;
  confidence: number;
  timestamp: number;
  mode: RecognitionMode;
}

export interface SequenceManagerState {
  tokens: RecognizedToken[];
  rawText: string;
  polishedSentence: string;
  isAiAssisted: boolean;
  aiExplanation?: string;
}

export class SequenceManager {
  private tokens: RecognizedToken[] = [];
  private lastAppendedLabel: string | null = null;
  private lastAppendedTime: number = 0;
  private minIntervalBetweenSameTokenMs: number = 1400; // prevents duplicate repeat when holding same sign

  addToken(token: Omit<RecognizedToken, 'id'>): boolean {
    const now = token.timestamp || Date.now();

    // Prevent immediate repeated token unless sufficient pause elapsed
    if (
      this.lastAppendedLabel === token.label &&
      now - this.lastAppendedTime < this.minIntervalBetweenSameTokenMs
    ) {
      return false;
    }

    const fullToken: RecognizedToken = {
      ...token,
      id: Math.random().toString(36).substring(2, 9),
    };

    this.tokens.push(fullToken);
    this.lastAppendedLabel = token.label;
    this.lastAppendedTime = now;
    return true;
  }

  getTokens(): RecognizedToken[] {
    return [...this.tokens];
  }

  getRawSentence(): string {
    return this.tokens.map((t) => t.text).join(' ');
  }

  removeLastToken(): RecognizedToken | null {
    if (this.tokens.length === 0) return null;
    const removed = this.tokens.pop() || null;
    const latest = this.tokens[this.tokens.length - 1];
    this.lastAppendedLabel = latest ? latest.label : null;
    return removed;
  }

  clear() {
    this.tokens = [];
    this.lastAppendedLabel = null;
    this.lastAppendedTime = 0;
  }

  async polishSentence(
    mode: RecognitionMode = 'sign_language',
    vocabularyId = 'asl_lexicon'
  ): Promise<LlmAssistResponse> {
    const rawTokens = this.tokens.map((t) => t.text);
    if (rawTokens.length === 0) {
      return {
        sentence: '',
        script: '',
        rawTokens: [],
        assisted: false,
        provider: 'local_heuristic',
      };
    }

    try {
      const response = await apiRequest<LlmAssistResponse>('/llm/assist', {
        method: 'POST',
        body: JSON.stringify({
          tokens: rawTokens,
          vocabularyId,
          mode,
        }),
      });
      return response;
    } catch {
      // Local client fallback if backend is unreachable
      const fallback = rawTokens.join(' ');
      return {
        sentence: fallback.charAt(0).toUpperCase() + fallback.slice(1) + '.',
        rawTokens,
        assisted: false,
        provider: 'local_heuristic',
        explanation: 'Local offline fallback formatting.',
        script: fallback.charAt(0).toUpperCase() + fallback.slice(1) + '.',
      };
    }
  }
}
