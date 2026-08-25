import { Annotation, MessagesAnnotation } from '@langchain/langgraph';
import { Document } from '@langchain/core/documents';
import { reduceDocs } from '../shared/state.js';

export const QuizStateAnnotation = Annotation.Root({
  query: Annotation<string>,
  ...MessagesAnnotation.spec,
  documents: Annotation<
    Document[],
    Document[] | { [key: string]: any }[] | string[] | string | 'delete'
  >({
    default: () => [],
    // @ts-ignore
    reducer: reduceDocs,
  }),
  quiz: Annotation<string>,
});
