import { StateGraph, START, END } from '@langchain/langgraph';
import { ComparisonStateAnnotation } from './state.js';
import { makeRetriever } from '../shared/retrieval.js';
import { formatDocs } from '../retrieval_graph/utils.js';
import { HumanMessage } from '@langchain/core/messages';
import { RunnableConfig } from '@langchain/core/runnables';
import { COMPARISON_SYSTEM_PROMPT } from '../retrieval_graph/prompts.js';
import {
  ComparisonConfigurationAnnotation,
  ensureComparisonConfiguration,
} from './configuration.js';
import { loadChatModel } from '../shared/utils.js';

async function retrieveDocumentsA(
  state: typeof ComparisonStateAnnotation.State,
  config: RunnableConfig,
): Promise<typeof ComparisonStateAnnotation.Update> {
  const retriever = await makeRetriever(config);
  const response = await retriever.invoke(state.query);
  return { documentsA: response };
}

async function retrieveDocumentsB(
  state: typeof ComparisonStateAnnotation.State,
  config: RunnableConfig,
): Promise<typeof ComparisonStateAnnotation.Update> {
  const retriever = await makeRetriever(config);
  const response = await retriever.invoke(state.query);
  return { documentsB: response };
}

async function generateComparison(
  state: typeof ComparisonStateAnnotation.State,
  config: RunnableConfig,
): Promise<typeof ComparisonStateAnnotation.Update> {
  const configuration = ensureComparisonConfiguration(config);
  const contextA = formatDocs(state.documentsA);
  const contextB = formatDocs(state.documentsB);
  const model = await loadChatModel(configuration.queryModel);
  const promptTemplate = COMPARISON_SYSTEM_PROMPT;

  const formattedPrompt = await promptTemplate.invoke({
    contextA: contextA,
    contextB: contextB,
  });

  const messageHistory = [
    new HumanMessage(formattedPrompt.toString()),
    new HumanMessage(state.query),
    ...(state.messages || []),
  ];

  const response = await model.invoke(messageHistory);

  const comparison =
    typeof response.content === 'string'
      ? response.content
      : JSON.stringify(response.content);

  return {
    comparison,
    messages: [response],
  };
}

const builder = new StateGraph(
  ComparisonStateAnnotation,
  ComparisonConfigurationAnnotation,
)
  .addNode('retrieveDocumentsA', retrieveDocumentsA)
  .addNode('retrieveDocumentsB', retrieveDocumentsB)
  .addNode('generateComparison', generateComparison)
  .addEdge(START, 'retrieveDocumentsA')
  .addEdge(START, 'retrieveDocumentsB')
  .addEdge('retrieveDocumentsA', 'generateComparison')
  .addEdge('retrieveDocumentsB', 'generateComparison')
  .addEdge('generateComparison', END);

export const graph = builder
  .compile()
  .withConfig({ runName: 'ComparisonGraph' });
