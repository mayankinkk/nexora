import { AgentConfiguration, IndexConfiguration } from '@/types/graphTypes';

type StreamConfigurables = AgentConfiguration;
type IndexConfigurables = IndexConfiguration;

export const retrievalAssistantStreamConfig: StreamConfigurables = {
  queryModel: 'groq/llama-3.3-70b-versatile',
  retrieverProvider: 'supabase',
  k: 5,
};

export const indexConfig: IndexConfigurables = {
  useSampleDocs: false,
  retrieverProvider: 'supabase',
};

export const summaryConfig = {
  queryModel: 'groq/llama-3.3-70b-versatile',
  language: 'auto',
};

export const quizConfig = {
  queryModel: 'groq/llama-3.3-70b-versatile',
  numQuestions: 5,
  language: 'auto',
};

export const flashcardConfig = {
  queryModel: 'groq/llama-3.3-70b-versatile',
  numCards: 10,
  language: 'auto',
};
