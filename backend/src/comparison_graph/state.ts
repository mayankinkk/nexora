import { Annotation, MessagesAnnotation } from '@langchain/langgraph';
import { Document } from '@langchain/core/documents';
import { reduceDocs } from '../shared/state.js';

export const ComparisonStateAnnotation = Annotation.Root({
  query: Annotation<string>,
  ...MessagesAnnotation.spec,
  documentsA: Annotation<
    Document[],
    Document[] | { [key: string]: any }[] | string[] | string | 'delete'
  >({
    default: () => [],
    // @ts-ignore
    reducer: reduceDocs,
  }),
  documentsB: Annotation<
    Document[],
    Document[] | { [key: string]: any }[] | string[] | string | 'delete'
  >({
    default: () => [],
    // @ts-ignore
    reducer: reduceDocs,
  }),
  comparison: Annotation<string>,
});
