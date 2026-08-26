import { NextResponse } from 'next/server';
import { createServerClient } from '@/lib/langgraph-server';

export const runtime = 'edge';

export async function POST(req: Request) {
  try {
    const { query, language } = await req.json();

    if (!query) {
      return new NextResponse(
        JSON.stringify({ error: 'Comparison query is required' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } },
      );
    }

    const assistantId =
      process.env.LANGGRAPH_COMPARISON_ASSISTANT_ID || 'comparison_graph';
    const serverClient = createServerClient();

    const thread = await serverClient.createThread();

    const stream = await serverClient.client.runs.stream(
      thread.thread_id,
      assistantId,
      {
        input: { query },
        streamMode: ['messages', 'updates'],
        config: {
          configurable: {
            queryModel: 'groq/qwen/qwen3.6-27b',
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
    console.error('Comparison route error:', error);
    return new NextResponse(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } },
    );
  }
}
