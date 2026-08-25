import { AgentConfiguration, IndexConfiguration } from '@/types/graphTypes';

type StreamConfigurables = AgentConfiguration;
type IndexConfigurables = IndexConfiguration;

export const retrievalAssistantStreamConfig: StreamConfigurables = {
  queryModel: 'openai/gpt-4o-mini',
  retrieverProvider: 'supabase',
  k: 5,
};

/**
 * The configuration for the indexing/ingestion process.
 */
export const indexConfig: IndexConfigurables = {
  useSampleDocs: false,
  retrieverProvider: 'supabase',
};

export const summaryConfig = {
  queryModel: 'openai/gpt-4o',
  language: 'auto',
};

export const quizConfig = {
  queryModel: 'openai/gpt-4o',
  numQuestions: 5,
  language: 'auto',
};

export const flashcardConfig = {
  queryModel: 'openai/gpt-4o',
  numCards: 10,
  language: 'auto',
};
