# Nexora — AI-Powered Document Intelligence

> **Upload your lecture notes, PDFs, syllabi, past papers, and lab manuals — then chat, summarize, quiz, create flashcards, compare, and search through them with AI.**

An AI-powered study assistant built with LangChain, LangGraph, Supabase, and Next.js. Targeted at students who want to interact with their study materials intelligently.

## Features

- **Upload multiple documents** — PDF lecture notes, past papers, syllabi, lab manuals
- **Chat with documents** — Ask questions and get answers with exact source/page citations
- **Auto-generate summaries** — Get structured overviews of your study materials
- **Quiz generation** — MCQs, true/false, short answer — with explanations and scoring
- **Flashcards** — Flip-card study aids with categories and page references
- **Document comparison** — Compare concepts across multiple documents
- **Semantic search** — Find relevant content across all uploaded materials
- **Anti-hallucination guardrails** — Responds "I couldn't find this in the documents" instead of making things up
- **Multi-language support** — Responds in the same language you ask in
- **User-scoped storage** — Private document storage per user (optional)
- **Source tracking** — Every answer shows the exact filename and page number

## Architecture

```
┌──────────────────────┐     ┌──────────────────────────────────┐
│  Frontend (Next.js)  │────>│  Backend (LangGraph Server)      │
│  - React UI          │     │  - 6 LangGraph agent graphs:     │
│  - Upload PDFs       │<────│    - ingestion_graph              │
│  - Chat / Tools      │     │    - retrieval_graph              │
└──────────────────────┘     │    - summary_graph                │
                             │    - quiz_graph                   │
                             │    - flashcard_graph              │
                             │    - comparison_graph             │
                             │    - search_graph                 │
                             └──────────────────────────────────┘
                                      │
                                      ▼
                             ┌──────────────────────┐
                             │  Supabase (Vector DB) │
                             │  - documents table    │
                             │  - match_documents fn │
                             └──────────────────────┘
```

### LangGraph Graphs

| Graph | Purpose |
|---|---|
| `ingestion_graph` | Parses PDFs → generates embeddings → stores in Supabase |
| `retrieval_graph` | Routes queries → retrieves context → generates answers |
| `summary_graph` | Retrieves docs → generates structured summaries |
| `quiz_graph` | Retrieves docs → generates quiz questions (MCQ/TF/SA) |
| `flashcard_graph` | Retrieves docs → creates flip-card study aids |
| `comparison_graph` | Retrieves from two perspectives → compares documents |
| `search_graph` | Semantic search → ranks and explains results |

## Prerequisites

1. **Node.js v18+** (recommended: v20)
2. **Yarn** or npm
3. **Supabase project** — with `documents` table and `match_documents` function
4. **OpenAI API Key** — for LLM and embeddings
5. **LangSmith API Key** (optional) — for tracing/debugging

## Installation

```bash
git clone <your-repo-url>
cd nexora
yarn install  # or npm install
```

## Environment Variables

### Backend (`backend/.env`)

```env
OPENAI_API_KEY=sk-...
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJ...
LANGCHAIN_API_KEY=ls_...          # optional
LANGCHAIN_TRACING_V2=true         # optional
LANGCHAIN_PROJECT="nexora"
```

### Frontend (`frontend/.env`)

```env
NEXT_PUBLIC_LANGGRAPH_API_URL=http://localhost:2024
LANGCHAIN_API_KEY=ls_...
LANGGRAPH_INGESTION_ASSISTANT_ID=ingestion_graph
LANGGRAPH_RETRIEVAL_ASSISTANT_ID=retrieval_graph
LANGGRAPH_SUMMARY_ASSISTANT_ID=summary_graph
LANGGRAPH_QUIZ_ASSISTANT_ID=quiz_graph
LANGGRAPH_FLASHCARD_ASSISTANT_ID=flashcard_graph
LANGGRAPH_SEARCH_ASSISTANT_ID=search_graph
LANGGRAPH_COMPARISON_ASSISTANT_ID=comparison_graph
```

## Supabase Setup

