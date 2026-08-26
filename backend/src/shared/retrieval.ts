import { VectorStoreRetriever } from '@langchain/core/vectorstores';
import { SupabaseVectorStore } from '@langchain/community/vectorstores/supabase';
import { createClient } from '@supabase/supabase-js';
import { RunnableConfig } from '@langchain/core/runnables';
import {
  BaseConfigurationAnnotation,
  ensureBaseConfiguration,
} from './configuration.js';

/**
 * Free embeddings using HuggingFace (runs locally, no API key needed).
 * Falls back to OpenAI if OPENAI_API_KEY is set.
 */
async function getEmbeddings() {
  // If OpenAI key is available, use it
  if (process.env.OPENAI_API_KEY) {
    const { OpenAIEmbeddings } = await import('@langchain/openai');
    return new OpenAIEmbeddings({ model: 'text-embedding-3-small' });
  }

  // Otherwise use free HuggingFace embeddings (local)
  // Use free local HuggingFace embeddings (no API key needed)
  const { HuggingFaceTransformersEmbeddings } = await import(
    '@langchain/community/embeddings/hf_transformers'
  );
  return new HuggingFaceTransformersEmbeddings({
    modelName: 'Xenova/all-MiniLM-L6-v2',
  });
}

export async function makeSupabaseRetriever(
  configuration: typeof BaseConfigurationAnnotation.State,
): Promise<VectorStoreRetriever> {
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error(
      'SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY environment variables are not defined',
    );
  }

  const embeddings = await getEmbeddings();

  const supabaseClient = createClient(
    process.env.SUPABASE_URL ?? '',
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? '',
  );

  const filter: Record<string, any> = {
    ...configuration.filterKwargs,
  };

  if (configuration.userId && configuration.userId !== 'public') {
    filter.user_id = configuration.userId;
  }

  const vectorStore = new SupabaseVectorStore(embeddings, {
    client: supabaseClient,
    tableName: 'documents',
    queryName: 'match_documents',
  });

  return vectorStore.asRetriever({
    k: configuration.k,
    filter: filter,
  });
}

export async function makeRetriever(
  config: RunnableConfig,
): Promise<VectorStoreRetriever> {
  const configuration = ensureBaseConfiguration(config);
  switch (configuration.retrieverProvider) {
    case 'supabase':
      return makeSupabaseRetriever(configuration);
    default:
      throw new Error(
        `Unsupported retriever provider: ${configuration.retrieverProvider}`,
      );
  }
}
