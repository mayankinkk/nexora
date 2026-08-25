import { StateGraph, START, END } from '@langchain/langgraph';
import { FlashcardStateAnnotation } from './state.js';
import { makeRetriever } from '../shared/retrieval.js';
import { formatDocs } from '../retrieval_graph/utils.js';
import { HumanMessage } from '@langchain/core/messages';
import { RunnableConfig } from '@langchain/core/runnables';
import { FLASHCARD_SYSTEM_PROMPT } from '../retrieval_graph/prompts.js';
import {
  FlashcardConfigurationAnnotation,
  ensureFlashcardConfiguration,
} from './configuration.js';
import { loadChatModel } from '../shared/utils.js';

async function retrieveForFlashcards(
  state: typeof FlashcardStateAnnotation.State,
  config: RunnableConfig,
): Promise<typeof FlashcardStateAnnotation.Update> {
  const retriever = await makeRetriever(config);
  const query = state.query || 'key terms definitions concepts formulas';
  const response = await retriever.invoke(query);
  return { documents: response };
}

async function generateFlashcards(
  state: typeof FlashcardStateAnnotation.State,
  config: RunnableConfig,
): Promise<typeof FlashcardStateAnnotation.Update> {
  const configuration = ensureFlashcardConfiguration(config);
  const context = formatDocs(state.documents);
  const model = await loadChatModel(configuration.queryModel);
  const promptTemplate = FLASHCARD_SYSTEM_PROMPT;

  const formattedPrompt = await promptTemplate.invoke({
    context: context,
    numCards: configuration.numCards,
  });

  const messageHistory = [
    new HumanMessage(formattedPrompt.toString()),
    ...(state.messages || []),
  ];

  const response = await model.invoke(messageHistory);

  const flashcards =
    typeof response.content === 'string'
      ? response.content
      : JSON.stringify(response.content);

  return {
    flashcards,
    messages: [response],
  };
}

const builder = new StateGraph(
  FlashcardStateAnnotation,
  FlashcardConfigurationAnnotation,
)
  .addNode('retrieveForFlashcards', retrieveForFlashcards)
  .addNode('generateFlashcards', generateFlashcards)
  .addEdge(START, 'retrieveForFlashcards')
  .addEdge('retrieveForFlashcards', 'generateFlashcards')
  .addEdge('generateFlashcards', END);

export const graph = builder
  .compile()
  .withConfig({ runName: 'FlashcardGraph' });