Run this SQL in your Supabase SQL editor:

```sql
-- Create documents table
CREATE TABLE IF NOT EXISTS documents (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  content text,
  metadata jsonb,
  embedding vector(1536)
);

-- Create similarity search function
CREATE OR REPLACE FUNCTION match_documents (
  query_embedding vector(1536),
  match_count int DEFAULT 5,
  filter jsonb DEFAULT '{}'
)
RETURNS TABLE (
  id uuid,
  content text,
  metadata jsonb,
  similarity float
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    documents.id,
    documents.content,
    documents.metadata,
    1 - (documents.embedding <=> query_embedding) AS similarity
  FROM documents
  WHERE documents.metadata @> filter
  ORDER BY documents.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

-- Create index for fast retrieval
CREATE INDEX IF NOT EXISTS documents_embedding_idx
  ON documents USING ivfflat (embedding vector_cosine_ops)
  WITH (lists = 100);
```

## Local Development

### Start the Backend

```bash
cd backend
yarn langgraph:dev
```

This starts LangGraph on port 2024 with the LangGraph Studio UI.

### Start the Frontend

```bash
cd frontend
yarn dev
```

Opens at [http://localhost:3000](http://localhost:3000).

## Usage

1. **Upload documents** — Click the paperclip icon, select PDFs (lecture notes, past papers, syllabi, lab manuals)
2. **Chat** — Ask questions like "What are the main topics?" or "Explain the formula on page 5"
3. **Summarize** — Switch to Summarize mode and click Generate
4. **Quiz** — Switch to Quiz mode, generate questions, answer them, and see your score
5. **Flashcards** — Generate flip-card study aids from your documents
6. **Compare** — Compare concepts across documents
7. **Search** — Semantic search through all your materials

### Anti-Hallucination

The system will respond with "I couldn't find this information in your uploaded documents" when the answer isn't in your materials, instead of fabricating information.

### Multi-Language

Ask questions in any language and the assistant responds in the same language.

## Project Structure

```
├── backend/
│   └── src/
│       ├── ingestion_graph/     # PDF ingestion pipeline
│       ├── retrieval_graph/     # QA + source citation
│       ├── summary_graph/       # Auto-summary generation
│       ├── quiz_graph/          # Quiz question generation
│       ├── flashcard_graph/     # Flashcard creation
│       ├── comparison_graph/    # Document comparison
│       ├── search_graph/        # Semantic search
│       └── shared/              # Config, retrieval, utils
├── frontend/
│   ├── app/
│   │   ├── api/                 # API routes for each tool
│   │   ├── page.tsx             # Main Nexora UI
│   │   └── layout.tsx
│   ├── components/              # UI components
│   │   ├── chat-message.tsx     # Chat with source citations
│   │   ├── flashcard-viewer.tsx # Flip-card UI
│   │   ├── quiz-viewer.tsx      # Interactive quiz UI
│   │   ├── summary-viewer.tsx   # Structured summary display
│   │   ├── search-results.tsx   # Search results display
│   │   └── comparison-viewer.tsx
│   ├── lib/                     # LangGraph client wrappers
│   └── types/                   # TypeScript types
└── scripts/
```

## Customization

### Change LLM Provider

In `backend/src/shared/configuration.ts`, the `queryModel` field supports any provider:
- `openai/gpt-4o`
- `anthropic/claude-3-5-sonnet`
- `google-genai/gemini-pro`
- `ollama/llama3`

### Adjust Quiz/Flashcard Count

Pass `numQuestions` or `numCards` in the API request body.

### Enable User-Scoped Documents

Set `ENABLE_USER_DOCS=true` in `backend/.env`. Documents are then filtered by `user_id` in metadata.

## License

MIT

## Credits

Built by **Mayank Sharma**

Core architecture powered by [LangChain](https://github.com/langchain-ai/langchainjs) and [LangGraph](https://github.com/langchain-ai/langgraph). PDF ingestion pipeline built with [Supabase Vector Store](https://supabase.com/docs/guides/ai).
