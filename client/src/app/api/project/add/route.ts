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
  const payload = await request.json();
  const { title, description, requirements, technology, concepts, category, difficulty, boilerplateFiles, boilerplate, checkpoints } = payload;

    // Helper to extract a key from a URL
    const extractKey = (u: string) => {
      try {
        const url = new URL(u);
        return url.pathname.replace(/^\//, '');
      } catch {
        return u;
      }
    };

    // Boilerplate handling: if inline boilerplate object provided we will always (re)upload
    // to ensure latest content, otherwise we fall back to provided boilerplateUrl / files.
    let boilerplateKey: string = '';
    if (payload.boilerplateUrl) {
      boilerplateKey = extractKey(String(payload.boilerplateUrl));
    }

    // Helper to build absolute URL to our own upload route
    const uploadUrl = new URL('/api/upload', request.url).toString();

  // Upload boilerplate from manual mode file triplet when provided AND no inline boilerplate object overrides it.
  if (!boilerplate && !boilerplateKey && boilerplateFiles && (boilerplateFiles.htmlFile || boilerplateFiles.cssFile || boilerplateFiles.jsFile)) {
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

        const uploadResult = await fetch(uploadUrl, {
          method: 'POST',
          body: formData
        });

        if (!uploadResult.ok) {
          const err = await uploadResult.json().catch(() => ({}));
          return NextResponse.json({ error: err?.error || 'Failed to upload boilerplate' }, { status: 500 });
        }
        const data = await uploadResult.json();
        boilerplateKey = data?.key || extractKey(data?.url || '');
      } catch (error) {
        console.error('Boilerplate zip creation failed:', error);
        return NextResponse.json({ error: 'Failed to create boilerplate zip' }, { status: 500 });
      }
    }

    // Upload boilerplate if inline boilerplate object (JSON mode). Always upload to refresh content.
    if (boilerplate && typeof boilerplate === 'object') {
      try {
        const zip = new JSZip();
        const addSlot = (slot: string) => {
          if (boilerplate[slot] && boilerplate[slot].name && boilerplate[slot].content !== undefined) {
            zip.file(boilerplate[slot].name, boilerplate[slot].content);
          }
        };
        addSlot('html');
        addSlot('css');
        addSlot('js');
        // If no files added, keep previous key (if any)
        if (Object.keys(zip.files).length === 0) {
          console.log('No inline boilerplate files detected, keeping existing key:', boilerplateKey);
        } else {
          console.log('Uploading inline boilerplate zip...');
        const zipBlob = await zip.generateAsync({ type: 'blob' });
        const formData = new FormData();
        const zipFile = new File([zipBlob], 'boilerplate.zip', { type: 'application/zip' });
        formData.append('file', zipFile);
        formData.append('projectName', title);
        formData.append('fileType', 'boilerplate');
        const uploadResult = await fetch(uploadUrl, { method: 'POST', body: formData });
        if (!uploadResult.ok) {
          const err = await uploadResult.json().catch(() => ({}));
          return NextResponse.json({ error: err?.error || 'Failed to upload boilerplate (inline)' }, { status: 500 });
        }
        const data = await uploadResult.json();
        boilerplateKey = data?.key || extractKey(data?.url || '');
          console.log('Inline boilerplate uploaded. Key:', boilerplateKey);
        }
      } catch (error) {
        console.error('Inline boilerplate zip creation failed:', error);
        return NextResponse.json({ error: 'Failed to create inline boilerplate zip' }, { status: 500 });
      }
    }

    // Normalize checkpoint test urls to keys, and upload when inline provided
    const updatedCheckpoints = await Promise.all(
      (checkpoints || []).map(async (checkpoint: any, idx: number) => {
        // If inline testFile provided, always upload (refresh), else fall back to existing URL
        if (checkpoint.testFile && checkpoint.testFile.name && checkpoint.testFile.content !== undefined) {
          console.log(`Uploading inline test file for checkpoint ${idx + 1}:`, checkpoint.testFile.name);
          const formData = new FormData();
            const testBlob = new Blob([checkpoint.testFile.content], { type: 'application/javascript' });
            const testFile = new File([testBlob], checkpoint.testFile.name, { type: 'application/javascript' });
            formData.append('file', testFile);
            formData.append('projectName', title);
            formData.append('fileType', 'testcase');
            const uploadResult = await fetch(uploadUrl, { method: 'POST', body: formData });
            if (!uploadResult.ok) {
              const err = await uploadResult.json().catch(() => ({}));
              return { ...checkpoint, _uploadError: err?.error || 'Test file upload failed' };
            }
            const data = await uploadResult.json();
            const key = data?.key || extractKey(data?.url || '');
            console.log(`Checkpoint ${idx + 1} test file uploaded. Key:`, key);
            return { ...checkpoint, testFileUrl: key };
        }
        if (checkpoint.testFileUrl) {
          return { ...checkpoint, testFileUrl: extractKey(String(checkpoint.testFileUrl)) };
        }
        return checkpoint;
      })
    );

 
    const backendPayload = {
      title,
      description,
      technology,
      requirements,
      concept: concepts, // FIX: Go expects 'concept'
      category,
      difficulty,
      boilerplateUrl: boilerplateKey, // send key only
      checkpoints: updatedCheckpoints
    };

    const res = await fetch(`${process.env.BACKEND_API_URL}/v0/quests/add`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(backendPayload)
    });

    const data = await res.json();
    console.log('Add project response:', data);
    if (!res.ok) {
      return NextResponse.json({ error: (data as any)?.message || 'Failed to add project' }, { status: res.status });
    }

    return NextResponse.json({ success: true, slug: (data as any).slug }, { status: 200 });
  } catch (err: any) {
    console.error('Add project error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
