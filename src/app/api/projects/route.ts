import { NextRequest, NextResponse } from 'next/server';
import { getDbClient } from '@/lib/db';

export async function GET() {
  const sql = getDbClient();
  if (!sql) {
    return NextResponse.json({ projects: [], dbConnected: false });
  }

  try {
    const rows = await sql`
      SELECT id, name, slide_count, slides_data, created_at, updated_at
      FROM projects
      ORDER BY updated_at DESC
    `;
    const projects = rows.map((r: any) => ({
      id: r.id,
      name: r.name,
      slideCount: r.slide_count,
      slides: JSON.parse(r.slides_data || '[]'),
      createdAt: r.created_at,
      updatedAt: r.updated_at,
    }));
    return NextResponse.json({ projects, dbConnected: true });
  } catch (error: any) {
    console.error('Error fetching projects:', error);
    return NextResponse.json({ projects: [], error: error.message, dbConnected: true });
  }
}

export async function POST(req: NextRequest) {
  const sql = getDbClient();
  const body = await req.json();
  const { id, name, slides, zipBase64 } = body;

  if (!id || !name || !slides) {
    return NextResponse.json({ error: 'Missing required project data' }, { status: 400 });
  }

  if (!sql) {
    return NextResponse.json({
      success: true,
      message: 'Project saved locally (Neon DB not connected)',
      dbConnected: false
    });
  }

  try {
    const slideCount = slides.length;
    const slidesJson = JSON.stringify(slides);

    await sql`
      INSERT INTO projects (id, name, slide_count, slides_data, zip_data, updated_at)
      VALUES (${id}, ${name}, ${slideCount}, ${slidesJson}, ${zipBase64 || null}, CURRENT_TIMESTAMP)
      ON CONFLICT (id) DO UPDATE SET
        name = EXCLUDED.name,
        slide_count = EXCLUDED.slide_count,
        slides_data = EXCLUDED.slides_data,
        zip_data = EXCLUDED.zip_data,
        updated_at = CURRENT_TIMESTAMP;
    `;

    return NextResponse.json({ success: true, message: 'Project saved to Neon DB!', dbConnected: true });
  } catch (error: any) {
    console.error('Error saving project to DB:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const sql = getDbClient();
  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');

  if (!id) {
    return NextResponse.json({ error: 'Project ID required' }, { status: 400 });
  }

  if (!sql) {
    return NextResponse.json({ success: true, message: 'Deleted locally', dbConnected: false });
  }

  try {
    await sql`DELETE FROM projects WHERE id = ${id}`;
    return NextResponse.json({ success: true, message: 'Project completely deleted from Neon DB', dbConnected: true });
  } catch (error: any) {
    console.error('Error deleting project from DB:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
