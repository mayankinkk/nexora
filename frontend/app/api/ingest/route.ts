import { indexConfig } from '@/constants/graphConfigs';
import { langGraphServerClient } from '@/lib/langgraph-server';
import { Document } from '@langchain/core/documents';
import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const maxDuration = 120;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { pages, filename, userId = 'public' } = body;

    if (!pages || !Array.isArray(pages) || pages.length === 0) {
      return NextResponse.json(
        { error: 'No pages provided. The PDF may be empty or image-based.' },
        { status: 400 },
      );
    }

    if (!filename) {
      return NextResponse.json(
        { error: 'Filename is required.' },
        { status: 400 },
      );
    }

    const allDocs: Document[] = pages.map((page: { content: string; pageNumber: number }) => ({
      pageContent: page.content,
      metadata: {
        filename,
        loc: { pageNumber: page.pageNumber },
        user_id: userId,
      },
    }));

    let thread;
    try {
      thread = await langGraphServerClient.createThread();
    } catch (e: any) {
      console.error('Thread creation error:', e);
      return NextResponse.json(
        { error: 'Failed to connect to AI backend. Please try again.', details: e.message },
        { status: 502 },
      );
    }

    try {
      await langGraphServerClient.client.runs.wait(
        thread.thread_id,
        'ingestion_graph',
        {
          input: { docs: allDocs },
          config: {
            configurable: {
              ...indexConfig,
              userId,
            },
          },
        },
      );
    } catch (e: any) {
      console.error('Ingestion error:', e);
      return NextResponse.json(
        { error: 'Failed to index documents in the vector database.', details: e.message },
        { status: 500 },
      );
    }

    return NextResponse.json({
      message: 'Documents ingested successfully',
      threadId: thread.thread_id,
      documentCount: allDocs.length,
    });
  } catch (error: any) {
    console.error('Unexpected ingest error:', error);
    return NextResponse.json(
      { error: 'Failed to process files', details: error.message },
      { status: 500 },
    );
  }
}
