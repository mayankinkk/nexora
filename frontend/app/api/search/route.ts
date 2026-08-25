import { NextResponse } from 'next/server';
import { createServerClient } from '@/lib/langgraph-server';

export const runtime = 'edge';

export async function POST(req: Request) {
  try {
    const { query, threadId, language } = await req.json();

    if (!query) {
      return new NextResponse(
        JSON.stringify({ error: 'Query is required' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } },
      );
    }

    const assistantId =
      process.env.LANGGRAPH_SEARCH_ASSISTANT_ID || 'search_graph';
    const serverClient = createServerClient();

    // Use provided threadId or create new one
    let activeThreadId = threadId;
    if (!activeThreadId) {
      const thread = await serverClient.createThread();
      activeThreadId = thread.thread_id;
    }

    const stream = await serverClient.client.runs.stream(
      activeThreadId,
      assistantId,
      {
        input: { query },
        streamMode: ['messages', 'updates'],
        config: {
          configurable: {
            queryModel: 'groq/llama-3.3-70b-versatile',
          },
        },
      },
    );

    const encoder = new TextEncoder();
    const customReadable = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of stream) {
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify(chunk)}\n\n`),
            );
          }
        } catch (error) {
          console.error('Streaming error:', error);
          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({ error: 'Streaming error occurred' })}\n\n`,
            ),
          );
        } finally {
          controller.close();
        }
      },
    });

    return new Response(customReadable, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
      },
    });
  } catch (error) {
    console.error('Search route error:', error);
    return new NextResponse(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } },
    );
  }
}
