export type Role = "system" | "user" | "assistant";

export interface ChatMessage {
  role: Role;
  content: string;
}

export interface ChatOptions {
  messages: ChatMessage[];
  systemPrompt: string;
  temperature?: number;
  maxTokens?: number;
  signal?: AbortSignal;
}

export interface TokenChunk {
  delta: string;
  done: boolean;
}

export interface ModerationResult {
  flagged: boolean;
  categories: string[];
}

export interface LLMProvider {
  chat(opts: ChatOptions): AsyncIterable<TokenChunk>;
  moderate(text: string): Promise<ModerationResult>;
  ready(): Promise<boolean>;
}
