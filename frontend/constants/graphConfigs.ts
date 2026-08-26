import { AgentConfiguration, IndexConfiguration } from '@/types/graphTypes';

type StreamConfigurables = AgentConfiguration;
type IndexConfigurables = IndexConfiguration;

export const retrievalAssistantStreamConfig: StreamConfigurables = {
  queryModel: 'groq/qwen/qwen3.6-27b',
  retrieverProvider: 'supabase',
  k: 5,
};

export const indexConfig: IndexConfigurables = {
  useSampleDocs: false,
  retrieverProvider: 'supabase',
};

export const summaryConfig = {
  queryModel: 'groq/qwen/qwen3.6-27b',
  language: 'auto',
};

export const quizConfig = {
  queryModel: 'groq/qwen/qwen3.6-27b',
  numQuestions: 5,
  language: 'auto',
};

export const flashcardConfig = {
  queryModel: 'groq/qwen/qwen3.6-27b',
  numCards: 10,
  language: 'auto',
};
