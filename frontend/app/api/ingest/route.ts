import { indexConfig } from '@/constants/graphConfigs';
import { langGraphServerClient } from '@/lib/langgraph-server';
import { processPDF } from '@/lib/pdf';
import { Document } from '@langchain/core/documents';
import { NextRequest, NextResponse } from 'next/server';

const MAX_FILE_SIZE = 10 * 1024 * 1024;
const ALLOWED_FILE_TYPES = ['application/pdf'];

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
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
      return NextResponse.json({ error: 'No files provided' }, { status: 400 });
    }

    if (files.length > 10) {
      return NextResponse.json(
        { error: 'Too many files. Maximum 10 files allowed.' },
        { status: 400 },
      );
    }

    const invalidFiles = files.filter(
      (file) =>
        !ALLOWED_FILE_TYPES.includes(file.type) || file.size > MAX_FILE_SIZE,
    );

    if (invalidFiles.length > 0) {
      return NextResponse.json(
        {
          error: 'Only PDF files are allowed and file size must be less than 10MB',
        },
        { status: 400 },
      );
    }

    const allDocs: Document[] = [];
    for (const file of files) {
      try {
        const docs = await processPDF(file);
        // Add user_id to each document's metadata
        docs.forEach((doc) => {
          doc.metadata.user_id = userId;
        });
        allDocs.push(...docs);
      } catch (error: any) {
        console.error(`Error processing file ${file.name}:`, error);
      }
    }

    if (!allDocs.length) {
      return NextResponse.json(
        { error: 'No valid documents extracted from uploaded files' },
        { status: 500 },
      );
    }

    const thread = await langGraphServerClient.createThread();
    const ingestionRun = await langGraphServerClient.client.runs.wait(
      thread.thread_id,
      'ingestion_graph',
      {
        input: {
          docs: allDocs,
        },
        config: {
          configurable: {
            ...indexConfig,
            userId,
          },
        },
      },
    );

    return NextResponse.json({
      message: 'Documents ingested successfully',
      threadId: thread.thread_id,
      documentCount: allDocs.length,
    });
  } catch (error: any) {
    console.error('Error processing files:', error);
    return NextResponse.json(
      { error: 'Failed to process files', details: error.message },
      { status: 500 },
    );
  }
}
