import { NextResponse } from 'next/server';
import JSZip from 'jszip';

// Default JSON parsing
export const config = {
  api: {
    bodyParser: true
  }
};

export async function POST(request: Request) {
  try {
    // Expect JSON payload with file data
    const payload = await request.json();
    const { title, description, requirements, technology, concept, category, difficulty, boilerplateFiles, checkpoints } = payload;

    // Upload boilerplate files first
    let boilerplateUrl = '';
    if (boilerplateFiles && (boilerplateFiles.htmlFile || boilerplateFiles.cssFile || boilerplateFiles.jsFile)) {
      try {
        // Create zip file
        const zip = new JSZip();
        
        if (boilerplateFiles.htmlFile) {
          zip.file(boilerplateFiles.htmlFile.name, boilerplateFiles.htmlFile.content);
        }
        if (boilerplateFiles.cssFile) {
          zip.file(boilerplateFiles.cssFile.name, boilerplateFiles.cssFile.content);
        }
        if (boilerplateFiles.jsFile) {
          zip.file(boilerplateFiles.jsFile.name, boilerplateFiles.jsFile.content);
        }

        // Generate zip blob
        const zipBlob = await zip.generateAsync({ type: 'blob' });
        
        // Create form data for upload
        const formData = new FormData();
        const zipFile = new File([zipBlob], 'boilerplate.zip', { type: 'application/zip' });
        formData.append('file', zipFile);
        formData.append('projectName', title);
        formData.append('fileType', 'boilerplate');

        const uploadResult = await fetch(`${process.env.NEXT_JS_PUBLIC_URL}/api/upload`, {
          method: 'POST',
          body: formData
        });

        if (uploadResult.ok) {
          const data = await uploadResult.json();
          boilerplateUrl = data.url;
        }
      } catch (error) {
        console.error('Boilerplate zip creation failed:', error);
        return NextResponse.json({ error: 'Failed to create boilerplate zip' }, { status: 500 });
      }
    }

    // Upload test case files
    const updatedCheckpoints = await Promise.all(
      checkpoints.map(async (checkpoint: any) => {
        if (checkpoint.testFile) {
          const formData = new FormData();
          const testBlob = new Blob([checkpoint.testFile.content], { type: 'application/javascript' });
          const testFile = new File([testBlob], checkpoint.testFile.name, { type: 'application/javascript' });
          formData.append('file', testFile);
          formData.append('projectName', title);
          formData.append('fileType', 'testcase');

          const uploadResult = await fetch(`${process.env.NEXT_JS_PUBLIC_URL}/api/upload`, {
            method: 'POST',
            body: formData
          });
          
          if (uploadResult.ok) {
            const data = await uploadResult.json();
            return {
              ...checkpoint,
              testFileUrl: data.url
            };
          }
        }
        return checkpoint;
      })
    );

    // Prepare final payload for backend
    const backendPayload = {
      title,
      description,
      technology,
      requirements, 
      concept,
      category,
      difficulty,
      boilerplateUrl,
      checkpoints: updatedCheckpoints
    };

    
    // Call backend Golang API
    const res = await fetch(`${process.env.BACKEND_API_URL}/v0/quests/add`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(backendPayload)
    });
    const data = await res.json();

    if (!res.ok) {
      const error = await res.json();
      return NextResponse.json({ error: error.message || 'Failed to add project' }, { status: res.status });
    }

    return NextResponse.json({ success: true, slug:data.slug }, { status: 200 });
  } catch (err: any) {
    console.error('Add project error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
