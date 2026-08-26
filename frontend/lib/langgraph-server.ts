import { Client } from '@langchain/langgraph-sdk';
import { LangGraphBase } from './langgraph-base';

let clientInstance: LangGraphBase | null = null;

function getServerClient(): LangGraphBase {
  if (clientInstance) return clientInstance;

  const apiUrl = process.env.NEXT_PUBLIC_LANGGRAPH_API_URL;
  const apiKey = process.env.LANGCHAIN_API_KEY;

  if (!apiUrl) {
    throw new Error('NEXT_PUBLIC_LANGGRAPH_API_URL is not set');
  }

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  if (apiKey) {
    headers['X-Api-Key'] = apiKey;
  }

  const client = new Client({ apiUrl, defaultHeaders: headers });
  clientInstance = new LangGraphBase(client);
  return clientInstance;
}

export function createServerClient(): LangGraphBase {
  return getServerClient();
}

export const langGraphServerClient = new Proxy({} as LangGraphBase, {
  get(_, prop) {
    const client = getServerClient();
    return (client as any)[prop];
  },
});
