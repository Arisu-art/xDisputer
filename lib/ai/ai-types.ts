export const AI_MODES = [
  'direct_answer',
  'rag_answer',
  'tool_action',
  'planner',
  'background_job',
  'admin_review',
  'source_review',
  'template_intelligence'
] as const;

export type AiMode = typeof AI_MODES[number];

export type JsonPrimitive = string | number | boolean | null;
export type JsonValue = JsonPrimitive | JsonObject | JsonValue[];
export type JsonObject = { [key: string]: JsonValue };

export type AiRequestInput = {
  mode: AiMode;
  message: string;
  documentIds: string[];
  metadata: JsonObject;
  stream: boolean;
};

export type AiCitation = {
  documentId: string;
  chunkId: string;
  score: number;
};

export type AiAction = {
  type: string;
  label: string;
  status: 'suggested' | 'executed' | 'blocked';
};

export type AiUsage = {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
};

export type AiResponseOutput = {
  answer: string;
  mode: AiMode;
  citations: AiCitation[];
  actions: AiAction[];
  requestId: string | null;
  modelName: string | null;
  usage: AiUsage;
  latencyMs: number;
};

export type AiRequestRecord = {
  id: string | null;
  errorMessage: string | null;
};

export type AiChunkMatch = {
  id: string;
  documentId: string;
  content: string;
  metadata: JsonObject;
  score: number;
};

export type AiToolName = 'searchDocuments' | 'createBackgroundJob';

export type AiToolActionResult = {
  action: AiAction;
  output: JsonObject;
};