import { StateGraph, START, END } from '@langchain/langgraph';
import { SummaryStateAnnotation } from './state.js';
import { makeRetriever } from '../shared/retrieval.js';
import { formatDocs } from '../retrieval_graph/utils.js';
import { HumanMessage } from '@langchain/core/messages';
import { RunnableConfig } from '@langchain/core/runnables';
import { SUMMARY_SYSTEM_PROMPT } from '../retrieval_graph/prompts.js';
import {
  SummaryConfigurationAnnotation,
  ensureSummaryConfiguration,
} from './configuration.js';
import { loadChatModel } from '../shared/utils.js';

async function retrieveForSummary(
  state: typeof SummaryStateAnnotation.State,
  config: RunnableConfig,
): Promise<typeof SummaryStateAnnotation.Update> {
  const retriever = await makeRetriever(config);
  const query = state.query || 'main topics key concepts summary';
  const response = await retriever.invoke(query);
  return { documents: response };
}

async function generateSummary(
  state: typeof SummaryStateAnnotation.State,
  config: RunnableConfig,
): Promise<typeof SummaryStateAnnotation.Update> {
  const configuration = ensureSummaryConfiguration(config);
  const context = formatDocs(state.documents);
  const model = await loadChatModel(configuration.queryModel);
  const promptTemplate = SUMMARY_SYSTEM_PROMPT;

  const formattedPrompt = await promptTemplate.invoke({
    context: context,
  });

  const messageHistory = [
    new HumanMessage(formattedPrompt.toString()),
    ...(state.messages || []),
  ];

  const response = await model.invoke(messageHistory);

  const summary =
    typeof response.content === 'string'
      ? response.content
      : JSON.stringify(response.content);

  return {
    summary,
    messages: [response],
  };
}

const builder = new StateGraph(
  SummaryStateAnnotation,
  SummaryConfigurationAnnotation,
)
  .addNode('retrieveForSummary', retrieveForSummary)
  .addNode('generateSummary', generateSummary)
  .addEdge(START, 'retrieveForSummary')
  .addEdge('retrieveForSummary', 'generateSummary')
  .addEdge('generateSummary', END);

export const graph = builder
  .compile()
  .withConfig({ runName: 'SummaryGraph' });
