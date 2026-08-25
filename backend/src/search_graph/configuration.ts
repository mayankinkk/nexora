import { Annotation } from '@langchain/langgraph';
import { RunnableConfig } from '@langchain/core/runnables';
import {
  BaseConfigurationAnnotation,
  ensureBaseConfiguration,
} from '../shared/configuration.js';

export const SearchConfigurationAnnotation = Annotation.Root({
  ...BaseConfigurationAnnotation.spec,
  queryModel: Annotation<string>,
});

export function ensureSearchConfiguration(
  config: RunnableConfig,
): typeof SearchConfigurationAnnotation.State {
  const configurable = (config?.configurable || {}) as Partial<
    typeof SearchConfigurationAnnotation.State
  >;
  const baseConfig = ensureBaseConfiguration(config);
  return {
    ...baseConfig,
    queryModel: configurable.queryModel || 'openai/gpt-4o',
  };
}
