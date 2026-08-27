import { indexConfig } from '@/constants/graphConfigs';
import { langGraphServerClient } from '@/lib/langgraph-server';
import { processPDF } from '@/lib/pdf';
import { Document } from '@langchain/core/documents';
import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const maxDuration = 120;

const MAX_FILE_SIZE = 20 * 1024 * 1024;

export async function POST(request: NextRequest) {
  try {
    let formData: FormData;
    try {
      formData = await request.formData();
    } catch (e: any) {
      console.error('FormData parse error:', e);
      return NextResponse.json(
        { error: 'Failed to read the upload. Your file may be too large or the connection was interrupted. Try a smaller PDF.', details: e.message },
        { status: 400 },
      );
    }

    const files: File[] = [];
    let userId = 'public';

    for (const [key, value] of formData.entries()) {
      if (key === 'files' && value instanceof File) {
        files.push(value);
      }
      if (key === 'userId' && typeof value === 'string') {
        userId = value;
      }
    }

    if (!files || files.length === 0) {
      return NextResponse.json({ error: 'No files received. Please try again.' }, { status: 400 });
    }

    if (files.length > 10) {
      return NextResponse.json(
        { error: 'Too many files. Maximum 10 files allowed.' },
        { status: 400 },
      );
    }

    for (const file of files) {
      const isPdf = ALLOWED_FILE_TYPES.includes(file.type) || file.name.toLowerCase().endsWith('.pdf');
      if (!isPdf) {
        return NextResponse.json(
          { error: `"${file.name}" is not a PDF (type: "${file.type || 'unknown'}"). Only PDF files are accepted.` },
          { status: 400 },
        );
      }
      if (file.size > MAX_FILE_SIZE) {
        return NextResponse.json(
          { error: `"${file.name}" is too large (${(file.size / 1024 / 1024).toFixed(1)}MB). Max 20MB.` },
          { status: 400 },
        );
      }
      if (file.size === 0) {
        return NextResponse.json(
          { error: `"${file.name}" is empty (0 bytes).` },
          { status: 400 },
        );
      }
    }

    const allDocs: Document[] = [];
    const errors: string[] = [];
    for (const file of files) {
      try {
        console.log(`Processing file: ${file.name} (${(file.size / 1024).toFixed(0)}KB, type: ${file.type})`);
        const docs = await processPDF(file);
        console.log(`Extracted ${docs.length} chunks from ${file.name}`);
        docs.forEach((doc) => {
          doc.metadata.user_id = userId;
        });
        allDocs.push(...docs);
      } catch (error: any) {
        console.error(`Error processing file ${file.name}:`, error);
        errors.push(`${file.name}: ${error.message}`);
      }
    }

    if (!allDocs.length) {
      return NextResponse.json(
        {
          error: 'Could not extract text from the PDF. The file may be image-based (scanned), corrupted, or use an unsupported format.',
          details: errors.length > 0 ? errors : ['No pages extracted'],
        },
        { status: 500 },
      );
    }

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

const ALLOWED_FILE_TYPES = ['application/pdf'];
