import { Annotation } from '@langchain/langgraph';
import { RunnableConfig } from '@langchain/core/runnables';
import {
  BaseConfigurationAnnotation,
  ensureBaseConfiguration,
} from '../shared/configuration.js';

export const SummaryConfigurationAnnotation = Annotation.Root({
  ...BaseConfigurationAnnotation.spec,
  queryModel: Annotation<string>,
  language: Annotation<string>,
});

export function ensureSummaryConfiguration(
  config: RunnableConfig,
): typeof SummaryConfigurationAnnotation.State {
  const configurable = (config?.configurable || {}) as Partial<
    typeof SummaryConfigurationAnnotation.State
  >;
  const baseConfig = ensureBaseConfiguration(config);
  return {
    ...baseConfig,
    queryModel: configurable.queryModel || 'openai/gpt-4o',
    language: configurable.language || 'auto',
  };
}
