import { Annotation } from '@langchain/langgraph';
import { RunnableConfig } from '@langchain/core/runnables';
import {
  BaseConfigurationAnnotation,
  ensureBaseConfiguration,
} from '../shared/configuration.js';

export const FlashcardConfigurationAnnotation = Annotation.Root({
  ...BaseConfigurationAnnotation.spec,
  queryModel: Annotation<string>,
  numCards: Annotation<number>,
  language: Annotation<string>,
});

export function ensureFlashcardConfiguration(
  config: RunnableConfig,
): typeof FlashcardConfigurationAnnotation.State {
  const configurable = (config?.configurable || {}) as Partial<
    typeof FlashcardConfigurationAnnotation.State
  >;
  const baseConfig = ensureBaseConfiguration(config);
  return {
    ...baseConfig,
    queryModel: configurable.queryModel || 'openai/gpt-4o',
    numCards: configurable.numCards || 10,
    language: configurable.language || 'auto',
  };
}
