import { NextRequest, NextResponse } from 'next/server';
import { getPostHogClient } from '@/lib/posthog-server';


export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { language, projectSlug, labId } = body || {};
    let userId = request.headers.get('x-user-id');
    if(!userId){
        return NextResponse.json({success: false, error: 'Authorization failed'}, {status: 403});
    }
    // Validate required fields
    if (!language) {
      return NextResponse.json(
        { success: false, error: 'Language is required' }, 
        { status: 400 }
      );
    }
    
    if (!projectSlug) {
      return NextResponse.json(
        { success: false, error: 'Project slug is required' }, 
        { status: 400 }
      );
    }

    if (!labId) {
      return NextResponse.json(
        { success: false, error: 'Lab ID is required' }, 
        { status: 400 }
      );
    }

    // Forward request to backend
    const response = await fetch(`${process.env.BACKEND_API_URL}/v0/quest/start`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        language,
        projectSlug,
        labId,
        userId
      }),
    });

    const data = await response.json();

    // Track project started event with PostHog
    if (response.ok) {
      const posthog = getPostHogClient();
      posthog.capture({
        distinctId: userId,
        event: 'project_started',
        properties: {
          language: language,
          projectSlug: projectSlug,
          labId: labId,
          source: 'api'
        }
      });
    }

    return NextResponse.json(data, {
      status: response.status
    });
  } catch (error) {
    console.error('Error starting quest:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to start quest' 
      },
      { status: 500 }
    );
  }
}