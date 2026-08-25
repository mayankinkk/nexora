import { NextResponse } from 'next/server';
import { createServerClient } from '@/lib/langgraph-server';

export const runtime = 'edge';

export async function POST(req: Request) {
  try {
    const { threadId, numCards, language } = await req.json();

    if (!threadId) {
      return new NextResponse(
        JSON.stringify({ error: 'Thread ID is required' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } },
      );
    }

    const assistantId =
      process.env.LANGGRAPH_FLASHCARD_ASSISTANT_ID || 'flashcard_graph';
    const serverClient = createServerClient();

    const stream = await serverClient.client.runs.stream(
      threadId,
      assistantId,
      {
        input: {
          query: 'Create flashcards from the uploaded documents',
        },
        streamMode: ['messages', 'updates'],
        config: {
          configurable: {
            queryModel: 'openai/gpt-4o',
            numCards: numCards || 10,
            language: language || 'auto',
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
    console.error('Flashcard route error:', error);
    return new NextResponse(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } },
    );
  }
}
