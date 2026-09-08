export type AiMode = 'explain' | 'deepen';

export type CefrCode = 'A1' | 'A2' | 'B1' | 'B2' | 'C1' | 'C2';

export interface AiExplainResponse {
  summary: string;
  examples: string[];
  examplesEs: string[];
  cached: boolean;
}

export interface AiDeepenResponse {
  context: string;
  collocations: string[];
  falseFriends: string[];
  examples: string[];
  examplesEs: string[];
  cached: boolean;
}

export interface AiHistoryEntry {
  id: string;
  cardId: string;
  lessonId: string;
  mode: AiMode;
  level: string;
  payload: AiExplainResponse | AiDeepenResponse;
  tokensUsed: number;
  cached: boolean;
  createdAt: string;
}

export type AiErrorCode =
  | 'AI_PROVIDER_FAILED'
  | 'RATE_LIMITED'
  | 'CARD_NOT_FOUND'
  | 'CARD_NOT_IN_LESSON'
  | 'LESSON_NOT_FOUND'
  | 'AI_DISABLED';

export const EXPLAIN_MAX_TOKENS = 2500;
export const DEEPEN_MAX_TOKENS = 3500;

export function isAiMode(value: unknown): value is AiMode {
  return value === 'explain' || value === 'deepen';
}