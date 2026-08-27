import { NextResponse } from 'next/server';
import { createServerClient } from '@/lib/langgraph-server';

export const runtime = 'nodejs';

export async function POST() {
  try {
    const serverClient = createServerClient();
    const thread = await serverClient.createThread();
    return NextResponse.json(thread);
  } catch (error: any) {
    console.error('Thread creation error:', error);
    return NextResponse.json(
      { error: 'Failed to create thread', details: error.message },
      { status: 500 },
    );
  }
}
