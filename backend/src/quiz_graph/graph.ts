import { StateGraph, START, END } from '@langchain/langgraph';
import { QuizStateAnnotation } from './state.js';
import { makeRetriever } from '../shared/retrieval.js';
import { formatDocs } from '../retrieval_graph/utils.js';
import { HumanMessage } from '@langchain/core/messages';
import { RunnableConfig } from '@langchain/core/runnables';
import { QUIZ_SYSTEM_PROMPT } from '../retrieval_graph/prompts.js';
import {
  QuizConfigurationAnnotation,
  ensureQuizConfiguration,
} from './configuration.js';
import { loadChatModel } from '../shared/utils.js';

async function retrieveForQuiz(
  state: typeof QuizStateAnnotation.State,
  config: RunnableConfig,
): Promise<typeof QuizStateAnnotation.Update> {
  const retriever = await makeRetriever(config);
  const query = state.query || 'key concepts definitions important facts';
  const response = await retriever.invoke(query);
  return { documents: response };
}

async function generateQuiz(
  state: typeof QuizStateAnnotation.State,
  config: RunnableConfig,
): Promise<typeof QuizStateAnnotation.Update> {
  const configuration = ensureQuizConfiguration(config);
  const context = formatDocs(state.documents);
  const model = await loadChatModel(configuration.queryModel);
  const promptTemplate = QUIZ_SYSTEM_PROMPT;

  const formattedPrompt = await promptTemplate.invoke({
    context: context,
    numQuestions: configuration.numQuestions,
  });

  const messageHistory = [
    new HumanMessage(formattedPrompt.toString()),
    ...(state.messages || []),
  ];

  const response = await model.invoke(messageHistory);

  const quiz =
    typeof response.content === 'string'
      ? response.content
      : JSON.stringify(response.content);

  return {
    quiz,
    messages: [response],
  };
}

const builder = new StateGraph(
  QuizStateAnnotation,
  QuizConfigurationAnnotation,
)
  .addNode('retrieveForQuiz', retrieveForQuiz)
  .addNode('generateQuiz', generateQuiz)
  .addEdge(START, 'retrieveForQuiz')
  .addEdge('retrieveForQuiz', 'generateQuiz')
  .addEdge('generateQuiz', END);

export const graph = builder.compile().withConfig({ runName: 'QuizGraph' });
