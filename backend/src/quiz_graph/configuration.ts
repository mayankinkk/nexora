import { Annotation } from '@langchain/langgraph';
import { RunnableConfig } from '@langchain/core/runnables';
import {
  BaseConfigurationAnnotation,
  ensureBaseConfiguration,
} from '../shared/configuration.js';

export const QuizConfigurationAnnotation = Annotation.Root({
  ...BaseConfigurationAnnotation.spec,
  queryModel: Annotation<string>,
  numQuestions: Annotation<number>,
  language: Annotation<string>,
});

export function ensureQuizConfiguration(
  config: RunnableConfig,
): typeof QuizConfigurationAnnotation.State {
  const configurable = (config?.configurable || {}) as Partial<
    typeof QuizConfigurationAnnotation.State
  >;
  const baseConfig = ensureBaseConfiguration(config);
  return {
    ...baseConfig,
    queryModel: configurable.queryModel || 'openai/gpt-4o',
    numQuestions: configurable.numQuestions || 5,
    language: configurable.language || 'auto',
  };
}
