import { Document } from '@langchain/core/documents';

/**
 * Represents the state of the retrieval graph / agent.
 */
export type documentType =
  | PDFDocument[]
  | { [key: string]: any }[]
  | string[]
  | string
  | 'delete';
export interface AgentState {
  query?: string;
  route?: string;
  messages: Array<{
    content: string;
    additional_kwargs: Record<string, any>;
    response_metadata: Record<string, any>;
    id: string;
    type: 'human' | 'assistant';
  }>;
  documents: documentType;
}

export interface RetrieveDocumentsNodeUpdates {
  retrieveDocuments: {
    documents: documentType;
  };
}

export type PDFDocument = Document & {
  metadata?: {
    loc?: {
      lines?: {
        from: number;
        to: number;
      };
      pageNumber?: number;
    };
    pdf?: {
      info?: {
        Title?: string;
        Creator?: string;
        Producer?: string;
        CreationDate?: string;
        IsXFAPresent?: boolean;
        PDFFormatVersion?: string;
        IsAcroFormPresent?: boolean;
      };
      version?: string;
      metadata?: any;
      totalPages?: number;
    };
    uuid?: string;
    source?: string;
    filename?: string;
    user_id?: string;
  };
};

export interface BaseConfiguration {
  retrieverProvider?: 'supabase';
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  filterKwargs?: Record<string, any>;
  k?: number;
  userId?: string;
}

export interface AgentConfiguration extends BaseConfiguration {
  queryModel?: string;
}

export interface IndexConfiguration extends BaseConfiguration {
  docsFile?: string;
  useSampleDocs?: boolean;
}

export interface QuizQuestion {
  question: string;
  type: 'mcq' | 'true_false' | 'short_answer';
  options?: string[];
  correctAnswer: string;
  explanation: string;
  sourcePage: number;
}

export interface Flashcard {
  front: string;
  back: string;
  category: 'concept' | 'definition' | 'formula' | 'fact';
  sourcePage: number;
}

export type StudyTool = 'chat' | 'summary' | 'quiz' | 'flashcards' | 'compare' | 'search';
