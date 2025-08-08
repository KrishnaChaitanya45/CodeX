import { NextResponse } from 'next/server';

export async function GET() {
  try {
    // Fetch available options from server API
    const res = await fetch(`${process.env.BACKEND_API_URL}/v0/data/options`);
    if (!res.ok) {
      return NextResponse.json({ error: 'Failed to fetch options' }, { status: res.status });
    }
    const data = await res.json();
    // Convert string arrays to { id, name } objects
    const options = {
      technologies: data.technologies.map((t: string) => ({ id: t, name: t })),
      concepts:     data.concepts.map((c: string) => ({ id: c, name: c })),
      categories:   data.categories.map((c: string) => ({ id: c, name: c })),
      difficulties: data.difficulties.map((d: string) => ({ id: d, name: d })),
    };
    return NextResponse.json(options);
  } catch (error) {
    console.error('Error fetching project options:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
