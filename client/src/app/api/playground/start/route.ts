import { NextResponse } from 'next/server'
import { getPostHogClient } from '@/lib/posthog-server'

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { language, labId } = body || {};
    let userId = request.headers.get('x-user-id');
    if(!userId){
        userId = ""
    }

    if (!language) {
      return NextResponse.json({ error: 'language is required' }, { status: 400 });
    }

    const backend = process.env.BACKEND_API_URL || 'http://localhost:8080';
 
    const url = `${backend}/v1/start/playground`;
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ language, labId, userId })
    });

    console.log("DEBUG: REQ PRAMS", labId, language, userId)
    

    const data = await res.json();

    // Track playground API started event with PostHog
    if (res.ok) {
      const posthog = getPostHogClient();
      posthog.capture({
        distinctId: userId || 'anonymous',
        event: 'playground_api_started',
        properties: {
          language: language,
          labId: labId,
          source: 'api'
        }
      });
    }

    return NextResponse.json({
      success: true,
      labId,
      ...data
    }, { status: res.status });
  } catch (err) {
    console.error('Start proxy error:', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
