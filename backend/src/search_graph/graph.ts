import { StateGraph, START, END } from '@langchain/langgraph';
import { SearchStateAnnotation } from './state.js';
import { makeRetriever } from '../shared/retrieval.js';
import { formatDocs } from '../retrieval_graph/utils.js';
import { HumanMessage } from '@langchain/core/messages';
import { RunnableConfig } from '@langchain/core/runnables';
import { SEARCH_SYSTEM_PROMPT } from '../retrieval_graph/prompts.js';
import {
  SearchConfigurationAnnotation,
  ensureSearchConfiguration,
} from './configuration.js';
import { loadChatModel } from '../shared/utils.js';

async function searchDocuments(
  state: typeof SearchStateAnnotation.State,
  config: RunnableConfig,
): Promise<typeof SearchStateAnnotation.Update> {
  const retriever = await makeRetriever(config);
  const response = await retriever.invoke(state.query);
  return { documents: response };
}

async function rankAndExplain(
  state: typeof SearchStateAnnotation.State,
  config: RunnableConfig,
): Promise<typeof SearchStateAnnotation.Update> {
  const configuration = ensureSearchConfiguration(config);
  const context = formatDocs(state.documents);
  const model = await loadChatModel(configuration.queryModel);
  const promptTemplate = SEARCH_SYSTEM_PROMPT;

  const formattedPrompt = await promptTemplate.invoke({
    query: state.query,
    context: context,
  });

  const messageHistory = [
    new HumanMessage(formattedPrompt.toString()),
    ...(state.messages || []),
  ];

  const response = await model.invoke(messageHistory);

  const searchResults =
    typeof response.content === 'string'
      ? response.content
      : JSON.stringify(response.content);

  return {
    searchResults,
    messages: [response],
  };
}

const builder = new StateGraph(
  SearchStateAnnotation,
  SearchConfigurationAnnotation,
)
  .addNode('searchDocuments', searchDocuments)
  .addNode('rankAndExplain', rankAndExplain)
  .addEdge(START, 'searchDocuments')
  .addEdge('searchDocuments', 'rankAndExplain')
  .addEdge('rankAndExplain', END);

export const graph = builder
  .compile()
  .withConfig({ runName: 'SearchGraph' });
