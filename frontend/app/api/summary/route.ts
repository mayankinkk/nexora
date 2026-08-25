import { NextResponse } from 'next/server';
import { createServerClient } from '@/lib/langgraph-server';

export const runtime = 'edge';

export async function POST(req: Request) {
  try {
    const { threadId, language } = await req.json();

    if (!threadId) {
      return new NextResponse(
        JSON.stringify({ error: 'Thread ID is required' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } },
      );
    }

    const assistantId = process.env.LANGGRAPH_SUMMARY_ASSISTANT_ID || 'summary_graph';
    const serverClient = createServerClient();

    const stream = await serverClient.client.runs.stream(
      threadId,
      assistantId,
      {
        input: { query: 'Generate a comprehensive summary of all uploaded documents' },
        streamMode: ['messages', 'updates'],
        config: {
          configurable: {
            queryModel: 'groq/llama-3.3-70b-versatile',
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
    console.error('Summary route error:', error);
    return new NextResponse(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } },
    );
  }
}
